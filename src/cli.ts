#!/usr/bin/env node

// BSD: Entry point for the CLiTS-INSPECTOR CLI tool. Handles command-line arguments and orchestrates log/data extraction.

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const program = new Command();

async function main(): Promise<void> {
  program
    .name('clits')
    .description('CLI tool for extracting and sharing debugging data for AI and web projects (CLITS)')
    .version(packageJson.version);

  program
    .command('extract')
    .description('Extract debugging data from specified sources')
    .option('-s, --source <path>', 'Source directory or file path to extract logs from')
    .option('-p, --patterns <patterns...>', 'File patterns to match (e.g., "*.log")')
    .option('-m, --max-size <size>', 'Maximum file size in MB to process', '10')
    .option('-f, --max-files <count>', 'Maximum number of files to process', '100')
    .option('--chrome', 'Extract logs from Chrome DevTools (requires Chrome running with --remote-debugging-port=9222)')
    .option('--chrome-host <host>', 'Chrome DevTools host', 'localhost')
    .option('--chrome-port <port>', 'Chrome DevTools port', '9222')
    .option('--no-network', 'Exclude network logs from Chrome DevTools')
    .option('--no-console', 'Exclude console logs from Chrome DevTools')
    .option('--log-levels <levels>', 'Filter by log levels (comma-separated)', 'error,warning,info,debug')
    .option('--sources <sources>', 'Filter by sources (comma-separated)', 'network,console,devtools')
    .option('--domains <domains>', 'Filter by domain patterns (comma-separated)')
    .option('--keywords <keywords>', 'Filter by keywords (comma-separated)')
    .option('--exclude <patterns>', 'Exclude logs matching patterns (comma-separated)')
    .option('--group-by-source', 'Group logs by their source')
    .option('--group-by-level', 'Group logs by their level')
    .option('--no-timestamps', 'Exclude timestamps from output')
    .option('--no-stack-traces', 'Exclude stack traces from output')
    .option('--output-file <path>', 'Save logs to the specified file path')
    .option('--error-summary', 'Include summary statistics of error frequencies')
    .option('--live-mode [duration]', 'Run in live mode for specified duration in seconds', '60')
    .option('--interactive-login', 'Use interactive wizard for Chrome inspection')
    .action(async (options) => {
      try {
        // Chrome DevTools extraction
        if (options.chrome) {
          // Check if Chrome is running with remote debugging
          const http = await import('http');
          await new Promise((resolve, reject) => {
            const req = http.request({ 
              hostname: options.chromeHost, 
              port: parseInt(options.chromePort), 
              path: '/json/version', 
              timeout: 2000 
            }, res => {
              if (res.statusCode === 200) resolve(true);
              else reject(new Error(`Chrome is not running with remote debugging enabled on ${options.chromeHost}:${options.chromePort}.`));
            });
            req.on('error', () => reject(new Error(`Chrome is not running with remote debugging enabled on ${options.chromeHost}:${options.chromePort}.`)));
            req.end();
          }).catch(() => {
            console.error(`[CLiTS-INSPECTOR] Error: Chrome must be started with --remote-debugging-port=${options.chromePort} for --chrome or --interactive-login.`);
            process.exit(1);
          });

          // Connect to Chrome and collect logs
          const browser = await chromium.connectOverCDP(`http://${options.chromeHost}:${options.chromePort}`);
          const context = browser.contexts()[0];
          const page = context.pages()[0] || await context.newPage();
          
          if (options.interactiveLogin) {
            const timeoutSeconds = 30;
            console.log(`\n[CLiTS-INSPECTOR] Please open Chrome and log in to the website you want to test.`);
            console.log(`[CLiTS-INSPECTOR] You have ${timeoutSeconds} seconds to log in, or the process will exit.`);
            console.log('[CLiTS-INSPECTOR] Press Enter when ready to continue...\n');

            let timeLeft = timeoutSeconds;
            const interval = setInterval(() => {
              process.stdout.write(`\r[CLiTS-INSPECTOR] Time remaining: ${timeLeft} seconds...`);
              timeLeft--;
              if (timeLeft < 0) {
                clearInterval(interval);
                console.log('\n[CLiTS-INSPECTOR] Login timeout reached. Exiting...');
                process.exit(1);
              }
            }, 1000);

            await new Promise(resolve => {
              process.stdin.once('data', () => {
                clearInterval(interval);
                process.stdout.write('\n');
                resolve(undefined);
              });
            });
          }
          
          console.log('[CLiTS-INSPECTOR] Connected to Chrome, collecting logs...');
          
          // Start live mode with countdown
          const liveModeSeconds = 60;
          console.log(`[CLiTS-INSPECTOR] Running in live mode for ${liveModeSeconds} seconds...`);
          let liveTimeLeft = liveModeSeconds;
          const liveInterval = setInterval(() => {
            process.stdout.write(`\r[CLiTS-INSPECTOR] Live mode time remaining: ${liveTimeLeft} seconds...`);
            liveTimeLeft--;
            if (liveTimeLeft < 0) {
              clearInterval(liveInterval);
              console.log('\n[CLiTS-INSPECTOR] Live mode completed. Exiting...');
              process.exit(0);
            }
          }, 1000);

          // Collect console messages if enabled
          if (options.console !== false) {
            page.on('console', (msg: any) => {
              const logLevel = msg.type();
              if (options.logLevels && !options.logLevels.split(',').includes(logLevel)) {
                return;
              }
              console.log(`[CLiTS-INSPECTOR][CONSOLE][${logLevel}]`, msg.text());
            });
          }

          // Collect network requests and responses if enabled
          if (options.network !== false) {
            page.on('request', (request: any) => {
              const requestData = {
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                postData: request.postData(),
                resourceType: request.resourceType(),
              };
              
              // Apply domain and keyword filters
              if (options.domains) {
                const domains = options.domains.split(',');
                if (!domains.some((domain: string) => request.url().includes(domain))) {
                  return;
                }
              }
              
              if (options.keywords) {
                const keywords = options.keywords.split(',');
                const requestStr = JSON.stringify(requestData);
                if (!keywords.some((keyword: string) => requestStr.includes(keyword))) {
                  return;
                }
              }
              
              console.log(`[CLiTS-INSPECTOR][NETWORK][REQUEST]`, JSON.stringify(requestData));
            });
          }

          // Wait for page to be ready
          try {
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            const dom = await page.content();
            console.log('[CLiTS-INSPECTOR][DOM]', dom.slice(0, 5000)); // limit output size
          } catch (error: any) {
            console.log('[CLiTS-INSPECTOR][WARNING] Could not capture DOM content:', error.message);
          }
          
          // Keep collecting logs for specified duration in live mode
          if (options.liveMode) {
            const duration = parseInt(options.liveMode) * 1000;
            console.log(`[CLiTS-INSPECTOR] Running in live mode for ${options.liveMode} seconds...`);
            await new Promise(resolve => setTimeout(resolve, duration));
          } else {
            // Default collection period
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          console.log('[CLiTS-INSPECTOR] Finished collecting logs.');
          await browser.close();
          return;
        }

        // File system extraction
        if (options.source) {
          console.log(`Extracting logs from ${options.source}...`);
          // TODO: Implement file system extraction
          return;
        }

        console.error('Error: No extraction source specified. Use --source for files or --chrome for Chrome DevTools');
        process.exit(1);
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 