import { ReportGenerator } from './report.js';

describe('ReportGenerator', () => {
  it('should generate a report with correct structure', () => {
    const testData = { key: 'value' };
    const report = ReportGenerator.generateReport(testData);

    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('source', 'ai-debug-extractor');
    expect(report).toHaveProperty('data', testData);
    expect(report).toHaveProperty('metadata');
    expect(report.metadata).toHaveProperty('version');
    expect(report.metadata).toHaveProperty('platform');
  });

  it('should include current timestamp', () => {
    const before = new Date();
    const report = ReportGenerator.generateReport({});
    const after = new Date();

    const reportDate = new Date(report.timestamp);
    expect(reportDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(reportDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });
}); 