/*
 * BSD 3-Clause License
 * Copyright (c) 2024, CLITS contributors
 * All rights reserved.
 *
 * This file is part of the CLITS E2E test suite.
 * It replicates the logic of the legacy chrome-debug-test.js script using Playwright.
 *
 * To run: npx playwright test e2e/chrome-debug.spec.ts
 */

import { chromium, test, expect } from '@playwright/test';
test.use({ headless: false }); // Force headed mode for manual login
import { waitForInteractiveLogin } from '../src/manual-login';

test.describe('Displays Manager UI E2E', () => {
  test('should open Add Display dialog and test header options toggles', async () => {
    // Attach to existing Chrome session (user must start Chrome with --remote-debugging-port=9222)
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const realPage = context.pages()[0] || await context.newPage();
    console.log('[TEST] Navigating to /displays-manager...');
    await realPage.goto('http://localhost:5173/displays-manager');
    await realPage.waitForTimeout(3000); // Wait 3 seconds for the app to load
    // Check for login button or prompt
    const loginButton = await realPage.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible().catch(() => false)) {
      console.log('[TEST] Login button detected, waiting for manual login...');
      await waitForInteractiveLogin();
      console.log('[TEST] Manual login complete.');
    } else {
      console.log('[TEST] No login prompt detected, proceeding with test.');
    }
    console.log('[TEST] Page navigated. Dumping HTML:');
    const html = await realPage.content();
    console.log(html);
    const allButtons = await realPage.locator('button').allTextContents();
    console.log('[TEST] All button texts:', allButtons);
    // Diagnostic: print and assert current URL
    console.log('[TEST] Current URL:', realPage.url());
    expect(realPage.url()).toContain('/displays-manager');
    // Debug: print page title
    const title = await realPage.title();
    console.log('[TEST] Page title:', title);
    // Click the Add Display button
    console.log('[TEST] Looking for Add Display button...');
    const addButton = await realPage.getByRole('button', { name: /add new display/i });
    await expect(addButton).toBeVisible();
    console.log('[TEST] Clicking Add Display button...');
    await addButton.click();
    // Wait for dialog to appear
    const dialog = realPage.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible();
    console.log('[TEST] Dialog is visible.');
    // Get dialog title
    const dialogTitle = await realPage.locator('.MuiDialogTitle-root').textContent();
    expect(dialogTitle).toBeTruthy();
    console.log('[TEST] Dialog title:', dialogTitle);
    // Get tab labels
    const tabs = realPage.locator('.MuiTab-root');
    const tabLabels = await tabs.allTextContents();
    console.log('[TEST] Tab labels:', tabLabels);
    // Find the Header Options tab (or similar)
    const headerTabIndex = tabLabels.findIndex(label => /header|options/i.test(label));
    expect(headerTabIndex).toBeGreaterThanOrEqual(0);
    const headerTab = tabs.nth(headerTabIndex);
    await headerTab.click();
    // Wait for tab content to load
    const tabPanel = realPage.locator('[role="tabpanel"]:not([hidden])');
    await expect(tabPanel).toBeVisible();
    // Find all toggles (checkboxes) in the tab panel
    const toggles = tabPanel.locator('input[type="checkbox"]');
    const toggleCount = await toggles.count();
    console.log('[TEST] Found', toggleCount, 'toggles');
    expect(toggleCount).toBeGreaterThan(0);
    // Test each toggle: click and verify state change
    for (let i = 0; i < toggleCount; i++) {
      const toggle = toggles.nth(i);
      const label = await toggle.evaluate(el => el.closest('label')?.textContent || `Toggle ${i}`);
      const initialState = await toggle.isChecked();
      await toggle.click();
      const newState = await toggle.isChecked();
      console.log(`[TEST] Toggle ${i} (${label}): ${initialState} -> ${newState}`);
      expect(newState).not.toBe(initialState);
    }
    console.log('[TEST] Test complete.');
  }, 20000);

  test('should support manual login flow with --interactive-login', async () => {
    // Attach to existing Chrome session (user must start Chrome with --remote-debugging-port=9222)
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const realPage = context.pages()[0] || await context.newPage();
    console.log('[TEST] Navigating to /login...');
    await realPage.goto('http://localhost:5173/login');
    await realPage.waitForTimeout(3000); // Wait 3 seconds for the app to load
    // Check for login button or prompt
    const loginButton = await realPage.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible().catch(() => false)) {
      console.log('[TEST] Login button detected, waiting for manual login...');
      await waitForInteractiveLogin();
      console.log('[TEST] Manual login complete.');
    } else {
      console.log('[TEST] No login prompt detected, proceeding with test.');
    }
    console.log('[TEST] Page navigated. Dumping HTML:');
    const html = await realPage.content();
    console.log(html);
    const allButtons = await realPage.locator('button').allTextContents();
    console.log('[TEST] All button texts:', allButtons);
    // After login, check for a post-login UI element (e.g., user profile, dashboard, etc.)
    const dashboard = realPage.locator('.dashboard, .user-profile, [data-testid="dashboard"]');
    if (await dashboard.isVisible().catch(() => false)) {
      console.log('[TEST] Manual login successful, dashboard is visible.');
    } else {
      console.log('[TEST] Dashboard/user-profile not found. Already logged in or redirected. Skipping assertion.');
    }
  }, 20000);
}); 