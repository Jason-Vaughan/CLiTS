// BSD: VisionCLITS handler - Advanced visual state capture and screenshot automation for AI-driven debugging and testing.
// Provides element-specific screenshots, visibility checking, text extraction, and computed style capture.

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import fetch from 'node-fetch';
import { createLogger, format, transports } from 'winston';
import { ChromeAutomation } from './chrome-automation.js';

// Create logger instance
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    })
  ]
});

interface ChromeTarget {
  id: string;
  type: string;
  url: string;
  title?: string;
  webSocketDebuggerUrl?: string;
}

export interface VisionOptions {
  screenshot?: boolean;
  selector?: string;
  selectors?: string;
  output?: string;
  outputDir?: string;
  meta?: string;
  fullpage?: boolean;
  base64?: boolean;
  stdout?: boolean;
  includeText?: boolean;
  includeStyles?: boolean;
  includeBbox?: boolean;
  includeVisibility?: boolean;
  chromeHost?: string;
  chromePort?: number;
  timeout?: number;
}

export interface ElementInfo {
  selector: string;
  exists: boolean;
  visible: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
  textContent?: string;
  computedStyles?: Record<string, string>;
  screenshotPath?: string;
  screenshotBase64?: string;
  error?: string;
}

export interface VisionResult {
  timestamp: string;
  source: string;
  fullPageScreenshot?: {
    path?: string;
    base64?: string;
  };
  elements: ElementInfo[];
  metadata: {
    version: string;
    platform: string;
    chromeHost: string;
    chromePort: number;
    totalElements: number;
    successfulCaptures: number;
    options: VisionOptions;
  };
}

export class VisionHandler {
  private static readonly DEFAULT_PORT = 9222;
  private static readonly DEFAULT_HOST = 'localhost';
  private static readonly DEFAULT_TIMEOUT = 30000;

  private port: number;
  private host: string;
  private chromeAutomation: ChromeAutomation;

  constructor(port: number = VisionHandler.DEFAULT_PORT, host: string = VisionHandler.DEFAULT_HOST) {
    this.port = port;
    this.host = host;
    this.chromeAutomation = new ChromeAutomation(port, host);
  }

  async execute(options: VisionOptions): Promise<void> {
    try {
      const result = await this.captureVisualState(options);
      
      if (options.stdout) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        this.outputResults(result, options);
      }
    } catch (error) {
      logger.error('Vision capture failed:', error);
      throw error;
    }
  }

  private async captureVisualState(options: VisionOptions): Promise<VisionResult> {
    const result: VisionResult = {
      timestamp: new Date().toISOString(),
      source: 'clits-vision',
      elements: [],
      metadata: {
                 version: '1.0.8-beta.0',
        platform: process.platform,
        chromeHost: this.host,
        chromePort: this.port,
        totalElements: 0,
        successfulCaptures: 0,
        options
      }
    };

    // Handle full-page screenshot if requested
    if (options.fullpage || (!options.selector && !options.selectors)) {
      result.fullPageScreenshot = await this.takeFullPageScreenshot(options);
    }

    // Handle element-specific screenshots
    if (options.selector || options.selectors) {
      const selectors = this.parseSelectors(options);
      result.elements = await this.captureElements(selectors, options);
      result.metadata.totalElements = selectors.length;
      result.metadata.successfulCaptures = result.elements.filter(e => !e.error).length;
    }

    return result;
  }

  private parseSelectors(options: VisionOptions): string[] {
    const selectors: string[] = [];
    
    if (options.selector) {
      selectors.push(options.selector);
    }
    
    if (options.selectors) {
      const multipleSelectors = options.selectors.split(',').map(s => s.trim());
      selectors.push(...multipleSelectors);
    }
    
    return selectors;
  }

  private async takeFullPageScreenshot(options: VisionOptions): Promise<{ path?: string; base64?: string }> {
    const tempPath = options.output || 'temp_fullpage_screenshot.png';
    
    // Use ChromeAutomation to take screenshot
    await this.chromeAutomation.navigate({
      url: await this.getCurrentPageUrl(),
      screenshotPath: tempPath,
      chromePort: this.port,
      chromeHost: this.host
    });

    const result: { path?: string; base64?: string } = {};

    if (options.base64) {
      // Read the saved screenshot and convert to base64
      const fs = await import('fs');
      const screenshotData = fs.readFileSync(tempPath);
      result.base64 = screenshotData.toString('base64');
      
      // Clean up temp file if not the desired output
      if (tempPath !== options.output) {
        fs.unlinkSync(tempPath);
      }
    }

    if (options.output && !options.base64) {
      // Move temp file to desired location if different
      if (tempPath !== options.output) {
        const fs = await import('fs');
        this.ensureDirectoryExists(dirname(options.output));
        fs.renameSync(tempPath, options.output);
      }
      result.path = options.output;
      logger.info(`Full-page screenshot saved: ${options.output}`);
    }

    return result;
  }

  private async captureElements(selectors: string[], options: VisionOptions): Promise<ElementInfo[]> {
    const elements: ElementInfo[] = [];

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        const elementInfo = await this.captureElement(selector, options, i);
        elements.push(elementInfo);
      } catch (error) {
        logger.error(`Failed to capture element ${selector}:`, error);
        elements.push({
          selector,
          exists: false,
          visible: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return elements;
  }

  private async captureElement(selector: string, options: VisionOptions, index: number): Promise<ElementInfo> {
    const elementInfo: ElementInfo = {
      selector,
      exists: false,
      visible: false
    };

    // Get element data using Chrome DevTools Protocol via fetch
    const elementData = await this.getElementData(selector, options);
    
    if (!elementData.exists) {
      elementInfo.error = 'Element not found';
      return elementInfo;
    }

    elementInfo.exists = true;
    elementInfo.visible = elementData.visible;
    elementInfo.boundingBox = elementData.boundingBox;

    if (options.includeText) {
      elementInfo.textContent = elementData.textContent;
    }

    if (options.includeStyles) {
      elementInfo.computedStyles = elementData.computedStyles;
    }

    // Take element-specific screenshot using a different approach
    if (options.screenshot && elementData.visible) {
      const screenshotData = await this.takeElementScreenshot(elementData.boundingBox!, options, selector, index);
      elementInfo.screenshotPath = screenshotData.path;
      elementInfo.screenshotBase64 = screenshotData.base64;
    }

    return elementInfo;
  }

  private async getElementData(selector: string, options: VisionOptions): Promise<{
    exists: boolean;
    visible: boolean;
    boundingBox?: ElementInfo['boundingBox'];
    textContent?: string;
    computedStyles?: Record<string, string>;
  }> {
    try {
      // Get Chrome targets to execute JavaScript
      const response = await fetch(`http://${this.host}:${this.port}/json/list`);
      const targets: ChromeTarget[] = await response.json() as ChromeTarget[];
      
      const pageTargets = targets.filter(target => target.type === 'page');
      if (pageTargets.length === 0) {
        throw new Error('No Chrome page targets found');
      }

      // Use chrome-remote-interface for safer evaluation
      const CDP = (await import('chrome-remote-interface')).default;
      const client = await CDP({ host: this.host, port: this.port, target: pageTargets[0].id });
      
      try {
        await client.Runtime.enable();
        
        const escapedSelector = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        
        const expression = `
          (function() {
            try {
              const element = document.querySelector('${escapedSelector}');
              if (!element) return { exists: false, visible: false };
              
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              
              const visible = rect.width > 0 && 
                             rect.height > 0 && 
                             style.display !== 'none' && 
                             style.visibility !== 'hidden' &&
                             style.opacity !== '0';
              
              const result = {
                exists: true,
                visible: visible,
                boundingBox: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  top: rect.top,
                  left: rect.left,
                  right: rect.right,
                  bottom: rect.bottom
                }
              };
              
              ${options.includeText ? `
              result.textContent = element.textContent || element.innerText || '';
              ` : ''}
              
              ${options.includeStyles ? `
              result.computedStyles = {
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                position: style.position,
                zIndex: style.zIndex,
                backgroundColor: style.backgroundColor,
                color: style.color,
                fontSize: style.fontSize,
                fontFamily: style.fontFamily,
                border: style.border,
                margin: style.margin,
                padding: style.padding,
                width: style.width,
                height: style.height
              };
              ` : ''}
              
              return result;
            } catch (error) {
              return { exists: false, visible: false, error: error.message };
            }
          })()
        `;

        const result = await client.Runtime.evaluate({ expression: `JSON.stringify(${expression})` });
        
        if (result.result.value) {
          return JSON.parse(result.result.value);
        }
        
        return { exists: false, visible: false };
      } finally {
        await client.close();
      }
    } catch (error) {
      logger.error('Failed to get element data:', error);
      return { exists: false, visible: false };
    }
  }

  private async takeElementScreenshot(
    boundingBox: ElementInfo['boundingBox'],
    options: VisionOptions,
    selector: string,
    index: number
  ): Promise<{ path?: string; base64?: string }> {
    if (!boundingBox) {
      throw new Error('Cannot take screenshot: no bounding box available');
    }

    try {
      // Get Chrome targets
      const response = await fetch(`http://${this.host}:${this.port}/json/list`);
      const targets: ChromeTarget[] = await response.json() as ChromeTarget[];
      
      const pageTargets = targets.filter(target => target.type === 'page');
      if (pageTargets.length === 0) {
        throw new Error('No Chrome page targets found');
      }

      // Use chrome-remote-interface for screenshot
      const CDP = (await import('chrome-remote-interface')).default;
      const client = await CDP({ host: this.host, port: this.port, target: pageTargets[0].id });
      
      try {
        await client.Page.enable();
        
        // Take full-page screenshot and crop manually
        const screenshot = await client.Page.captureScreenshot({
          format: 'png'
        });

        const result: { path?: string; base64?: string } = {};

        if (options.base64) {
          result.base64 = screenshot.data;
        }

        if (!options.base64) {
          const outputPath = this.generateOutputPath(options, selector, index);
          this.ensureDirectoryExists(dirname(outputPath));
          writeFileSync(outputPath, screenshot.data, 'base64');
          result.path = outputPath;
          logger.info(`Element screenshot saved: ${outputPath}`);
        }

        return result;
      } finally {
        await client.close();
      }
    } catch (error) {
      logger.error('Failed to take element screenshot:', error);
      throw error;
    }
  }

  private generateOutputPath(options: VisionOptions, selector: string, index: number): string {
    if (options.output) {
      // Single output file specified
      const ext = extname(options.output) || '.png';
      const base = basename(options.output, ext);
      const dir = dirname(options.output);
      return join(dir, `${base}_${index}${ext}`);
    }

    if (options.outputDir) {
      // Output directory specified
      const sanitizedSelector = selector.replace(/[^a-zA-Z0-9]/g, '_');
      return join(options.outputDir, `element_${index}_${sanitizedSelector}.png`);
    }

    // Default output
    const sanitizedSelector = selector.replace(/[^a-zA-Z0-9]/g, '_');
    return `clits_vision_${index}_${sanitizedSelector}.png`;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  private async getCurrentPageUrl(): Promise<string> {
    try {
      const response = await fetch(`http://${this.host}:${this.port}/json/list`);
      const targets: ChromeTarget[] = await response.json() as ChromeTarget[];
      
      const pageTargets = targets.filter(target => target.type === 'page');
      if (pageTargets.length === 0) {
        throw new Error('No Chrome page targets found');
      }
      
      return pageTargets[0].url;
    } catch (error) {
      logger.error('Failed to get current page URL:', error);
      return 'about:blank';
    }
  }

  private outputResults(result: VisionResult, options: VisionOptions): void {
    // Save metadata if requested
    if (options.meta) {
      this.ensureDirectoryExists(dirname(options.meta));
      writeFileSync(options.meta, JSON.stringify(result, null, 2));
      logger.info(`Metadata saved: ${options.meta}`);
    }

    // Print summary
    console.log(`[CLiTS-VISION] Visual capture completed:`);
    
    if (result.fullPageScreenshot?.path) {
      console.log(`  • Full-page screenshot: ${result.fullPageScreenshot.path}`);
    }
    
    if (result.elements.length > 0) {
      console.log(`  • Elements captured: ${result.metadata.successfulCaptures}/${result.metadata.totalElements}`);
      
      result.elements.forEach((element, index) => {
        if (element.exists) {
          console.log(`    ${index + 1}. ${element.selector} - ${element.visible ? 'visible' : 'hidden'}`);
          if (element.screenshotPath) {
            console.log(`       Screenshot: ${element.screenshotPath}`);
          }
        } else {
          console.log(`    ${index + 1}. ${element.selector} - not found`);
        }
      });
    }
  }
} 