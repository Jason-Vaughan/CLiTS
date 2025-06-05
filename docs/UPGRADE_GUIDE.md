# CLITS Upgrade Guide

## Upgrading to Version 0.3.0

Version 0.3.0 includes significant improvements to fix critical issues and add requested features.

### What's New in 0.3.0

- **Fixed Critical Issues**
  - Resolved timestamp handling problems
  - Fixed "toLowerCase" undefined errors
  - Improved error handling throughout
  - Added better null checking for log processing

- **New Features**
  - Built-in log file export
  - Advanced boolean filtering
  - Error summary statistics
  - Live mode with duration parameter
  - Automatic reconnection for page refreshes

### Upgrade Instructions

#### Option 1: Upgrade via NPM (recommended)

```bash
# Uninstall the previous version
npm uninstall -g clits

# Install the new version
npm install -g clits@1.0.0
```

#### Option 2: Upgrade in a specific project

```bash
# In your project directory
npm uninstall clits
npm install clits@1.0.0
```

#### Option 3: Install from a local package

If you have received the package file directly:

```bash
npm install -g ./path/to/clits-1.0.0.tgz
```

### Verify Installation

To verify you have the correct version installed:

```bash
clits --version
# Should show: 1.0.0
```

## Using New Features

### Log File Export

Save logs directly to a file instead of to the console:

```bash
clits extract --chrome --output-file=logs.json
```

### Advanced Boolean Filtering

Use complex boolean expressions to filter logs:

```bash
# Find logs containing either "error" AND "React" OR "network" AND "404"
clits extract --chrome --advanced-filter="(error AND React) OR (network AND 404)"
```

### Error Summary

Generate statistics about the most common errors:

```bash
clits extract --chrome --error-summary
```

### Live Mode

Run CLITS in continuous mode for a specified duration (in seconds):

```bash
# Run for 5 minutes (300 seconds)
clits extract --chrome --live-mode=300
```

### Combined Example

Combine multiple features for powerful debugging:

```bash
clits extract --chrome \
  --advanced-filter="(SharedImageManager AND error) OR Invalid\ mailbox" \
  --live-mode=300 \
  --error-summary \
  --output-file=display-logs.json
```

## Breaking Changes

There are no breaking changes in this release. All existing commands and options continue to work as before. 