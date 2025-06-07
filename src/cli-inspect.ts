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

async function extractLinksFromPage(page: Page): Promise<Array<{ name: string; url: string }>> {
  try {
    const links = await page.evaluate(() => {
      const linkElements = Array.from(document.querySelectorAll(`
        a[href], 
        button, 
        input[type="button"], 
        input[type="submit"], 
        input[type="checkbox"],
        input[type="radio"],
        [role="button"], 
        [role="switch"],
        [role="checkbox"],
        [onclick], 
        [data-testid*="edit"], 
        [data-testid*="delete"], 
        [data-testid*="view"], 
        [data-testid*="toggle"], 
        [data-testid*="switch"], 
        [data-testid*="btn"], 
        [data-testid*="action"], 
        [aria-label*="edit"], 
        [aria-label*="delete"], 
        [aria-label*="view"], 
        [aria-label*="toggle"], 
        [aria-label*="switch"], 
        [class*="edit"], 
        [class*="delete"], 
        [class*="toggle"], 
        [class*="switch"], 
        [class*="btn"], 
        [class*="button"], 
        [class*="action"], 
        .toggle, 
        .switch, 
        .btn, 
        .button, 
        .edit, 
        .delete, 
        .action,
        .clickable,
        [tabindex]:not([tabindex="-1"])
      `.replace(/\s+/g, ' ').trim()));
      return linkElements
        .map(element => {
          let href = '';
          let text = element.textContent?.trim() || '';
          
          if (element.tagName.toLowerCase() === 'a') {
            href = (element as HTMLAnchorElement).href;
          } else if (element.hasAttribute('onclick')) {
            // For buttons with onclick, we'll use a special marker
            href = `javascript:${element.getAttribute('onclick')}`;
            text = text || element.getAttribute('aria-label') || element.getAttribute('title') || 'Button';
          } else {
            // For other interactive elements, try to find nearby links or use data attributes
            const nearbyLink = element.closest('a') || element.querySelector('a');
            if (nearbyLink) {
              href = (nearbyLink as HTMLAnchorElement).href;
            } else {
              // Use data attributes or create a selector-based identifier
              const testId = element.getAttribute('data-testid');
              const id = element.getAttribute('id');
              const className = element.getAttribute('class');
              
                            if (testId) {
                href = `[data-testid="${testId}"]`;
              } else if (id) {
                href = `#${id}`;
              } else if (className) {
                // Use the first meaningful class name
                const classes = className.split(' ').filter(c => c.length > 2);
                if (classes.length > 0) {
                  href = `.${classes[0]}`;
                } else {
                  href = `selector:fallback`;
                }
              } else {
                // Create a more specific selector using tag name and position
                const tagName = element.tagName.toLowerCase();
                const parent = element.parentElement;
                if (parent) {
                  const siblings = Array.from(parent.children).filter(el => el.tagName.toLowerCase() === tagName);
                  const index = siblings.indexOf(element);
                  href = `${tagName}:nth-of-type(${index + 1})`;
                } else {
                  href = tagName;
                }
              }
            }
            
            // Better text extraction for different element types
            if (!text) {
              text = element.getAttribute('aria-label') || 
                     element.getAttribute('title') || 
                     element.getAttribute('data-testid') || 
                     element.getAttribute('placeholder') ||
                     element.getAttribute('value') ||
                     element.getAttribute('alt') ||
                     '';
            }
            
            // Try to get context from parent elements to make descriptions more meaningful
            if (!text || text.length < 3) {
              // Look for nearby text content that might describe this element
              let contextText = '';
              
              // Search through parent hierarchy for meaningful context
              let currentElement = element.parentElement;
              let depth = 0;
              while (currentElement && depth < 5) {
                // Look for headings, labels, or cards that might contain this element
                const headings = currentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
                const labels = currentElement.querySelectorAll('label, .label, [data-label]');
                const titles = currentElement.querySelectorAll('[title], .title, .name');
                
                // Get text from these elements
                for (const heading of headings) {
                  const headingText = heading.textContent?.trim();
                  if (headingText && headingText.length < 50) {
                    contextText = headingText;
                    break;
                  }
                }
                
                if (!contextText) {
                  for (const label of labels) {
                    const labelText = label.textContent?.trim();
                    if (labelText && labelText.length < 50) {
                      contextText = labelText;
                      break;
                    }
                  }
                }
                
                if (!contextText) {
                  for (const title of titles) {
                    const titleText = title.textContent?.trim();
                    if (titleText && titleText.length < 50) {
                      contextText = titleText;
                      break;
                    }
                  }
                }
                
                if (contextText) break;
                currentElement = currentElement.parentElement;
                depth++;
              }
              
              // Look for specific patterns in class names that might be meaningful
              const className = element.getAttribute('class') || '';
              let actionType = '';
              if (className.includes('edit')) {
                actionType = 'Edit';
              } else if (className.includes('delete')) {
                actionType = 'Delete';
              } else if (className.includes('toggle')) {
                actionType = 'Toggle';
              } else if (className.includes('switch')) {
                actionType = 'Switch';
              } else if (className.includes('add')) {
                actionType = 'Add';
              } else if (className.includes('refresh')) {
                actionType = 'Refresh';
              }
              
              // Combine context and action type
              if (contextText && actionType) {
                text = `${actionType} - ${contextText}`;
              } else if (contextText) {
                text = contextText;
              } else if (actionType) {
                text = `${actionType} Button`;
              }
            }
            
            // Add element type info to help identify what it is
            const elementType = element.tagName.toLowerCase();
            const elementRole = element.getAttribute('role');
            const inputType = element.getAttribute('type');
            
            if (elementType === 'input') {
              text = text || `${inputType || 'input'} field`;
            } else if (elementType === 'button') {
              text = text || 'Button';
            } else if (elementRole) {
              text = text || `${elementRole} element`;
            } else {
              text = text || `${elementType} element`;
            }
            
            // Clean up the text - remove extra whitespace and limit length
            text = text.replace(/\s+/g, ' ').trim();
            if (text.length > 80) {
              text = text.substring(0, 77) + '...';
            }
          }
          
          return { name: text, url: href };
        })
        .filter(link => {
          // Filter out empty links, but keep our special selector and javascript links
          return link.url && 
                 link.name.length > 0 && 
                 link.name.length < 100 && // Reasonable text length
                 (link.url.startsWith('http') || 
                  link.url.startsWith('javascript:') || 
                  link.url.startsWith('selector:') ||
                  link.url.startsWith('.') ||
                  link.url.startsWith('#') ||
                  link.url.startsWith('[') ||
                  /^[a-z]+(:nth-of-type\(\d+\))?$/.test(link.url)); // tag selectors
        })
        .slice(0, 15); // Limit to 15 most relevant elements to prevent terminal freezing
    });
    return links;
  } catch (error) {
    console.error('Error extracting links:', error);
    return [];
  }
}

async function extractLinksFromCurrentChromePage(): Promise<Array<{ name: string; url: string }>> {
  try {
    // Connect directly to Chrome to get current page content
    const CDP = await import('chrome-remote-interface');
    const client = await CDP.default({ port: 9222 });
    
    const { Page, Runtime, DOM } = client;
    await Page.enable();
    await Runtime.enable();
    await DOM.enable();
    
    // Execute the same link extraction logic directly in Chrome
    const result = await Runtime.evaluate({
      expression: `
        JSON.stringify((() => {
          const linkElements = Array.from(document.querySelectorAll(\`
            a[href], 
            button, 
            input[type="button"], 
            input[type="submit"], 
            input[type="checkbox"],
            input[type="radio"],
            [role="button"], 
            [role="switch"],
            [role="checkbox"],
            [onclick], 
            [data-testid*="edit"], 
            [data-testid*="delete"], 
            [data-testid*="view"], 
            [data-testid*="toggle"], 
            [data-testid*="switch"], 
            [data-testid*="btn"], 
            [data-testid*="action"], 
            [aria-label*="edit"], 
            [aria-label*="delete"], 
            [aria-label*="view"], 
            [aria-label*="toggle"], 
            [aria-label*="switch"], 
            [class*="edit"], 
            [class*="delete"], 
            [class*="toggle"], 
            [class*="switch"], 
            [class*="btn"], 
            [class*="button"], 
            [class*="action"], 
            .toggle, 
            .switch, 
            .btn, 
            .button, 
            .edit, 
            .delete, 
            .action,
            .clickable,
            [tabindex]:not([tabindex="-1"])
          \`.replace(/\\s+/g, ' ').trim()));
          return linkElements
            .map(element => {
              let href = '';
              let text = element.textContent?.trim() || '';
              
              if (element.tagName.toLowerCase() === 'a') {
                href = element.href;
              } else if (element.hasAttribute('onclick')) {
                href = 'javascript:' + element.getAttribute('onclick');
                text = text || element.getAttribute('aria-label') || element.getAttribute('title') || 'Button';
              } else {
                const nearbyLink = element.closest('a') || element.querySelector('a');
                if (nearbyLink) {
                  href = nearbyLink.href;
                } else {
                  const testId = element.getAttribute('data-testid');
                  const id = element.getAttribute('id');
                  const className = element.getAttribute('class');
                  if (testId) {
                    href = '[data-testid="' + testId + '"]';
                  } else if (id) {
                    href = '#' + id;
                  } else if (className) {
                    const classes = className.split(' ').filter(c => c.length > 2);
                    if (classes.length > 0) {
                      href = '.' + classes[0];
                    } else {
                      href = 'selector:fallback';
                    }
                  }
                }
                text = text || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('data-testid') || 'Interactive Element';
              }
              
              return { name: text, url: href };
            })
            .filter(link => {
              return link.url && 
                     link.name.length > 0 && 
                     link.name.length < 100 &&
                     (link.url.startsWith('http') || 
                      link.url.startsWith('javascript:') || 
                      link.url.startsWith('selector:') ||
                      link.url.startsWith('.') ||
                      link.url.startsWith('#') ||
                      link.url.startsWith('[') ||
                      /^[a-z]+(:nth-of-type\\(\\d+\\))?$/.test(link.url));
            })
            .slice(0, 15);
        })())
      `
    });
    
    await client.close();
    return JSON.parse(result.result.value || '[]');
  } catch (error) {
    console.error('Error extracting links from Chrome:', error);
    return [];
  }
}

async function chromeRemoteControl(automation: ChromeAutomation, page: Page): Promise<void> {
  const spinner = ora('Extracting links from current page...').start();
  
  try {
    let links = await extractLinksFromPage(page);
    
    if (links.length === 0) {
      spinner.fail('No navigable links found on this page');
      return;
    }
    
    spinner.succeed(`Found ${links.length} links`);
    
    let controlRunning = true;
    while (controlRunning) {
      console.log(chalk.blue('\n🎮 Chrome Remote Control'));
      console.log(chalk.gray('Use arrow keys to navigate, Enter to select\n'));
      
      const choices = [
        ...links.map(link => ({
          name: `${link.name.slice(0, 60)}${link.name.length > 60 ? '...' : ''} ${chalk.gray(`(${link.url.slice(0, 50)}${link.url.length > 50 ? '...' : ''})`)}`,
          value: link.url
        })),
        { name: chalk.yellow('🔄 Refresh links from current page'), value: 'refresh' },
        { name: chalk.red('❌ Exit Chrome Remote Control'), value: 'exit' }
      ];
      
      const { selectedUrl } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedUrl',
          message: 'Select an option:',
          choices,
          pageSize: 10
        }
      ]);
      
      if (selectedUrl === 'exit') {
        controlRunning = false;
        return;
      }
      
      if (selectedUrl === 'refresh') {
        const refreshSpinner = ora('Refreshing links from current page...').start();
        try {
          // Get fresh page content from Chrome directly
          const newLinks = await extractLinksFromCurrentChromePage();
          if (newLinks.length > 0) {
            links = newLinks; // Replace all links
            refreshSpinner.succeed(`Found ${newLinks.length} links on current page`);
          } else {
            refreshSpinner.warn('No links found on current page');
          }
        } catch (error) {
          refreshSpinner.fail(`Failed to refresh links: ${error instanceof Error ? error.message : String(error)}`);
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
              timeout: 10000
            });
            navSpinner.succeed(`✅ Successfully clicked element: ${selector}`);
          } catch (error) {
            navSpinner.fail(`❌ Failed to click element: ${selector}`);
            console.log(chalk.yellow(`Error details: ${error instanceof Error ? error.message : String(error)}`));
            console.log(chalk.gray('This helps us debug the automation system!'));
          }
        }
        
        // Wait a moment for page to load, then auto-refresh links
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const refreshSpinner = ora('Auto-refreshing links from new page...').start();
        try {
          // Get fresh links from current Chrome page
          const newLinks = await extractLinksFromCurrentChromePage();
          if (newLinks.length > 0) {
            links = newLinks; // Replace all links
            refreshSpinner.succeed(`Found ${newLinks.length} new links`);
          } else {
            refreshSpinner.warn('No new links found, keeping previous links');
          }
        } catch (error) {
          refreshSpinner.fail('Failed to refresh links, keeping previous ones');
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