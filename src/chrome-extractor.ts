import CDP from 'chrome-remote-interface';
import { ExtractedLog } from './extractor.js';
import { createLogger, format, transports } from 'winston';
import fetch from 'node-fetch';

// Type declarations for Chrome DevTools Protocol
type NetworkRequest = {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  timestamp: number;
};

type NetworkResponse = {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  timestamp: number;
};

type ConsoleMessage = {
  source: string;
  level: string;
  text: string;
  timestamp: number;
};

type DevToolsLogEntry = {
  source: string;
  level: string;
  text: string;
  timestamp: number;
};

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

export interface ChromeExtractorOptions {
  port?: number;
  host?: string;
  maxEntries?: number;
  includeNetwork?: boolean;
  includeConsole?: boolean;
}

interface CollectedLogEntry {
  type: 'network' | 'console' | 'log';
  timestamp: string;
  details: NetworkRequest | NetworkResponse | ConsoleMessage | DevToolsLogEntry;
}

export class ChromeExtractor {
  private static readonly DEFAULT_PORT = 9222;
  private static readonly DEFAULT_HOST = 'localhost';
  private static readonly DEFAULT_MAX_ENTRIES = 1000;

  private options: Required<ChromeExtractorOptions>;

  constructor(options: ChromeExtractorOptions = {}) {
    this.options = {
      port: options.port || ChromeExtractor.DEFAULT_PORT,
      host: options.host || ChromeExtractor.DEFAULT_HOST,
      maxEntries: options.maxEntries || ChromeExtractor.DEFAULT_MAX_ENTRIES,
      includeNetwork: options.includeNetwork ?? true,
      includeConsole: options.includeConsole ?? true
    };
  }

  private async getDebuggerUrl(): Promise<string> {
    try {
      // First check if Chrome is running
      const versionResponse = await fetch(`http://${this.options.host}:${this.options.port}/json/version`);
      if (!versionResponse.ok) {
        throw new Error('Chrome is not running with remote debugging enabled. Start Chrome with --remote-debugging-port=9222');
      }

      // Then get available targets
      const response = await fetch(`http://${this.options.host}:${this.options.port}/json/list`);
      const targets = await response.json() as Array<{
        type: string;
        url: string;
        webSocketDebuggerUrl?: string;
        title: string;
      }>;

      logger.info('Available targets', { targets: targets.map(t => ({ type: t.type, url: t.url, title: t.title })) });

      // Find a suitable page target, preferring non-newtab pages
      const pageTarget = targets.find(t => 
        t.type === 'page' && !t.url.includes('chrome://newtab')
      ) || targets.find(t => t.type === 'page');
      
      if (!pageTarget?.webSocketDebuggerUrl) {
        logger.warn('No page target found. Please open a new tab in Chrome.');
        throw new Error('No debuggable Chrome tab found. Please open a new tab in Chrome running with --remote-debugging-port=9222');
      }

      logger.info('Selected page target', { url: pageTarget.url, title: pageTarget.title });
      return pageTarget.webSocketDebuggerUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw error;  // Re-throw our custom errors
      }
      logger.error('Failed to get Chrome debugger URL', { error });
      throw new Error(`Failed to connect to Chrome debugger: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extract(): Promise<ExtractedLog[]> {
    try {
      logger.info('Connecting to Chrome DevTools...', { options: this.options });
      
      const debuggerUrl = await this.getDebuggerUrl();
      logger.info('Got debugger URL', { debuggerUrl });
      
      const client = await CDP({ target: debuggerUrl });
      logger.info('Connected to Chrome');

      const { Network, Console, Log } = client;
      const logs: CollectedLogEntry[] = [];

      // Helper function to convert Chrome timestamp to ISO string
      const toISOString = (timestamp: number) => {
        // If timestamp is in seconds (less than year 2100), convert to milliseconds
        const ms = timestamp < 4102444800 ? timestamp * 1000 : timestamp;
        return new Date(ms).toISOString();
      };

      if (this.options.includeNetwork) {
        await Network.enable();
        logger.info('Network tracking enabled');
      }
      if (this.options.includeConsole) {
        await Console.enable();
        await Log.enable();
        logger.info('Console tracking enabled');
      }

      // Set up event listeners
      if (this.options.includeNetwork) {
        Network.requestWillBeSent((params: NetworkRequest) => {
          logger.info('Network request detected', { url: params.url });
          logs.push({
            type: 'network',
            timestamp: toISOString(params.timestamp),
            details: params
          });
        });

        Network.responseReceived((params: NetworkResponse) => {
          logger.info('Network response detected', { status: params.status });
          logs.push({
            type: 'network',
            timestamp: toISOString(params.timestamp),
            details: params
          });
        });
      }

      if (this.options.includeConsole) {
        Console.messageAdded((params: ConsoleMessage) => {
          logger.info('Console message detected', { text: params.text });
          logs.push({
            type: 'console',
            timestamp: toISOString(params.timestamp),
            details: params
          });
        });

        Log.entryAdded((params: DevToolsLogEntry) => {
          logger.info('Log entry detected', { text: params.text });
          logs.push({
            type: 'log',
            timestamp: toISOString(params.timestamp),
            details: params
          });
        });
      }

      // Wait longer to collect logs
      logger.info('Waiting for logs...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      logger.info(`Collected ${logs.length} logs so far`);

      // Clean up
      if (this.options.includeNetwork) {
        await Network.disable();
      }
      if (this.options.includeConsole) {
        await Console.disable();
        await Log.disable();
      }
      await client.close();

      // Convert to ExtractedLog format
      const extractedLogs: ExtractedLog[] = logs.slice(0, this.options.maxEntries).map(log => ({
        filePath: `chrome-devtools://${log.type}/${log.timestamp}`,
        content: JSON.stringify(log.details, null, 2),
        size: JSON.stringify(log.details).length,
        lastModified: new Date(log.timestamp)
      }));

      logger.info(`Successfully extracted ${extractedLogs.length} Chrome DevTools logs`);
      return extractedLogs;
    } catch (error) {
      logger.error('Failed to extract Chrome DevTools logs', { error });
      throw error;
    }
  }
} 