/// <reference types='vitest' />
import * as path from "node:path";

import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: __dirname,
	cacheDir: "../../node_modules/.vite/packages/client",
	plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(["*.md"])],
	resolve: {
		alias: {
			"@bibgraph/types/entities": path.resolve(__dirname, "../../packages/types/src/entities/index.ts"),
			"@bibgraph/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
			"@bibgraph/utils": path.resolve(__dirname, "../../packages/utils/src/index.ts"),
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
