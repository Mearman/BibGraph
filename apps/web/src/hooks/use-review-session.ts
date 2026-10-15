/**
 * Review session hook: the container logic behind the screening screen. It loads a review and its pool, derives the labelled screening rows (both paths, the decided works and the seeds), the per-stage algorithm comparison and the label fetch state through the tested view-model and comparison modules, and exposes the writes a reviewer makes (a screening decision, undoing one, an algorithm override). Each stage's measurements are cached in the store under keys naming their inputs (pool, seeds, stage, algorithm), so a reopen measures only cache-missing cells and switching one stage's algorithm never re-measures a stage whose inputs did not change. All I/O arrives through the injected deps, so presentation components stay free of storage and network and the hook tests with in-memory fakes.
 */

import { keepPreviousData, type QueryClient, skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import {
	type AlgorithmComparison,
	chosenExplorationOf,
	type ComparisonRow,
	type MeasureProgress,
	rowsForStage,
	type StageMeasurements,
} from "@/lib/algorithms/algorithm-comparison";
import { adoptMeasured } from "@/lib/algorithms/composition-engine";
import { loadReviewPool, type PoolFetcher } from "@/lib/algorithms/pool-loader";
import {
	algorithmsByStage,
	type AlgorithmSpec,
	type AlgorithmStage,
} from "@/lib/algorithms/registry";
import { addSeed as addSeedToReview, ReviewUserError } from "@/lib/algorithms/review-service";
import type { PoolWork } from "@/lib/algorithms/screening-engine";
import type { WorkLabel, WorkLabelFetcher } from "@/lib/algorithms/work-labels";
import type { ComputeProgress, ReviewCompute } from "@/lib/reviews/compute-handler";
import {
	type CellMeasurement,
	explorationKey,
	type MeasurementRecord,
	poolFingerprint,
	rankingKey,
	seedSelectionKey,
	seedsFingerprint,
} from "@/lib/reviews/measurement-cache";
import { ZERO_SEEDS_SELECTION_SIZE } from "@/lib/reviews/review-constants";
import {
	type DecidedRow,
	labelIdsFor,
	type LabelledRef,
	type ScreeningRow,
	type ScreeningView,
	withLabels,
} from "@/lib/reviews/screening-view";
import { firstSeed, parseSeedTokens } from "@/lib/reviews/seed-input";
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
	/**
	 * Removes a work's decision, returning it to the screening lists.
	 */
	readonly clearDecision: (id: string, workId: string) => Promise<void>;
	readonly updateReview: (id: string, patch: UpdateReviewInput) => Promise<void>;
	readonly getPool: (reviewId: string) => Promise<readonly PoolWork[] | undefined>;
	readonly savePool: (reviewId: string, pool: readonly PoolWork[]) => Promise<void>;
	/**
	 * Every measurement stored for a review; each record's key names the inputs it was measured under.
	 */
	readonly getMeasurements: (reviewId: string) => Promise<readonly MeasurementRecord[]>;
	readonly saveMeasurements: (reviewId: string, cells: readonly MeasurementRecord[]) => Promise<void>;
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

/**
 * One stage's measurement run in numbers: which algorithm is up and how far through. The screen renders it to words in whichever language mode it is in, so codenames stay behind the technical toggle.
 */
export type ComparisonProgress = Readonly<Record<AlgorithmStage, MeasureProgress | null>>;

export interface ReadyReviewSession {
	readonly phase: "ready";
	readonly review: LiteratureReview;
	readonly view: ScreeningView;
	readonly semanticRows: readonly ScreeningRow[];
	readonly standardRows: readonly ScreeningRow[];
	/**
	 * Every decided work, titled, for the Decided list.
	 */
	readonly decidedRows: readonly DecidedRow[];
	/**
	 * The seeds the semantic ranking runs from, titled, for the header.
	 */
	readonly seedRefs: readonly LabelledRef[];
	/**
	 * True while the first label fetch is in flight; titles are not yet known.
	 */
	readonly labelsPending: boolean;
	/**
	 * Why the labels could not be loaded, when the fetch failed; the lists still work without titles.
	 */
	readonly labelsError: string | null;
	readonly retryLabels: () => void;
	/**
	 * Each stage's comparison rows, null while that stage still measures. Stages measure independently, so one re-measuring never blanks another.
	 */
	readonly comparison: Readonly<Record<AlgorithmStage, readonly ComparisonRow[] | null>>;
	/**
	 * Why a stage's comparison could not be measured, when it failed; the screening lists still work without it.
	 */
	readonly comparisonError: Readonly<Record<AlgorithmStage, string | null>>;
	/**
	 * What a measuring stage is running right now (algorithm and count), null when nothing measures.
	 */
	readonly comparisonProgress: ComparisonProgress;
	readonly inUse: AlgorithmInUse;
	/**
	 * Whether the reviewer can switch the seed selector: only for a review that began with no seeds, whose seeds the app picked. A review with supplied seeds shows the selectors for comparison only.
	 */
	readonly seedSelectionEditable: boolean;
	readonly decide: (workId: string, decision: ScreeningDecision) => Promise<void>;
	/**
	 * Removes a work's decision so it returns to the screening lists.
	 */
	readonly undo: (workId: string) => Promise<void>;
	/**
	 * Adds a work the reviewer knows is relevant (an OpenAlex id or link), folding it into the starting works for the rest of the review. Rejects with a plain message when the token is not a work id or OpenAlex does not know the work.
	 */
	readonly addSeed: (token: string) => Promise<void>;
	readonly chooseAlgorithm: (stage: AlgorithmStage, algorithmId: string) => Promise<void>;
}

export type ReviewSession =
	| ReadyReviewSession
	| { readonly phase: "loading" }
	| { readonly phase: "error"; readonly message: string };

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

const NO_PROGRESS: ComparisonProgress = { exploration: null, "seed-selection": null, ranking: null };

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : "unknown error");

const inUseFrom = (composition: SuggestedComposition | null): AlgorithmInUse => ({
	exploration: composition?.exploration?.algorithmId ?? null,
	"seed-selection": composition?.seedSelection?.algorithmId ?? null,
	ranking: composition?.ranking?.algorithmId ?? null,
});

/**
 * Assembles one stage's rows from the stored measurements plus the cells still missing, measuring only those and storing what they came out as. A stage whose every cell is cached measures nothing, which is what a reopen or an unrelated stage switch comes to.
 */
const stageRows = async (input: {
	readonly reviewId: string;
	readonly stage: AlgorithmStage;
	readonly roster: readonly AlgorithmSpec[];
	readonly keyOf: (algorithmId: string) => string;
	readonly stored: readonly MeasurementRecord[];
	readonly measure: (
		algorithmIds: readonly string[],
		onProgress: (progress: ComputeProgress) => void,
	) => Promise<StageMeasurements>;
	readonly save: (cells: readonly MeasurementRecord[]) => Promise<void>;
	readonly onProgress: (progress: ComputeProgress) => void;
}): Promise<readonly ComparisonRow[]> => {
	const { reviewId, stage, roster, keyOf, stored, measure, save, onProgress } = input;
	const cached = new Map(stored.map((cell) => [cell.key, cell]));
	const cells: Record<string, CellMeasurement> = {};
	const missing: string[] = [];
	for (const spec of roster) {
		const cell = cached.get(keyOf(spec.id));
		if (cell === undefined) missing.push(spec.id);
		else cells[spec.id] = cell;
	}
	if (missing.length > 0) {
		const measured = await measure(missing, onProgress);
		const records: MeasurementRecord[] = [];
		for (const algorithmId of missing) {
			const measurement = measured[algorithmId];
			if (measurement === undefined) {
				throw new Error(`measurement for ${stage} algorithm ${algorithmId} did not come back`);
			}
			cells[algorithmId] = measurement;
			records.push({ key: keyOf(algorithmId), reviewId, stage, algorithmId, ...measurement });
		}
		await save(records);
	}
	return rowsForStage(stage, cells);
};

export const useReviewSession = (reviewId: string, deps: ReviewSessionDeps): ReviewSession => {
	const queryClient = useQueryClient();
	const [progress, setProgress] = useState<ComparisonProgress>(NO_PROGRESS);

	const setStageProgress = (stage: AlgorithmStage, fact: MeasureProgress): void => {
		setProgress((current) => ({ ...current, [stage]: fact }));
	};
	const clearStageProgress = (stage: AlgorithmStage): void => {
		setProgress((current) => (current[stage] === null ? current : { ...current, [stage]: null }));
	};

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

	const labelIds = useMemo(() => (view === undefined ? [] : labelIdsFor(view)), [view]);
	const labelsQuery = useQuery({
		queryKey: ["review-labels", labelIds.join(",")],
		staleTime: Infinity,
		placeholderData: keepPreviousData,
		queryFn: labelIds.length === 0 ? skipToken : async () => deps.fetchLabels(labelIds),
	});

	// Each stage measures independently against its own key inputs: exploration against the seeds, seed selection against the pool alone, ranking against the seeds on the chosen exploration. A stage re-measures only when the inputs in its query key change; the others' tables stand.
	const explorationQuery = useQuery({
		queryKey: ["review-measure", reviewId, "exploration", poolQuery.isSuccess, readPool, review?.seeds],
		staleTime: Infinity,
		queryFn:
			review === undefined || !poolQuery.isSuccess
				? skipToken
				: async () => {
						const pool = readPool();
						const poolFp = poolFingerprint(pool);
						const seedsFp = seedsFingerprint(review.seeds);
						try {
							return await stageRows({
								reviewId,
								stage: "exploration",
								roster: algorithmsByStage("exploration"),
								keyOf: (algorithmId) => explorationKey(reviewId, algorithmId, poolFp, seedsFp),
								stored: await deps.store.getMeasurements(reviewId),
								measure: async (algorithmIds, onProgress) =>
									deps.compute.measureExploration(pool, review.seeds, algorithmIds, onProgress),
								save: async (cells) => {
									await deps.store.saveMeasurements(reviewId, cells);
								},
								onProgress: (event): void => {
									setStageProgress("exploration", event);
								},
							});
						} finally {
							clearStageProgress("exploration");
						}
					},
	});

	const explorationRows = explorationQuery.data;
	const chosenExploration = explorationRows === undefined ? undefined : chosenExplorationOf(explorationRows);

	const selectionQuery = useQuery({
		// No seeds in this key: seed selection is measured on the pool alone, so a seed change never re-measures it.
		queryKey: ["review-measure", reviewId, "seed-selection", poolQuery.isSuccess, readPool, ZERO_SEEDS_SELECTION_SIZE],
		staleTime: Infinity,
		queryFn:
			review === undefined || !poolQuery.isSuccess
				? skipToken
				: async () => {
						const pool = readPool();
						const poolFp = poolFingerprint(pool);
						try {
							return await stageRows({
								reviewId,
								stage: "seed-selection",
								roster: algorithmsByStage("seed-selection"),
								keyOf: (algorithmId) => seedSelectionKey(reviewId, algorithmId, poolFp, ZERO_SEEDS_SELECTION_SIZE),
								stored: await deps.store.getMeasurements(reviewId),
								measure: async (algorithmIds, onProgress) =>
									deps.compute.measureSelection(pool, ZERO_SEEDS_SELECTION_SIZE, algorithmIds, onProgress),
								save: async (cells) => {
									await deps.store.saveMeasurements(reviewId, cells);
								},
								onProgress: (event): void => {
									setStageProgress("seed-selection", event);
								},
							});
						} finally {
							clearStageProgress("seed-selection");
						}
					},
	});

	const rankingQuery = useQuery({
		// The chosen exploration is in the key because ranking is measured on it, so a re-measured exploration whose best changes re-ranks this stage.
		queryKey: ["review-measure", reviewId, "ranking", poolQuery.isSuccess, readPool, review?.seeds, chosenExploration],
		staleTime: Infinity,
		queryFn:
			review === undefined || !poolQuery.isSuccess || chosenExploration === undefined
				? skipToken
				: async () => {
						const pool = readPool();
						const poolFp = poolFingerprint(pool);
						const seedsFp = seedsFingerprint(review.seeds);
						try {
							return await stageRows({
								reviewId,
								stage: "ranking",
								roster: algorithmsByStage("ranking"),
								keyOf: (algorithmId) => rankingKey(reviewId, algorithmId, poolFp, seedsFp, chosenExploration),
								stored: await deps.store.getMeasurements(reviewId),
								measure: async (algorithmIds, onProgress) =>
									deps.compute.measureRanking(pool, review.seeds, chosenExploration, onProgress),
								save: async (cells) => {
									await deps.store.saveMeasurements(reviewId, cells);
								},
								onProgress: (event): void => {
									setStageProgress("ranking", event);
								},
							});
						} finally {
							clearStageProgress("ranking");
						}
					},
	});

	// Reconciles the stored composition with the measurement: app-made picks (the starting defaults) become the measured best, reviewer overrides stay. Once adopted, the next run finds nothing to change, so it converges.
	const stored = review?.suggestedComposition;
	const measuredComparison: AlgorithmComparison | null =
		explorationRows !== undefined && selectionQuery.data !== undefined && rankingQuery.data !== undefined
			? { exploration: explorationRows, "seed-selection": selectionQuery.data, ranking: rankingQuery.data }
			: null;
	useQuery({
		queryKey: ["review-adopt", reviewId, stored, measuredComparison],
		staleTime: Infinity,
		queryFn:
			stored == null || measuredComparison === null
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

	const undo = useMutation({
		mutationFn: async (workId: string) => {
			await deps.store.clearDecision(reviewId, workId);
		},
		onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["review", reviewId] }),
	});

	// Adds fold the work into the starting works for the rest of the review: the service brings the work into the stored pool snapshot when the pool missed it, so the ranking sees its references too.
	const seedAdder = useMutation({
		mutationFn: async (token: string) => {
			const parsed = parseSeedTokens(token);
			const seedId = firstSeed(parsed);
			if (seedId === null || parsed.invalid.length > 0) {
				throw new ReviewUserError(
					`"${token.trim()}" is not an OpenAlex work id. Paste an id such as W2741809807 or a link such as https://openalex.org/W2741809807.`,
				);
			}
			if (review === undefined) {
				throw new Error(`review ${reviewId} is not loaded`);
			}
			await addSeedToReview(review, cachedPool(queryClient, reviewId), seedId, {
				fetcher: deps.fetcher,
				store: deps.store,
			});
		},
		onSuccess: async () => {
			// The pool key holds one entry per seed set, and cachedPool reads the first entry with data. Drop the entries for the old set, or the view would screen against a stale pool that predates the added work.
			queryClient.removeQueries({ queryKey: poolKey(reviewId) });
			await queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
		},
	});

	const rowsByStage: Readonly<Record<AlgorithmStage, readonly ComparisonRow[] | null>> = {
		exploration: explorationQuery.data ?? null,
		"seed-selection": selectionQuery.data ?? null,
		ranking: rankingQuery.data ?? null,
	};

	const override = useMutation({
		mutationFn: async (input: Readonly<{ stage: AlgorithmStage; algorithmId: string }>) => {
			if (review?.suggestedComposition == null) {
				throw new Error("review has no composition to override");
			}
			const measured = rowsByStage[input.stage]?.find((row) => row.algorithmId === input.algorithmId);
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
			// Switching the selector replaces the seeds the app picked, keeping every seed the reviewer added by hand: a manual addition is any seed outside the last picked set.
			const previousPicked = new Set(review.pickedSeeds);
			const manual = review.seeds.filter((seed) => !previousPicked.has(seed));
			const picked = await deps.compute.select(readPool(), input.algorithmId, ZERO_SEEDS_SELECTION_SIZE);
			const pickedSet = new Set(picked);
			const seeds = [...picked, ...manual.filter((seed) => !pickedSet.has(seed))];
			await deps.store.updateReview(reviewId, { suggestedComposition, seeds, pickedSeeds: [...picked] });
		},
		onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["review", reviewId] }),
	});

	if (reviewQuery.error !== null) return { phase: "error", message: errorMessage(reviewQuery.error) };
	if (poolQuery.error !== null) return { phase: "error", message: errorMessage(poolQuery.error) };
	if (viewQuery.error !== null) return { phase: "error", message: errorMessage(viewQuery.error) };
	if (review === undefined || view === undefined) return { phase: "loading" };

	const labelled = withLabels(view, labelsQuery.data ?? NO_LABELS);
	return {
		phase: "ready",
		review,
		view,
		semanticRows: labelled.semantic,
		standardRows: labelled.standard,
		decidedRows: labelled.decided,
		seedRefs: labelled.seeds,
		labelsPending: labelsQuery.isPending,
		labelsError: labelsQuery.error === null ? null : errorMessage(labelsQuery.error),
		retryLabels: () => {
			void labelsQuery.refetch();
		},
		comparison: rowsByStage,
		comparisonError: {
			exploration: explorationQuery.error === null ? null : errorMessage(explorationQuery.error),
			"seed-selection": selectionQuery.error === null ? null : errorMessage(selectionQuery.error),
			ranking: rankingQuery.error === null ? null : errorMessage(rankingQuery.error),
		},
		comparisonProgress: progress,
		inUse: inUseFrom(review.suggestedComposition),
		seedSelectionEditable: review.suggestedComposition?.seedSelection != null,
		decide: async (workId, chosen) => {
			await decision.mutateAsync({ workId, decision: chosen });
		},
		undo: async (workId) => {
			await undo.mutateAsync(workId);
		},
		addSeed: async (token) => {
			await seedAdder.mutateAsync(token);
		},
		chooseAlgorithm: async (stage, algorithmId) => {
			await override.mutateAsync({ stage, algorithmId });
		},
	};
};
