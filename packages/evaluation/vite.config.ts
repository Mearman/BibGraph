import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'BibGraphEvaluation',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['@bibgraph/types', '@bibgraph/algorithms'],
      output: {
        globals: {
          '@bibgraph/types': 'BibGraphTypes',
          '@bibgraph/algorithms': 'BibGraphAlgorithms'
        }
      }
    },
    target: 'esnext',
    minify: false
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist']
  }
});
