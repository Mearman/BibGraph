/**
 * Review service: the headless orchestration behind the review screens. Starting a review loads its pool, measures the composition of algorithms on that pool and, for a zero-seeds start, picks the seeds with the suggested selector; screening ranks the pool against the seeds with the composition's exploration algorithm; refining folds the reviewer's inclusions back in as seeds and hides every decided work. The pool fetcher and the review store are injected ports, so presentation components only call this module and the whole flow tests without a network or a database.
 */

import type {
	CreateReviewInput,
	LiteratureReview,
	SuggestedComposition,
	UpdateReviewInput,
} from "../../stores/review-store";
import { toPoolGraph } from "./algorithm-comparison";
import { suggestComposition } from "./composition-engine";
import { loadReviewPool, type PoolFetcher } from "./pool-loader";
import { algorithmById } from "./registry";
import { type PoolWork, type RankedCandidate, screenSemantically } from "./screening-engine";
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
	let composition = suggestComposition(pool, seeds, { selectionSize: input.selectionSize });
	if (seeds.length === 0) {
		const selection = composition.seedSelection;
		if (selection === null) {
			throw new Error("zero-seeds composition suggested no seed selector");
		}
		seeds = selectSeeds(selection.algorithmId, toPoolGraph(pool), input.selectionSize);
		// Exploration and ranking are measured on the seeds the selector produced, not on an empty set.
		composition = { ...suggestComposition(pool, seeds, { selectionSize: input.selectionSize }), seedSelection: selection };
	}
	const created = await deps.store.createReview({ name: input.name, query: input.query, seeds });
	await deps.store.updateReview(created.id, { suggestedComposition: composition });
	return { review: { ...created, suggestedComposition: composition }, pool, composition };
};

const explorationRunnerFor = (review: LiteratureReview) => {
	const id = review.suggestedComposition?.exploration?.algorithmId;
	if (id === undefined) {
		throw new Error(`review ${review.id} has no exploration algorithm; start it with startReview`);
	}
	const run = algorithmById(id)?.run;
	if (run === undefined) {
		throw new Error(`exploration algorithm is not runnable: ${id}`);
	}
	return run;
};

export const screenReview = (
	review: LiteratureReview,
	pool: readonly PoolWork[],
): readonly RankedCandidate[] =>
	screenSemantically(pool, review.seeds, { exploration: explorationRunnerFor(review) });

export const refineReview = (review: LiteratureReview, pool: readonly PoolWork[]): RefinedReview => {
	const known = new Set(review.seeds);
	const included = Object.entries(review.decisions)
		.filter(([workId, decision]) => decision === "include" && !known.has(workId))
		.map(([workId]) => workId)
		.sort();
	const seeds = [...review.seeds, ...included];
	const decided = new Set(Object.keys(review.decisions));
	const candidates = screenSemantically(pool, seeds, { exploration: explorationRunnerFor(review) }).filter(
		(candidate) => !decided.has(candidate.workId),
	);
	return { seeds, candidates };
};
