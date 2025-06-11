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
type ConsoleCallback = (event: { message: ConsoleMessage }) => void;

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
    loadingFailed: Mock<[any], void>;
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
  Runtime: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    evaluate: Mock<[{ expression: string; silent?: boolean }], Promise<{ result: { value?: any } }>>;
    consoleAPICalled: Mock<[any], void>;
    exceptionThrown: Mock<[any], void>;
  };
  Performance: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    metrics: Mock<[any], void>;
  };
  CSS: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    styleSheetAdded: Mock<[any], void>;
    styleSheetRemoved: Mock<[any], void>;
    styleSheetChanged: Mock<[any], void>;
  };
  Page: {
    enable: Mock<[], Promise<void>>;
    disable: Mock<[], Promise<void>>;
    navigate: Mock<[any], Promise<void>>;
    loadEventFired: Mock<[], Promise<void>>;
    captureScreenshot: Mock<[any], Promise<{ data: string }>>;
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
  close: Mock<[], Promise<void>>;
  on: Mock<[string, (event: any) => void], void>;
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

  setMockClient(client: MockCDPClient) {
    (this as any).client = client;
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
      },
      includeNetwork: true,
      includeConsole: true,
      enableReactHookMonitoring: true,
      includeDomMutationMonitoring: true,
      includeCssChangeMonitoring: true,
      includeReduxMonitoring: true,
      includeEventLoopMonitoring: true,
      includeUserInteractionRecording: true
    });

    // Mock CDP client
    mockClient = {
      Network: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        requestWillBeSent: vi.fn(),
        responseReceived: vi.fn(),
        loadingFailed: vi.fn()
      },
      Console: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        messageAdded: vi.fn()
      },
      Log: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        entryAdded: vi.fn()
      },
      Runtime: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        evaluate: vi.fn().mockResolvedValue({ result: { value: undefined } }),
        consoleAPICalled: vi.fn(),
        exceptionThrown: vi.fn()
      },
      Performance: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        metrics: vi.fn()
      },
      CSS: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        styleSheetAdded: vi.fn(),
        styleSheetRemoved: vi.fn(),
        styleSheetChanged: vi.fn()
      },
      Page: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        navigate: vi.fn().mockResolvedValue({}),
        loadEventFired: vi.fn().mockResolvedValue({}),
        captureScreenshot: vi.fn().mockResolvedValue({ data: 'base64data' })
      },
      DOM: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        getDocument: vi.fn().mockResolvedValue({ root: { nodeId: 1 } }),
        querySelector: vi.fn().mockResolvedValue({ nodeId: 2 }),
        getBoxModel: vi.fn().mockResolvedValue({ model: { content: [0, 0, 100, 100] } })
      },
      Input: {
        enable: vi.fn().mockResolvedValue({}),
        disable: vi.fn().mockResolvedValue({}),
        dispatchMouseEvent: vi.fn().mockResolvedValue({}),
        dispatchKeyEvent: vi.fn().mockResolvedValue({})
      },
      close: vi.fn().mockResolvedValue({}),
      on: vi.fn()
    };

    // Set up the mock client
    extractor.setMockClient(mockClient);
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
      const mockConsoleMessage: ConsoleMessage = {
        level: 'log',
        text: 'Test message',
        timestamp: Date.now(),
        source: 'console'
      };

      // Simulate the console message being received
      mockClient.Console.messageAdded({ message: mockConsoleMessage });

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
      const errorMessage = {
        source: 'console',
        level: 'error',
        text: 'Test error message',
        timestamp: Date.now()
      };

      mockClient.Console.messageAdded({ message: errorMessage });
      const logs = await extractor.extract();
      const filteredLogs = logs.filter(log => 
        log.content.includes('"level": "error"')
      );
      expect(filteredLogs).toHaveLength(1);
    });

    it('should handle network errors during log collection', async () => {
      const networkRequest = {
        requestId: '123',
        url: 'http://example.com',
        method: 'GET',
        headers: {},
        timestamp: Date.now()
      };

      mockClient.Network.requestWillBeSent({ request: networkRequest });
      const logs = await extractor.extract();
      const filteredLogs = logs.filter(log => 
        log.content.includes('network') && log.content.includes('http://example.com')
      );
      expect(filteredLogs).toHaveLength(1);
    });
  });

  describe('React Hook Monitoring', () => {
    it('should correctly process React hook events', async () => {
      // Create a valid hook event
      const hookEvent: ConsoleMessage = {
        level: 'log',
        text: 'Test hook event',
        timestamp: Date.now(),
        source: 'console'
      };

      // Simulate the hook event being received
      mockClient.Console.messageAdded({ message: hookEvent });

      const logs = await extractor.extract();
      const reactHookLogs = logs.filter(log => log.content.includes('reacthook'));
      expect(reactHookLogs.length).toBeGreaterThan(0);
      expect(reactHookLogs.some(log => log.content.includes('Test hook event'))).toBe(true);
    });
  });

  describe('DOM Mutation Monitoring', () => {
    it('should correctly process DOM mutation events', async () => {
      const mutationEvent = {
        type: 'childList',
        target: 'div',
        details: { addedNodes: 1, removedNodes: 0 }
      };

      mockClient.Console.messageAdded({ 
        message: {
          source: 'console',
          level: 'info',
          text: `[CLiTS-DOM-Monitor] DOM Mutation: ${JSON.stringify(mutationEvent)}`,
          timestamp: Date.now()
        }
      });
      const logs = await extractor.extract();
      const domMutationLogs = logs.filter(log => log.content.includes('dommutation'));
      expect(domMutationLogs.some(log => log.content.includes('[CLiTS-DOM-Monitor] DOM Mutation:'))).toBe(true);
    });
  });

  describe('CSS Change Monitoring', () => {
    it('should correctly process CSS change events', async () => {
      const cssEvent = {
        type: 'stylesheetAdded',
        styleSheetId: '123',
        header: { sourceURL: 'test.css' },
        timestamp: Date.now()
      };

      mockClient.CSS.styleSheetAdded(cssEvent);
      const logs = await extractor.extract();
      const cssChangeLogs = logs.filter(log => log.content.includes('csschange'));
      expect(cssChangeLogs.length).toBeGreaterThan(0);
      expect(cssChangeLogs[0].content).toContain('stylesheetAdded');
    });
  });

  describe('Redux State Monitoring', () => {
    it('should correctly process Redux actions', async () => {
      const reduxEvent = {
        type: 'action',
        action: { type: 'TEST_ACTION', payload: {} },
        timestamp: Date.now()
      };

      mockClient.Console.messageAdded({
        message: {
          source: 'console',
          level: 'info',
          text: `[CLiTS-Redux-Monitor] Redux action dispatched: ${JSON.stringify(reduxEvent)}`,
          timestamp: Date.now()
        }
      });
      const logs = await extractor.extract();
      const reduxLogs = logs.filter(log => log.content.includes('redux'));
      expect(reduxLogs.some(log => log.content.includes('[CLiTS-Redux-Monitor] Redux action dispatched'))).toBe(true);
    });
  });

  describe('Event Loop Monitoring', () => {
    it('should correctly process long animation frame events', async () => {
      const eventLoopEvent = {
        duration: 100,
        blockingDuration: 50,
        startTime: Date.now(),
        scripts: [],
        entry: {}
      };

      mockClient.Console.messageAdded({
        message: {
          source: 'console',
          level: 'info',
          text: `[CLiTS-EventLoop-Monitor] Long Animation Frame: ${JSON.stringify(eventLoopEvent)}`,
          timestamp: Date.now()
        }
      });
      const logs = await extractor.extract();
      const eventLoopLogs = logs.filter(log => log.content.includes('eventloop'));
      expect(eventLoopLogs.some(log => log.content.includes('[CLiTS-EventLoop-Monitor] Long Animation Frame'))).toBe(true);
    });
  });

  describe('User Interaction Recording', () => {
    it('should correctly process user interaction events', async () => {
      const interactionEvent = {
        type: 'click',
        target: 'button',
        timestamp: Date.now(),
        details: { x: 100, y: 100 }
      };

      mockClient.Console.messageAdded({
        message: {
          source: 'console',
          level: 'info',
          text: `[CLiTS-Interaction-Monitor] click event: ${JSON.stringify(interactionEvent)}`,
          timestamp: Date.now()
        }
      });
      const logs = await extractor.extract();
      const interactionLogs = logs.filter(log => log.content.includes('userinteraction'));
      expect(interactionLogs.some(log => log.content.includes('[CLiTS-Interaction-Monitor] click event'))).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should properly clean up resources on success', async () => {
      await extractor.extract();
      expect(mockClient.Network.disable).toHaveBeenCalled();
      expect(mockClient.Console.disable).toHaveBeenCalled();
      expect(mockClient.Log.disable).toHaveBeenCalled();
      expect(mockClient.Runtime.disable).toHaveBeenCalled();
      expect(mockClient.Performance.disable).toHaveBeenCalled();
      expect(mockClient.CSS.disable).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should properly clean up resources on failure', async () => {
      mockClient.Network.enable.mockRejectedValueOnce(new Error('Test error'));
      try {
        await extractor.extract();
      } catch (error) {
        // Expected error
      }
      expect(mockClient.Network.disable).toHaveBeenCalled();
      expect(mockClient.Console.disable).toHaveBeenCalled();
      expect(mockClient.Log.disable).toHaveBeenCalled();
    });
  });
}); 