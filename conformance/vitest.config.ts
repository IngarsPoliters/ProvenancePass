import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test-vectors/**'
      ]
    },
    testTimeout: 30000, // 30 seconds for crypto operations
    reporters: ['verbose'],
    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json'
    }
  }
});