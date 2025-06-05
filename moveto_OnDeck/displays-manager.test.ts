/*
 * OnDeck Displays Manager E2E Tests
 * 
 * This test suite uses CLITS (Chrome Log Inspector Tool System) to automate testing
 * of the Displays Manager UI. It verifies core functionality including:
 * - Adding new displays
 * - Testing header options and toggles
 * - Verifying dialog visibility and content
 * 
 * Prerequisites:
 * 1. Chrome must be running with remote debugging enabled:
 *    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
 * 2. Development server must be running on localhost:5173
 */

import { chromium, test, expect } from '@playwright/test';
import { waitForInteractiveLogin } from './manual-login';

test.describe('Displays Manager UI E2E', () => {
  test('should open Add Display dialog and test header options toggles', async () => {
    // Attach to existing Chrome session
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const realPage = context.pages()[0] || await context.newPage();
    
    console.log('[TEST] Navigating to /displays-manager...');
    await realPage.goto('http://localhost:5173/displays-manager');
    await realPage.waitForTimeout(3000); // Wait for app load
    
    // Check for login button or prompt
    const loginButton = await realPage.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible().catch(() => false)) {
      console.log('[TEST] Login button detected, waiting for manual login...');
      await waitForInteractiveLogin();
      console.log('[TEST] Manual login complete.');
    } else {
      console.log('[TEST] No login prompt detected, proceeding with test.');
    }

    // Verify page state
    console.log('[TEST] Current URL:', realPage.url());
    expect(realPage.url()).toContain('/displays-manager');
    
    // Click Add Display button
    const addButton = await realPage.locator('button:has-text("Add Display")').first();
    await addButton.click();
    
    // Wait for dialog
    await realPage.waitForSelector('.MuiDialog-root');
    
    // Click Header Options tab
    const headerTab = await realPage.locator('button:has-text("Header Options")').first();
    await headerTab.click();
    
    // Test toggles
    const toggles = realPage.locator('input[type="checkbox"]');
    const toggleCount = await toggles.count();
    
    // Test each toggle
    for (let i = 0; i < toggleCount; i++) {
      const toggle = toggles.nth(i);
      const label = await toggle.evaluate(el => el.closest('label')?.textContent || `Toggle ${i}`);
      const initialState = await toggle.isChecked();
      await toggle.click();
      const newState = await toggle.isChecked();
      console.log(`[TEST] Toggle ${i} (${label}): ${initialState} -> ${newState}`);
      expect(newState).not.toBe(initialState);
    }
  });
}); 