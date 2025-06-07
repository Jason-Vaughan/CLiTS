#!/usr/bin/env node

// BSD: Entry point for the CLiTS-INSPECTOR CLI tool. Handles command-line arguments and orchestrates log/data extraction.

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { PathResolver } from './utils/path-resolver.js';
import { ChromeExtractor } from './chrome-extractor.js';
import inquirer from 'inquirer';

const pathResolver = PathResolver.getInstance();
const packageJson = JSON.parse(readFileSync(pathResolver.resolvePath('package.json'), 'utf8'));

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
    .option('--target-id <id>', 'Specify a Chrome tab/page target ID to connect to')
    .action(async (options) => {
      try {
        // Chrome DevTools extraction
        if (options.chrome) {
          const chromeExtractor = new ChromeExtractor({
            port: parseInt(options.chromePort),
            host: options.chromeHost,
            includeNetwork: options.network !== false,
            includeConsole: options.console !== false,
            filters: {
              logLevels: options.logLevels?.split(',') as any[],
              sources: options.sources?.split(',') as any[],
              domains: options.domains?.split(','),
              keywords: options.keywords?.split(','),
              excludePatterns: options.exclude?.split(','),
            },
            format: {
              groupBySource: options.groupBySource,
              groupByLevel: options.groupByLevel,
              includeTimestamp: options.noTimestamps !== true,
              includeStackTrace: options.noStackTraces !== true,
            },
            reconnect: {
              enabled: true, // Always enable reconnection for CLI usage
              maxAttempts: 5,
              delayBetweenAttemptsMs: 2000,
            },
          });

          let targetId: string | undefined = options.targetId;

          if (!targetId) {
            const targets = await chromeExtractor.getDebuggablePageTargets();
            if (targets.length === 0) {
              console.error('Error: No debuggable Chrome tabs found. Please open a new tab in Chrome running with --remote-debugging-port=9222');
              process.exit(1);
            } else if (targets.length === 1) {
              targetId = targets[0].id;
              console.log(`Automatically selected target: ${targets[0].title || targets[0].url}`);
            } else {
              const choices = targets.map((t, index) => ({
                name: `[${index + 1}] ${t.title || t.url} (ID: ${t.id})`,
                value: t.id,
              }));

              const answer = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'selectedTargetId',
                  message: 'Multiple debuggable Chrome tabs found. Please select one:',
                  choices: choices,
                },
              ]);
              targetId = answer.selectedTargetId;
            }
          }
          
          if (!targetId) {
            console.error('Error: No Chrome target selected.');
            process.exit(1);
          }

          console.log('[CLiTS-INSPECTOR] Starting Chrome DevTools extraction...');
          const extractedLogs = await chromeExtractor.extract(targetId);
          console.log(JSON.stringify(extractedLogs, null, 2));
          return;
        }

        // File system extraction
        if (options.source) {
          const { exists, error } = pathResolver.validatePath(options.source);
          if (!exists) {
            console.error(`[CLiTS-INSPECTOR] Error: Invalid source path. ${error}. Please ensure the path is correct and accessible.`);
            process.exit(1);
          }
          console.log(`Extracting logs from ${options.source}...`);
          // TODO: Implement file system extraction
          return;
        }

        console.error('[CLiTS-INSPECTOR] Error: No extraction source specified. Use --source for files or --chrome for Chrome DevTools.');
        process.exit(1);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`[CLiTS-INSPECTOR] An error occurred during extraction: ${error.message}`);
          // Add more specific error handling here if needed
          if (error.message.includes('Chrome target with ID') || error.message.includes('No debuggable Chrome tabs found')) {
            console.error('[CLiTS-INSPECTOR] Please ensure Chrome is running with remote debugging enabled (--remote-debugging-port=9222) and a debuggable tab is open.');
          }
        } else {
          console.error(`[CLiTS-INSPECTOR] An unexpected error occurred: ${String(error)}`);
        }
        process.exit(1);
      }
    });

  await program.parseAsync();
}

main().catch((error) => {
  console.error('[CLiTS-INSPECTOR] A fatal error occurred outside the command handler:', error);
  process.exit(1);
}); 