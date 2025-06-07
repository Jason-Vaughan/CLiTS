# CLiTS - Chrome Log Inspector & Troubleshooting System

<p align="center">
  <img src="https://raw.githubusercontent.com/Jason-Vaughan/CLiTS/main/assets/CLiTS%20Logo.png" alt="CLITS Logo" width="400"/>
</p>

<!-- Badges: npm version, build status, license, etc. -->

[![npm version](https://img.shields.io/npm/v/@puberty-labs/clits.svg)](https://www.npmjs.com/package/@puberty-labs/clits)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Getting Started](https://img.shields.io/badge/start%20with-clits--inspect-brightgreen.svg)](#quick-start)

---

> **CLiTS** (Chrome Log Inspector & Troubleshooting System) is a powerful developer tool that bridges the gap between browser debugging and automated analysis. Get started in seconds with the interactive `clits-inspect` wizard, or build custom automation workflows for your specific needs. It's designed to make web application debugging more efficient by:
>
> 🧙‍♂️ **Interactive Wizard**: Start debugging instantly with the guided `clits-inspect` command
>
> 🔍 **Automated Log Collection**: Capture Chrome DevTools logs, network requests, and DOM state without manual inspection
>
> 🤖 **AI-Ready Output**: Generate structured, parseable output that's perfect for AI analysis and automated debugging
>
> 🔄 **Interactive Workflows**: Handle complex scenarios like authenticated sessions and dynamic content with ease
>
> 🛠️ **Extensible Architecture**: Build custom automation workflows or integrate with your existing testing infrastructure
>
> Whether you're debugging a complex web application, automating browser testing, or building AI-powered developer tools, CLiTS streamlines the process of collecting and analyzing browser data. It's particularly valuable for:
>
> - **Developers** troubleshooting hard-to-reproduce issues
> - **QA Teams** building automated testing pipelines
> - **AI Assistants** gathering real-time browser diagnostics
> - **DevOps** monitoring web application health
>
> CLiTS turns the tedious process of browser debugging into a streamlined, programmatic workflow.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Commands & Options](#cli-commands--options)
- [Output Format](#output-format)
- [Examples](#examples)
- [For AI Assistants](#for-ai-assistants)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Browser Automation**: Navigate to URLs, interact with elements, and run scripted automation workflows
- **Screenshot Capture**: Take full-page screenshots during navigation and interactions
- **Network Monitoring**: Capture network requests and responses during automation
- Generic website inspection with automatic log collection
- Console, network, and DOM inspection
- Advanced Logging (Structured logging with metadata, log rotation and size management, timestamp synchronization)
- Component Monitoring (React hooks, lifecycle tracking, prop changes)
- Network Analysis (Request/response correlation, WebSocket tracking, JWT token monitoring, GraphQL support)
- State Management (Redux state visualization, state change tracking, middleware debugging)
- Performance Monitoring (React render metrics, memory usage tracking, event loop monitoring)
- UI Interaction (User interaction recording, DOM mutation tracking, CSS change monitoring)
- Interactive login handling
- AI-friendly output format
- Extensible for custom automation

---

## Prerequisites

- **Node.js** >= 16
- **Google Chrome** (latest recommended)
- **inquirer** (for interactive prompts)
- (Optional) [Playwright](https://playwright.dev/) for advanced automation

---

## Installation

```sh
npm install -g clits
```

---

## Quick Start

1. **Start Chrome with remote debugging enabled:**
   ```sh
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```
2. **Run the generic website inspector:**
   ```sh
   clits extract --chrome --chrome-port 9222
   ```
   *If multiple Chrome tabs are open, you will be prompted to select one.*
   *Alternatively, specify a target ID directly:*
   ```sh
   clits extract --chrome --chrome-port 9222 --target-id <YOUR_TARGET_ID>
   ```

---

## CLI Commands & Options

### `clits extract`
Extract debugging data from files or a Chrome session.

**Options:**
- `-s, --source <path>`: Source directory path for file extraction
- `-p, --patterns <patterns...>`: Log file patterns to match (default: `['*.log']`)
- `-m, --max-size <size>`: Maximum file size in MB (default: `10`)
- `-f, --max-files <count>`: Maximum number of files to process (default: `100`)
- `--chrome`: Extract logs from an existing Chrome session. This now includes improved connection stability, automatic reconnection, and interactive selection for multiple Chrome tabs (requires Chrome running with `--remote-debugging-port=9222`).
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)
- `--target-id <id>`: Specify a Chrome tab/page target ID to connect to when using `--chrome`. If not provided and multiple targets are found, an interactive prompt will appear.
- `--no-network`: Exclude network logs from Chrome DevTools
- `--no-console`: Exclude console logs from Chrome DevTools
- `--include-react-hooks`: Include React hook monitoring
- `--include-component-lifecycle`: Include React component lifecycle tracking
- `--include-prop-changes`: Include React prop change monitoring
- `--include-websockets`: Include WebSocket traffic monitoring
- `--include-jwt-monitoring`: Include JWT token monitoring
- `--include-graphql-monitoring`: Include GraphQL request/response monitoring
- `--include-redux-monitoring`: Include Redux state monitoring
- `--include-state-changes`: Include Redux state change tracking
- `--include-middleware-debugging`: Include Redux middleware debugging
- `--include-render-metrics`: Include React render metrics
- `--include-memory-usage`: Include memory usage tracking
- `--include-event-loop`: Include event loop monitoring
- `--include-user-interaction`: Include user interaction recording
- `--include-dom-mutation`: Include DOM mutation tracking
- `--include-css-changes`: Include CSS change monitoring
- `--log-levels <levels>`: Filter by log levels (comma-separated, default: `error,warning,info,debug`)
- `--sources <sources>`: Filter by sources (comma-separated, default: `network,console,devtools`)
- `--domains <domains>`: Filter by domain patterns (comma-separated)
- `--keywords <keywords>`: Filter by keywords (comma-separated)
- `--exclude <patterns>`: Exclude logs matching patterns (comma-separated)
- `--advanced-filter <expression>`: Advanced boolean filter expression, e.g., `(React AND error) OR (network AND 404)`
- `--group-by-source`: Group logs by their source
- `--group-by-level`: Group logs by their level
- `--no-stack-traces`: Exclude stack traces from output
- `--output-file <path>`: Save logs to the specified file path
- `--error-summary`: Include summary statistics of error frequencies
- `--live-mode [duration]`: Run in live mode for specified duration in seconds (default: `60`)
- `--interactive-login`: This option is deprecated. Interactive login is now automatically handled if needed based on the selected Chrome tab.
- `--no-login`: Bypass any login prompts and run automation as unauthenticated

### `clits navigate`
Navigate to URLs and wait for elements.

**Options:**
- `--url <url>`: Navigate to specific URL (required)
- `--wait-for <selector>`: Wait for CSS selector to appear
- `--timeout <ms>`: Timeout in milliseconds (default: `30000`)
- `--screenshot <path>`: Take screenshot after navigation
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)

**Example:**
```sh
clits navigate --url "http://localhost:5173/displays" --wait-for ".displays-manager" --screenshot "navigation.png"
```

### `clits interact`
Interact with page elements.

**Options:**
- `--click <selector>`: Click on element matching CSS selector
- `--type <selector> <text>`: Type text into input field
- `--toggle <selector>`: Toggle switch/checkbox elements
- `--wait-for <selector>`: Wait for element after interaction
- `--timeout <ms>`: Timeout in milliseconds (default: `10000`)
- `--capture-network`: Capture network requests during interaction
- `--screenshot <path>`: Take screenshot after interaction
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)

**Selector Strategies:**
CLITS now supports multiple selector strategies with automatic fallback:
- CSS selectors: `.class-name`, `#id`, `[data-testid="value"]`
- Text content matching: `"Edit"` (finds buttons containing "Edit")
- Data attributes: Automatically tries `[data-testid="selector"]`
- ARIA labels: Automatically tries `[aria-label*="selector"]`

**Examples:**
```sh
# Basic interaction with timeout
clits interact --click "[data-testid='edit-btn']" --wait-for ".edit-dialog" --timeout 15000

# Text-based selector (finds button containing "Edit")
clits interact --click "Edit" --wait-for ".modal-dialog" --timeout 10000

# Complex selector with network capture
clits interact --toggle "input[data-field='active']" --capture-network --screenshot "toggle.png"
```

### `clits automate`
Run automation scripts from JSON files.

**Options:**
- `--script <path>`: JSON file with automation steps (required)
- `--monitor`: Enable monitoring during automation
- `--save-results <path>`: Save results to file
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)

**Automation Script Format:**
```json
{
  "steps": [
    {"action": "navigate", "url": "http://localhost:5173/displays"},
    {"action": "wait", "selector": ".displays-manager", "timeout": 10000},
    {"action": "click", "selector": ".edit-button"},
    {"action": "toggle", "selector": ".toggle-switch[data-field='active']"},
    {"action": "screenshot", "path": "after-toggle.png"}
  ],
  "options": {
    "timeout": 30000,
    "captureNetwork": true,
    "monitor": true
  }
}
```

**Example:**
```sh
clits automate --script automation.json --monitor --save-results results.json
```

### `clits-inspect`
Interactive website inspector for Chrome.

**Prompts:**
- Website URL to inspect
- Whether login is required (waits up to 30 seconds for manual login)
- Select browser tab if multiple are open
- After diagnostics, choose to:
  - Capture current page state again
  - Navigate to a new URL
  - Exit

---

## Output Format

The inspector outputs information in a structured format for easy AI parsing:

```
[CLiTS-INSPECTOR][CONSOLE][log] Console message
[CLiTS-INSPECTOR][NETWORK][REQUEST] Network request details
[CLiTS-INSPECTOR][NETWORK][RESPONSE] Network response details
[CLiTS-INSPECTOR][DOM] DOM structure
```

---

## Examples

- **Node.js API Example:** See [`examples/node-api`](examples/node-api/README.md) for integrating CLiTS with an Express API, including REST endpoints for logs and error handling.
- **React Integration Example:** See [`examples/react-app`](examples/react-app/README.md) for capturing debug logs in a React app, error boundaries, and analytics integration.

---

## For AI Assistants

CLiTS is designed to be easily extended and automated. Now that `ChromeExtractor` is central to Chrome interactions, here's an updated perspective:

### Basic Usage with `ChromeExtractor`
For direct programmatic access (e.g., from an AI tool), you can instantiate and use `ChromeExtractor`:

```typescript
import { ChromeExtractor } from './src/chrome-extractor'; // Adjust path as needed

async function extractChromeLogs(port: number, host: string, targetId?: string) {
  const extractor = new ChromeExtractor({
    port,
    host,
    includeNetwork: true,
    includeConsole: true,
    reconnect: { enabled: true, maxAttempts: 5 } // Reconnection enabled by default
  });

  try {
    const logs = await extractor.extract(targetId);
    console.log('Extracted logs:', JSON.stringify(logs, null, 2));
    return logs;
  } catch (error) {
    console.error('Error during extraction:', error);
    throw error;
  }
}

// Example usage:
// To get logs from the first available Chrome tab on port 9222
// extractChromeLogs(9222, 'localhost');

// To get logs from a specific target ID
// extractChromeLogs(9222, 'localhost', 'YOUR_TARGET_ID');
```

### Retrieving and Selecting Targets Programmatically
If you need to list and select Chrome tabs programmatically:

```typescript
import { ChromeExtractor } from './src/chrome-extractor'; // Adjust path as needed

async function listAndSelectChromeTarget(port: number, host: string) {
  const extractor = new ChromeExtractor({ port, host });
  try {
    const targets = await extractor.getDebuggablePageTargets();
    if (targets.length === 0) {
      console.log('No debuggable Chrome tabs found.');
      return null;
    }

    console.log('Available Chrome tabs:');
    targets.forEach((t, index) => {
      console.log(`${index + 1}. ${t.title || t.url} (ID: ${t.id})`);
    });

    // For programmatic selection, you might choose the first target or apply custom logic
    const selectedTarget = targets[0]; 
    console.log(`Programmatically selected: ${selectedTarget.title || selectedTarget.url}`);
    return selectedTarget.id;

  } catch (error) {
    console.error('Error listing Chrome targets:', error);
    throw error;
  }
}

// Example usage:
// const selectedId = await listAndSelectChromeTarget(9222, 'localhost');
// if (selectedId) {
//   extractChromeLogs(9222, 'localhost', selectedId);
// }
```

### Error Handling
Error handling is now more robust within `ChromeExtractor`. Catched errors will typically provide detailed messages.

```typescript
try {
  // Your CLITS command or ChromeExtractor usage here
} catch (error) {
  console.error('[CLiTS-INSPECTOR][ERROR]', error);
  // Errors from ChromeExtractor or the CLI will now provide more context.
  // Example: if Chrome is not running, you'll get a specific message.
}
```

---

## Contributing

Found a bug or have a suggestion? We'd love to hear from you! Puberty Labs is committed to continuous improvement of CLiTS and welcomes community feedback.

### Ways to Contribute
- **npm Feedback**: Leave a review or feedback on our [npm package page](https://www.npmjs.com/package/@puberty-labs/clits)
- **GitHub Issues**: Open an issue for bugs or feature requests
- **Pull Requests**: Submit code improvements or documentation updates

### Local Development
1. Clone the repo and install dependencies:
   ```sh
   git clone https://github.com/jasonvaughan/clits.git
   cd clits
   npm install
   ```
2. Build the project:
   ```sh
   npm run build
   ```
3. Run tests:
   ```sh
   npm test
   ```
4. Lint and fix code style:
   ```sh
   npm run lint:fix
   ```

### Submitting PRs
- Fork the repo and create a feature branch
- Add tests for new features or bug fixes
- Ensure all tests pass and code is linted
- Open a pull request with a clear description

We appreciate all forms of contribution, from code to documentation to design feedback!

---

## License

MIT License - See [LICENSE](LICENSE) for details 