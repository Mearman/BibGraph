/**
 * Unit tests for the literature-review store: CRUD over the Dexie reviews table and the screening-decision updates the refine loop feeds back. Written test-first (constitution II): these must fail before the store exists.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
	createReview,
	deleteReview,
	getPool,
	getReview,
	listReviews,
	type LiteratureReview,
	savePool,
	setDecision,
	updateReview,
} from "./review-store";

const emptyDecision = (review: LiteratureReview): number =>
	Object.keys(review.decisions).length;

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
});
