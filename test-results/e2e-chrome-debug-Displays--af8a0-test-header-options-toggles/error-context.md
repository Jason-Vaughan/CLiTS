# Test info

- Name: Displays Manager UI E2E >> should open Add Display dialog and test header options toggles
- Location: /Users/jasonvaughan/Documents/Projects/CLITS/e2e/chrome-debug.spec.ts:15:3

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: getByRole('button', { name: /add new display/i })
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for getByRole('button', { name: /add new display/i })

    at /Users/jasonvaughan/Documents/Projects/CLITS/e2e/chrome-debug.spec.ts:33:29
```

# Page snapshot

```yaml
- main:
  - heading "Welcome to OnDeck" [level=1]
  - button "Sign in with Google"
```

# Test source

```ts
   1 | /*
   2 |  * BSD 3-Clause License
   3 |  * Copyright (c) 2024, CLITS contributors
   4 |  * All rights reserved.
   5 |  *
   6 |  * This file is part of the CLITS E2E test suite.
   7 |  * It replicates the logic of the legacy chrome-debug-test.js script using Playwright.
   8 |  *
   9 |  * To run: npx playwright test e2e/chrome-debug.spec.ts
  10 |  */
  11 |
  12 | import { test, expect } from '@playwright/test';
  13 |
  14 | test.describe('Displays Manager UI E2E', () => {
  15 |   test('should open Add Display dialog and test header options toggles', async ({ page }) => {
  16 |     // Navigate to the Displays Manager page
  17 |     await page.goto('http://localhost:5173/displays-manager');
  18 |
  19 |     // Diagnostic: print and assert current URL
  20 |     console.log('Current URL:', page.url());
  21 |     expect(page.url()).toContain('/displays-manager');
  22 |
  23 |     // Diagnostic: print page title
  24 |     const title = await page.title();
  25 |     console.log('Page title:', title);
  26 |
  27 |     // Debug: print all button texts on the page
  28 |     const allButtons = await page.locator('button').allTextContents();
  29 |     console.log('All button texts:', allButtons);
  30 |
  31 |     // Click the Add Display button
  32 |     const addButton = await page.getByRole('button', { name: /add new display/i });
> 33 |     await expect(addButton).toBeVisible();
     |                             ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  34 |     await addButton.click();
  35 |
  36 |     // Wait for dialog to appear
  37 |     const dialog = page.locator('.MuiDialog-root');
  38 |     await expect(dialog).toBeVisible();
  39 |
  40 |     // Get dialog title
  41 |     const dialogTitle = await page.locator('.MuiDialogTitle-root').textContent();
  42 |     expect(dialogTitle).toBeTruthy();
  43 |     console.log('Dialog title:', dialogTitle);
  44 |
  45 |     // Get tab labels
  46 |     const tabs = page.locator('.MuiTab-root');
  47 |     const tabLabels = await tabs.allTextContents();
  48 |     console.log('Tab labels:', tabLabels);
  49 |
  50 |     // Find the Header Options tab (or similar)
  51 |     const headerTabIndex = tabLabels.findIndex(label => /header|options/i.test(label));
  52 |     expect(headerTabIndex).toBeGreaterThanOrEqual(0);
  53 |     const headerTab = tabs.nth(headerTabIndex);
  54 |     await headerTab.click();
  55 |
  56 |     // Wait for tab content to load
  57 |     const tabPanel = page.locator('[role="tabpanel"]:not([hidden])');
  58 |     await expect(tabPanel).toBeVisible();
  59 |
  60 |     // Find all toggles (checkboxes) in the tab panel
  61 |     const toggles = tabPanel.locator('input[type="checkbox"]');
  62 |     const toggleCount = await toggles.count();
  63 |     console.log('Found', toggleCount, 'toggles');
  64 |     expect(toggleCount).toBeGreaterThan(0);
  65 |
  66 |     // Test each toggle: click and verify state change
  67 |     for (let i = 0; i < toggleCount; i++) {
  68 |       const toggle = toggles.nth(i);
  69 |       const label = await toggle.evaluate(el => el.closest('label')?.textContent || `Toggle ${i}`);
  70 |       const initialState = await toggle.isChecked();
  71 |       await toggle.click();
  72 |       const newState = await toggle.isChecked();
  73 |       console.log(`Toggle ${i} (${label}): ${initialState} -> ${newState}`);
  74 |       expect(newState).not.toBe(initialState);
  75 |     }
  76 |   });
  77 | }); 
```