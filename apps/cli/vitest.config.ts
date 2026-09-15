/// <reference types='vitest' />
import { defineConfig, mergeConfig } from "vitest/config"

import { baseVitestConfig } from "../../vitest.config.base.ts"

export default defineConfig(mergeConfig(baseVitestConfig, {
	
	resolve: {
      tsconfigPaths: true,
		// Use source condition to resolve workspace packages to source files
		conditions: ["source", "import", "module", "default"],
	},
	server: {
		deps: {
			inline: [
				"@bibgraph/types",
				"@bibgraph/utils",
				"@bibgraph/client",
			],
		},
	},
	test: {
		watch: false,
		// Force vitest to bundle workspace packages through vite's resolver
		deps: {
			inline: [/@bibgraph\/.*/],
		},
		// Named projects for targeted test execution
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
}))
