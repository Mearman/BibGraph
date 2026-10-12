/**
 * Unit tests for the OpenAlex pool fetcher adapter: search paginates until the results run out or the pool cap is reached, id lookups are batched under OpenAlex's OR-value limit, and every id (work and reference) is normalised to the short W form so seeds, pool works and references compare equal.
 */

import { describe, expect, it } from "vitest";

import {
	createOpenAlexPoolFetcher,
	ID_LOOKUP_BATCH_SIZE,
	type PoolWorksApi,
	SEARCH_PAGE_SIZE,
} from "./openalex-pool-fetcher";

interface Call {
	readonly search?: string;
	readonly filter?: string;
	readonly page?: number;
	readonly per_page?: number;
}

const REFERENCE_ID = "W999";
const FULL_PAGES_AVAILABLE = 3;
const PAGES_ALLOWED_BY_CAP = 5;
const CAP_OVERHANG = 3;

const page = (works: readonly string[]) => ({
	results: works.map((id) => ({ id: `https://openalex.org/${id}`, referenced_works: [`https://openalex.org/${REFERENCE_ID}`] })),
});

const makeApi = (pages: readonly (readonly string[])[]): { api: PoolWorksApi; calls: Call[] } => {
	const calls: Call[] = [];
	const api: PoolWorksApi = {
		getWorks: async (params) => {
			calls.push(params);
			await Promise.resolve();
			if (params.search !== undefined) {
				return page(pages[(params.page ?? 1) - 1] ?? []);
			}
			const ids = (params.filter ?? "").replace("openalex_id:", "").split("|");
			return page(ids);
		},
	};
	return { api, calls };
};

describe("createOpenAlexPoolFetcher", () => {
	it("normalises work and reference ids to the short form", async () => {
		const { api } = makeApi([["W1"]]);
		const works = await createOpenAlexPoolFetcher(api, { maxPoolSize: 10 }).search("q");
		expect(works).toEqual([{ id: "W1", referenced_works: [REFERENCE_ID] }]);
	});

	it("paginates a full page then stops on the first short page", async () => {
		const full = Array.from({ length: SEARCH_PAGE_SIZE }, (_, i) => `W${String(i)}`);
		const { api, calls } = makeApi([full, ["Wlast"]]);
		const works = await createOpenAlexPoolFetcher(api, { maxPoolSize: SEARCH_PAGE_SIZE * PAGES_ALLOWED_BY_CAP }).search("q");
		expect(works).toHaveLength(SEARCH_PAGE_SIZE + 1);
		expect(calls.map((c) => c.page)).toEqual([1, 2]);
	});

	it("stops at the pool cap and trims to it", async () => {
		const full = Array.from({ length: SEARCH_PAGE_SIZE }, (_, i) => `W${String(i)}`);
		const { api, calls } = makeApi(Array.from({ length: FULL_PAGES_AVAILABLE }, () => full));
		const cap = SEARCH_PAGE_SIZE + CAP_OVERHANG;
		const works = await createOpenAlexPoolFetcher(api, { maxPoolSize: cap }).search("q");
		expect(works).toHaveLength(cap);
		expect(calls).toHaveLength(2);
	});

	it("batches id lookups under the OR-value limit and returns every id", async () => {
		const ids = Array.from({ length: ID_LOOKUP_BATCH_SIZE + 1 }, (_, i) => `W${String(i)}`);
		const { api, calls } = makeApi([]);
		const works = await createOpenAlexPoolFetcher(api, { maxPoolSize: 10 }).byIds(ids);
		expect(calls).toHaveLength(2);
		expect(works.map((w) => w.id)).toEqual(ids);
	});
});
