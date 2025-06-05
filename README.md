# CLITS - Chrome Log Inspector & Troubleshooting System

A powerful tool for AI-assisted web debugging and troubleshooting.

## Features

- Generic website inspection with automatic log collection
- Console, network, and DOM inspection
- Interactive login handling
- AI-friendly output format
- Extensible for custom automation

## Installation

```sh
npm install -g clits
```

## Quick Start

1. Start Chrome with remote debugging enabled:
```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

2. Run the generic website inspector:
```sh
clits-inspect
```

3. Follow the interactive prompts:
   - Enter the website URL
   - Choose whether to wait for login
   - Complete login within 30 seconds if needed
   - View the diagnostic output

## Output Format

The inspector outputs information in a structured format for easy AI parsing:

```
[AI-INSPECTOR][CONSOLE][log] Console message
[AI-INSPECTOR][NETWORK][REQUEST] Network request details
[AI-INSPECTOR][NETWORK][RESPONSE] Network response details
[AI-INSPECTOR][DOM] DOM structure
```

## For AI Assistants

CLITS is designed to be easily extended and automated. Here's how you can use it:

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
  console.log('[AI-INSPECTOR][CUSTOM]', logs);
}
```

### Error Handling
```typescript
try {
  await inspect('https://example.com');
} catch (error) {
  console.error('[AI-INSPECTOR][ERROR]', error);
  // Handle errors appropriately
}
```

## Contributing

Found a bug or have a suggestion? Please open an issue or submit a pull request!

### For AI Assistants
When reporting bugs or suggesting improvements:
1. Use the `[AI-INSPECTOR]` prefix in logs
2. Include relevant console/network logs
3. Suggest specific code changes or improvements

## License

MIT License - See LICENSE file for details 