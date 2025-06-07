// BSD: Chrome DevTools Protocol integration for extracting logs, network requests, and console output from Chrome browser sessions.
// Provides advanced filtering, formatting, and error handling capabilities for browser-based debugging.

import CDP from 'chrome-remote-interface';
import { ExtractedLog } from './extractor.js';
import { createLogger, format, transports } from 'winston';
import fetch from 'node-fetch';
import { PlatformErrorHandler } from './platform/error-handler.js';
import { ChromeErrorHandler, RetryConfig } from './platform/chrome-error-handler.js';
import { EventEmitter } from 'events';
import { REACT_HOOK_MONITOR_SCRIPT } from './utils/react-hook-monitor.js';
import { Buffer } from 'buffer';
import { REDUX_STATE_MONITOR_SCRIPT } from './utils/redux-state-monitor.js';
import { EVENT_LOOP_MONITOR_SCRIPT } from './utils/event-loop-monitor.js';
import { USER_INTERACTION_MONITOR_SCRIPT } from './utils/user-interaction-monitor.js';
import { DOM_MUTATION_MONITOR_SCRIPT } from './utils/dom-mutation-monitor.js';
import { DataSanitizer, SanitizationRule } from './utils/data-sanitizer.js';

// Type declarations for Chrome DevTools Protocol
type NetworkRequest = {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  timestamp: number;
  postData?: string;
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

type JwtTokenDetails = {
  token: string;
  decodedPayload?: any;
  header?: any;
  signatureVerified?: boolean;
  expiresAt?: string;
  issuedAt?: string;
};

type GraphQLEvent = {
  requestId: string;
  url: string;
  requestBody?: any;
  responseBody?: any;
  graphqlQuery?: string;
  graphqlVariables?: any;
  graphqlOperationName?: string;
  errors?: any[];
  timestamp: number;
  type: 'request' | 'response';
};

type CorrelatedNetworkEntry = {
  request: NetworkRequest;
  response: NetworkResponse;
};

type WebSocketFrame = {
  opcode: number;
  mask: boolean;
  payloadData: string;
};

type WebSocketEvent = {
  requestId: string;
  timestamp: number;
  url: string;
  type: 'webSocketCreated' | 'webSocketClosed' | 'webSocketFrameReceived' | 'webSocketFrameSent';
  frame?: WebSocketFrame;
  message?: string; // For created/closed events
};

type ReduxEvent = {
  type: 'action' | 'stateChange';
  action?: any;
  prevState?: any;
  newState?: any;
  timestamp: number;
};

type PerformanceMetricEvent = {
  name: string;
  value: number;
  timestamp: number;
  title?: string;
};

type EventLoopMetricEvent = {
  duration: number;
  blockingDuration: number;
  startTime: number;
  scripts: Array<{ invoker?: string; sourceURL?: string; sourceFunctionName?: string; duration: number }>;
  entry: any; // The raw PerformanceEntry object
};

type UserInteractionEvent = {
  type: string;
  target: string;
  timestamp: number;
  details: any;
};

type DomMutationEvent = {
  type: string;
  target: string;
  details: any;
};

type CssChangeEvent = {
  type: 'stylesheetAdded' | 'stylesheetRemoved' | 'stylesheetChanged';
  styleSheetId: string;
  header?: any; // For added events
  change?: any; // For changed events
  timestamp: number;
};

type CredentialDetails = {
  type: 'apiKey' | 'basicAuth' | 'jwt' | 'unknown';
  value: string;
  source: 'header' | 'body';
  key?: string; // e.g., 'Authorization', 'x-api-key'
};

// Add type declaration for CDP client with event handling
interface CDPClient extends EventEmitter {
  Network: any;
  Console: any;
  Log: any;
  Runtime: any;
  Performance: any;
  CSS: any; // Added for CSS monitoring
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
    sources?: Array<'network' | 'console' | 'devtools' | 'websocket' | 'jwt' | 'graphql' | 'redux' | 'performance' | 'eventloop' | 'userinteraction' | 'dommutation' | 'csschange'>;
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
  enableReactHookMonitoring?: boolean;
  includeWebSockets?: boolean;
  includeJwtMonitoring?: boolean;
  includeGraphqlMonitoring?: boolean;
  includeReduxMonitoring?: boolean;
  includePerformanceMonitoring?: boolean;
  includeEventLoopMonitoring?: boolean;
  includeUserInteractionRecording?: boolean;
  includeDomMutationMonitoring?: boolean;
  includeCssChangeMonitoring?: boolean;
  headless?: boolean; // Added for headless mode
  sanitizationRules?: SanitizationRule[];
}

interface CollectedLogEntry {
  type: 'network' | 'console' | 'log' | 'websocket' | 'jwt' | 'graphql' | 'redux' | 'performance' | 'eventloop' | 'userinteraction' | 'dommutation' | 'csschange' | 'credential';
  timestamp: string;
  details: NetworkRequest | NetworkResponse | ConsoleMessage | DevToolsLogEntry | CorrelatedNetworkEntry | WebSocketEvent | JwtTokenDetails | GraphQLEvent | ReduxEvent | PerformanceMetricEvent | EventLoopMetricEvent | UserInteractionEvent | DomMutationEvent | CssChangeEvent | CredentialDetails;
}

export class ChromeExtractor {
  private static readonly DEFAULT_PORT = 9222;
  private static readonly DEFAULT_HOST = 'localhost';
  private static readonly DEFAULT_MAX_ENTRIES = 1000;

  private options: Required<ChromeExtractorOptions>;
  private chromeErrorHandler: ChromeErrorHandler;
  private dataSanitizer: DataSanitizer;
  private pendingNetworkRequests: Map<string, NetworkRequest> = new Map(); // Added for correlation
  private pendingGraphqlRequests: Map<string, NetworkRequest> = new Map(); // Added for GraphQL correlation

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
        sources: options.filters?.sources || ['network', 'console', 'devtools', 'websocket', 'jwt', 'graphql', 'redux', 'performance', 'eventloop', 'userinteraction', 'dommutation', 'csschange'],
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
      },
      enableReactHookMonitoring: options.enableReactHookMonitoring ?? false,
      includeWebSockets: options.includeWebSockets ?? false,
      includeJwtMonitoring: options.includeJwtMonitoring ?? false,
      includeGraphqlMonitoring: options.includeGraphqlMonitoring ?? false,
      includeReduxMonitoring: options.includeReduxMonitoring ?? false,
      includePerformanceMonitoring: options.includePerformanceMonitoring ?? false,
      includeEventLoopMonitoring: options.includeEventLoopMonitoring ?? false,
      includeUserInteractionRecording: options.includeUserInteractionRecording ?? false,
      includeDomMutationMonitoring: options.includeDomMutationMonitoring ?? false,
      includeCssChangeMonitoring: options.includeCssChangeMonitoring ?? false,
      headless: options.headless ?? false,
      sanitizationRules: options.sanitizationRules ?? []
    };

    this.chromeErrorHandler = new ChromeErrorHandler(this.options.retryConfig);
    this.dataSanitizer = new DataSanitizer(this.options.sanitizationRules);
  }

  public async getDebuggablePageTargets(): Promise<Array<{ id: string; url: string; title: string; webSocketDebuggerUrl: string; }>> {
    return this.chromeErrorHandler.executeWithRetry(async () => {
      try {
        const versionResponse = await fetch(`http://${this.options.host}:${this.options.port}/json/version`);
        if (!versionResponse.ok) {
          throw new Error('Chrome is not running with remote debugging enabled. Start Chrome with --remote-debugging-port=9222');
        }

        const response = await fetch(`http://${this.options.host}:${this.options.port}/json/list`);
        const targets = await response.json() as Array<{
          id: string;
          type: string;
          url: string;
          webSocketDebuggerUrl?: string;
          title: string;
        }>;

        logger.info('Available targets', { targets: targets.map(t => ({ type: t.type, url: t.url, title: t.title })) });

        const pageTargets = targets.filter(t => 
          t.type === 'page' && t.webSocketDebuggerUrl
        ).map(t => ({
          id: t.id,
          url: t.url,
          title: t.title,
          webSocketDebuggerUrl: t.webSocketDebuggerUrl as string,
        }));
        
        if (pageTargets.length === 0) {
          logger.warn('No debuggable page targets found. Please open a new tab in Chrome.');
          throw new Error('No debuggable Chrome tab found. Please open a new tab in Chrome running with --remote-debugging-port=9222');
        }

        return pageTargets;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        logger.error('Failed to get Chrome debugger targets', { error });
        throw new Error(`Failed to connect to Chrome debugger: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 'Getting Chrome debugger targets');
  }

  // This method is now private and should be called with a specific debugger URL
  private async connectToDebugger(debuggerUrl: string): Promise<CDPClient> {
    const cdpOptions: any = { target: debuggerUrl };
    if (this.options.headless) {
      cdpOptions.port = this.options.port;
      cdpOptions.host = this.options.host;
    }

    return this.chromeErrorHandler.executeWithRetry(
      async () => CDP(cdpOptions) as unknown as CDPClient,
      'Connecting to Chrome DevTools'
    );
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
    const source = log.type as 'network' | 'console' | 'devtools' | 'websocket' | 'jwt' | 'graphql' | 'redux' | 'performance' | 'eventloop' | 'userinteraction' | 'dommutation' | 'csschange';
    if (!filters.sources?.includes(source)) {
      return false;
    }

    // Check domains for network requests (and now correlated entries) and WebSockets
    if ((log.type === 'network' || log.type === 'graphql') && filters.domains && filters.domains.length > 0) {
      let url: string;
      if (log.type === 'network') {
        const details = log.details as NetworkRequest | NetworkResponse | CorrelatedNetworkEntry;
        if ('url' in details && typeof details.url === 'string') { // NetworkRequest or NetworkResponse
          url = details.url;
        } else if ('request' in details && typeof details.request.url === 'string') { // CorrelatedNetworkEntry
          url = details.request.url;
        } else {
          logger.warn('Invalid network entry for domain filtering: missing URL', { log });
          return false;
        }
      } else { // log.type === 'graphql'
        const details = log.details as GraphQLEvent;
        url = details.url;
      }
      
      if (!filters.domains.some(domain => 
        new RegExp(domain.replace(/\*/g, '.*')).test(url)
      )) {
        return false;
      }
    } else if (log.type === 'websocket' && filters.domains && filters.domains.length > 0) {
      const details = log.details as WebSocketEvent;
      if (!details || typeof details.url !== 'string') {
        logger.warn('Invalid websocket entry for domain filtering: missing URL', { log });
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
            const details = log.details as NetworkRequest | NetworkResponse | CorrelatedNetworkEntry;
            if ('request' in details && 'response' in details) {
              entry += `[CORRELATED] ${details.request.method} ${details.request.url} - Status: ${details.response.status}`;
            } else if ('url' in details) { // NetworkRequest
              entry += `${(details as NetworkRequest).method} ${(details as NetworkRequest).url}`;
            } else { // NetworkResponse
              entry += `Response Status: ${(details as NetworkResponse).status}`;
            }
          } else if (log.type === 'websocket') {
            const wsEvent = log.details as WebSocketEvent;
            if (wsEvent.type === 'webSocketCreated') {
              entry += `WebSocket Created: ${wsEvent.url}`;
            } else if (wsEvent.type === 'webSocketClosed') {
              entry += `WebSocket Closed: ${wsEvent.url}`;
            } else if (wsEvent.type === 'webSocketFrameSent') {
              entry += `WebSocket Frame Sent: ${wsEvent.frame?.payloadData}`;
            } else if (wsEvent.type === 'webSocketFrameReceived') {
              entry += `WebSocket Frame Received: ${wsEvent.frame?.payloadData}`;
            }
          } else if (log.type === 'jwt') {
            const jwtDetails = log.details as JwtTokenDetails;
            entry += `JWT Token: ${jwtDetails.token} (Expires: ${jwtDetails.expiresAt || 'N/A'})`;
          } else if (log.type === 'graphql') {
            const graphqlEvent = log.details as GraphQLEvent;
            entry += `GraphQL ${graphqlEvent.type === 'request' ? 'Request' : 'Response'}: ${graphqlEvent.url}`;
            if (graphqlEvent.graphqlQuery) {
              entry += `\nQuery: ${graphqlEvent.graphqlQuery}`;
            }
            if (graphqlEvent.graphqlOperationName) {
              entry += ` (Operation: ${graphqlEvent.graphqlOperationName})`;
            }
            if (graphqlEvent.errors && graphqlEvent.errors.length > 0) {
              entry += `\nErrors: ${JSON.stringify(graphqlEvent.errors)}`;
            }
          } else if (log.type === 'redux') {
            const reduxEvent = log.details as ReduxEvent;
            if (reduxEvent.type === 'action') {
              entry += `Redux Action: ${reduxEvent.action?.type} (State: ${JSON.stringify(reduxEvent.newState)})`;
            } else if (reduxEvent.type === 'stateChange') {
              entry += `Redux State Change: ${JSON.stringify(reduxEvent.newState)}`;
            }
          } else if (log.type === 'performance') {
            const perfMetric = log.details as PerformanceMetricEvent;
            entry += `Performance Metric: ${perfMetric.name} = ${perfMetric.value} (Title: ${perfMetric.title || 'N/A'})`;
          } else if (log.type === 'eventloop') {
            const eventLoopMetric = log.details as EventLoopMetricEvent;
            entry += `Event Loop (Long Frame): Duration=${eventLoopMetric.duration}ms, Blocking=${eventLoopMetric.blockingDuration}ms`;
            if (eventLoopMetric.scripts && eventLoopMetric.scripts.length > 0) {
              entry += `\nScripts: ${eventLoopMetric.scripts.map(s => s.sourceFunctionName || s.sourceURL || 'Unknown').join(', ')}`;
            }
          } else if (log.type === 'userinteraction') {
            const interactionEvent = log.details as UserInteractionEvent;
            entry += `User Interaction: ${interactionEvent.type} on ${interactionEvent.target}`;
            if (Object.keys(interactionEvent.details).length > 0) {
              entry += ` (Details: ${JSON.stringify(interactionEvent.details)})`;
            }
          } else if (log.type === 'dommutation') {
            const mutationEvent = log.details as DomMutationEvent;
            entry += `DOM Mutation: ${mutationEvent.type} on ${mutationEvent.target}`;
            if (Object.keys(mutationEvent.details).length > 0) {
              entry += ` (Details: ${JSON.stringify(mutationEvent.details)})`;
            }
          } else if (log.type === 'csschange') {
            const cssChangeEvent = log.details as CssChangeEvent;
            entry += `CSS Change: ${cssChangeEvent.type} on stylesheet ${cssChangeEvent.styleSheetId}`;
          } else if (log.type === 'credential') {
            const credentialDetails = log.details as CredentialDetails;
            entry += `Credential Detected: Type=${credentialDetails.type}, Source=${credentialDetails.source}, Key=${credentialDetails.key || 'N/A'}`;
          } else {
            const msg = log.details as ConsoleMessage | DevToolsLogEntry;
            entry += msg.text;
            if (this.options.format.includeStackTrace && 'stack' in msg && msg.stack) {
              entry += `\n${msg.stack}`;
            }
          }
          return entry;
        }).join('\n');

        const sanitizedContent = this.dataSanitizer.sanitize(content);

        return {
          filePath: `chrome-devtools://${groupKey}`,
          content: sanitizedContent,
          size: sanitizedContent.length,
          lastModified: new Date(groupLogs[0].timestamp)
        };
      });
    }

    return formattedLogs.map(log => {
      let content = '';
      if (log.type === 'network') {
        const details = log.details as NetworkRequest | NetworkResponse | CorrelatedNetworkEntry;
        if ('request' in details && 'response' in details) {
          content = JSON.stringify({
            request: details.request,
            response: details.response
          }, null, 2);
        } else {
          content = JSON.stringify(details, null, 2);
        }
      } else if (log.type === 'websocket') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'jwt') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'graphql') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'redux') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'performance') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'eventloop') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'userinteraction') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'dommutation') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'csschange') {
        content = JSON.stringify(log.details, null, 2);
      } else if (log.type === 'credential') {
        content = JSON.stringify(log.details, null, 2);
      } else {
        content = JSON.stringify(log.details, null, 2);
      }

      const sanitizedContent = this.dataSanitizer.sanitize(content);

      return {
        filePath: `chrome-devtools://${log.type}/${log.timestamp}`,
        content: sanitizedContent,
        size: sanitizedContent.length,
        lastModified: new Date(log.timestamp)
      };
    });
  }

  /**
   * Helper to decode and parse JWT tokens.
   * This is a basic decoder and does not verify the signature.
   */
  private parseJwt(token: string): JwtTokenDetails {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = JSON.parse(Buffer.from(base64, 'base64').toString());
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      
      let expiresAt: string | undefined;
      if (decodedPayload.exp) {
        expiresAt = new Date(decodedPayload.exp * 1000).toISOString();
      }

      let issuedAt: string | undefined;
      if (decodedPayload.iat) {
        issuedAt = new Date(decodedPayload.iat * 1000).toISOString();
      }

      return {
        token,
        decodedPayload,
        header,
        signatureVerified: false, // Cannot verify signature without key
        expiresAt,
        issuedAt
      };
    } catch (error) {
      logger.warn('Failed to parse JWT token', { token, error });
      return { token, signatureVerified: false };
    }
  }

  async extract(targetId?: string): Promise<ExtractedLog[]> {
    let client: CDPClient | undefined;
    let networkEnabled = false;
    let consoleEnabled = false;
    let runtimeEnabled = false;
    let websocketEnabled = false;
    let jwtMonitoringEnabled = false;
    let graphqlMonitoringEnabled = false;
    let reduxMonitoringEnabled = false;
    let performanceMonitoringEnabled = false;
    let eventLoopMonitoringEnabled = false;
    let userInteractionRecordingEnabled = false;
    let domMutationMonitoringEnabled = false;
    let cssChangeMonitoringEnabled = false;
    try {
      logger.info('Connecting to Chrome DevTools...', { options: this.options });
      
      let debuggerUrl: string;
      if (this.options.headless) {
        // In headless mode, we might need to launch Chrome ourselves.
        // For simplicity, we'll assume a running instance for now, but this is where
        // you would add logic to launch a headless chrome instance.
        logger.info('Headless mode enabled, but auto-launch not implemented. Assuming running instance.');
      }
      
      if (targetId) {
        const targets = await this.getDebuggablePageTargets();
        const selectedTarget = targets.find(t => t.id === targetId);
        if (!selectedTarget) {
          throw new Error(`Chrome target with ID '${targetId}' not found.`);
        }
        debuggerUrl = selectedTarget.webSocketDebuggerUrl;
      } else {
        // Fallback for direct CDP connection if no targetId is provided (e.g. for internal testing/direct usage)
        const targets = await this.getDebuggablePageTargets();
        if (targets.length === 0) {
          throw new Error('No debuggable Chrome tabs found.');
        }
        debuggerUrl = targets[0].webSocketDebuggerUrl;
        logger.warn('No specific target ID provided. Automatically selecting the first available page target.', { target: targets[0].url });
      }

      logger.info('Got debugger URL', { debuggerUrl });
      
      client = await this.connectToDebugger(debuggerUrl);
      logger.info('Connected to Chrome');

      const { Network, Console, Log, Runtime, CSS, Performance } = client;
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
            
            await new Promise(resolve => setTimeout(resolve, this.options.reconnect?.delayBetweenAttemptsMs || 2000));
            
            // Get a fresh debugger URL for the *same* target if possible
            let newDebuggerUrl: string | undefined;
            if (targetId) {
              const newTargets = await this.getDebuggablePageTargets();
              const reselectedTarget = newTargets.find(t => t.id === targetId);
              if (reselectedTarget) {
                newDebuggerUrl = reselectedTarget.webSocketDebuggerUrl;
              }
            } else {
              // If no targetId was initially provided, try to find the first page again
              const newTargets = await this.getDebuggablePageTargets();
              if (newTargets.length > 0) {
                newDebuggerUrl = newTargets[0].webSocketDebuggerUrl;
              }
            }

            if (!newDebuggerUrl) {
              logger.error('Could not find a valid debugger URL for reconnection.');
              throw new Error('Could not find a valid debugger URL for reconnection.');
            }
            
            await client!.close();
            
            client = await this.connectToDebugger(newDebuggerUrl);
            logger.info('Reconnected to Chrome DevTools');
            
            // Re-enable required domains
            if (this.options.includeNetwork) {
              await client.Network.enable();
            }
            if (this.options.includeConsole) {
              await client.Console.enable();
              await client.Log.enable();
            }
            if (this.options.includeWebSockets) {
              await client.Network.enable(); // Network domain is needed for WebSockets
            }
            if (this.options.includeJwtMonitoring) {
              await client.Network.enable(); // Network domain is needed for JWT monitoring
            }
            if (this.options.includeGraphqlMonitoring) {
              await client.Network.enable(); // Network domain is needed for GraphQL monitoring
            }
            if (this.options.includeReduxMonitoring) {
              await client.Runtime.enable(); // Runtime domain is needed for Redux monitoring
            }
            if (this.options.includePerformanceMonitoring) {
              await client.Performance.enable(); // Performance domain is needed for performance monitoring
            }
            if (this.options.includeEventLoopMonitoring) {
              await client.Runtime.enable(); // Runtime domain is needed for Event Loop monitoring
            }
            if (this.options.includeUserInteractionRecording) {
              await client.Runtime.enable();
            }
            if (this.options.includeDomMutationMonitoring) {
              await client.Runtime.enable();
            }
            if (this.options.includeCssChangeMonitoring) {
              await client.CSS.enable();
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

      if (this.options.enableReactHookMonitoring) {
        try {
          await Runtime.enable();
          await Runtime.evaluate({ expression: REACT_HOOK_MONITOR_SCRIPT, silent: true });
          runtimeEnabled = true;
          logger.info('React hooks monitoring script injected.');
        } catch (error) {
          logger.error('Failed to inject React hooks monitoring script', { error });
          this.options.enableReactHookMonitoring = false;
        }
      }

      if (this.options.includeNetwork) {
        try {
          await Network.enable();
          networkEnabled = true;
          logger.info('Network tracking enabled');
        } catch (error) {
          logger.error('Failed to enable Network domain', { error });
          // Decide on recovery action: e.g., continue without network logs, or re-throw if critical
          // For now, we will log and continue without network logs
          this.options.includeNetwork = false; // Disable network tracking for this session
        }
      }
      if (this.options.includeConsole) {
        try {
          await Console.enable();
          await Log.enable();
          consoleEnabled = true;
          logger.info('Console tracking enabled');
        } catch (error) {
          logger.error('Failed to enable Console/Log domain', { error });
          // Decide on recovery action: e.g., continue without console logs, or re-throw if critical
          // For now, we will log and continue without console logs
          this.options.includeConsole = false; // Disable console tracking for this session
        }
      }
      if (this.options.includeWebSockets) {
        try {
          await Network.enable();
          websocketEnabled = true;
          logger.info('WebSocket tracking enabled');
        } catch (error) {
          logger.error('Failed to enable Network domain for WebSocket tracking', { error });
          this.options.includeWebSockets = false;
        }
      }
      if (this.options.includeJwtMonitoring) {
        try {
          await Network.enable();
          jwtMonitoringEnabled = true;
          logger.info('JWT token monitoring enabled');
        } catch (error) {
          logger.error('Failed to enable Network domain for JWT monitoring', { error });
          this.options.includeJwtMonitoring = false;
        }
      }
      if (this.options.includeGraphqlMonitoring) {
        try {
          await Network.enable();
          graphqlMonitoringEnabled = true;
          logger.info('GraphQL monitoring enabled');
        } catch (error) {
          logger.error('Failed to enable Network domain for GraphQL monitoring', { error });
          this.options.includeGraphqlMonitoring = false;
        }
      }
      if (this.options.includeReduxMonitoring) {
        try {
          await Runtime.enable();
          await Runtime.evaluate({ expression: REDUX_STATE_MONITOR_SCRIPT, silent: true });
          reduxMonitoringEnabled = true;
          logger.info('Redux state monitoring script injected.');
        } catch (error) {
          logger.error('Failed to inject Redux state monitoring script', { error });
          this.options.includeReduxMonitoring = false;
        }
      }
      if (this.options.includePerformanceMonitoring) {
        try {
          await Performance.enable();
          performanceMonitoringEnabled = true;
          logger.info('Performance monitoring enabled');
        } catch (error) {
          logger.error('Failed to enable Performance domain', { error });
          this.options.includePerformanceMonitoring = false;
        }
      }
      if (this.options.includeEventLoopMonitoring) {
        try {
          await Runtime.enable();
          await Runtime.evaluate({ expression: EVENT_LOOP_MONITOR_SCRIPT, silent: true });
          eventLoopMonitoringEnabled = true;
          logger.info('Event loop monitoring script injected.');
        } catch (error) {
          logger.error('Failed to inject Event loop monitoring script', { error });
          this.options.includeEventLoopMonitoring = false;
        }
      }
      if (this.options.includeUserInteractionRecording) {
        try {
          await Runtime.enable();
          await Runtime.evaluate({ expression: USER_INTERACTION_MONITOR_SCRIPT, silent: true });
          userInteractionRecordingEnabled = true;
          logger.info('User interaction recording script injected.');
        } catch (error) {
          logger.error('Failed to inject User interaction recording script', { error });
          this.options.includeUserInteractionRecording = false;
        }
      }
      if (this.options.includeDomMutationMonitoring) {
        try {
          await Runtime.enable();
          await Runtime.evaluate({ expression: DOM_MUTATION_MONITOR_SCRIPT, silent: true });
          domMutationMonitoringEnabled = true;
          logger.info('DOM mutation monitoring script injected.');
        } catch (error) {
          logger.error('Failed to inject DOM mutation monitoring script', { error });
          this.options.includeDomMutationMonitoring = false;
        }
      }
      if (this.options.includeCssChangeMonitoring) {
        try {
          await CSS.enable();
          cssChangeMonitoringEnabled = true;
          logger.info('CSS change monitoring enabled.');
        } catch (error) {
          logger.error('Failed to enable CSS change monitoring', { error });
          this.options.includeCssChangeMonitoring = false;
        }
      }

      // Set up event listeners
      if (this.options.includeNetwork || this.options.includeGraphqlMonitoring) {
        Network.requestWillBeSent((params: any) => {
          logger.debug('Network request detected', { url: params.request.url, details: params.request });
          // Store the request for later correlation
          this.pendingNetworkRequests.set(params.requestId, params.request);

          // Check for JWT in request headers
          if (this.options.includeJwtMonitoring && params.request.headers) {
            for (const headerName in params.request.headers) {
              if (headerName.toLowerCase() === 'authorization') {
                const authHeader = params.request.headers[headerName];
                if (authHeader.startsWith('Bearer ')) {
                  const token = authHeader.substring(7);
                  const jwtDetails = this.parseJwt(token);
                  logs.push({
                    type: 'jwt',
                    timestamp: toISOString(params.timestamp),
                    details: jwtDetails
                  });
                  logger.info('JWT token found in request', { token: jwtDetails.token });
                } else if (authHeader.startsWith('Basic ')) {
                  logs.push({
                    type: 'credential',
                    timestamp: toISOString(params.timestamp),
                    details: { type: 'basicAuth', value: authHeader, source: 'header', key: headerName }
                  });
                  logger.info('Basic Auth credentials found in request header');
                }
              } else if (headerName.toLowerCase().includes('key') || headerName.toLowerCase().includes('token')) {
                logs.push({
                  type: 'credential',
                  timestamp: toISOString(params.timestamp),
                  details: { type: 'apiKey', value: params.request.headers[headerName], source: 'header', key: headerName }
                });
                logger.info('Potential API key/token found in request header', { key: headerName });
              }
            }
          }

          // Check for GraphQL in request
          if (this.options.includeGraphqlMonitoring && params.method === 'POST' && params.request.postData) {
            try {
              const postData = JSON.parse(params.request.postData);
              if (postData.query) {
                // This is likely a GraphQL request
                const graphqlEvent: GraphQLEvent = {
                  requestId: params.requestId,
                  url: params.request.url,
                  requestBody: postData,
                  graphqlQuery: postData.query,
                  graphqlVariables: postData.variables,
                  graphqlOperationName: postData.operationName,
                  timestamp: params.timestamp,
                  type: 'request'
                };
                logs.push({
                  type: 'graphql',
                  timestamp: toISOString(params.timestamp),
                  details: graphqlEvent
                });
                this.pendingGraphqlRequests.set(params.requestId, params.request); // Store original request for response correlation
                logger.info('GraphQL request detected', { url: params.request.url, query: postData.query });
              }
            } catch (e) {
              // Not a JSON postData, or not a GraphQL query
            }
          }
        });

        Network.responseReceived((params: any) => {
          logger.debug('Network response detected', { status: params.response.status, details: params.response });
          const request = this.pendingNetworkRequests.get(params.requestId);
          if (request) {
            // Correlate request and response
            const correlatedEntry: CorrelatedNetworkEntry = {
              request: request,
              response: params.response,
            };
            logs.push({
              type: 'network',
              timestamp: toISOString(params.timestamp),
              details: correlatedEntry
            });
            // Remove from pending requests
            this.pendingNetworkRequests.delete(params.requestId);
          } else {
            // If no matching request, log the response as is (e.g., from cache or already processed)
            logger.warn('Received network response for unknown request', { requestId: params.requestId });
            logs.push({
              type: 'network',
              timestamp: toISOString(params.timestamp),
              details: params.response // Still push the raw response if unmatched
            });
          }

          // Check for JWT in response headers (e.g., for new tokens or refresh tokens)
          if (this.options.includeJwtMonitoring && params.response.headers) {
            for (const headerName in params.response.headers) {
              // Common headers for JWTs in responses might be 'Authorization', 'Set-Cookie' (if stored in cookie)
              // For simplicity, we'll check 'Authorization' here, though 'Set-Cookie' would require more complex parsing.
              if (headerName.toLowerCase() === 'authorization') {
                const authHeader = params.response.headers[headerName];
                if (authHeader.startsWith('Bearer ')) {
                  const token = authHeader.substring(7);
                  const jwtDetails = this.parseJwt(token);
                  logs.push({
                    type: 'jwt',
                    timestamp: toISOString(params.timestamp),
                    details: jwtDetails
                  });
                  logger.info('JWT token found in response', { token: jwtDetails.token });
                } else if (authHeader.startsWith('Basic ')) {
                  logs.push({
                    type: 'credential',
                    timestamp: toISOString(params.timestamp),
                    details: { type: 'basicAuth', value: authHeader, source: 'header', key: headerName }
                  });
                  logger.info('Basic Auth credentials found in response header');
                }
              } else if (headerName.toLowerCase().includes('key') || headerName.toLowerCase().includes('token')) {
                logs.push({
                  type: 'credential',
                  timestamp: toISOString(params.timestamp),
                  details: { type: 'apiKey', value: params.response.headers[headerName], source: 'header', key: headerName }
                });
                logger.info('Potential API key/token found in response header', { key: headerName });
              }
            }
          }

          // Check for GraphQL response
          if (this.options.includeGraphqlMonitoring && this.pendingGraphqlRequests.has(params.requestId)) {
            const originalRequest = this.pendingGraphqlRequests.get(params.requestId);
            if (originalRequest) {
              // To get the response body, we need to call Network.getResponseBody
              // This requires an additional CDP call and can be asynchronous.
              // For simplicity in this step, we'll log what we have, and enhance later if needed.
              // In a real scenario, you'd await Network.getResponseBody here.
              logger.debug('Attempting to get GraphQL response body for', { requestId: params.requestId });

              const graphqlEvent: GraphQLEvent = {
                requestId: params.requestId,
                url: originalRequest.url,
                requestBody: originalRequest.postData ? JSON.parse(originalRequest.postData) : undefined,
                responseBody: params.response, // Use params.response for response body
                graphqlQuery: originalRequest.postData ? JSON.parse(originalRequest.postData).query : undefined,
                graphqlVariables: originalRequest.postData ? JSON.parse(originalRequest.postData).variables : undefined,
                graphqlOperationName: originalRequest.postData ? JSON.parse(originalRequest.postData).operationName : undefined,
                errors: params.response.status >= 400 ? [{ message: `HTTP Error: ${params.response.status}` }] : undefined, // Use params.response.status
                timestamp: params.timestamp,
                type: 'response'
              };
              logs.push({
                type: 'graphql',
                timestamp: toISOString(params.timestamp),
                details: graphqlEvent
              });
              this.pendingGraphqlRequests.delete(params.requestId);
              logger.info('GraphQL response detected', { url: originalRequest.url, status: params.response.status });
            }
          }
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
      
      if (this.options.includeWebSockets) {
        Network.webSocketCreated((params: any) => {
          logger.debug('WebSocket created', { url: params.url, requestId: params.requestId });
          logs.push({
            type: 'websocket',
            timestamp: toISOString(params.timestamp),
            details: { type: 'webSocketCreated', requestId: params.requestId, url: params.url, message: 'WebSocket created', timestamp: params.timestamp }
          });
        });

        Network.webSocketClosed((params: any) => {
          logger.debug('WebSocket closed', { requestId: params.requestId });
          logs.push({
            type: 'websocket',
            timestamp: toISOString(params.timestamp),
            details: { type: 'webSocketClosed', requestId: params.requestId, url: params.url, message: 'WebSocket closed', timestamp: params.timestamp }
          });
        });

        Network.webSocketFrameSent((params: any) => {
          logger.debug('WebSocket frame sent', { requestId: params.requestId, payloadData: params.response.payloadData });
          logs.push({
            type: 'websocket',
            timestamp: toISOString(params.timestamp),
            details: { type: 'webSocketFrameSent', requestId: params.requestId, url: params.url, frame: params.response, timestamp: params.timestamp }
          });
        });

        Network.webSocketFrameReceived((params: any) => {
          logger.debug('WebSocket frame received', { requestId: params.requestId, payloadData: params.response.payloadData });
          logs.push({
            type: 'websocket',
            timestamp: toISOString(params.timestamp),
            details: { type: 'webSocketFrameReceived', requestId: params.requestId, url: params.url, frame: params.response, timestamp: params.timestamp }
          });
        });
      }

      if (this.options.includePerformanceMonitoring) {
        client.Performance.metrics((params: any) => {
          // Filter for metrics that might indicate React rendering activity
          // React uses User Timing API (performance.mark/measure) in dev mode.
          // These appear as metrics with specific names.
          for (const metric of params.metrics) {
            // Common metrics that could be related to rendering or scripting performance
            if (
              metric.name === 'ScriptDuration' || 
              metric.name === 'LayoutDuration' ||
              metric.name === 'RecalculateStyleDuration' ||
              metric.name === 'TaskDuration' ||
              metric.name === 'V8.GC.BackgroundIdleNotification' || // Garbage collection
              metric.name === 'V8.GC.AtomicPause' || // Garbage collection
              metric.name.startsWith('TaskQueueManager::') || // Tasks related to main thread
              metric.name.startsWith('Commit') || // Commit events in rendering
              metric.name.startsWith('Update') || // Update events in rendering
              metric.name.startsWith('Layout') || // Layout events
              metric.name.startsWith('RecalculateStyles') || // Style recalculations
              // Memory metrics
              metric.name === 'JSHeapUsedSize' || 
              metric.name === 'JSHeapTotalSize' ||
              metric.name === 'Nodes' ||
              metric.name === 'Documents' ||
              metric.name === 'Listeners' ||
              metric.name === 'V8.Memory.AllocatedBytes' ||
              metric.name === 'V8.Memory.TotalHeapSize'
            ) {
              logs.push({
                type: 'performance',
                timestamp: toISOString(params.title ? params.timestamp : Date.now() / 1000), // Use event timestamp or current time
                details: {
                  name: metric.name,
                  value: metric.value,
                  timestamp: params.timestamp,
                  title: params.title,
                }
              });
              logger.debug('Performance Metric detected', { name: metric.name, value: metric.value, title: params.title });
            }

            // Additionally, look for User Timing API marks and measures if React uses them
            // React DevTools often reports these as 'Mark:<name>' or 'Measure:<name>'
            if (metric.name.startsWith('Mark:') || metric.name.startsWith('Measure:')) {
                logs.push({
                  type: 'performance',
                  timestamp: toISOString(params.title ? params.timestamp : Date.now() / 1000),
                  details: {
                    name: metric.name,
                    value: metric.value,
                    timestamp: params.timestamp,
                    title: params.title,
                  }
                });
                logger.debug('User Timing Performance Metric detected', { name: metric.name, value: metric.value, title: params.title });
            }
          }
        });
      }

      if (this.options.includeCssChangeMonitoring) {
        client.CSS.stylesheetAdded((params: any) => {
          logger.debug('Stylesheet added', { header: params.header });
          logs.push({
            type: 'csschange',
            timestamp: toISOString(Date.now() / 1000), // CDP event doesn't have a timestamp
            details: { type: 'stylesheetAdded', styleSheetId: params.header.styleSheetId, header: params.header, timestamp: Date.now() }
          });
        });

        client.CSS.stylesheetRemoved((params: any) => {
          logger.debug('Stylesheet removed', { styleSheetId: params.styleSheetId });
          logs.push({
            type: 'csschange',
            timestamp: toISOString(Date.now() / 1000),
            details: { type: 'stylesheetRemoved', styleSheetId: params.styleSheetId, timestamp: Date.now() }
          });
        });

        client.CSS.stylesheetChanged((params: any) => {
          logger.debug('Stylesheet changed', { styleSheetId: params.styleSheetId });
          logs.push({
            type: 'csschange',
            timestamp: toISOString(Date.now() / 1000),
            details: { type: 'stylesheetChanged', styleSheetId: params.styleSheetId, change: params, timestamp: Date.now() }
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

      // Clean up (handled in finally)
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
    } finally {
      // Always clean up the client if it was created
      if (client) {
        try {
          if (networkEnabled && client.Network?.disable) {
            await client.Network.disable();
          }
          if (consoleEnabled && client.Console?.disable) {
            await client.Console.disable();
          }
          if (consoleEnabled && client.Log?.disable) {
            await client.Log.disable();
          }
          if (runtimeEnabled && client.Runtime?.disable) {
            await client.Runtime.disable();
          }
          if (websocketEnabled && client.Network?.disable) { // Network domain might already be disabled if includeNetwork was false
            // Only disable if network was enabled purely for websockets
            if (!this.options.includeNetwork) {
              await client.Network.disable();
            }
          }
          if (jwtMonitoringEnabled && client.Network?.disable) {
            // Only disable if network was enabled purely for JWT monitoring
            if (!this.options.includeNetwork && !this.options.includeWebSockets) {
              await client.Network.disable();
            }
          }
          if (graphqlMonitoringEnabled && client.Network?.disable) {
            // Only disable if network was enabled purely for GraphQL monitoring
            if (!this.options.includeNetwork && !this.options.includeWebSockets && !this.options.includeJwtMonitoring) {
              await client.Network.disable();
            }
          }
          if (reduxMonitoringEnabled && client.Runtime?.disable) {
            // Only disable if runtime was enabled purely for Redux monitoring
            if (!this.options.enableReactHookMonitoring) {
              await client.Runtime.disable();
            }
          }
          if (performanceMonitoringEnabled && client.Performance?.disable) {
            await client.Performance.disable();
          }
          if (eventLoopMonitoringEnabled && client.Runtime?.disable) {
            // Only disable if runtime was enabled purely for event loop monitoring
            if (!this.options.enableReactHookMonitoring && !this.options.includeReduxMonitoring) {
              await client.Runtime.disable();
            }
          }
          if (userInteractionRecordingEnabled && client.Runtime?.disable) {
            // Only disable if runtime was enabled purely for user interaction recording
            if (!this.options.enableReactHookMonitoring && !this.options.includeReduxMonitoring && !this.options.includeEventLoopMonitoring) {
              await client.Runtime.disable();
            }
          }
          if (domMutationMonitoringEnabled && client.Runtime?.disable) {
            if (!this.options.enableReactHookMonitoring && !this.options.includeReduxMonitoring && !this.options.includeEventLoopMonitoring && !this.options.includeUserInteractionRecording) {
              await client.Runtime.disable();
            }
          }
          if (cssChangeMonitoringEnabled && client.CSS?.disable) {
            await client.CSS.disable();
          }
          // Clear any pending requests on cleanup
          this.pendingNetworkRequests.clear();
          this.pendingGraphqlRequests.clear();
          await client.close();
        } catch (cleanupError) {
          logger.warn('Error during Chrome DevTools cleanup', { cleanupError });
        }
      }
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