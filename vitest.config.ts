/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      'src/**/*.spec.ts',
      'moveto_OnDeck/**/*',
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    environment: 'node',
    globals: true,
    setupFiles: [],
    testTimeout: process.env.CI ? 30000 : 60000,
    hookTimeout: process.env.CI ? 30000 : 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
      ],
    },
    env: {
      CHROME_TEST_MODE: process.env.CI ? 'mock' : 'real',
    },
    retry: process.env.CI ? 2 : 0,
  },
}); 