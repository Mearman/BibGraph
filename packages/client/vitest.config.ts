/// <reference types='vitest' />
import * as path from "node:path"

import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig, mergeConfig } from "vite"

import { baseVitestConfig } from "../../vitest.config.base.ts"

export default defineConfig(
  mergeConfig(baseVitestConfig, {
    root: import.meta.dirname,
    cacheDir: "../../node_modules/.vite/packages/client",
    plugins: [viteStaticCopy({ targets: [{ src: "*.md", dest: "." }] })],
    resolve: {
      tsconfigPaths: true,
      // Use source condition to resolve workspace packages to source files
      conditions: ["source", "import", "module", "default"],
    },
    server: {
      deps: {
        // Inline workspace packages to resolve from source files
        inline: [
          "@bibgraph/types",
          "@bibgraph/utils",
        ],
      },
    },
    // Uncomment this if you are using workers.
    // worker: {
    // },
    test: {
      watch: false,
      environment: "node",
      // Force vitest to bundle workspace packages through vite's resolver
      deps: {
        inline: [/@bibgraph\/.*/],
      },
      coverage: {
        reportsDirectory: "../../coverage/packages/client",
      },
      projects: [
        {
          test: {
            name: "unit",
            include: ["src/**/*.unit.test.ts"],
            environment: "node",
          },
        },
        {
          test: {
            name: "integration",
            include: ["src/**/*.integration.test.ts"],
            environment: "node",
            testTimeout: 30000,
          },
        },
      ],
    },
  }),
);
