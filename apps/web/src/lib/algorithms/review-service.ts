/**
 * Review service: the headless orchestration behind the review screens. Starting a review loads its pool, measures the composition of algorithms on that pool and, for a zero-seeds start, picks the seeds with the suggested selector; screening ranks the pool against the seeds with the composition's exploration algorithm; refining folds the reviewer's inclusions back in as seeds and hides every decided work. The pool fetcher and the review store are injected ports, so presentation components only call this module and the whole flow tests without a network or a database.
 */

import type {
	CompositionPick,
	CreateReviewInput,
	LiteratureReview,
	SuggestedComposition,
	UpdateReviewInput,
} from "../../stores/review-store";
import { compareSeedSelection, toPoolGraph } from "./algorithm-comparison";
import { defaultComposition } from "./composition-engine";
import { loadReviewPool, type PoolFetcher } from "./pool-loader";
import { algorithmById } from "./registry";
import {
	explorationBudget,
	type PoolWork,
	type RankedCandidate,
	type ScreeningOptions,
	screenSemantically,
} from "./screening-engine";
import { selectSeeds } from "./seed-engine";

/**
 * The slice of the review store the service writes through.
 */
export interface ReviewStorePort {
	readonly createReview: (input: CreateReviewInput) => Promise<LiteratureReview>;
	readonly updateReview: (id: string, patch: UpdateReviewInput) => Promise<void>;
}

export interface ReviewServiceDeps {
	readonly fetcher: PoolFetcher;
	readonly store: ReviewStorePort;
}

export interface StartReviewInput {
	readonly name: string;
	readonly query: string;
	readonly seeds: readonly string[];
	/**
	 * How many seeds a zero-seeds start picks.
	 */
	readonly selectionSize: number;
}

export interface StartedReview {
	readonly review: LiteratureReview;
	readonly pool: readonly PoolWork[];
	readonly composition: SuggestedComposition;
}

/**
 * A work on the standard screening path: the query's own result order, with no association ranking.
 */
export interface StandardCandidate {
	readonly workId: string;
	readonly rank: number;
}

export interface RefinedReview {
	readonly seeds: readonly string[];
	readonly candidates: readonly RankedCandidate[];
}

export const startReview = async (
	input: StartReviewInput,
	deps: ReviewServiceDeps,
): Promise<StartedReview> => {
	const pool = await loadReviewPool({ query: input.query, seeds: input.seeds }, deps.fetcher);
	let seeds = [...input.seeds];
	let seedSelection: CompositionPick | null = null;
	if (seeds.length === 0) {
		// Only the seed selectors are measured at start: they are cheap, and the review has no seeds until one is picked.
		const selection = compareSeedSelection(pool, { selectionSize: input.selectionSize }).find((row) => row.chosen);
		if (selection === undefined) {
			throw new Error("no seed selector was measured for a zero-seeds start");
		}
		seeds = selectSeeds(selection.algorithmId, toPoolGraph(pool), input.selectionSize);
		seedSelection = { algorithmId: selection.algorithmId, evidence: selection.evidence, chosenBy: "app" };
	}
	// Exploration and ranking start from defaults so the review opens at once; measuring every algorithm is far slower than loading the pool, and the session replaces the defaults with the measured best (adoptMeasured).
	const composition = defaultComposition(seedSelection);
	const created = await deps.store.createReview({ name: input.name, query: input.query, seeds });
	await deps.store.updateReview(created.id, { suggestedComposition: composition });
	return { review: { ...created, suggestedComposition: composition }, pool, composition };
};

const algorithmFor = (review: LiteratureReview, stage: "exploration" | "ranking") => {
	const id = review.suggestedComposition?.[stage]?.algorithmId;
	if (id === undefined) {
		throw new Error(`review ${review.id} has no ${stage} algorithm; start it with startReview`);
	}
	const spec = algorithmById(id);
	if (spec === undefined) {
		throw new Error(`unknown ${stage} algorithm: ${id}`);
	}
	return spec;
};

/**
 * The screening options a review runs with: its composition's exploration and ranking algorithms under the shared exploration budget.
 */
const screeningOptionsFor = (review: LiteratureReview, pool: readonly PoolWork[]): ScreeningOptions => {
	const { run } = algorithmFor(review, "exploration");
	const { rank } = algorithmFor(review, "ranking");
	if (run === undefined || rank === undefined) {
		throw new Error(`review ${review.id} composition names an algorithm that is not runnable`);
	}
	return { exploration: run, ranking: rank, explorationConfig: { maxNodes: explorationBudget(pool.length) } };
};

export const screenReview = (
	review: LiteratureReview,
	pool: readonly PoolWork[],
): readonly RankedCandidate[] => screenSemantically(pool, review.seeds, screeningOptionsFor(review, pool));

export const refineReview = (review: LiteratureReview, pool: readonly PoolWork[]): RefinedReview => {
	const known = new Set(review.seeds);
	const included = Object.entries(review.decisions)
		.filter(([workId, decision]) => decision === "include" && !known.has(workId))
		.map(([workId]) => workId)
		.sort();
	const seeds = [...review.seeds, ...included];
	const decided = new Set(Object.keys(review.decisions));
	const candidates = screenSemantically(pool, seeds, screeningOptionsFor(review, pool)).filter(
		(candidate) => !decided.has(candidate.workId),
	);
	return { seeds, candidates };
};

/**
 * The standard path: the Boolean query's results in the order the search returned them, minus the review's seeds and every decided work. The pool lists query results first, so pool order is search order.
 */
export const screenStandard = (review: LiteratureReview, pool: readonly PoolWork[]): readonly StandardCandidate[] => {
	const seeds = new Set(review.seeds);
	const decided = new Set(Object.keys(review.decisions));
	return pool
		.filter((work) => !seeds.has(work.id) && !decided.has(work.id))
		.map((work, index) => ({ workId: work.id, rank: index + 1 }));
};
