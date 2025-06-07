const CDP = require('chrome-remote-interface');

async function testButtonClick() {
  try {
    console.log('Testing button clicking...');
    const client = await CDP();
    const { Page, Runtime, DOM, Input } = client;
    
    await Page.enable();
    await Runtime.enable();
    await DOM.enable();
    
    // First, let's see what page we're on and what buttons exist
    const pageInfo = await Runtime.evaluate({
      expression: `JSON.stringify({
        title: document.title,
        url: window.location.href,
        pathname: window.location.pathname
      })`
    });
    
    console.log('Current page:', JSON.parse(pageInfo.result.value));
    
    // Get all buttons on the page with detailed text analysis
    const buttonsInfo = await Runtime.evaluate({
      expression: `JSON.stringify(
        Array.from(document.querySelectorAll('button')).map((btn, index) => ({
          index: index,
          text: btn.textContent?.trim() || '',
          rawText: btn.textContent || '',
          innerText: btn.innerText?.trim() || '',
          className: btn.className || '',
          ariaLabel: btn.getAttribute('aria-label') || '',
          dataTestId: btn.getAttribute('data-testid') || '',
          visible: btn.getBoundingClientRect().width > 0 && btn.getBoundingClientRect().height > 0,
          textLength: (btn.textContent || '').length,
          hasText: !!(btn.textContent && btn.textContent.trim())
        })).filter(btn => btn.visible)
      )`
    });
    
    const buttons = JSON.parse(buttonsInfo.result.value);
    console.log('\nAvailable buttons on page:');
    buttons.forEach((btn, i) => {
      console.log(`${i + 1}. Text: "${btn.text}" | Raw: "${btn.rawText}" | Inner: "${btn.innerText}" | Length: ${btn.textLength} | AriaLabel: "${btn.ariaLabel}"`);
    });
    
    // Test clicking the "Launch" button specifically
    console.log('\nTesting Launch button click with detailed debugging...');
    
    const result = await Runtime.evaluate({
      expression: `
        JSON.stringify((function() {
          console.log('Starting button search...');
          const buttons = Array.from(document.querySelectorAll('button'));
          console.log('Found', buttons.length, 'buttons total');
          
          // Find Launch button
          let launchButton = null;
          let launchIndex = -1;
          
          for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const text = btn.textContent?.trim() || '';
            console.log('Button', i, ':', text);
            
            if (text.includes('Launch')) {
              launchButton = btn;
              launchIndex = i;
              console.log('Found Launch button at index', i);
              break;
            }
          }
          
          if (!launchButton) {
            console.log('No Launch button found');
            return { error: 'No Launch button found' };
          }
          
          console.log('Launch button found, getting coordinates...');
          const rect = launchButton.getBoundingClientRect();
          console.log('Button rect:', rect);
          
          if (rect.width === 0 || rect.height === 0) {
            console.log('Button not visible');
            return { error: 'Button not visible' };
          }
          
          const result = {
            success: true,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            text: launchButton.textContent?.trim(),
            tagName: launchButton.tagName,
            index: launchIndex,
            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            }
          };
          
          console.log('Returning result:', result);
          return result;
        })())
      `
    });

    console.log('Runtime.evaluate result:', result);
    const buttonInfo = JSON.parse(result.result.value);
    console.log('Parsed button info:', buttonInfo);

    if (buttonInfo && buttonInfo.success) {
      console.log('✅ Found Launch button:', buttonInfo);
      
      // Try clicking this element
      const { x, y } = buttonInfo;
      console.log(`Attempting click at (${x}, ${y})`);
      
      await Input.dispatchMouseEvent({
        type: 'mousePressed',
        x,
        y,
        button: 'left',
        clickCount: 1
      });
      
      await Input.dispatchMouseEvent({
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        clickCount: 1
      });
      
      console.log('✅ Click dispatched successfully!');
      
      // Wait and check for changes
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const afterClick = await Runtime.evaluate({
        expression: `JSON.stringify({
          title: document.title,
          url: window.location.href
        })`
      });
      
      console.log('After click:', JSON.parse(afterClick.result.value));
    } else {
      console.log('❌ Failed to find Launch button');
      if (buttonInfo && buttonInfo.error) {
        console.log('Error:', buttonInfo.error);
      }
    }
    
    await client.close();
    console.log('Test completed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testButtonClick(); 