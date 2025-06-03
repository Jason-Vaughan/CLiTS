# AI-Debug-Extractor

A specialized debugging tool designed for AI assistants to help troubleshoot Chrome-based web applications. This tool extracts, filters, and analyzes debug information to help AI assistants provide better debugging support.

## Important Note

This tool is specifically designed to be used BY AI ASSISTANTS to help users debug their applications. It is not intended to be used directly as a general-purpose debugging library.

## Prerequisites

- Node.js >= 16
- Google Chrome
- A project you want to debug
- An AI assistant that understands how to use this tool

## Quick Start

1. Install the package in your project:
   ```bash
   npm install github:jasonvaughan/ai-debug-extractor
   ```

2. Start Chrome with remote debugging enabled:
   ```bash
   # On macOS
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-debug

   # On Windows
   "C:\Program Files\Google\Chrome\Application\chrome.exe" \
     --remote-debugging-port=9222 \
     --user-data-dir=%TEMP%\chrome-debug

   # On Linux
   google-chrome \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-debug
   ```

3. When you encounter an issue, ask your AI assistant for help and mention that you have AI-Debug-Extractor installed.

## For AI Assistants

This tool provides several capabilities to help diagnose issues:

1. **Chrome Log Collection**:
   - Console logs (error, warning, info)
   - Network requests and responses
   - Runtime exceptions
   - Performance metrics

2. **Error Handling**:
   - Automatic retry with exponential backoff
   - Known error suppression
   - Platform-specific error handling

3. **Log Analysis**:
   - Pattern matching
   - Error categorization
   - Context preservation

### Common Error Patterns

The tool automatically handles several common Chrome-related errors:

- `DEPRECATED_ENDPOINT` registration errors
- `TASK_CATEGORY_POLICY` errors on macOS
- Chrome startup and connection issues
- WebSocket connection failures

### Configuration Options

```javascript
{
  port: 9222,                    // Chrome debugging port
  retryOptions: {
    maxAttempts: 3,              // Maximum connection attempts
    initialDelay: 1000,          // Initial retry delay (ms)
    maxDelay: 5000               // Maximum retry delay (ms)
  },
  errorHandler: {
    suppressErrors: ['TASK_CATEGORY_POLICY'],  // Errors to suppress
    logErrors: true              // Whether to log suppressed errors
  }
}
```

## Troubleshooting Guide

1. **Chrome Connection Issues**:
   - Ensure Chrome is running with remote debugging enabled
   - Check if the debugging port (9222) is available
   - Verify no other instances are using the debug directory

2. **Permission Issues**:
   - On macOS, task policy errors can be ignored
   - On Linux, ensure proper Chrome installation
   - On Windows, run Chrome with appropriate permissions

3. **Data Collection Issues**:
   - Ensure Chrome is running the page you want to debug
   - Check network connectivity
   - Verify Chrome version compatibility

## Version History

- 0.1.0: Initial release
  - Basic log collection
  - Error handling
  - Chrome integration
  - Platform-specific fixes

## License

MIT 