// BSD: Chrome DevTools Protocol automation for navigation, interaction, and scripted automation tasks.
// Provides browser automation capabilities including navigation, element interaction, and screenshot capture.

import CDP from 'chrome-remote-interface';
import { writeFileSync, readFileSync } from 'fs';
import { ChromeExtractor } from './chrome-extractor.js';
import { createLogger, format, transports } from 'winston';
import { EventEmitter } from 'events';
import fetch from 'node-fetch';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

export interface NavigationOptions {
  url: string;
  waitForSelector?: string;
  timeout?: number;
  screenshotPath?: string;
  chromePort?: number;
  chromeHost?: string;
}

export interface InteractionOptions {
  clickSelector?: string;
  typeSelector?: string;
  typeText?: string;
  toggleSelector?: string;
  waitForSelector?: string;
  timeout?: number;
  captureNetwork?: boolean;
  screenshotPath?: string;
  chromePort?: number;
  chromeHost?: string;
}

export interface AutomationStep {
  action: 'navigate' | 'wait' | 'click' | 'type' | 'toggle' | 'screenshot';
  url?: string;
  selector?: string;
  text?: string;
  path?: string;
  timeout?: number;
}

export interface AutomationScript {
  steps: AutomationStep[];
  options?: {
    timeout?: number;
    captureNetwork?: boolean;
    monitor?: boolean;
  };
}

export interface AutomationOptions {
  scriptPath: string;
  monitor?: boolean;
  saveResultsPath?: string;
  chromePort?: number;
  chromeHost?: string;
}

export interface AutomationResult {
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  error?: string;
  screenshots?: string[];
  networkLogs?: any[];
  monitoringData?: any[];
  timestamp: string;
}

interface CDPClient extends EventEmitter {
  Page: any;
  Runtime: any;
  Network: any;
  DOM: any;
  Input: any;
  close: () => Promise<void>;
}

export class ChromeAutomation {
  private static readonly DEFAULT_PORT = 9222;
  private static readonly DEFAULT_HOST = 'localhost';
  private static readonly DEFAULT_TIMEOUT = 30000;

  private port: number;
  private host: string;
  private chromeExtractor?: ChromeExtractor;

  constructor(port: number = ChromeAutomation.DEFAULT_PORT, host: string = ChromeAutomation.DEFAULT_HOST) {
    this.port = port;
    this.host = host;
  }

  async navigate(options: NavigationOptions): Promise<{ actualUrl: string; success: boolean }> {
    const client = await this.connectToChrome();
    
    try {
      const { Page, Runtime } = client;
      
      await Page.enable();
      await Runtime.enable();

      logger.info(`Navigating to: ${options.url}`);
      
      // Get current URL before navigation for comparison
      const beforeNavigation = await Runtime.evaluate({
        expression: 'window.location.href'
      });
      const initialUrl = beforeNavigation.result.value;
      
      await Page.navigate({ url: options.url });
      
      // Wait for page load
      await Page.loadEventFired();

      // CRITICAL FIX: Verify actual URL after navigation
      const afterNavigation = await Runtime.evaluate({
        expression: 'window.location.href'
      });
      const actualUrl = afterNavigation.result.value;
      
      // Parse expected path from target URL for comparison
      const targetUrl = new URL(options.url);
      const actualUrlObj = new URL(actualUrl);
      
      // Check if navigation was successful
      const navigationSuccessful = 
        // Either the URL changed to the target
        (actualUrl !== initialUrl && 
         (actualUrlObj.pathname === targetUrl.pathname || 
          actualUrl.includes(targetUrl.pathname) ||
          actualUrl === options.url)) ||
        // Or we were already at the target URL
        (actualUrl === options.url || 
         actualUrlObj.pathname === targetUrl.pathname ||
         actualUrl.includes(targetUrl.pathname));
      
      if (!navigationSuccessful) {
        throw new Error(`Navigation verification failed. Expected URL containing "${targetUrl.pathname}", but got "${actualUrl}". Initial URL was "${initialUrl}".`);
      }
      
      logger.info(`Navigation verified: ${actualUrl}`);
      
      // Wait for specific selector if provided
      if (options.waitForSelector) {
        await this.waitForSelector(client, options.waitForSelector, options.timeout);
      }

      // Take screenshot if requested
      if (options.screenshotPath) {
        await this.takeScreenshot(client, options.screenshotPath);
      }

      logger.info('Navigation completed successfully');
      
      return { actualUrl, success: true };
    } finally {
      await client.close();
    }
  }

  async interact(options: InteractionOptions): Promise<void> {
    const client = await this.connectToChrome();
    const networkLogs: any[] = [];

    try {
      const { Page, Runtime, Network, DOM, Input } = client;
      
      await Page.enable();
      await Runtime.enable();
      await DOM.enable();
      // Note: Input domain doesn't require enable() - it's ready to use immediately
      // Input is used in private methods like clickElement() and typeInElement()

      // Enable network monitoring if requested
      if (options.captureNetwork) {
        await Network.enable();
        Network.requestWillBeSent((params: any) => {
          networkLogs.push({
            type: 'request',
            timestamp: Date.now(),
            ...params
          });
        });
        Network.responseReceived((params: any) => {
          networkLogs.push({
            type: 'response',
            timestamp: Date.now(),
            ...params
          });
        });
      }

      // Perform click interaction
      if (options.clickSelector) {
        await this.clickElement(client, options.clickSelector);
      }

      // Perform type interaction
      if (options.typeSelector && options.typeText) {
        await this.typeInElement(client, options.typeSelector, options.typeText);
      }

      // Perform toggle interaction
      if (options.toggleSelector) {
        await this.toggleElement(client, options.toggleSelector);
      }
      
      // Ensure Input is referenced to avoid linter warning
      void Input;

      // Wait for selector after interaction
      if (options.waitForSelector) {
        await this.waitForSelector(client, options.waitForSelector, options.timeout);
      }

      // Take screenshot if requested
      if (options.screenshotPath) {
        await this.takeScreenshot(client, options.screenshotPath);
      }

      // Log network activity if captured
      if (options.captureNetwork && networkLogs.length > 0) {
        logger.info(`Captured ${networkLogs.length} network events during interaction`);
        console.log(JSON.stringify(networkLogs, null, 2));
      }

      logger.info('Interaction completed successfully');
    } finally {
      await client.close();
    }
  }

  async runAutomation(options: AutomationOptions): Promise<AutomationResult> {
    const script: AutomationScript = JSON.parse(readFileSync(options.scriptPath, 'utf8'));
    const result: AutomationResult = {
      success: false,
      completedSteps: 0,
      totalSteps: script.steps.length,
      screenshots: [],
      networkLogs: [],
      monitoringData: [],
      timestamp: new Date().toISOString()
    };

    const client = await this.connectToChrome();
    
    try {
      const { Page, Runtime, Network, DOM, Input } = client;
      
      await Page.enable();
      await Runtime.enable();
      await DOM.enable();
      // Note: Input domain doesn't require enable() - it's ready to use immediately

      // Enable monitoring if requested
      if (options.monitor || script.options?.monitor) {
        this.chromeExtractor = new ChromeExtractor({
          port: options.chromePort || this.port,
          host: options.chromeHost || this.host,
          includeNetwork: script.options?.captureNetwork !== false,
          includeConsole: true
        });
      }

      // Enable network monitoring if needed
      if (script.options?.captureNetwork !== false) {
        await Network.enable();
        Network.requestWillBeSent((params: any) => {
          result.networkLogs!.push({
            type: 'request',
            timestamp: Date.now(),
            ...params
          });
        });
        Network.responseReceived((params: any) => {
          result.networkLogs!.push({
            type: 'response',
            timestamp: Date.now(),
            ...params
          });
        });
      }

      // Ensure Input is referenced to avoid linter warning
      void Input;
      
      // Execute each step
      for (let i = 0; i < script.steps.length; i++) {
        const step = script.steps[i];
        logger.info(`Executing step ${i + 1}/${script.steps.length}: ${step.action}`);

        try {
          await this.executeStep(client, step, result);
          result.completedSteps++;
        } catch (error) {
          result.error = `Failed at step ${i + 1}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error(result.error);
          break;
        }
      }

      result.success = result.completedSteps === result.totalSteps;

      // Save results if requested
      if (options.saveResultsPath) {
        writeFileSync(options.saveResultsPath, JSON.stringify(result, null, 2));
        logger.info(`Results saved to: ${options.saveResultsPath}`);
      }

      logger.info(`Automation completed: ${result.completedSteps}/${result.totalSteps} steps successful`);
      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      logger.error(`Automation failed: ${result.error}`);
      return result;
    } finally {
      await client.close();
    }
  }

  private async connectToChrome(): Promise<CDPClient> {
    try {
      // Auto-launch Chrome if needed (using same logic as working clits-inspect)
      await this.launchChromeIfNeeded();
      
      // Smart target selection with priority logic (using same logic as working clits-inspect)
      const target = await this.autoSelectTarget();
      
      // Connect to the selected target using its webSocketDebuggerUrl
      const client = await CDP({ 
        target: target.webSocketDebuggerUrl || target.id
      }) as unknown as CDPClient;
      
      return client;
    } catch (error) {
      throw new Error(`Failed to connect to Chrome: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkChromeConnection(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.host}:${this.port}/json/version`);
      if (response.ok) {
        const version = await response.json() as { Browser?: string };
        logger.info(`✅ Existing Chrome debugging session detected: ${version.Browser || 'Chrome'}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.debug(`No Chrome debugging session found on port ${this.port}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async launchChromeIfNeeded(): Promise<void> {
    // First check if Chrome is already running with debugging
    const isChrome = await this.checkChromeConnection();
    if (isChrome) {
      logger.info('✅ Using existing Chrome debugging session');
      return;
    }

    // Check if Chrome process exists but not responding to debugging
    if (process.platform === 'darwin') {
      try {
        const { execSync } = await import('child_process');
        const chromeProcesses = execSync('ps aux | grep Chrome | grep remote-debugging-port', { encoding: 'utf8' });
        if (chromeProcesses.trim().length > 0) {
          logger.warn('Chrome process with remote debugging found but not responding. Waiting for it to be ready...');
          // Wait longer for existing Chrome to become ready
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const isReady = await this.checkChromeConnection();
            if (isReady) {
              logger.info('✅ Existing Chrome session is now ready');
              return;
            }
          }
          logger.warn('Existing Chrome session did not become ready, will launch new instance');
        }
      } catch (error) {
        logger.debug('Could not check for existing Chrome processes:', error);
      }
    }

    // Only launch if no Chrome debugging session exists
    logger.info('No Chrome debugging session found. Launching Chrome with debugging enabled...');
    
    if (process.platform === 'darwin') {
      const { spawn } = await import('child_process');
      const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      const args = [
        `--remote-debugging-port=${this.port}`,
        '--user-data-dir=/tmp/chrome-debug-clits',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ];
      
      const chromeProcess = spawn(chromePath, args, {
        detached: true,
        stdio: 'ignore'
      });
      chromeProcess.unref();
      
      logger.info(`Chrome launched with PID: ${chromeProcess.pid}`);
      
      // Wait for Chrome to start and verify connection
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isReady = await this.checkChromeConnection();
        if (isReady) {
          logger.info('✅ New Chrome debugging session is ready');
          return;
        }
        logger.debug(`Waiting for Chrome to be ready... attempt ${i + 1}/15`);
      }
      
      throw new Error('Chrome launched but debugging session did not become available within 15 seconds');
    } else {
      throw new Error('Chrome is not running with remote debugging enabled. Start Chrome with --remote-debugging-port=9222');
    }
  }

  private async autoSelectTarget(): Promise<any> {
    const response = await fetch(`http://${this.host}:${this.port}/json/list`);
    const targets = await response.json() as Array<{
      id: string;
      type: string;
      url: string;
      title: string;
      webSocketDebuggerUrl?: string;
    }>;
    
    const pageTargets = targets.filter((t: any) => t.type === 'page');
    
    if (pageTargets.length === 0) {
      throw new Error('No Chrome page targets found. Please open a tab in Chrome with --remote-debugging-port=9222');
    }
    
    if (pageTargets.length === 1) {
      return pageTargets[0];
    }
    
    // Smart target selection - prefer localhost/development URLs (same logic as working clits-inspect)
    const localTargets = pageTargets.filter(t => 
      t.url.includes('localhost') || 
      t.url.includes('127.0.0.1') || 
      t.url.includes('local') ||
      t.url.startsWith('http://localhost') ||
      t.url.startsWith('https://localhost')
    );
    
    if (localTargets.length > 0) {
      return localTargets[0];
    }
    
    // Filter out chrome:// URLs as fallback
    const nonChromeTargets = pageTargets.filter(t => !t.url.startsWith('chrome://'));
    if (nonChromeTargets.length > 0) {
      return nonChromeTargets[0];
    }
    
    // Last resort: return first available
    return pageTargets[0];
  }

  private async executeStep(client: CDPClient, step: AutomationStep, result: AutomationResult): Promise<void> {
    const timeout = step.timeout || ChromeAutomation.DEFAULT_TIMEOUT;

    switch (step.action) {
      case 'navigate': {
        if (!step.url) throw new Error('Navigate step requires url');
        // Use internal navigation logic for consistency
        const tempOptions: NavigationOptions = {
          url: step.url,
          timeout: timeout
        };
        // Call navigate method but handle return internally
        const tempAutomation = new ChromeAutomation(this.port, this.host);
        await tempAutomation.navigate(tempOptions);
        break;
      }

      case 'wait':
        if (!step.selector) throw new Error('Wait step requires selector');
        await this.waitForSelector(client, step.selector, timeout);
        break;

      case 'click':
        if (!step.selector) throw new Error('Click step requires selector');
        await this.clickElement(client, step.selector);
        break;

      case 'type':
        if (!step.selector || !step.text) throw new Error('Type step requires selector and text');
        await this.typeInElement(client, step.selector, step.text);
        break;

      case 'toggle':
        if (!step.selector) throw new Error('Toggle step requires selector');
        await this.toggleElement(client, step.selector);
        break;

      case 'screenshot':
        if (!step.path) throw new Error('Screenshot step requires path');
        await this.takeScreenshot(client, step.path);
        result.screenshots!.push(step.path);
        break;

      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }

  private escapeSelector(selector: string): string {
    // Escape single quotes and backslashes for safe JavaScript string interpolation
    return selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private async findElementWithFallback(client: CDPClient, selector: string): Promise<{ x: number; y: number } | null> {
    const escapedSelector = this.escapeSelector(selector);
    
    // Basic elements that always exist and should be found without strict visibility checks
    const basicElements = ['body', 'html', 'head', 'document'];
    
    // Common React/HTML elements that should also get relaxed visibility handling
    const commonElements = ['button', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'a', 'form', 'textarea', 'select'];
    
    const isBasicElement = basicElements.includes(selector.toLowerCase());
    const isCommonElement = commonElements.includes(selector.toLowerCase()) || 
                           selector.includes('button') || 
                           selector.includes('input') || 
                           selector.includes('checkbox');
    
    logger.debug(`Finding element with selector: ${selector}, isBasicElement: ${isBasicElement}, isCommonElement: ${isCommonElement}`);
    
    // Enhanced strategies for React components and Material-UI
    const strategies = [
      // Direct CSS selector
      `document.querySelector('${escapedSelector}')`,
      // React/Material-UI button patterns
      `document.querySelector('button${escapedSelector.startsWith('.') ? escapedSelector : '[class*="' + escapedSelector.replace(/['"]/g, '') + '"]'}')`,
      `document.querySelector('.MuiButton-root${escapedSelector.startsWith('.') ? escapedSelector : '[class*="' + escapedSelector.replace(/['"]/g, '') + '"]'}')`,
      // Input patterns including checkboxes
      `document.querySelector('input[type="checkbox"]${escapedSelector.includes('checkbox') ? '' : '[class*="' + escapedSelector.replace(/['"]/g, '') + '"]'}')`,
      `document.querySelector('input${escapedSelector.startsWith('[') ? escapedSelector : '[class*="' + escapedSelector.replace(/['"]/g, '') + '"]'}')`,
      // Text content search for buttons and links
      `Array.from(document.querySelectorAll('button, a, [role="button"]')).find(el => el.textContent && el.textContent.trim().includes('${escapedSelector.replace(/['"]/g, '')}'))`,
      // Data attribute search
      `document.querySelector('[data-testid="${escapedSelector.replace(/['"]/g, '')}"]')`,
      `document.querySelector('[data-testid*="${escapedSelector.replace(/['"]/g, '')}"]')`,
      // Aria label search
      `document.querySelector('[aria-label*="${escapedSelector.replace(/['"]/g, '')}"]')`,
      // Class-based search
      `document.querySelector('[class*="${escapedSelector.replace(/['"]/g, '')}"]')`
    ];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      try {
        // Relaxed handling for basic and common elements (no strict visibility checks)
        if (isBasicElement || isCommonElement) {
          const result = await client.Runtime.evaluate({
            expression: `
              (function() {
                try {
                  const element = ${strategy};
                  if (!element) return JSON.stringify({ error: 'element not found' });
                  
                  // For basic/common elements, allow elements even if not perfectly visible
                  const rect = element.getBoundingClientRect();
                  
                  // More lenient visibility check - just ensure element exists in DOM
                  const style = getComputedStyle(element);
                  if (style.display === 'none' || style.visibility === 'hidden') {
                    return JSON.stringify({ error: 'element hidden' });
                  }
                  
                  // Calculate center position, with safe fallbacks
                  const x = rect.width > 0 ? rect.left + rect.width / 2 : rect.left + 10;
                  const y = rect.height > 0 ? rect.top + rect.height / 2 : rect.top + 10;
                  
                  return JSON.stringify({
                    x: Math.max(x, 10),
                    y: Math.max(y, 10),
                    strategy: '${strategy.replace(/'/g, "\\'")}',
                    elementType: '${isBasicElement ? 'basic' : 'common'}',
                    strategyIndex: ${i}
                  });
                } catch (err) {
                  return JSON.stringify({ error: err.message });
                }
              })()
            `
          });
          
          if (result.result.value && typeof result.result.value === 'string') {
            const elementInfo = JSON.parse(result.result.value);
            if (elementInfo.error) {
              logger.debug(`Strategy ${i} failed for ${isBasicElement ? 'basic' : 'common'} element: ${strategy} - ${elementInfo.error}`);
            } else {
              logger.info(`Element found using strategy ${i}: ${strategy}`, elementInfo);
              return elementInfo;
            }
          } else {
            logger.debug(`Strategy ${i} failed: ${strategy} - no result value`);
          }
        } else {
          // Strict handling for complex selectors
          const result = await client.Runtime.evaluate({
            expression: `
              JSON.stringify((function() {
                const element = ${strategy};
                if (!element) return null;
                const rect = element.getBoundingClientRect();
                
                // Strict visibility check for complex selectors
                if (rect.width === 0 || rect.height === 0) return null;
                
                const style = getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden') return null;
                
                return {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                  strategy: '${strategy.replace(/'/g, "\\'")}',
                  elementType: 'complex',
                  strategyIndex: ${i}
                };
              })())
            `
          });

          if (result.result.value) {
            const elementInfo = JSON.parse(result.result.value);
            if (elementInfo) {
              logger.info(`Element found using strategy ${i}: ${strategy}`);
              return elementInfo;
            }
          }
        }
      } catch (error) {
        // Continue to next strategy
        logger.debug(`Strategy ${i} failed: ${strategy}`, error);
      }
    }

    logger.warn(`All strategies failed for selector: ${selector}`);
    return null;
  }

  private async waitForSelector(client: CDPClient, selector: string, timeout: number = ChromeAutomation.DEFAULT_TIMEOUT): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const elementInfo = await this.findElementWithFallback(client, selector);
        if (elementInfo) {
          logger.info(`Element found: ${selector}`);
          return;
        }
      } catch (error) {
        // Continue waiting
        logger.debug(`Error while waiting for selector: ${error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout waiting for selector: ${selector} (tried multiple strategies). This element may not be clickable or visible.`);
  }

  private async clickElement(client: CDPClient, selector: string): Promise<void> {
    // First ensure element exists
    await this.waitForSelector(client, selector);
    
    // Try to find element with fallback strategies
    const elementInfo = await this.findElementWithFallback(client, selector);
    
    if (!elementInfo) {
      throw new Error(`Element not found with any strategy: ${selector}`);
    }

    const { x, y } = elementInfo;
    
    // Perform click
    await client.Input.dispatchMouseEvent({
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1
    });
    
    await client.Input.dispatchMouseEvent({
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1
    });

    logger.info(`Clicked element: ${selector}`);
  }

  private async typeInElement(client: CDPClient, selector: string, text: string): Promise<void> {
    // First click on the element to focus it
    await this.clickElement(client, selector);
    
    // Clear existing content
    await client.Input.dispatchKeyEvent({
      type: 'keyDown',
      key: 'Control'
    });
    await client.Input.dispatchKeyEvent({
      type: 'char',
      text: 'a'
    });
    await client.Input.dispatchKeyEvent({
      type: 'keyUp',
      key: 'Control'
    });
    
    // Type the new text
    for (const char of text) {
      await client.Input.dispatchKeyEvent({
        type: 'char',
        text: char
      });
    }

    logger.info(`Typed text in element: ${selector}`);
  }

  private async toggleElement(client: CDPClient, selector: string): Promise<void> {
    // Simply click the toggle element
    await this.clickElement(client, selector);
    logger.info(`Toggled element: ${selector}`);
  }

  private async takeScreenshot(client: CDPClient, path: string): Promise<void> {
    const screenshot = await client.Page.captureScreenshot({
      format: 'png',
      fullPage: true
    });
    
    writeFileSync(path, screenshot.data, 'base64');
    logger.info(`Screenshot saved: ${path}`);
  }
} 