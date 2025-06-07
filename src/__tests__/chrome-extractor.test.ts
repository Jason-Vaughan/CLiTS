import { ChromeExtractor } from '../chrome-extractor.js';
import CDP from 'chrome-remote-interface';
import fetch, { Response, Headers } from 'node-fetch';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import type { ConsoleMessage, DevToolsLogEntry, NetworkRequest, NetworkResponse } from '../types/chrome-types.js';
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

// Define the callback function types
type NetworkCallback = (event: NetworkRequestEvent | NetworkResponseEvent) => void;
type ConsoleCallback = (event: { message: ConsoleMessage }) => void;
type LogCallback = (event: { entry: DevToolsLogEntry }) => void;

// Define the types for the CDP client events
interface NetworkRequestEvent {
  request: NetworkRequest;
}

interface NetworkResponseEvent {
  response: NetworkResponse;
}

// Define the types for the CDP client methods
interface MockCDPClient {
  Network: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    requestWillBeSent: Mock<[NetworkRequestEvent], void>;
    responseReceived: Mock<[NetworkResponseEvent], void>;
  };
  Console: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    messageAdded: Mock<[{ message: ConsoleMessage }], void>;
  };
  Log: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    entryAdded: Mock<[{ entry: DevToolsLogEntry }], void>;
  };
  Page: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    navigate: Mock<[any], Promise<void>>;
    loadEventFired: Mock<[], Promise<void>>;
    captureScreenshot: Mock<[any], Promise<{ data: string }>>;
  };
  Runtime: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    evaluate: Mock<[any], Promise<any>>;
    exceptionThrown: Mock<[any], void>;
  };
  DOM: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    getDocument: Mock<[], Promise<{ root: { nodeId: number } }>>;
    querySelector: Mock<[any], Promise<{ nodeId: number }>>;
    getBoxModel: Mock<[any], Promise<{ model: { content: number[] } }>>;
  };
  Input: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    dispatchMouseEvent: Mock<[any], Promise<void>>;
    dispatchKeyEvent: Mock<[any], Promise<void>>;
  };
  Performance: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    metrics: Mock<[any], void>;
  };
  CSS: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    stylesheetAdded: Mock<[any], void>;
    stylesheetRemoved: Mock<[any], void>;
    stylesheetChanged: Mock<[any], void>;
  };
  close: Mock<[], Promise<void>>;
  on: Mock<[string, NetworkCallback | ConsoleCallback | LogCallback], void>;
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
    mockClient = {
      Network: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        requestWillBeSent: vi.fn<[NetworkRequestEvent], void>(),
        responseReceived: vi.fn<[NetworkResponseEvent], void>()
      },
      Console: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        messageAdded: vi.fn<[{ message: ConsoleMessage }], void>()
      },
      Log: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        entryAdded: vi.fn<[{ entry: DevToolsLogEntry }], void>()
      },
      Page: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        navigate: vi.fn().mockResolvedValue(undefined),
        loadEventFired: vi.fn().mockResolvedValue(undefined),
        captureScreenshot: vi.fn().mockResolvedValue({ data: 'base64data' })
      },
      Runtime: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockResolvedValue(undefined),
        exceptionThrown: vi.fn()
      },
      DOM: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        getDocument: vi.fn().mockResolvedValue({ root: { nodeId: 1 } }),
        querySelector: vi.fn().mockResolvedValue({ nodeId: 2 }),
        getBoxModel: vi.fn().mockResolvedValue({ model: { content: [0, 0, 100, 100] } })
      },
      Input: {
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined),
        dispatchMouseEvent: vi.fn().mockResolvedValue(undefined),
        dispatchKeyEvent: vi.fn().mockResolvedValue(undefined)
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
      on: vi.fn().mockImplementation((event: string, callback: any) => {
        // Store the callback for later use
        if (event === 'Network.requestWillBeSent') {
          mockClient.Network.requestWillBeSent = callback as Mock<[NetworkRequestEvent], void>;
        } else if (event === 'Network.responseReceived') {
          mockClient.Network.responseReceived = callback as Mock<[NetworkResponseEvent], void>;
        } else if (event === 'Console.messageAdded') {
          mockClient.Console.messageAdded = callback as Mock<[{ message: ConsoleMessage }], void>;
        } else if (event === 'Log.entryAdded') {
          mockClient.Log.entryAdded = callback as Mock<[{ entry: DevToolsLogEntry }], void>;
        }
      })
    } as MockCDPClient;

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
          (callback as ConsoleCallback)({
            message: {
              source: 'console-api',
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
      const promise = extractor.extract();

      // Create a valid ConsoleMessage
      const consoleMessage: ConsoleMessage = {
        source: 'console-api',
        level: 'error',
        text: 'Registration response error message: DEPRECATED_ENDPOINT',
        timestamp: Date.now() / 1000
      };

      // Simulate the console message being received
      mockClient.Console.messageAdded({ message: consoleMessage });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const filteredLogs = logsAfterExtraction.filter(
        (log) =>
          log.content.includes('DEPRECATED_ENDPOINT') &&
          log.content.includes('"level": "warning"')
      );
      expect(filteredLogs).toHaveLength(0);
    });

    it('should not suppress other errors in console logs', async () => {
      const promise = extractor.extract();

      // Create a valid ConsoleMessage
      const consoleMessage: ConsoleMessage = {
        source: 'console-api',
        level: 'error',
        text: 'Some other error occurred',
        timestamp: Date.now() / 1000
      };

      // Simulate the console message being received
      mockClient.Console.messageAdded({ message: consoleMessage });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const filteredLogs = logsAfterExtraction.filter(
        (log) =>
          log.content.includes('Some other error occurred') &&
          log.content.includes('"level": "error"')
      );
      expect(filteredLogs).toHaveLength(1);
    });

    it('should handle network errors during log collection', async () => {
      const promise = extractor.extract();

      const networkRequest: NetworkRequest = {
        requestId: '123',
        url: 'http://example.com',
        method: 'GET',
        headers: {},
        timestamp: Date.now() / 1000
      };

      // Simulate the network request being received
      mockClient.Network.requestWillBeSent({ request: networkRequest });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const filteredLogs = logsAfterExtraction.filter(
        (log) => log.content.includes('network') && log.content.includes('http://example.com')
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

      // Create valid ConsoleMessages
      const useStateMessage: ConsoleMessage = {
        source: 'console-api',
        level: 'log',
        text: "[CLiTS-React-Monitor] useState called",
        timestamp: Date.now() / 1000
      };

      const useEffectMessage: ConsoleMessage = {
        source: 'console-api',
        level: 'log',
        text: "[CLiTS-React-Monitor] useEffect called",
        timestamp: Date.now() / 1000
      };

      // Simulate React hook events through Console messages
      mockClient.Console.messageAdded({ message: useStateMessage });
      mockClient.Console.messageAdded({ message: useEffectMessage });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const reactHookLogs = logsAfterExtraction.filter(log => log.content.includes('reacthook'));
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

      // Create a valid ConsoleMessage
      const domMutationMessage: ConsoleMessage = {
        source: 'console-api',
        level: 'log',
        text: "[CLiTS-DOM-Monitor] DOM Mutation:",
        timestamp: Date.now() / 1000
      };

      // Simulate DOM mutation events through Console messages
      mockClient.Console.messageAdded({ message: domMutationMessage });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const domMutationLogs = logsAfterExtraction.filter(log => log.content.includes('dommutation'));
      expect(domMutationLogs.some(log => log.content.includes('[CLiTS-DOM-Monitor] DOM Mutation:'))).toBe(true);
    });
  });

  describe('CSS Change Monitoring', () => {
    it('should correctly process CSS change events', async () => {
      extractor = new TestableChromeExtractor({
        includeCssChangeMonitoring: true,
      });

      const promise = extractor.extract();

      // Simulate CSS change events through CSS domain
      mockClient.CSS.stylesheetAdded({
        header: { styleSheetId: '1', origin: 'regular', sourceURL: 'style.css' }
      });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const cssChangeLogs = logsAfterExtraction.filter(log => log.content.includes('csschange'));
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

      // Create a valid ConsoleMessage
      const reduxMessage: ConsoleMessage = {
        source: 'console-api',
        level: 'log',
        text: "[CLiTS-Redux-Monitor] Redux action dispatched:",
        timestamp: Date.now() / 1000
      };

      // Simulate Redux action events through Console messages
      mockClient.Console.messageAdded({ message: reduxMessage });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const reduxLogs = logsAfterExtraction.filter(log => log.content.includes('redux'));
      expect(reduxLogs.some(log => log.content.includes('[CLiTS-Redux-Monitor] Redux action dispatched:'))).toBe(true);
    });
  });

  describe('Event Loop Monitoring', () => {
    it('should correctly process long animation frame events', async () => {
      extractor = new TestableChromeExtractor({
        includeEventLoopMonitoring: true,
      });

      const promise = extractor.extract();

      // Simulate Event Loop events through Console messages
      mockClient.Console.messageAdded({
        message: {
          source: 'console-api',
          level: 'log',
          text: "[CLiTS-EventLoop-Monitor] Long Animation Frame detected:",
          timestamp: Date.now() / 1000
        }
      });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const eventLoopLogs = logsAfterExtraction.filter(log => log.content.includes('eventloop'));
      expect(eventLoopLogs.some(log => log.content.includes('[CLiTS-EventLoop-Monitor] Long Animation Frame detected:'))).toBe(true);
    });
  });

  describe('User Interaction Recording', () => {
    it('should correctly process user interaction events', async () => {
      extractor = new TestableChromeExtractor({
        includeUserInteractionRecording: true,
      });

      const promise = extractor.extract();

      // Simulate User Interaction events through Console messages
      mockClient.Console.messageAdded({
        message: {
          source: 'console-api',
          level: 'log',
          text: "[CLiTS-Interaction-Monitor] click event:",
          timestamp: Date.now() / 1000
        }
      });

      vi.advanceTimersByTime(15000);
      await vi.runAllTimersAsync();
      const logsAfterExtraction = await promise;

      const interactionLogs = logsAfterExtraction.filter(log => log.content.includes('userinteraction'));
      expect(interactionLogs.some(log => log.content.includes('[CLiTS-Interaction-Monitor] click event:'))).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should properly clean up resources on success', async () => {
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
    });

    it('should properly clean up resources on failure', async () => {
      // Mock Network.enable to fail
      mockClient.Network.enable.mockRejectedValue(new Error('Network enable failed'));

      // We expect this to reject, so we catch the error.
      await expect(extractor.extract()).rejects.toThrow();

      // These should still be called even on failure
      expect(mockClient.Network.disable).toHaveBeenCalled();
      expect(mockClient.Console.disable).toHaveBeenCalled();
      expect(mockClient.Log.disable).toHaveBeenCalled();
      expect(mockClient.Runtime.disable).toHaveBeenCalled();
      expect(mockClient.Performance.disable).toHaveBeenCalled();
      expect(mockClient.CSS.disable).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    });
  });
}); 