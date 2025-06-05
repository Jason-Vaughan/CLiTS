# React Integration Example

This example demonstrates how to integrate [CLITS](../../README.md) (Chrome Log Inspector & Troubleshooting System) with a React application to capture and analyze debug logs during development and testing.

## Features

- Capture Chrome DevTools logs in a React app
- Error boundary integration for automatic log capture
- Customizable log filtering and analytics integration
- Example usage with Sentry and custom analytics

## Prerequisites

- **Node.js** >= 16
- **Google Chrome** (latest recommended)
- **CLITS** (installed globally or as a dependency)

## Setup

1. **Install dependencies:**
   ```bash
   npm install ai-debug-extractor
   ```

2. **Create a debug utility (`src/utils/debug.ts`):**
   ```typescript
   import { ChromeExtractor } from 'ai-debug-extractor';

   export class DebugManager {
     private static instance: DebugManager;
     private extractor: ChromeExtractor;
     
     private constructor() {
       this.extractor = new ChromeExtractor({
         filters: {
           logLevels: ['error', 'warning'],
           keywords: ['react', 'render', 'effect', 'state'],
           excludePatterns: [
             'DEPRECATED_ENDPOINT',
             '_TIPropertyValueIsValid'
           ]
         },
         format: {
           groupByLevel: true,
           includeTimestamp: true
         }
       });
     }

     public static getInstance(): DebugManager {
       if (!DebugManager.instance) {
         DebugManager.instance = new DebugManager();
       }
       return DebugManager.instance;
     }

     public async captureDebugData(): Promise<void> {
       try {
         const logs = await this.extractor.extract();
         console.log('Debug data captured:', logs);
         // You can send logs to your backend or analytics service
         await this.sendToAnalytics(logs);
       } catch (error) {
         console.error('Failed to capture debug data:', error);
       }
     }

     private async sendToAnalytics(logs: unknown): Promise<void> {
       // Implement your analytics logic here
     }
   }
   ```

3. **Use in your React components:**
   ```typescript
   import { useEffect } from 'react';
   import { DebugManager } from '../utils/debug';

   export function ErrorBoundary({ children }) {
     useEffect(() => {
       const debugManager = DebugManager.getInstance();
       
       const handleError = async (error: Error) => {
         await debugManager.captureDebugData();
       };

       window.addEventListener('error', handleError);
       return () => window.removeEventListener('error', handleError);
     }, []);

     return children;
   }
   ```

4. **Wrap your app:**
   ```typescript
   import { ErrorBoundary } from './components/ErrorBoundary';

   function App() {
     return (
       <ErrorBoundary>
         <YourApp />
       </ErrorBoundary>
     );
   }
   ```

## Usage

1. **Start Chrome with debugging enabled:**
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-debug
   ```

2. **Start your React app:**
   ```bash
   npm start
   ```

The ErrorBoundary will automatically capture debug logs when errors occur.

## Advanced Usage

### Custom Log Filtering

```typescript
const extractor = new ChromeExtractor({
  filters: {
    // Only capture React rendering and state management issues
    keywords: ['react', 'render', 'setState', 'useEffect'],
    // Exclude known noise
    excludePatterns: [
      'DEPRECATED_ENDPOINT',
      'task_policy_set',
      'TensorFlow'
    ],
    // Focus on specific domains
    domains: ['localhost', 'your-api.com']
  }
});
```

### Performance Monitoring

```typescript
const extractor = new ChromeExtractor({
  // Configure for high-frequency logging
  bufferSize: 10000,
  flushInterval: 1000,
  samplingRate: 0.1,
  
  filters: {
    keywords: ['performance', 'render', 'slow'],
    logLevels: ['warning', 'error']
  }
});

// Monitor performance issues
setInterval(async () => {
  const logs = await extractor.extract();
  if (logs.some(log => log.content.includes('slow'))) {
    alert('Performance issue detected!');
  }
}, 5000);
```

### Integration with Error Tracking

```typescript
import * as Sentry from '@sentry/react';

class DebugManager {
  // ... existing code ...

  private async sendToAnalytics(logs: unknown): Promise<void> {
    // Send to Sentry
    Sentry.withScope(scope => {
      scope.setExtra('debugLogs', logs);
      Sentry.captureMessage('Debug logs collected');
    });
    
    // Send to your analytics service
    await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ logs })
    });
  }
}
```

## Best Practices

1. **Error Handling**
   - Always wrap debug operations in try/catch
   - Implement proper cleanup in error boundaries
   - Use appropriate log levels for different scenarios
2. **Performance**
   - Use sampling for high-frequency events
   - Implement batching for log collection
   - Clean up resources when components unmount
3. **Security**
   - Never log sensitive information
   - Implement proper CSP headers
   - Sanitize logs before sending to analytics
4. **Testing**
   - Write tests for error scenarios
   - Verify log capture in different environments

---

For more details and advanced usage, see the [main CLITS documentation](../../README.md). 