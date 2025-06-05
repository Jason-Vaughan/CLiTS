#!/usr/bin/env node

import { chromium, Browser, Page } from 'playwright';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import os from 'os';
import readline from 'readline';

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

    // Ask user what to do next
    let running = true;
    while (running) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Capture current page state again', value: 'capture' },
            { name: 'Navigate to a new URL', value: 'navigate' },
            { name: 'Exit', value: 'exit' }
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

async function main() {
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

main(); 