// BSD: Entry point for the AI-Debug-Extractor CLI tool. Handles command-line arguments and orchestrates log/data extraction.

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { LogExtractor } from './extractor.js';
import { ChromeExtractor } from './chrome-extractor.js';
import { ReportGenerator } from './report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const program = new Command();

async function main(): Promise<void> {
  program
    .name('ai-debug-extractor')
    .description('CLI tool for extracting and sharing debugging data for AI and web projects')
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
    .action(async (options) => {
      try {
        const extractors = [];

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
            includeConsole: options.console
          });
          extractors.push(chromeExtractor);
        }

        if (extractors.length === 0) {
          console.error('Error: No extraction source specified. Use --source for files or --chrome for Chrome DevTools');
          process.exit(1);
        }

        console.log('Extracting debug data...');
        const allLogs = [];
        
        for (const extractor of extractors) {
          const logs = await extractor.extract();
          allLogs.push(...logs);
        }
        
        const report = ReportGenerator.generateReport({
          logs: allLogs,
          extractionOptions: options
        });

        // For now, just output to console
        console.log(JSON.stringify(report, null, 2));
        console.log('Debug data extracted successfully');
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