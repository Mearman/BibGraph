import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@bibgraph/algorithms': resolve(__dirname, '../algorithms/src/index.ts'),
      '@bibgraph/graph-expansion': resolve(__dirname, '../graph-expansion/src/index.ts'),
      '@bibgraph/types': resolve(__dirname, '../types/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
  },
});
