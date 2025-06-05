// BSD: Main entry point for programmatic usage of CLiTS (Chrome Log Inspector & Troubleshooting System).
// Exports core functionality for Chrome debugging, log extraction, and analysis.

export { ChromeExtractor } from './chrome-extractor.js';
export { LogExtractor } from './extractor.js';
export { ReportGenerator } from './report.js';

// Export types
export type { ChromeExtractorOptions } from './chrome-extractor.js';
export type { ExtractorOptions, ExtractedLog } from './extractor.js';
export type { DebugReport } from './report.js';

// Example usage:
/*
import { ChromeExtractor, LogExtractor } from 'ai-debug-extractor';

// Extract Chrome DevTools logs
const chromeExtractor = new ChromeExtractor({
  filters: {
    logLevels: ['error', 'warning'],
    keywords: ['api', 'error']
  },
  format: {
    groupByLevel: true,
    includeTimestamp: true
  }
});

// Extract file system logs
const fileExtractor = new LogExtractor({
  sourcePath: './logs',
  patterns: ['*.log'],
  maxFileSize: 10 * 1024 * 1024 // 10MB
});
*/ 