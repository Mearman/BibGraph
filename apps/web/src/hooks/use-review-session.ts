/**
 * Review session hook: the container logic behind the screening screen. It loads a review and its pool, derives the labelled semantic and standard rows and the algorithm comparison through the tested view-model and comparison modules, and exposes the two writes a reviewer makes (a screening decision, an algorithm override). All I/O arrives through the injected deps, so presentation components stay free of storage and network and the hook tests with in-memory fakes.
 */

import { keepPreviousData, type QueryClient, skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import type { AlgorithmComparison } from "@/lib/algorithms/algorithm-comparison";
import { adoptMeasured } from "@/lib/algorithms/composition-engine";
import { loadReviewPool, type PoolFetcher } from "@/lib/algorithms/pool-loader";
import type { AlgorithmStage } from "@/lib/algorithms/registry";
import type { PoolWork } from "@/lib/algorithms/screening-engine";
import type { WorkLabel, WorkLabelFetcher } from "@/lib/algorithms/work-labels";
import type { ReviewCompute } from "@/lib/reviews/compute-handler";
import { ZERO_SEEDS_SELECTION_SIZE } from "@/lib/reviews/review-constants";
import { type ScreeningRow, type ScreeningView, withLabels } from "@/lib/reviews/screening-view";
import type {
	LiteratureReview,
	ScreeningDecision,
	SuggestedComposition,
	UpdateReviewInput,
} from "@/stores/review-store";

/**
 * The slice of the review store the session writes through.
 */
export interface SessionStorePort {
	readonly getReview: (id: string) => Promise<LiteratureReview | undefined>;
	readonly setDecision: (id: string, workId: string, decision: ScreeningDecision) => Promise<void>;
	readonly updateReview: (id: string, patch: UpdateReviewInput) => Promise<void>;
	readonly getPool: (reviewId: string) => Promise<readonly PoolWork[] | undefined>;
	readonly savePool: (reviewId: string, pool: readonly PoolWork[]) => Promise<void>;
}

export interface ReviewSessionDeps {
	/**
	 * Runs the heavy measurement and screening, off the main thread in the app.
	 */
	readonly compute: ReviewCompute;
	readonly fetcher: PoolFetcher;
	readonly fetchLabels: WorkLabelFetcher;
	readonly store: SessionStorePort;
}

export type AlgorithmInUse = Readonly<Record<AlgorithmStage, string | null>>;

export interface ReadyReviewSession {
	readonly phase: "ready";
	readonly review: LiteratureReview;
	readonly view: ScreeningView;
	readonly semanticRows: readonly ScreeningRow[];
	readonly standardRows: readonly ScreeningRow[];
	/**
	 * Null while the comparison is still being measured on the pool.
	 */
	readonly comparison: AlgorithmComparison | null;
	/**
	 * Why the comparison could not be measured, when it failed; the screening lists still work without it.
	 */
	readonly comparisonError: string | null;
	readonly inUse: AlgorithmInUse;
	/**
	 * Whether the reviewer can switch the seed selector: only for a review that began with no seeds, whose seeds the app picked. A review with supplied seeds shows the selectors for comparison only.
	 */
	readonly seedSelectionEditable: boolean;
	readonly decide: (workId: string, decision: ScreeningDecision) => Promise<void>;
	readonly chooseAlgorithm: (stage: AlgorithmStage, algorithmId: string) => Promise<void>;
}

export type ReviewSession =
	ReadyReviewSession | { readonly phase: "loading" } | { readonly phase: "error"; readonly message: string };

const COMPOSITION_KEY: Readonly<Record<AlgorithmStage, keyof SuggestedComposition>> = {
	exploration: "exploration",
	"seed-selection": "seedSelection",
	ranking: "ranking",
};

/**
 * Prefix of the pool query key; the comparison query reads the cached pool by this prefix instead of closing over a thousand works.
 */
const poolKey = (reviewId: string): readonly string[] => ["review-pool", reviewId];

/**
 * The pool the review's pool query already loaded. Earlier, skipped pool queries (made before the review loaded) share the key prefix and hold no data, so the first entry with data is the pool.
 */
const cachedPool = (queryClient: QueryClient, reviewId: string): readonly PoolWork[] => {
	const loaded = queryClient
		.getQueriesData<readonly PoolWork[]>({ queryKey: poolKey(reviewId) })
		.map(([, data]) => data)
		.find((data) => data !== undefined);
	if (loaded === undefined) {
		throw new Error(`pool for review ${reviewId} is not loaded`);
	}
	return loaded;
};

const NO_LABELS: ReadonlyMap<string, WorkLabel> = new Map();

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : "unknown error");

const inUseFrom = (composition: SuggestedComposition | null): AlgorithmInUse => ({
	exploration: composition?.exploration?.algorithmId ?? null,
	"seed-selection": composition?.seedSelection?.algorithmId ?? null,
	ranking: composition?.ranking?.algorithmId ?? null,
});

export const useReviewSession = (reviewId: string, deps: ReviewSessionDeps): ReviewSession => {
	const queryClient = useQueryClient();

	const reviewQuery = useQuery({
		queryKey: ["review", reviewId],
		queryFn: async () => {
			const review = await deps.store.getReview(reviewId);
			if (review === undefined) {
				throw new Error(`review not found: ${reviewId}`);
			}
			return review;
		},
	});
	const review = reviewQuery.data;

	const poolQuery = useQuery({
		queryKey: [...poolKey(reviewId), review?.query, review?.seeds, deps.fetcher],
		staleTime: Infinity,
		queryFn:
			review === undefined
				? skipToken
				: async () => {
						// A review keeps the pool it was started with: fetched once, then read from its snapshot, so screening it again gives the same answer and costs no requests.
						const saved = await deps.store.getPool(reviewId);
						if (saved !== undefined) return saved;
						const loaded = await loadReviewPool({ query: review.query, seeds: review.seeds }, deps.fetcher);
						await deps.store.savePool(reviewId, loaded);
						return loaded;
					},
	});

	// Reads the pool the pool query loaded; a stable function so the compute queries can list it in their keys without hashing a thousand works.
	const readPool = useCallback(() => cachedPool(queryClient, reviewId), [queryClient, reviewId]);

	const viewQuery = useQuery({
		queryKey: ["review-view", reviewId, review, poolQuery.isSuccess, readPool],
		staleTime: Infinity,
		// The previous view stays on screen while a decision or a new composition is re-screened.
		placeholderData: keepPreviousData,
		queryFn:
			review === undefined || !poolQuery.isSuccess
				? skipToken
				: async () => deps.compute.screen(review, readPool()),
	});
	const view = viewQuery.data;

	const visibleIds = useMemo(
		() =>
			view === undefined
				? []
				: [...new Set([...view.semantic, ...view.standard].map((row) => row.workId))].sort(),
		[view],
	);
	const labelsQuery = useQuery({
		queryKey: ["review-labels", visibleIds.join(",")],
		staleTime: Infinity,
		placeholderData: keepPreviousData,
		queryFn: visibleIds.length === 0 ? skipToken : async () => deps.fetchLabels(visibleIds),
	});

	const comparisonQuery = useQuery({
		queryKey: ["review-comparison", reviewId, review?.seeds, poolQuery.isSuccess, readPool],
		staleTime: Infinity,
		queryFn:
			review === undefined || !poolQuery.isSuccess
				? skipToken
				: async () => deps.compute.compare(readPool(), review.seeds, ZERO_SEEDS_SELECTION_SIZE),
	});

	// Reconciles the stored composition with the measurement: app-made picks (the starting defaults) become the measured best, reviewer overrides stay. Once adopted, the next run finds nothing to change, so it converges.
	const stored = review?.suggestedComposition;
	const measuredComparison = comparisonQuery.data;
	useQuery({
		queryKey: ["review-adopt", reviewId, stored, measuredComparison],
		staleTime: Infinity,
		queryFn:
			stored == null || measuredComparison === undefined
				? skipToken
				: async () => {
						const adopted = adoptMeasured(stored, measuredComparison);
						if (adopted === stored) return false;
						await deps.store.updateReview(reviewId, { suggestedComposition: adopted });
						await queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
						return true;
					},
	});

	const decision = useMutation({
		mutationFn: async (input: Readonly<{ workId: string; decision: ScreeningDecision }>) => {
			await deps.store.setDecision(reviewId, input.workId, input.decision);
		},
		onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["review", reviewId] }),
	});

	const override = useMutation({
		mutationFn: async (input: Readonly<{ stage: AlgorithmStage; algorithmId: string }>) => {
			if (review?.suggestedComposition == null) {
				throw new Error("review has no composition to override");
			}
			const measured = comparisonQuery.data?.[input.stage].find((row) => row.algorithmId === input.algorithmId);
			const evidence = measured === undefined ? "chosen by reviewer" : `${measured.evidence} (chosen by reviewer)`;
			const suggestedComposition: SuggestedComposition = {
				...review.suggestedComposition,
				[COMPOSITION_KEY[input.stage]]: { algorithmId: input.algorithmId, evidence, chosenBy: "reviewer" },
			};
			if (input.stage !== "seed-selection") {
				await deps.store.updateReview(reviewId, { suggestedComposition });
				return;
			}
			if (review.suggestedComposition.seedSelection === null) {
				throw new Error("this review's seeds were supplied, so there is no seed selector to switch");
			}
			// Switching the selector re-picks the seeds the app chose at the start.
			const seeds = [...(await deps.compute.select(readPool(), input.algorithmId, ZERO_SEEDS_SELECTION_SIZE))];
			await deps.store.updateReview(reviewId, { suggestedComposition, seeds });
		},
		onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["review", reviewId] }),
	});

	if (reviewQuery.error !== null) return { phase: "error", message: errorMessage(reviewQuery.error) };
	if (poolQuery.error !== null) return { phase: "error", message: errorMessage(poolQuery.error) };
	if (viewQuery.error !== null) return { phase: "error", message: errorMessage(viewQuery.error) };
	if (review === undefined || view === undefined) return { phase: "loading" };

	const labels = labelsQuery.data ?? NO_LABELS;
	return {
		phase: "ready",
		review,
		view,
		semanticRows: withLabels(view.semantic, labels),
		standardRows: withLabels(view.standard, labels),
		comparison: comparisonQuery.data ?? null,
		comparisonError: comparisonQuery.error === null ? null : errorMessage(comparisonQuery.error),
		inUse: inUseFrom(review.suggestedComposition),
		seedSelectionEditable: review.suggestedComposition?.seedSelection != null,
		decide: async (workId, chosen) => {
			await decision.mutateAsync({ workId, decision: chosen });
		},
		chooseAlgorithm: async (stage, algorithmId) => {
			await override.mutateAsync({ stage, algorithmId });
		},
	};
};
