// BSD: Entry point for the AI-Debug-Extractor CLI tool. Handles command-line arguments and orchestrates log/data extraction.

import { Command } from 'commander';
import ora from 'ora';

const program = new Command();

async function main(): Promise<void> {
  program
    .name('ai-debug-extractor')
    .description('CLI tool for extracting and sharing debugging data for AI and web projects')
    .version('0.1.0');

  program
    .command('extract')
    .description('Extract debugging data from specified sources')
    .action(async () => {
      const spinner = ora('Extracting debug data...').start();
      try {
        // TODO: Implement extraction logic
        spinner.succeed('Debug data extracted successfully');
      } catch (error) {
        spinner.fail(`Failed to extract debug data: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 