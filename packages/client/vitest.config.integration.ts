/// <reference types='vitest' />
import * as path from "node:path";

import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: import.meta.dirname,
	cacheDir: "../../node_modules/.vite/packages/client",
	plugins: [viteStaticCopy({ targets: [{ src: "*.md", dest: "." }] })],
	resolve: {
      tsconfigPaths: true,
		alias: {
			"@bibgraph/types/entities": path.resolve(import.meta.dirname, "../../packages/types/src/entities/index.ts"),
			"@bibgraph/types": path.resolve(import.meta.dirname, "../../packages/types/src/index.ts"),
			"@bibgraph/utils": path.resolve(import.meta.dirname, "../../packages/utils/src/index.ts"),
		},
	},
	test: {
		name: "integration",
		globals: true,
		environment: "node",
		watch: false,
		maxConcurrency: 1,
		maxWorkers: 1,
		testTimeout: 30000,
		include: ["src/**/*.integration.test.ts"],
		// Exclude tests with workspace package resolution issues until fixed
		exclude: [
			"src/cache/__tests__/cache-performance.integration.test.ts",
			"src/cache/__tests__/cache.integration.test.ts",
			"src/utils/__tests__/autocomplete.integration.test.ts",
		],
		coverage: {
			provider: "v8",
			reportsDirectory: "../../coverage/packages/client/integration",
		},
	},
});
