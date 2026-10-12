/**
 * Unit tests for the review pool loader: a Boolean query becomes a pool of works with their reference lists, seeds missing from the query results are fetched and added so a seed is never absent from its own pool, and results are deduplicated and order-stable. The OpenAlex fetcher is injected, so the tests run offline.
 */

import { describe, expect, it } from "vitest";

import { loadReviewPool, type PoolFetcher } from "./pool-loader";

const work = (id: string, references: readonly string[]) => ({ id, referenced_works: references });

const makeFetcher = (): { fetcher: PoolFetcher; searchCalls: string[]; idCalls: string[][] } => {
	const searchCalls: string[] = [];
	const idCalls: string[][] = [];
	const fetcher: PoolFetcher = {
		search: async (query) => {
			searchCalls.push(query);
			await Promise.resolve();
			return [work("W1", ["W2", "W9"]), work("W2", ["W1"]), work("W1", ["W2", "W9"])];
		},
		byIds: async (ids) => {
			idCalls.push([...ids]);
			await Promise.resolve();
			return ids.map((id) => work(id, ["W1"]));
		},
	};
	return { fetcher, searchCalls, idCalls };
};

describe("loadReviewPool", () => {
	it("turns query results into deduplicated pool works with references", async () => {
		const { fetcher, searchCalls } = makeFetcher();
		const pool = await loadReviewPool({ query: "malaria AND gut", seeds: [] }, fetcher);
		expect(searchCalls).toEqual(["malaria AND gut"]);
		expect(pool.map((w) => w.id)).toEqual(["W1", "W2"]);
		expect(pool[0].references).toEqual(["W2", "W9"]);
	});

	it("fetches seeds that the query did not return and adds them to the pool", async () => {
		const { fetcher, idCalls } = makeFetcher();
		const pool = await loadReviewPool({ query: "malaria AND gut", seeds: ["W1", "W7"] }, fetcher);
		expect(idCalls).toEqual([["W7"]]);
		expect(pool.map((w) => w.id)).toEqual(["W1", "W2", "W7"]);
	});

	it("skips the search for an empty query and builds the pool from seeds alone", async () => {
		const { fetcher, searchCalls } = makeFetcher();
		const pool = await loadReviewPool({ query: "  ", seeds: ["W7"] }, fetcher);
		expect(searchCalls).toEqual([]);
		expect(pool.map((w) => w.id)).toEqual(["W7"]);
	});

	it("rejects when there is neither a query nor seeds, so the failure is loud", async () => {
		const { fetcher } = makeFetcher();
		await expect(loadReviewPool({ query: "", seeds: [] }, fetcher)).rejects.toThrow("query or seeds");
	});
});
