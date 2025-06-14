import { ChromeExtractor } from './chrome-extractor.js';
import { ChromeAutomation } from './chrome-automation.js';

export interface DevIntegrationOptions {
  // Basic configuration
  enabled?: boolean;
  port?: number;
  host?: string;
  
  // Monitoring options
  monitorReact?: boolean;
  monitorRedux?: boolean;
  monitorGraphQL?: boolean;
  monitorWebSockets?: boolean;
  monitorJWT?: boolean;
  monitorPerformance?: boolean;
  monitorEventLoop?: boolean;
  monitorUserInteractions?: boolean;
  monitorDOM?: boolean;
  monitorCSS?: boolean;
  
  // Automation options
  enableAutomation?: boolean;
  automationScript?: string;
  
  // Logging options
  logLevels?: Array<'error' | 'warning' | 'info' | 'debug'>;
  keywords?: string[];
  excludePatterns?: string[];
  
  // Output options
  outputToConsole?: boolean;
  outputToFile?: boolean;
  outputPath?: string;
}

export class DevIntegration {
  private static instance: DevIntegration;
  private extractor: ChromeExtractor;
  private automation?: ChromeAutomation;
  private options: DevIntegrationOptions;
  private isInitialized: boolean = false;

  private constructor(options: DevIntegrationOptions = {}) {
    this.options = {
      enabled: true,
      port: 9222,
      host: 'localhost',
      monitorReact: true,
      monitorRedux: true,
      monitorGraphQL: true,
      monitorWebSockets: true,
      monitorJWT: true,
      monitorPerformance: true,
      monitorEventLoop: true,
      monitorUserInteractions: true,
      monitorDOM: true,
      monitorCSS: true,
      enableAutomation: false,
      outputToConsole: true,
      ...options
    };

    this.extractor = new ChromeExtractor({
      port: this.options.port,
      host: this.options.host,
      enableReactHookMonitoring: this.options.monitorReact,
      includeReduxMonitoring: this.options.monitorRedux,
      includeGraphqlMonitoring: this.options.monitorGraphQL,
      includeWebSockets: this.options.monitorWebSockets,
      includeJwtMonitoring: this.options.monitorJWT,
      includePerformanceMonitoring: this.options.monitorPerformance,
      includeEventLoopMonitoring: this.options.monitorEventLoop,
      includeUserInteractionRecording: this.options.monitorUserInteractions,
      includeDomMutationMonitoring: this.options.monitorDOM,
      includeCssChangeMonitoring: this.options.monitorCSS,
      filters: {
        logLevels: this.options.logLevels,
        keywords: this.options.keywords,
        excludePatterns: this.options.excludePatterns
      }
    });

    if (this.options.enableAutomation) {
      this.automation = new ChromeAutomation(this.options.port || 9222);
    }
  }

  public static getInstance(options?: DevIntegrationOptions): DevIntegration {
    if (!DevIntegration.instance) {
      DevIntegration.instance = new DevIntegration(options);
    }
    return DevIntegration.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize extractor
      await this.extractor.extract();
      
      // Initialize automation if enabled
      if (this.options.enableAutomation && this.options.automationScript && this.automation) {
        await this.automation.runAutomation({
          scriptPath: this.options.automationScript,
          monitor: true
        });
      }

      this.isInitialized = true;
      console.log('[CLITS] Development integration initialized successfully');
    } catch (error) {
      console.error('[CLITS] Failed to initialize development integration:', error);
      throw error;
    }
  }

  public async captureDebugData(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const logs = await this.extractor.extract();
      
      if (this.options.outputToConsole) {
        console.log('[CLITS Debug Data]', logs);
      }
      
      if (this.options.outputToFile && this.options.outputPath) {
        // Implement file output logic
      }
    } catch (error) {
      console.error('[CLITS] Failed to capture debug data:', error);
    }
  }

  public async runAutomation(scriptPath: string): Promise<void> {
    if (!this.options.enableAutomation || !this.automation) {
      throw new Error('Automation is not enabled in the current configuration');
    }

    try {
      await this.automation.runAutomation({
        scriptPath,
        monitor: true
      });
    } catch (error) {
      console.error('[CLITS] Automation failed:', error);
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    // Implement cleanup logic
    this.isInitialized = false;
  }
}

// Export a default instance for easy use
export const clits = DevIntegration.getInstance();

// Export a function to initialize with custom options
export const initializeCLITS = (options?: DevIntegrationOptions): DevIntegration => {
  return DevIntegration.getInstance(options);
}; 