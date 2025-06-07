import { NetworkRequest, NetworkResponse, ConsoleMessage, DevToolsLogEntry } from './chrome-types.js';

export interface ExtractedLog {
  type: 'network' | 'console' | 'log' | 'reacthook' | 'dommutation' | 'csschange' | 'redux' | 'eventloop' | 'userinteraction' | 'websocket' | 'jwt' | 'graphql' | 'performance' | 'credential';
  timestamp: string;
  content: string;
  details: NetworkRequest | NetworkResponse | ConsoleMessage | DevToolsLogEntry | CorrelatedNetworkEntry | WebSocketEvent | JwtTokenDetails | GraphQLEvent | ReduxEvent | PerformanceMetricEvent | EventLoopMetricEvent | UserInteractionEvent | DomMutationEvent | CssChangeEvent | CredentialDetails;
  source?: string;
  level?: string;
  stackTrace?: string[];
} 