export interface PlatformError {
  code: string;
  message: string;
  platform: string;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
  recommendation?: string;
} 