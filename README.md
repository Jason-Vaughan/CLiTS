# CLiTS - Chrome Log Inspector & Troubleshooting System

<p align="center">
  <img src="https://raw.githubusercontent.com/Jason-Vaughan/CLiTS/main/assets/CLiTS%20Logo.png" alt="CLiTS Logo" width="320"/>
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
- **visionCLITS** (✅ Available in v1.0.8-beta.1): Advanced visual state capture and screenshot automation
  - Element-specific screenshots with CSS selector support
  - Full-page screenshot capability with metadata extraction
  - Base64/stdout output for AI integration
  - Batch screenshot mode for multiple selectors
  - Visual state analysis with element detection and validation
  - Visual state metadata extraction
  - AI-friendly output formats
- **OnDeck Priority Features** (✅ Available in v1.0.8-beta.1):
  - Base64 Screenshot Output for AI processing
  - Visual Element Selection:
    - Click by text content (e.g., "Save", "Submit")
    - Click by color (hex, rgb, or name)
    - Click by screen region (top-left, top-right, etc.)
    - Click by visual description (AI-powered)
  - Enhanced Screenshot Features:
    - Element position metadata
    - Visual annotations
    - Clickable element maps
    - JSON output format
    - Full-page capture
  - Selector Discovery Tools:
    - Find all CSS selectors
    - List clickable elements
    - Generate element maps
    - Multiple output formats
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

### 🎉 OnDeck Integration Ready (v1.0.7-beta.3)

**Production Status**: ✅ **ALL AUTOMATION BLOCKERS RESOLVED** - Ready for immediate OnDeck integration

**Validated Commands (100% Working):**
```bash
✅ clits extract --chrome --chrome-port 9222                    # Clean log collection
✅ clits interact --chrome-port 9222 --wait-for "body"          # React selectors working
✅ clits automate --script workflow.json --chrome-port 9222     # Multi-step workflows
✅ clits chrome-control --chrome-port 9222                      # Parameter parsing fixed
✅ clits discover-tabs --chrome-port 9222                       # Tab discovery working
✅ clits interact --chrome-port 9222 --wait-for ".MuiButton-root"  # Material-UI detection
```

**Latest Enhancements (v1.0.7-beta.3):**
- ✅ **Material-UI Support**: Comprehensive selector patterns for Material-UI components
- ✅ **Save Button Detection**: Intelligent strategies for reliable save button identification
- ✅ **Tab Discovery**: New command for discovering and interacting with tabs
- ✅ **Documentation**: Mandatory updates for all NPM releases (including beta versions)

**Previous Fixes (v1.0.7-beta.2):**
- ✅ **Log Collection**: Eliminated all "Invalid log entry" validation warnings
- ✅ **React Selectors**: Fixed timeout issues with `body`, `html`, and basic DOM elements
- ✅ **Command Parsing**: Resolved chrome-control parameter parsing conflicts
- ✅ **Automation Workflows**: Multi-step JSON workflows now complete successfully

### Installation & Setup

1. **Install CLiTS:**
   ```sh
   npm install -g @puberty-labs/clits@beta
   ```

2. **Start Chrome with remote debugging enabled:**
   ```sh
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```

3. **Run the generic website inspector:**
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

### `clits discover-links`
**NEW in v1.0.7** - Discover all navigation links on the current page for dynamic automation.

**Options:**
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)
- `--verbose`: Enable verbose output

**Output Format:**
```json
{
  "links": [
    {"text": "Dashboard", "url": "/dashboard", "selector": "a[href='/dashboard']"},
    {"text": "Display Manager", "url": "/displays-manager", "selector": "a[href='/displays-manager']"},
    {"text": "Tasks", "url": "/tasks", "selector": "a[href='/tasks']"}
  ],
  "timestamp": "2025-06-08T05:52:00.000Z"
}
```

**Example:**
```sh
clits discover-links --chrome-port 9222
```

### `clits discover-tabs`
**NEW in v1.0.7-beta.3** - Advanced tab discovery and interaction for Material-UI dialogs and tabbed interfaces.

**Options:**
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)
- `--tab-label <label>`: Select tab by label after discovery
- `--tab-label-regex <pattern>`: Select tab by regex pattern  
- `--custom-save-patterns <patterns>`: Custom save button text patterns (comma-separated)
- `--find-save-button`: Also discover the best save button in the current dialog
- `--verbose`: Enable verbose output

**Material-UI Integration:**
- **Comprehensive Component Support**: `.MuiButton-root`, `.MuiIconButton-root`, `.MuiFab-root`, `.MuiToggleButton-root`, `.MuiDialog-root`, `.MuiModal-root`, `.MuiTab-root`, `.MuiTabs-root`, `.MuiSwitch-root`, `.MuiCheckbox-root`, `.MuiRadio-root`, `.MuiDialogActions-root`, `.MuiCardActions-root`, `.MuiButtonGroup-root`
- **Intelligent Save Button Detection**: By text ("Save", "Update", "Apply", "OK", "Done", "Submit", "Confirm"), by attributes (`type="submit"`, `aria-label`, `title`), by icons (save icons in `.MuiSvgIcon-root`), in action areas (`.MuiDialogActions-root`, `.modal-footer`)
- **Smart Fallbacks**: Single enabled button detection, primary button detection

**Output Format:**
```json
{
  "success": true,
  "targetUrl": "http://localhost:5173/displays",
  "targetTitle": "Display Manager",
  "tabCount": 4,
  "tabs": [
    {
      "label": "Basic Options",
      "selector": "[aria-label=\"Basic Options\"]",
      "index": 0,
      "isActive": true,
      "isDisabled": false
    },
    {
      "label": "Header Options", 
      "selector": ":contains(\"Header Options\")",
      "index": 1,
      "isActive": false,
      "isDisabled": false
    }
  ],
  "saveButton": {
    "x": 450,
    "y": 600,
    "strategy": "text-content",
    "text": "Save Changes"
  }
}
```

**Example Usage:**
```bash
# Discover all tabs in current dialog
clits discover-tabs --chrome-port 9222

# Discover tabs and click "Header Options"
clits discover-tabs --chrome-port 9222 --tab-label "Header Options"

# Regex-based tab selection
clits discover-tabs --chrome-port 9222 --tab-label-regex "Header|Fields"

# Discover tabs + find save button with custom patterns
clits discover-tabs --chrome-port 9222 --find-save-button --custom-save-patterns "Apply,Update,Confirm"

# Complete workflow: discover, select tab, find save button
clits discover-tabs --chrome-port 9222 --tab-label "Header Options" --find-save-button
```

**Advanced Features:**
- **Nested Tab Support**: Discovers tabs within `.MuiTabs-root` containers
- **Active State Detection**: Shows which tab is currently selected (`aria-selected="true"`, `.Mui-selected`)
- **Disabled State Detection**: Identifies disabled tabs (`aria-disabled="true"`, `.Mui-disabled`)
- **Multi-Strategy Selection**: Supports selection by data-testid, aria-label, text content, or nth-child

### `clits interact`
Interact with web elements and capture screenshots.

**Options:**
- `--screenshot`: Take a screenshot during interaction
- `--base64`: Output screenshot as base64 string (perfect for AI processing)
- `--stdout`: Output results in JSON format to stdout
- `--with-metadata`: Include element positions and page metadata
- `--annotated`: Add visual annotations around clickable elements
- `--selector-map`: Output map of clickable elements with coordinates
- `--fullpage`: Take a full-page screenshot
- `--click-text <text>`: Click element containing specific text (e.g., "Save", "Submit")
- `--click-color <color>`: Click element with specific color (hex, rgb, or name)
- `--click-region <region>`: Click by screen region (top-left, top-right, bottom-left, bottom-right, center)
- `--click-description <description>`: Click by visual description (experimental AI feature)
- `--wait-for <selector>`: Wait for CSS selector to appear
- `--timeout <ms>`: Timeout in milliseconds (default: `30000`)
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)
- `--target-id <id>`: Specify a Chrome tab/page target ID

### `clits inspect`
Inspect page elements and discover selectors.

**Options:**
- `--find-selectors`: List all available CSS selectors on the page
- `--find-clickable`: List all clickable elements with coordinates
- `--element-map`: Generate visual map of page elements
- `--output-format <format>`: Output format (json|table|interactive)
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)
- `--target-id <id>`: Specify a Chrome tab/page target ID

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
    {"action": "wait", "selector": "body", "timeout": 5000},
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
# Basic automation with improved selector reliability
clits automate --script automation.json --chrome-port 9222 --monitor --save-results results.json

# Quick automation validation
clits automate --script test-workflow.json --chrome-port 9222
```

### `clits vision`
**Advanced visual state capture and screenshot automation with element-specific targeting.**

#### 🚀 NEW in v1.0.9-beta.1: Roadmap Features

#### Core Screenshot Options:
- `--screenshot`: Take screenshot(s)
- `--selector <selector>`: CSS selector for element-specific screenshot
- `--selectors <selectors>`: Multiple CSS selectors (comma-separated)
- `--output <path>`: Output file path for screenshot
- `--output-dir <dir>`: Output directory for multiple screenshots
- `--meta <path>`: Output JSON metadata file path
- `--fullpage`: Take full-page screenshot
- `--base64`: Output screenshot as base64 to stdout
- `--stdout`: Output results to stdout (JSON format)
- `--include-text`: Include text content in metadata
- `--include-styles`: Include computed styles in metadata
- `--include-bbox`: Include bounding box information
- `--include-visibility`: Include visibility state information

#### 🔍 Visual Diff Capabilities (NEW):
- `--diff`: Enable visual diff mode for regression testing
- `--baseline <path>`: Baseline screenshot or directory for comparison
- `--compare-with <path>`: Compare current screenshot with this image
- `--diff-threshold <number>`: Diff sensitivity threshold (0-1, default: 0.1)
- `--diff-output <path>`: Output path for diff result image
- `--diff-report <path>`: Output path for diff analysis JSON report
- `--save-baseline`: Save current screenshot as new baseline
- `--batch-diff`: Enable batch processing for multiple screenshot comparisons

#### 🎥 Video Capture Capabilities (NEW):
- `--video`: Enable video recording for interaction workflows
- `--video-output <path>`: Output path for recorded video (default: clits-recording.webm)
- `--video-duration <seconds>`: Recording duration in seconds (default: 30)
- `--video-fps <fps>`: Video frame rate (default: 10)

#### 🎨 Advanced Element Highlighting (NEW):
- `--highlight`: Add visual annotations to screenshots
- `--highlight-color <color>`: Color for element highlighting (hex, default: #ff0000)
- `--highlight-thickness <pixels>`: Border thickness for highlighting (default: 3)
- `--highlight-all-clickable`: Highlight all clickable elements on the page
- `--annotate-text`: Add text labels to highlighted elements

#### System Options:
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)
- `--timeout <ms>`: Timeout in milliseconds (default: `30000`)

**Visual State Metadata:**
VisionCLITS captures comprehensive element information:
```json
{
  "selector": ".error-message",
  "exists": true,
  "visible": true,
  "boundingBox": {
    "x": 100, "y": 200, "width": 300, "height": 50,
    "top": 200, "left": 100, "right": 400, "bottom": 250
  },
  "textContent": "Error: Connection failed",
  "computedStyles": {
    "display": "block", "visibility": "visible", "opacity": "1",
    "position": "absolute", "backgroundColor": "rgb(255, 0, 0)",
    "color": "rgb(255, 255, 255)", "fontSize": "14px"
  },
  "screenshotPath": "error_0.png"
}
```

**Examples:**

#### Core Screenshot Examples:
```sh
# Element-specific screenshot with metadata
clits vision --screenshot --selector ".error-message" --output "error.png" --meta "error.json"

# Multiple selectors with batch processing
clits vision --screenshot --selectors ".error,.warning" --output-dir "./screenshots"

# Full-page screenshot with base64 output
clits vision --screenshot --fullpage --output "page.png" --base64

# Comprehensive element analysis
clits vision --screenshot --selector ".button" --include-text --include-styles --include-bbox --meta "analysis.json"

# JSON output to stdout for AI integration
clits vision --screenshot --selectors "h1,button" --stdout

# Visual state capture for debugging
clits vision --screenshot --selector ".dialog" --include-text --include-visibility --meta "debug.json"
```

#### 🔍 Visual Diff Examples (NEW):
```sh
# Create baseline screenshot for regression testing
clits vision --screenshot --fullpage --save-baseline --baseline "ui-baseline.png"

# Compare current state with baseline and generate diff
clits vision --screenshot --fullpage --diff --baseline "ui-baseline.png" --diff-output "changes.png" --diff-report "analysis.json"

# Batch visual regression testing with custom threshold
clits vision --screenshot --selectors ".header,.footer,.main" --batch-diff --baseline-dir "./baselines" --diff-threshold 0.05

# Compare specific element changes
clits vision --screenshot --selector ".login-form" --diff --baseline "login-baseline.png" --diff-output "login-diff.png"

# Visual consistency validation across deployments
clits vision --screenshot --fullpage --compare-with "production-screenshot.png" --diff-threshold 0.02 --diff-report "deployment-validation.json"
```

#### 🎥 Video Capture Examples (NEW):
```sh
# Record 60-second workflow at high quality
clits vision --video --video-duration 60 --video-fps 15 --video-output "user-workflow.webm"

# Combine video recording with screenshot capture
clits vision --video --screenshot --fullpage --output "final-state.png" --video-output "interaction-recording.webm"

# Record bug reproduction with custom settings
clits vision --video --video-duration 45 --video-fps 12 --video-output "bug-reproduction.webm"

# Create automated testing demo
clits vision --video --video-duration 120 --video-fps 10 --video-output "automation-demo.webm"
```

#### 🎨 Advanced Highlighting Examples (NEW):
```sh
# Highlight all clickable elements with custom styling
clits vision --screenshot --fullpage --highlight-all-clickable --highlight-color "#00ff00" --highlight-thickness 5

# Add text annotations to highlighted elements
clits vision --screenshot --selector ".navigation" --highlight --annotate-text --output "annotated-nav.png"

# Visual debugging of element positioning
clits vision --screenshot --selectors ".button,.link,.form" --highlight --highlight-color "#ff00ff" --highlight-thickness 2

# Generate UI documentation with annotations
clits vision --screenshot --fullpage --highlight-all-clickable --annotate-text --output "ui-documentation.png"

# Accessibility analysis visualization
clits vision --screenshot --fullpage --highlight-all-clickable --highlight-color "#0066ff" --annotate-text --meta "accessibility-report.json"
```

#### 🔄 Advanced Batch Processing Examples (NEW):
```sh
# Large-scale visual testing with diff analysis
clits vision --screenshot --selectors ".header,.sidebar,.content,.footer" --batch-diff --baseline-dir "./test-baselines" --output-dir "./test-results" --diff-report "batch-analysis.json"

# Multi-element regression testing
clits vision --screenshot --selectors ".error-states,.success-states,.warning-states" --batch-diff --diff-threshold 0.1 --output-dir "./regression-tests"

# Systematic UI validation with highlighting and video
clits vision --video --screenshot --selectors ".critical-elements" --highlight-all-clickable --batch-diff --video-output "validation-workflow.webm"
```

**AI Integration:**
VisionCLITS is designed for AI-driven visual debugging:
- **Automated Visual State Capture**: No manual intervention required
- **Structured JSON Output**: Perfect for AI analysis and decision-making
- **Element Validation**: Automatic visibility and existence checking
- **Batch Processing**: Handle multiple elements efficiently
- **Error Handling**: Graceful failures with detailed error reporting

### `clits-inspect`
Interactive website inspector for Chrome with hierarchical element navigation.

**Features:**
- **Hierarchical Element Navigation**: Navigate through page elements organized by DOM depth levels
- **Enhanced Element Detection**: Finds 79+ interactive elements using 53+ selector patterns including:
  - Material-UI components (`.MuiButton-root`, `.MuiIconButton-root`, `.MuiDialog-root`, `.MuiTab-root`, `.MuiSwitch-root`)
  - Intelligent save button detection in dialogs
  - Tab label discovery for tabbed interfaces
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

**Material-UI Integration:**
- **Dialog Support**: Automatic save button detection in dialogs
- **Tab Navigation**: Discover and interact with tabbed interfaces
- **Component Detection**: Enhanced support for Material-UI components
- **Selector Patterns**: Robust selector patterns for all Material-UI components

**Prompts:**
- Website URL to inspect
- Whether login is required (waits up to 30 seconds for manual login)
- Select browser tab if multiple are open
- Interactive element navigation with level indicators (Level 0/4, Level 1/4, etc.)
- After diagnostics, choose to:
  - Capture current page state again
  - Navigate to a new URL
  - Exit

**Example Usage:**
```bash
# Basic inspection
clits inspect --chrome-port 9222

# With Material-UI support
clits inspect --chrome-port 9222 --mui

# Discover tab labels
clits inspect --chrome-port 9222 --discover-tabs

# Intelligent save button detection
clits inspect --chrome-port 9222 --smart-save
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

### OnDeck Priority Features (v1.0.8-beta.1)

```bash
# 🔥 CRITICAL: Base64 screenshot output for AI processing
clits interact --screenshot --base64     # Output base64 to stdout for AI
clits interact --screenshot --stdout     # JSON output with screenshot data

# 🎯 Visual element selection (HIGH priority)
clits interact --click-text "Save"               # Click element containing "Save"
clits interact --click-text "Submit"             # Click element containing "Submit"
clits interact --click-color "#ff0000"           # Click by color
clits interact --click-region "top-left"         # Click by screen region
clits interact --click-description "edit button" # Click by visual description

# 📸 Enhanced screenshot features (MEDIUM priority)
clits interact --screenshot --with-metadata    # Include element positions/text
clits interact --screenshot --annotated        # Draw boxes around clickable elements
clits interact --screenshot --selector-map     # Output clickable element map
clits interact --screenshot --fullpage --base64  # Full-page base64 output

# 🔍 Selector discovery tools (HIGH priority)
clits inspect --find-selectors                 # List all available CSS selectors
clits inspect --find-clickable                 # List clickable elements with coordinates
clits inspect --element-map                    # Visual map of page elements
clits inspect --output-format json             # JSON output for AI processing

# 💡 Combined AI automation workflow
clits interact --click-text "Edit" --screenshot --base64 --selector-map --stdout
```

### Standard Usage Examples

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

# 7. NEW: Discover Navigation Links (v1.0.7)
clits-inspect --auto --json --action discover-links

# 8. NEW: Navigate by Link Text (v1.0.7)
clits-inspect --auto --json --action navigate-by-text --link-text "Dashboard"

# 9. NEW: Navigate by URL Pattern (v1.0.7)
clits-inspect --auto --json --action navigate-by-url --url-contains "display"
```

#### **AI Command Options**

| Option | Values | Description |
|--------|--------|-------------|
| `--auto` | - | **Required for AI**: Zero human interaction |
| `--json` | - | **Required for AI**: Structured JSON output |
| `--action` | `logs\|navigate\|click\|discover-links\|navigate-by-text\|navigate-by-url` | Action to perform |
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