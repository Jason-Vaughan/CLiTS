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
    testTimeout: 60000,
    hookTimeout: 60000,
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
  },
}); 