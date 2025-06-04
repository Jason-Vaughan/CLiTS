import CDP from 'chrome-remote-interface';

const main = async () => {
  try {
    console.log('Connecting to Chrome...');
    const client = await CDP({port: 9222});
    const {Page, Runtime, Console} = client;
    
    // Enable domains
    await Promise.all([Page.enable(), Runtime.enable(), Console.enable()]);
    
    // Listen for console messages
    Console.messageAdded(({message}) => {
      console.log(`Console ${message.level}:`, message.text);
    });
    
    // Listen for JavaScript exceptions
    Runtime.exceptionThrown(({exceptionDetails}) => {
      console.error('EXCEPTION:', exceptionDetails.exception?.description || exceptionDetails.text);
      if (exceptionDetails.stackTrace) {
        console.error('Stack trace:', JSON.stringify(exceptionDetails.stackTrace, null, 2));
      }
    });
    
    console.log('Navigating to displays-manager...');
    await Page.navigate({url: 'http://localhost:5173/displays-manager'});
    await Page.loadEventFired();
    
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click the Add Display button
    console.log('Clicking Add Display button...');
    await Runtime.evaluate({
      expression: `(function() { 
        const button = Array.from(document.querySelectorAll('.MuiButton-contained')).find(b => 
          b.textContent.includes('ADD DISPLAY') || b.textContent.includes('Add Display')
        );
        if (button) {
          console.log("Found Add Display button");
          button.click();
          return true;
        }
        console.log("Add Display button not found");
        return false;
      })()`
    });
    
    // Wait for dialog to appear
    console.log('Waiting for dialog to appear...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Directly click on the Header Options tab (index 3)
    console.log('Clicking on Header Options tab...');
    await Runtime.evaluate({
      expression: `(function() {
        const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
        // Usually Header Options is the 4th tab (index 3)
        if (tabs.length >= 4) {
          console.log("Found Header Options tab:", tabs[3].textContent);
          tabs[3].click();
          return true;
        }
        
        // Fallback: find by text content
        const headerTab = tabs.find(tab => tab.textContent.includes('Header Options'));
        if (headerTab) {
          console.log("Found Header Options tab by text:", headerTab.textContent);
          headerTab.click();
          return true;
        }
        
        console.log("Header Options tab not found. Available tabs:", tabs.map(t => t.textContent).join(', '));
        return false;
      })()`
    });
    
    // Wait for tab content to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Toggle each switch in order and log component state before and after
    console.log('Testing Clock Display options...');
    await Runtime.evaluate({
      expression: `(function() {
        // Helper function to log state of all switches in a section
        function logSectionState(sectionTitle) {
          const section = Array.from(document.querySelectorAll('.MuiTypography-subtitle2'))
            .find(el => el.textContent.includes(sectionTitle))
            ?.closest('div');
            
          if (!section) {
            console.log(\`Section "\${sectionTitle}" not found\`);
            return;
          }
          
          const switches = section.querySelectorAll('input[type="checkbox"]');
          console.log(\`[STATE] \${sectionTitle} section state:\`);
          
          Array.from(switches).forEach((sw, idx) => {
            const label = sw.closest('label')?.textContent.trim() || \`Switch \${idx}\`;
            console.log(\`  - \${label}: \${sw.checked ? 'ON' : 'OFF'}\`);
            
            // Add extra data attributes for debugging
            sw.setAttribute('data-test-id', \`\${sectionTitle.toLowerCase().replace(/\\s/g, '-')}-switch-\${idx}\`);
            sw.setAttribute('data-label', label);
          });
        }
        
        // Log initial state of all sections
        console.log("======= INITIAL STATE =======");
        logSectionState("Clock Display");
        logSectionState("Date Display");
        logSectionState("Zone Name Display");
        
        // First: toggle the main "Show Clock" switch
        console.log("======= TOGGLING MAIN CLOCK SWITCH =======");
        const clockSection = Array.from(document.querySelectorAll('.MuiTypography-subtitle2'))
          .find(el => el.textContent.includes('Clock Display'))
          ?.closest('div');
          
        if (!clockSection) {
          console.log("Clock Display section not found");
          return { error: "Clock Display section not found" };
        }
        
        const mainClockSwitch = clockSection.querySelector('input[type="checkbox"]');
        if (!mainClockSwitch) {
          console.log("Main Clock Switch not found");
          return { error: "Main Clock Switch not found" };
        }
        
        console.log(\`Toggling main "Show Clock" switch from \${mainClockSwitch.checked ? 'ON' : 'OFF'} to \${!mainClockSwitch.checked ? 'ON' : 'OFF'}\`);
        
        try {
          // Toggle
          mainClockSwitch.click();
          console.log("Main clock switch clicked");
          
          // Wait a bit for React to update state
          setTimeout(() => {
            console.log("======= STATE AFTER MAIN TOGGLE =======");
            logSectionState("Clock Display");
            
            // If the switch was turned ON, now we can toggle the sub-options
            if (mainClockSwitch.checked) {
              console.log("======= TOGGLING CLOCK SUB-OPTIONS =======");
              // Get all sub-switches in the Clock Display section
              const clockSubSection = clockSection.querySelector('.MuiBox-root');
              if (!clockSubSection) {
                console.log("Clock sub-options section not found");
                return;
              }
              
              const subSwitches = clockSubSection.querySelectorAll('input[type="checkbox"]');
              console.log(\`Found \${subSwitches.length} clock sub-option switches\`);
              
              // Toggle each sub-switch with logging
              Array.from(subSwitches).forEach((sw, idx) => {
                const label = sw.closest('label')?.textContent.trim() || \`Sub-switch \${idx}\`;
                console.log(\`Toggling "\${label}" from \${sw.checked ? 'ON' : 'OFF'} to \${!sw.checked ? 'ON' : 'OFF'}\`);
                
                try {
                  sw.click();
                  console.log(\`Clicked "\${label}" switch\`);
                } catch (err) {
                  console.error(\`Error toggling "\${label}" switch: \${err.message}\`);
                }
              });
              
              // Log final state
              setTimeout(() => {
                console.log("======= FINAL STATE =======");
                logSectionState("Clock Display");
              }, 100);
            }
          }, 100);
        } catch (err) {
          console.error(\`Error toggling main clock switch: \${err.message}\`);
          return { error: err.message };
        }
        
        return { message: "Clock options test initiated" };
      })()`
    });
    
    // Wait for all toggles to complete
    console.log('Waiting for toggles to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for any console errors or React warnings
    console.log('Checking for any errors in component state...');
    await Runtime.evaluate({
      expression: `(function() {
        // Helper to find React component instances
        function findReactComponents() {
          const reactComponents = [];
          const rootNodes = document.querySelectorAll('[data-reactroot], [data-reactid]');
          
          if (rootNodes.length > 0) {
            console.log(\`Found \${rootNodes.length} React root nodes\`);
          } else {
            console.log('No React root nodes found with data-reactroot or data-reactid');
          }
          
          // Try to find React components by looking for __reactFiber$
          Object.keys(document.querySelector('.MuiDialog-root') || {})
            .filter(key => key.startsWith('__reactProps$') || key.startsWith('__reactFiber$'))
            .forEach(key => {
              console.log(\`Found React key: \${key}\`);
            });
            
          return reactComponents;
        }
        
        // Look for any error boundaries that might have caught errors
        const errorBoundaries = Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const keys = Object.keys(el);
            return keys.some(key => key.includes('error') || key.includes('Error'));
          });
          
        if (errorBoundaries.length > 0) {
          console.log(\`Found \${errorBoundaries.length} potential error boundary elements\`);
        }
        
        findReactComponents();
        
        return { message: "Component check complete" };
      })()`
    });
    
    console.log('Tests complete, closing connection...');
    await client.close();
  } catch (err) {
    console.error('Error in test script:', err);
  }
};

main(); 