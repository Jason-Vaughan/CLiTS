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
    reporters: process.env.CI ? ['dot'] : ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/types/**/*.ts',
        'src/**/index.ts',
        '**/__tests__/**'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    env: {
      CHROME_TEST_MODE: process.env.CI ? 'mock' : 'real',
    },
    retry: process.env.CI ? 2 : 0,
  },
}); 