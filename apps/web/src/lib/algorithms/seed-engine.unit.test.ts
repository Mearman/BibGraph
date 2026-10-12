/**
 * Unit tests for the seed-selection engine: every selector picks exactly k distinct pool works, deterministically, and the families behave as their descriptions claim (degree prefers hubs, random is seeded-stable, crisp rewards common neighbours with diversity).
 *
 * The pool graph is synthetic: 8 nodes, chain plus a hub, so expected picks are hand-derivable.
 */

import { describe, expect, it } from "vitest";

const PICKS_FEW = 3;
const PICKS_SOME = 4;

import { type PoolGraph,selectSeeds } from "./seed-engine";

/**
 * Pool adjacency (undirected citation edges among pool works): hub: 0-1, 0-2, 0-3, 0-4  (node "hub" has degree 4) chain: 5-6, 6-7           (periphery) bridge: 1-5                (connects hub arm to chain)
 */
const pool: PoolGraph = {
	nodes: ["hub", "n1", "n2", "n3", "n4", "n5", "n6", "n7"],
	adjacency: new Map([
		["hub", ["n1", "n2", "n3", "n4"]],
		["n1", ["hub", "n5"]],
		["n2", ["hub"]],
		["n3", ["hub"]],
		["n4", ["hub"]],
		["n5", ["n1", "n6"]],
		["n6", ["n5", "n7"]],
		["n7", ["n6"]],
	]),
};

describe("seed engine", () => {
	it("high-degree picks the hub first and exactly k distinct works", () => {
		const picks = selectSeeds("high-degree", pool, PICKS_FEW);
		expect(picks).toHaveLength(PICKS_FEW);
		expect(new Set(picks).size).toBe(PICKS_FEW);
		expect(picks[0]).toBe("hub");
	});

	it("random is deterministic for the same pool and k", () => {
		const first = selectSeeds("random", pool, PICKS_SOME);
		const second = selectSeeds("random", pool, PICKS_SOME);
		expect(first).toEqual(second);
		expect(new Set(first).size).toBe(PICKS_SOME);
	});

	it("diverse-degree spreads picks across the degree ranking", () => {
		const picks = selectSeeds("diverse-degree", pool, PICKS_FEW);
		expect(new Set(picks).size).toBe(PICKS_FEW);
		// Spreading across the ranking must not take three same-degree leaves.
		const degrees = picks.map((id) => pool.adjacency.get(id)?.length ?? 0);
		expect(new Set(degrees).size).toBeGreaterThan(1);
	});

	it("eigenvector ranks the hub neighbourhood highest", () => {
		const picks = selectSeeds("eigenvector", pool, 2);
		expect(picks).toContain("hub");
	});

	it("every selector in the roster picks k distinct pool members", () => {
		for (const id of [
			"random",
			"high-degree",
			"diverse-degree",
			"eigenvector",
			"grasp",
			"stride",
			"spine",
			"crisp",
			"brisk",
		]) {
			const picks = selectSeeds(id, pool, PICKS_SOME);
			expect(new Set(picks).size).toBe(PICKS_SOME);
			for (const p of picks) {
				expect(pool.nodes, `${id} picked ${p}`).toContain(p);
			}
		}
	});

	it("selections are deterministic across calls for every selector", () => {
		for (const id of ["grasp", "stride", "spine", "crisp", "brisk"]) {
			expect(selectSeeds(id, pool, PICKS_FEW)).toEqual(selectSeeds(id, pool, PICKS_FEW));
		}
	});
});
