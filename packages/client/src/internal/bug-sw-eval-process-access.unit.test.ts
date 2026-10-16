/**
 * Regression test: constructing the client's cache tiers must not touch the
 * Node-only `process` binding. A service worker that imports the client
 * barrel (the Background Sync drain does) evaluates these constructors at
 * import time in a context with no `process` global, which threw a
 * ReferenceError and failed the worker's script evaluation outright. The
 * binding is undefined only inside each synchronous assertion window, so
 * vitest's own process usage between tests never sees it go missing.
 */

import { describe, expect, it } from "vitest";

/**
 * The tiers and the provider form an import cycle (the tiers extend the
 * provider's CacheTier base, the provider constructs the tiers), so the test
 * imports them dynamically once the graph has settled, entering from the
 * provider side the way production entry points do; entering from the tier
 * side leaves the tier class unfinished when the provider constructs it.
 */
const loadProvider = async (): Promise<{ readonly getEnvironmentInfo: () => unknown }> =>
	import("./static-data-provider").then((module) => module.staticDataProvider);

const loadTier = async (): Promise<{ readonly GitHubPagesCacheTier: new (baseUrl?: string) => object }> =>
	import("./cache/tiers/githubpages");

const withoutProcess = (run: () => void): void => {
	
	// A browser service worker has no `process` at all; simulate exactly that shape (the declared type keeps Node's Process, so the test file coerces it away, which tests may do).
	globalThis.process = undefined as unknown as typeof globalThis.process;
	try {
		run();
	} finally {
		globalThis.process = process;
	}
};

describe("client code without a process binding", () => {
	it("builds the GitHub Pages tier's retry policy without reading process", async () => {
		await loadProvider();
		const { GitHubPagesCacheTier } = await loadTier();
		withoutProcess(() => {
			expect(() => new GitHubPagesCacheTier("https://example.com/data/")).not.toThrow();
		});
	});

	it("reads environment info from the static data provider without process", async () => {
		const provider = await loadProvider();
		withoutProcess(() => {
			expect(() => provider.getEnvironmentInfo()).not.toThrow();
		});
	});
});
