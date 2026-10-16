/**
 * Regression test: constructing the client's cache tiers must not touch the
 * Node-only `process` binding. A service worker that imports the client
 * barrel (the Background Sync drain does) evaluates these constructors at
 * import time in a context with no `process` global, which threw a
 * ReferenceError and failed the worker's script evaluation outright.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

describe("client code without a process binding", () => {
	

	beforeAll(async () => {
		await loadProvider();
		// A browser service worker has no `process` at all; simulate exactly that shape (the declared type keeps Node's Process, so the test file coerces it away, which tests may do).
		globalThis.process = undefined as unknown as typeof globalThis.process;
	});

	afterAll(() => {
		globalThis.process = process;
	});

	it("builds the GitHub Pages tier's retry policy without reading process", async () => {
		const { GitHubPagesCacheTier } = await loadTier();
		expect(() => new GitHubPagesCacheTier("https://example.com/data/")).not.toThrow();
	});

	it("reads environment info from the static data provider without process", async () => {
		const provider = await loadProvider();
		expect(() => provider.getEnvironmentInfo()).not.toThrow();
	});
});
