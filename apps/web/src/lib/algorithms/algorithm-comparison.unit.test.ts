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
			expect(row.evidence).toMatch(/^recovered \d+ of 2 held-out seeds within a budget of \d+ works$/);
		}
	});

	it("leaves exploration unmeasured, with the reason, when seeds cannot be held out", () => {
		const comparison = compareAlgorithms(pool, ["hub"], { selectionSize: SELECTION_SIZE });
		for (const row of comparison.exploration) {
			expect(row.value).toBeNull();
			expect(row.evidence).toContain("two or more seeds");
		}
	});

	it("marks exactly one chosen row per measured stage, whether or not the review has seeds", () => {
		for (const seeds of [["hub", "n7"], []]) {
			const comparison = compareAlgorithms(pool, seeds, { selectionSize: SELECTION_SIZE });
			expect(comparison.exploration.filter((row) => row.chosen)).toHaveLength(1);
			expect(comparison["seed-selection"].filter((row) => row.chosen)).toHaveLength(1);
		}
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

	it("measures rankers by held-out recovery once there are three seeds, and not before", () => {
		const measured = compareAlgorithms(pool, ["hub", "n7", "n3"], { selectionSize: SELECTION_SIZE });
		for (const row of measured.ranking) {
			expect(row.value).not.toBeNull();
			expect(row.evidence).toMatch(/^recovered \d+ of 3 held-out seeds in the top \d+ candidates$/);
		}
		expect(measured.ranking.filter((row) => row.chosen)).toHaveLength(1);
		const unmeasured = compareAlgorithms(pool, ["hub", "n7"], { selectionSize: SELECTION_SIZE });
		for (const row of unmeasured.ranking) {
			expect(row.value).toBeNull();
			expect(row.evidence).toContain("three or more seeds");
		}
		expect(unmeasured.ranking.filter((row) => row.chosen)).toHaveLength(1);
	});

	it("measures on at most three held-out seeds however many seeds the review has", () => {
		const comparison = compareAlgorithms(pool, ["hub", "n7", "n3", "n1", "n5"], { selectionSize: SELECTION_SIZE });
		for (const row of [...comparison.exploration, ...comparison.ranking]) {
			expect(row.evidence).toContain("of 3 held-out seeds");
		}
	});
});
