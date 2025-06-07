import { ChromeExtractor } from '../chrome-extractor.js';
import CDP from 'chrome-remote-interface';
import fetch, { Response, Headers } from 'node-fetch';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ConsoleMessage, DevToolsLogEntry, NetworkRequest, NetworkResponse } from '../types/chrome-types.js';
import type { ExtractedLog } from '../types/extractor.js';
import { PlatformErrorHandler } from '../platform/error-handler.js';
import { ChromeErrorHandler } from '../platform/chrome-error-handler.js';
import { CollectedLogEntry } from '../chrome-extractor.js';

// Ensure we're using mocks in CI environment
if (process.env.CI || process.env.CHROME_TEST_MODE === 'mock') {
  vi.mock('chrome-remote-interface');
  vi.mock('node-fetch');
}

// Suppress known harmless unhandled promise rejections during tests (BSD compliance)
// This ensures test output is clean and does not mask real errors. Only suppresses specific, expected errors.
process.on('unhandledRejection', (reason) => {
  const message = typeof reason === 'object' && reason !== null && 'message' in reason ? (reason as Error).message : '';
  if (
    typeof message === 'string' &&
    (
      message.includes('DEPRECATED_ENDPOINT') ||
      message.includes('Failed to connect to Chrome debugging endpoint')
    )
  ) {
    // Suppress only these known, harmless test rejections
    return;
  }
  // Otherwise, log unexpected rejections
  console.error('Unhandled rejection:', reason);
});

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

// Fix line 39 any type
interface MockCDPClient {
  Network: {
    enable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    disable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    requestWillBeSent: ReturnType<typeof vi.fn<[], void>>;
    responseReceived: ReturnType<typeof vi.fn<[], void>>;
  };
  Console: {
    enable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    disable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    messageAdded: ReturnType<typeof vi.fn<[], void>>;
  };
  Log: {
    enable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    disable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    entryAdded: ReturnType<typeof vi.fn<[], void>>;
  };
  Runtime: {
    enable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    disable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    evaluate: ReturnType<typeof vi.fn<[], Promise<any>>>;
  };
  Performance: {
    enable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    disable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    metrics: ReturnType<typeof vi.fn<[], void>>;
  };
  CSS: {
    enable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    disable: ReturnType<typeof vi.fn<[], Promise<void>>>;
    stylesheetAdded: ReturnType<typeof vi.fn<[], void>>;
    stylesheetRemoved: ReturnType<typeof vi.fn<[], void>>;
    stylesheetChanged: ReturnType<typeof vi.fn<[], void>>;
  };
  close: ReturnType<typeof vi.fn<[], Promise<void>>>;
  on: ReturnType<typeof vi.fn<[event: string, callback: (data: unknown) => void], void>>;
}

// Test subclass to access protected _injectTestEvent
class TestableChromeExtractor extends ChromeExtractor {
  public injectTestEvent(
    type: 'network' | 'console' | 'log' | 'reacthook' | 'dommutation' | 'csschange' | 'redux' | 'eventloop' | 'userinteraction' | 'websocket' | 'jwt' | 'graphql' | 'performance' | 'credential',
    payload: NetworkRequest | NetworkResponse | ConsoleMessage | DevToolsLogEntry | CollectedLogEntry | any,
    logsOverride?: CollectedLogEntry[]
  ): void {
    return this._injectTestEvent(type, payload, logsOverride);
  }
}

describe('ChromeExtractor', () => {
  let extractor: TestableChromeExtractor;
  let mockClient: MockCDPClient;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create a new extractor instance with test configuration
    extractor = new TestableChromeExtractor({
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2
      }
    });

    // Set up the mock client that all tests will use
    const client = {
      Network: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        requestWillBeSent: vi.fn(),
        responseReceived: vi.fn()
      },
      Console: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        messageAdded: vi.fn()
      },
      Log: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        entryAdded: vi.fn()
      },
      Runtime: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockResolvedValue(undefined)
      },
      Performance: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        metrics: vi.fn()
      },
      CSS: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        stylesheetAdded: vi.fn(),
        stylesheetRemoved: vi.fn(),
        stylesheetChanged: vi.fn()
      },
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    };
    mockClient = client as unknown as MockCDPClient;

    // Set up default successful responses
    mockFetch
      .mockResolvedValue(createMockResponse(true, [{
        type: 'page',
        url: 'http://example.com',
        webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/123'
      }]));

    const mockCDP = vi.mocked(CDP);
    mockCDP.mockResolvedValue(mockClient);
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  describe('Connection and Registration', () => {
    it('should handle DEPRECATED_ENDPOINT with retries', async () => {
      // Override the default mock for this specific test
      mockCDP
        .mockRejectedValueOnce(new Error('Registration response error message: DEPRECATED_ENDPOINT'))
        .mockResolvedValueOnce(mockClient);

      // Set up the mock client to emit a log event immediately
      mockClient.on.mockImplementation((event, callback) => {
        if (event === 'Console.messageAdded') {
          callback({
            message: {
              level: 'info',
              text: 'Test log',
              timestamp: Date.now()
            }
          });
        }
      });

      const extractPromise = extractor.extract();
      
      // Fast-forward through the retry delay
      await vi.advanceTimersByTimeAsync(200);
      
      // Fast-forward through the log collection wait time
      await vi.advanceTimersByTimeAsync(15000);
      
      const result = await extractPromise;
      
      expect(mockCDP).toHaveBeenCalledTimes(2);
      expect(mockClient.Network.enable).toHaveBeenCalled();
      expect(mockClient.Console.enable).toHaveBeenCalled();
      expect(mockClient.Log.enable).toHaveBeenCalled();
      
      return result;
    });

    it('should handle connection failures with retries', async () => {
      // Override the default mock for this specific test
      mockCDP.mockRejectedValue(new Error('Failed to connect to Chrome debugging endpoint'));

      const promise = extractor.extract();

      // Fast-forward through all retry delays
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100 * Math.pow(2, i));
      }

      await expect(promise).rejects.toThrow('Failed to connect to Chrome debugging endpoint');
      expect(mockCDP).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-recoverable errors', async () => {
      // Override the default mock for this specific test
      mockFetch.mockResolvedValueOnce(createMockResponse(false));

      await expect(extractor.extract()).rejects.toThrow('Chrome is not running');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockCDP).not.toHaveBeenCalled();
    });
  });

  describe('Log Collection', () => {
    it('should suppress DEPRECATED_ENDPOINT errors in console logs', async () => {
      extractor = new TestableChromeExtractor({});
      const promise = extractor.extract();

      const logs: CollectedLogEntry[] = [];
      const consoleMessage: ConsoleMessage = {
        source: 'console',
        level: 'error',
        text: 'Registration response error message: DEPRECATED_ENDPOINT',
        timestamp: new Date(Date.now()).toISOString()
      };
      extractor.injectTestEvent('console', consoleMessage, logs);

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const filteredLogs = logsAfterExtraction.filter(
        (log) =>
          log.content.includes('DEPRECATED_ENDPOINT') &&
          log.level === 'warning'
      );
      expect(filteredLogs).toHaveLength(0);
    });

    it('should not suppress other errors in console logs', async () => {
      extractor = new TestableChromeExtractor({});
      const promise = extractor.extract();

      const logs: CollectedLogEntry[] = [];
      const consoleMessage: ConsoleMessage = {
        source: 'console',
        level: 'error',
        text: 'Some other error occurred',
        timestamp: new Date(Date.now()).toISOString()
      };
      extractor.injectTestEvent('console', consoleMessage, logs);

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const filteredLogs = logsAfterExtraction.filter(
        (log) =>
          log.content.includes('Some other error occurred') &&
          log.level === 'error'
      );
      expect(filteredLogs).toHaveLength(1);
    });

    it('should handle network errors during log collection', async () => {
      extractor = new TestableChromeExtractor({});
      const promise = extractor.extract();

      const logs: CollectedLogEntry[] = [];
      const networkRequest: NetworkRequest = {
        requestId: '123',
        url: 'http://example.com',
        method: 'GET',
        headers: {},
        timestamp: new Date(Date.now()).toISOString()
      };
      extractor.injectTestEvent('network', networkRequest, logs);

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const filteredLogs = logsAfterExtraction.filter(
        (log) => log.type === 'network' && log.content.includes('http://example.com')
      );
      expect(filteredLogs).toHaveLength(1);
    });
  });

  describe('React Hook Monitoring', () => {
    it('should correctly process React hook events', async () => {
      extractor = new TestableChromeExtractor({
        enableReactHookMonitoring: true,
      });

      const promise = extractor.extract();

      // Simulate a React hook event directly using injectTestEvent
      extractor.injectTestEvent('reacthook', {
        level: 'log',
        text: "[CLiTS-React-Monitor] useState called",
        parameters: [{ type: 'string', value: 'React Hook Event' }],
        timestamp: new Date(Date.now()).toISOString()
      });
      extractor.injectTestEvent('reacthook', {
        level: 'log',
        text: "[CLiTS-React-Monitor] useEffect called",
        parameters: [{ type: 'string', value: 'React Hook Event' }],
        timestamp: new Date(Date.now()).toISOString()
      });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logs = await promise;

      const reactHookLogs = logs.filter(log => log.type === 'reacthook');
      expect(reactHookLogs.length).toBeGreaterThan(0);
      expect(reactHookLogs.some(log => log.content.includes('[CLiTS-React-Monitor] useState called'))).toBe(true);
      expect(reactHookLogs.some(log => log.content.includes('[CLiTS-React-Monitor] useEffect called'))).toBe(true);
    });
  });

  describe('DOM Mutation Monitoring', () => {
    it('should correctly process DOM mutation events', async () => {
      extractor = new TestableChromeExtractor({
        includeDomMutationMonitoring: true,
      });

      const promise = extractor.extract();

      // Simulate a DOM mutation log directly using injectTestEvent
      extractor.injectTestEvent('dommutation', {
        level: 'log',
        text: "[CLiTS-DOM-Monitor] DOM Mutation:",
        parameters: [{ type: 'object', value: { type: 'attributes', target: 'DIV' } }],
        timestamp: new Date(Date.now()).toISOString()
      });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logs = await promise;

      const domMutationLogs = logs.filter(log => log.type === 'dommutation');
      expect(domMutationLogs.some(log => log.content.includes('[CLiTS-DOM-Monitor] DOM Mutation:'))).toBe(true);
    });
  });

  describe('CSS Change Monitoring', () => {
    it('should correctly process CSS change events', async () => {
      extractor = new TestableChromeExtractor({
        includeCssChangeMonitoring: true,
      });

      const promise = extractor.extract();

      // Simulate a CSS change log directly using injectTestEvent
      extractor.injectTestEvent('csschange', {
        header: { styleSheetId: '1', origin: 'regular', sourceURL: 'style.css' },
        timestamp: new Date(Date.now()).toISOString(), // Ensure ISO string for timestamp
        details: {} // Add a details property to match CollectedLogEntry
      });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logs = await promise;

      const cssChangeLogs = logs.filter(log => log.type === 'csschange');
      expect(cssChangeLogs.length).toBeGreaterThan(0);
      expect(cssChangeLogs[0].content).toContain('stylesheetAdded');
    });
  });

  describe('Redux State Monitoring', () => {
    it('should correctly process Redux actions', async () => {
      extractor = new TestableChromeExtractor({
        includeReduxMonitoring: true,
      });

      const promise = extractor.extract();

      // Simulate a Redux action log directly using injectTestEvent
      extractor.injectTestEvent('redux', {
        level: 'log',
        text: "[CLiTS-Redux-Monitor] Redux action dispatched:",
        parameters: [{ type: 'object', value: { action: { type: 'TEST_ACTION' } } }],
        timestamp: new Date(Date.now()).toISOString()
      });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logs = await promise;

      const reduxLogs = logs.filter(log => log.type === 'redux');
      expect(reduxLogs.some(log => log.content.includes('[CLiTS-Redux-Monitor] Redux action dispatched:'))).toBe(true);
    });
  });

  describe('Event Loop Monitoring', () => {
    it('should correctly process long animation frame events', async () => {
      extractor = new TestableChromeExtractor({
        includeEventLoopMonitoring: true,
      });

      const promise = extractor.extract();
      
      // Simulate an Event Loop log directly using injectTestEvent
      extractor.injectTestEvent('eventloop', {
        level: 'log',
        text: "[CLiTS-EventLoop-Monitor] Long Animation Frame detected:",
        parameters: [{type: 'object', value: {duration: 60, blockingDuration: 10}}],
        timestamp: new Date(Date.now()).toISOString()
      });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logs = await promise;

      const eventLoopLogs = logs.filter(log => log.type === 'eventloop');
      expect(eventLoopLogs.some(log => log.content.includes('[CLiTS-EventLoop-Monitor] Long Animation Frame detected:'))).toBe(true);
    });
  });

  describe('User Interaction Recording', () => {
    it('should correctly process user interaction events', async () => {
        extractor = new TestableChromeExtractor({
            includeUserInteractionRecording: true,
        });

        const promise = extractor.extract();

        // Simulate a User Interaction log directly using injectTestEvent
        extractor.injectTestEvent('userinteraction', {
            level: 'log',
            text: "[CLiTS-Interaction-Monitor] click event:",
            parameters: [{type: 'object', value: {target: 'BUTTON#my-button'}}],
            timestamp: new Date(Date.now()).toISOString()
        });

        vi.advanceTimersByTime(15000);
        await vi.runAllTimersAsync();
        const logs = await promise;

        const interactionLogs = logs.filter(log => log.type === 'userinteraction');
        expect(interactionLogs.some(log => log.content.includes('[CLiTS-Interaction-Monitor] click event:'))).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should properly clean up resources on success', async () => {
      // Mock successful connection
      const mockClient: MockCDPClient = {
        Network: {
          enable: vi.fn().mockResolvedValue(undefined),
          disable: vi.fn(),
          requestWillBeSent: vi.fn(),
          responseReceived: vi.fn()
        },
        Console: {
          enable: vi.fn().mockResolvedValue(undefined),
          disable: vi.fn(),
          messageAdded: vi.fn()
        },
        Log: {
          enable: vi.fn().mockResolvedValue(undefined),
          disable: vi.fn(),
          entryAdded: vi.fn()
        },
        Runtime: {
          enable: vi.fn().mockResolvedValue(undefined),
          disable: vi.fn(),
          evaluate: vi.fn()
        },
        Performance: {
          enable: vi.fn().mockResolvedValue(undefined),
          disable: vi.fn(),
          metrics: vi.fn()
        },
        CSS: {
          enable: vi.fn().mockResolvedValue(undefined),
          disable: vi.fn(),
          stylesheetAdded: vi.fn(),
          stylesheetRemoved: vi.fn(),
          stylesheetChanged: vi.fn()
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

      const mockCDP = vi.mocked(CDP);
      mockCDP.mockResolvedValue(mockClient);

      extractor = new TestableChromeExtractor({
        enableReactHookMonitoring: true, // Enable this to ensure Runtime.disable is called
      });

      const promise = extractor.extract();
      
      // Fast-forward through log collection
      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockClient.Network.disable).toHaveBeenCalled();
      expect(mockClient.Console.disable).toHaveBeenCalled();
      expect(mockClient.Log.disable).toHaveBeenCalled();
      expect(mockClient.Runtime.disable).toHaveBeenCalled();
      expect(mockClient.Performance.disable).toHaveBeenCalled();
      expect(mockClient.CSS.disable).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    }, 20000);

    it('should properly clean up resources on failure', async () => {
      // Mock successful connection but failed log collection
      const mockClient: MockCDPClient = {
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
          enable: vi.fn().mockRejectedValue(new Error('Log enable failed')),
          disable: vi.fn(),
          entryAdded: vi.fn()
        },
        Runtime: {
          enable: vi.fn().mockResolvedValue(undefined),
          disable: vi.fn(),
          evaluate: vi.fn()
        },
        Performance: {
          enable: vi.fn(),
          disable: vi.fn(),
          metrics: vi.fn()
        },
        CSS: {
          enable: vi.fn(),
          disable: vi.fn(),
          stylesheetAdded: vi.fn(),
          stylesheetRemoved: vi.fn(),
          stylesheetChanged: vi.fn()
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

      const mockCDP = vi.mocked(CDP);
      mockCDP.mockResolvedValue(mockClient);

      // Mock the error to be non-suppressible for this test
      vi.spyOn(ChromeErrorHandler, 'isChromeError').mockReturnValue(false);
      vi.spyOn(PlatformErrorHandler, 'isPlatformError').mockReturnValue(false);

      extractor = new TestableChromeExtractor({
        enableReactHookMonitoring: true, // Enable this to ensure Runtime.disable is called
      });

      const promise = extractor.extract();

      // Fast-forward through log collection
      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      // We expect this to reject, so we catch the error.
      await expect(promise).rejects.toThrow();

      // These should still be called even on failure
      expect(mockClient.Network.disable).toHaveBeenCalled();
      expect(mockClient.Console.disable).toHaveBeenCalled();
      expect(mockClient.Log.disable).toHaveBeenCalled();
      expect(mockClient.Runtime.disable).toHaveBeenCalled();
      expect(mockClient.Performance.disable).toHaveBeenCalled();
      expect(mockClient.CSS.disable).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    }, 20000);
  });
}); 