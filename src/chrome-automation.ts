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
  // New tab discovery features
  discoverTabs?: boolean;
  findSaveButton?: boolean;
  customSavePatterns?: string[];
  tabLabelPattern?: string;
  // Enhanced screenshot and visual features
  takeScreenshot?: boolean;
  base64Output?: boolean;
  fullPageScreenshot?: boolean;
  withMetadata?: boolean;
  annotated?: boolean;
  selectorMap?: boolean;
}

export interface InteractionResult {
  success: boolean;
  timestamp: string;
  screenshotPath?: string;
  screenshotBase64?: string;
  selectorMap?: Array<{
    selector: string;
    text: string;
    coordinates: { x: number; y: number };
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  metadata?: {
    viewport: { width: number; height: number };
    url: string;
    title: string;
    elementCount: number;
  };
  networkLogs?: any[];
  error?: string;
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

  async interact(options: InteractionOptions): Promise<InteractionResult> {
    const client = await this.connectToChrome();
    const networkLogs: any[] = [];
    const result: InteractionResult = {
      success: false,
      timestamp: new Date().toISOString()
    };

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

      // Handle tab discovery
      if (options.discoverTabs) {
        const tabs = await this.discoverTabLabels(client);
        
        // If a specific tab label or pattern is specified, click it
        if (options.clickSelector && tabs.length > 0) {
          let targetTab = null;
          
          if (options.tabLabelPattern) {
            const regex = new RegExp(options.tabLabelPattern, 'i');
            targetTab = tabs.find(tab => regex.test(tab.label));
          } else if (options.clickSelector) {
            targetTab = tabs.find(tab => 
              tab.label.toLowerCase().includes(options.clickSelector!.toLowerCase())
            );
          }
          
          if (targetTab) {
            await this.clickElement(client, targetTab.selector);
            logger.info(`Clicked tab: ${targetTab.label}`);
          }
        }
        
        // Output discovered tabs
        console.log(JSON.stringify({
          success: true,
          tabCount: tabs.length,
          tabs: tabs
        }, null, 2));
      }

      // Handle save button discovery
      if (options.findSaveButton) {
        const saveButton = await this.findSaveButton(client, options.customSavePatterns);
        console.log(JSON.stringify({
          success: true,
          saveButton: saveButton
        }, null, 2));
      }

      // Enhanced screenshot and visual features
      if (options.takeScreenshot || options.screenshotPath) {
        const screenshotData = await this.takeEnhancedScreenshot(client, options);
        result.screenshotPath = screenshotData.path;
        result.screenshotBase64 = screenshotData.base64;
      }

      // Generate selector map if requested
      if (options.selectorMap) {
        result.selectorMap = await this.generateSelectorMap(client);
      }

      // Collect metadata if requested
      if (options.withMetadata) {
        result.metadata = await this.collectPageMetadata(client);
      }

      // Include network logs in result
      if (options.captureNetwork && networkLogs.length > 0) {
        result.networkLogs = networkLogs;
        logger.info(`Captured ${networkLogs.length} network events during interaction`);
      }

      result.success = true;
      logger.info('Interaction completed successfully');
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.success = false;
      logger.error(`Interaction failed: ${result.error}`);
      return result;
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
    
    // CRITICAL FIX: Simplified strategies to reduce failures and improve reliability
    const strategies = [
      // 1. Direct CSS selector (most reliable)
      `document.querySelector('${escapedSelector}')`,
      
      // 2. Attribute-based search (highly reliable)
      `document.querySelector('[data-testid="${escapedSelector.replace(/['"]/g, '')}"]')`,
      `document.querySelector('[aria-label*="${escapedSelector.replace(/['"]/g, '')}"]')`,
      
      // 3. Text content search (for clickable elements)
      `Array.from(document.querySelectorAll('button, a, [role="button"]')).find(el => el.textContent && el.textContent.trim().toLowerCase().includes('${escapedSelector.replace(/['"]/g, '').toLowerCase()}'))`,
      
      // 4. Material-UI patterns (only if selector suggests it)
      ...(selector.includes('Mui') || selector.includes('mui') ? [
        `document.querySelector('.MuiButton-root${escapedSelector.startsWith('.') ? escapedSelector : ''}')`,
        `document.querySelector('.MuiIconButton-root${escapedSelector.startsWith('.') ? escapedSelector : ''}')`,
      ] : []),
      
      // 5. Class-based search (fallback)
      `document.querySelector('[class*="${escapedSelector.replace(/['"]/g, '')}"]')`
    ];

    // CRITICAL FIX: Limit retry attempts to prevent infinite loops
    for (let i = 0; i < Math.min(strategies.length, 5); i++) {
      const strategy = strategies[i];
      try {
        // CRITICAL FIX: Simplified and more robust element detection
        const result = await client.Runtime.evaluate({
          expression: `
            (function() {
              try {
                const element = ${strategy};
                if (!element) return { error: 'element not found' };
                
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                
                // Skip if element is completely hidden
                if (style.display === 'none' || style.visibility === 'hidden') {
                  return { error: 'element hidden' };
                }
                
                // For basic elements, be more lenient
                const isBasic = ${isBasicElement || isCommonElement};
                if (isBasic || (rect.width > 0 && rect.height > 0)) {
                  const x = rect.width > 0 ? rect.left + rect.width / 2 : rect.left + 10;
                  const y = rect.height > 0 ? rect.top + rect.height / 2 : rect.top + 10;
                  
                  return {
                    x: Math.max(x, 10),
                    y: Math.max(y, 10),
                    strategy: ${i},
                    width: rect.width,
                    height: rect.height
                  };
                }
                
                return { error: 'element not visible or too small' };
              } catch (err) {
                return { error: err.message };
              }
            })()
          `
        });
        
        if (result.result?.value && !result.result.value.error) {
          const elementInfo = result.result.value;
          logger.info(`✅ Element found using strategy ${i}: ${strategy.substring(0, 50)}...`);
          return elementInfo;
        } else {
          const errorMsg = result.result?.value?.error || 'Unknown error';
          logger.debug(`❌ Strategy ${i} failed: ${errorMsg}`);
        }
      } catch (error) {
        logger.debug(`❌ Strategy ${i} exception:`, error);
      }
    }

    // CRITICAL FIX: Provide specific error message instead of generic retry loop
    throw new Error(`Element not found: "${selector}". Tried ${strategies.length} strategies. Element may not exist, be hidden, or selector may be incorrect.`);
  }

  private async waitForSelector(client: CDPClient, selector: string, timeout: number = ChromeAutomation.DEFAULT_TIMEOUT): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = Math.min(50, timeout / 500); // Limit attempts based on timeout
    
    while (Date.now() - startTime < timeout && attempts < maxAttempts) {
      try {
        const elementInfo = await this.findElementWithFallback(client, selector);
        if (elementInfo) {
          logger.info(`✅ Element found: ${selector} (attempt ${attempts + 1})`);
          return;
        }
      } catch (error) {
        // CRITICAL FIX: Don't retry on specific errors that won't resolve
        if (error instanceof Error && error.message.includes('Element not found:')) {
          throw error; // Immediately fail for definitive not-found errors
        }
        logger.debug(`⏳ Attempt ${attempts + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay between attempts
    }
    
    throw new Error(`Timeout waiting for selector: "${selector}" after ${attempts} attempts in ${Date.now() - startTime}ms. Element may not exist or be accessible.`);
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

  /**
   * Discovers all tab labels in a dialog or tabbed interface
   * @param client CDP client instance
   * @returns Array of tab labels with their selectors
   */
  async discoverTabLabels(client: CDPClient): Promise<Array<{ label: string; selector: string; index: number }>> {
    const result = await client.Runtime.evaluate({
      expression: `
        JSON.stringify((function() {
          const tabs = Array.from(document.querySelectorAll('.MuiTab-root, [role="tab"], .MuiTabs-root .MuiTab-root'));
          return tabs.map((tab, index) => ({
            label: tab.textContent?.trim() || tab.getAttribute('aria-label') || tab.getAttribute('title') || '',
            selector: tab.getAttribute('data-testid') || 
                     (tab.getAttribute('aria-label') ? '[aria-label="' + tab.getAttribute('aria-label') + '"]' : '') ||
                     (tab.textContent?.trim() ? ':contains("' + tab.textContent.trim() + '")' : '') ||
                     '.MuiTab-root:nth-child(' + (index + 1) + ')',
            index: index,
            isActive: tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('Mui-selected'),
            isDisabled: tab.getAttribute('aria-disabled') === 'true' || tab.classList.contains('Mui-disabled')
          })).filter(tab => tab.label);
        })())
      `
    });

    if (result.result.value) {
      return JSON.parse(result.result.value);
    }
    return [];
  }

  /**
   * Finds the best save button in a dialog using multiple strategies
   * @param client CDP client instance
   * @param customText Optional custom text patterns for save buttons
   * @returns Save button element info or null
   */
  async findSaveButton(client: CDPClient, customText?: string[]): Promise<{ x: number; y: number; strategy: string } | null> {
    const savePatterns = customText || ['save', 'update', 'apply', 'ok', 'done', 'submit', 'confirm'];

    const result = await client.Runtime.evaluate({
      expression: `
        JSON.stringify((function() {
          const savePatterns = ${JSON.stringify(savePatterns)};
          const patternRegex = /${savePatterns.join('|')}/i;
          
          // Strategy 1: Find by text content
          const buttonsByText = Array.from(document.querySelectorAll('.MuiDialog-root button, .MuiModal-root button, [role="dialog"] button'))
            .filter(btn => patternRegex.test(btn.textContent?.trim() || ''));
          if (buttonsByText.length > 0) {
            const rect = buttonsByText[0].getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              strategy: 'text-content',
              text: buttonsByText[0].textContent?.trim()
            };
          }

          // Strategy 2: Find by type="submit"
          const submitButtons = Array.from(document.querySelectorAll('.MuiDialog-root button[type="submit"], .MuiModal-root button[type="submit"], .MuiDialogActions-root button[type="submit"]'));
          if (submitButtons.length > 0) {
            const rect = submitButtons[0].getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              strategy: 'submit-type',
              text: submitButtons[0].textContent?.trim()
            };
          }

          // Strategy 3: Find by aria-label or title
          const ariaButtons = Array.from(document.querySelectorAll('.MuiDialog-root button, .MuiModal-root button'))
            .filter(btn => patternRegex.test(btn.getAttribute('aria-label') || '') || patternRegex.test(btn.getAttribute('title') || ''));
          if (ariaButtons.length > 0) {
            const rect = ariaButtons[0].getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              strategy: 'aria-label',
              ariaLabel: ariaButtons[0].getAttribute('aria-label'),
              title: ariaButtons[0].getAttribute('title')
            };
          }

          // Strategy 4: Find icon buttons with save-like icons
          const iconButtons = Array.from(document.querySelectorAll('.MuiDialog-root .MuiIconButton-root, .MuiDialog-root button'))
            .filter(btn => {
              const svg = btn.querySelector('.MuiSvgIcon-root, svg');
              if (!svg) return false;
              const ariaLabel = btn.getAttribute('aria-label') || '';
              const title = btn.getAttribute('title') || '';
              return patternRegex.test(ariaLabel) || patternRegex.test(title);
            });
          if (iconButtons.length > 0) {
            const rect = iconButtons[0].getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              strategy: 'icon-button',
              ariaLabel: iconButtons[0].getAttribute('aria-label')
            };
          }

          // Strategy 5: Find in action areas (last resort)
          const actionButtons = Array.from(document.querySelectorAll('.MuiDialogActions-root button:not([disabled]), .modal-footer button:not([disabled])'));
          if (actionButtons.length === 1) {
            const rect = actionButtons[0].getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              strategy: 'single-action-button',
              text: actionButtons[0].textContent?.trim(),
              warning: 'Only one enabled button found in action area - assuming it is the save button'
            };
          }

          // Strategy 6: Primary button in action area
          const primaryButtons = Array.from(document.querySelectorAll('.MuiDialogActions-root .MuiButton-containedPrimary, .MuiDialogActions-root .MuiButton-root[color="primary"]'));
          if (primaryButtons.length > 0) {
            const rect = primaryButtons[0].getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              strategy: 'primary-button',
              text: primaryButtons[0].textContent?.trim()
            };
          }

          return { error: 'No save button found with any strategy' };
        })())
      `
    });

    if (result.result.value) {
      const buttonInfo = JSON.parse(result.result.value);
      if (buttonInfo.error) {
        logger.warn(`Save button detection failed: ${buttonInfo.error}`);
        return null;
      }
      logger.info(`Save button found using strategy: ${buttonInfo.strategy}`, buttonInfo);
      return buttonInfo;
    }

    return null;
  }

  // Enhanced screenshot capabilities with base64 support
  private async takeEnhancedScreenshot(client: CDPClient, options: InteractionOptions): Promise<{ path?: string; base64?: string }> {
    const screenshotOptions: any = {
      format: 'png'
    };

    if (options.fullPageScreenshot) {
      screenshotOptions.fullPage = true;
    }

    const screenshot = await client.Page.captureScreenshot(screenshotOptions);
    const result: { path?: string; base64?: string } = {};

    if (options.base64Output) {
      result.base64 = screenshot.data;
    }

    if (options.screenshotPath && !options.base64Output) {
      writeFileSync(options.screenshotPath, screenshot.data, 'base64');
      result.path = options.screenshotPath;
      logger.info(`Enhanced screenshot saved: ${options.screenshotPath}`);
    }

    return result;
  }

  // Generate map of clickable elements with coordinates
  private async generateSelectorMap(client: CDPClient): Promise<Array<{
    selector: string;
    text: string;
    coordinates: { x: number; y: number };
    boundingBox: { x: number; y: number; width: number; height: number };
  }>> {
    const result = await client.Runtime.evaluate({
      expression: `
        JSON.stringify((function() {
          const selectors = [
            'button', 'a', 'input[type="button"]', 'input[type="submit"]',
            '[role="button"]', '[onclick]', '.MuiButton-root', '.MuiIconButton-root',
            '.MuiFab-root', '.MuiToggleButton-root', '[data-testid]',
            'input[type="checkbox"]', 'input[type="radio"]', 'select'
          ];
          
          const elements = [];
          selectors.forEach(selector => {
            const nodes = document.querySelectorAll(selector);
            nodes.forEach((element, index) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              
              // Only include visible elements
              if (rect.width > 0 && rect.height > 0 && 
                  style.display !== 'none' && style.visibility !== 'hidden') {
                elements.push({
                  selector: selector + ':nth-of-type(' + (index + 1) + ')',
                  text: element.textContent?.trim() || 
                        element.getAttribute('aria-label') || 
                        element.getAttribute('title') || 
                        element.getAttribute('alt') || '',
                  coordinates: {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  },
                  boundingBox: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                  }
                });
              }
            });
          });
          
          return elements;
        })())
      `
    });

    if (result.result.value) {
      return JSON.parse(result.result.value);
    }
    return [];
  }

  // Collect page metadata
  private async collectPageMetadata(client: CDPClient): Promise<{
    viewport: { width: number; height: number };
    url: string;
    title: string;
    elementCount: number;
  }> {
    const result = await client.Runtime.evaluate({
      expression: `
        JSON.stringify({
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          url: window.location.href,
          title: document.title,
          elementCount: document.querySelectorAll('*').length
        })
      `
    });

    if (result.result.value) {
      return JSON.parse(result.result.value);
    }

    return {
      viewport: { width: 0, height: 0 },
      url: '',
      title: '',
      elementCount: 0
    };
  }

  // Visual element selection methods
  async findElementByText(text: string): Promise<string> {
    // Return a selector that can be used to find elements containing the text
    return `*:contains("${text}")`;
  }

  async findElementByColor(color: string): Promise<string> {
    // This is a simplified implementation - in reality, you'd need to analyze computed styles
    // For now, return a selector that looks for elements with the color in their class name or style
    return `[style*="${color}"], [class*="${color}"]`;
  }

  async findElementByRegion(region: string): Promise<string> {
    // Convert region to approximate CSS selectors based on viewport positioning
    const regionMap: { [key: string]: string } = {
      'top-left': ':first-child',
      'top-right': ':last-child',
      'bottom-left': ':nth-last-child(2)',
      'bottom-right': ':last-child',
      'center': ':nth-child(n+3):nth-last-child(n+3)'
    };

    return regionMap[region] || region;
  }

  async findElementByDescription(description: string): Promise<string> {
    // This is experimental - use text-based matching for now
    // In a full implementation, this could use AI vision to analyze screenshots
    const keywords = description.toLowerCase().split(' ');
    const commonMappings: { [key: string]: string } = {
      'button': 'button',
      'link': 'a',
      'input': 'input',
      'text': 'input[type="text"]',
      'edit': '[contenteditable], input, textarea',
      'save': 'button[type="submit"], button:contains("save")',
      'close': 'button:contains("close"), .close, [aria-label*="close"]',
      'menu': '[role="menu"], .menu',
      'dropdown': 'select, [role="combobox"]'
    };

    for (const keyword of keywords) {
      if (commonMappings[keyword]) {
        return commonMappings[keyword];
      }
    }

    // Fallback: search by text content
    return `*:contains("${description}")`;
  }

  // Discover all CSS selectors on the page
  async discoverAllSelectors(): Promise<string[]> {
    const client = await this.connectToChrome();
    
    try {
      const result = await client.Runtime.evaluate({
        expression: `
          JSON.stringify((function() {
            const selectors = new Set();
            const elements = document.querySelectorAll('*');
            
            elements.forEach(element => {
              // Add tag selectors
              selectors.add(element.tagName.toLowerCase());
              
              // Add class selectors
              if (element.className && typeof element.className === 'string') {
                element.className.split(' ').forEach(cls => {
                  if (cls.trim()) selectors.add('.' + cls.trim());
                });
              }
              
              // Add ID selectors
              if (element.id) {
                selectors.add('#' + element.id);
              }
              
              // Add attribute selectors
              Array.from(element.attributes).forEach(attr => {
                if (attr.name === 'data-testid') {
                  selectors.add('[data-testid="' + attr.value + '"]');
                }
                if (attr.name === 'aria-label') {
                  selectors.add('[aria-label="' + attr.value + '"]');
                }
                if (attr.name === 'type') {
                  selectors.add('[type="' + attr.value + '"]');
                }
              });
            });
            
            return Array.from(selectors).sort();
          })())
        `
      });

      if (result.result.value) {
        return JSON.parse(result.result.value);
      }
      return [];
    } finally {
      await client.close();
    }
  }

  // Generate comprehensive element map
  async generateElementMap(): Promise<Array<{
    tag: string;
    selector: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isClickable: boolean;
  }>> {
    const client = await this.connectToChrome();
    
    try {
      const result = await client.Runtime.evaluate({
        expression: `
          JSON.stringify((function() {
            const elements = [];
            const allElements = document.querySelectorAll('*');
            
            allElements.forEach((element, index) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              
              // Only include elements in viewport with reasonable size
              if (rect.width > 5 && rect.height > 5 && 
                  rect.top >= 0 && rect.left >= 0 &&
                  rect.top < window.innerHeight && rect.left < window.innerWidth &&
                  style.display !== 'none' && style.visibility !== 'hidden') {
                
                const isClickable = element.tagName.toLowerCase() === 'button' ||
                                  element.tagName.toLowerCase() === 'a' ||
                                  element.hasAttribute('onclick') ||
                                  element.getAttribute('role') === 'button' ||
                                  style.cursor === 'pointer';
                
                let selector = element.tagName.toLowerCase();
                if (element.id) {
                  selector = '#' + element.id;
                } else if (element.className && typeof element.className === 'string') {
                  const classes = element.className.split(' ').filter(c => c.trim());
                  if (classes.length > 0) {
                    selector = '.' + classes[0];
                  }
                } else if (element.getAttribute('data-testid')) {
                  selector = '[data-testid="' + element.getAttribute('data-testid') + '"]';
                }
                
                elements.push({
                  tag: element.tagName.toLowerCase(),
                  selector: selector,
                  text: element.textContent?.trim().substring(0, 50) || '',
                  x: Math.round(rect.left + rect.width / 2),
                  y: Math.round(rect.top + rect.height / 2),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                  isClickable: isClickable
                });
              }
            });
            
            return elements;
          })())
        `
      });

      if (result.result.value) {
        return JSON.parse(result.result.value);
      }
      return [];
    } finally {
      await client.close();
    }
  }
} 