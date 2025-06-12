import { ExtractedLog } from './extractor.js';

export interface ReportOptions {
  logs: ExtractedLog[];
  extractionOptions?: {
    includeNetwork?: boolean;
    includeConsole?: boolean;
    filters?: {
      logLevels?: string[];
      sources?: string[];
      domains?: string[];
      keywords?: string[];
      excludePatterns?: string[];
    };
    format?: {
      groupBySource?: boolean;
      groupByLevel?: boolean;
      includeTimestamp?: boolean;
      includeStackTrace?: boolean;
    };
  };
  includeErrorSummary?: boolean;
}

export interface ErrorSummary {
  totalErrors: number;
  errorTypes: Record<string, number>;
  mostCommonErrors: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface ReportSummary {
  totalLogs: number;
  fileTypes: Record<string, number>;
  errors?: ErrorSummary;
}

export interface DebugReport {
  timestamp: string;
  logs: ExtractedLog[];
  options: ReportOptions;
  summary: ReportSummary;
}

export declare class ReportGenerator {
  static generateReport(options: ReportOptions): DebugReport;
  private static analyzeFileTypes(logs: ExtractedLog[]): Record<string, number>;
  private static generateErrorSummary(logs: ExtractedLog[]): ErrorSummary;
} 