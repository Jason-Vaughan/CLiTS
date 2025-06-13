/*
 * Manual Login Helper
 * 
 * This helper provides interactive login functionality for E2E tests.
 * It pauses test execution and waits for manual user login when needed.
 */

import readline from 'readline';

export async function waitForInteractiveLogin(): Promise<void> {
  return new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('\n[TEST] Please log in to the app in the opened browser window, then press Enter to continue...\n', () => {
      rl.close();
      resolve();
    });
  });
} 