import CDP from 'chrome-remote-interface';

const main = async () => {
  try {
    console.log('Connecting to Chrome...');
    // Connect to Chrome and get all available tabs
    const targets = await CDP.List({port: 9222});
    
    // Find the displays-manager tab
    const displayManagerTab = targets.find(target => 
      target.url.includes('displays-manager') && target.type === 'page'
    );
    
    if (!displayManagerTab) {
      console.error('Could not find displays-manager tab. Available tabs:');
      targets.forEach(target => console.log(`- ${target.title} (${target.url})`));
      return;
    }
    
    console.log(`Found displays-manager tab: ${displayManagerTab.title} (${displayManagerTab.url})`);
    console.log(`Tab ID: ${displayManagerTab.id}`);
    
    // Connect to the specific tab
    const client = await CDP({port: 9222, target: displayManagerTab.id});
    const {Page, Runtime} = client;
    await Promise.all([Page.enable(), Runtime.enable()]);
    
    // Focus on this tab and reload it
    console.log('Focusing on displays-manager tab and refreshing...');
    await Page.bringToFront();
    await Page.reload({ignoreCache: true});
    await Page.loadEventFired();
    
    // Wait for the page to fully load
    console.log('Waiting for page to fully load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we're on the right page
    const result = await Runtime.evaluate({
      expression: `(function() {
        return {
          url: window.location.href,
          title: document.title,
          h4Text: Array.from(document.querySelectorAll('h4')).map(h => h.textContent),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t)
        };
      })()`
    });
    
    console.log('Page info:', result.result.value);
    console.log('Tab successfully focused and refreshed!');
    
    await client.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

main(); 