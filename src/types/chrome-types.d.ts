/**
 * Type definitions for Chrome DevTools Protocol related types
 */

export interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  timestamp: number;
}

export interface NetworkResponse {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  timestamp: number;
}

export interface ConsoleMessage {
  source: string;
  level: string;
  text: string;
  timestamp: number;
}

export interface DevToolsLogEntry {
  source: string;
  level: string;
  text: string;
  timestamp: number;
}

export interface ChromeDebuggerResponse {
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
} 