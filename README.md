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

- **Node.js** >= 20
- **Google Chrome** (latest recommended)
- **inquirer** (for interactive prompts)

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
Interactive website inspector for Chrome with hierarchical element navigation.

**Features:**
- **Hierarchical Element Navigation**: Navigate through page elements organized by DOM depth levels
- **Enhanced Element Detection**: Finds 79+ interactive elements using 53+ selector patterns including:
  - Material-UI components (`.MuiButton-root`, `.MuiIconButton-root`, etc.)
  - Data attributes (`[data-testid]`, `[data-cy]`, etc.)
  - ARIA labels and roles
  - Text-based element detection
  - CSS class patterns (*button*, *click*, *action*, *menu*, etc.)

**Navigation Controls:**
- **↑↓ Arrow Keys**: Navigate between elements at current level
- **→ Right Arrow**: Go deeper into DOM hierarchy (see more specific elements)
- **← Left Arrow**: Go up in DOM hierarchy (see broader elements)
- **Enter**: Click selected element
- **Esc**: Exit inspector

**Prompts:**
- Website URL to inspect
- Whether login is required (waits up to 30 seconds for manual login)
- Select browser tab if multiple are open
- Interactive element navigation with level indicators (Level 0/4, Level 1/4, etc.)
- After diagnostics, choose to:
  - Capture current page state again
  - Navigate to a new URL
  - Exit

**Example Navigation:**
```
Level 0/4: Main page elements (7 elements)
- Dashboard (http://localhost:5173/dashboard)
- Zones (http://localhost:5173/zones)
- Displays Manager (http://localhost:5173/displays)

Level 1/4: More specific elements (19 elements)
- Navigation buttons, cards, form elements

Level 2/4: Detailed interactive elements (25+ elements)
- Individual buttons, links, inputs within components
```

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

CLiTS is specifically designed for AI assistants with a complete automation framework that requires **zero human interaction**. The AI automation framework provides structured JSON output perfect for programmatic analysis and decision-making.

### 🤖 AI Automation Framework

Use the `clits-inspect` command with automation flags for fully automated workflows:

#### **Complete Automation Commands**

```bash
# 1. Automated Log Collection (15 seconds, JSON output)
clits-inspect --auto --json --action logs

# 2. Automated Element Detection (find all clickable elements)
clits-inspect --auto --json --action navigate

# 3. Automated Clicking with Log Capture
clits-inspect --auto --json --action click --selector "http://localhost:5173/settings"

# 4. Navigate to Specific URL + Element Detection
clits-inspect --auto --json --url "http://localhost:3000" --action navigate

# 5. Custom Duration Log Collection
clits-inspect --auto --json --action logs --duration 30

# 6. Smart Target Selection (prioritize localhost)
clits-inspect --auto --json --action logs --target-priority localhost
```

#### **AI Command Options**

| Option | Values | Description |
|--------|--------|-------------|
| `--auto` | - | **Required for AI**: Zero human interaction |
| `--json` | - | **Required for AI**: Structured JSON output |
| `--action` | `logs\|navigate\|click` | Action to perform |
| `--url` | URL string | Navigate to specific URL automatically |
| `--selector` | CSS selector or URL | Element to click (for click action) |
| `--duration` | seconds (default: 15) | Log collection duration |
| `--target-priority` | `localhost\|dev\|newest\|largest` | Smart tab selection |
| `--port` | port number (default: 9222) | Chrome debugging port |
| `--host` | hostname (default: localhost) | Chrome debugging host |

#### **AI Workflow Examples**

**1. Full Debugging Workflow:**
```bash
# Step 1: Auto-launch and detect elements
clits-inspect --auto --json --action navigate

# Step 2: Click on Settings link
clits-inspect --auto --json --action click --selector "http://localhost:5173/settings"

# Step 3: Collect logs after interaction
clits-inspect --auto --json --action logs --duration 10
```

**2. JSON Output Format:**
```json
{
  "success": true,
  "action": "navigate",
  "timestamp": "2025-06-08T01:41:23.034Z",
  "target": {
    "id": "1223DEB4A446164DEE13C00AA6CCE7E0",
    "title": "Vite + React + TS",
    "url": "http://localhost:5173/displays-manager"
  },
  "logs": [],
  "elements": [
    {
      "name": "🔗 Dashboard",
      "url": "http://localhost:5173/dashboard"
    },
    {
      "name": "🔗 Settings", 
      "url": "http://localhost:5173/settings"
    },
    {
      "name": "🔘 Add New Display",
      "url": "Add New Display"
    }
  ],
  "error": null
}
```

**3. Error Handling:**
```json
{
  "success": false,
  "action": "click",
  "timestamp": "2025-06-08T01:41:23.034Z",
  "error": "Element not found: #non-existent-selector",
  "target": null,
  "logs": [],
  "elements": []
}
```

#### **AI Integration Benefits**

- **🚀 Auto-launch Chrome**: Detects if Chrome is running, launches automatically if needed
- **🎯 Smart Target Selection**: Prioritizes localhost > dev > newest tabs automatically  
- **📊 Structured Output**: JSON format perfect for AI parsing and decision making
- **🔄 Action Chaining**: Navigate → detect elements → click → capture logs in sequence
- **🛡️ Error Handling**: Graceful failures with structured error responses
- **⚡ Zero Latency**: No human prompts or interactions required

#### **Programmatic Usage (Alternative)**

For direct integration in Node.js applications:

```typescript
import { ChromeExtractor } from '@puberty-labs/clits/dist/chrome-extractor';

async function aiDebugWorkflow() {
  const extractor = new ChromeExtractor({
    port: 9222,
    host: 'localhost',
    includeNetwork: true,
    includeConsole: true
  });

  try {
    // 1. Get available targets
    const targets = await extractor.getDebuggablePageTargets();
    const target = targets.find(t => t.url.includes('localhost')) || targets[0];
    
    // 2. Extract logs
    const logs = await extractor.extract(target.id);
    
    return {
      success: true,
      targetUrl: target.url,
      logCount: logs.length,
      logs: logs
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

CLiTS enables AI assistants to build complete closed-loop debugging workflows:

1. **Launch CLiTS** → 2. **Auto-launch Chrome** → 3. **Navigate pages** → 4. **Detect elements** → 5. **Click/interact** → 6. **Capture logs** → 7. **Interpret results** → 8. **Repeat cycle**

#### **Quick Start for AI Assistants**

**Prerequisites:** 
- Install: `npm install -g @puberty-labs/clits`
- Chrome will be auto-launched if needed

**Basic AI Commands:**
```bash
# Start with element detection (most common)
clits-inspect --auto --json --action navigate

# Click a specific element
clits-inspect --auto --json --action click --selector "Dashboard"

# Collect debugging logs
clits-inspect --auto --json --action logs
```

**Advanced Automation:**
```bash
# Navigate to specific page + detect elements
clits-inspect --auto --json --action navigate --url "http://localhost:3000/admin"

# Extended log collection with smart targeting
clits-inspect --auto --json --action logs --duration 30 --target-priority localhost
```

The automation framework handles Chrome launching, tab selection, and provides structured JSON responses perfect for AI analysis. All commands are designed to work without any human intervention.

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