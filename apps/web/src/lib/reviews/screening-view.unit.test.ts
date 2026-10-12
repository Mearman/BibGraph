/**
 * Unit tests for the screening view-model: the semantic path folds inclusions into the seeds and hides decided works, the standard path keeps query order, evidence lines describe each row's position, titles come from fetched labels with the id as fallback, and the visible window is capped.
 */

import { describe, expect, it } from "vitest";

import type { LiteratureReview } from "@/stores/review-store";

import { suggestComposition } from "../algorithms/composition-engine";
import type { PoolWork } from "../algorithms/screening-engine";
import type { WorkLabel } from "../algorithms/work-labels";
import { buildScreeningView, VISIBLE_ROWS, withLabels } from "./screening-view";

const SELECTION_SIZE = 2;
const ROWS_BEYOND_WINDOW = 5;
const FIRST_EXTRA_WORK_NUMBER = 10;

/**
 * Chain pool: seeds W1 and W3 with W2 citing both (a direct bridge) and W4 citing W2.
 */
const pool: readonly PoolWork[] = [
	{ id: "W1", references: [] },
	{ id: "W2", references: ["W1", "W3"] },
	{ id: "W3", references: [] },
	{ id: "W4", references: ["W2"] },
];

const reviewWith = (decisions: LiteratureReview["decisions"]): LiteratureReview => ({
	id: "r1",
	name: "r",
	query: "q",
	seeds: ["W1", "W3"],
	decisions,
	suggestedComposition: suggestComposition(pool, ["W1", "W3"], { selectionSize: SELECTION_SIZE }),
	createdAt: new Date(0),
	updatedAt: new Date(0),
});

describe("buildScreeningView", () => {
	it("ranks the semantic path with association evidence and no seeds", () => {
		const view = buildScreeningView(reviewWith({}), pool);
		expect(view.semantic.map((item) => item.workId)).toContain("W2");
		expect(view.semantic.map((item) => item.workId)).not.toContain("W1");
		expect(view.semantic[0].detail).toMatch(/^Association \d\.\d{3}/);
	});

	it("folds inclusions into the seeds and hides decided works on the semantic path", () => {
		const view = buildScreeningView(reviewWith({ W2: "include", W4: "exclude" }), pool);
		expect(view.seeds).toEqual(["W1", "W3", "W2"]);
		expect(view.semantic.map((item) => item.workId)).toEqual([]);
	});

	it("lists the standard path in query order with the rank as evidence", () => {
		const view = buildScreeningView(reviewWith({ W3: "exclude" }), pool);
		expect(view.standard.map((item) => item.workId)).toEqual(["W2", "W4"]);
		expect(view.standard[0].detail).toBe("Query rank 1");
	});

	it("counts decisions", () => {
		const view = buildScreeningView(reviewWith({ W2: "include", W4: "exclude" }), pool);
		expect(view.includedCount).toBe(1);
		expect(view.excludedCount).toBe(1);
	});

	it("caps each path at the visible window", () => {
		const wide: PoolWork[] = [
			{ id: "W1", references: [] },
			...Array.from({ length: VISIBLE_ROWS + ROWS_BEYOND_WINDOW }, (_, i) => ({ id: `W${String(i + FIRST_EXTRA_WORK_NUMBER)}`, references: ["W1"] })),
		];
		const review: LiteratureReview = { ...reviewWith({}), seeds: ["W1"] };
		const view = buildScreeningView(review, wide);
		expect(view.standard).toHaveLength(VISIBLE_ROWS);
	});
});

describe("withLabels", () => {
	it("attaches title and year, falling back to the id when no label was fetched", () => {
		const labels = new Map<string, WorkLabel>([["W2", { title: "Bridge paper", year: 2021 }]]);
		const rows = withLabels(
			[
				{ workId: "W2", detail: "d2" },
				{ workId: "W9", detail: "d9" },
			],
			labels,
		);
		expect(rows).toEqual([
			{ workId: "W2", title: "Bridge paper", year: 2021, detail: "d2" },
			{ workId: "W9", title: "W9", year: null, detail: "d9" },
		]);
	});
});
