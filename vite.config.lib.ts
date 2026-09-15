/// <reference types="vitest" />
import dts from "vite-plugin-dts";
import { defineConfig, type UserConfig } from "vite";
import { resolve } from "node:path";

/**
 * Shared Vite configuration for library builds.
 * Generates ES modules with TypeScript declarations.
 */
export function createLibConfig(options: {
  root: string;
  name: string;
  entry?: string;
  external?: string[];
}): UserConfig {
  const { root, name, entry = "src/index.ts", external = [] } = options;

  return defineConfig({
    root,
    resolve: { tsconfigPaths: true },
    plugins: [
      dts({
        include: ["src/**/*"],
        exclude: ["**/*.test.ts", "**/*.spec.ts"],
        outDirs: ["dist"],
        tsconfigPath: resolve(root, "tsconfig.json"),
      }),
    ],
    build: {
      lib: {
        entry: resolve(root, entry),
        name,
        formats: ["es"],
        fileName: () => "index.js",
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
          ...external,
        ],
        output: {
          preserveModules: true,
          preserveModulesRoot: "src",
        },
      },
    },
  });
}