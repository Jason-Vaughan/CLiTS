// BSD: Platform-specific error handling utilities for AI Debug Extractor

import { createLogger, format, transports } from 'winston';
import os from 'os';

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
    })
  ]
});

export interface PlatformError {
  code: string;
  message: string;
  platform: string;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
  recommendation?: string;
}

export class PlatformErrorHandler {
  private static readonly MAC_POLICY_ERRORS = [
    'task_policy_set TASK_CATEGORY_POLICY',
    'task_policy_set TASK_SUPPRESSION_POLICY'
  ];

  private static readonly KNOWN_ERRORS = new Map<string, PlatformError>([
    ['MAC_TASK_POLICY', {
      code: 'MAC_TASK_POLICY',
      message: 'macOS task policy error detected',
      platform: 'darwin',
      severity: 'warning',
      recoverable: true,
      recommendation: 'These errors are related to macOS security policies and can be safely ignored for debug extraction purposes.'
    }]
  ]);

  /**
   * Check if the error is a known platform-specific issue
   */
  static isPlatformError(error: Error | string | undefined | null): boolean {
    if (!error) return false;
    
    const errorStr = error instanceof Error ? error.message : String(error);
    if (!errorStr) return false;
    
    // Check macOS specific errors
    if (os.platform() === 'darwin') {
      return this.MAC_POLICY_ERRORS.some(err => errorStr.includes(err));
    }

    return false;
  }

  /**
   * Handle platform-specific errors
   */
  static handleError(error: Error | string | undefined | null): PlatformError | null {
    if (!error) return null;
    
    const errorStr = error instanceof Error ? error.message : String(error);
    if (!errorStr) return null;

    // Handle macOS errors
    if (os.platform() === 'darwin') {
      if (this.MAC_POLICY_ERRORS.some(err => errorStr.includes(err))) {
        const knownError = this.KNOWN_ERRORS.get('MAC_TASK_POLICY');
        if (knownError) {
          logger.warn(knownError.message, {
            error: errorStr,
            recommendation: knownError.recommendation
          });
          return knownError;
        }
      }
    }

    return null;
  }

  /**
   * Check if an error should be suppressed based on platform-specific rules
   */
  static shouldSuppressError(error: Error | string): boolean {
    const platformError = this.handleError(error);
    return platformError?.severity === 'warning' && platformError?.recoverable === true;
  }
} 