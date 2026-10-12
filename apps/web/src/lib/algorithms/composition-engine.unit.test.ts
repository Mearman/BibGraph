/**
 * Unit tests for the composition suggestion engine: each stage's algorithm is chosen by measured performance on the review's own pool (held-out seed recovery for exploration, one-hop pool coverage for seed selection), the ranking stage names its sole candidate, and every suggestion is deterministic with evidence naming the measurement.
 */

import { describe, expect, it } from "vitest";

import type { SuggestedComposition } from "../../stores/review-store";
import { compareAlgorithms, oneHopCoverage } from "./algorithm-comparison";
import { adoptMeasured, defaultComposition, suggestComposition } from "./composition-engine";
import { algorithmsByStage } from "./registry";
import { buildPoolAssociation,type PoolWork } from "./screening-engine";
import { selectSeeds } from "./seed-engine";

/**
 * A tiny association chain: s1 - m - s2, so every exploration algorithm samples the whole pool and the exploration measurement ties, exercising the deterministic roster-first tie-break.
 */
const chainPool: readonly PoolWork[] = [
	{ id: "s1", references: ["m"] },
	{ id: "m", references: ["s1", "s2"] },
	{ id: "s2", references: ["m"] },
];

/**
 * Hub-and-chain pool (see seed-engine tests): hub cites n1-n4, n1 cites n5, n5 cites n6, n6 cites n7; every edge is a direct citation.
 */
const hubPool: readonly PoolWork[] = [
	{ id: "hub", references: ["n1", "n2", "n3", "n4"] },
	{ id: "n1", references: ["hub", "n5"] },
	{ id: "n2", references: ["hub"] },
	{ id: "n3", references: ["hub"] },
	{ id: "n4", references: ["hub"] },
	{ id: "n5", references: ["n1", "n6"] },
	{ id: "n6", references: ["n5", "n7"] },
	{ id: "n7", references: ["n6"] },
];

const SELECTION_SIZE = 2;

const toPoolGraph = (pool: readonly PoolWork[]) => {
	const adjacency = new Map<string, readonly string[]>();
	const { graph } = buildPoolAssociation(pool);
	for (const work of pool) {
		adjacency.set(work.id, [...graph.neighbours(work.id)]);
	}
	return { nodes: pool.map((work) => work.id), adjacency };
};

describe("composition engine", () => {
	it("picks the roster-first exploration when all algorithms recover every held-out seed", () => {
		const suggestion = suggestComposition(chainPool, ["s1", "s2"], { selectionSize: SELECTION_SIZE });
		expect(suggestion.exploration?.algorithmId).toBe("standard-bfs");
		expect(suggestion.exploration?.evidence).toMatch(/^recovered \d+ of 2 held-out seeds within a budget of \d+ works$/);
	});

	it("defaults the exploration with stated evidence when there are fewer seeds than hold-out needs", () => {
		const suggestion = suggestComposition(hubPool, [], { selectionSize: SELECTION_SIZE });
		expect(suggestion.exploration?.algorithmId).toBe("standard-bfs");
		expect(suggestion.exploration?.evidence).toContain("no seeds to measure against");
	});

	it("names the roster-default ranking with its evidence when seeds cannot be held out", () => {
		const suggestion = suggestComposition(chainPool, ["s1", "s2"], { selectionSize: SELECTION_SIZE });
		expect(suggestion.ranking?.algorithmId).toBe("parse-structural");
		expect(suggestion.ranking?.evidence).toContain("three or more seeds");
	});

	it("leaves seed selection unsuggested while the review has seeds", () => {
		const suggestion = suggestComposition(chainPool, ["s1"], { selectionSize: SELECTION_SIZE });
		expect(suggestion.seedSelection).toBeNull();
	});

	it("suggests the selector with maximal one-hop pool coverage for a zero-seeds start", () => {
		const suggestion = suggestComposition(hubPool, [], { selectionSize: SELECTION_SIZE });
		expect(suggestion.seedSelection).not.toBeNull();
		const poolGraph = toPoolGraph(hubPool);
		const coverageById = new Map(
			algorithmsByStage("seed-selection").map((spec) => [
				spec.id,
				oneHopCoverage(hubPool, selectSeeds(spec.id, poolGraph, SELECTION_SIZE)),
			]),
		);
		const best = Math.max(...coverageById.values());
		expect(oneHopCoverage(hubPool, selectSeeds(suggestion.seedSelection?.algorithmId ?? "", poolGraph, SELECTION_SIZE))).toBe(best);
		expect(suggestion.seedSelection?.evidence).toContain("of 8 pool works within one hop");
	});

	it("is deterministic across calls", () => {
		const first: SuggestedComposition = suggestComposition(hubPool, ["hub", "n7"], { selectionSize: SELECTION_SIZE });
		const second = suggestComposition(hubPool, ["hub", "n7"], { selectionSize: SELECTION_SIZE });
		expect(first).toEqual(second);
	});
});

describe("defaultComposition", () => {
	it("runs the first roster algorithm of exploration and ranking, marked as an unmeasured default", () => {
		const composition = defaultComposition(null);
		expect(composition.exploration?.algorithmId).toBe("standard-bfs");
		expect(composition.exploration?.chosenBy).toBe("app");
		expect(composition.exploration?.evidence).toContain("default");
		expect(composition.ranking?.algorithmId).toBe("parse-structural");
		expect(composition.ranking?.evidence).toContain("default");
		expect(composition.seedSelection).toBeNull();
	});
});

describe("adoptMeasured", () => {
	const comparison = compareAlgorithms(hubPool, ["hub", "n7", "n3"], { selectionSize: SELECTION_SIZE });

	it("replaces app-made picks with the measured best", () => {
		const adopted = adoptMeasured(defaultComposition(null), comparison);
		const measuredExploration = comparison.exploration.find((row) => row.chosen);
		expect(adopted.exploration?.algorithmId).toBe(measuredExploration?.algorithmId);
		expect(adopted.exploration?.evidence).toBe(measuredExploration?.evidence);
		expect(adopted.exploration?.chosenBy).toBe("app");
	});

	it("never replaces a reviewer override", () => {
		const overridden = {
			...defaultComposition(null),
			ranking: { algorithmId: "path-katz", evidence: "chosen by reviewer", chosenBy: "reviewer" as const },
		};
		expect(adoptMeasured(overridden, comparison).ranking).toEqual(overridden.ranking);
	});

	it("returns the same composition object once it already matches the measurement", () => {
		const once = adoptMeasured(defaultComposition(null), comparison);
		expect(adoptMeasured(once, comparison)).toBe(once);
	});

	it("leaves the seed selection alone", () => {
		const selection = { algorithmId: "grasp", evidence: "picked at start", chosenBy: "app" as const };
		expect(adoptMeasured(defaultComposition(selection), comparison).seedSelection).toEqual(selection);
	});
});
