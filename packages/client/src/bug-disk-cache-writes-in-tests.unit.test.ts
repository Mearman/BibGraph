/**
 * Regression test: disk caching is on unless BIBGRAPH_DISK_CACHE_ENABLED is "false", so the client's own tests wrote their responses into the tracked static data under apps/web/public/data/openalex on every run. The test environment must switch it off.
 */

import { describe, expect, it } from "vitest";

describe("test environment isolation", () => {
	it("disables the client disk cache so tests never write tracked static data", () => {
		expect(process.env.BIBGRAPH_DISK_CACHE_ENABLED).toBe("false");
	});
});
