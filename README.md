# CLITS

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
   npm install github:jasonvaughan/clits
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

3. When you encounter an issue, ask your AI assistant for help and mention that you have CLITS installed.

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

## Manual Login Support for Browser Automation

CLITS supports flexible authentication for browser-based extraction and E2E testing. You can control login behavior using the following CLI flags:

### `--interactive-login`

- When passed, CLITS will pause and prompt you to log in manually in the opened browser window before continuing automation.
- This is ideal for projects with SSO, 2FA, or any authentication that is hard to automate, or when running under AI assistant control.
- Example usage:

```sh
clits extract --chrome --interactive-login
```

You will see a prompt:

```
[CLITS] Please log in to the app in the opened browser window, then press Enter to continue...
```

After logging in, press Enter to continue automated extraction or testing.

### `--no-login`

- Explicitly bypasses any login prompts and runs automation as an unauthenticated user.
- Useful for public apps or when login is not required.

### How it Works

- The `--interactive-login` flag sets the `INTERACTIVE_LOGIN=1` environment variable for Playwright/browser automation.
- Playwright E2E tests and browser automation scripts check this variable and pause for manual login if set.
- This approach is flexible for both authenticated and unauthenticated projects, and is suitable for both human and AI-driven workflows.

## Using an Existing Chrome Session for Authenticated Automation

Some services (like Google) block logins from automated browsers. To work around this, CLITS can attach to a real Chrome session:

1. Start Chrome with remote debugging enabled:
   ```sh
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```
2. Log in to your app (or Google) manually in that Chrome window.
3. Run CLITS with `--chrome` or `--interactive-login`:
   ```sh
   clits extract --chrome --interactive-login
   ```

CLITS will attach to your real, authenticated Chrome session and run automation as you. This bypasses automation blocks and works for any login state.

## E2E Testing with Real Chrome Sessions

1. **Start Chrome with remote debugging enabled:**
   ```sh
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```
2. **Log in to your app (or Google) in that Chrome window if needed.**
3. **Run the CLI:**
   ```sh
   npx tsx src/cli.ts extract --chrome --interactive-login
   ```
4. **How it works:**
   - The tests attach to your real Chrome session using Playwright's `connectOverCDP`.
   - If a login prompt is detected, you will be prompted in the terminal to log in and press Enter.
   - If already logged in, the test proceeds automatically.
   - All UI actions and assertions are performed in your real, authenticated browser window.

### Linter Errors
- You may see TypeScript linter errors in the E2E test file due to advanced Playwright usage (attaching to an external browser session). These do not affect test execution and can be safely ignored.

## Session Notes

- **All E2E tests are working with real Chrome sessions and manual login is only prompted if needed.**
- **Linter errors are present but do not interfere.**
- **Next session:**
  - Test the workflow again from a fresh state.
  - Optionally, refine selectors or add more E2E coverage.
  - Consider CI integration or further automation if desired. 