/// <reference types="vitest" />
import * as path from "node:path";

import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";

import { baseVitestConfig } from "../../vitest.config.base.ts";

export default defineConfig(
	mergeConfig(baseVitestConfig, {
		root: import.meta.dirname,
		cacheDir: "../../node_modules/.vite/apps/web",
		plugins: [
			react(),
			vanillaExtractPlugin(),
		],

		resolve: {
      tsconfigPaths: true,
			// Use source condition to resolve workspace packages to source files
			// This works with the "source" export condition in workspace package.json files
			conditions: ["source", "import", "module", "default"],
			alias: {
				"@": path.resolve(import.meta.dirname, "./src"),
			},
		},

		// Fix for lru-cache ES module compatibility issue
		define: {
			global: 'globalThis',
		},

		optimizeDeps: {
			include: ['lru-cache'],
			force: true,
		},

		server: {
			deps: {
				inline: [
					"@bibgraph/types",
					"@bibgraph/utils",
					"@bibgraph/client",
					"@bibgraph/ui",
				],
			},
		},

		test: {
			watch: false,
			environment: "jsdom",
			setupFiles: [path.resolve(import.meta.dirname, "src/test/setup.ts")],

			// Force vitest to bundle workspace packages through vite's resolver
			deps: {
				inline: [/@bibgraph\/.*/],
			},

			// Exclude E2E and performance tests from CI - they use Playwright or are too intensive
			exclude: [
				...(baseVitestConfig.test?.exclude || []),
				"**/*.e2e.test.ts",
				"**/*.e2e.test.tsx",
				"**/*.performance.test.ts",
				"**/test/e2e/**",
			],

			// Pool options for better memory management with parallel execution
			pool: "forks",
			poolOptions: {
				forks: {
					singleFork: false,
					maxForks: 4, // Fixed max forks to avoid ES module issues
					minForks: 1,
				},
			},

			// Moderate cleanup between tests
			isolate: false,

			// Enable file-level parallel execution for faster CI
			fileParallelism: true,

			coverage: {
				reportsDirectory: "../../coverage/apps/web",
				// Skip coverage for all tests during CI to maximize speed
				exclude: [
					"src/test/**",
					"src/**/*.integration.test.{ts,tsx}",
					"src/**/*.component.test.{ts,tsx}",
					"src/**/*.unit.test.{ts,tsx}",
				],
				// No coverage collection during CI for maximum speed
				include: [],
				// Disable coverage reporters entirely
				reporter: [],
				// Use cleaner temp directory naming to avoid race conditions
				tempDirectory: "../../coverage/apps/web/.tmp",
				cleaner: true,
				// Ensure clean state for each test run
				cleanOnRerun: true,
			},

			// Named projects for targeted test execution
			// Note: Each project must explicitly set plugins, resolve.alias, setupFiles, and deps since projects run independently
			projects: [
				{
					plugins: [react(), vanillaExtractPlugin()],
					resolve: {
						tsconfigPaths: true,
						alias: {
							"@": path.resolve(import.meta.dirname, "./src"),
						},
					},
					test: {
						name: "unit",
						include: ["src/**/*.unit.test.{ts,tsx}"],
						environment: "jsdom",
						globals: true,
						setupFiles: [path.resolve(import.meta.dirname, "src/test/setup.ts")],
						deps: {
							inline: [/@bibgraph\/.*/],
						},
						// Aggressive timeouts for unit tests
						testTimeout: 3000,
						hookTimeout: 3000,
						// Enable parallel execution
						fileParallelism: true,
					},
				},
				{
					plugins: [react(), vanillaExtractPlugin()],
					resolve: {
						tsconfigPaths: true,
						alias: {
							"@": path.resolve(import.meta.dirname, "./src"),
						},
					},
					test: {
						name: "component",
						include: ["src/**/*.component.test.{ts,tsx}"],
						environment: "jsdom",
						globals: true,
						setupFiles: [path.resolve(import.meta.dirname, "src/test/setup.ts")],
						deps: {
							inline: [/@bibgraph\/.*/],
						},
						// Aggressive timeouts for component tests
						testTimeout: 5000,
						hookTimeout: 4000,
						// Enable parallel execution
						fileParallelism: true,
						// Disable coverage for component tests (already handled globally)
						coverage: { enabled: false },
					},
				},
				{
					plugins: [react(), vanillaExtractPlugin()],
					resolve: {
						tsconfigPaths: true,
						alias: {
							"@": path.resolve(import.meta.dirname, "./src"),
						},
					},
					test: {
						name: "integration",
						include: ["src/**/*.integration.test.{ts,tsx}"],
						environment: "jsdom",
						globals: true,
						setupFiles: [path.resolve(import.meta.dirname, "src/test/setup.ts")],
						deps: {
							inline: [/@bibgraph\/.*/],
						},
						// Optimized timeouts for integration tests
						testTimeout: 8000,
						hookTimeout: 6000,
						// Sequential execution for integration tests to avoid race conditions
						fileParallelism: false,
						// Disable coverage for integration tests (already handled globally)
						coverage: { enabled: false },
					},
				},
			],
		},
	}),
);
