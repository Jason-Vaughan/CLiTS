# AI Debug Extractor

A powerful tool for extracting and analyzing debug logs from AI and web projects. Designed specifically for AI development workflows, it helps isolate and analyze issues in both browser-based AI applications and file-based logging systems.

## Features

- 🔍 **Smart Log Extraction**
  - Chrome DevTools Protocol (CDP) integration
  - File system log parsing
  - Real-time log monitoring
  - Multi-source log aggregation

- 🎯 **Intelligent Filtering**
  - Log level filtering (error, warning, info, debug)
  - Source-based filtering (network, console, devtools)
  - Domain pattern matching
  - Keyword and regex-based filtering
  - Exclusion patterns

- 📊 **Flexible Output**
  - Group by source or log level
  - Include timestamps and stack traces
  - JSON or text output
  - Customizable formatting

- 🛠 **Developer Friendly**
  - Use as CLI tool or npm package
  - TypeScript support
  - Extensive documentation
  - Easy integration with existing projects

## Quick Start

### 1. Installation

```bash
# Global CLI installation
npm install -g ai-debug-extractor

# Or as a project dependency
npm install ai-debug-extractor
```

### 2. Basic Usage

```bash
# Start Chrome with debugging enabled
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Extract logs using the CLI (ade is the short command)
ade extract --chrome --log-levels error,warning
```

## Common Use Cases

### 1. AI Model Debugging
```bash
# Extract model-related errors and warnings
ade extract --chrome \
  --log-levels error,warning \
  --keywords "model,prediction,inference,tensor" \
  --exclude "heartbeat" \
  --group-by-level

# Monitor training logs
ade extract -s ./logs \
  -p "training-*.log" "model-*.log" \
  --keywords "epoch,loss,accuracy" \
  --log-levels info,error
```

### 2. API and Network Issues
```bash
# Track API errors and responses
ade extract --chrome \
  --log-levels error \
  --sources network \
  --domains "api.*,*.myservice.com" \
  --keywords "401,403,500" \
  --group-by-source

# Filter out noise (like the DEPRECATED_ENDPOINT errors)
ade extract --chrome \
  --exclude "DEPRECATED_ENDPOINT" \
  --log-levels error \
  --sources network
```

### 3. Authentication Debugging
```bash
# Monitor auth-related issues
ade extract --chrome \
  --keywords "token,auth,login,session" \
  --log-levels error,warning \
  --domains "auth.*,login.*" \
  --group-by-level
```

## Troubleshooting

### Common Issues

1. **Chrome Not Running with Debugging Enabled**
   ```bash
   Error: Chrome is not running with remote debugging enabled
   ```
   Solution:
   ```bash
   # Make sure to start Chrome with debugging first
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-debug
   ```

2. **No Debuggable Tab Found**
   ```bash
   Error: No debuggable Chrome tab found
   ```
   Solution:
   - Open a new tab in Chrome
   - Make sure you're not only on chrome://newtab
   - Try navigating to your application page

3. **Connection Timeouts**
   ```bash
   Error: Failed to connect to Chrome debugger
   ```
   Solution:
   ```bash
   # Try specifying host and port explicitly
   ade extract --chrome \
     --chrome-host localhost \
     --chrome-port 9222
   ```

### Error Handling Examples

1. **Handle Connection Errors Programmatically**
```typescript
import { ChromeExtractor } from 'ai-debug-extractor';

try {
  const extractor = new ChromeExtractor({
    host: 'localhost',
    port: 9222,
    // Add retry options
    maxRetries: 3,
    retryDelay: 1000
  });
  
  const logs = await extractor.extract();
} catch (error) {
  if (error.message.includes('not running')) {
    console.error('Please start Chrome with debugging enabled');
  } else if (error.message.includes('timeout')) {
    console.error('Connection timed out. Check Chrome is running');
  }
}
```

2. **Filter Noisy Errors**
```typescript
const extractor = new ChromeExtractor({
  filters: {
    // Exclude common noise
    excludePatterns: [
      'DEPRECATED_ENDPOINT',
      'chrome://newtab',
      'health-check'
    ],
    // Focus on important errors
    keywords: [
      'exception',
      'failed',
      'crash'
    ],
    logLevels: ['error']
  }
});
```

## Advanced Usage

### 1. Custom Log Formatting
```typescript
const extractor = new ChromeExtractor({
  format: {
    groupByLevel: true,
    includeTimestamp: true,
    includeStackTrace: true
  }
});
```

### 2. Multi-Source Collection
```typescript
import { ChromeExtractor, LogExtractor, ReportGenerator } from 'ai-debug-extractor';

async function collectDebugData() {
  // Chrome logs
  const chromeExtractor = new ChromeExtractor({
    filters: {
      logLevels: ['error'],
      keywords: ['api', 'model']
    }
  });

  // File logs
  const fileExtractor = new LogExtractor({
    sourcePath: './logs',
    patterns: ['*.log']
  });

  // Collect and combine
  const [chromeLogs, fileLogs] = await Promise.all([
    chromeExtractor.extract(),
    fileExtractor.extract()
  ]);

  return ReportGenerator.generateReport({
    logs: [...chromeLogs, ...fileLogs]
  });
}
```

### 3. Real-time Monitoring
```typescript
import { ChromeExtractor } from 'ai-debug-extractor';

const extractor = new ChromeExtractor({
  filters: {
    logLevels: ['error', 'warning'],
    keywords: ['critical', 'failure']
  }
});

// Monitor logs continuously
setInterval(async () => {
  const logs = await extractor.extract();
  if (logs.length > 0) {
    console.log('New issues detected:', logs);
  }
}, 5000);
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or need help, please:
1. Check the Troubleshooting section above
2. Search existing GitHub issues
3. Open a new issue if needed

## Roadmap

See our [Project Board](https://github.com/jasonvaughan/ai-debug-extractor/projects/1) for planned features and enhancements.

## Development Setup

### Prerequisites
- Node.js >= 14.x
- TypeScript >= 4.x
- Chrome/Chromium browser (tested with versions 90-122)

### Development Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/ai-debug-extractor.git
cd ai-debug-extractor

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

### TypeScript Configuration
The project uses TypeScript for type safety and better developer experience. Key configuration:
- Strict mode enabled
- ESNext target
- CommonJS modules
- Full source maps for debugging

## Chrome Version Compatibility

AI Debug Extractor has been tested with:
- Chrome Stable (v90-122)
- Chrome Beta
- Chrome Canary
- Chromium

For optimal compatibility:
```bash
# Check Chrome version
chrome://version

# Use matching CDP protocol version
ade extract --chrome --cdp-version=1.3  # for newer Chrome versions
ade extract --chrome --cdp-version=1.2  # for older Chrome versions
```

## Performance Guidelines

### Handling Large Log Files
```typescript
import { LogExtractor } from 'ai-debug-extractor';

// Configure for large file processing
const extractor = new LogExtractor({
  streamingMode: true,  // Enable streaming for large files
  batchSize: 1000,      // Process logs in batches
  maxMemoryUsage: '1gb' // Limit memory usage
});

// Process logs in chunks
for await (const logBatch of extractor.streamLogs('./large-log.txt')) {
  // Process each batch
  console.log(`Processing batch of ${logBatch.length} logs`);
}
```

### High-Frequency Logging
```typescript
import { ChromeExtractor } from 'ai-debug-extractor';

const extractor = new ChromeExtractor({
  bufferSize: 10000,    // Increase buffer for high-frequency logs
  flushInterval: 1000,  // Flush every second
  samplingRate: 0.1     // Sample 10% of logs for high-volume scenarios
});

// Monitor high-frequency logs
extractor.on('buffer-full', (logs) => {
  // Handle buffered logs
  processHighFrequencyLogs(logs);
});
```

### Resource Management
- Use streaming mode for files > 100MB
- Enable sampling for high-frequency logging (>1000 logs/sec)
- Configure buffer sizes based on available memory
- Use batch processing for large datasets

## Testing Infrastructure

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "Chrome extraction"
npm test -- --grep "File processing"

# Run with coverage
npm run test:coverage
```

### Test Categories
- Unit tests for core functionality
- Integration tests for Chrome CDP
- Performance tests for large files
- End-to-end tests for CLI
- Stress tests for high-frequency logging

### Writing Tests
```typescript
import { ChromeExtractor } from 'ai-debug-extractor';

describe('Chrome Extraction', () => {
  it('handles high-frequency logs', async () => {
    const extractor = new ChromeExtractor({
      samplingRate: 1.0,
      bufferSize: 1000
    });
    
    // Test implementation
  });
});
``` 