import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    headless: false, // Keep browser visible for interactive use
  },
  timeout: 30000,
  workers: 1, // Run sequentially for better debugging
}); 