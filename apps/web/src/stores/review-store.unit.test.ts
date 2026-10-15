/**
 * Unit tests for the literature-review store: CRUD over the Dexie reviews table and the screening-decision updates the refine loop feeds back. Written test-first (constitution II): these must fail before the store exists.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { MeasurementRecord } from "@/lib/reviews/measurement-cache";

import {
	clearDecision,
	createReview,
	deleteReview,
	getMeasurements,
	getPool,
	getReview,
	listReviews,
	type LiteratureReview,
	saveMeasurements,
	savePool,
	setDecision,
	updateReview,
} from "./review-store";

const emptyDecision = (review: LiteratureReview): number =>
	Object.keys(review.decisions).length;

/**
 * Coverage fixtures: a half-covered pool, and exploration recovery counts before and after every held-out seed is found.
 */
const HALF_COVERED = 0.5;
const RECOVERED_SOME = 2;
const RECOVERED_ALL = 3;

describe("review store", () => {
	beforeEach(async () => {
		const store = await import("./review-store");
		await store.clearAllReviewsForTests();
	});

	it("creates a review with a name and query, defaults intact", async () => {
		const review = await createReview({ name: "Malaria barrier", query: '("malaria" AND "gut")' });
		expect(review.id).toBeTruthy();
		expect(review.name).toBe("Malaria barrier");
		expect(review.seeds).toEqual([]);
		expect(review.decisions).toEqual({});
		expect(emptyDecision(review)).toBe(0);
		const stored = await getReview(review.id);
		expect(stored?.query).toBe('("malaria" AND "gut")');
	});

	it("lists reviews in creation order and deletes by id", async () => {
		const first = await createReview({ name: "first", query: "" });
		const second = await createReview({ name: "second", query: "" });
		const listed = await listReviews();
		expect(listed.map((r) => r.name)).toEqual(["first", "second"]);
		await deleteReview(first.id);
		const afterDelete = await listReviews();
		expect(afterDelete.map((r) => r.id)).toEqual([second.id]);
		expect(await getReview(first.id)).toBeUndefined();
	});

	it("records include and exclude decisions and updates fields", async () => {
		const review = await createReview({ name: "decide", query: "" });
		await setDecision(review.id, "W1", "include");
		await setDecision(review.id, "W2", "exclude");
		await setDecision(review.id, "W1", "exclude");
		const stored = await getReview(review.id);
		expect(stored?.decisions.W1).toBe("exclude");
		expect(stored?.decisions.W2).toBe("exclude");
		expect(emptyDecision(stored ?? review)).toBe(2);
		await updateReview(review.id, { name: "renamed" });
		const renamed = await getReview(review.id);
		expect(renamed?.name).toBe("renamed");
	});

	it("clears a decision by removing its key so the work is undecided again", async () => {
		const review = await createReview({ name: "undo", query: "" });
		await setDecision(review.id, "W1", "include");
		await setDecision(review.id, "W2", "exclude");
		await clearDecision(review.id, "W1");
		const stored = await getReview(review.id);
		expect(Object.keys(stored?.decisions ?? {})).toEqual(["W2"]);
		await expect(clearDecision("missing", "W1")).rejects.toThrow("review not found");
	});

	it("persists a suggested composition with its evidence", async () => {
		const review = await createReview({ name: "composed", query: "" });
		const composition = {
			exploration: { algorithmId: "frontier-balanced", evidence: "top-10 recovery 56%", chosenBy: "app" as const },
			ranking: { algorithmId: "association", evidence: "recovery 50% at top-10", chosenBy: "app" as const },
			seedSelection: null,
		};
		await updateReview(review.id, { suggestedComposition: composition });
		const stored = await getReview(review.id);
		const suggested = stored?.suggestedComposition;
		expect(suggested).not.toBeNull();
		expect(suggested?.exploration?.algorithmId).toBe("frontier-balanced");
		expect(suggested?.ranking?.evidence).toBe("recovery 50% at top-10");
		expect(suggested?.seedSelection).toBeNull();
	});

	it("keeps the pool snapshot of a review and removes it with the review", async () => {
		const review = await createReview({ name: "pooled", query: "q" });
		expect(await getPool(review.id)).toBeUndefined();
		const pool = [
			{ id: "W1", references: ["W2"] },
			{ id: "W2", references: [] },
		];
		await savePool(review.id, pool);
		expect(await getPool(review.id)).toEqual(pool);
		await deleteReview(review.id);
		expect(await getPool(review.id)).toBeUndefined();
	});

	it("stores measured algorithm cells per key and replaces a cell when it is measured again", async () => {
		const review = await createReview({ name: "measured", query: "q" });
		expect(await getMeasurements(review.id)).toEqual([]);
		const cells: readonly MeasurementRecord[] = [
			{
				key: "r|exploration|dome|pool1|seeds1",
				reviewId: review.id,
				stage: "exploration",
				algorithmId: "dome",
				value: RECOVERED_SOME,
				evidence: "recovered 2 of 3 held-out seeds within a budget of 32 works",
			},
			{
				key: "r|seed-selection|grasp|pool1",
				reviewId: review.id,
				stage: "seed-selection",
				algorithmId: "grasp",
				value: HALF_COVERED,
				evidence: "picks cover 2 of 4 pool works within one hop",
			},
		];
		await saveMeasurements(review.id, cells);
		expect(await getMeasurements(review.id)).toEqual(cells);
		// Re-measuring one cell overwrites it by key and leaves the other untouched.
		const remeasured: readonly MeasurementRecord[] = [
			{
				...cells[0],
				value: RECOVERED_ALL,
				evidence: "recovered 3 of 3 held-out seeds within a budget of 32 works",
			},
		];
		await saveMeasurements(review.id, remeasured);
		const stored = await getMeasurements(review.id);
		expect(stored).toHaveLength(2);
		expect(stored.find((cell) => cell.algorithmId === "dome")?.value).toBe(RECOVERED_ALL);
		expect(stored.find((cell) => cell.algorithmId === "grasp")?.value).toBe(HALF_COVERED);
	});

	it("removes a review's measured cells with the review", async () => {
		const review = await createReview({ name: "gone", query: "q" });
		await saveMeasurements(review.id, [
			{
				key: "r|exploration|dome|pool1|seeds1",
				reviewId: review.id,
				stage: "exploration",
				algorithmId: "dome",
				value: 2,
				evidence: "recovered 2 of 3 held-out seeds within a budget of 32 works",
			},
		]);
		await deleteReview(review.id);
		expect(await getMeasurements(review.id)).toEqual([]);
	});
});
