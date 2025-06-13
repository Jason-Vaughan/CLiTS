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
    
    await client.close();
    console.log('Test completed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testClick(); 