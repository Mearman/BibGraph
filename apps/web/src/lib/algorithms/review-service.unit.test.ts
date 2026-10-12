/**
 * Unit tests for the review service: starting a review from a seed set keeps the seeds and records the measured composition, a zero-seeds start picks seeds with the suggested selector, screening ranks the pool against the seeds, and refining folds included works back in as seeds while hiding decided works. The pool fetcher and the review store are injected fakes, so the whole flow runs offline.
 */

import { describe, expect, it } from "vitest";

import type { LiteratureReview, SuggestedComposition } from "../../stores/review-store";
import type { PoolFetcher } from "./pool-loader";
import { refineReview, type ReviewStorePort, screenReview, screenStandard, startReview } from "./review-service";

const SELECTION_SIZE = 2;

const work = (id: string, references: readonly string[]) => ({ id, referenced_works: references });

/**
 * Chain pool: s1 - m - s2 plus a distant d; m cites both seeds, d cites m, so m is the strongest bridge and d a weaker one.
 */
const fetcher: PoolFetcher = {
	search: async () => {
		await Promise.resolve();
		return [work("W1", []), work("W2", ["W1", "W3"]), work("W3", []), work("W4", ["W2"])];
	},
	byIds: async (ids) => {
		await Promise.resolve();
		return ids.map((id) => work(id, []));
	},
};

const makeStore = (): { store: ReviewStorePort; saved: Map<string, LiteratureReview>; pools: Map<string, readonly unknown[]> } => {
	const saved = new Map<string, LiteratureReview>();
	const pools = new Map<string, readonly unknown[]>();
	let counter = 0;
	const store: ReviewStorePort = {
		createReview: async (input) => {
			await Promise.resolve();
			counter++;
			const review: LiteratureReview = {
				id: `r${String(counter)}`,
				name: input.name,
				query: input.query ?? "",
				seeds: input.seeds ?? [],
				decisions: {},
				suggestedComposition: null,
				createdAt: new Date(0),
				updatedAt: new Date(0),
			};
			saved.set(review.id, review);
			return review;
		},
		savePool: async (reviewId, pool) => {
			await Promise.resolve();
			pools.set(reviewId, pool);
		},
		updateReview: async (id, patch) => {
			await Promise.resolve();
			const current = saved.get(id);
			if (!current) throw new Error(`no review ${id}`);
			saved.set(id, { ...current, ...patch });
		},
	};
	return { store, saved, pools };
};

describe("review service", () => {
	it("starts from a seed set, keeping the seeds and recording the composition", async () => {
		const { store, saved } = makeStore();
		const started = await startReview({ name: "r", query: "q", seeds: ["W1", "W3"], selectionSize: SELECTION_SIZE }, { fetcher, store });
		expect(started.review.seeds).toEqual(["W1", "W3"]);
		const recorded: SuggestedComposition | null | undefined = saved.get(started.review.id)?.suggestedComposition;
		expect(recorded?.exploration?.algorithmId).toBeDefined();
		expect(recorded?.seedSelection).toBeNull();
	});

	it("starts from zero seeds by picking seeds with the suggested selector", async () => {
		const { store, saved } = makeStore();
		const started = await startReview({ name: "r", query: "q", seeds: [], selectionSize: SELECTION_SIZE }, { fetcher, store });
		expect(started.review.seeds).toHaveLength(SELECTION_SIZE);
		expect(saved.get(started.review.id)?.seeds).toEqual(started.review.seeds);
		expect(started.composition.seedSelection?.algorithmId).toBeDefined();
	});

	it("screens the pool against the seeds, ranking candidates without seeds", async () => {
		const { store } = makeStore();
		const started = await startReview({ name: "r", query: "q", seeds: ["W1", "W3"], selectionSize: SELECTION_SIZE }, { fetcher, store });
		const screened = screenReview(started.review, started.pool);
		expect(screened.map((c) => c.workId)).toContain("W2");
		expect(screened.map((c) => c.workId)).not.toContain("W1");
	});

	it("refines by folding inclusions into the seeds and hiding decided works", async () => {
		const { store } = makeStore();
		const started = await startReview({ name: "r", query: "q", seeds: ["W1", "W3"], selectionSize: SELECTION_SIZE }, { fetcher, store });
		const decided: LiteratureReview = { ...started.review, decisions: { W2: "include", W4: "exclude" } };
		const refined = refineReview(decided, started.pool);
		expect(refined.seeds).toEqual(["W1", "W3", "W2"]);
		expect(refined.candidates.map((c) => c.workId)).not.toContain("W2");
		expect(refined.candidates.map((c) => c.workId)).not.toContain("W4");
	});
	it("screens the standard path in query order, skipping seeds and decided works", async () => {
		const { store } = makeStore();
		const started = await startReview({ name: "r", query: "q", seeds: ["W1"], selectionSize: SELECTION_SIZE }, { fetcher, store });
		const decided: LiteratureReview = { ...started.review, decisions: { W3: "exclude" } };
		const standard = screenStandard(decided, started.pool);
		expect(standard.map((c) => c.workId)).toEqual(["W2", "W4"]);
		expect(standard.map((c) => c.rank)).toEqual([1, 2]);
	});

	it("stores the pool snapshot with the review so it is never refetched", async () => {
		const { store, pools } = makeStore();
		const started = await startReview({ name: "r", query: "q", seeds: ["W1", "W3"], selectionSize: SELECTION_SIZE }, { fetcher, store });
		expect(pools.get(started.review.id)).toEqual(started.pool);
	});
});
