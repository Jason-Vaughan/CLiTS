#!/usr/bin/env node

// BSD: Entry point for the AI-Debug-Extractor CLI tool. Handles command-line arguments and orchestrates log/data extraction.

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { LogExtractor } from './extractor.js';
import { ChromeExtractor } from './chrome-extractor.js';
import { ReportGenerator } from './report.js';

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
    .option('--chrome', 'Extract logs from Chrome DevTools')
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
          const chromeExtractor = new ChromeExtractor({
            host: options.chromeHost,
            port: parseInt(options.chromePort),
            includeNetwork: options.network,
            includeConsole: options.console,
            filters: {
              logLevels: options.logLevels?.split(',') as Array<'error' | 'warning' | 'info' | 'debug'>,
              sources: options.sources?.split(',') as Array<'network' | 'console' | 'devtools'>,
              domains: options.domains?.split(',') || [],
              keywords: options.keywords?.split(',') || [],
              excludePatterns: options.exclude?.split(',') || [],
              advancedFilter: options.advancedFilter
            },
            format: {
              groupBySource: options.groupBySource,
              groupByLevel: options.groupByLevel,
              includeTimestamp: options.timestamps,
              includeStackTrace: options.stackTraces
            }
          });
          extractors.push(chromeExtractor);
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