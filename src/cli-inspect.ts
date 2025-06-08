#!/usr/bin/env node


import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import os from 'os';


import fetch from 'node-fetch';



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



async function buildElementHierarchy(): Promise<Array<{ name: string; url: string; level: number; parent?: string }>> {
  try {
    console.log(chalk.gray('🔍 Connecting to Chrome for element analysis...'));
    
    // Connect directly to Chrome to analyze DOM hierarchy
    const CDP = await import('chrome-remote-interface');
    
    // First, check what targets are available
    const response = await fetch('http://localhost:9222/json/list');
    const targets = await response.json() as Array<{
      id: string;
      type: string;
      url: string;
      title: string;
      webSocketDebuggerUrl?: string;
    }>;
    console.log(chalk.gray(`Found ${targets.length} Chrome targets`));
    
    // Find the first page target
    const pageTargets = targets.filter((t: any) => t.type === 'page');
    console.log(chalk.gray(`Found ${pageTargets.length} page targets`));
    
    if (pageTargets.length === 0) {
      console.warn(chalk.yellow('No page targets found in Chrome'));
      return [];
    }
    
    // Connect to the first page target
    const client = await CDP.default({ 
      port: 9222,
      target: pageTargets[0].id
    });
    
    console.log(chalk.gray(`Connected to target: ${pageTargets[0].title || pageTargets[0].url}`));
    
    const { Page, Runtime, DOM } = client;
    await Page.enable();
    await Runtime.enable();
    await DOM.enable();
    
    console.log(chalk.gray('CDP domains enabled, executing element analysis...'));
    
    // Execute hierarchy analysis in Chrome
    const result = await Runtime.evaluate({
      expression: `
        JSON.stringify((() => {
          try {
            console.log('CLITS: Starting element hierarchy analysis');
            const hierarchy = [];
            
            // Find all interactive elements and their hierarchy levels
            const interactiveSelectors = [
              // Basic interactive elements
              'a[href]', 'button', 'input[type="button"]', 'input[type="submit"]',
              'input[type="checkbox"]', 'input[type="radio"]', '[role="button"]',
              '[role="switch"]', '[role="checkbox"]', '[onclick]',
              
              // Data-testid patterns (very common in React apps)
              '[data-testid]',
              
              // Aria patterns
              '[aria-label]', '[aria-describedby]', '[aria-controls]',
              
              // Class patterns for buttons and interactive elements
              '[class*="button"]', '[class*="Button"]', '[class*="btn"]', '[class*="Btn"]',
              '[class*="click"]', '[class*="Click"]', '[class*="link"]', '[class*="Link"]',
              '[class*="action"]', '[class*="Action"]', '[class*="menu"]', '[class*="Menu"]',
              '[class*="item"]', '[class*="Item"]', '[class*="card"]', '[class*="Card"]',
              '[class*="tile"]', '[class*="Tile"]', '[class*="tab"]', '[class*="Tab"]',
              
              // Material-UI specific interactive elements
              '.MuiButton-root', '.MuiIconButton-root', '.MuiMenuItem-root',
              '.MuiListItem-root', '.MuiCard-root', '.MuiChip-root',
              '.MuiTab-root', '.MuiAccordion-root', '.MuiTableRow-root',
              
              // Generic clickable patterns
              '[tabindex]:not([tabindex="-1"])', '[draggable="true"]',
              
              // SVG and icon elements that might be clickable
              'svg[role="button"]', 'svg[onclick]', '[class*="icon"][onclick]',
              
              // Div elements that might be clickable (common in modern web apps)
              'div[onclick]', 'div[role="button"]', 'div[tabindex]:not([tabindex="-1"])',
              'span[onclick]', 'span[role="button"]'
            ];
            
            console.log('CLITS: Searching for elements with', interactiveSelectors.length, 'different selector patterns');
            const allElements = document.querySelectorAll(interactiveSelectors.join(', '));
            console.log('CLITS: Found', allElements.length, 'potential interactive elements');
            
            // Also search for elements with common interactive text content
            const interactiveTextPatterns = [
              'edit', 'delete', 'view', 'open', 'close', 'save', 'cancel', 'submit',
              'add', 'remove', 'create', 'update', 'login', 'logout', 'sign',
              'play', 'pause', 'stop', 'next', 'previous', 'back', 'forward',
              'settings', 'config', 'profile', 'account', 'dashboard', 'home'
            ];
            
            const textBasedElements = [];
            interactiveTextPatterns.forEach(pattern => {
              const elements = document.querySelectorAll(\`*:not(script):not(style)\`);
              Array.from(elements).forEach(el => {
                const text = el.textContent ? el.textContent.toLowerCase().trim() : '';
                if (text.includes(pattern) && text.length < 100 && 
                    (el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'P' || el.tagName === 'A') &&
                    el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0) {
                  textBasedElements.push(el);
                }
              });
            });
            
            console.log('CLITS: Found', textBasedElements.length, 'additional text-based interactive elements');
            
            // Combine both sets of elements
            const combinedElements = new Set([...Array.from(allElements), ...textBasedElements]);
            console.log('CLITS: Total unique elements to process:', combinedElements.size);
            
            Array.from(combinedElements).forEach((element, index) => {
              try {
                // Calculate hierarchy level based on DOM depth from body
                let level = 0;
                let parent = element.parentElement;
                while (parent && parent !== document.body) {
                  level++;
                  parent = parent.parentElement;
                }
                
                // Normalize levels - make top-level interactive elements level 0
                level = Math.max(0, level - 5);
               
               // Get element info
               let href = '';
               let text = element.textContent ? element.textContent.trim() : '';
               
               if (element.tagName.toLowerCase() === 'a') {
                 href = element.href;
               } else if (element.hasAttribute('onclick')) {
                 href = 'javascript:' + element.getAttribute('onclick');
                 text = text || element.getAttribute('aria-label') || element.getAttribute('title') || 'Button';
               } else {
                  const testId = element.getAttribute('data-testid');
                  const id = element.getAttribute('id');
                  const className = element.getAttribute('class');
                  
                  // Skip layout-only elements
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
                    // For buttons, use simple selectors
                    if (element.tagName.toLowerCase() === 'button') {
                      const buttonText = element.textContent ? element.textContent.trim() : '';
                      const ariaLabel = element.getAttribute('aria-label');
                      
                      if (ariaLabel) {
                        href = 'button[aria-label="' + ariaLabel + '"]';
                      } else if (buttonText && buttonText.length > 0 && buttonText.length < 50) {
                        href = buttonText;
                      } else {
                        href = 'button';
                      }
                    } else {
                      // For non-buttons, try to find meaningful classes
                      const classes = className.split(' ').filter(c => 
                        c.length > 2 && 
                        !c.startsWith('Mui') &&
                        !c.includes('css-') &&
                        !c.startsWith('r') &&
                        !c.startsWith('e') &&
                        !c.match(/^[a-z]{1,3}[0-9]+$/)
                      );
                      
                      if (classes.length > 0) {
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
                        // Generate selector using tag + attributes
                        const tag = element.tagName.toLowerCase();
                        const role = element.getAttribute('role');
                        const type = element.getAttribute('type');
                        const ariaLabel = element.getAttribute('aria-label');
                        const dataTestId = element.getAttribute('data-testid');
                        
                        if (dataTestId) {
                          href = '[data-testid="' + dataTestId + '"]';
                        } else if (ariaLabel) {
                          href = '[aria-label="' + ariaLabel + '"]';
                        } else if (role) {
                          href = tag + '[role="' + role + '"]';
                        } else if (type) {
                          href = tag + '[type="' + type + '"]';
                        } else {
                          href = tag;
                        }
                      }
                    }
                  }
                  
                  // Build element description
                  let description = '';
                  const ariaLabel = element.getAttribute('aria-label');
                  const title = element.getAttribute('title');
                  const placeholder = element.getAttribute('placeholder');
                  const alt = element.getAttribute('alt');
                  const dataTestId = element.getAttribute('data-testid');
                  const role = element.getAttribute('role');
                  const tagName = element.tagName.toLowerCase();
                  const inputType = element.getAttribute('type');
                  
                  // Get clean text content
                  let elementText = text || (element.textContent ? element.textContent.trim() : '');
                  if (elementText.length > 100) {
                    const specificElements = element.querySelectorAll('button, a, input, [role="button"]');
                    if (specificElements.length === 1) {
                      elementText = specificElements[0].textContent ? specificElements[0].textContent.trim() : '';
                    } else {
                      elementText = elementText.substring(0, 50) + '...';
                    }
                  }
                  
                  // Build description
                  if (ariaLabel && ariaLabel.length > 2) {
                    description = ariaLabel;
                  } else if (title && title.length > 2) {
                    description = title;
                  } else if (placeholder) {
                    description = 'Input: ' + placeholder;
                  } else if (alt) {
                    description = 'Image: ' + alt;
                  } else if (dataTestId) {
                    description = dataTestId.replace(/-/g, ' ').replace(/_/g, ' ');
                  } else if (elementText && elementText.length > 2) {
                    description = elementText;
                  } else {
                    description = inputType ? tagName + ' (' + inputType + ')' : tagName;
                  }
                  
                  // Add context from parent elements
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
                  
                  // Combine description and context
                  let finalName = description;
                  if (parentContext) {
                    finalName = parentContext + ' → ' + description;
                  }
                  
                  // Add element type emoji
                  if (tagName === 'button' || role === 'button' || element.onclick) {
                    finalName = '🔘 ' + finalName;
                  } else if (tagName === 'input') {
                    finalName = '📝 ' + finalName;
                  } else if (tagName === 'a') {
                    finalName = '🔗 ' + finalName;
                  } else if (role === 'tab') {
                    finalName = '📑 ' + finalName;
                  } else if (role === 'menuitem') {
                    finalName = '📋 ' + finalName;
                  }
                  
                  text = finalName;
                }
               
                // Skip generic MUI classes
                const isGenericMuiClass = href && (
                  href === '.MuiBox-root' || 
                  href === '.MuiGrid-root' || 
                  href === '.MuiContainer-root' ||
                  href === '.MuiStack-root' ||
                  href === '.MuiPaper-root' ||
                  href === '.MuiTypography-root'
                );
                
                // Prioritize actual clickable elements over generic divs
                const isActuallyClickable = (
                  // Always allow these clearly interactive elements
                  tagName === 'a' || 
                  tagName === 'button' || 
                  element.hasAttribute('onclick') ||
                  role === 'button' ||
                  role === 'link' ||
                  dataTestId ||
                  ariaLabel ||
                  (href && href.startsWith('http')) ||
                  // Allow most other elements unless they're clearly layout-only
                  (tagName !== 'div' && tagName !== 'span') ||
                  // Allow divs/spans with meaningful content or attributes
                  (elementText && elementText.length > 2) ||
                  (href && href.length > 3)
                );
                
                if (href && text.length > 0 && text.length < 150 && !isGenericMuiClass && isActuallyClickable) {
                  console.log('CLITS: Adding element', index + 1, ':', text.substring(0, 50), 'selector:', href.substring(0, 30));
                  hierarchy.push({
                    name: text,
                    url: href,
                    level: Math.min(level, 5),
                    parent: undefined
                  });
                } else {
                  console.log('CLITS: Skipping element', index + 1, '- href:', href, 'text length:', text.length, 'isGeneric:', isGenericMuiClass, 'isClickable:', isActuallyClickable);
                }
              } catch (error) {
                console.log('CLITS: Error processing element', index + 1, ':', error.message);
              }
            });
            
            console.log('CLITS: Final hierarchy has', hierarchy.length, 'elements');
            return hierarchy;
          } catch (error) {
            console.error('CLITS: JavaScript evaluation error:', error.message);
            return { error: error.message, stack: error.stack };
          }
        })())
      `
    });
    
    await client.close();
    
    if (result.result.value) {
      const parsed = JSON.parse(result.result.value);
      
      // Check if we got an error from the JavaScript evaluation
      if (parsed && typeof parsed === 'object' && parsed.error) {
        console.error(chalk.red(`❌ JavaScript evaluation error: ${parsed.error}`));
        if (parsed.stack) {
          console.error(chalk.gray(`Stack trace: ${parsed.stack}`));
        }
        return [];
      }
      
      // Check if we got a valid hierarchy array
      if (Array.isArray(parsed)) {
        console.log(chalk.gray(`✅ Element analysis complete: found ${parsed.length} interactive elements`));
        return parsed;
      }
      
      console.warn(chalk.yellow(`⚠️  Unexpected result format: ${typeof parsed}`));
      return [];
    }
    
    // Check if there was an exception during evaluation
    const resultWithException = result as any;
    if (resultWithException.exceptionDetails) {
      console.error(chalk.red(`❌ Chrome evaluation exception: ${resultWithException.exceptionDetails.text}`));
      if (resultWithException.exceptionDetails.exception?.description) {
        console.error(chalk.gray(`Exception details: ${resultWithException.exceptionDetails.exception.description}`));
      }
      return [];
    }
    
    console.warn(chalk.yellow('⚠️  No result value returned from element analysis'));
    return [];
  } catch (error) {
    console.warn(chalk.red(`❌ Failed to build element hierarchy: ${error instanceof Error ? error.message : String(error)}`));
    console.log(chalk.gray('This might be due to Chrome connection issues or page not being ready'));
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

// Removed unused chromeRemoteControl function that depended on Playwright



export async function main() {
  console.log(chalk.blue('\nCLiTS - Chrome Log Inspector & Troubleshooting System'));
  console.log(chalk.gray('Interactive Website Inspector with Chrome Remote Control\n'));

  try {
    // Check Chrome connection first
    await launchChromeIfNeeded();
    
    // Start the integrated inspect session
    await integratedInspectSession();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

async function integratedInspectSession(): Promise<void> {
  const spinner = ora('Connecting to Chrome debugging session...').start();
  
  try {
    // Get Chrome targets
    const response = await fetch('http://localhost:9222/json/list');
    const targets = await response.json() as Array<{
      id: string;
      type: string;
      url: string;
      title: string;
      webSocketDebuggerUrl?: string;
    }>;
    
    const pageTargets = targets.filter((t: any) => t.type === 'page');
    
    if (pageTargets.length === 0) {
      spinner.fail('No Chrome page targets found. Please open a tab in Chrome with --remote-debugging-port=9222');
      return;
    }
    
    spinner.succeed(`Found ${pageTargets.length} Chrome page target(s)`);
    
    // Let user select target if multiple
    let selectedTarget = pageTargets[0];
    if (pageTargets.length > 1) {
      const choices = pageTargets.map((t, index) => ({
        name: `[${index + 1}] ${t.title} - ${t.url}`,
        value: t
      }));
      
      const { target } = await inquirer.prompt([
        {
          type: 'list',
          name: 'target',
          message: 'Select Chrome tab to inspect:',
          choices
        }
      ]);
      selectedTarget = target;
    }
    
    console.log(chalk.cyan(`Selected: ${selectedTarget.title} - ${selectedTarget.url}`));
    
    // Main inspect loop with integrated log collection and navigation
    let running = true;
    while (running) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📊 Collect Logs (15 seconds)', value: 'logs' },
            { name: '🎮 Chrome Remote Control (Navigate)', value: 'navigate' },
            { name: '🔄 Both: Collect Logs + Navigate', value: 'both' },
            { name: '🌐 Navigate to new URL', value: 'goto' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'exit') {
        running = false;
      } else if (action === 'logs') {
        await collectLogsFromTarget(selectedTarget.id);
      } else if (action === 'navigate') {
        await directChromeControlLoop(selectedTarget, 9222, 'localhost');
      } else if (action === 'both') {
        // Start log collection in background
        console.log(chalk.yellow('\n🔄 Starting integrated session: Log collection + Navigation'));
        console.log(chalk.gray('Logs will be collected while you navigate. Navigate to trigger activity!\n'));
        
        // Start log collection in background (non-blocking)
        const logPromise = collectLogsFromTarget(selectedTarget.id, false); // false = don't wait
        
        // Start navigation immediately
        await directChromeControlLoop(selectedTarget, 9222, 'localhost');
        
        // Wait for log collection to complete
        await logPromise;
      } else if (action === 'goto') {
        const { url } = await inquirer.prompt([
          {
            type: 'input',
            name: 'url',
            message: 'Enter the URL to navigate to:',
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
        
        await navigateToUrl(selectedTarget.id, url);
      }
    }
    
  } catch (error) {
    spinner.fail(`Failed to connect to Chrome: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function collectLogsFromTarget(targetId: string, wait: boolean = true): Promise<void> {
  const { ChromeExtractor } = await import('./chrome-extractor.js');
  
  const spinner = ora('Starting log collection...').start();
  
  try {
    const extractor = new ChromeExtractor({
      port: 9222,
      host: 'localhost',
      includeNetwork: true,
      includeConsole: true,
      filters: {
        logLevels: ['error', 'warning', 'info', 'debug', 'log'],
        sources: ['network', 'console', 'devtools']
      },
      format: {
        includeTimestamp: true,
        includeStackTrace: true
      }
    });
    
    if (wait) {
      spinner.text = 'Collecting logs for 15 seconds...';
    } else {
      spinner.text = 'Log collection started in background...';
      spinner.succeed('Log collection running in background');
    }
    
    const logs = await extractor.extract(targetId);
    
    if (wait) {
      spinner.succeed(`Log collection complete! Collected ${logs.length} logs`);
    }
    
    if (logs.length > 0) {
      console.log(chalk.green(`\n📊 Collected ${logs.length} logs:`));
      console.log(JSON.stringify(logs, null, 2));
    } else {
      console.log(chalk.yellow('\n📊 No logs collected during this session'));
      console.log(chalk.gray('Try interacting with the page to generate logs'));
    }
    
  } catch (error) {
    if (wait) {
      spinner.fail(`Log collection failed: ${error instanceof Error ? error.message : String(error)}`);
    } else {
      console.log(chalk.red(`Background log collection failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}

async function navigateToUrl(targetId: string, url: string): Promise<void> {
  const CDP = await import('chrome-remote-interface');
  const spinner = ora(`Navigating to ${url}...`).start();
  
  try {
    const client = await CDP.default({ port: 9222, host: 'localhost', target: targetId });
    const { Page } = client;
    await Page.enable();
    await Page.navigate({ url });
    
    // Wait for navigation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await client.close();
    spinner.succeed(`Successfully navigated to ${url}`);
    
  } catch (error) {
    spinner.fail(`Navigation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export async function directChromeControl(port: number = 9222, host: string = 'localhost'): Promise<void> {
  console.log(chalk.blue('\n🎮 Direct Chrome Remote Control'));
  console.log(chalk.gray('Working directly with Chrome debugging session (no Playwright)\n'));

  try {
    // Check Chrome connection
    const spinner = ora('Connecting to Chrome debugging session...').start();
    
    const response = await fetch(`http://${host}:${port}/json/list`);
    const targets = await response.json() as Array<{
      id: string;
      type: string;
      url: string;
      title: string;
      webSocketDebuggerUrl?: string;
    }>;
    
    const pageTargets = targets.filter((t: any) => t.type === 'page');
    
    if (pageTargets.length === 0) {
      spinner.fail('No Chrome page targets found. Please open a tab in Chrome with --remote-debugging-port=9222');
      return;
    }
    
    spinner.succeed(`Found ${pageTargets.length} Chrome page target(s)`);
    
    // Let user select target if multiple
    let selectedTarget = pageTargets[0];
    if (pageTargets.length > 1) {
      const choices = pageTargets.map((t, index) => ({
        name: `[${index + 1}] ${t.title} - ${t.url}`,
        value: t
      }));
      
      const { target } = await inquirer.prompt([
        {
          type: 'list',
          name: 'target',
          message: 'Select Chrome tab to control:',
          choices
        }
      ]);
      selectedTarget = target;
    }
    
    console.log(chalk.cyan(`Selected: ${selectedTarget.title} - ${selectedTarget.url}`));
    
    // Start the direct Chrome control loop
    await directChromeControlLoop(selectedTarget, port, host);
    
  } catch (error) {
    console.error(chalk.red(`Failed to connect to Chrome: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

async function directChromeControlLoop(target: any, port: number, host: string): Promise<void> {
  let controlRunning = true;
  
  while (controlRunning) {
    try {
      // Build element hierarchy using direct CDP
      const spinner = ora('Analyzing page elements...').start();
      const allElements = await buildElementHierarchyDirect(target.id, port, host);
      
      if (allElements.length === 0) {
        spinner.fail('No clickable elements found on this page');
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: '🔄 Refresh and try again', value: 'refresh' },
              { name: '❌ Exit', value: 'exit' }
            ]
          }
        ]);
        
        if (action === 'exit') {
          controlRunning = false;
          return;
        }
        continue;
      }
      
      spinner.succeed(`Found ${allElements.length} clickable elements`);
      
      // Show elements for selection
      const choices = [
        ...allElements.map(element => ({
          name: `${element.name.slice(0, 80)}${element.name.length > 80 ? '...' : ''} ${chalk.gray(`${element.url.slice(0, 40)}${element.url.length > 40 ? '...' : ''}`)}`,
          value: element.url
        })),
        new inquirer.Separator(),
        { name: chalk.yellow('🔄 Refresh elements'), value: 'refresh' },
        { name: chalk.red('❌ Exit'), value: 'exit' }
      ];
      
      const { selectedUrl } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedUrl',
          message: `Select element to click (${allElements.length} found):`,
          choices,
          pageSize: 15
        }
      ]);
      
      if (selectedUrl === 'exit') {
        controlRunning = false;
        return;
      }
      
      if (selectedUrl === 'refresh') {
        continue;
      }
      
      // Click the selected element
      const clickSpinner = ora(`Clicking: ${selectedUrl}`).start();
      try {
        await clickElementDirect(target.id, selectedUrl, port, host);
        clickSpinner.succeed(`✅ Successfully clicked: ${selectedUrl}`);
        
        // Wait a moment for page changes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        clickSpinner.fail(`❌ Failed to click: ${selectedUrl}`);
        console.log(chalk.yellow(`Error: ${error instanceof Error ? error.message : String(error)}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`Control loop error: ${error instanceof Error ? error.message : String(error)}`));
      controlRunning = false;
    }
  }
}

async function buildElementHierarchyDirect(targetId: string, port: number, host: string): Promise<Array<{ name: string; url: string }>> {
  const CDP = await import('chrome-remote-interface');
  const client = await CDP.default({ port, host, target: targetId });
  
  try {
    const { Runtime } = client;
    await Runtime.enable();
    
    const result = await Runtime.evaluate({
      expression: `
        JSON.stringify((() => {
          const elements = [];
          
          // Find all clickable elements
          const selectors = [
            'a[href]', 'button', '[role="button"]', '[onclick]',
            'input[type="button"]', 'input[type="submit"]',
            '[data-testid]', '[aria-label]'
          ];
          
          const found = document.querySelectorAll(selectors.join(', '));
          
          Array.from(found).forEach(element => {
            let name = '';
            let selector = '';
            
            // Get element name
            const text = element.textContent ? element.textContent.trim() : '';
            const ariaLabel = element.getAttribute('aria-label');
            const dataTestId = element.getAttribute('data-testid');
            const tagName = element.tagName.toLowerCase();
            
            if (ariaLabel) {
              name = ariaLabel;
            } else if (dataTestId) {
              name = dataTestId.replace(/-/g, ' ').replace(/_/g, ' ');
            } else if (text && text.length > 0 && text.length < 50) {
              name = text;
            } else {
              name = tagName;
            }
            
            // Get selector
            if (tagName === 'a' && element.href) {
              selector = element.href;
            } else if (dataTestId) {
              selector = '[data-testid="' + dataTestId + '"]';
            } else if (ariaLabel) {
              selector = '[aria-label="' + ariaLabel + '"]';
            } else if (text && text.length > 0 && text.length < 30) {
              selector = text;
            } else {
              selector = tagName;
            }
            
            // Add emoji prefix
            if (tagName === 'a') {
              name = '🔗 ' + name;
            } else if (tagName === 'button' || element.getAttribute('role') === 'button') {
              name = '🔘 ' + name;
            } else if (tagName === 'input') {
              name = '📝 ' + name;
            }
            
            if (name && selector) {
              elements.push({ name, url: selector });
            }
          });
          
          return elements;
        })())
      `
    });
    
    if (result.result.value) {
      return JSON.parse(result.result.value);
    }
    
    return [];
    
  } finally {
    await client.close();
  }
}

async function clickElementDirect(targetId: string, selector: string, port: number, host: string): Promise<void> {
  const CDP = await import('chrome-remote-interface');
  const client = await CDP.default({ port, host, target: targetId });
  
  try {
    const { Runtime, Input } = client;
    await Runtime.enable();
    
    const result = await Runtime.evaluate({
      expression: `
        JSON.stringify((() => {
          const selector = '${selector.replace(/'/g, "\\'")}';
          let element = null;
          
          // Strategy 1: If it's a URL, find the link
          if (selector.startsWith('http')) {
            element = document.querySelector('a[href="' + selector + '"]');
          }
          
          // Strategy 2: CSS selector
          if (!element) {
            element = document.querySelector(selector);
          }
          
          // Strategy 3: Text search
          if (!element && selector.length < 50) {
            const clickables = Array.from(document.querySelectorAll('a, button, [role="button"], [onclick]'));
            element = clickables.find(el => el.textContent && el.textContent.includes(selector));
          }
          
          if (!element) {
            return { error: 'Element not found' };
          }
          
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            return { error: 'Element not visible' };
          }
          
          // For links, navigate directly
          if (element.tagName.toLowerCase() === 'a' && element.href) {
            window.location.href = element.href;
            return { success: true, method: 'navigation', url: element.href };
          }
          
          // For other elements, try clicking
          try {
            element.click();
            return { success: true, method: 'click' };
          } catch (e) {
            return { 
              success: true, 
              method: 'coordinates',
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            };
          }
        })())
      `
    });
    
    if (result.result.value) {
      const clickResult = JSON.parse(result.result.value);
      
      if (clickResult.error) {
        throw new Error(clickResult.error);
      }
      
      if (clickResult.method === 'coordinates') {
        // Use CDP mouse events as fallback
        await Input.dispatchMouseEvent({
          type: 'mousePressed',
          x: clickResult.x,
          y: clickResult.y,
          button: 'left',
          clickCount: 1
        });
        
        await Input.dispatchMouseEvent({
          type: 'mouseReleased',
          x: clickResult.x,
          y: clickResult.y,
          button: 'left',
          clickCount: 1
        });
      }
    }
    
  } finally {
    await client.close();
  }
} 