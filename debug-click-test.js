const CDP = require('chrome-remote-interface');

async function testClick() {
  try {
    console.log('Connecting to Chrome...');
    const client = await CDP();
    const { Page, Runtime, DOM, Input } = client;
    
    await Page.enable();
    await Runtime.enable();
    await DOM.enable();
    
    console.log('Getting current page info...');
    
    // Get all clickable elements
    const result = await Runtime.evaluate({
      expression: `
        (function() {
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
            document.querySelectorAll(selector).forEach(el => {
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
          });
          
          return elements.slice(0, 5); // First 5 elements
        })()
      `
    });
    
    const elements = result.result.value;
    console.log('Found clickable elements:', elements);
    
    if (elements && elements.length > 0) {
      const firstElement = elements[0];
      console.log(`Attempting to click first element:`, firstElement);
      
      // Try clicking the first element
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterClick = await Runtime.evaluate({
        expression: `document.title + ' - ' + window.location.href`
      });
      
      console.log('After click:', afterClick.result.value);
    }
    
    await client.close();
    console.log('Test completed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testClick(); 