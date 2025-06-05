# Test info

- Name: Displays Manager UI E2E >> should support manual login flow with --interactive-login
- Location: /Users/jasonvaughan/Documents/Projects/CLITS/e2e/chrome-debug.spec.ts:93:3

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('.dashboard, .user-profile, [data-testid="dashboard"]')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('.dashboard, .user-profile, [data-testid="dashboard"]')

    at /Users/jasonvaughan/Documents/Projects/CLITS/e2e/chrome-debug.spec.ts:113:29
```

# Page snapshot

```yaml
- banner:
  - paragraph: ntehosting@gmail.com
  - text: Super Admin
  - button "J"
- list:
  - link "Dashboard":
    - /url: /dashboard
  - link "Zones":
    - /url: /zones
  - link "Zone Mapper":
    - /url: /zone-mapper
  - link "Displays Manager":
    - /url: /displays-manager
  - link "Settings":
    - /url: /settings
- separator
- list:
  - link "Tasks":
    - /url: /tasks
  - link "File Index":
    - /url: /file-index
  - link "Admin Panel":
    - /url: /admin
  - link "Field Manager":
    - /url: /field-manager
  - text: Prisma Studio
- main:
  - heading "Dashboard Overview" [level=4]
  - text: Active Zones
  - heading "4" [level=3]
  - paragraph: (5 total)
  - text: Displays
  - heading "1" [level=3]
  - paragraph: Connected displays
  - text: Events
  - heading "0" [level=3]
  - paragraph: Events today
  - text: Tasks
  - heading "58" [level=3]
  - text: 0 in progress 34 pending 23 completed 1 blocked
```

# Test source

```ts
   13 | test.use({ headless: false }); // Force headed mode for manual login
   14 | import { waitForInteractiveLogin } from '../src/manual-login';
   15 |
   16 | test.describe('Displays Manager UI E2E', () => {
   17 |   let page;
   18 |   test.beforeEach(async () => {
   19 |     // Attach to existing Chrome session (user must start Chrome with --remote-debugging-port=9222)
   20 |     const browser = await chromium.connectOverCDP('http://localhost:9222');
   21 |     // Use the first available page or create a new one
   22 |     page = browser.contexts()[0].pages()[0] || await browser.contexts()[0].newPage();
   23 |   });
   24 |
   25 |   test('should open Add Display dialog and test header options toggles', async () => {
   26 |     console.log('[TEST] Navigating to /displays-manager...');
   27 |     await page.goto('http://localhost:5173/displays-manager');
   28 |     await page.waitForTimeout(3000); // Wait 3 seconds for the app to load
   29 |     // Check for login button or prompt
   30 |     const loginButton = await page.locator('button:has-text("Login")').first();
   31 |     if (await loginButton.isVisible().catch(() => false)) {
   32 |       console.log('[TEST] Login button detected, waiting for manual login...');
   33 |       await waitForInteractiveLogin();
   34 |       console.log('[TEST] Manual login complete.');
   35 |     } else {
   36 |       console.log('[TEST] No login prompt detected, proceeding with test.');
   37 |     }
   38 |     console.log('[TEST] Page navigated. Dumping HTML:');
   39 |     const html = await page.content();
   40 |     console.log(html);
   41 |     const allButtons = await page.locator('button').allTextContents();
   42 |     console.log('[TEST] All button texts:', allButtons);
   43 |     // Diagnostic: print and assert current URL
   44 |     console.log('[TEST] Current URL:', page.url());
   45 |     expect(page.url()).toContain('/displays-manager');
   46 |     // Debug: print page title
   47 |     const title = await page.title();
   48 |     console.log('[TEST] Page title:', title);
   49 |     // Click the Add Display button
   50 |     console.log('[TEST] Looking for Add Display button...');
   51 |     const addButton = await page.getByRole('button', { name: /add new display/i });
   52 |     await expect(addButton).toBeVisible();
   53 |     console.log('[TEST] Clicking Add Display button...');
   54 |     await addButton.click();
   55 |     // Wait for dialog to appear
   56 |     const dialog = page.locator('.MuiDialog-root');
   57 |     await expect(dialog).toBeVisible();
   58 |     console.log('[TEST] Dialog is visible.');
   59 |     // Get dialog title
   60 |     const dialogTitle = await page.locator('.MuiDialogTitle-root').textContent();
   61 |     expect(dialogTitle).toBeTruthy();
   62 |     console.log('[TEST] Dialog title:', dialogTitle);
   63 |     // Get tab labels
   64 |     const tabs = page.locator('.MuiTab-root');
   65 |     const tabLabels = await tabs.allTextContents();
   66 |     console.log('[TEST] Tab labels:', tabLabels);
   67 |     // Find the Header Options tab (or similar)
   68 |     const headerTabIndex = tabLabels.findIndex(label => /header|options/i.test(label));
   69 |     expect(headerTabIndex).toBeGreaterThanOrEqual(0);
   70 |     const headerTab = tabs.nth(headerTabIndex);
   71 |     await headerTab.click();
   72 |     // Wait for tab content to load
   73 |     const tabPanel = page.locator('[role="tabpanel"]:not([hidden])');
   74 |     await expect(tabPanel).toBeVisible();
   75 |     // Find all toggles (checkboxes) in the tab panel
   76 |     const toggles = tabPanel.locator('input[type="checkbox"]');
   77 |     const toggleCount = await toggles.count();
   78 |     console.log('[TEST] Found', toggleCount, 'toggles');
   79 |     expect(toggleCount).toBeGreaterThan(0);
   80 |     // Test each toggle: click and verify state change
   81 |     for (let i = 0; i < toggleCount; i++) {
   82 |       const toggle = toggles.nth(i);
   83 |       const label = await toggle.evaluate(el => el.closest('label')?.textContent || `Toggle ${i}`);
   84 |       const initialState = await toggle.isChecked();
   85 |       await toggle.click();
   86 |       const newState = await toggle.isChecked();
   87 |       console.log(`[TEST] Toggle ${i} (${label}): ${initialState} -> ${newState}`);
   88 |       expect(newState).not.toBe(initialState);
   89 |     }
   90 |     console.log('[TEST] Test complete.');
   91 |   }, 20000);
   92 |
   93 |   test('should support manual login flow with --interactive-login', async () => {
   94 |     console.log('[TEST] Navigating to /login...');
   95 |     await page.goto('http://localhost:5173/login');
   96 |     await page.waitForTimeout(3000); // Wait 3 seconds for the app to load
   97 |     // Check for login button or prompt
   98 |     const loginButton = await page.locator('button:has-text("Login")').first();
   99 |     if (await loginButton.isVisible().catch(() => false)) {
  100 |       console.log('[TEST] Login button detected, waiting for manual login...');
  101 |       await waitForInteractiveLogin();
  102 |       console.log('[TEST] Manual login complete.');
  103 |     } else {
  104 |       console.log('[TEST] No login prompt detected, proceeding with test.');
  105 |     }
  106 |     console.log('[TEST] Page navigated. Dumping HTML:');
  107 |     const html = await page.content();
  108 |     console.log(html);
  109 |     const allButtons = await page.locator('button').allTextContents();
  110 |     console.log('[TEST] All button texts:', allButtons);
  111 |     // After login, check for a post-login UI element (e.g., user profile, dashboard, etc.)
  112 |     const dashboard = page.locator('.dashboard, .user-profile, [data-testid="dashboard"]');
> 113 |     await expect(dashboard).toBeVisible();
      |                             ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  114 |     console.log('[TEST] Manual login successful, dashboard is visible.');
  115 |   }, 20000);
  116 | }); 
```