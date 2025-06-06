import { ExtractedLog } from './extractor.js';
import { RetryConfig } from '../platform/chrome-error-handler.js';
import { NetworkRequest, NetworkResponse, ConsoleMessage, DevToolsLogEntry } from './chrome-types.js';

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
    domains?: string[];
    keywords?: string[];
    excludePatterns?: string[];
    advancedFilter?: string;
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

export declare class ChromeExtractor {
  private static readonly DEFAULT_PORT: number;
  private static readonly DEFAULT_HOST: string;
  private static readonly DEFAULT_MAX_ENTRIES: number;
  private options: ChromeExtractorOptions;
  private chromeErrorHandler: any;

  constructor(options?: ChromeExtractorOptions);

  private getDebuggerUrl(): Promise<string>;
  private shouldIncludeLog(entry: CollectedLogEntry): boolean;

  /**
   * Evaluates an advanced boolean filter expression against a log entry
   * Supports AND, OR, NOT, and parentheses for grouping
   * Example: "(React AND error) OR (network AND 404)"
   */
  private evaluateAdvancedFilter(entry: CollectedLogEntry, expression: string): boolean;

  /**
   * Parses and evaluates a boolean filter expression
   * This is a simple recursive descent parser for boolean expressions
   */
  private parseAdvancedFilterExpression(entry: CollectedLogEntry, expression: string): boolean;

  /**
   * Helper to find the position of a boolean operator outside of parentheses
   */
  private findOperatorPosition(expression: string, operator: string): number;

  private formatLogs(logs: CollectedLogEntry[]): ExtractedLog[];

  extract(): Promise<ExtractedLog[]>;

  /**
   * Test hook: injects a simulated event into the log collection.
   * @param type 'network' | 'console' | 'log'
   * @param payload The event payload (NetworkRequest, NetworkResponse, ConsoleMessage, DevToolsLogEntry)
   * @param logsOverride (optional) logs array to use (for test injection)
   */
  protected _injectTestEvent(
    type: 'network' | 'console' | 'log',
    payload: NetworkRequest | NetworkResponse | ConsoleMessage | DevToolsLogEntry,
    logsOverride?: CollectedLogEntry[]
  ): void;
} 