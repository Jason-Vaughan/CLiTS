import { ChromeExtractor } from '../chrome-extractor.js';
import CDP from 'chrome-remote-interface';
import fetch, { Response, Headers } from 'node-fetch';

// Mock chrome-remote-interface
jest.mock('chrome-remote-interface');
const mockCDP = CDP as jest.MockedFunction<typeof CDP>;

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

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

describe('ChromeExtractor', () => {
  let extractor: ChromeExtractor;

  beforeEach(() => {
    extractor = new ChromeExtractor({
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2
      }
    });

    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
          enable: jest.fn(),
          disable: jest.fn(),
          requestWillBeSent: jest.fn(),
          responseReceived: jest.fn()
        },
        Console: {
          enable: jest.fn(),
          disable: jest.fn(),
          messageAdded: jest.fn()
        },
        Log: {
          enable: jest.fn(),
          disable: jest.fn(),
          entryAdded: jest.fn()
        },
        close: jest.fn()
      };

      mockCDP
        .mockRejectedValueOnce(new Error('Registration response error message: DEPRECATED_ENDPOINT'))
        .mockResolvedValueOnce(mockClient);

      const promise = extractor.extract();
      
      // Fast-forward through the retry delay
      jest.advanceTimersByTime(100);
      
      await promise;

      expect(mockCDP).toHaveBeenCalledTimes(2);
      expect(mockClient.Network.enable).toHaveBeenCalled();
      expect(mockClient.Console.enable).toHaveBeenCalled();
      expect(mockClient.Log.enable).toHaveBeenCalled();
    });

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
        jest.advanceTimersByTime(100 * Math.pow(2, i));
        await Promise.resolve(); // Let the event loop tick
      }

      await expect(promise).rejects.toThrow('Failed to connect to Chrome debugging endpoint');
      expect(mockCDP).toHaveBeenCalledTimes(3);
    });

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
          enable: jest.fn(),
          disable: jest.fn(),
          requestWillBeSent: jest.fn(),
          responseReceived: jest.fn()
        },
        Console: {
          enable: jest.fn(),
          disable: jest.fn(),
          messageAdded: jest.fn()
        },
        Log: {
          enable: jest.fn(),
          disable: jest.fn(),
          entryAdded: jest.fn()
        },
        close: jest.fn()
      };

      mockCDP.mockResolvedValue(mockClient);
    });

    it('should suppress DEPRECATED_ENDPOINT errors in console logs', async () => {
      const promise = extractor.extract();

      // Simulate console message with DEPRECATED_ENDPOINT error
      const messageCallback = mockClient.Console.messageAdded.mock.calls[0][0];
      messageCallback({
        level: 'error',
        text: 'Registration response error message: DEPRECATED_ENDPOINT',
        timestamp: Date.now()
      });

      // Fast-forward through log collection
      jest.advanceTimersByTime(15000);

      const logs = await promise;
      expect(logs).toHaveLength(0); // Error should be suppressed
    });

    it('should not suppress other errors in console logs', async () => {
      const promise = extractor.extract();

      // Simulate console message with other error
      const messageCallback = mockClient.Console.messageAdded.mock.calls[0][0];
      messageCallback({
        level: 'error',
        text: 'Some other error occurred',
        timestamp: Date.now()
      });

      // Fast-forward through log collection
      jest.advanceTimersByTime(15000);

      const logs = await promise;
      expect(logs).toHaveLength(1);
      expect(logs[0].content).toContain('Some other error occurred');
    });

    it('should handle network errors during log collection', async () => {
      const promise = extractor.extract();

      // Simulate network error
      const requestCallback = mockClient.Network.requestWillBeSent.mock.calls[0][0];
      requestCallback({
        requestId: '123',
        url: 'http://example.com/api',
        method: 'GET',
        headers: {},
        timestamp: Date.now()
      });

      // Fast-forward through log collection
      jest.advanceTimersByTime(15000);

      const logs = await promise;
      expect(logs).toHaveLength(1);
      expect(logs[0].content).toContain('GET http://example.com/api');
    });
  });

  describe('Cleanup', () => {
    it('should properly clean up resources on success', async () => {
      // Mock successful connection
      const mockClient = {
        Network: {
          enable: jest.fn(),
          disable: jest.fn(),
          requestWillBeSent: jest.fn(),
          responseReceived: jest.fn()
        },
        Console: {
          enable: jest.fn(),
          disable: jest.fn(),
          messageAdded: jest.fn()
        },
        Log: {
          enable: jest.fn(),
          disable: jest.fn(),
          entryAdded: jest.fn()
        },
        close: jest.fn()
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
      jest.advanceTimersByTime(15000);
      
      await promise;

      expect(mockClient.Network.disable).toHaveBeenCalled();
      expect(mockClient.Console.disable).toHaveBeenCalled();
      expect(mockClient.Log.disable).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should properly clean up resources on failure', async () => {
      // Mock successful connection but failed log collection
      const mockClient = {
        Network: {
          enable: jest.fn().mockRejectedValue(new Error('Network enable failed')),
          disable: jest.fn(),
          requestWillBeSent: jest.fn(),
          responseReceived: jest.fn()
        },
        Console: {
          enable: jest.fn(),
          disable: jest.fn(),
          messageAdded: jest.fn()
        },
        Log: {
          enable: jest.fn(),
          disable: jest.fn(),
          entryAdded: jest.fn()
        },
        close: jest.fn()
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

      expect(mockClient.close).toHaveBeenCalled();
    });
  });
}); 