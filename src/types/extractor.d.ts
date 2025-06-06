import { NetworkRequest, NetworkResponse, ConsoleMessage, DevToolsLogEntry } from './chrome-types.js';

export interface ExtractedLog {
  type: 'network' | 'console' | 'log';
  timestamp: string;
  details: NetworkRequest | NetworkResponse | ConsoleMessage | DevToolsLogEntry;
  source?: string;
  level?: string;
  stackTrace?: string[];
} 