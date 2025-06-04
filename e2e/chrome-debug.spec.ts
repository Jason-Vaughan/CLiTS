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

import { test, expect } from '@playwright/test';

test.describe('Displays Manager UI E2E', () => {
  test('should open Add Display dialog and test header options toggles', async ({ page }) => {
    // Navigate to the Displays Manager page
    await page.goto('http://localhost:5173/displays-manager');

    // Diagnostic: print and assert current URL
    console.log('Current URL:', page.url());
    expect(page.url()).toContain('/displays-manager');

    // Diagnostic: print page title
    const title = await page.title();
    console.log('Page title:', title);

    // Debug: print all button texts on the page
    const allButtons = await page.locator('button').allTextContents();
    console.log('All button texts:', allButtons);

    // Click the Add Display button
    const addButton = await page.getByRole('button', { name: /add new display/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for dialog to appear
    const dialog = page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible();

    // Get dialog title
    const dialogTitle = await page.locator('.MuiDialogTitle-root').textContent();
    expect(dialogTitle).toBeTruthy();
    console.log('Dialog title:', dialogTitle);

    // Get tab labels
    const tabs = page.locator('.MuiTab-root');
    const tabLabels = await tabs.allTextContents();
    console.log('Tab labels:', tabLabels);

    // Find the Header Options tab (or similar)
    const headerTabIndex = tabLabels.findIndex(label => /header|options/i.test(label));
    expect(headerTabIndex).toBeGreaterThanOrEqual(0);
    const headerTab = tabs.nth(headerTabIndex);
    await headerTab.click();

    // Wait for tab content to load
    const tabPanel = page.locator('[role="tabpanel"]:not([hidden])');
    await expect(tabPanel).toBeVisible();

    // Find all toggles (checkboxes) in the tab panel
    const toggles = tabPanel.locator('input[type="checkbox"]');
    const toggleCount = await toggles.count();
    console.log('Found', toggleCount, 'toggles');
    expect(toggleCount).toBeGreaterThan(0);

    // Test each toggle: click and verify state change
    for (let i = 0; i < toggleCount; i++) {
      const toggle = toggles.nth(i);
      const label = await toggle.evaluate(el => el.closest('label')?.textContent || `Toggle ${i}`);
      const initialState = await toggle.isChecked();
      await toggle.click();
      const newState = await toggle.isChecked();
      console.log(`Toggle ${i} (${label}): ${initialState} -> ${newState}`);
      expect(newState).not.toBe(initialState);
    }
  });
}); 