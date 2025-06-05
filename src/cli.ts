#!/usr/bin/env node

// BSD: Entry point for the AI-Debug-Extractor CLI tool. Handles command-line arguments and orchestrates log/data extraction.

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
    .option('--no-timestamps', 'Exclude timestamps from output')
    .option('--no-stack-traces', 'Exclude stack traces from output')
    .option('--output-file <path>', 'Save logs to the specified file path')
    .option('--error-summary', 'Include summary statistics of error frequencies')
    .option('--live-mode [duration]', 'Run in live mode for specified duration in seconds (default: 60)')
    .option('--interactive-login', 'Use interactive wizard for Chrome inspection')
    .action(async (options) => {
      try {
        // Chrome DevTools extraction
        if (options.chrome) {
          // Check if Chrome is running with remote debugging
          const http = await import('http');
          await new Promise((resolve, reject) => {
            const req = http.request({ hostname: 'localhost', port: 9222, path: '/json/version', timeout: 2000 }, res => {
              if (res.statusCode === 200) resolve(true);
              else reject(new Error('Chrome is not running with remote debugging enabled on port 9222.'));
            });
            req.on('error', () => reject(new Error('Chrome is not running with remote debugging enabled on port 9222.')));
            req.end();
          }).catch(() => {
            console.error('[CLITS] Error: Chrome must be started with --remote-debugging-port=9222 for --chrome or --interactive-login.');
            process.exit(1);
          });

          // Connect to Chrome and collect logs
          const browser = await chromium.connectOverCDP('http://localhost:9222');
          const context = browser.contexts()[0];
          const page = context.pages()[0] || await context.newPage();
          
          // Collect console messages
          page.on('console', (msg: any) => {
            console.log(`[AI-INSPECTOR][CONSOLE][${msg.type()}]`, msg.text());
          });

          // Collect network requests and responses
          page.on('request', (request: any) => {
            console.log(`[AI-INSPECTOR][NETWORK][REQUEST]`, JSON.stringify({
              url: request.url(),
              method: request.method(),
              headers: request.headers(),
              postData: request.postData(),
              resourceType: request.resourceType(),
            }));
          });

          // Dump DOM structure
          const dom = await page.content();
          console.log('[AI-INSPECTOR][DOM]', dom.slice(0, 5000)); // limit output size
          
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