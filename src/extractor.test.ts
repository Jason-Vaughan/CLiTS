import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LogExtractor, ExtractorOptions } from './extractor.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('LogExtractor', () => {
  let testDir: string;
  let options: ExtractorOptions;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = join(tmpdir(), 'ai-debug-extractor-test-' + Date.now());
    await mkdir(testDir, { recursive: true });

    // Create some test log files
    await writeFile(join(testDir, 'test1.log'), 'Test log content 1');
    await writeFile(join(testDir, 'test2.log'), 'Test log content 2');
    await writeFile(join(testDir, 'other.txt'), 'Not a log file');

    options = {
      sourcePath: testDir,
      patterns: ['*.log'],
      maxFileSize: 1024 * 1024, // 1MB
      maxFiles: 10
    };
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  it('should extract log files matching pattern', async () => {
    const extractor = new LogExtractor(options);
    const logs = await extractor.extract();

    expect(logs).toHaveLength(2);
    expect(logs.map(log => log.content).sort()).toEqual([
      'Test log content 1',
      'Test log content 2'
    ].sort());
  });

  it('should respect maxFiles limit', async () => {
    const limitedOptions = { ...options, maxFiles: 1 };
    const extractor = new LogExtractor(limitedOptions);
    const logs = await extractor.extract();

    expect(logs).toHaveLength(1);
  });

  it('should handle non-existent files gracefully', async () => {
    const badOptions = {
      ...options,
      patterns: ['nonexistent*.log']
    };
    const extractor = new LogExtractor(badOptions);
    const logs = await extractor.extract();

    expect(logs).toHaveLength(0);
  });
}); 