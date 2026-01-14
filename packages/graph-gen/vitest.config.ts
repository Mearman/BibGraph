import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.unit.test.ts', '**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist'],
    root: resolve(__dirname, 'src'),
    testTimeout: 10_000,
  },
});
