import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    headless: false, // Force headed mode for manual login
  },
  testDir: './e2e',
  timeout: 30000,
  workers: 1, // Run tests sequentially
  reporter: 'list',
}); 