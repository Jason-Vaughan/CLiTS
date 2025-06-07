// BSD: Test suite for path resolution utilities in CLiTS.

import { describe, it, expect } from 'vitest';
import { PathResolver } from './path-resolver.js';
import { existsSync } from 'fs';
import { join } from 'path';

describe('PathResolver', () => {
  const resolver = PathResolver.getInstance();

  it('should be a singleton', () => {
    const instance1 = PathResolver.getInstance();
    const instance2 = PathResolver.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should resolve relative paths correctly', () => {
    const relativePath = 'package.json';
    const resolvedPath = resolver.resolvePath(relativePath);
    expect(existsSync(resolvedPath)).toBe(true);
    expect(resolvedPath).toContain('package.json');
  });

  it('should handle absolute paths', () => {
    const absolutePath = '/tmp/test';
    expect(resolver.resolvePath(absolutePath)).toBe(absolutePath);
  });

  it('should validate paths correctly', () => {
    const validPath = 'package.json';
    const invalidPath = 'nonexistent-file.txt';

    const validResult = resolver.validatePath(validPath);
    expect(validResult.exists).toBe(true);
    expect(validResult.error).toBeUndefined();

    const invalidResult = resolver.validatePath(invalidPath);
    expect(invalidResult.exists).toBe(false);
    expect(invalidResult.error).toBeDefined();
  });

  it('should throw on non-existent module resolution', () => {
    expect(() => {
      resolver.resolveModule('nonexistent-module.js');
    }).toThrow('Module not found');
  });

  it('should get correct project directories', () => {
    const projectRoot = resolver.getProjectRoot();
    const sourceDir = resolver.getSourceDir();

    expect(existsSync(projectRoot)).toBe(true);
    expect(existsSync(sourceDir)).toBe(true);
    expect(existsSync(join(projectRoot, 'package.json'))).toBe(true);
    expect(existsSync(join(sourceDir, 'cli.ts'))).toBe(true);
  });
}); 