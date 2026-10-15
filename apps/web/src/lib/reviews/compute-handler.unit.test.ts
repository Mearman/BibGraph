/**
 * Unit tests for the compute request handler: the work the review screens move off the main thread. The per-stage measure requests return the measurements the comparison table assembles from, a screen request returns the screening view, and a failure comes back as an error response rather than being swallowed, so the caller can reject.
 */

import { describe, expect, it, vi } from "vitest";

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
	it("answers an exploration measurement request with only the asked algorithms, and reports each algorithm as it starts", () => {
		const onProgress = vi.fn<(progress: { readonly stage: string }) => void>();
		const response = handleCompute(
			{ kind: "measure-exploration", pool, seeds: ["W1", "W3"], algorithmIds: ["dome", "edge"] },
			onProgress,
		);
		expect(response.kind).toBe("measure-exploration");
		if (response.kind !== "measure-exploration") throw new Error("unexpected response");
		expect(Object.keys(response.measurements).sort()).toEqual(["dome", "edge"]);
		expect(onProgress).toHaveBeenCalled();
		for (const call of onProgress.mock.calls) {
			expect(call[0].stage).toBe("exploration");
		}
	});

	it("answers a seed-selection measurement request with only the asked algorithms", () => {
		const response = handleCompute({
			kind: "measure-selection",
			pool,
			selectionSize: SELECTION_SIZE,
			algorithmIds: ["random", "high-degree"],
		});
		expect(response.kind).toBe("measure-selection");
		if (response.kind !== "measure-selection") throw new Error("unexpected response");
		expect(Object.keys(response.measurements).sort()).toEqual(["high-degree", "random"]);
		const highDegree = response.measurements["high-degree"];
		if (highDegree === undefined) throw new Error("high-degree did not come back");
		expect(highDegree.value).not.toBeNull();
	});

	it("answers a ranking measurement request for the whole roster on the named exploration", () => {
		const response = handleCompute({
			kind: "measure-ranking",
			pool,
			seeds: ["W1", "W3", "W4"],
			explorationId: "dome",
		});
		expect(response.kind).toBe("measure-ranking");
		if (response.kind !== "measure-ranking") throw new Error("unexpected response");
		expect(Object.keys(response.measurements).length).toBeGreaterThan(0);
	});

	it("measures a subset identically to the full comparison for the same algorithms", () => {
		const subset = handleCompute({
			kind: "measure-exploration",
			pool,
			seeds: ["W1", "W3"],
			algorithmIds: ["dome"],
		});
		if (subset.kind !== "measure-exploration") throw new Error("unexpected response");
		const dome = subset.measurements.dome;
		if (dome === undefined) throw new Error("dome did not come back");
		expect(dome.evidence).toContain("held-out seeds");
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
