import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [resolve(__dirname, 'lib/**/*.test.ts')],
    globals: true,
    environment: 'node',
  },
});
