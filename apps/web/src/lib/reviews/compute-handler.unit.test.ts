/**
 * Unit tests for the compute request handler: the work the review screens move off the main thread. A compare request returns the algorithm comparison, a screen request returns the screening view, and a failure comes back as an error response rather than being swallowed, so the caller can reject.
 */

import { describe, expect, it } from "vitest";

import type { PoolWork } from "@/lib/algorithms/screening-engine";
import type { LiteratureReview } from "@/stores/review-store";

import { defaultComposition } from "../algorithms/composition-engine";
import { handleCompute } from "./compute-handler";

const SELECTION_SIZE = 2;

const pool: readonly PoolWork[] = [
	{ id: "W1", references: [] },
	{ id: "W2", references: ["W1", "W3"] },
	{ id: "W3", references: [] },
	{ id: "W4", references: ["W2"] },
];

const review: LiteratureReview = {
	id: "r1",
	name: "r",
	query: "q",
	seeds: ["W1", "W3"],
	decisions: {},
	suggestedComposition: defaultComposition(null),
	createdAt: new Date(0),
	updatedAt: new Date(0),
};

describe("handleCompute", () => {
	it("answers a compare request with the algorithm comparison", () => {
		const response = handleCompute({ kind: "compare", pool, seeds: ["W1", "W3"], selectionSize: SELECTION_SIZE });
		expect(response.kind).toBe("compare");
		if (response.kind !== "compare") throw new Error("unexpected response");
		expect(response.comparison.exploration.length).toBeGreaterThan(0);
	});

	it("answers a screen request with the screening view", () => {
		const response = handleCompute({ kind: "screen", review, pool });
		expect(response.kind).toBe("screen");
		if (response.kind !== "screen") throw new Error("unexpected response");
		expect(response.view.seeds).toEqual(["W1", "W3"]);
		expect(response.view.semantic.map((row) => row.workId)).toContain("W2");
	});

	it("reports a failure as an error response", () => {
		const broken: LiteratureReview = { ...review, suggestedComposition: null };
		const response = handleCompute({ kind: "screen", review: broken, pool });
		expect(response.kind).toBe("error");
		if (response.kind !== "error") throw new Error("unexpected response");
		expect(response.message).toContain("no exploration algorithm");
	});

	it("answers a select request with the seeds the chosen selector picks", () => {
		const response = handleCompute({ kind: "select", pool, selectorId: "high-degree", size: SELECTION_SIZE });
		expect(response.kind).toBe("select");
		if (response.kind !== "select") throw new Error("unexpected response");
		expect(response.seeds).toHaveLength(SELECTION_SIZE);
		expect(response.seeds[0]).toBe("W2");
	});
});
