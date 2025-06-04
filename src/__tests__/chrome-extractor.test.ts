import { ChromeExtractor } from '../chrome-extractor.js';
import CDP from 'chrome-remote-interface';
import fetch, { Response, Headers } from 'node-fetch';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock chrome-remote-interface
vi.mock('chrome-remote-interface');
const mockCDP = CDP as ReturnType<typeof vi.mocked<typeof CDP>>;

// Mock node-fetch
vi.mock('node-fetch');
const mockFetch = fetch as ReturnType<typeof vi.mocked<typeof fetch>>;

// Helper to create a mock Response
const createMockResponse = (ok: boolean, jsonData?: any): Response => ({
  ok,
  json: () => Promise.resolve(jsonData),
  // Add other required Response properties
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  headers: new Headers(),
  body: null,
  bodyUsed: false,
  url: 'http://example.com',
  size: 0,
  timeout: 0,
  buffer: async () => Buffer.from(''),
  arrayBuffer: async () => new ArrayBuffer(0),
  blob: async () => new Blob([]),
  formData: async () => new FormData(),
  text: async () => '',
  textConverted: async () => '',
  clone: () => createMockResponse(ok, jsonData),
  type: 'default',
  redirected: false,
  trailer: Promise.resolve(new Headers())
} as unknown as Response);

// Test subclass to access protected _injectTestEvent
class TestableChromeExtractor extends ChromeExtractor {
  public injectTestEvent(type: 'network' | 'console' | 'log', payload: any, logsOverride?: any[]) {
    return this._injectTestEvent(type, payload, logsOverride);
  }
}

describe('ChromeExtractor', () => {
  let extractor: TestableChromeExtractor;

  beforeEach(() => {
    extractor = new TestableChromeExtractor({
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2
      }
    });

    // Reset all mocks
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Connection and Registration', () => {
    it('should handle DEPRECATED_ENDPOINT with retries', async () => {
      // Mock version check
      mockFetch
        .mockResolvedValueOnce(createMockResponse(true))
        .mockResolvedValueOnce(createMockResponse(true, [{
          type: 'page',
          url: 'http://example.com',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/123'
        }]));

      // Mock CDP connection with DEPRECATED_ENDPOINT error then success
      const mockClient = {
        Network: {
          enable: vi.fn(),
          disable: vi.fn(),
          requestWillBeSent: vi.fn(),
          responseReceived: vi.fn()
        },
        Console: {
          enable: vi.fn(),
          disable: vi.fn(),
          messageAdded: vi.fn()
        },
        Log: {
          enable: vi.fn(),
          disable: vi.fn(),
          entryAdded: vi.fn()
        },
        close: vi.fn(),
        on: vi.fn()
      };

      mockCDP
        .mockRejectedValueOnce(new Error('Registration response error message: DEPRECATED_ENDPOINT'))
        .mockResolvedValueOnce(mockClient);

      const promise = extractor.extract();
      
      // Fast-forward through the retry delay
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockCDP).toHaveBeenCalledTimes(2);
      expect(mockClient.Network.enable).toHaveBeenCalled();
      expect(mockClient.Console.enable).toHaveBeenCalled();
      expect(mockClient.Log.enable).toHaveBeenCalled();
    }, 20000);

    it('should handle connection failures with retries', async () => {
      // Mock version check success
      mockFetch
        .mockResolvedValueOnce(createMockResponse(true))
        .mockResolvedValueOnce(createMockResponse(true, [{
          type: 'page',
          url: 'http://example.com',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/123'
        }]));

      // Mock CDP connection failures
      mockCDP
        .mockRejectedValue(new Error('Failed to connect to Chrome debugging endpoint'));

      const promise = extractor.extract();

      // Fast-forward through all retry delays
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(100 * Math.pow(2, i));
        await Promise.resolve(); // Let the event loop tick
      }
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow('Failed to connect to Chrome debugging endpoint');
      expect(mockCDP).toHaveBeenCalledTimes(3);
    }, 20000);

    it('should not retry on non-recoverable errors', async () => {
      // Mock version check failure
      mockFetch.mockResolvedValueOnce(createMockResponse(false));

      await expect(extractor.extract()).rejects.toThrow('Chrome is not running');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockCDP).not.toHaveBeenCalled();
    });
  });

  describe('Log Collection', () => {
    let mockClient: any;

    beforeEach(() => {
      // Mock successful connection setup
      mockFetch
        .mockResolvedValueOnce(createMockResponse(true))
        .mockResolvedValueOnce(createMockResponse(true, [{
          type: 'page',
          url: 'http://example.com',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/123'
        }]));

      mockClient = {
        Network: {
          enable: vi.fn(),
          disable: vi.fn(),
          requestWillBeSent: vi.fn(),
          responseReceived: vi.fn()
        },
        Console: {
          enable: vi.fn(),
          disable: vi.fn(),
          messageAdded: vi.fn()
        },
        Log: {
          enable: vi.fn(),
          disable: vi.fn(),
          entryAdded: vi.fn()
        },
        close: vi.fn(),
        on: vi.fn()
      };

      mockCDP.mockResolvedValue(mockClient);
    });

    it('should suppress DEPRECATED_ENDPOINT errors in console logs', async () => {
      // Simulate a DEPRECATED_ENDPOINT error event
      const logs: any[] = [];
      extractor.injectTestEvent('console', {
        level: 'error',
        text: 'Registration response error message: DEPRECATED_ENDPOINT',
        timestamp: Date.now()
      }, logs);
      // Simulate log collection wait
      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      // Should be suppressed, so logs should be empty
      expect(logs).toHaveLength(0);
    }, 20000);

    it('should not suppress other errors in console logs', async () => {
      const logs: any[] = [];
      extractor.injectTestEvent('console', {
        level: 'error',
        text: 'Some other error occurred',
        timestamp: Date.now()
      }, logs);
      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      expect(logs).toHaveLength(1);
      expect(logs[0].details.text).toContain('Some other error occurred');
    }, 20000);

    it('should handle network errors during log collection', async () => {
      const logs: any[] = [];
      extractor.injectTestEvent('network', {
        requestId: '123',
        url: 'http://example.com/api',
        method: 'GET',
        headers: {},
        timestamp: Date.now()
      }, logs);
      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      expect(logs).toHaveLength(1);
      expect(logs[0].details.url).toContain('http://example.com/api');
    }, 20000);
  });

  describe('Cleanup', () => {
    it('should properly clean up resources on success', async () => {
      // Mock successful connection
      const mockClient = {
        Network: {
          enable: vi.fn(),
          disable: vi.fn(),
          requestWillBeSent: vi.fn(),
          responseReceived: vi.fn()
        },
        Console: {
          enable: vi.fn(),
          disable: vi.fn(),
          messageAdded: vi.fn()
        },
        Log: {
          enable: vi.fn(),
          disable: vi.fn(),
          entryAdded: vi.fn()
        },
        close: vi.fn(),
        on: vi.fn()
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(true))
        .mockResolvedValueOnce(createMockResponse(true, [{
          type: 'page',
          url: 'http://example.com',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/123'
        }]));

      mockCDP.mockResolvedValue(mockClient);

      const promise = extractor.extract();
      
      // Fast-forward through log collection
      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockClient.Network.disable).toHaveBeenCalled();
      expect(mockClient.Console.disable).toHaveBeenCalled();
      expect(mockClient.Log.disable).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    }, 20000);

    it('should properly clean up resources on failure', async () => {
      // Mock successful connection but failed log collection
      const mockClient = {
        Network: {
          enable: vi.fn().mockRejectedValue(new Error('Network enable failed')),
          disable: vi.fn(),
          requestWillBeSent: vi.fn(),
          responseReceived: vi.fn()
        },
        Console: {
          enable: vi.fn(),
          disable: vi.fn(),
          messageAdded: vi.fn()
        },
        Log: {
          enable: vi.fn(),
          disable: vi.fn(),
          entryAdded: vi.fn()
        },
        close: vi.fn(),
        on: vi.fn()
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(true))
        .mockResolvedValueOnce(createMockResponse(true, [{
          type: 'page',
          url: 'http://example.com',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/123'
        }]));

      mockCDP.mockResolvedValue(mockClient);

      await expect(extractor.extract()).rejects.toThrow('Network enable failed');
      // Wait a tick to allow cleanup
      await Promise.resolve();
      expect(mockClient.close).toHaveBeenCalled();
    });
  });
}); 