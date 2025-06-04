import { ChromeErrorHandler, RetryConfig } from '../chrome-error-handler.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ChromeErrorHandler', () => {
  describe('Error Detection', () => {
    it('should detect DEPRECATED_ENDPOINT error', () => {
      const error = new Error('Registration response error message: DEPRECATED_ENDPOINT');
      expect(ChromeErrorHandler.isChromeError(error)).toBe(true);
    });

    it('should detect CONNECTION_FAILED error', () => {
      const error = new Error('Failed to connect to Chrome debugging endpoint');
      expect(ChromeErrorHandler.isChromeError(error)).toBe(true);
    });

    it('should not detect unknown errors', () => {
      const error = new Error('Some random error');
      expect(ChromeErrorHandler.isChromeError(error)).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      expect(ChromeErrorHandler.isChromeError(null)).toBe(false);
      expect(ChromeErrorHandler.isChromeError(undefined)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle DEPRECATED_ENDPOINT error', () => {
      const error = new Error('Registration response error message: DEPRECATED_ENDPOINT');
      const result = ChromeErrorHandler.handleError(error);
      expect(result).toBeTruthy();
      expect(result?.code).toBe('DEPRECATED_ENDPOINT');
      expect(result?.severity).toBe('warning');
      expect(result?.recoverable).toBe(true);
    });

    it('should handle CONNECTION_FAILED error', () => {
      const error = new Error('Failed to connect to Chrome debugging endpoint');
      const result = ChromeErrorHandler.handleError(error);
      expect(result).toBeTruthy();
      expect(result?.code).toBe('CONNECTION_FAILED');
      expect(result?.severity).toBe('error');
      expect(result?.recoverable).toBe(true);
    });

    it('should return null for unknown errors', () => {
      const error = new Error('Some random error');
      expect(ChromeErrorHandler.handleError(error)).toBeNull();
    });
  });

  describe('Retry Logic', () => {
    let handler: ChromeErrorHandler;
    const mockConfig: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffFactor: 2
    };

    beforeEach(() => {
      handler = new ChromeErrorHandler(mockConfig);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await handler.executeWithRetry(operation, 'test');
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on recoverable error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Registration response error message: DEPRECATED_ENDPOINT'))
        .mockResolvedValueOnce('success');
      const promise = handler.executeWithRetry(operation, 'test');
      vi.advanceTimersByTime(mockConfig.initialDelayMs);
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    }, 20000);

    it('should respect max retries', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Registration response error message: DEPRECATED_ENDPOINT'));
      const promise = handler.executeWithRetry(operation, 'test');
      for (let i = 0; i < mockConfig.maxRetries - 1; i++) {
        vi.advanceTimersByTime(mockConfig.initialDelayMs * Math.pow(mockConfig.backoffFactor, i));
        await Promise.resolve();
      }
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow(/failed after 3 attempts/);
      expect(operation).toHaveBeenCalledTimes(mockConfig.maxRetries);
    }, 20000);

    it('should not retry on non-recoverable error', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Some non-recoverable error'));

      await expect(handler.executeWithRetry(operation, 'test'))
        .rejects.toThrow('Some non-recoverable error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should implement exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Registration response error message: DEPRECATED_ENDPOINT'));
      const promise = handler.executeWithRetry(operation, 'test');
      const expectedDelays = [
        mockConfig.initialDelayMs,
        mockConfig.initialDelayMs * mockConfig.backoffFactor,
        mockConfig.initialDelayMs * Math.pow(mockConfig.backoffFactor, 2)
      ];
      for (const delay of expectedDelays) {
        vi.advanceTimersByTime(delay);
        await Promise.resolve();
      }
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(mockConfig.maxRetries);
    }, 20000);

    it('should respect max delay', async () => {
      const handler = new ChromeErrorHandler({
        maxRetries: 5,
        initialDelayMs: 100,
        maxDelayMs: 200,
        backoffFactor: 2
      });
      const operation = vi.fn()
        .mockRejectedValue(new Error('Registration response error message: DEPRECATED_ENDPOINT'));
      const promise = handler.executeWithRetry(operation, 'test');
      const expectedDelays = [100, 200, 200, 200, 200];
      for (const delay of expectedDelays) {
        vi.advanceTimersByTime(delay);
        await Promise.resolve();
      }
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(5);
    }, 20000);
  });

  describe('Error Suppression', () => {
    it('should suppress warning-level recoverable errors', () => {
      const error = new Error('Registration response error message: DEPRECATED_ENDPOINT');
      expect(ChromeErrorHandler.shouldSuppressError(error)).toBe(true);
    });

    it('should not suppress error-level errors even if recoverable', () => {
      const error = new Error('Failed to connect to Chrome debugging endpoint');
      expect(ChromeErrorHandler.shouldSuppressError(error)).toBe(false);
    });

    it('should not suppress unknown errors', () => {
      const error = new Error('Some random error');
      expect(ChromeErrorHandler.shouldSuppressError(error)).toBe(false);
    });
  });
}); 