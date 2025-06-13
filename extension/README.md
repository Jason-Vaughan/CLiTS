# AI Debug Extractor - Chrome Extension

This directory contains the Chrome extension component of the AI Debug Extractor tool. The extension is designed to capture and export debugging data from web applications.

## Development Status

This extension is currently in development. The initial implementation will include:

- Console log capture
- Network request/response logging
- JavaScript error tracking
- Performance metrics collection
- Log export functionality

## Directory Structure

```
extension/
├── manifest.json        # Extension manifest
├── background.js       # Background service worker
├── content.js         # Content script
├── popup.html         # Extension popup UI
├── popup.js          # Popup logic
├── styles/           # CSS styles
└── icons/            # Extension icons
```

## Development Setup

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this directory

## Usage

Once implemented, the extension will:
1. Capture logs and debug data from web applications
2. Allow filtering and searching of captured data
3. Export data in a format compatible with the AI Debug Extractor CLI tool

## Integration with CLI

The extension will export data in a format that can be processed by the main CLI tool. This allows for:
- Post-processing of captured data
- Integration with other debugging tools
- Data analysis and reporting 