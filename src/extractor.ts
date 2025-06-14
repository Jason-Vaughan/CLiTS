// BSD: Base log extraction functionality for reading and processing log files from the filesystem.
// Provides configurable file size limits, pattern matching, and error handling for log collection.

import { createLogger, format, transports } from 'winston';
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join } from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

// Configure logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new DailyRotateFile({
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

export interface ExtractorOptions {
  sourcePath: string;
  patterns: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
}

export interface ExtractedLog {
  filePath: string;
  content: string;
  size: number;
  lastModified: Date;
}

export class LogExtractor {
  private static readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_MAX_FILES = 100;

  constructor(private options: ExtractorOptions) {
    this.options.maxFileSize = options.maxFileSize || LogExtractor.DEFAULT_MAX_FILE_SIZE;
    this.options.maxFiles = options.maxFiles || LogExtractor.DEFAULT_MAX_FILES;
  }

  async extract(): Promise<ExtractedLog[]> {
    try {
      logger.info('Starting log extraction', { options: this.options });
      
      const files = await this.findLogFiles();
      logger.info(`Found ${files.length} log files`);

      const extractedLogs: ExtractedLog[] = [];
      for (const file of files) {
        try {
          const log = await this.extractSingleLog(file);
          if (log) {
            extractedLogs.push(log);
          }
        } catch (error) {
          logger.error(`Failed to extract log from ${file}`, { error });
        }
      }

      logger.info(`Successfully extracted ${extractedLogs.length} logs`);
      return extractedLogs;
    } catch (error) {
      logger.error('Failed to extract logs', { error });
      throw error;
    }
  }

  private async findLogFiles(): Promise<string[]> {
    const allFiles: string[] = [];
    for (const pattern of this.options.patterns) {
      const matches = await glob(join(this.options.sourcePath, pattern));
      allFiles.push(...matches);
    }
    return allFiles.slice(0, this.options.maxFiles);
  }

  private async extractSingleLog(filePath: string): Promise<ExtractedLog | null> {
    try {
      const content = await readFile(filePath, 'utf8');
      const stats = await import('fs/promises').then(fs => fs.stat(filePath));

      if (stats.size > this.options.maxFileSize!) {
        logger.warn(`Skipping ${filePath}: file size ${stats.size} exceeds limit ${this.options.maxFileSize}`);
        return null;
      }

      return {
        filePath,
        content,
        size: stats.size,
        lastModified: stats.mtime
      };
    } catch (error) {
      logger.error(`Error reading file ${filePath}`, { error });
      return null;
    }
  }
} 