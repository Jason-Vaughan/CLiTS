import CDP from 'chrome-remote-interface';

const main = async () => {
  try {
    console.log('Connecting to Chrome...');
    const client = await CDP({port: 9222});
    const {Page, Runtime} = client;
    await Promise.all([Page.enable(), Runtime.enable()]);
    
    console.log('Navigating to displays-manager...');
    await Page.navigate({url: 'http://localhost:5173/displays-manager'});
    await Page.loadEventFired();
    
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Checking for console errors...');
    const result = await Runtime.evaluate({
      expression: `(function() { 
        return { 
          title: document.title,
          url: window.location.href,
          hasDisplays: !!document.querySelector(".MuiButton-contained")
        }; 
      })()`
    });
    
    console.log('Page info:', result.result.value);
    
    console.log('Clicking Add Display button...');
    await Runtime.evaluate({
      expression: `(function() { 
        const button = document.querySelector(".MuiButton-contained");
        if (button) {
          console.log("Found button: " + button.textContent);
          button.click();
          return true;
        }
        return false;
      })()`
    });
    
    console.log('Waiting for dialog to appear...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Checking if dialog opened...');
    const dialogResult = await Runtime.evaluate({
      expression: `(function() { 
        return { 
          dialogOpen: !!document.querySelector(".MuiDialog-root"),
          dialogTitle: document.querySelector(".MuiDialogTitle-root")?.textContent
        }; 
      })()`
    });
    
    console.log('Dialog info:', dialogResult.result.value);
    
    // Click on the "Header Options" tab
    console.log('Clicking on Header Options tab...');
    await Runtime.evaluate({
      expression: `(function() {
        const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
        const headerOptionsTab = tabs.find(tab => tab.textContent.includes('Header Options'));
        if (headerOptionsTab) {
          console.log("Found Header Options tab");
          headerOptionsTab.click();
          return true;
        }
        console.log("Header Options tab not found");
        return false;
      })()`
    });
    
    // Wait for tab to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Toggle the clock settings
    console.log('Toggling clock settings...');
    await Runtime.evaluate({
      expression: `(function() {
        const clockSwitch = document.querySelector('input[type="checkbox"]');
        if (clockSwitch) {
          console.log("Found clock switch");
          clockSwitch.click();
          return true;
        }
        console.log("Clock switch not found");
        return false;
      })()`
    });
    
    // Wait to see if there are any errors
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Closing...');
    await client.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

main();
