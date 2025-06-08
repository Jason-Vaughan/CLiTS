#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import os from 'os';
import fetch from 'node-fetch';

// Add command-line argument parsing for AI automation
const program = new Command();

program
  .name('clits-inspect')
  .description('AI-First Chrome Inspector with automation capabilities')
  .version('1.0.6-beta.2')
  .option('--url <url>', 'Navigate to specific URL automatically')
  .option('--auto', 'Run in fully automated mode (no prompts)')
  .option('--json', 'Output structured JSON for AI consumption')
  .option('--verbose', 'Enable verbose logging for debugging automation workflows')
  .option('--action <action>', 'Specific action: logs|navigate|click', 'logs')
  .option('--selector <selector>', 'CSS selector to click (for click action)')
  .option('--duration <seconds>', 'Log collection duration in seconds', '15')
  .option('--port <port>', 'Chrome debugging port', '9222')
  .option('--host <host>', 'Chrome debugging host', 'localhost')
  .option('--target-priority <priority>', 'Auto-select target: localhost|dev|newest|largest', 'localhost')
  .parse();

const options = program.opts();

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
  if (isChrome) {
    if (options.verbose) console.log(chalk.green('✅ Chrome already running with remote debugging'));
    return;
  }

  if (os.platform() === 'darwin') {
    if (!options.verbose) {
      console.log(chalk.yellow('\nChrome is not running with remote debugging. Launching Chrome for you...'));
    } else {
      console.log(chalk.yellow('🚀 Chrome not detected, auto-launching...'));
    }
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const args = [
      '--remote-debugging-port=9222',
      '--user-data-dir=/tmp/chrome-debug',
      '--no-first-run',
      '--no-default-browser-check'
    ];
    if (options.verbose) {
      console.log(chalk.gray(`Chrome path: ${chromePath}`));
      console.log(chalk.gray(`Chrome args: ${args.join(' ')}`));
    }
    spawn(chromePath, args, {
      detached: true,
      stdio: 'ignore'
    }).unref();
    // Wait a few seconds for Chrome to start
    if (options.verbose) console.log(chalk.blue('⏳ Waiting 4s for Chrome to start...'));
    await new Promise(resolve => setTimeout(resolve, 4000));
    if (options.verbose) console.log(chalk.green('✅ Chrome launch complete'));
  } else {
    throw new Error('Auto-launch is only supported on macOS. Please start Chrome manually.');
  }
}

// Standalone Chrome launcher for automated commands (doesn't rely on global options)
async function launchChromeForAutomation(port: number = 9222): Promise<void> {
  try {
    await fetch(`http://localhost:${port}/json/version`);
    return; // Chrome already running
  } catch {
    // Chrome not running, need to launch
  }

  if (os.platform() === 'darwin') {
    console.log('Chrome is not running with remote debugging. Launching Chrome...');
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const args = [
      `--remote-debugging-port=${port}`,
      '--user-data-dir=/tmp/chrome-debug-clits',
      '--no-first-run',
      '--no-default-browser-check'
    ];
    
    spawn(chromePath, args, {
      detached: true,
      stdio: 'ignore'
    }).unref();
    
    // Wait for Chrome to start
    await new Promise(resolve => setTimeout(resolve, 4000));
  } else {
    throw new Error('Auto-launch is only supported on macOS. Please start Chrome manually with --remote-debugging-port=' + port);
  }
}

async function autoSelectTarget(): Promise<any> {
  if (options.verbose) console.log(chalk.blue(`🔗 Fetching targets from http://${options.host}:${options.port}/json/list`));
  const response = await fetch(`http://${options.host}:${options.port}/json/list`);
  const targets = await response.json() as Array<{
    id: string;
    type: string;
    url: string;
    title: string;
    webSocketDebuggerUrl?: string;
  }>;
  
  const pageTargets = targets.filter((t: any) => t.type === 'page');
  if (options.verbose) console.log(chalk.gray(`Found ${targets.length} total targets, ${pageTargets.length} page targets`));
  
  if (pageTargets.length === 0) {
    throw new Error('No Chrome page targets found. Please open a tab in Chrome with --remote-debugging-port=9222');
  }
  
  if (pageTargets.length === 1) {
    if (options.verbose) console.log(chalk.green('Only one target available, selecting it'));
    return pageTargets[0];
  }
  
  // AI-friendly target selection logic
  const priority = options.targetPriority || 'localhost';
  if (options.verbose) {
    console.log(chalk.blue(`🎯 Multiple targets found, using priority: ${priority}`));
    pageTargets.forEach((t, i) => {
      console.log(chalk.gray(`  ${i+1}. ${t.title} - ${t.url}`));
    });
  }
  
  switch (priority) {
    case 'localhost': {
      // Prefer localhost/development URLs
      const localTargets = pageTargets.filter(t => 
        t.url.includes('localhost') || 
        t.url.includes('127.0.0.1') || 
        t.url.includes('local') ||
        t.url.startsWith('http://localhost') ||
        t.url.startsWith('https://localhost')
      );
      if (localTargets.length > 0) {
        if (options.verbose) console.log(chalk.green(`✅ Found ${localTargets.length} localhost target(s), selecting first`));
        return localTargets[0];
      }
      break;
    }
      
    case 'dev': {
      // Prefer development-related URLs
      const devTargets = pageTargets.filter(t => 
        t.url.includes('dev') || 
        t.url.includes('staging') || 
        t.url.includes('test') ||
        t.title.toLowerCase().includes('dev')
      );
      if (devTargets.length > 0) {
        if (options.verbose) console.log(chalk.green(`✅ Found ${devTargets.length} dev target(s), selecting first`));
        return devTargets[0];
      }
      break;
    }
      
    case 'newest':
      // Return the most recently opened (last in list)
      if (options.verbose) console.log(chalk.green('✅ Selecting newest (last) target'));
      return pageTargets[pageTargets.length - 1];
      
    case 'largest':
      // Prefer targets with longer URLs (likely more complex apps)
      if (options.verbose) console.log(chalk.green('✅ Selecting target with longest URL'));
      return pageTargets.sort((a, b) => b.url.length - a.url.length)[0];
  }
  
  // Filter out chrome:// URLs as fallback
  const nonChromeTargets = pageTargets.filter(t => !t.url.startsWith('chrome://'));
  if (nonChromeTargets.length > 0) {
    if (options.verbose) console.log(chalk.yellow('⚠️  Priority selection failed, using first non-chrome:// target'));
    return nonChromeTargets[0];
  }
  
  // Last resort: return first available
  if (options.verbose) console.log(chalk.yellow('⚠️  Fallback: selecting first available target'));
  return pageTargets[0];
}

// Removed unused buildElementHierarchy function - replaced by buildElementHierarchyDirect

// Removed unused getCurrentPageName function

// Removed unused chromeRemoteControl function that depended on Playwright

let mainExecuted = false;

export async function main() {
  if (mainExecuted) {
    if (options.verbose) console.log(chalk.yellow('⚠️  Main function already executed, skipping...'));
    return;
  }
  mainExecuted = true;
  
  // AI Automation Mode vs Interactive Mode
  if (options.auto || options.url || options.json) {
    await aiAutomationMode();
  } else {
    await interactiveMode();
  }
}

async function aiAutomationMode() {
  const result: any = {
    success: false,
    action: options.action,
    timestamp: new Date().toISOString(),
    target: null,
    logs: [],
    elements: [],
    error: null
  };

  try {
    if (options.verbose) {
      console.log(chalk.blue('🤖 Starting AI automation mode'));
      console.log(chalk.gray(`Action: ${options.action}`));
      console.log(chalk.gray(`URL: ${options.url || 'none'}`));
      console.log(chalk.gray(`Selector: ${options.selector || 'none'}`));
      console.log(chalk.gray(`Duration: ${options.duration}s`));
      console.log(chalk.gray(`Target Priority: ${options.targetPriority}`));
    }
    
    // Launch Chrome if needed
    if (options.verbose) console.log(chalk.blue('🔍 Checking Chrome connection...'));
    await launchChromeIfNeeded();
    
    // Auto-select target
    if (options.verbose) console.log(chalk.blue('🎯 Auto-selecting Chrome target...'));
    const target = await autoSelectTarget();
    result.target = target;
    if (options.verbose) {
      console.log(chalk.green(`✅ Selected target: ${target.title}`));
      console.log(chalk.gray(`URL: ${target.url}`));
    }
    
    // Navigate to URL if specified
    if (options.url) {
      if (options.verbose) console.log(chalk.blue(`🧭 Navigating to: ${options.url}`));
      await navigateToUrl(target.id, options.url);
      if (options.verbose) console.log(chalk.green('✅ Navigation complete'));
    }
    
    // Execute action
    if (options.verbose) console.log(chalk.blue(`⚡ Executing action: ${options.action}`));
    switch (options.action) {
      case 'logs':
        if (options.verbose) console.log(chalk.blue('📊 Collecting logs...'));
        result.logs = await collectLogsFromTarget(target.id);
        if (options.verbose) console.log(chalk.green(`✅ Collected ${result.logs.length} logs`));
        break;
      case 'navigate':
        if (options.verbose) console.log(chalk.blue('🗺️  Building element hierarchy...'));
        result.elements = await buildElementHierarchyDirect(target.id, parseInt(options.port), options.host);
        if (options.verbose) console.log(chalk.green(`✅ Found ${result.elements.length} interactive elements`));
        break;
      case 'click':
        if (options.selector) {
          if (options.verbose) console.log(chalk.blue(`👆 Clicking element: ${options.selector}`));
          await clickElementDirect(target.id, options.selector, parseInt(options.port), options.host);
          if (options.verbose) console.log(chalk.green('✅ Click successful, collecting logs...'));
          result.logs = await collectLogsFromTarget(target.id);
          if (options.verbose) console.log(chalk.green(`✅ Collected ${result.logs.length} logs after click`));
        } else {
          throw new Error('--selector required for click action');
        }
        break;
    }
    
    result.success = true;
    if (options.verbose && !options.json) {
      console.log(chalk.green('🎉 Automation workflow completed successfully!'));
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    if (options.verbose && !options.json) {
      console.log(chalk.red('💥 Automation workflow failed:'), error);
    }
  }
  
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.success) {
      console.log(chalk.green('✅ Automation complete'));
    } else {
      console.log(chalk.red('❌ Automation failed:'), result.error);
    }
  }
  
  process.exit(result.success ? 0 : 1);
}

async function interactiveMode() {
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

async function collectLogsFromTarget(targetId: string, wait: boolean = true): Promise<any[]> {
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
    
    if (logs.length > 0 && !options.json) {
      console.log(chalk.green(`\n📊 Collected ${logs.length} logs:`));
      console.log(JSON.stringify(logs, null, 2));
    } else if (logs.length === 0 && !options.json) {
      console.log(chalk.yellow('\n📊 No logs collected during this session'));
      console.log(chalk.gray('Try interacting with the page to generate logs'));
    }
    
    return logs;
    
  } catch (error) {
    if (wait) {
      spinner.fail(`Log collection failed: ${error instanceof Error ? error.message : String(error)}`);
    } else {
      console.log(chalk.red(`Background log collection failed: ${error instanceof Error ? error.message : String(error)}`));
    }
    return [];
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
    // Auto-launch Chrome if needed (standalone version for automated commands)
    await launchChromeForAutomation(port);
    
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

// Entry point: Only run main if this file is executed directly
if (process.argv[1]?.includes('cli-inspect')) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}