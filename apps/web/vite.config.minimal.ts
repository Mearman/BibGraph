import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';


const __filename = fileURLToPath(import.meta.url);

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
  ],

  root: resolve(import.meta.dirname),
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
  },

  resolve: {
      tsconfigPaths: true,
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },

  define: {
    global: 'globalThis',
  },
});
