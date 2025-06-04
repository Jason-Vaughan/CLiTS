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
      console.log(`[BROWSER] ${message.level}: ${message.text}`);
    });
    
    // Listen for JavaScript exceptions
    Runtime.exceptionThrown(({exceptionDetails}) => {
      console.error('[BROWSER EXCEPTION]:', exceptionDetails.exception?.description || exceptionDetails.text);
      if (exceptionDetails.stackTrace) {
        console.error('Stack trace:', JSON.stringify(exceptionDetails.stackTrace, null, 2));
      }
    });
    
    console.log('\n====== STARTING TIMEZONE TOGGLE TEST ======\n');
    
    console.log('1. Navigating to displays-manager...');
    await Page.navigate({url: 'http://localhost:5173/displays-manager'});
    await Page.loadEventFired();
    
    console.log('2. Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click the Add Display button
    console.log('3. Clicking Add Display button...');
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
    console.log('4. Waiting for dialog to appear...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fill in display name
    console.log('5. Filling display name...');
    await Runtime.evaluate({
      expression: `(function() {
        const nameField = document.querySelector('input[label="Display Name"]');
        if (nameField) {
          nameField.value = "Test Display " + new Date().toISOString();
          // Trigger change event
          const event = new Event('input', { bubbles: true });
          nameField.dispatchEvent(event);
          return true;
        }
        return false;
      })()`
    });
    
    // Select a zone
    console.log('6. Selecting a zone...');
    await Runtime.evaluate({
      expression: `(function() {
        // First click the zone selector
        const zoneSelect = document.querySelector('.MuiSelect-select');
        if (zoneSelect) {
          zoneSelect.click();
          
          // Wait for dropdown to appear
          setTimeout(() => {
            // Select the first zone option
            const options = document.querySelectorAll('.MuiMenuItem-root');
            if (options.length > 0) {
              options[0].click();
            }
          }, 500);
          
          return true;
        }
        return false;
      })()`
    });
    
    // Wait for zone selection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click on the Header Options tab (index 3)
    console.log('7. Clicking Header Options tab...');
    await Runtime.evaluate({
      expression: `(function() {
        const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
        // Find Header Options tab
        const headerTab = tabs.find(tab => tab.textContent.includes('Header Options'));
        if (headerTab) {
          console.log("Found Header Options tab:", headerTab.textContent);
          headerTab.click();
          return true;
        }
        
        // Fallback to index-based selection
        if (tabs.length >= 4) {
          console.log("Using index-based tab selection for Header Options");
          tabs[3].click();
          return true;
        }
        
        console.log("Header Options tab not found");
        return false;
      })()`
    });
    
    // Wait for tab content to load
    console.log('8. Waiting for tab content to load...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // DETAILED: Document the exact DOM structure of the Header Options tab
    console.log('9. Analyzing Header Options tab DOM structure...');
    await Runtime.evaluate({
      expression: `(function() {
        const tabPanel = document.querySelector('[role="tabpanel"]:not([hidden])');
        if (!tabPanel) {
          console.log("Active tab panel not found");
          return { error: "Tab panel not found" };
        }
        
        console.log("==== DOM STRUCTURE ====");
        
        // Find all typography elements (section titles)
        const sections = Array.from(tabPanel.querySelectorAll('.MuiTypography-subtitle2'));
        console.log(\`Found \${sections.length} sections: \${sections.map(s => s.textContent).join(', ')}\`);
        
        // Find Clock Display section
        const clockSection = sections.find(el => el.textContent.includes('Clock Display'))?.closest('div');
        if (!clockSection) {
          console.log("Clock Display section not found");
          return { error: "Clock Display section not found" };
        }
        
        // Main clock switch
        const mainClockSwitch = clockSection.querySelector('input[type="checkbox"]');
        console.log(\`Main clock switch: \${mainClockSwitch ? 'found' : 'not found'}\`);
        console.log(\`Main clock switch state: \${mainClockSwitch?.checked ? 'ON' : 'OFF'}\`);
        
        // Check if sub-options section exists
        const clockSubSection = clockSection.querySelector('.MuiBox-root');
        console.log(\`Clock sub-options section: \${clockSubSection ? 'found' : 'not found'}\`);
        
        if (clockSubSection) {
          const subSwitches = clockSubSection.querySelectorAll('input[type="checkbox"]');
          console.log(\`Found \${subSwitches.length} sub-switches\`);
          
          // Log each sub-switch
          Array.from(subSwitches).forEach((sw, idx) => {
            const label = sw.closest('label')?.textContent.trim() || \`Switch \${idx}\`;
            console.log(\`  [\${idx}] \${label}: \${sw.checked ? 'ON' : 'OFF'}\`);
          });
          
          // Find specific switches
          const timeZoneSwitch = Array.from(subSwitches).find(sw => 
            sw.closest('label')?.textContent.trim().includes('time zone')
          );
          
          const secondsSwitch = Array.from(subSwitches).find(sw => 
            sw.closest('label')?.textContent.trim().includes('seconds')
          );
          
          console.log(\`Time zone switch: \${timeZoneSwitch ? 'found' : 'not found'}\`);
          console.log(\`Seconds switch: \${secondsSwitch ? 'found' : 'not found'}\`);
          
          // Return switch info
          return {
            clockSectionFound: true,
            mainSwitchFound: !!mainClockSwitch,
            mainSwitchState: mainClockSwitch?.checked,
            subSectionFound: !!clockSubSection,
            subSwitchCount: subSwitches.length,
            timeZoneSwitchFound: !!timeZoneSwitch,
            secondsSwitchFound: !!secondsSwitch
          };
        }
        
        return {
          clockSectionFound: true,
          mainSwitchFound: !!mainClockSwitch,
          mainSwitchState: mainClockSwitch?.checked,
          subSectionFound: false
        };
      })()`
    });
    
    // Wait a moment before proceeding
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Make sure the clock toggle is ON, then test time zone toggle
    console.log('10. Testing clock and time zone toggles...');
    await Runtime.evaluate({
      expression: `(function() {
        try {
          // Find Clock Display section
          const clockSection = Array.from(document.querySelectorAll('.MuiTypography-subtitle2'))
            .find(el => el.textContent.includes('Clock Display'))
            ?.closest('div');
            
          if (!clockSection) {
            console.log("Clock Display section not found");
            return { error: "Clock Display section not found" };
          }
          
          // Main clock switch
          const mainClockSwitch = clockSection.querySelector('input[type="checkbox"]');
          if (!mainClockSwitch) {
            console.log("Main Clock Switch not found");
            return { error: "Main Clock Switch not found" };
          }
          
          // If main switch is OFF, turn it ON
          if (!mainClockSwitch.checked) {
            console.log("Main clock switch is OFF, turning it ON...");
            mainClockSwitch.click();
            console.log("Clicked main clock switch");
            console.log("Waiting for React to update DOM...");
            
            // We need to wait for React to update the DOM
            return { status: "turning_on_main_switch", waitBeforeContinuing: true };
          }
          
          // Get sub-options section
          const clockSubSection = clockSection.querySelector('.MuiBox-root');
          if (!clockSubSection) {
            console.log("Clock sub-options section not found even though main switch is ON");
            return { error: "Sub-options section not found" };
          }
          
          const subSwitches = clockSubSection.querySelectorAll('input[type="checkbox"]');
          if (subSwitches.length === 0) {
            console.log("No sub-switches found, even though main switch is ON");
            return { error: "No sub-switches found" };
          }
          
          // Find time zone switch
          const timeZoneSwitch = Array.from(subSwitches).find(sw => 
            sw.closest('label')?.textContent.trim().includes('time zone')
          );
          
          if (!timeZoneSwitch) {
            console.log("Time zone switch not found");
            return { error: "Time zone switch not found" };
          }
          
          console.log(\`Time zone switch found, current state: \${timeZoneSwitch.checked ? 'ON' : 'OFF'}\`);
          console.log("Toggling time zone switch...");
          
          // Save initial state
          const initialState = timeZoneSwitch.checked;
          
          // Try to toggle it
          try {
            timeZoneSwitch.click();
            console.log("Clicked time zone switch");
            
            // Check if state changed
            const newState = timeZoneSwitch.checked;
            console.log(\`Time zone switch state after click: \${newState ? 'ON' : 'OFF'}\`);
            
            if (initialState === newState) {
              console.log("WARNING: Time zone switch state did not change after click!");
              
              // Try clicking the label instead
              console.log("Trying to click the label instead...");
              const label = timeZoneSwitch.closest('label');
              if (label) {
                label.click();
                console.log("Clicked time zone switch label");
                
                // Check again
                const newStateAfterLabel = timeZoneSwitch.checked;
                console.log(\`Time zone switch state after label click: \${newStateAfterLabel ? 'ON' : 'OFF'}\`);
              }
            }
            
            return { 
              timeZoneToggleResult: {
                initialState,
                newState,
                changed: initialState !== newState
              }
            };
          } catch (err) {
            console.error("Error toggling time zone switch:", err.message);
            return { error: err.message };
          }
        } catch (err) {
          console.error("Error in clock toggle test:", err.message);
          return { error: err.message };
        }
      })()`
    });
    
    // Wait to observe any changes or errors
    console.log('11. Waiting to observe changes...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test the seconds toggle next
    console.log('12. Testing seconds toggle...');
    await Runtime.evaluate({
      expression: `(function() {
        try {
          // Find Clock Display section
          const clockSection = Array.from(document.querySelectorAll('.MuiTypography-subtitle2'))
            .find(el => el.textContent.includes('Clock Display'))
            ?.closest('div');
            
          if (!clockSection) {
            console.log("Clock Display section not found");
            return { error: "Clock Display section not found" };
          }
          
          // Get sub-options section
          const clockSubSection = clockSection.querySelector('.MuiBox-root');
          if (!clockSubSection) {
            console.log("Clock sub-options section not found");
            return { error: "Sub-options section not found" };
          }
          
          const subSwitches = clockSubSection.querySelectorAll('input[type="checkbox"]');
          
          // Find seconds switch
          const secondsSwitch = Array.from(subSwitches).find(sw => 
            sw.closest('label')?.textContent.trim().includes('seconds')
          );
          
          if (!secondsSwitch) {
            console.log("Seconds switch not found");
            return { error: "Seconds switch not found" };
          }
          
          console.log(\`Seconds switch found, current state: \${secondsSwitch.checked ? 'ON' : 'OFF'}\`);
          console.log("Toggling seconds switch...");
          
          // Save initial state
          const initialState = secondsSwitch.checked;
          
          // Try to toggle it
          try {
            secondsSwitch.click();
            console.log("Clicked seconds switch");
            
            // Check if state changed
            const newState = secondsSwitch.checked;
            console.log(\`Seconds switch state after click: \${newState ? 'ON' : 'OFF'}\`);
            
            if (initialState === newState) {
              console.log("WARNING: Seconds switch state did not change after click!");
              
              // Try clicking the label instead
              console.log("Trying to click the label instead...");
              const label = secondsSwitch.closest('label');
              if (label) {
                label.click();
                console.log("Clicked seconds switch label");
                
                // Check again
                const newStateAfterLabel = secondsSwitch.checked;
                console.log(\`Seconds switch state after label click: \${newStateAfterLabel ? 'ON' : 'OFF'}\`);
              }
            }
            
            return { 
              secondsToggleResult: {
                initialState,
                newState,
                changed: initialState !== newState
              }
            };
          } catch (err) {
            console.error("Error toggling seconds switch:", err.message);
            return { error: err.message };
          }
        } catch (err) {
          console.error("Error in seconds toggle test:", err.message);
          return { error: err.message };
        }
      })()`
    });
    
    // Wait to observe any changes or errors
    console.log('13. Waiting to observe changes...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the final state of all switches
    console.log('14. Checking final state...');
    await Runtime.evaluate({
      expression: `(function() {
        // Find Clock Display section
        const clockSection = Array.from(document.querySelectorAll('.MuiTypography-subtitle2'))
          .find(el => el.textContent.includes('Clock Display'))
          ?.closest('div');
          
        if (!clockSection) {
          console.log("Clock Display section not found");
          return { error: "Clock Display section not found" };
        }
        
        // Main clock switch
        const mainClockSwitch = clockSection.querySelector('input[type="checkbox"]');
        
        // Get sub-options section
        const clockSubSection = clockSection.querySelector('.MuiBox-root');
        
        // Results object
        const results = {
          mainSwitchState: mainClockSwitch?.checked ? 'ON' : 'OFF',
          subSectionFound: !!clockSubSection,
          subSwitches: []
        };
        
        if (clockSubSection) {
          const subSwitches = clockSubSection.querySelectorAll('input[type="checkbox"]');
          
          Array.from(subSwitches).forEach((sw, idx) => {
            const label = sw.closest('label')?.textContent.trim() || \`Switch \${idx}\`;
            results.subSwitches.push({
              label,
              state: sw.checked ? 'ON' : 'OFF',
              visible: sw.offsetParent !== null, // Check if element is visible
              disabled: sw.disabled
            });
          });
        }
        
        console.log("Final state of all switches:", JSON.stringify(results, null, 2));
        return results;
      })()`
    });
    
    console.log('\n====== TIMEZONE TOGGLE TEST COMPLETE ======\n');
    
    // Close connection
    console.log('15. Closing connection...');
    await client.close();
  } catch (err) {
    console.error('Error in test script:', err);
  }
};

main(); 