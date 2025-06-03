import { ReportGenerator } from './report.js';
import { ExtractedLog } from './extractor.js';

describe('ReportGenerator', () => {
  it('should generate a report with correct structure', () => {
    const testLogs: ExtractedLog[] = [
      {
        filePath: 'test.log',
        content: 'Test log content with an Error: test error',
        size: 100,
        lastModified: new Date()
      }
    ];
    
    const report = ReportGenerator.generateReport({
      logs: testLogs,
      extractionOptions: { test: true }
    });

    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('logs', testLogs);
    expect(report).toHaveProperty('options', { test: true });
    expect(report).toHaveProperty('summary');
    expect(report.summary).toHaveProperty('totalLogs', 1);
    expect(report.summary).toHaveProperty('fileTypes');
    expect(report.summary).toHaveProperty('errors');
  });

  it('should include current timestamp', () => {
    const before = new Date();
    const report = ReportGenerator.generateReport({
      logs: [],
      includeErrorSummary: true
    });
    const after = new Date();

    const reportDate = new Date(report.timestamp);
    expect(reportDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(reportDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });
}); 