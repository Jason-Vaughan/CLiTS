import CDP from 'chrome-remote-interface';
import { ExtractedLog } from './extractor.js';
import { createLogger, format, transports } from 'winston';
import fetch from 'node-fetch';
import { PlatformErrorHandler } from './platform/error-handler.js';

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
  filters?: {
    logLevels?: Array<'error' | 'warning' | 'info' | 'debug'>;
    sources?: Array<'network' | 'console' | 'devtools'>;
    domains?: string[];  // Domain patterns to match (e.g. ["*.google.com", "api.*"])
    keywords?: string[]; // Keywords to match in log content
    excludePatterns?: string[]; // Regex patterns to exclude
  };
  format?: {
    groupBySource?: boolean;
    groupByLevel?: boolean;
    includeTimestamp?: boolean;
    includeStackTrace?: boolean;
  };
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
      includeConsole: options.includeConsole ?? true,
      filters: {
        logLevels: options.filters?.logLevels || ['error', 'warning', 'info', 'debug'],
        sources: options.filters?.sources || ['network', 'console', 'devtools'],
        domains: options.filters?.domains || [],
        keywords: options.filters?.keywords || [],
        excludePatterns: options.filters?.excludePatterns || []
      },
      format: {
        groupBySource: options.format?.groupBySource ?? false,
        groupByLevel: options.format?.groupByLevel ?? false,
        includeTimestamp: options.format?.includeTimestamp ?? true,
        includeStackTrace: options.format?.includeStackTrace ?? true
      }
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

  private shouldIncludeLog(log: CollectedLogEntry): boolean {
    const filters = this.options.filters;
    
    // Check log level
    if (log.type === 'console' || log.type === 'log') {
      const level = (log.details as ConsoleMessage | DevToolsLogEntry).level.toLowerCase();
      const logLevel = level as 'error' | 'warning' | 'info' | 'debug';
      if (!filters.logLevels?.includes(logLevel)) {
        return false;
      }
    }

    // Check source
    const source = log.type as 'network' | 'console' | 'devtools';
    if (!filters.sources?.includes(source)) {
      return false;
    }

    // Check domains for network requests
    if (log.type === 'network' && filters.domains && filters.domains.length > 0) {
      const url = (log.details as NetworkRequest).url;
      if (!filters.domains.some(domain => 
        new RegExp(domain.replace(/\*/g, '.*')).test(url)
      )) {
        return false;
      }
    }

    // Check keywords
    if (filters.keywords && filters.keywords.length > 0) {
      const text = JSON.stringify(log.details);
      if (!filters.keywords.some(keyword => text.includes(keyword))) {
        return false;
      }
    }

    // Check exclude patterns
    if (filters.excludePatterns && filters.excludePatterns.length > 0) {
      const text = JSON.stringify(log.details);
      if (filters.excludePatterns.some(pattern => 
        new RegExp(pattern).test(text)
      )) {
        return false;
      }
    }

    return true;
  }

  private formatLogs(logs: CollectedLogEntry[]): ExtractedLog[] {
    const formattedLogs = logs.filter(log => this.shouldIncludeLog(log));

    if (this.options.format.groupBySource || this.options.format.groupByLevel) {
      const groups: { [key: string]: CollectedLogEntry[] } = {};
      
      formattedLogs.forEach(log => {
        let groupKey = '';
        if (this.options.format.groupBySource) {
          groupKey += `[${log.type}]`;
        }
        if (this.options.format.groupByLevel && (log.type === 'console' || log.type === 'log')) {
          const level = (log.details as ConsoleMessage | DevToolsLogEntry).level;
          groupKey += `[${level}]`;
        }
        groups[groupKey] = groups[groupKey] || [];
        groups[groupKey].push(log);
      });

      return Object.entries(groups).map(([groupKey, groupLogs]) => {
        const content = groupLogs.map(log => {
          let entry = '';
          if (this.options.format.includeTimestamp) {
            entry += `[${log.timestamp}] `;
          }
          if (log.type === 'network') {
            const req = log.details as NetworkRequest;
            entry += `${req.method} ${req.url}`;
          } else {
            const msg = log.details as ConsoleMessage | DevToolsLogEntry;
            entry += msg.text;
            if (this.options.format.includeStackTrace && 'stack' in msg && msg.stack) {
              entry += `\n${msg.stack}`;
            }
          }
          return entry;
        }).join('\n');

        return {
          filePath: `chrome-devtools://${groupKey}`,
          content,
          size: content.length,
          lastModified: new Date(groupLogs[0].timestamp)
        };
      });
    }

    return formattedLogs.map(log => ({
      filePath: `chrome-devtools://${log.type}/${log.timestamp}`,
      content: JSON.stringify(log.details, null, 2),
      size: JSON.stringify(log.details).length,
      lastModified: new Date(log.timestamp)
    }));
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
          logger.debug('Network request detected', { url: params.url, details: params });
          logs.push({
            type: 'network',
            timestamp: toISOString(params.timestamp),
            details: params
          });
        });

        Network.responseReceived((params: NetworkResponse) => {
          logger.debug('Network response detected', { status: params.status, details: params });
          logs.push({
            type: 'network',
            timestamp: toISOString(params.timestamp),
            details: params
          });
        });
      }

      if (this.options.includeConsole) {
        Console.messageAdded((params: ConsoleMessage) => {
          // Check if this is a platform-specific error that should be suppressed
          if (PlatformErrorHandler.isPlatformError(params.text)) {
            const platformError = PlatformErrorHandler.handleError(params.text);
            if (platformError && PlatformErrorHandler.shouldSuppressError(params.text)) {
              logger.debug('Suppressing platform-specific error', { error: params.text });
              return;
            }
          }

          logger.debug('Console message detected', { level: params.level, text: params.text, details: params });
          logs.push({
            type: 'console',
            timestamp: toISOString(params.timestamp),
            details: params
          });
        });

        Log.entryAdded((params: DevToolsLogEntry) => {
          // Check if this is a platform-specific error that should be suppressed
          if (PlatformErrorHandler.isPlatformError(params.text)) {
            const platformError = PlatformErrorHandler.handleError(params.text);
            if (platformError && PlatformErrorHandler.shouldSuppressError(params.text)) {
              logger.debug('Suppressing platform-specific error', { error: params.text });
              return;
            }
          }

          logger.debug('Log entry detected', { level: params.level, text: params.text, details: params });
          logs.push({
            type: 'log',
            timestamp: toISOString(params.timestamp),
            details: params
          });
        });
      }

      // Wait longer to collect logs and report progress
      logger.info('Waiting for logs...');
      const waitTimeMs = 15000; // Increase to 15 seconds
      const progressInterval = 1000; // Report every second
      let elapsed = 0;

      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          elapsed += progressInterval;
          logger.info(`Collecting logs... ${elapsed/1000}s elapsed, ${logs.length} logs collected`);
          
          if (elapsed >= waitTimeMs) {
            clearInterval(interval);
            resolve();
          }
        }, progressInterval);
      });

      logger.info(`Collection complete. ${logs.length} logs collected`);

      // Clean up
      if (this.options.includeNetwork) {
        await Network.disable();
      }
      if (this.options.includeConsole) {
        await Console.disable();
        await Log.disable();
      }
      await client.close();

      const formattedLogs = this.formatLogs(logs);
      logger.info(`Formatted ${formattedLogs.length} logs after filtering`);
      
      return formattedLogs;
    } catch (error) {
      // Check if this is a platform-specific error
      if (error instanceof Error && PlatformErrorHandler.isPlatformError(error)) {
        const platformError = PlatformErrorHandler.handleError(error);
        if (platformError && PlatformErrorHandler.shouldSuppressError(error)) {
          logger.warn('Encountered suppressible platform-specific error', { 
            error: error.message,
            recommendation: platformError.recommendation 
          });
          return [];
        }
      }

      logger.error('Failed to extract Chrome DevTools logs', { error });
      throw error;
    }
  }
} 