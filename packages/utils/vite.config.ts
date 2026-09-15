/// <reference types="vitest" />
import dts from "vite-plugin-dts";
import { defineConfig, type UserConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: import.meta.dirname,
  resolve: { tsconfigPaths: true },
  plugins: [
    dts({
      include: ["src/**/*"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      outDirs: ["dist"],
      tsconfigPath: resolve(import.meta.dirname, "tsconfig.json"),
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        logger: resolve(import.meta.dirname, "src/logger.ts"),
        "static-data/cache-utilities": resolve(import.meta.dirname, "src/static-data/cache/index.ts"),
        "static-data/cache": resolve(import.meta.dirname, "src/static-data/cache/index.ts"),
        cache: resolve(import.meta.dirname, "src/cache/index.ts"),
        "ui/filter-base": resolve(import.meta.dirname, "src/ui/filter-base.tsx"),
        "date-helpers": resolve(import.meta.dirname, "src/date-helpers.ts"),
        "data-helpers": resolve(import.meta.dirname, "src/data.ts"),
        "build-info": resolve(import.meta.dirname, "src/build-info.ts"),
        "data-evaluation": resolve(import.meta.dirname, "src/data-evaluation.ts"),
        services: resolve(import.meta.dirname, "src/services.ts"),
        validation: resolve(import.meta.dirname, "src/validation.ts"),
        "normalize-route": resolve(import.meta.dirname, "src/normalize-route.ts"),
        "storage/catalogue-db": resolve(import.meta.dirname, "src/storage/catalogue-db/index.ts"),
        "workers/messages": resolve(import.meta.dirname, "src/workers/messages.ts"),
      },
      name: "BibGraphUtils",
      formats: ["es"],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      external: [
        // Node built-ins
        /^node:/,
        // All workspace packages
        /^@bibgraph\//,
        // Common externals
        "dexie",
        "zustand",
        "immer",
      ],
      output: {
        // Generate individual files for each entry point
        preserveModules: false,
      },
    },
  },
});