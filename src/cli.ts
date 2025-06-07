#!/usr/bin/env node

// BSD: Entry point for the CLiTS-INSPECTOR CLI tool. Handles command-line arguments and orchestrates log/data extraction.

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { PathResolver } from './utils/path-resolver.js';
import { ChromeExtractor } from './chrome-extractor.js';
import inquirer from 'inquirer';
import tabtab from 'tabtab';

const pathResolver = PathResolver.getInstance();
const packageJson = JSON.parse(readFileSync(pathResolver.resolvePath('package.json'), 'utf8'));

const program = new Command();

async function main(): Promise<void> {
  program
    .name('clits')
    .description('CLI tool for extracting and sharing debugging data for AI and web projects (CLITS)')
    .version(packageJson.version)
    .addHelpText('after', `
Examples:
  $ clits extract --chrome --interactive
  $ clits extract --source ./logs --patterns "*.log" --output-file ./output.json
    `);

  program
    .command('extract')
    .description('Extract debugging data from specified sources like local files or a running Chrome instance.')
    .option('-s, --source <path>', 'Source directory or file path to extract logs from')
    .option('-p, --patterns <patterns...>', 'File patterns to match (e.g., "*.log")')
    .option('-m, --max-size <size>', 'Maximum file size in MB to process', '10')
    .option('-f, --max-files <count>', 'Maximum number of files to process', '100')
    .option('--chrome', 'Extract logs and other data from a running Chrome instance.')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol.', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol.', '9222')
    .option('--no-network', 'Disable network log extraction from Chrome DevTools.')
    .option('--no-console', 'Disable console log extraction from Chrome DevTools.')
    .option('--log-levels <levels>', 'Comma-separated list of log levels to include (e.g., "error,warning").', 'error,warning,info,debug')
    .option('--sources <sources>', 'Comma-separated list of log sources to include (e.g., "network,console").', 'network,console,devtools')
    .option('--domains <domains>', 'Comma-separated list of domain patterns to filter network requests.')
    .option('--keywords <keywords>', 'Comma-separated list of keywords to filter logs.')
    .option('--exclude <patterns>', 'Comma-separated list of regex patterns to exclude logs.')
    .option('--group-by-source', 'Group extracted logs by their source (e.g., network, console).')
    .option('--group-by-level', 'Group extracted logs by their log level (e.g., error, warning).')
    .option('--no-timestamps', 'Omit timestamps from the log output.')
    .option('--no-stack-traces', 'Omit stack traces from error logs.')
    .option('--output-file <path>', 'Path to save the extracted logs to a file.')
    .option('--error-summary', 'Include a summary of error frequencies in the output.')
    .option('--live-mode [duration]', 'Run in live mode, continuously extracting logs for a specified duration in seconds.', '60')
    .option('--interactive-login', 'Prompt for manual login within the browser before extraction.')
    .option('--target-id <id>', 'Specify a Chrome tab/page Target ID to connect to, skipping interactive selection.')
    .option('-i, --interactive', 'Run in interactive mode to select monitoring options.')
    .action(async (options) => {
      try {
        const extractionOptions: any = { ...options };

        if (options.interactive) {
          const answers = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'monitoring',
              message: 'Select monitoring features to enable:',
              choices: [
                { name: 'React Hook Monitoring', value: 'enableReactHookMonitoring' },
                { name: 'WebSocket Monitoring', value: 'includeWebSockets' },
                { name: 'JWT Monitoring', value: 'includeJwtMonitoring' },
                { name: 'GraphQL Monitoring', value: 'includeGraphqlMonitoring' },
                { name: 'Redux State Monitoring', value: 'includeReduxMonitoring' },
                { name: 'Performance Monitoring', value: 'includePerformanceMonitoring' },
                { name: 'Event Loop Monitoring', value: 'includeEventLoopMonitoring' },
                { name: 'User Interaction Recording', value: 'includeUserInteractionRecording' },
                { name: 'DOM Mutation Monitoring', value: 'includeDomMutationMonitoring' },
                { name: 'CSS Change Monitoring', value: 'includeCssChangeMonitoring' },
                { name: 'Headless Mode', value: 'headless' },
              ]
            }
          ]);

          answers.monitoring.forEach((feature: string) => {
            extractionOptions[feature] = true;
          });
        }

        // Chrome DevTools extraction
        if (extractionOptions.chrome) {
          const chromeExtractor = new ChromeExtractor({
            port: parseInt(extractionOptions.chromePort),
            host: extractionOptions.chromeHost,
            includeNetwork: extractionOptions.network !== false,
            includeConsole: extractionOptions.console !== false,
            enableReactHookMonitoring: extractionOptions.enableReactHookMonitoring,
            includeWebSockets: extractionOptions.includeWebSockets,
            includeJwtMonitoring: extractionOptions.includeJwtMonitoring,
            includeGraphqlMonitoring: extractionOptions.includeGraphqlMonitoring,
            includeReduxMonitoring: extractionOptions.includeReduxMonitoring,
            includePerformanceMonitoring: extractionOptions.includePerformanceMonitoring,
            includeEventLoopMonitoring: extractionOptions.includeEventLoopMonitoring,
            includeUserInteractionRecording: extractionOptions.includeUserInteractionRecording,
            includeDomMutationMonitoring: extractionOptions.includeDomMutationMonitoring,
            includeCssChangeMonitoring: extractionOptions.includeCssChangeMonitoring,
            headless: extractionOptions.headless,
            filters: {
              logLevels: extractionOptions.logLevels?.split(',') as any[],
              sources: extractionOptions.sources?.split(',') as any[],
              domains: extractionOptions.domains?.split(','),
              keywords: extractionOptions.keywords?.split(','),
              excludePatterns: extractionOptions.exclude?.split(','),
            },
            format: {
              groupBySource: extractionOptions.groupBySource,
              groupByLevel: extractionOptions.groupByLevel,
              includeTimestamp: extractionOptions.noTimestamps !== true,
              includeStackTrace: extractionOptions.noStackTraces !== true,
            },
            reconnect: {
              enabled: true, // Always enable reconnection for CLI usage
              maxAttempts: 5,
              delayBetweenAttemptsMs: 2000,
            },
          });

          let targetId: string | undefined = extractionOptions.targetId;

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
        if (extractionOptions.source) {
          const { exists, error } = pathResolver.validatePath(extractionOptions.source);
          if (!exists) {
            console.error(`[CLiTS-INSPECTOR] Error: Invalid source path. ${error}. Please ensure the path is correct and accessible.`);
            process.exit(1);
          }
          console.log(`Extracting logs from ${extractionOptions.source}...`);
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

  // Add command completion
  program.command('completion', 'Generate completion script for your shell.')
    .action(async () => {
        await tabtab.install({
            name: 'clits',
            completer: 'clits'
        });
    });

  // Handle completion requests
  if (process.argv.slice(2)[0] === 'completion') {
    const env = tabtab.parseEnv(process.env);
    if (env.complete) {
      const commands = program.commands.map(cmd => cmd.name());
      const options = program.options.map(opt => opt.long).filter(Boolean) as string[];
      const allCompletions = [...commands, ...options];
      return tabtab.log(allCompletions);
    }
  }

  await program.parseAsync();
}

main().catch((error) => {
  console.error('[CLiTS-INSPECTOR] A fatal error occurred outside the command handler:', error);
  process.exit(1);
}); 