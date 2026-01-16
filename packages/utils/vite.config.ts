/// <reference types="vitest" />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import dts from "vite-plugin-dts";
import { defineConfig, type UserConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: __dirname,
  plugins: [
    nxViteTsPaths(),
    dts({
      include: ["src/**/*"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      outDir: "dist",
      tsconfigPath: resolve(__dirname, "tsconfig.json"),
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        logger: resolve(__dirname, "src/logger.ts"),
        "static-data/cache-utilities": resolve(__dirname, "src/static-data/cache-utilities.ts"),
        cache: resolve(__dirname, "src/cache/index.ts"),
        "ui/filter-base": resolve(__dirname, "src/ui/filter-base.tsx"),
        "date-helpers": resolve(__dirname, "src/date-helpers.ts"),
        "data-helpers": resolve(__dirname, "src/data.ts"),
        "build-info": resolve(__dirname, "src/build-info.ts"),
        "data-evaluation": resolve(__dirname, "src/data-evaluation.ts"),
        services: resolve(__dirname, "src/services.ts"),
        validation: resolve(__dirname, "src/validation.ts"),
        "normalize-route": resolve(__dirname, "src/normalize-route.ts"),
        "storage/user-interactions-db": resolve(__dirname, "src/storage/user-interactions-db.ts"),
        "storage/catalogue-db": resolve(__dirname, "src/storage/catalogue-db/index.ts"),
        "workers/messages": resolve(__dirname, "src/workers/messages.ts"),
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
