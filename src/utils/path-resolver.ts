// BSD: Path resolution utilities for CLiTS. Handles consistent path resolution, module loading, and error reporting.

import { fileURLToPath } from 'url';
import { dirname, resolve, isAbsolute } from 'path';
import { existsSync } from 'fs';

export class PathResolver {
  private static instance: PathResolver;
  private baseDir: string;
  private projectRoot: string;

  private constructor() {
    const __filename = fileURLToPath(import.meta.url);
    this.baseDir = dirname(dirname(__filename)); // Go up one level from utils to src
    this.projectRoot = dirname(this.baseDir); // Go up one level from src to project root
  }

  public static getInstance(): PathResolver {
    if (!PathResolver.instance) {
      PathResolver.instance = new PathResolver();
    }
    return PathResolver.instance;
  }

  /**
   * Resolves a path relative to the project root
   */
  public resolvePath(path: string): string {
    if (isAbsolute(path)) {
      return path;
    }
    return resolve(this.projectRoot, path);
  }

  /**
   * Resolves a module path and verifies it exists
   */
  public resolveModule(modulePath: string): string {
    const resolvedPath = this.resolvePath(modulePath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Module not found: ${modulePath}\nResolved to: ${resolvedPath}\nBase directory: ${this.projectRoot}`);
    }
    return resolvedPath;
  }

  /**
   * Gets the project root directory
   */
  public getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Gets the source directory
   */
  public getSourceDir(): string {
    return this.baseDir;
  }

  /**
   * Validates if a path exists and is accessible
   */
  public validatePath(path: string): { exists: boolean; error?: string } {
    try {
      const resolvedPath = this.resolvePath(path);
      const exists = existsSync(resolvedPath);
      return {
        exists,
        error: exists ? undefined : `Path does not exist: ${resolvedPath}`
      };
    } catch (error) {
      return {
        exists: false,
        error: `Error validating path: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
} 