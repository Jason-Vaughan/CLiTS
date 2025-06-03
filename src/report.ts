// BSD: Handles the formatting and generation of debug reports from extracted data.

export interface DebugReport {
  timestamp: string;
  source: string;
  data: unknown;
  metadata: {
    version: string;
    platform: string;
  };
}

export class ReportGenerator {
  public static generateReport(data: unknown): DebugReport {
    return {
      timestamp: new Date().toISOString(),
      source: 'ai-debug-extractor',
      data,
      metadata: {
        version: '0.1.0',
        platform: process.platform
      }
    };
  }
} 