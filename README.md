# CLiTS - Chrome Log Inspector & Troubleshooting System

<p align="center">
  <img src="assets/CLiTS Logo.png" alt="CLITS Logo" width="400"/>
</p>

<!-- Badges: npm version, build status, license, etc. -->

[![npm version](https://img.shields.io/npm/v/clits.svg)](https://www.npmjs.com/package/clits)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

> **CLiTS** (Chrome Log Inspector & Troubleshooting System) is a developer tool for AI-assisted web debugging and automation. It streamlines the process of collecting, structuring, and analyzing browser logs, making it easier for both humans and AI assistants to diagnose issues, automate workflows, and extend browser-based testing.
>
> Whether you're troubleshooting a tricky login flow, inspecting network requests, or building custom automation, CLiTS provides a robust, extensible foundation for browser inspection and diagnostics.

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

- Generic website inspection with automatic log collection
- Console, network, and DOM inspection
- Interactive login handling
- AI-friendly output format
- Extensible for custom automation

---

## Prerequisites

- **Node.js** >= 16
- **Google Chrome** (latest recommended)
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
   clits-inspect
   ```
3. **Follow the interactive prompts:**
   - Enter the website URL
   - Choose whether to wait for login
   - Complete login within 30 seconds if needed
   - View the diagnostic output

---

## CLI Commands & Options

### `clits extract`
Extract debugging data from files or a Chrome session.

**Options:**
- `-s, --source <path>`: Source directory path for file extraction
- `-p, --patterns <patterns...>`: Log file patterns to match (default: `['*.log']`)
- `-m, --max-size <size>`: Maximum file size in MB (default: `10`)
- `-n, --max-files <number>`: Maximum number of files to process (default: `100`)
- `--chrome`: Extract logs from an existing Chrome session (must be started with `--remote-debugging-port=9222`)
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)
- `--no-network`: Exclude network logs from Chrome DevTools
- `--no-console`: Exclude console logs from Chrome DevTools
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
- `--interactive-login`: Pause and prompt for manual login before running browser automation
- `--no-login`: Bypass any login prompts and run automation as unauthenticated

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

CLiTS is designed to be easily extended and automated. Here's how you can use it:

### Basic Usage
```typescript
import { chromium } from 'playwright';

async function inspect(url: string) {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  await page.goto(url);
  // Add your custom inspection logic here
}
```

### Custom Automation
```typescript
// Example: Automated login and inspection
async function inspectWithLogin(url: string, username: string, password: string) {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  await page.goto(url);
  
  // Custom login logic
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('#login-button');
  
  // Your custom inspection
  const logs = await page.evaluate(() => console.logs);
  console.log('[CLiTS-INSPECTOR][CUSTOM]', logs);
}
```

### Error Handling
```typescript
try {
  await inspect('https://example.com');
} catch (error) {
  console.error('[CLiTS-INSPECTOR][ERROR]', error);
  // Handle errors appropriately
}
```

---

## Contributing

Found a bug or have a suggestion? Please open an issue or submit a pull request!

### Local Development
1. Clone the repo and install dependencies:
   ```sh
   git clone https://github.com/jasonvaughan/ai-debug-extractor.git
   cd ai-debug-extractor
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

---

## License

MIT License - See [LICENSE](LICENSE) for details 