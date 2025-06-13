#!/usr/bin/env node

import CDP from 'chrome-remote-interface';

const CHROME_PORT = 9222;
const DISPLAYS_URL = 'http://localhost:5173/displays-manager';

async function main() {
  try {
    console.log('Connecting to Chrome...');
    const client = await CDP({ port: CHROME_PORT });
    const { Page, Runtime, Console } = client;
    
    // Enable necessary domains
    await Promise.all([Page.enable(), Runtime.enable(), Console.enable()]);
    
    // Listen for console messages
    Console.messageAdded(({ message }) => {
      console.log(`Console ${message.level}:`, message.text);
    });
    
    // Listen for JavaScript exceptions
    Runtime.exceptionThrown(({ exceptionDetails }) => {
      console.error('EXCEPTION:', exceptionDetails.exception?.description || exceptionDetails.text);
      if (exceptionDetails.stackTrace) {
        console.error('Stack trace:', JSON.stringify(exceptionDetails.stackTrace, null, 2));
      }
    });
    
    console.log('Navigating to displays-manager...');
    await Page.navigate({ url: DISPLAYS_URL });
    await Page.loadEventFired();
    
    console.log('Waiting for authentication...');
    // Wait for authentication to complete
    await Runtime.evaluate({
      expression: `(function() {
        return new Promise((resolve) => {
          const checkAuth = () => {
            const state = window.store?.getState();
            if (state?.auth?.isAuthenticated) {
              console.log("Authentication complete");
              resolve(true);
            } else {
              console.log("Waiting for authentication...");
              setTimeout(checkAuth, 1000);
            }
          };
          checkAuth();
        });
      })()`
    });
    
    console.log('Looking for 5 MIN display edit button...');
    await Runtime.evaluate({
      expression: `(function() { 
        // First find the 5 MIN display container
        const selectors = [
          '.MuiCard-root',
          '.MuiPaper-root',
          '.display-card',
          '[role="button"]'
        ];
        
        let displayElement = null;
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          displayElement = elements.find(el => 
            el.textContent.includes('5 MIN') || 
            el.innerText.includes('5 MIN')
          );
          if (displayElement) break;
        }
        
        if (!displayElement) {
          console.log("5 MIN display not found");
          return false;
        }
        
        // Now find the edit button within or near this element
        const editButton = displayElement.querySelector('button[aria-label="edit"], button:has(svg), button.MuiIconButton-root') ||
                          displayElement.parentElement.querySelector('button[aria-label="edit"], button:has(svg), button.MuiIconButton-root');
        
        if (editButton) {
          console.log("Found edit button for 5 MIN display");
          editButton.click();
          return true;
        }
        
        console.log("Edit button not found for 5 MIN display");
        return false;
      })()`
    });
    
    // Keep the script running to maintain the connection and collect logs
    console.log('Connection established. Collecting logs... Press Ctrl+C to exit.');
    process.on('SIGINT', async () => {
      console.log('Closing connection...');
      await client.close();
      process.exit();
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 