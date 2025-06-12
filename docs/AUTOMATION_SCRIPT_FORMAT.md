# CLITS Automation Script Format

## Overview

CLITS automation scripts are JSON files that define multi-step workflows for browser automation. This document provides the complete schema and examples for creating automation scripts.

## Script Structure

```json
{
  "name": "Optional script name",
  "description": "Optional script description", 
  "steps": [
    // Array of automation steps
  ],
  "options": {
    // Optional global script options
  }
}
```

## Step Actions

### navigate
Navigate to a URL and optionally wait for page load.

```json
{
  "action": "navigate",
  "url": "http://localhost:5173/zones",
  "wait": 2000
}
```

**Properties:**
- `action`: `"navigate"` (required)
- `url`: Target URL string (required) 
- `wait`: Milliseconds to wait after navigation (optional)

### wait
Wait for an element selector to appear on the page.

```json
{
  "action": "wait", 
  "selector": ".displays-manager",
  "timeout": 10000
}
```

**Properties:**
- `action`: `"wait"` (required)
- `selector`: CSS selector to wait for (required)
- `timeout`: Timeout in milliseconds (optional, default: 30000)

### click
Click on an element matching the given selector.

```json
{
  "action": "click",
  "selector": ".edit-button"
}
```

**Properties:**
- `action`: `"click"` (required)
- `selector`: CSS selector to click (required)

### type
Type text into an input field.

```json
{
  "action": "type",
  "selector": "#username",
  "text": "admin@example.com"
}
```

**Properties:**
- `action`: `"type"` (required)
- `selector`: CSS selector for input field (required)
- `text`: Text to type (required)

### toggle
Toggle a switch or checkbox element.

```json
{
  "action": "toggle",
  "selector": ".toggle-switch[data-field='active']"
}
```

**Properties:**
- `action`: `"toggle"` (required)
- `selector`: CSS selector for toggle element (required)

### screenshot
Take a screenshot and save to file.

```json
{
  "action": "screenshot",
  "path": "after-toggle.png"
}
```

**Properties:**
- `action`: `"screenshot"` (required)
- `path`: File path to save screenshot (required)

## Global Options

```json
{
  "options": {
    "timeout": 30000,
    "captureNetwork": true,
    "monitor": true
  }
}
```

**Available Options:**
- `timeout`: Default timeout for all operations in milliseconds
- `captureNetwork`: Enable network request/response capture (boolean)
- `monitor`: Enable monitoring during automation (boolean)

## Complete Example

```json
{
  "name": "Zone Management Workflow",
  "description": "Navigate to zones page and toggle a setting",
  "steps": [
    {
      "action": "navigate",
      "url": "http://localhost:5173/zones",
      "wait": 2000
    },
    {
      "action": "wait",
      "selector": "body",
      "timeout": 5000
    },
    {
      "action": "wait", 
      "selector": ".zones-container",
      "timeout": 10000
    },
    {
      "action": "click",
      "selector": ".edit-button"
    },
    {
      "action": "wait",
      "selector": ".edit-dialog",
      "timeout": 5000
    },
    {
      "action": "toggle",
      "selector": ".toggle-switch[data-field='active']"
    },
    {
      "action": "screenshot",
      "path": "after-toggle.png"
    },
    {
      "action": "click", 
      "selector": ".save-button"
    }
  ],
  "options": {
    "timeout": 30000,
    "captureNetwork": true,
    "monitor": true
  }
}
```

## Common Mistakes

❌ **Wrong property names:**
```json
{
  "action": "navigate",
  "target": "http://..." // Should be "url"
}

{
  "action": "screenshot", 
  "filename": "shot.png"  // Should be "path"
}
```

✅ **Correct property names:**
```json
{
  "action": "navigate",
  "url": "http://..."
}

{
  "action": "screenshot",
  "path": "shot.png"
}
```

## Running Automation Scripts

```bash
# Basic automation
clits automate --script automation.json --chrome-port 9222

# With monitoring and results
clits automate --script automation.json --chrome-port 9222 --monitor --save-results results.json
```

## Selector Best Practices

1. **Use specific selectors** when possible:
   ```json
   { "selector": "[data-testid='save-button']" }
   ```

2. **Use class names** for consistent elements:
   ```json
   { "selector": ".MuiButton-root[aria-label='Save']" }
   ```

3. **Use hierarchy** for disambiguation:
   ```json
   { "selector": ".edit-dialog .save-button" }
   ```

4. **Avoid fragile selectors** like nth-child unless necessary:
   ```json
   // Prefer this:
   { "selector": "[data-testid='item-1']" }
   
   // Over this:
   { "selector": ".list-item:nth-child(1)" }
   ```

## Error Handling

If a step fails, the automation will stop and report:
- Which step failed
- How many steps completed successfully  
- The specific error message

Example error output:
```json
{
  "success": false,
  "completedSteps": 3,
  "totalSteps": 6,
  "error": "Failed at step 4: Element not found: \".nonexistent-button\""
}
``` 