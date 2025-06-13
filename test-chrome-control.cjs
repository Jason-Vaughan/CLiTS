const CDP = require('chrome-remote-interface');

async function waitForPageLoad(client, afterClick = false) {
  const { Page, Runtime } = client;
  
  if (!afterClick) {
    // Only wait for loadEventFired on initial navigation, not after clicks
    await Page.loadEventFired();
  }
  
  // Always wait a bit for JavaScript execution to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check if the page is ready
  const readyState = await Runtime.evaluate({
    expression: 'document.readyState'
  });
  
  console.log('Page readyState:', readyState.result.value);
  
  // If not complete, wait a bit more
  if (readyState.result.value !== 'complete') {
    console.log('Page not fully loaded, waiting additional time...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function runTests() {
  try {
    console.log('Connecting to Chrome...');
    
    // First, let's see what tabs are available
    const response = await fetch('http://localhost:9222/json/list');
    const targets = await response.json();
    console.log('Available targets:', targets.map(t => ({ 
      id: t.id, 
      type: t.type, 
      url: t.url, 
      title: t.title 
    })));
    
    const client = await CDP();
    const { Page, Runtime, DOM, Input } = client;
    
    await Page.enable();
    await Runtime.enable();
    await DOM.enable();
    
    console.log('Getting current page info...');
    
    // First check what page we're on
    const pageInfo = await Runtime.evaluate({
      expression: `JSON.stringify({
        title: document.title,
        url: window.location.href,
        readyState: document.readyState
      })`
    });
    
    console.log('Current page:', JSON.parse(pageInfo.result.value));
    
    // Navigate to the dashboard
    console.log('Navigating to dashboard...');
    await Page.navigate({ url: 'http://localhost:5173/dashboard' });
    
    // Wait for the page to fully load
    await waitForPageLoad(client, false);
    
    // Test 1: Click by text
    console.log('\n=== TEST 1: Click by text ===');
    const textClickResult = await Runtime.evaluate({
      expression: `
        (function() {
          try {
            const links = Array.from(document.querySelectorAll('a'));
            const zoneMapperLink = links.find(link => link.textContent.trim() === 'Zone Mapper');
            
            if (!zoneMapperLink) {
              return JSON.stringify({ error: 'Zone Mapper link not found' });
            }
            
            const rect = zoneMapperLink.getBoundingClientRect();
            return JSON.stringify({
              success: true,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              text: zoneMapperLink.textContent.trim()
            });
          } catch (error) {
            return JSON.stringify({ error: error.message });
          }
        })()
      `
    });
    
    const textClickInfo = JSON.parse(textClickResult.result.value);
    console.log('Text click info:', textClickInfo);
    
    if (textClickInfo.success) {
      console.log(`Clicking at coordinates: (${textClickInfo.x}, ${textClickInfo.y})`);
      
      await Input.dispatchMouseEvent({
        type: 'mousePressed',
        x: textClickInfo.x,
        y: textClickInfo.y,
        button: 'left',
        clickCount: 1
      });
      
      await Input.dispatchMouseEvent({
        type: 'mouseReleased',
        x: textClickInfo.x,
        y: textClickInfo.y,
        button: 'left',
        clickCount: 1
      });
      
      console.log('Text click dispatched successfully!');
      
      // Wait for navigation and page load (using afterClick = true)
      console.log('Waiting for navigation after text click...');
      await waitForPageLoad(client, true);
      
      const afterTextClick = await Runtime.evaluate({
        expression: `JSON.stringify({
          title: document.title,
          url: window.location.href,
          readyState: document.readyState
        })`
      });
      
      console.log('After text click:', JSON.parse(afterTextClick.result.value));
    } else {
      console.log('Text click failed:', textClickInfo.error);
    }
    
    // Navigate back to dashboard
    console.log('\nNavigating back to dashboard...');
    await Page.navigate({ url: 'http://localhost:5173/dashboard' });
    
    // Wait for the page to fully load
    await waitForPageLoad(client, false);
    
    // Test 2: Click by selector
    console.log('\n=== TEST 2: Click by selector ===');
    const selectorClickResult = await Runtime.evaluate({
      expression: `
        (function() {
          try {
            const button = document.querySelector('button[data-testid="user-profile-button"]');
            
            if (!button) {
              return JSON.stringify({ error: 'User profile button not found' });
            }
            
            const rect = button.getBoundingClientRect();
            return JSON.stringify({
              success: true,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              text: button.textContent.trim()
            });
          } catch (error) {
            return JSON.stringify({ error: error.message });
          }
        })()
      `
    });
    
    const selectorClickInfo = JSON.parse(selectorClickResult.result.value);
    console.log('Selector click info:', selectorClickInfo);
    
    if (selectorClickInfo.success) {
      console.log(`Clicking at coordinates: (${selectorClickInfo.x}, ${selectorClickInfo.y})`);
      
      await Input.dispatchMouseEvent({
        type: 'mousePressed',
        x: selectorClickInfo.x,
        y: selectorClickInfo.y,
        button: 'left',
        clickCount: 1
      });
      
      await Input.dispatchMouseEvent({
        type: 'mouseReleased',
        x: selectorClickInfo.x,
        y: selectorClickInfo.y,
        button: 'left',
        clickCount: 1
      });
      
      console.log('Selector click dispatched successfully!');
      
      // Wait for any UI changes
      console.log('Waiting for UI changes after selector click...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const afterSelectorClick = await Runtime.evaluate({
        expression: `JSON.stringify({
          title: document.title,
          url: window.location.href,
          readyState: document.readyState
        })`
      });
      
      console.log('After selector click:', JSON.parse(afterSelectorClick.result.value));
    } else {
      console.log('Selector click failed:', selectorClickInfo.error);
    }
    
    // Test 3: Click by region
    console.log('\n=== TEST 3: Click by region ===');
    
    // Get the viewport dimensions
    const viewportInfo = await Runtime.evaluate({
      expression: `JSON.stringify({
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight
      })`
    });
    
    const viewport = JSON.parse(viewportInfo.result.value);
    console.log('Viewport dimensions:', viewport);
    
    // Calculate center coordinates
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    
    console.log(`Clicking at center coordinates: (${centerX}, ${centerY})`);
    
    // Click at the center of the viewport
    await Input.dispatchMouseEvent({
      type: 'mousePressed',
      x: centerX,
      y: centerY,
      button: 'left',
      clickCount: 1
    });
    
    await Input.dispatchMouseEvent({
      type: 'mouseReleased',
      x: centerX,
      y: centerY,
      button: 'left',
      clickCount: 1
    });
    
    console.log('Region click dispatched successfully!');
    
    // Wait for any UI changes
    console.log('Waiting for UI changes after region click...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const afterRegionClick = await Runtime.evaluate({
      expression: `JSON.stringify({
        title: document.title,
        url: window.location.href,
        readyState: document.readyState
      })`
    });
    
    console.log('After region click:', JSON.parse(afterRegionClick.result.value));
    
    await client.close();
    console.log('\nAll tests completed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runTests(); 