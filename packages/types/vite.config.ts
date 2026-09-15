import dts from "vite-plugin-dts";
import { defineConfig } from "vite";
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
      entry: resolve(import.meta.dirname, "src/index.ts"),
      name: "BibGraphTypes",
      formats: ["es"],
      fileName: () => "index.js",
    },
    sourcemap: true,
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      external: [/^node:/, /^@bibgraph\//],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
      },
    },
  },
});