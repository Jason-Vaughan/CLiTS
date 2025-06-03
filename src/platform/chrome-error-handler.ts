import { createLogger, format, transports } from 'winston';
import { PlatformError } from './error-handler.js';

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

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

export class ChromeErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffFactor: 2
  };

  private static readonly KNOWN_ERRORS = {
    DEPRECATED_ENDPOINT: {
      pattern: /Registration response error message: DEPRECATED_ENDPOINT/,
      code: 'DEPRECATED_ENDPOINT',
      severity: 'warning' as const,
      recoverable: true,
      recommendation: 'This error can be safely ignored as it is handled automatically with retry logic.'
    },
    CONNECTION_FAILED: {
      pattern: /Failed to connect to .* endpoint|Failed to connect to MCS endpoint/,
      code: 'CONNECTION_FAILED',
      severity: 'error' as const,
      recoverable: true,
      recommendation: 'Check network connectivity and ensure Chrome is running with remote debugging enabled.'
    },
    IMK_ERROR: {
      pattern: /_TIPropertyValueIsValid called with .* on nil context|Text input context does not respond to _valueForTIProperty/,
      code: 'IMK_ERROR',
      severity: 'warning' as const,
      recoverable: true,
      recommendation: 'These are macOS-specific input method warnings that can be safely ignored.'
    },
    TASK_POLICY: {
      pattern: /task_policy_set .* invalid argument/,
      code: 'TASK_POLICY',
      severity: 'warning' as const,
      recoverable: true,
      recommendation: 'These are macOS-specific task policy warnings that can be safely ignored.'
    },
    MEDIA_ACCESS: {
      pattern: /WebContentsDelegate::CheckMediaAccessPermission: Not supported/,
      code: 'MEDIA_ACCESS',
      severity: 'warning' as const,
      recoverable: true,
      recommendation: 'This is a known limitation when running Chrome in debugging mode and can be safely ignored.'
    },
    CSP_VIOLATION: {
      pattern: /Refused to frame .* because an ancestor violates the following Content Security Policy directive/,
      code: 'CSP_VIOLATION',
      severity: 'warning' as const,
      recoverable: true,
      recommendation: 'Content Security Policy violations in debug mode can be safely ignored for internal testing.'
    },
    TENSORFLOW_DELEGATE: {
      pattern: /Attempting to use a delegate that only supports static-sized tensors/,
      code: 'TENSORFLOW_DELEGATE',
      severity: 'warning' as const,
      recoverable: true,
      recommendation: 'TensorFlow Lite delegate initialization warnings can be ignored in debug mode.'
    },
    ALLOCATOR_WARNING: {
      pattern: /Trying to load the allocator multiple times/,
      code: 'ALLOCATOR_WARNING',
      severity: 'warning' as const,
      recoverable: true,
      recommendation: 'Multiple allocator initialization attempts are expected in debug mode.'
    }
  };

  private retryConfig: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = {
      ...ChromeErrorHandler.DEFAULT_RETRY_CONFIG,
      ...config
    };
  }

  public static isChromeError(error: Error | null | undefined): boolean {
    if (!error) return false;
    return Object.values(ChromeErrorHandler.KNOWN_ERRORS).some(
      ({ pattern }) => pattern.test(error.message)
    );
  }

  public static handleError(error: Error): PlatformError | null {
    if (!error) return null;

    for (const [, errorInfo] of Object.entries(ChromeErrorHandler.KNOWN_ERRORS)) {
      if (errorInfo.pattern.test(error.message)) {
        return {
          code: errorInfo.code,
          message: error.message,
          platform: process.platform,
          severity: errorInfo.severity,
          recoverable: errorInfo.recoverable,
          recommendation: errorInfo.recommendation
        };
      }
    }

    return null;
  }

  public static shouldSuppressError(error: Error): boolean {
    const errorInfo = ChromeErrorHandler.handleError(error);
    if (!errorInfo) return false;
    
    // Suppress all warning-level errors that are recoverable
    return errorInfo.severity === 'warning' && errorInfo.recoverable;
  }

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        lastError = error;

        const errorInfo = ChromeErrorHandler.handleError(error);
        if (!errorInfo?.recoverable) throw error;

        if (attempt < this.retryConfig.maxRetries) {
          logger.warn(
            `Attempt ${attempt} failed for ${operationName}: ${error.message}. Retrying in ${delay}ms...`
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Calculate next delay with exponential backoff
          delay = Math.min(
            delay * this.retryConfig.backoffFactor,
            this.retryConfig.maxDelayMs
          );
        }
      }
    }

    throw new Error(
      `Operation ${operationName} failed after ${this.retryConfig.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }
} 