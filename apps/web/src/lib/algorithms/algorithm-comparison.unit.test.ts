/**
 * Unit tests for the algorithm comparison: every roster algorithm appears with its family, measured on the review's own pool (held-out seed recovery for exploration, one-hop coverage for seed selection), exactly one algorithm per decided stage is marked chosen, and the chosen rows are the ones the suggestion would pick.
 */

import { describe, expect, it } from "vitest";

import { compareAlgorithms } from "./algorithm-comparison";
import { algorithmsByStage } from "./registry";
import type { PoolWork } from "./screening-engine";

const SELECTION_SIZE = 2;

/**
 * Hub-and-chain pool where every edge is a direct citation.
 */
const pool: readonly PoolWork[] = [
	{ id: "hub", references: ["n1", "n2", "n3", "n4"] },
	{ id: "n1", references: ["hub", "n5"] },
	{ id: "n2", references: ["hub"] },
	{ id: "n3", references: ["hub"] },
	{ id: "n4", references: ["hub"] },
	{ id: "n5", references: ["n1", "n6"] },
	{ id: "n6", references: ["n5", "n7"] },
	{ id: "n7", references: ["n6"] },
];

describe("compareAlgorithms", () => {
	it("lists every roster algorithm of each stage with its family", () => {
		const comparison = compareAlgorithms(pool, ["hub", "n7"], { selectionSize: SELECTION_SIZE });
		for (const stage of ["exploration", "seed-selection", "ranking"] as const) {
			const expected = algorithmsByStage(stage).map((spec) => [spec.id, spec.family]);
			const actual = comparison[stage].map((row) => [row.algorithmId, row.family]);
			expect(actual).toEqual(expected);
		}
	});

	it("measures exploration by held-out recovery when there are two or more seeds", () => {
		const comparison = compareAlgorithms(pool, ["hub", "n7"], { selectionSize: SELECTION_SIZE });
		for (const row of comparison.exploration) {
			expect(row.value).not.toBeNull();
			expect(row.evidence).toContain("held-out seeds on this pool");
		}
	});

	it("leaves exploration unmeasured, with the reason, when seeds cannot be held out", () => {
		const comparison = compareAlgorithms(pool, ["hub"], { selectionSize: SELECTION_SIZE });
		for (const row of comparison.exploration) {
			expect(row.value).toBeNull();
			expect(row.evidence).toContain("two or more seeds");
		}
	});

	it("marks exactly one chosen row in exploration, and in selection only for a zero-seeds review", () => {
		const seeded = compareAlgorithms(pool, ["hub", "n7"], { selectionSize: SELECTION_SIZE });
		expect(seeded.exploration.filter((row) => row.chosen)).toHaveLength(1);
		expect(seeded["seed-selection"].filter((row) => row.chosen)).toHaveLength(0);
		const unseeded = compareAlgorithms(pool, [], { selectionSize: SELECTION_SIZE });
		expect(unseeded["seed-selection"].filter((row) => row.chosen)).toHaveLength(1);
	});

	it("measures every selector's coverage even when the review already has seeds", () => {
		const comparison = compareAlgorithms(pool, ["hub", "n7"], { selectionSize: SELECTION_SIZE });
		for (const row of comparison["seed-selection"]) {
			expect(row.value).not.toBeNull();
		}
	});

	it("marks the roster-order maximum chosen on a tie", () => {
		const comparison = compareAlgorithms(pool, ["hub", "n7"], { selectionSize: SELECTION_SIZE });
		const chosen = comparison.exploration.find((row) => row.chosen);
		const best = Math.max(...comparison.exploration.map((row) => row.value ?? -Infinity));
		const firstBest = comparison.exploration.find((row) => row.value === best);
		expect(chosen?.algorithmId).toBe(firstBest?.algorithmId);
	});

	it("is deterministic across calls", () => {
		expect(compareAlgorithms(pool, ["hub", "n7"], { selectionSize: SELECTION_SIZE })).toEqual(
			compareAlgorithms(pool, ["hub", "n7"], { selectionSize: SELECTION_SIZE }),
		);
	});
});
