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
      console.error('Exception:', exceptionDetails.exception?.description || exceptionDetails.text);
    });
    
    console.log('Navigating to displays-manager...');
    await Page.navigate({url: 'http://localhost:5173/displays-manager'});
    await Page.loadEventFired();
    
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click the Add Display button
    console.log('Clicking Add Display button...');
    const buttonResult = await Runtime.evaluate({
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
        console.log("Available buttons:", 
          Array.from(document.querySelectorAll('.MuiButton-contained')).map(b => b.textContent).join(', ')
        );
        return false;
      })()`
    });
    
    console.log('Button click result:', buttonResult.result.value);
    
    // Wait for dialog to appear
    console.log('Waiting for dialog to appear...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify dialog is open and get title
    const dialogResult = await Runtime.evaluate({
      expression: `(function() { 
        const dialog = document.querySelector('.MuiDialog-root');
        if (!dialog) {
          console.log("Dialog not found");
          return { dialogOpen: false };
        }
        
        const title = document.querySelector('.MuiDialogTitle-root')?.textContent;
        console.log("Dialog found with title:", title);
        
        const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
        const tabLabels = tabs.map(t => t.textContent);
        console.log("Available tabs:", tabLabels.join(', '));
        
        return { 
          dialogOpen: true,
          dialogTitle: title,
          tabCount: tabs.length,
          tabLabels
        }; 
      })()`
    });
    
    console.log('Dialog info:', dialogResult.result.value);
    
    // If dialog opened, test header options
    if (dialogResult.result.value?.dialogOpen) {
      // Test each tab to find Header Options
      const tabLabels = dialogResult.result.value?.tabLabels || [];
      
      for (let i = 0; i < tabLabels.length; i++) {
        const label = tabLabels[i];
        if (label.includes('Header') || label.includes('Options')) {
          // Click this tab
          console.log(`Clicking tab ${i}: ${label}`);
          await Runtime.evaluate({
            expression: `(function() {
              const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
              if (tabs[${i}]) {
                console.log("Clicking tab:", tabs[${i}].textContent);
                tabs[${i}].click();
                return true;
              }
              return false;
            })()`
          });
          
          // Wait for tab content to load
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Test all toggles in this tab
          console.log('Testing toggles in tab:', label);
          await Runtime.evaluate({
            expression: `(function() {
              // Get all switches in the current tab panel
              const tabPanel = document.querySelector('[role="tabpanel"]:not([hidden])');
              if (!tabPanel) {
                console.log("Active tab panel not found");
                return { error: "Tab panel not found" };
              }
              
              const switches = tabPanel.querySelectorAll('input[type="checkbox"]');
              console.log("Found", switches.length, "toggles");
              
              // Test each switch
              const results = [];
              
              Array.from(switches).forEach((switchEl, idx) => {
                try {
                  console.log("Testing toggle", idx);
                  const label = switchEl.closest('label')?.textContent || \`Toggle \${idx}\`;
                  console.log("Toggle label:", label);
                  
                  // Get initial state
                  const initialState = switchEl.checked;
                  console.log("Initial state:", initialState);
                  
                  // Click the switch
                  switchEl.click();
                  console.log("Clicked toggle");
                  
                  // Verify state changed
                  const newState = switchEl.checked;
                  console.log("New state:", newState);
                  
                  results.push({
                    label,
                    initialState,
                    newState,
                    worked: initialState !== newState,
                    error: null
                  });
                } catch (err) {
                  console.error("Error testing toggle", idx, ":", err.message);
                  results.push({
                    index: idx,
                    error: err.message
                  });
                }
              });
              
              return {
                toggleCount: switches.length,
                results
              };
            })()`
          });
          
          // Wait after testing all toggles
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.log('Tests complete, closing connection...');
    await client.close();
  } catch (err) {
    console.error('Error in test script:', err);
  }
};

main(); 