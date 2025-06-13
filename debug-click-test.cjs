const CDP = require('chrome-remote-interface');

async function testClick() {
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
    
    // Get all clickable elements with proper serialization
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          try {
            const elements = [];
            const clickableSelectors = [
              'button',
              'a',
              '[role="button"]',
              '[onclick]',
              'input[type="button"]',
              'input[type="submit"]'
            ];
            
            clickableSelectors.forEach(selector => {
              try {
                const found = document.querySelectorAll(selector);
                found.forEach(el => {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    elements.push({
                      tagName: el.tagName,
                      text: el.textContent?.trim() || '',
                      className: el.className || '',
                      id: el.id || '',
                      dataTestId: el.getAttribute('data-testid') || '',
                      ariaLabel: el.getAttribute('aria-label') || '',
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2,
                      selector: selector
                    });
                  }
                });
              } catch (e) {
                // Skip errors
              }
            });
            
            return JSON.stringify(elements.slice(0, 5)); // First 5 elements, serialized
          } catch (error) {
            return JSON.stringify({ error: error.message });
          }
        })()
      `
    });
    
    console.log('Runtime.evaluate result type:', result.result.type);
    const elements = JSON.parse(result.result.value);
    console.log('Found clickable elements:', elements);
    
    if (elements && Array.isArray(elements) && elements.length > 0) {
      const firstElement = elements[0];
      console.log(`Attempting to click first element:`, firstElement);
      
      // Try clicking the first element
      console.log(`Clicking at coordinates: (${firstElement.x}, ${firstElement.y})`);
      
      await Input.dispatchMouseEvent({
        type: 'mousePressed',
        x: firstElement.x,
        y: firstElement.y,
        button: 'left',
        clickCount: 1
      });
      
      await Input.dispatchMouseEvent({
        type: 'mouseReleased',
        x: firstElement.x,
        y: firstElement.y,
        button: 'left',
        clickCount: 1
      });
      
      console.log('Click dispatched successfully!');
      
      // Wait a moment and check if anything changed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const afterClick = await Runtime.evaluate({
        expression: `JSON.stringify({
          title: document.title,
          url: window.location.href
        })`
      });
      
      console.log('After click:', JSON.parse(afterClick.result.value));
    } else {
      console.log('No clickable elements found or error occurred');
    }
    
    await client.close();
    console.log('Test completed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testClick(); 