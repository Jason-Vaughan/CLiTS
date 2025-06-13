# OnDeck E2E Tests

These test files were originally part of the CLITS development process but are specific to OnDeck's Displays Manager functionality. They have been moved here to keep CLITS generic and project-agnostic.

## Files

- `displays-manager.test.ts`: E2E tests for the Displays Manager UI
- `manual-login.ts`: Helper for handling interactive login during tests

## Setup

1. Install dependencies:
   ```bash
   npm install @playwright/test
   ```

2. Start Chrome with remote debugging:
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```

3. Start the development server:
   ```bash
   npm run dev  # Should be running on localhost:5173
   ```

4. Run the tests:
   ```bash
   npx playwright test displays-manager.test.ts
   ```

## Test Coverage

The tests verify:
- Navigation to the Displays Manager
- Adding new displays
- Header options functionality
- Toggle state management
- Login flow (when needed)

## Notes

- Tests use CLITS for Chrome debugging and log collection
- Manual login is supported via interactive prompts
- Tests are designed to work with Material-UI components 