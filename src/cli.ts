#!/usr/bin/env node

// BSD: Entry point for the CLiTS-INSPECTOR CLI tool. Handles command-line arguments and orchestrates log/data extraction.

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { PathResolver } from './utils/path-resolver.js';
import { ChromeExtractor } from './chrome-extractor.js';
import { ChromeAutomation } from './chrome-automation.js';
import inquirer from 'inquirer';
// import tabtab from 'tabtab'; // Disabled to prevent automatic shell completion prompts

const pathResolver = PathResolver.getInstance();
const packageJson = JSON.parse(readFileSync(pathResolver.resolvePath('package.json'), 'utf8'));

const program = new Command();

async function main(): Promise<void> {
  program
    .name('clits')
    .description('CLI tool for extracting and sharing debugging data for AI and web projects (CLITS)')
    .version(packageJson.version)
    .addHelpText('after', `
Examples:
  $ clits extract --chrome --interactive
  $ clits extract --source ./logs --patterns "*.log" --output-file ./output.json
  $ clits navigate --url "http://localhost:5173/displays" --wait-for ".displays-manager"
  $ clits navigate --link-text "Display Manager" --wait-for ".displays-manager"
  $ clits navigate --url-contains "display" --screenshot "navigation.png"
  $ clits interact --click "[data-testid='edit-btn']" --wait-for ".edit-dialog" --capture-network
  $ clits automate --script automation.json --monitor --save-results results.json
  $ clits discover-links --chrome-port 9222
  $ clits vision --screenshot --selector ".error-message" --output "error.png" --meta "error.json"
  $ clits vision --screenshot --selectors ".error,.warning" --output-dir "./screenshots"
  $ clits vision --screenshot --fullpage --output "page.png" --base64
    `);

  program
    .command('extract')
    .description('Extract debugging data from specified sources like local files or a running Chrome instance.')
    .option('-s, --source <path>', 'Source directory or file path to extract logs from')
    .option('-p, --patterns <patterns...>', 'File patterns to match (e.g., "*.log")')
    .option('-m, --max-size <size>', 'Maximum file size in MB to process', '10')
    .option('-f, --max-files <count>', 'Maximum number of files to process', '100')
    .option('--chrome', 'Extract logs and other data from a running Chrome instance.')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol.', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol.', '9222')
    .option('--no-network', 'Disable network log extraction from Chrome DevTools.')
    .option('--no-console', 'Disable console log extraction from Chrome DevTools.')
    .option('--log-levels <levels>', 'Comma-separated list of log levels to include (e.g., "error,warning").', 'error,warning,info,debug,log')
    .option('--sources <sources>', 'Comma-separated list of log sources to include (e.g., "network,console").', 'network,console,devtools')
    .option('--domains <domains>', 'Comma-separated list of domain patterns to filter network requests.')
    .option('--keywords <keywords>', 'Comma-separated list of keywords to filter logs.')
    .option('--exclude <patterns>', 'Comma-separated list of regex patterns to exclude logs.')
    .option('--group-by-source', 'Group extracted logs by their source (e.g., network, console).')
    .option('--group-by-level', 'Group extracted logs by their log level (e.g., error, warning).')
    .option('--no-timestamps', 'Omit timestamps from the log output.')
    .option('--no-stack-traces', 'Omit stack traces from error logs.')
    .option('--output-file <path>', 'Path to save the extracted logs to a file.')
    .option('--error-summary', 'Include a summary of error frequencies in the output.')
    .option('--live-mode [duration]', 'Run in live mode, continuously extracting logs for a specified duration in seconds.', '60')
    .option('--interactive-login', 'Prompt for manual login within the browser before extraction.')
    .option('--target-id <id>', 'Specify a Chrome tab/page Target ID to connect to, skipping interactive selection.')
    .option('-i, --interactive', 'Run in interactive mode to select monitoring options.')
    .action(async (options) => {
      try {
        const extractionOptions: any = { ...options };

        if (options.interactive) {
          const answers = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'monitoring',
              message: 'Select monitoring features to enable:',
              choices: [
                { name: 'React Hook Monitoring', value: 'enableReactHookMonitoring' },
                { name: 'WebSocket Monitoring', value: 'includeWebSockets' },
                { name: 'JWT Monitoring', value: 'includeJwtMonitoring' },
                { name: 'GraphQL Monitoring', value: 'includeGraphqlMonitoring' },
                { name: 'Redux State Monitoring', value: 'includeReduxMonitoring' },
                { name: 'Performance Monitoring', value: 'includePerformanceMonitoring' },
                { name: 'Event Loop Monitoring', value: 'includeEventLoopMonitoring' },
                { name: 'User Interaction Recording', value: 'includeUserInteractionRecording' },
                { name: 'DOM Mutation Monitoring', value: 'includeDomMutationMonitoring' },
                { name: 'CSS Change Monitoring', value: 'includeCssChangeMonitoring' },
                { name: 'Headless Mode', value: 'headless' },
              ]
            }
          ]);

          answers.monitoring.forEach((feature: string) => {
            extractionOptions[feature] = true;
          });
        }

        // Chrome DevTools extraction
        if (extractionOptions.chrome) {
          const chromeExtractor = new ChromeExtractor({
            port: parseInt(extractionOptions.chromePort),
            host: extractionOptions.chromeHost,
            includeNetwork: extractionOptions.network !== false,
            includeConsole: extractionOptions.console !== false,
            enableReactHookMonitoring: extractionOptions.enableReactHookMonitoring,
            includeWebSockets: extractionOptions.includeWebSockets,
            includeJwtMonitoring: extractionOptions.includeJwtMonitoring,
            includeGraphqlMonitoring: extractionOptions.includeGraphqlMonitoring,
            includeReduxMonitoring: extractionOptions.includeReduxMonitoring,
            includePerformanceMonitoring: extractionOptions.includePerformanceMonitoring,
            includeEventLoopMonitoring: extractionOptions.includeEventLoopMonitoring,
            includeUserInteractionRecording: extractionOptions.includeUserInteractionRecording,
            includeDomMutationMonitoring: extractionOptions.includeDomMutationMonitoring,
            includeCssChangeMonitoring: extractionOptions.includeCssChangeMonitoring,
            headless: extractionOptions.headless,
            filters: {
              logLevels: extractionOptions.logLevels?.split(',') as any[],
              sources: extractionOptions.sources?.split(',') as any[],
              domains: extractionOptions.domains?.split(','),
              keywords: extractionOptions.keywords?.split(','),
              excludePatterns: extractionOptions.exclude?.split(','),
            },
            format: {
              groupBySource: extractionOptions.groupBySource,
              groupByLevel: extractionOptions.groupByLevel,
              includeTimestamp: extractionOptions.noTimestamps !== true,
              includeStackTrace: extractionOptions.noStackTraces !== true,
            },
            reconnect: {
              enabled: true, // Always enable reconnection for CLI usage
              maxAttempts: 5,
              delayBetweenAttemptsMs: 2000,
            },
          });

          let targetId: string | undefined = extractionOptions.targetId;

          if (!targetId) {
            const targets = await chromeExtractor.getDebuggablePageTargets();
            if (targets.length === 0) {
              console.error('Error: No debuggable Chrome tabs found. Please open a new tab in Chrome running with --remote-debugging-port=9222');
              process.exit(1);
            } else if (targets.length === 1) {
              targetId = targets[0].id;
              console.log(`Automatically selected target: ${targets[0].title || targets[0].url}`);
            } else {
              const choices = targets.map((t, index) => ({
                name: `[${index + 1}] ${t.title || t.url} (ID: ${t.id})`,
                value: t.id,
              }));

              const answer = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'selectedTargetId',
                  message: 'Multiple debuggable Chrome tabs found. Please select one:',
                  choices: choices,
                },
              ]);
              targetId = answer.selectedTargetId;
            }
          }
          
          if (!targetId) {
            console.error('Error: No Chrome target selected.');
            process.exit(1);
          }

          console.log('[CLiTS-INSPECTOR] Starting Chrome DevTools extraction...');
          const extractedLogs = await chromeExtractor.extract(targetId);
          console.log(JSON.stringify(extractedLogs, null, 2));
          return;
        }

        // File system extraction
        if (extractionOptions.source) {
          const { exists, error } = pathResolver.validatePath(extractionOptions.source);
          if (!exists) {
            console.error(`[CLiTS-INSPECTOR] Error: Invalid source path. ${error}. Please ensure the path is correct and accessible.`);
            process.exit(1);
          }
          console.log(`Extracting logs from ${extractionOptions.source}...`);
          // TODO: Implement file system extraction
          return;
        }

        console.error('[CLiTS-INSPECTOR] Error: No extraction source specified. Use --source for files or --chrome for Chrome DevTools.');
        process.exit(1);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`[CLiTS-INSPECTOR] An error occurred during extraction: ${error.message}`);
          // Add more specific error handling here if needed
          if (error.message.includes('Chrome target with ID') || error.message.includes('No debuggable Chrome tabs found')) {
            console.error('[CLiTS-INSPECTOR] Please ensure Chrome is running with remote debugging enabled (--remote-debugging-port=9222) and a debuggable tab is open.');
          }
        } else {
          console.error(`[CLiTS-INSPECTOR] An unexpected error occurred: ${String(error)}`);
        }
        process.exit(1);
      }
    });

  // Navigate command
  program
    .command('navigate')
    .description('Navigate to URLs and wait for elements')
    .option('--url <url>', 'Navigate to specific URL')
    .option('--link-text <text>', 'Navigate by finding link with matching text (fuzzy matching)')
    .option('--url-contains <pattern>', 'Navigate by finding link with URL containing pattern')
    .option('--wait-for <selector>', 'Wait for CSS selector to appear')
    .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
    .option('--screenshot <path>', 'Take screenshot after navigation')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol', '9222')
    .action(async (options) => {
      try {
        // Validate that at least one navigation method is provided
        if (!options.url && !options.linkText && !options.urlContains) {
          console.error('[CLiTS-NAVIGATOR] Error: Must specify one of --url, --link-text, or --url-contains');
          process.exit(1);
        }
        
        // If using link-text or url-contains, use clits-inspect to find and navigate
        if (options.linkText || options.urlContains) {
          const { spawn } = await import('child_process');
          const { fileURLToPath } = await import('url');
          const { dirname, resolve } = await import('path');
          
          // Build the clits-inspect command
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          const inspectPath = resolve(__dirname, 'cli-inspect.js');
          
                     const args = [
             inspectPath,
             '--auto',
             '--json',
             '--port', options.chromePort,
             '--host', options.chromeHost
           ];
          
          if (options.linkText) {
            args.push('--action', 'navigate-by-text', '--link-text', options.linkText);
          } else if (options.urlContains) {
            args.push('--action', 'navigate-by-url', '--url-contains', options.urlContains);
          }
          
          const inspectProcess = spawn('node', args, { stdio: 'pipe' });
          
          let output = '';
          let error = '';
          
          inspectProcess.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          inspectProcess.stderr.on('data', (data) => {
            error += data.toString();
          });
          
          inspectProcess.on('close', async (code) => {
            if (code === 0) {
              try {
                const result = JSON.parse(output);
                if (result.success && result.navigated) {
                  console.log(`[CLiTS-NAVIGATOR] Successfully navigated via ${result.navigated.method}: ${result.navigated.text} -> ${result.navigated.url}`);
                  
                                     // If wait-for or screenshot options are provided, handle them with ChromeAutomation
                   if (options.waitFor || options.screenshot) {
                     const automation = new ChromeAutomation(
                       parseInt(options.chromePort),
                       options.chromeHost
                     );
                     
                     // Use current URL since we already navigated
                     await automation.navigate({
                       url: result.navigated.url,
                       waitForSelector: options.waitFor,
                       timeout: parseInt(options.timeout),
                       screenshotPath: options.screenshot,
                       chromePort: parseInt(options.chromePort),
                       chromeHost: options.chromeHost
                     });
                     
                     if (options.waitFor) {
                       console.log(`[CLiTS-NAVIGATOR] Element found: ${options.waitFor}`);
                     }
                     if (options.screenshot) {
                       console.log(`[CLiTS-NAVIGATOR] Screenshot saved: ${options.screenshot}`);
                     }
                   }
                } else {
                  console.error(`[CLiTS-NAVIGATOR] Navigation failed: ${result.error || 'Unknown error'}`);
                  process.exit(1);
                }
              } catch (parseError) {
                console.error('[CLiTS-NAVIGATOR] Failed to parse navigation result:', output);
                process.exit(1);
              }
            } else {
              console.error('[CLiTS-NAVIGATOR] Navigation failed:', error);
              process.exit(1);
            }
          });
          
          return;
        }

        // Traditional URL-based navigation
        const automation = new ChromeAutomation(
          parseInt(options.chromePort),
          options.chromeHost
        );

        const navigationResult = await automation.navigate({
          url: options.url,
          waitForSelector: options.waitFor,
          timeout: parseInt(options.timeout),
          screenshotPath: options.screenshot,
          chromePort: parseInt(options.chromePort),
          chromeHost: options.chromeHost
        });

        console.log(`[CLiTS-NAVIGATOR] Successfully navigated to: ${navigationResult.actualUrl}`);
      } catch (error) {
        console.error(`[CLiTS-NAVIGATOR] Navigation failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Interact command
  program
    .command('interact')
    .description('Interact with page elements and capture visual state')
    .option('--click <selector>', 'Click on element matching CSS selector')
    .option('--click-text <text>', 'Click element containing specific text')
    .option('--click-color <color>', 'Click element with specific color (hex, rgb, or name)')
    .option('--click-region <region>', 'Click by screen region (top-left, top-right, bottom-left, bottom-right, center)')
    .option('--click-description <description>', 'Click by visual description (experimental)')
    .option('--type <selector> <text>', 'Type text into input field')
    .option('--toggle <selector>', 'Toggle switch/checkbox elements')
    .option('--wait-for <selector>', 'Wait for element after interaction')
    .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
    .option('--capture-network', 'Capture network requests during interaction')
    .option('--screenshot [path]', 'Take screenshot after interaction (optional file path)')
    .option('--base64', 'Output screenshot as base64 to stdout')
    .option('--stdout', 'Output results to stdout (JSON format)')
    .option('--with-metadata', 'Include element positions and text in screenshot data')
    .option('--annotated', 'Add visual annotations (boxes around clickable elements)')
    .option('--selector-map', 'Output map of clickable elements with coordinates')
    .option('--fullpage', 'Take full-page screenshot instead of viewport')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol', '9222')
    .action(async (options) => {
      try {
        const automation = new ChromeAutomation(
          parseInt(options.chromePort),
          options.chromeHost
        );

        // Parse type command if provided
        let typeSelector: string | undefined;
        let typeText: string | undefined;
        if (options.type) {
          const typeArgs = options.type.split(' ');
          if (typeArgs.length >= 2) {
            typeSelector = typeArgs[0];
            typeText = typeArgs.slice(1).join(' ');
          }
        }

        // Handle visual element selection methods
        let clickSelector = options.click;
        let useJavaScriptExpression = false;
        let jsExpression = '';
        
        if (options.clickText) {
          // Use JavaScript evaluation for text-based selection
          jsExpression = await automation.findElementByText(options.clickText);
          useJavaScriptExpression = true;
          clickSelector = '__JS_EXPRESSION__'; // Special marker for JS evaluation
        } else if (options.clickColor) {
          // Use JavaScript evaluation for color-based selection
          jsExpression = await automation.findElementByColor(options.clickColor);
          useJavaScriptExpression = true;
          clickSelector = '__JS_EXPRESSION__'; // Special marker for JS evaluation
        } else if (options.clickRegion) {
          // Use JavaScript evaluation for region-based selection
          jsExpression = await automation.findElementByRegion(options.clickRegion);
          useJavaScriptExpression = true;
          clickSelector = '__JS_EXPRESSION__'; // Special marker for JS evaluation
        } else if (options.clickDescription) {
          // Use JavaScript evaluation for description-based selection
          jsExpression = await automation.findElementByDescription(options.clickDescription);
          useJavaScriptExpression = true;
          clickSelector = '__JS_EXPRESSION__'; // Special marker for JS evaluation
        }

        // Enhanced interaction options
        const interactionResult = await automation.interact({
          clickSelector,
          typeSelector,
          typeText,
          toggleSelector: options.toggle,
          waitForSelector: options.waitFor,
          timeout: parseInt(options.timeout),
          captureNetwork: options.captureNetwork,
          screenshotPath: typeof options.screenshot === 'string' ? options.screenshot : undefined,
          takeScreenshot: options.screenshot !== undefined,
          base64Output: options.base64,
          fullPageScreenshot: options.fullpage,
          withMetadata: options.withMetadata,
          annotated: options.annotated,
          selectorMap: options.selectorMap,
          chromePort: parseInt(options.chromePort),
          chromeHost: options.chromeHost,
          // Pass JavaScript expression for advanced element selection
          useJavaScriptExpression: useJavaScriptExpression,
          jsExpression: jsExpression
        });

        // Handle output format
        if (options.stdout || options.base64) {
          console.log(JSON.stringify(interactionResult, null, 2));
        } else {
          console.log('[CLiTS-INTERACTOR] Interaction completed successfully');
          if (interactionResult.screenshotPath) {
            console.log(`[CLiTS-INTERACTOR] Screenshot saved: ${interactionResult.screenshotPath}`);
          }
          if (interactionResult.selectorMap) {
            console.log(`[CLiTS-INTERACTOR] Found ${interactionResult.selectorMap.length} clickable elements`);
          }
        }
      } catch (error) {
        console.error(`[CLiTS-INTERACTOR] Interaction failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Automate command
  program
    .command('automate')
    .alias('automation')
    .description('Run automation scripts')
    .option('--script <path>', 'JSON file with automation steps')
    .option('--stdin', 'Read automation script from stdin')
    .option('--monitor', 'Enable monitoring during automation')
    .option('--save-results <path>', 'Save results to file')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol', '9222')
    .action(async (options) => {
      try {
        const automation = new ChromeAutomation(
          parseInt(options.chromePort),
          options.chromeHost
        );

        let scriptContent: string;
        
        if (options.stdin) {
          // Read from stdin
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk);
          }
          scriptContent = Buffer.concat(chunks).toString();
        } else if (options.script) {
          // Read from file
          const fs = await import('fs');
          scriptContent = fs.readFileSync(options.script, 'utf8');
        } else {
          throw new Error('Either --script <path> or --stdin must be provided');
        }

        // Validate the script
        JSON.parse(scriptContent); // Just validate, don't store
        
        // Create a temporary file if reading from stdin
        let tempScriptPath = options.script;
        if (options.stdin) {
          const os = await import('os');
          const path = await import('path');
          const fs = await import('fs');
          tempScriptPath = path.join(os.tmpdir(), `clits_automation_${Date.now()}.json`);
          fs.writeFileSync(tempScriptPath, scriptContent);
        }

        const result = await automation.runAutomation({
          scriptPath: tempScriptPath!,
          monitor: options.monitor,
          saveResultsPath: options.saveResults,
          chromePort: parseInt(options.chromePort),
          chromeHost: options.chromeHost
        });

        // Clean up temp file if created
        if (options.stdin && tempScriptPath !== options.script) {
          const fs = await import('fs');
          try {
            fs.unlinkSync(tempScriptPath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        if (result.success) {
          console.log(`[CLiTS-AUTOMATOR] Automation completed successfully: ${result.completedSteps}/${result.totalSteps} steps`);
          // Output results to console for testing
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.error(`[CLiTS-AUTOMATOR] Automation failed: ${result.error}`);
          console.error(`[CLiTS-AUTOMATOR] Completed ${result.completedSteps}/${result.totalSteps} steps`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`[CLiTS-AUTOMATOR] Automation failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Inspect command - Interactive website inspector with Chrome Remote Control
  program
    .command('inspect')
    .description('Interactive website inspector with Chrome Remote Control and selector discovery')
    .option('--find-selectors', 'List all available CSS selectors on the page')
    .option('--find-clickable', 'List all clickable elements with coordinates')
    .option('--element-map', 'Generate visual map of page elements')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol', '9222')
    .option('--output-format <format>', 'Output format: json, table, or interactive', 'interactive')
    .action(async (options) => {
      try {
        // Handle discovery tools
        if (options.findSelectors || options.findClickable || options.elementMap) {
          const automation = new ChromeAutomation(
            parseInt(options.chromePort),
            options.chromeHost
          );

          if (options.findSelectors) {
            const selectors = await automation.discoverAllSelectors();
            if (options.outputFormat === 'json') {
              console.log(JSON.stringify({ selectors }, null, 2));
            } else {
              console.log('[CLiTS-INSPECTOR] Available CSS Selectors:');
              selectors.forEach((selector: string, index: number) => {
                console.log(`  ${index + 1}. ${selector}`);
              });
            }
          }

          if (options.findClickable) {
            const interactionResult = await automation.interact({
              selectorMap: true,
              chromePort: parseInt(options.chromePort),
              chromeHost: options.chromeHost
            });

            if (options.outputFormat === 'json') {
              console.log(JSON.stringify({ clickableElements: interactionResult.selectorMap }, null, 2));
            } else {
              console.log('[CLiTS-INSPECTOR] Clickable Elements:');
              interactionResult.selectorMap?.forEach((element, index) => {
                console.log(`  ${index + 1}. ${element.selector}`);
                console.log(`     Text: "${element.text}"`);
                console.log(`     Coordinates: (${element.coordinates.x}, ${element.coordinates.y})`);
                console.log(`     Bounding Box: ${element.boundingBox.width}x${element.boundingBox.height}`);
                console.log('');
              });
            }
          }

          if (options.elementMap) {
            const elementMap = await automation.generateElementMap();
            if (options.outputFormat === 'json') {
              console.log(JSON.stringify({ elementMap }, null, 2));
            } else {
              console.log('[CLiTS-INSPECTOR] Element Map:');
              elementMap.forEach((element: any, index: number) => {
                console.log(`  ${index + 1}. ${element.tag} - ${element.selector}`);
                if (element.text) console.log(`     Text: "${element.text}"`);
                console.log(`     Position: (${element.x}, ${element.y})`);
                console.log('');
              });
            }
          }

          return;
        }

        // Original interactive inspector
        const { main: runInspect } = await import('./cli-inspect.js');
        await runInspect();
      } catch (error) {
        console.error(`[CLiTS-INSPECTOR] Inspect failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Discover Links command - convenience command for discovering navigation links
  program
    .command('discover-links')
    .description('Discover all navigation links on the current page')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol', '9222')
    .option('--verbose', 'Enable verbose output')
    .action(async (options) => {
      try {
        const { spawn } = await import('child_process');
        const { fileURLToPath } = await import('url');
        const { dirname, resolve } = await import('path');
        
        // Build the clits-inspect command
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const inspectPath = resolve(__dirname, 'cli-inspect.js');
        
        const args = [
          inspectPath,
          '--auto',
          '--json',
          '--action', 'discover-links',
          '--port', options.chromePort,
          '--host', options.chromeHost
        ];
        
        if (options.verbose) {
          args.push('--verbose');
        }
        
        const inspectProcess = spawn('node', args, { stdio: 'pipe' });
        
        let output = '';
        let error = '';
        
        inspectProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        inspectProcess.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        inspectProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(output);
              console.log(JSON.stringify(result, null, 2));
            } catch (parseError) {
              console.log(output);
            }
          } else {
            console.error('[CLiTS-DISCOVER-LINKS] Discovery failed:', error);
            process.exit(1);
          }
        });
        
      } catch (error) {
        console.error(`[CLiTS-DISCOVER-LINKS] Discovery failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Discover Tabs command - convenience command for discovering tabs in dialogs
  program
    .command('discover-tabs')
    .description('Discover all tab labels in dialogs or tabbed interfaces')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol', '9222')
    .option('--tab-label <label>', 'Select tab by label after discovery')
    .option('--tab-label-regex <pattern>', 'Select tab by regex pattern')
    .option('--custom-save-patterns <patterns>', 'Custom save button text patterns (comma-separated)')
    .option('--find-save-button', 'Also discover the best save button in the current dialog')
    .option('--verbose', 'Enable verbose output')
    .action(async (options) => {
      try {
        const automation = new ChromeAutomation(
          parseInt(options.chromePort),
          options.chromeHost
        );

        // Use the existing interact method for tab discovery and selection
        const result = await automation.interact({
          discoverTabs: true,
          findSaveButton: options.findSaveButton,
          customSavePatterns: options.customSavePatterns ? 
            options.customSavePatterns.split(',').map((p: string) => p.trim()) : 
            undefined,
          clickSelector: options.tabLabel || options.tabLabelRegex,
          tabLabelPattern: options.tabLabelRegex,
          chromePort: parseInt(options.chromePort),
          chromeHost: options.chromeHost
        });

        console.log(JSON.stringify(result, null, 2));
        
      } catch (error) {
        console.error(`[CLiTS-DISCOVER-TABS] Discovery failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Direct Chrome Remote Control command - bypasses Playwright
  program
    .command('chrome-control')
    .description('Direct Chrome Remote Control (no Playwright) - works with existing Chrome debugging session')
    .option('--host <host>', 'Specify the host for the Chrome DevTools protocol', 'localhost')
    .option('--port <port>', 'Specify the port for the Chrome DevTools protocol', '9222')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol (alias)', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol (alias)', '9222')
    .option('--timeout <ms>', 'Exit after specified timeout (for testing)', '0')
    .action(async (options) => {
      try {
        // Support both --port/--host and --chrome-port/--chrome-host for compatibility
        const port = parseInt(options.port || options.chromePort || '9222');
        const host = options.host || options.chromeHost || 'localhost';
        const timeout = parseInt(options.timeout);
        
        // If timeout is specified, exit after that duration
        if (timeout > 0) {
          setTimeout(() => {
            console.log(`[CLiTS-CHROME-CONTROL] Exiting after ${timeout}ms timeout`);
            process.exit(0);
          }, timeout);
        }
        
        // Import and run the direct Chrome control
        const { directChromeControl } = await import('./cli-inspect.js');
        await directChromeControl(port, host);
      } catch (error) {
        console.error(`[CLiTS-CHROME-CONTROL] Chrome control failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // VisionCLITS - Advanced visual state capture and screenshot automation
  program
    .command('vision')
    .description('Visual state capture and screenshot automation')
    .option('--screenshot', 'Take screenshot(s)')
    .option('--selector <selector>', 'CSS selector for element-specific screenshot')
    .option('--selectors <selectors>', 'Multiple CSS selectors (comma-separated)')
    .option('--output <path>', 'Output file path for screenshot')
    .option('--output-dir <dir>', 'Output directory for multiple screenshots')
    .option('--meta <path>', 'Output JSON metadata file path')
    .option('--fullpage', 'Take full-page screenshot')
    .option('--base64', 'Output screenshot as base64 to stdout')
    .option('--stdout', 'Output results to stdout (JSON format)')
    .option('--include-text', 'Include text content in metadata')
    .option('--include-styles', 'Include computed styles in metadata')
    .option('--include-bbox', 'Include bounding box information')
    .option('--include-visibility', 'Include visibility state information')
    .option('--diff', 'Enable visual diff mode for regression testing')
    .option('--baseline <path>', 'Baseline screenshot or directory for comparison')
    .option('--compare-with <path>', 'Compare current screenshot with this image')
    .option('--diff-threshold <number>', 'Diff sensitivity threshold (0-1, default: 0.1)', '0.1')
    .option('--diff-output <path>', 'Output path for diff result image')
    .option('--diff-report <path>', 'Output path for diff analysis JSON report')
    .option('--save-baseline', 'Save current screenshot as new baseline')
    .option('--batch-diff', 'Enable batch processing for multiple screenshot comparisons')
    .option('--video', 'Enable video recording for interaction workflows')
    .option('--video-output <path>', 'Output path for recorded video (default: clits-recording.webm)')
    .option('--video-duration <seconds>', 'Recording duration in seconds (default: 30)', '30')
    .option('--video-fps <fps>', 'Video frame rate (default: 10)', '10')
    .option('--highlight', 'Add visual annotations to screenshots')
    .option('--highlight-color <color>', 'Color for element highlighting (hex, default: #ff0000)', '#ff0000')
    .option('--highlight-thickness <pixels>', 'Border thickness for highlighting (default: 3)', '3')
    .option('--highlight-all-clickable', 'Highlight all clickable elements on the page')
    .option('--annotate-text', 'Add text labels to highlighted elements')
    .option('--chrome-host <host>', 'Specify the host for the Chrome DevTools protocol', 'localhost')
    .option('--chrome-port <port>', 'Specify the port for the Chrome DevTools protocol', '9222')
    .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
    .action(async (options) => {
      try {
        // Dynamic import to handle module resolution issues
        let VisionHandler: any;
        try {
          const visionModule = await import('./vision-handler.js');
          VisionHandler = visionModule.VisionHandler;
        } catch (importError) {
          console.error('[CLiTS-VISION] Vision handler not available. Please ensure the module is built properly.');
          process.exit(1);
        }

        const visionHandler = new VisionHandler(
          parseInt(options.chromePort),
          options.chromeHost
        );

        await visionHandler.execute(options);
      } catch (error) {
        console.error(`[CLiTS-VISION] Vision command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Add command completion (optional - only if explicitly requested)
  // Temporarily disabled to debug option parsing issues
  // program
  //   .command('completion')
  //   .description('Generate completion script for your shell.')
  //   .action(async () => {
  //       console.log('Shell completion is currently disabled to prevent automatic prompts.');
  //       console.log('To enable completion, uncomment the tabtab code in src/cli.ts');
  //   });

  await program.parseAsync();
}

main().catch((error) => {
  console.error('[CLiTS-INSPECTOR] A fatal error occurred outside the command handler:', error);
  process.exit(1);
}); 