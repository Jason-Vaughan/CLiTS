import CDP from 'chrome-remote-interface';
import { ExtractedLog } from './extractor.js';
import { createLogger, format, transports } from 'winston';
import fetch from 'node-fetch';
import { PlatformErrorHandler } from './platform/error-handler.js';
import { ChromeErrorHandler, RetryConfig } from './platform/chrome-error-handler.js';
import { EventEmitter } from 'events';

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

// Add type declaration for CDP client with event handling
interface CDPClient extends EventEmitter {
  Network: any;
  Console: any;
  Log: any;
  close: () => Promise<void>;
}

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
  retryConfig?: Partial<RetryConfig>;
  reconnect?: {
    enabled?: boolean;
    maxAttempts?: number;
    delayBetweenAttemptsMs?: number;
  };
  filters?: {
    logLevels?: Array<'error' | 'warning' | 'info' | 'debug'>;
    sources?: Array<'network' | 'console' | 'devtools'>;
    domains?: string[];  // Domain patterns to match (e.g. ["*.google.com", "api.*"])
    keywords?: string[]; // Keywords to match in log content
    excludePatterns?: string[]; // Regex patterns to exclude
    advancedFilter?: string; // Advanced boolean expression for filtering
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
  private chromeErrorHandler: ChromeErrorHandler;

  constructor(options: ChromeExtractorOptions = {}) {
    this.options = {
      port: options.port || ChromeExtractor.DEFAULT_PORT,
      host: options.host || ChromeExtractor.DEFAULT_HOST,
      maxEntries: options.maxEntries || ChromeExtractor.DEFAULT_MAX_ENTRIES,
      includeNetwork: options.includeNetwork ?? true,
      includeConsole: options.includeConsole ?? true,
      retryConfig: options.retryConfig || {},
      reconnect: {
        enabled: options.reconnect?.enabled ?? true,
        maxAttempts: options.reconnect?.maxAttempts ?? 5,
        delayBetweenAttemptsMs: options.reconnect?.delayBetweenAttemptsMs ?? 2000
      },
      filters: {
        logLevels: options.filters?.logLevels || ['error', 'warning', 'info', 'debug'],
        sources: options.filters?.sources || ['network', 'console', 'devtools'],
        domains: options.filters?.domains || [],
        keywords: options.filters?.keywords || [],
        excludePatterns: options.filters?.excludePatterns || [],
        advancedFilter: options.filters?.advancedFilter || ''
      },
      format: {
        groupBySource: options.format?.groupBySource ?? false,
        groupByLevel: options.format?.groupByLevel ?? false,
        includeTimestamp: options.format?.includeTimestamp ?? true,
        includeStackTrace: options.format?.includeStackTrace ?? true
      }
    };

    this.chromeErrorHandler = new ChromeErrorHandler(this.options.retryConfig);
  }

  private async getDebuggerUrl(): Promise<string> {
    return this.chromeErrorHandler.executeWithRetry(async () => {
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
    }, 'Getting Chrome debugger URL');
  }

  private shouldIncludeLog(log: CollectedLogEntry): boolean {
    const filters = this.options.filters;
    
    // Apply advanced filter if provided
    if (filters.advancedFilter && filters.advancedFilter.trim() !== '') {
      return this.evaluateAdvancedFilter(filters.advancedFilter, log);
    }
    
    // Otherwise apply standard filters
    // Check log level
    if (log.type === 'console' || log.type === 'log') {
      const details = log.details as ConsoleMessage | DevToolsLogEntry;
      if (!details || typeof details.level !== 'string') {
        logger.warn('Invalid log entry: missing or invalid level property', { log });
        return false;
      }
      const level = details.level.toLowerCase();
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
      const details = log.details as NetworkRequest;
      if (!details || typeof details.url !== 'string') {
        logger.warn('Invalid network request: missing or invalid url property', { log });
        return false;
      }
      const url = details.url;
      if (!filters.domains.some(domain => 
        new RegExp(domain.replace(/\*/g, '.*')).test(url)
      )) {
        return false;
      }
    }

    // Check keywords
    if (filters.keywords && filters.keywords.length > 0) {
      try {
        const text = JSON.stringify(log.details);
        if (!filters.keywords.some(keyword => text.includes(keyword))) {
          return false;
        }
      } catch (error) {
        logger.warn('Failed to stringify log details for keyword filtering', { error, log });
        return false;
      }
    }

    // Check exclude patterns
    if (filters.excludePatterns && filters.excludePatterns.length > 0) {
      try {
        const text = JSON.stringify(log.details);
        if (filters.excludePatterns.some(pattern => 
          new RegExp(pattern).test(text)
        )) {
          return false;
        }
      } catch (error) {
        logger.warn('Failed to stringify log details for exclude pattern filtering', { error, log });
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluates an advanced boolean filter expression against a log entry
   * Supports AND, OR, NOT, and parentheses for grouping
   * Example: "(React AND error) OR (network AND 404)"
   */
  private evaluateAdvancedFilter(expression: string, log: CollectedLogEntry): boolean {
    try {
      // Convert log to string for matching
      const logString = JSON.stringify(log.details);
      
      // Parse expression and evaluate
      return this.parseAdvancedFilterExpression(expression, logString);
    } catch (error) {
      logger.warn('Failed to evaluate advanced filter expression', { 
        expression, error, logType: log.type 
      });
      return false;
    }
  }

  /**
   * Parses and evaluates a boolean filter expression
   * This is a simple recursive descent parser for boolean expressions
   */
  private parseAdvancedFilterExpression(expression: string, logText: string): boolean {
    // Trim whitespace
    expression = expression.trim();
    
    if (!expression) {
      return true; // Empty expression matches everything
    }
    
    // Handle parenthesized expressions
    if (expression.startsWith('(')) {
      // Find matching closing parenthesis
      let depth = 1;
      let closePos = 1;
      
      while (depth > 0 && closePos < expression.length) {
        if (expression[closePos] === '(') {
          depth++;
        } else if (expression[closePos] === ')') {
          depth--;
        }
        closePos++;
      }
      
      if (depth !== 0) {
        logger.warn('Mismatched parentheses in filter expression', { expression });
        return false;
      }
      
      // Extract and evaluate the inner expression
      const innerExpr = expression.substring(1, closePos - 1);
      const innerResult = this.parseAdvancedFilterExpression(innerExpr, logText);
      
      // If this is the entire expression, return the result
      if (closePos === expression.length) {
        return innerResult;
      }
      
      // Otherwise, continue parsing the rest with the result of the inner expression
      const rest = expression.substring(closePos).trim();
      
      if (rest.toUpperCase().startsWith('AND')) {
        return innerResult && this.parseAdvancedFilterExpression(rest.substring(3), logText);
      } else if (rest.toUpperCase().startsWith('OR')) {
        return innerResult || this.parseAdvancedFilterExpression(rest.substring(2), logText);
      } else {
        logger.warn('Invalid operator in filter expression', { expression, rest });
        return false;
      }
    }
    
    // Handle NOT expressions
    if (expression.toUpperCase().startsWith('NOT')) {
      return !this.parseAdvancedFilterExpression(expression.substring(3).trim(), logText);
    }
    
    // Split by AND/OR operators (outside of parentheses)
    const andPos = this.findOperatorPosition(expression, 'AND');
    const orPos = this.findOperatorPosition(expression, 'OR');
    
    // Handle AND expressions (higher precedence than OR)
    if (andPos !== -1 && (orPos === -1 || andPos < orPos)) {
      const left = expression.substring(0, andPos).trim();
      const right = expression.substring(andPos + 3).trim();
      return this.parseAdvancedFilterExpression(left, logText) && 
             this.parseAdvancedFilterExpression(right, logText);
    }
    
    // Handle OR expressions
    if (orPos !== -1) {
      const left = expression.substring(0, orPos).trim();
      const right = expression.substring(orPos + 2).trim();
      return this.parseAdvancedFilterExpression(left, logText) || 
             this.parseAdvancedFilterExpression(right, logText);
    }
    
    // Base case: simple keyword match
    return logText.includes(expression);
  }
  
  /**
   * Helper to find the position of a boolean operator outside of parentheses
   */
  private findOperatorPosition(expression: string, operator: string): number {
    let pos = 0;
    let parenDepth = 0;
    
    while (pos < expression.length) {
      if (expression[pos] === '(') {
        parenDepth++;
      } else if (expression[pos] === ')') {
        parenDepth--;
      } else if (parenDepth === 0) {
        // Check if we have the operator at this position
        if (expression.substring(pos, pos + operator.length).toUpperCase() === operator) {
          // Verify it's a whole word by checking boundaries
          const prevChar = pos > 0 ? expression[pos - 1] : ' ';
          const nextChar = pos + operator.length < expression.length ? 
                          expression[pos + operator.length] : ' ';
                          
          if (/\s/.test(prevChar) && /\s/.test(nextChar)) {
            return pos;
          }
        }
      }
      
      pos++;
    }
    
    return -1;  // Operator not found
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
      
      const client = await this.chromeErrorHandler.executeWithRetry(
        async () => CDP({ target: debuggerUrl }) as unknown as CDPClient,
        'Connecting to Chrome DevTools'
      );
      logger.info('Connected to Chrome');

      const { Network, Console, Log } = client;
      const logs: CollectedLogEntry[] = [];

      // Helper function to convert Chrome timestamp to ISO string
      const toISOString = (timestamp: number) => {
        try {
          // Handle null, undefined, or invalid timestamp values
          if (!timestamp) {
            logger.warn('Missing timestamp value', { timestamp });
            return new Date().toISOString(); // Use current time as fallback
          }
          
          // If timestamp is in seconds (less than year 2100), convert to milliseconds
          const ms = timestamp < 4102444800 ? timestamp * 1000 : timestamp;
          
          // Validate timestamp is within reasonable range
          if (isNaN(ms) || ms < 0 || ms > 9999999999999) {
            logger.warn('Invalid timestamp value out of range', { timestamp, ms });
            return new Date().toISOString(); // Use current time as fallback
          }
          
          return new Date(ms).toISOString();
        } catch (error) {
          logger.warn('Invalid timestamp encountered', { timestamp, error });
          return new Date().toISOString(); // Use current time as fallback
        }
      };

      // Set up disconnect handling for page refreshes
      let isReconnecting = false;
      let reconnectAttempts = 0;

      client.on('disconnect', async () => {
        logger.warn('Chrome DevTools connection lost, possibly due to page refresh');
        
        if (!this.options.reconnect?.enabled || isReconnecting) {
          return;
        }
        
        isReconnecting = true;
        
        while (reconnectAttempts < (this.options.reconnect?.maxAttempts || 5)) {
          try {
            reconnectAttempts++;
            logger.info(`Attempting to reconnect (${reconnectAttempts}/${this.options.reconnect?.maxAttempts || 5})...`);
            
            // Wait before attempting to reconnect
            await new Promise(resolve => setTimeout(resolve, this.options.reconnect?.delayBetweenAttemptsMs || 2000));
            
            // Get a fresh debugger URL
            const newDebuggerUrl = await this.getDebuggerUrl();
            
            // Reconnect
            await client.close();
            
            // Use CDP directly with a callback
            const newClient = await CDP({ target: newDebuggerUrl });
            logger.info('Reconnected to Chrome DevTools');
            
            // Re-enable required domains
            if (this.options.includeNetwork) {
              await newClient.Network.enable();
            }
            if (this.options.includeConsole) {
              await newClient.Console.enable();
              await newClient.Log.enable();
            }
            
            isReconnecting = false;
            reconnectAttempts = 0;
            break;
          } catch (error) {
            logger.error(`Reconnection attempt ${reconnectAttempts} failed`, { error });
            
            if (reconnectAttempts >= (this.options.reconnect?.maxAttempts || 5)) {
              logger.error('Maximum reconnection attempts reached');
              break;
            }
          }
        }
      });

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

          // Check if this is a Chrome-specific error that should be suppressed
          if (ChromeErrorHandler.isChromeError(new Error(params.text))) {
            const chromeError = ChromeErrorHandler.handleError(new Error(params.text));
            if (chromeError && ChromeErrorHandler.shouldSuppressError(new Error(params.text))) {
              logger.debug('Suppressing Chrome-specific error', { error: params.text });
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

          // Check if this is a Chrome-specific error that should be suppressed
          if (ChromeErrorHandler.isChromeError(new Error(params.text))) {
            const chromeError = ChromeErrorHandler.handleError(new Error(params.text));
            if (chromeError && ChromeErrorHandler.shouldSuppressError(new Error(params.text))) {
              logger.debug('Suppressing Chrome-specific error', { error: params.text });
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

      // Check if this is a Chrome-specific error
      if (error instanceof Error && ChromeErrorHandler.isChromeError(error)) {
        const chromeError = ChromeErrorHandler.handleError(error);
        if (chromeError && ChromeErrorHandler.shouldSuppressError(error)) {
          logger.warn('Encountered suppressible Chrome-specific error', { 
            error: error.message,
            recommendation: chromeError.recommendation 
          });
          return [];
        }
      }

      logger.error('Failed to extract Chrome DevTools logs', { error });
      throw error;
    }
  }

  /**
   * Test hook: injects a simulated event into the log collection.
   * @param type 'network' | 'console' | 'log'
   * @param payload The event payload (NetworkRequest, NetworkResponse, ConsoleMessage, DevToolsLogEntry)
   * @param logsOverride (optional) logs array to use (for test injection)
   */
  protected _injectTestEvent(
    type: 'network' | 'console' | 'log',
    payload: any,
    logsOverride?: CollectedLogEntry[]
  ) {
    const toISOString = (timestamp: number) => {
      try {
        if (!timestamp) return new Date().toISOString();
        const ms = timestamp < 4102444800 ? timestamp * 1000 : timestamp;
        if (isNaN(ms) || ms < 0 || ms > 9999999999999) return new Date().toISOString();
        return new Date(ms).toISOString();
      } catch {
        return new Date().toISOString();
      }
    };
    const logs = logsOverride || (this as any)._testLogsArray || [];
    if (type === 'console') {
      // Suppression logic for console
      if (payload && typeof payload.text === 'string') {
        if (PlatformErrorHandler.isPlatformError(payload.text)) {
          const platformError = PlatformErrorHandler.handleError(payload.text);
          if (platformError && PlatformErrorHandler.shouldSuppressError(payload.text)) {
            return; // Suppress
          }
        }
        if (ChromeErrorHandler.isChromeError(new Error(payload.text))) {
          const chromeError = ChromeErrorHandler.handleError(new Error(payload.text));
          if (chromeError && ChromeErrorHandler.shouldSuppressError(new Error(payload.text))) {
            return; // Suppress
          }
        }
      }
      logs.push({
        type,
        timestamp: toISOString(payload.timestamp),
        details: payload
      });
    } else if (type === 'log') {
      // Suppression logic for log
      if (payload && typeof payload.text === 'string') {
        if (PlatformErrorHandler.isPlatformError(payload.text)) {
          const platformError = PlatformErrorHandler.handleError(payload.text);
          if (platformError && PlatformErrorHandler.shouldSuppressError(payload.text)) {
            return; // Suppress
          }
        }
        if (ChromeErrorHandler.isChromeError(new Error(payload.text))) {
          const chromeError = ChromeErrorHandler.handleError(new Error(payload.text));
          if (chromeError && ChromeErrorHandler.shouldSuppressError(new Error(payload.text))) {
            return; // Suppress
          }
        }
      }
      logs.push({
        type,
        timestamp: toISOString(payload.timestamp),
        details: payload
      });
    } else if (type === 'network') {
      logs.push({
        type,
        timestamp: toISOString(payload.timestamp),
        details: payload
      });
    }
    if (!logsOverride && (this as any)._testLogsArray !== logs) {
      (this as any)._testLogsArray = logs;
    }
  }
} 