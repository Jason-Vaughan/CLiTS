// BSD: Handles the formatting and generation of debug reports from extracted data.

import { ExtractedLog } from './extractor.js';

export interface ReportOptions {
  logs: ExtractedLog[];
  extractionOptions?: any;
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
  options: any;
  summary: ReportSummary;
}

export class ReportGenerator {
  public static generateReport(options: ReportOptions): DebugReport {
    const report: DebugReport = {
      timestamp: new Date().toISOString(),
      logs: options.logs,
      options: options.extractionOptions || {},
      summary: {
        totalLogs: options.logs.length,
        fileTypes: this.analyzeFileTypes(options.logs),
      }
    };

    // Generate error summary if requested
    if (options.includeErrorSummary !== false) {
      report.summary.errors = this.generateErrorSummary(options.logs);
    }

    return report;
  }

  private static analyzeFileTypes(logs: ExtractedLog[]): Record<string, number> {
    const fileTypes: Record<string, number> = {};
    
    logs.forEach(log => {
      const extension = log.filePath.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;
    });
    
    return fileTypes;
  }

  private static generateErrorSummary(logs: ExtractedLog[]): ErrorSummary {
    // Error pattern matching
    const errorPatterns = [
      { regex: /TypeError:?\s*([^:;\n]+)/i, type: 'TypeError' },
      { regex: /ReferenceError:?\s*([^:;\n]+)/i, type: 'ReferenceError' },
      { regex: /SyntaxError:?\s*([^:;\n]+)/i, type: 'SyntaxError' },
      { regex: /RangeError:?\s*([^:;\n]+)/i, type: 'RangeError' },
      { regex: /EvalError:?\s*([^:;\n]+)/i, type: 'EvalError' },
      { regex: /URIError:?\s*([^:;\n]+)/i, type: 'URIError' },
      { regex: /(\d{3}) error/i, type: 'HTTP Error' },
      { regex: /Uncaught exception/i, type: 'Uncaught Exception' },
      { regex: /Error:?\s*([^:;\n]+)/i, type: 'General Error' },
      { regex: /Failed to/i, type: 'Failure' },
      { regex: /warning:?\s*([^:;\n]+)/i, type: 'Warning' },
    ];
    
    const errorCounts: Record<string, number> = {};
    let totalErrors = 0;
    
    // Analyze each log for errors
    logs.forEach(log => {
      const content = log.content || '';
      
      // Check against each error pattern
      for (const pattern of errorPatterns) {
        const matches = content.match(new RegExp(pattern.regex, 'g'));
        if (matches) {
          errorCounts[pattern.type] = (errorCounts[pattern.type] || 0) + matches.length;
          totalErrors += matches.length;
        }
      }
    });
    
    // Sort errors by frequency
    const sortedErrors = Object.entries(errorCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0
      }))
      .slice(0, 10); // Top 10 most common errors
    
    return {
      totalErrors,
      errorTypes: errorCounts,
      mostCommonErrors: sortedErrors
    };
  }
} 