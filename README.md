# CLiTS (Chrome Log Inspector & Troubleshooting System)

A powerful CLI tool for extracting and sharing debugging data (logs, network info, etc.) for AI and web projects. CLI-first, with future browser extension support.

## Features

- **Chrome Integration**: Connect to Chrome DevTools protocol for real-time debugging
- **Log Extraction**: Capture console logs, network requests, and errors
- **Visual Debugging**: Screenshot capture with element highlighting
- **Element Detection**: Advanced CSS selector and visual element finding
- **Automation Framework**: JSON-based automation scripts
- **Network Monitoring**: Request/response tracking and analysis
- **Advanced Logging**: Structured logging with metadata, log rotation and size management
- **Component Monitoring**: React hooks, lifecycle tracking, prop changes
- **Network Analysis**: Request/response correlation, WebSocket tracking, JWT token monitoring, GraphQL support
- **State Management**: Redux state visualization, state change tracking, middleware debugging
- **Performance Monitoring**: React render metrics, memory usage tracking, event loop monitoring
- **UI Interaction**: User interaction recording, DOM mutation tracking, CSS change monitoring
- **Interactive login handling**
- **AI-friendly output format**
- **Extensible for custom automation**

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

### 🎉 Latest Features (v1.0.9-beta.25)

**Production Status**: ✅ **AUTOMATION FRAMEWORK VERIFIED 100% WORKING** - Production Ready

**Comprehensive Testing Results (v1.0.9-beta.25):**
```bash
✅ clits extract --chrome --chrome-port 9222                    # Clean log collection verified
✅ clits interact --chrome-port 9222 --wait-for "body"          # React selectors working perfectly
✅ clits automate --script workflow.json --chrome-port 9222     # 100% success rate confirmed
✅ clits chrome-control --chrome-port 9222                      # Parameter parsing working
✅ clits discover-tabs --chrome-port 9222                       # Tab discovery working
✅ clits interact --chrome-port 9222 --wait-for ".MuiButton-root"  # Material-UI detection verified
```

**v1.0.9-beta.25 Verification Results:**
- ✅ **Automation Framework**: 100% success rate with comprehensive testing (11,457+ network events captured)
- ✅ **All Step Types Working**: navigate, wait, click, type, toggle, screenshot, discover_links, interact
- ✅ **Network Monitoring**: Full monitoring capabilities confirmed working
- ✅ **Screenshot Capture**: Automation screenshot functionality verified
- ✅ **Results Output**: JSON results saving working correctly
- ✅ **Production Ready**: All automation functionality stable and ready for production use

### Basic Usage

```bash
# Extract logs from Chrome
clits extract --chrome --chrome-port 9222

# Interact with page elements
clits interact --click-text "Save" --chrome-port 9222
clits interact --click-region "center" --chrome-port 9222

# Run automation script
clits automate --script workflow.json --chrome-port 9222
```

### Advanced Features

```bash
# Visual element selection
clits interact --click-text "Save"               # Click element containing "Save"
clits interact --click-text "Submit"             # Click element containing "Submit"
clits interact --click-color "#ff0000"           # Click by color
clits interact --click-region "top-left"         # Click by screen region
clits interact --click-description "edit button" # Click by visual description

# Enhanced screenshot features
clits interact --screenshot --with-metadata    # Include element positions/text
clits interact --screenshot --annotated        # Draw boxes around clickable elements
clits interact --screenshot --selector-map     # Output clickable element map
clits interact --screenshot --fullpage --base64  # Full-page base64 output

# Selector discovery tools
clits inspect --find-selectors                 # List all available CSS selectors
clits inspect --find-clickable                 # List clickable elements with coordinates
clits inspect --element-map                    # Visual map of page elements
clits inspect --output-format json             # JSON output for AI processing

# Combined AI automation workflow
clits interact --click-text "Edit" --screenshot --base64 --selector-map --stdout
```

## Commands

### `clits extract`
Extract logs and debugging data from various sources.

**Options:**
- `--chrome`: Extract from Chrome DevTools
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--source <path>`: Extract from local log files
- `--patterns <glob>`: File patterns to match
- `--output-file <path>`: Save output to file
- `--format <format>`: Output format (json|text)
- `--filter <pattern>`: Filter logs by pattern
- `--time-range <range>`: Filter by time range
- `--log-levels <levels>`: Filter by log levels
- `--group-by-source`: Group logs by source
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

**Examples:**
```bash
# Basic tab discovery
clits discover-tabs --chrome-port 9222

# Find save button with default patterns
clits discover-tabs --chrome-port 9222 --find-save-button

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

📖 **Complete Documentation**: See [Automation Script Format Guide](docs/AUTOMATION_SCRIPT_FORMAT.md) for full schema, examples, and best practices.

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

**Options:**
- `--screenshot`: Take a screenshot
- `--video`: Record video of the interaction
- `--selectors <selectors>`: CSS selectors to target
- `--output <path>`: Output file path
- `--output-dir <dir>`: Output directory for batch processing
- `--base64`: Output as base64 string
- `--fullpage`: Take full-page screenshot
- `--highlight-all-clickable`: Highlight all clickable elements
- `--highlight-color <color>`: Custom highlight color
- `--annotate-text`: Add text annotations
- `--batch-diff`: Enable batch difference analysis
- `--baseline-dir <dir>`: Directory containing baseline images
- `--diff-threshold <value>`: Difference threshold (0-1)
- `--diff-report <path>`: Save diff analysis report
- `--meta <path>`: Save metadata to file
- `--chrome-host <host>`: Chrome DevTools host (default: `localhost`)
- `--chrome-port <port>`: Chrome DevTools port (default: `9222`)

**Examples:**
```bash
# Basic screenshot with element highlighting
clits vision --screenshot --selectors ".header,.content" --output "page.png"

# Full-page screenshot with annotations
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
- **Real-time Element Inspection**: View element properties, styles, and computed values
- **Network Monitoring**: Track requests and responses in real-time
- **Console Integration**: Execute JavaScript in the context of the page
- **Screenshot Capture**: Take screenshots of the current view or specific elements
- **Element Selection**: Click to select elements in the page
- **Search Functionality**: Find elements by selector, text, or attributes
- **Export Options**: Save inspection data in various formats

**Usage:**
```bash
clits-inspect --chrome-port 9222
```

**Output Format:**
```
[CLiTS-INSPECTOR][ELEMENTS] Element hierarchy
[CLiTS-INSPECTOR][STYLES] Computed styles
[CLiTS-INSPECTOR][PROPERTIES] Element properties
[CLiTS-INSPECTOR][NETWORK][REQUEST] Network request details
[CLiTS-INSPECTOR][NETWORK][RESPONSE] Network response details
[CLiTS-INSPECTOR][DOM] DOM structure
```

---

## Examples

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