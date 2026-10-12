/**
 * Regression test: reviews created within the same millisecond tie on createdAt, and the list then ordered them by their random ids instead of by creation. Ten reviews under a frozen clock make the tie certain.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAllReviewsForTests, createReview, listReviews } from "./review-store";

const REVIEW_COUNT = 10;
const FROZEN_TIME = new Date("2026-10-12T12:00:00.000Z");

describe("review creation order", () => {
	beforeEach(async () => {
		await clearAllReviewsForTests();
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(FROZEN_TIME);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("lists reviews in creation order even when the clock does not advance", async () => {
		const names = Array.from({ length: REVIEW_COUNT }, (_, i) => `review-${String(i)}`);
		for (const name of names) {
			await createReview({ name, query: "" });
		}
		const listed = await listReviews();
		expect(listed.map((review) => review.name)).toEqual(names);
	});
});
