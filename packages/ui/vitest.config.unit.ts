/// <reference types='vitest' />
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: import.meta.dirname,
	cacheDir: "../../node_modules/.vite/packages/ui",
	
	resolve: { tsconfigPaths: true },
	define: {
		global: "globalThis",
	},
	ssr: {
		noExternal: ["lru-cache", "@asamuzakjp/css-color", "@asamuzakjp/dom-selector"],
	},
	optimizeDeps: {
		include: ["lru-cache", "@asamuzakjp/css-color", "@asamuzakjp/dom-selector", "cssstyle"],
		force: true,
	},
	test: {
		name: "unit",
		globals: true,
		environment: "jsdom",
		watch: false,
		maxConcurrency: 1,
		maxWorkers: 1,
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.unit.test.{ts,tsx}"],
		coverage: {
			provider: "v8",
			reportsDirectory: "../../coverage/packages/ui/unit",
		},
	},
});
