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
    
    // Make sure the main clock switch is ON, then toggle each sub-option
    console.log('Testing Clock Display sub-options...');
    await Runtime.evaluate({
      expression: `(function() {
        // First make sure the main clock switch is ON
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
        
        // If main switch is OFF, turn it ON
        if (!mainClockSwitch.checked) {
          console.log("Main clock switch is OFF, turning it ON");
          mainClockSwitch.click();
          
          // Allow React to update the DOM
          return { status: "turned_on_main_switch", needsDelay: true };
        }
        
        return { status: "main_switch_already_on" };
      })()`
    });
    
    // Wait for React to update the DOM if we turned on the main switch
    console.log('Waiting for React update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now toggle each sub-option
    console.log('Toggling clock sub-options...');
    await Runtime.evaluate({
      expression: `(function() {
        // Find the clock section again
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
        console.log(\`Found \${subSwitches.length} clock sub-option switches\`);
        
        if (subSwitches.length === 0) {
          console.log("No sub-switches found, even though main switch is ON");
          console.log("DOM Structure:", clockSection.innerHTML);
          return { error: "No sub-switches found" };
        }
        
        // Log initial state
        const initialStates = Array.from(subSwitches).map((sw, idx) => {
          const label = sw.closest('label')?.textContent.trim() || \`Sub-switch \${idx}\`;
          return { index: idx, label, checked: sw.checked };
        });
        console.log("Initial sub-switch states:", JSON.stringify(initialStates, null, 2));
        
        // Find the "Show time zone" switch
        const timeZoneSwitch = Array.from(subSwitches).find(sw => {
          const label = sw.closest('label')?.textContent.trim() || '';
          return label.includes('time zone');
        });
        
        if (timeZoneSwitch) {
          console.log("Found 'Show time zone' switch, current state:", timeZoneSwitch.checked);
          console.log("Clicking 'Show time zone' switch");
          
          try {
            // Store the component state before clicking
            const state = {
              form: window.displayFormState || {},
              props: {},
              dom: {
                checked: timeZoneSwitch.checked,
                disabled: timeZoneSwitch.disabled,
                parentVisible: timeZoneSwitch.closest('.MuiBox-root')?.style.display !== 'none'
              }
            };
            
            // Try to capture some React props
            const reactKeys = Object.keys(timeZoneSwitch).filter(k => k.startsWith('__react'));
            if (reactKeys.length > 0) {
              console.log("React keys on switch:", reactKeys);
            }
            
            // Click the switch
            timeZoneSwitch.click();
            console.log("Click executed");
            
            // Log state after clicking
            console.log("After click - checked:", timeZoneSwitch.checked);
            
            return { 
              action: "clicked_timezone_switch",
              beforeState: state,
              afterChecked: timeZoneSwitch.checked
            };
          } catch (err) {
            console.error("Error clicking time zone switch:", err.message);
            return { error: err.message };
          }
        } else {
          console.log("Could not find 'Show time zone' switch");
          
          // Try clicking all switches
          console.log("Trying to click each sub-switch:");
          
          for (let i = 0; i < subSwitches.length; i++) {
            try {
              const sw = subSwitches[i];
              const label = sw.closest('label')?.textContent.trim() || \`Switch \${i}\`;
              console.log(\`[\${i}] Clicking "\${label}" switch\`);
              
              const beforeChecked = sw.checked;
              sw.click();
              const afterChecked = sw.checked;
              
              console.log(\`[\${i}] Before: \${beforeChecked}, After: \${afterChecked}\`);
            } catch (err) {
              console.error(\`Error clicking switch \${i}: \${err.message}\`);
            }
          }
          
          return { action: "clicked_all_sub_switches" };
        }
      })()`
    });
    
    // Wait to observe any errors
    console.log('Waiting to observe any errors...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now check if the UI is in a consistent state
    console.log('Checking component state consistency...');
    await Runtime.evaluate({
      expression: `(function() {
        try {
          // Try to find the DisplayConfigForm component in the React tree
          const getReactInstance = (dom) => {
            for (const key in dom) {
              if (key.startsWith('__reactFiber$')) {
                return dom[key];
              }
            }
            return null;
          };
          
          const formElement = document.querySelector('form') || document.querySelector('.MuiBox-root');
          const reactInstance = formElement ? getReactInstance(formElement) : null;
          
          if (reactInstance) {
            console.log("Found React instance on form element");
          }
          
          // Check current DOM state
          const clockSection = Array.from(document.querySelectorAll('.MuiTypography-subtitle2'))
            .find(el => el.textContent.includes('Clock Display'))
            ?.closest('div');
            
          if (!clockSection) {
            console.log("Clock Display section not found in final check");
            return { error: "Clock Display section not found" };
          }
          
          const mainClockSwitch = clockSection.querySelector('input[type="checkbox"]');
          const clockSubSection = clockSection.querySelector('.MuiBox-root');
          const subSwitches = clockSubSection?.querySelectorAll('input[type="checkbox"]') || [];
          
          // Capture current state
          const finalState = {
            mainSwitchChecked: mainClockSwitch?.checked,
            subSectionExists: !!clockSubSection,
            subSectionVisible: clockSubSection?.style.display !== 'none',
            subSwitchCount: subSwitches.length,
            subSwitchStates: Array.from(subSwitches).map((sw, idx) => {
              const label = sw.closest('label')?.textContent.trim() || \`Sub-switch \${idx}\`;
              return { index: idx, label, checked: sw.checked };
            })
          };
          
          console.log("Final component state:", JSON.stringify(finalState, null, 2));
          
          return { finalState };
        } catch (err) {
          console.error("Error in final state check:", err.message);
          return { error: err.message };
        }
      })()`
    });
    
    console.log('Tests complete, closing connection...');
    await client.close();
  } catch (err) {
    console.error('Error in test script:', err);
  }
};

main(); 