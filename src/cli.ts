#!/usr/bin/env node

// BSD: Entry point for the AI-Debug-Extractor CLI tool. Handles command-line arguments and orchestrates log/data extraction.

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { LogExtractor } from './extractor.js';
import { ChromeExtractor } from './chrome-extractor.js';
import { ReportGenerator } from './report.js';
import { spawn } from 'child_process';

// Define a common base type for all extractors
type Extractor = LogExtractor | ChromeExtractor;

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
    .option('-s, --source <path>', 'Source directory path for file extraction')
    .option('-p, --patterns <patterns...>', 'Log file patterns to match', ['*.log'])
    .option('-m, --max-size <size>', 'Maximum file size in MB', '10')
    .option('-n, --max-files <number>', 'Maximum number of files to process', '100')
    .option('--chrome', 'Extract logs from an existing Chrome session (must be started with --remote-debugging-port=9222)')
    .option('--chrome-host <host>', 'Chrome DevTools host', 'localhost')
    .option('--chrome-port <port>', 'Chrome DevTools port', '9222')
    .option('--no-network', 'Exclude network logs from Chrome DevTools')
    .option('--no-console', 'Exclude console logs from Chrome DevTools')
    .option('--log-levels <levels>', 'Filter by log levels (comma-separated)', 'error,warning,info,debug')
    .option('--sources <sources>', 'Filter by sources (comma-separated)', 'network,console,devtools')
    .option('--domains <domains>', 'Filter by domain patterns (comma-separated)')
    .option('--keywords <keywords>', 'Filter by keywords (comma-separated)')
    .option('--exclude <patterns>', 'Exclude logs matching patterns (comma-separated)')
    .option('--advanced-filter <expression>', 'Advanced boolean filter expression, e.g., "(React AND error) OR (network AND 404)"')
    .option('--group-by-source', 'Group logs by their source')
    .option('--group-by-level', 'Group logs by their level')
    .option('--no-timestamps', 'Exclude timestamps from output')
    .option('--no-stack-traces', 'Exclude stack traces from output')
    .option('--output-file <path>', 'Save logs to the specified file path')
    .option('--error-summary', 'Include summary statistics of error frequencies')
    .option('--live-mode [duration]', 'Run in live mode for specified duration in seconds (default: 60)')
    .option('--interactive-login', 'Pause and prompt for manual login before running browser automation (sets INTERACTIVE_LOGIN=1 for Playwright, attaches to existing Chrome)')
    .option('--no-login', 'Bypass any login prompts and run automation as unauthenticated')
    .action(async (options) => {
      try {
        const extractors: Extractor[] = [];

        // File system extraction
        if (options.source) {
          const fileExtractor = new LogExtractor({
            sourcePath: options.source,
            patterns: options.patterns,
            maxFileSize: parseInt(options.maxSize) * 1024 * 1024,
            maxFiles: parseInt(options.maxFiles)
          });
          extractors.push(fileExtractor);
        }

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
          }).catch(err => {
            console.error('[CLITS] Error: Chrome must be started with --remote-debugging-port=9222 for --chrome or --interactive-login.');
            process.exit(1);
          });
          // If Playwright E2E is to be run, invoke as a subprocess for AI assistant compatibility
          const env = { ...process.env };
          if (options.interactiveLogin && !options.noLogin) {
            env.INTERACTIVE_LOGIN = '1';
          }
          // Run Playwright E2E test as subprocess
          const args = ['test', 'e2e/chrome-debug.spec.ts'];
          const child = spawn('npx', ['playwright', ...args], {
            stdio: 'inherit',
            env,
          });
          child.on('exit', code => process.exit(code));
          return; // Do not continue with legacy ChromeExtractor logic
        }

        if (extractors.length === 0) {
          console.error('Error: No extraction source specified. Use --source for files or --chrome for Chrome DevTools');
          process.exit(1);
        }

        // Handle live mode if enabled
        if (options.liveMode) {
          const duration = parseInt(options.liveMode === true ? '60' : options.liveMode);
          console.log(`Running in live mode for ${duration} seconds...`);
          
          // Run extraction in intervals and continuously update
          let elapsedSeconds = 0;
          const intervalSeconds = 5;  // Update every 5 seconds
          
          const liveInterval = setInterval(async () => {
            try {
              elapsedSeconds += intervalSeconds;
              console.log(`Live mode: ${elapsedSeconds}/${duration} seconds elapsed`);
              
              const liveLogs = [];
              for (const extractor of extractors) {
                const logs = await extractor.extract();
                liveLogs.push(...logs);
              }
              
              const liveReport = ReportGenerator.generateReport({
                logs: liveLogs,
                extractionOptions: options,
                includeErrorSummary: options.errorSummary
              });
              
              // Update output
              if (options.outputFile) {
                try {
                  const fs = await import('fs/promises');
                  await fs.writeFile(options.outputFile, JSON.stringify(liveReport, null, 2));
                  console.log(`Updated ${liveLogs.length} logs to ${options.outputFile}`);
                } catch (error) {
                  console.error(`Error writing to output file: ${error instanceof Error ? error.message : String(error)}`);
                }
              } else {
                // Clear console and show latest data
                console.clear();
                console.log(`Live update (${elapsedSeconds}/${duration} seconds):`);
                console.log(`Found ${liveLogs.length} logs in this interval`);
                
                // Show error summary if enabled
                if (options.errorSummary && liveReport.summary.errors) {
                  console.log('\nError Summary:');
                  liveReport.summary.errors.mostCommonErrors.forEach(error => {
                    console.log(`- ${error.type}: ${error.count} occurrences (${error.percentage}%)`);
                  });
                }
              }
              
              // Exit when duration is reached
              if (elapsedSeconds >= duration) {
                clearInterval(liveInterval);
                console.log('Live mode completed');
                process.exit(0);
              }
            } catch (error) {
              console.error(`Live mode error: ${error instanceof Error ? error.message : String(error)}`);
            }
          }, intervalSeconds * 1000);
          
          // Handle graceful exit
          process.on('SIGINT', () => {
            clearInterval(liveInterval);
            console.log('\nLive mode terminated by user');
            process.exit(0);
          });
          
          // Keep the process running
          return;
        }
        
        console.log('Extracting debug data...');
        const allLogs = [];
        
        for (const extractor of extractors) {
          const logs = await extractor.extract();
          allLogs.push(...logs);
        }
        
        const report = ReportGenerator.generateReport({
          logs: allLogs,
          extractionOptions: options,
          includeErrorSummary: options.errorSummary
        });

        // Output to file if specified
        if (options.outputFile) {
          try {
            const fs = await import('fs/promises');
            await fs.writeFile(options.outputFile, JSON.stringify(report, null, 2));
            console.log(`Debug data extracted successfully and saved to ${options.outputFile}`);
          } catch (error) {
            console.error(`Error writing to output file: ${error instanceof Error ? error.message : String(error)}`);
            console.log(JSON.stringify(report, null, 2)); // Fallback to console output
          }
        } else {
          // Output to console
          console.log(JSON.stringify(report, null, 2));
          console.log('Debug data extracted successfully');
        }
      } catch (error) {
        console.error(`Failed to extract debug data: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 