#!/usr/bin/env node

import { chromium, Browser, Page } from 'playwright';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import os from 'os';
import readline from 'readline';
import { ChromeAutomation } from './chrome-automation.js';

interface InspectOptions {
  url: string;
  waitForLogin: boolean;
  loginTimeout: number;
}

async function checkChromeConnection(): Promise<boolean> {
  try {
    await fetch('http://localhost:9222/json/version');
    return true;
  } catch {
    return false;
  }
}

async function launchChromeIfNeeded(): Promise<void> {
  const isChrome = await checkChromeConnection();
  if (isChrome) return;

  if (os.platform() === 'darwin') {
    console.log(chalk.yellow('\nChrome is not running with remote debugging. Launching Chrome for you...'));
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const args = [
      '--remote-debugging-port=9222',
      '--user-data-dir=/tmp/chrome-debug',
      '--no-first-run',
      '--no-default-browser-check'
    ];
    spawn(chromePath, args, {
      detached: true,
      stdio: 'ignore'
    }).unref();
    // Wait a few seconds for Chrome to start
    await new Promise(resolve => setTimeout(resolve, 4000));
  } else {
    throw new Error('Auto-launch is only supported on macOS. Please start Chrome manually.');
  }
}

async function selectTab(browser: Browser): Promise<Page> {
  const context = browser.contexts()[0];
  const pages = context.pages();
  
  if (pages.length === 0) {
    return await context.newPage();
  }
  
  if (pages.length === 1) {
    return pages[0];
  }

  // If multiple tabs, let user choose
  const titles = await Promise.all(pages.map(async p => {
    const title = await p.title();
    const url = p.url();
    return `${title} (${url})`;
  }));

  const { selectedTab } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedTab',
      message: 'Multiple tabs found. Which one would you like to use?',
      choices: [
        ...titles.map((title, i) => ({ name: title, value: i })),
        { name: 'Open new tab', value: -1 }
      ]
    }
  ]);

  return selectedTab === -1 ? await context.newPage() : pages[selectedTab];
}

async function promptForOptions(): Promise<InspectOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Enter the website URL you want to inspect:',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL (e.g., https://example.com)';
        }
      }
    },
    {
      type: 'confirm',
      name: 'waitForLogin',
      message: 'Do you need to log in to the website?',
      default: false
    }
  ]);

  return {
    ...answers,
    loginTimeout: 30000 // 30 seconds default timeout
  };
}

async function waitForLoginOrTimeout(timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    let done = false;
    rl.question(chalk.yellow('Press Enter to continue...'), () => {
      if (!done) {
        done = true;
        rl.close();
        resolve();
      }
    });
    setTimeout(() => {
      if (!done) {
        done = true;
        rl.close();
        resolve();
      }
    }, timeoutMs);
  });
}





async function buildElementHierarchy(): Promise<Array<{ name: string; url: string; level: number; parent?: string }>> {
  try {
    // Connect directly to Chrome to analyze DOM hierarchy
    const CDP = await import('chrome-remote-interface');
    const client = await CDP.default({ port: 9222 });
    
    const { Page, Runtime, DOM } = client;
    await Page.enable();
    await Runtime.enable();
    await DOM.enable();
    
    // Execute hierarchy analysis in Chrome
    const result = await Runtime.evaluate({
      expression: `
        JSON.stringify((() => {
          const hierarchy = [];
          
          // Find all interactive elements and their hierarchy levels
          const interactiveSelectors = [
            'a[href]', 'button', 'input[type="button"]', 'input[type="submit"]',
            'input[type="checkbox"]', 'input[type="radio"]', '[role="button"]',
            '[role="switch"]', '[role="checkbox"]', '[onclick]', '[data-testid*="edit"]',
            '[data-testid*="delete"]', '[data-testid*="view"]', '[data-testid*="toggle"]',
            '[data-testid*="switch"]', '[data-testid*="btn"]', '[data-testid*="action"]',
            '[aria-label*="edit"]', '[aria-label*="delete"]', '[aria-label*="view"]',
            '[aria-label*="toggle"]', '[aria-label*="switch"]', '[class*="edit"]',
            '[class*="delete"]', '[class*="toggle"]', '[class*="switch"]',
            '[class*="btn"]', '[class*="button"]', '[class*="action"]',
            '.toggle', '.switch', '.btn', '.button', '.edit', '.delete', '.action',
            '.clickable', '[tabindex]:not([tabindex="-1"])'
          ];
          
          const allElements = document.querySelectorAll(interactiveSelectors.join(', '));
          
                     Array.from(allElements).forEach(element => {
             // Calculate hierarchy level based on DOM depth from body
             let level = 0;
             let parent = element.parentElement;
             while (parent && parent !== document.body) {
               level++;
               parent = parent.parentElement;
             }
             
             // Normalize levels - make top-level interactive elements level 0
             // Subtract a base level to bring common elements closer to 0
             level = Math.max(0, level - 5); // More aggressive normalization
            
            // Get element info
            let href = '';
            let text = element.textContent?.trim() || '';
            
            if (element.tagName.toLowerCase() === 'a') {
              href = element.href;
            } else if (element.hasAttribute('onclick')) {
              href = 'javascript:' + element.getAttribute('onclick');
              text = text || element.getAttribute('aria-label') || element.getAttribute('title') || 'Button';
                         } else {
               const testId = element.getAttribute('data-testid');
               const id = element.getAttribute('id');
               const className = element.getAttribute('class');
               
               // Only skip elements that are clearly non-interactive layout containers
               // Be much more conservative - only skip if it's clearly a layout element
               const isDefinitelyLayoutOnly = className && 
                 (className.includes('MuiBox-root') || 
                  className.includes('MuiGrid-root') || 
                  className.includes('MuiContainer-root') ||
                  className.includes('MuiStack-root') ||
                  className.includes('MuiPaper-root') ||
                  className.includes('MuiTypography-root')) &&
                 !element.hasAttribute('onclick') &&
                 !element.hasAttribute('role') &&
                 !testId &&
                 !element.getAttribute('aria-label') &&
                 !element.getAttribute('title') &&
                 element.tagName.toLowerCase() !== 'button' &&
                 element.tagName.toLowerCase() !== 'input' &&
                 element.tagName.toLowerCase() !== 'a' &&
                 (!element.textContent || element.textContent.trim().length === 0);
               
               if (isDefinitelyLayoutOnly) {
                 return; // Skip this element entirely
               }
               
               if (testId) {
                 href = '[data-testid="' + testId + '"]';
               } else if (id) {
                 href = '#' + id;
               } else if (className) {
                 // For buttons, use a simple approach that works with our existing fallback system
                 if (element.tagName.toLowerCase() === 'button') {
                   const buttonText = element.textContent?.trim();
                   const ariaLabel = element.getAttribute('aria-label');
                   
                   if (ariaLabel) {
                     href = \`button[aria-label="\${ariaLabel}"]\`;
                   } else if (buttonText && buttonText.length > 0 && buttonText.length < 50) {
                     // Use the button text directly - our findElementWithFallback will handle the search
                     href = buttonText;
                   } else {
                     href = 'button'; // Generic button selector as last resort
                   }
                 } else {
                   // For non-buttons, try to find meaningful classes
                   const classes = className.split(' ').filter(c => 
                     c.length > 2 && 
                     !c.startsWith('Mui') && // Block Material-UI classes for non-buttons
                     !c.includes('css-') &&
                     !c.startsWith('r') &&
                     !c.startsWith('e') && // Often auto-generated classes
                     !c.match(/^[a-z]{1,3}[0-9]+$/) // Short auto-generated classes like 'r1', 'e2a'
                   );
                   
                   if (classes.length > 0) {
                     // Prefer more specific classes
                     const specificClass = classes.find(c => 
                       c.includes('button') || 
                       c.includes('Button') || 
                       c.includes('switch') || 
                       c.includes('Switch') ||
                       c.includes('toggle') ||
                       c.includes('Toggle') ||
                       c.includes('clickable')
                     ) || classes[0];
                     
                     href = '.' + specificClass;
                   } else {
                   // Generate a more specific selector using tag + attributes
                   const tag = element.tagName.toLowerCase();
                   const role = element.getAttribute('role');
                   const type = element.getAttribute('type');
                   const ariaLabel = element.getAttribute('aria-label');
                   const dataTestId = element.getAttribute('data-testid');
                   
                   // Prioritize more specific attributes
                   if (dataTestId) {
                     href = '[data-testid="' + dataTestId + '"]';
                   } else if (ariaLabel) {
                     href = '[aria-label="' + ariaLabel + '"]';
                   } else if (role) {
                     href = tag + '[role="' + role + '"]';
                   } else if (type) {
                     href = tag + '[type="' + type + '"]';
                   } else {
                     // Last resort: use tag with text content if it's short and specific
                     const textContent = element.textContent?.trim();
                     if (textContent && textContent.length > 2 && textContent.length < 30) {
                       href = tag + ':contains("' + textContent.replace(/"/g, '\\"') + '")';
                     } else {
                       href = tag;
                     }
                   }
                 }
               }
               // Build comprehensive element description
               let description = '';
               
               // 1. Try multiple sources for meaningful text
               const ariaLabel = element.getAttribute('aria-label');
               const title = element.getAttribute('title');
               const placeholder = element.getAttribute('placeholder');
               const alt = element.getAttribute('alt');
               const dataTestId = element.getAttribute('data-testid');
               const role = element.getAttribute('role');
               const tagName = element.tagName.toLowerCase();
               const inputType = element.getAttribute('type');
               
               // 2. Get clean text content (avoid generic container text)
               let elementText = text || element.textContent?.trim() || '';
               if (elementText.length > 100) {
                 // If text is too long, it's probably container text, try to find specific button/link text
                 const specificElements = element.querySelectorAll('button, a, input, [role="button"]');
                 if (specificElements.length === 1) {
                   elementText = specificElements[0].textContent?.trim() || '';
                 } else {
                   elementText = elementText.substring(0, 50) + '...';
                 }
               }
               
               // 3. Build description based on available information
               if (ariaLabel && ariaLabel.length > 2) {
                 description = ariaLabel;
               } else if (title && title.length > 2) {
                 description = title;
               } else if (placeholder) {
                 description = \`Input: \${placeholder}\`;
               } else if (alt) {
                 description = \`Image: \${alt}\`;
               } else if (dataTestId) {
                 description = dataTestId.replace(/-/g, ' ').replace(/_/g, ' ');
               } else if (elementText && elementText.length > 2) {
                 description = elementText;
               } else {
                 // Fallback to tag name with type
                 description = inputType ? \`\${tagName} (\${inputType})\` : tagName;
               }
               
               // 4. Add context from parent elements
               let parentContext = '';
               const contextElement = element.closest('[data-testid], [aria-label], [title], .MuiCard-root, .MuiDialog-root, .MuiPaper-root');
               if (contextElement && contextElement !== element) {
                 const contextText = contextElement.getAttribute('data-testid') || 
                                   contextElement.getAttribute('aria-label') || 
                                   contextElement.getAttribute('title') || '';
                 if (contextText && contextText.length > 2 && contextText.length < 30 && !description.includes(contextText)) {
                   parentContext = contextText.replace(/-/g, ' ').replace(/_/g, ' ');
                 }
               }
               
               // 5. Combine description and context
               let finalName = description;
               if (parentContext) {
                 finalName = \`\${parentContext} → \${description}\`;
               }
               
               // 6. Add element type emoji for clarity
               if (tagName === 'button' || role === 'button' || element.onclick) {
                 finalName = \`🔘 \${finalName}\`;
               } else if (tagName === 'input') {
                 finalName = \`📝 \${finalName}\`;
               } else if (tagName === 'a') {
                 finalName = \`🔗 \${finalName}\`;
               } else if (role === 'tab') {
                 finalName = \`📑 \${finalName}\`;
               } else if (role === 'menuitem') {
                 finalName = \`📋 \${finalName}\`;
               }
               
               text = finalName;
             }
            
                         // Skip elements that are clearly non-interactive layout containers or too generic
             const isGenericMuiClass = href && (
               href === '.MuiBox-root' || 
               href === '.MuiGrid-root' || 
               href === '.MuiContainer-root' ||
               href === '.MuiStack-root' ||
               href === '.MuiPaper-root' ||
               href === '.MuiTypography-root'
               // Note: We no longer block ALL Material-UI classes, only specific layout ones
             );
             
             if (href && text.length > 0 && text.length < 150 && !isGenericMuiClass) {
               hierarchy.push({
                 name: text,
                 url: href,
                 level: Math.min(level, 5), // Cap at 5 levels for usability
                 parent: undefined
               });
             }
          });
          
          return hierarchy;
        })())
      `
    });
    
    await client.close();
    
    if (result.result.value) {
      return JSON.parse(result.result.value);
    }
    
    return [];
  } catch (error) {
    console.warn('Failed to build element hierarchy:', error);
    return [];
  }
}

async function getCurrentPageName(): Promise<string> {
  try {
    const CDP = await import('chrome-remote-interface');
    const client = await CDP.default({ port: 9222 });
    
    const { Page, Runtime } = client;
    await Page.enable();
    await Runtime.enable();
    
    // Get page title and URL to determine page name
    const result = await Runtime.evaluate({
      expression: `
        JSON.stringify({
          title: document.title,
          url: window.location.href,
          pathname: window.location.pathname
        })
      `
    });
    
    await client.close();
    
    if (result.result.value) {
      const pageInfo = JSON.parse(result.result.value);
      
      // Try to extract meaningful page name from title or URL
      if (pageInfo.title && pageInfo.title !== 'React App') {
        return pageInfo.title;
      }
      
      // Extract from pathname
      const pathParts = pageInfo.pathname.split('/').filter((part: string) => part.length > 0);
      if (pathParts.length > 0) {
        return pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/_/g, ' ');
      }
      
      return 'Current Page';
    }
    
    return 'Unknown Page';
  } catch (error) {
    console.warn('Failed to get page name:', error);
    return 'Current Page';
  }
}

async function chromeRemoteControl(automation: ChromeAutomation, page: Page): Promise<void> {
  const spinner = ora('Analyzing page hierarchy...').start();
  
  try {
    let currentPageName = 'Dashboard'; // Track current page name
    let currentLevel = 0; // Current hierarchy level
    let allElements: Array<{ name: string; url: string; level: number; parent?: string }> = [];
    
    // Get initial page name
    try {
      currentPageName = await getCurrentPageName();
    } catch (error) {
      console.warn('Could not get initial page name, using Dashboard');
    }
    
    // Build element hierarchy
    allElements = await buildElementHierarchy();
    
    if (allElements.length === 0) {
      spinner.fail('No navigable elements found on this page');
      return;
    }
    
    // Analyze level distribution and find the most populated level
    const levelCounts = new Map<number, number>();
    allElements.forEach(el => {
      levelCounts.set(el.level, (levelCounts.get(el.level) || 0) + 1);
    });
    
    // Find the level with the most elements (likely the main content level)
    let bestLevel = 0;
    let maxCount = 0;
    for (const [level, count] of levelCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        bestLevel = level;
      }
    }
    
    // Shift levels so the most populated level becomes level 0
    const levelShift = bestLevel;
    allElements.forEach(el => {
      el.level = Math.max(0, el.level - levelShift);
    });
    
    // Recalculate level distribution after shifting
    levelCounts.clear();
    allElements.forEach(el => {
      levelCounts.set(el.level, (levelCounts.get(el.level) || 0) + 1);
    });
    
    const maxLevel = Math.max(...Array.from(levelCounts.keys()));
    currentLevel = 0; // Start at the main content level
    
    spinner.succeed(`Found ${allElements.length} elements across ${maxLevel + 1} hierarchy levels on ${currentPageName}`);
    
    // Debug: Show level distribution
    console.log(chalk.gray('Level distribution:'));
    for (let i = 0; i <= maxLevel; i++) {
      const count = levelCounts.get(i) || 0;
      console.log(chalk.gray(`  Level ${i}: ${count} elements`));
    }
    
    let controlRunning = true;
    while (controlRunning) {
      console.log(chalk.blue('\n🎮 Chrome Remote Control - Hierarchical Navigation'));
      console.log(chalk.gray('Use ↑↓ to navigate, ←→ for hierarchy levels, Enter to select\n'));
      console.log(chalk.cyan(`Current Page: ${currentPageName}`));
      console.log(chalk.magenta(`Current Level: ${currentLevel} (${levelCounts.get(currentLevel) || 0} elements)`));
      
      // Filter elements by current level
      const currentLevelElements = allElements.filter(el => el.level === currentLevel);
      
      // Build choices for current level
      const choices = [
        ...currentLevelElements.map(element => ({
          name: `${element.name.slice(0, 80)}${element.name.length > 80 ? '...' : ''} ${chalk.gray(`(L${element.level}) ${element.url.slice(0, 30)}${element.url.length > 30 ? '...' : ''}`)}`,
          value: element.url
        })),
        new inquirer.Separator(),
        // Navigation options
        ...(currentLevel > 0 ? [{ name: chalk.blue('⬅️  Level Up (less specific elements)'), value: 'level_up' }] : []),
        ...(currentLevel < maxLevel ? [{ name: chalk.blue('➡️  Level Down (more specific elements)'), value: 'level_down' }] : []),
        { name: chalk.yellow('🔄 Refresh elements from current page'), value: 'refresh' },
        { name: chalk.red('❌ Exit Chrome Remote Control'), value: 'exit' }
      ];
      
      const { selectedUrl } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedUrl',
          message: `Select an option (Level ${currentLevel}/${maxLevel}):`,
          choices,
          pageSize: 15
        }
      ]);
      
      if (selectedUrl === 'exit') {
        controlRunning = false;
        return;
      }
      
      if (selectedUrl === 'level_up') {
        currentLevel = Math.max(0, currentLevel - 1);
        console.log(chalk.blue(`Moved to Level ${currentLevel} (${levelCounts.get(currentLevel) || 0} elements)`));
        continue;
      }
      
      if (selectedUrl === 'level_down') {
        currentLevel = Math.min(maxLevel, currentLevel + 1);
        console.log(chalk.blue(`Moved to Level ${currentLevel} (${levelCounts.get(currentLevel) || 0} elements)`));
        continue;
      }
      
      if (selectedUrl === 'refresh') {
        const refreshSpinner = ora('Refreshing page hierarchy...').start();
        try {
          // Rebuild element hierarchy
          allElements = await buildElementHierarchy();
          
          if (allElements.length > 0) {
            // Recalculate level distribution
            levelCounts.clear();
            allElements.forEach(el => {
              levelCounts.set(el.level, (levelCounts.get(el.level) || 0) + 1);
            });
            
            // Reset to level 0 after refresh
            currentLevel = 0;
            refreshSpinner.succeed(`Found ${allElements.length} elements on ${currentPageName}`);
          } else {
            refreshSpinner.warn('No elements found on current page');
          }
        } catch (error) {
          refreshSpinner.fail(`Failed to refresh elements: ${error instanceof Error ? error.message : String(error)}`);
        }
        continue;
      }
      
      // Handle different types of navigation
      const navSpinner = ora(`Navigating to: ${selectedUrl}`).start();
      try {
        if (selectedUrl.startsWith('javascript:')) {
          // Handle onclick buttons
          const jsCode = selectedUrl.replace('javascript:', '');
          await page.evaluate(jsCode);
          navSpinner.succeed('Executed JavaScript action');
        } else if (selectedUrl.startsWith('http')) {
          // Handle regular URL navigation
          await automation.navigate({
            url: selectedUrl,
            timeout: 15000
          });
          navSpinner.succeed(`Successfully navigated to: ${selectedUrl}`);
        } else {
          // Handle CSS selector-based interactions (class, id, attribute, tag selectors)
          let selector = selectedUrl;
          if (selectedUrl.startsWith('selector:')) {
            selector = selectedUrl.replace('selector:', '');
          }
          
          navSpinner.text = `Attempting to click element: ${selector}`;
          
          try {
            await automation.interact({
              clickSelector: selector,
              timeout: 5000  // Reduced timeout for faster feedback on non-clickable elements
            });
            navSpinner.succeed(`✅ Successfully clicked element: ${selector}`);
          } catch (error) {
            navSpinner.fail(`❌ Failed to click element: ${selector}`);
            console.log(chalk.yellow(`Error details: ${error instanceof Error ? error.message : String(error)}`));
            console.log(chalk.gray('This element may be a layout container rather than an interactive element.'));
            console.log(chalk.gray('Try selecting a different element or use the refresh option to get updated elements.'));
          }
        }
        
        // Wait a moment for page to load, then auto-refresh hierarchy
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const refreshSpinner = ora('Auto-refreshing elements from new page...').start();
        try {
          // Rebuild element hierarchy for new page
          allElements = await buildElementHierarchy();
          
          // Try to determine the new page name from the URL or page title
          const newPageName = await getCurrentPageName();
          currentPageName = newPageName;
          
          if (allElements.length > 0) {
            // Recalculate level distribution
            levelCounts.clear();
            allElements.forEach(el => {
              levelCounts.set(el.level, (levelCounts.get(el.level) || 0) + 1);
            });
            
            // Reset to level 0 after navigation
            currentLevel = 0;
            refreshSpinner.succeed(`Found ${allElements.length} elements on ${currentPageName}`);
          } else {
            refreshSpinner.warn('No new elements found, keeping previous elements');
          }
        } catch (error) {
          refreshSpinner.fail('Failed to refresh elements, keeping previous ones');
        }
        
      } catch (error) {
        navSpinner.fail(`Navigation failed: ${error instanceof Error ? error.message : String(error)}`);
        console.log(chalk.yellow('This tests our error handling! The automation system caught the error.'));
      }
    }
    
  } catch (error) {
    spinner.fail(`Remote control failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function inspectWebsite(options: InspectOptions) {
  const spinner = ora('Checking Chrome connection...').start();
  let browser;
  let page;

  try {
    // Auto-launch Chrome if needed (macOS only)
    await launchChromeIfNeeded();
    spinner.succeed('Chrome is running with remote debugging');
    spinner.start('Connecting to Chrome...');

    // Launch browser with remote debugging
    browser = await chromium.connectOverCDP('http://localhost:9222');
    spinner.succeed('Connected to Chrome');

    // Handle tab selection
    spinner.start('Checking browser tabs...');
    page = await selectTab(browser);
    spinner.succeed('Tab selected');

    spinner.start('Navigating to website...');
    // Navigate to the specified URL
    await page.goto(options.url);
    spinner.succeed(`Navigated to ${options.url}`);

    // Handle login if needed
    if (options.waitForLogin) {
      spinner.info(chalk.yellow(
        `Please log in to the website. You have ${options.loginTimeout / 1000} seconds, or press Enter to continue immediately.`
      ));
      await waitForLoginOrTimeout(options.loginTimeout);
      spinner.succeed('Login step completed');
    }

    spinner.start('Running diagnostics...');

    // Collect console messages
    page.on('console', msg => {
      console.log(`[CLiTS-INSPECTOR][CONSOLE][${msg.type()}]`, msg.text());
    });

    // Collect network requests and responses
    page.on('request', request => {
      console.log(`[CLiTS-INSPECTOR][NETWORK][REQUEST]`, JSON.stringify({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        resourceType: request.resourceType(),
      }));
    });

    page.on('response', async response => {
      let body = '';
      try {
        if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
          body = await response.text();
        }
      } catch (e) {
        body = '[UNREADABLE BODY]';
      }
      console.log(`[CLiTS-INSPECTOR][NETWORK][RESPONSE]`, JSON.stringify({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        body: body?.slice(0, 1000) // limit output size
      }));
    });

    // Dump DOM structure
    const dom = await page.content();
    console.log('[CLiTS-INSPECTOR][DOM]', dom.slice(0, 5000)); // limit output size

    spinner.succeed('Diagnostics completed');
    console.log(chalk.green('\nResults are ready for your AI session!'));
    console.log(chalk.gray('You can now use these logs with your AI assistant for troubleshooting.'));

    // Initialize Chrome automation for remote control
    const automation = new ChromeAutomation(9222, 'localhost');

    // Ask user what to do next
    let running = true;
    while (running) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🎮 Chrome Remote Control (Navigate via links)', value: 'remote' },
            { name: '📄 Capture current page state again', value: 'capture' },
            { name: '🌐 Navigate to a new URL manually', value: 'navigate' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'exit') {
        running = false;
      } else if (action === 'capture') {
        spinner.start('Capturing page state...');
        const dom = await page.content();
        console.log('[CLiTS-INSPECTOR][DOM]', dom.slice(0, 5000));
        spinner.succeed('Page state captured');
      } else if (action === 'navigate') {
        const { url } = await inquirer.prompt([
          {
            type: 'input',
            name: 'url',
            message: 'Enter the new URL:',
            validate: (input: string) => {
              try {
                new URL(input);
                return true;
              } catch {
                return 'Please enter a valid URL (e.g., https://example.com)';
              }
            }
          }
        ]);
        spinner.start(`Navigating to ${url}...`);
        await page.goto(url);
        spinner.succeed(`Navigated to ${url}`);
      } else if (action === 'remote') {
        await chromeRemoteControl(automation, page);
      }
    }

  } catch (error) {
    spinner.fail('Error during inspection');
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function main() {
  console.log(chalk.blue('\nCLiTS - Chrome Log Inspector & Troubleshooting System'));
  console.log(chalk.gray('Generic Website Inspector\n'));

  try {
    const options = await promptForOptions();
    await inspectWebsite(options);
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 