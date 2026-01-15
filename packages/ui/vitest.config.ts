/// <reference types='vitest' />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig, mergeConfig } from "vitest/config"

import { baseVitestConfig } from "../../vitest.config.base"

export default defineConfig(
	mergeConfig(baseVitestConfig, {
		root: __dirname,
		cacheDir: "../../node_modules/.vite/packages/ui",
		plugins: [nxViteTsPaths()],

		resolve: {
			// Use source condition to resolve workspace packages to source files
			conditions: ["source", "import", "module", "default"],
		},

	// Configure Node.js module resolution to handle ES module issues
		define: {
			// Ensure global exports are available for ES modules
			global: 'globalThis',
		},

		// Externalize problematic packages to avoid bundling issues
		ssr: {
			noExternal: ['lru-cache', '@asamuzakjp/css-color', '@asamuzakjp/dom-selector'],
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

		optimizeDeps: {
			include: [
				// Pre-bundle these problematic packages
				'lru-cache',
				'@asamuzakjp/css-color',
				'@asamuzakjp/dom-selector',
				'cssstyle',
			],
			// Force optimization even for dependencies
			force: true,
			},

		test: {
			globals: true,
			watch: false,
			environment: "jsdom",
			setupFiles: ["./src/test/setup.ts"],
			// Force vitest to bundle workspace packages through vite's resolver
			deps: {
				inline: [/@bibgraph\/.*/],
			},
			typecheck: {
				tsconfig: "./tsconfig.json",
			},
			coverage: {
			 reportsDirectory: "../../coverage/packages/ui",
			},
			// Named projects for targeted test execution
			projects: [
				{
					test: {
						globals: true,
						name: "unit",
						include: ["src/**/*.unit.test.{ts,tsx}"],
						environment: "jsdom",
						setupFiles: ["./src/test/setup.ts"],
					},
				},
				{
					test: {
						globals: true,
						name: "component",
						include: ["src/**/*.component.test.{ts,tsx}"],
						environment: "jsdom",
						setupFiles: ["./src/test/setup.ts"],
					},
				},
				{
					test: {
						globals: true,
						name: "integration",
						include: ["src/**/*.integration.test.{ts,tsx}"],
						environment: "jsdom",
						setupFiles: ["./src/test/setup.ts"],
						testTimeout: 30000,
					},
				},
			],
		},
	})
)
