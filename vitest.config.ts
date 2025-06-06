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
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
      ],
    },
  },
}); 