import { chromium, test, expect } from '@playwright/test';

test('AI Inspector Helper: Collect console, network, and DOM info', async () => {
  // Attach to existing Chrome session (user must start Chrome with --remote-debugging-port=9222)
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  // Collect console messages
  page.on('console', msg => {
    console.log(`[AI-INSPECTOR][CONSOLE][${msg.type()}]`, msg.text());
  });

  // Collect network requests and responses
  page.on('request', request => {
    console.log(`[AI-INSPECTOR][NETWORK][REQUEST]`, JSON.stringify({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      resourceType: request.resourceType(),
    }));
  });
  page.on('response', async response => {
    let body = '';
    try {
      if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
        body = await response.text();
      }
    } catch (e) {
      body = '[UNREADABLE BODY]';
    }
    console.log(`[AI-INSPECTOR][NETWORK][RESPONSE]`, JSON.stringify({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      body: body?.slice(0, 1000) // limit output size
    }));
  });

  // Navigate to the page
  await page.goto('http://localhost:5173/displays-manager');
  await page.waitForTimeout(3000); // Wait for the app to load

  // Dump DOM structure
  const dom = await page.content();
  console.log('[AI-INSPECTOR][DOM]', dom.slice(0, 5000)); // limit output size

  // Optionally, print selected node info (e.g., main app root)
  const rootHtml = await page.$eval('html', el => el.outerHTML);
  console.log('[AI-INSPECTOR][DOM][HTML]', rootHtml.slice(0, 5000));

  // Test passes if page loads and DOM is dumped
  expect(dom).toContain('<html');
}); 