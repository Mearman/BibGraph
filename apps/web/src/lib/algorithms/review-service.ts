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
import { MIN_REVIEW_SEEDS } from "../reviews/review-constants";
import { measureSeedSelectionStage, rowsForStage, toPoolGraph } from "./algorithm-comparison";
import { defaultComposition } from "./composition-engine";
import { loadReviewPool, type PoolFetcher } from "./pool-loader";
import { algorithmById, algorithmsByStage } from "./registry";
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
  readonly createReview: (
    input: CreateReviewInput,
  ) => Promise<LiteratureReview>;
  readonly updateReview: (
    id: string,
    patch: UpdateReviewInput,
  ) => Promise<void>;
  readonly savePool: (
    reviewId: string,
    pool: readonly PoolWork[],
  ) => Promise<void>;
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
  /**
   * The pool cap the fetcher applies to a query's results; a search that returns this many works was truncated.
   */
  readonly maxPoolSize: number;
}

/**
 * The stages a start passes through, in order. "choosing-seeds" occurs only for a zero-seeds start.
 */
export type StartStage = "loading-pool" | "choosing-seeds" | "saving";

export interface StartReviewOptions {
  /**
   * Called as each stage begins.
   */
  readonly onProgress?: (stage: StartStage) => void;
  /**
   * Cooperative cancellation: checked between stages, so an abort stops the start before anything is stored. A request already in flight is not interrupted; its result is discarded.
   */
  readonly signal?: AbortSignal;
}

export interface StartedReview {
  readonly review: LiteratureReview;
  readonly pool: readonly PoolWork[];
  readonly composition: SuggestedComposition;
  /**
   * How many works the query returned (zero for a start without a query).
   */
  readonly queryResultCount: number;
  /**
   * Whether the query's results were cut off at the pool cap, so works beyond it are not in the pool.
   */
  readonly poolCapped: boolean;
  /**
   * Supplied seeds that OpenAlex did not return.
   */
  readonly missingSeeds: readonly string[];
}

/**
 * An error whose message is already plain language for a reviewer, with a next step; the screens show it as it is.
 */
export class ReviewUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewUserError";
  }
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
  options: StartReviewOptions = {},
): Promise<StartedReview> => {
  const { onProgress, signal } = options;
  signal?.throwIfAborted();
  onProgress?.("loading-pool");
  let queryResultCount = 0;
  const countingFetcher: PoolFetcher = {
    ...deps.fetcher,
    search: async (query) => {
      const results = await deps.fetcher.search(query);
      queryResultCount = results.length;
      return results;
    },
  };
  const pool = await loadReviewPool(
    { query: input.query, seeds: input.seeds },
    countingFetcher,
  );
  signal?.throwIfAborted();
  if (pool.length === 0) {
    throw new ReviewUserError(
      input.seeds.length === 0
        ? "Your search terms matched no works on OpenAlex. Try fewer or broader terms, or check the spelling."
        : "OpenAlex has none of the starting works you gave. Check the ids and try again.",
    );
  }
  const inPool = new Set(pool.map((work) => work.id));
  const missingSeeds = input.seeds.filter((seed) => !inPool.has(seed));
  let seeds = [...input.seeds];
  // Null for a supplied-seeds start (the app picked nothing); the seeds the app picked once a selector has chosen them, so a later switch replaces exactly these.
  let pickedSeeds: string[] | undefined;
  let seedSelection: CompositionPick | null = null;
  if (seeds.length === 0) {
    onProgress?.("choosing-seeds");
    // Only the seed selectors are measured at start: they are cheap, and the review has no seeds until one is picked.
    const selection = rowsForStage(
      "seed-selection",
      measureSeedSelectionStage(
        pool,
        input.selectionSize,
        algorithmsByStage("seed-selection").map((spec) => spec.id),
      ),
    ).find((row) => row.chosen);
    if (selection === undefined) {
      throw new Error("no seed selector was measured for a zero-seeds start");
    }
    seeds = selectSeeds(
      selection.algorithmId,
      toPoolGraph(pool),
      input.selectionSize,
    );
    pickedSeeds = [...seeds];
    seedSelection = {
      algorithmId: selection.algorithmId,
      evidence: selection.evidence,
      chosenBy: "app",
    };
  }
  signal?.throwIfAborted();
  onProgress?.("saving");
  // Exploration and ranking start from defaults so the review opens at once; measuring every algorithm is far slower than loading the pool, and the session replaces the defaults with the measured best (adoptMeasured).
  const composition = defaultComposition(seedSelection);
  const created = await deps.store.createReview({
    name: input.name,
    query: input.query,
    seeds,
    pickedSeeds,
  });
  await deps.store.savePool(created.id, pool);
  await deps.store.updateReview(created.id, {
    suggestedComposition: composition,
  });
  return {
    review: { ...created, suggestedComposition: composition },
    pool,
    composition,
    queryResultCount,
    poolCapped: queryResultCount >= input.maxPoolSize,
    missingSeeds,
  };
};

/**
 * The slice of the dependencies a seed edit needs: the fetcher (to bring a newly added work into the pool) and the store writes.
 */
export interface SeedEditDeps {
  readonly fetcher: PoolFetcher;
  readonly store: Pick<ReviewStorePort, "updateReview" | "savePool">;
}

/**
 * Takes a work out of a review's seeds. A review keeps at least one seed, so removing the last one is refused. The work stays in the pool, where screening can offer it as a candidate.
 */
export const removeSeed = async (
  review: LiteratureReview,
  seedId: string,
  store: Pick<ReviewStorePort, "updateReview">,
): Promise<LiteratureReview> => {
  if (!review.seeds.includes(seedId)) return review;
  if (review.seeds.length <= MIN_REVIEW_SEEDS) {
    throw new ReviewUserError(
      "A review needs at least one starting work, so this one cannot be removed.",
    );
  }
  const seeds = review.seeds.filter((seed) => seed !== seedId);
  // Keep the picked set a subset of the seeds, so a removed pick is not recorded as still picked.
  const pickedSeeds = review.pickedSeeds?.filter((seed) => seed !== seedId);
  await store.updateReview(review.id, { seeds, pickedSeeds });
  return { ...review, seeds, pickedSeeds };
};

/**
 * Adds a work to a review's seeds. A work outside the pool is fetched and appended to the stored pool snapshot first, so screening sees it.
 */
export const addSeed = async (
  review: LiteratureReview,
  pool: readonly PoolWork[],
  seedId: string,
  deps: SeedEditDeps,
): Promise<{
  readonly review: LiteratureReview;
  readonly pool: readonly PoolWork[];
}> => {
  if (review.seeds.includes(seedId)) return { review, pool };
  let nextPool = pool;
  if (pool.every((work) => work.id !== seedId)) {
    const lookedUp = await deps.fetcher.byIds([seedId]);
    const fetched = lookedUp.find((work) => work.id === seedId);
    if (fetched === undefined) {
      throw new ReviewUserError(
        `OpenAlex has no work with the id ${seedId}. Check it and try again.`,
      );
    }
    nextPool = [
      ...pool,
      { id: fetched.id, references: fetched.referenced_works },
    ];
    await deps.store.savePool(review.id, nextPool);
  }
  const seeds = [...review.seeds, seedId];
  await deps.store.updateReview(review.id, { seeds });
  return { review: { ...review, seeds }, pool: nextPool };
};

const algorithmFor = (
  review: LiteratureReview,
  stage: "exploration" | "ranking",
) => {
  const id = review.suggestedComposition?.[stage]?.algorithmId;
  if (id === undefined) {
    throw new Error(
      `review ${review.id} has no ${stage} algorithm; start it with startReview`,
    );
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
const screeningOptionsFor = (
  review: LiteratureReview,
  pool: readonly PoolWork[],
): ScreeningOptions => {
  const { run } = algorithmFor(review, "exploration");
  const { rank } = algorithmFor(review, "ranking");
  if (run === undefined || rank === undefined) {
    throw new Error(
      `review ${review.id} composition names an algorithm that is not runnable`,
    );
  }
  return {
    exploration: run,
    ranking: rank,
    explorationConfig: { maxNodes: explorationBudget(pool.length) },
  };
};

export const screenReview = (
  review: LiteratureReview,
  pool: readonly PoolWork[],
): readonly RankedCandidate[] =>
  screenSemantically(pool, review.seeds, screeningOptionsFor(review, pool));

export const refineReview = (
  review: LiteratureReview,
  pool: readonly PoolWork[],
): RefinedReview => {
  const known = new Set(review.seeds);
  const included = Object.entries(review.decisions)
    .filter(
      ([workId, decision]) => decision === "include" && !known.has(workId),
    )
    .map(([workId]) => workId)
    .sort();
  const seeds = [...review.seeds, ...included];
  const decided = new Set(Object.keys(review.decisions));
  const candidates = screenSemantically(
    pool,
    seeds,
    screeningOptionsFor(review, pool),
  ).filter((candidate) => !decided.has(candidate.workId));
  return { seeds, candidates };
};

/**
 * The standard path: the Boolean query's results in the order the search returned them, minus the review's seeds and every decided work. The pool lists query results first, so pool order is search order.
 */
export const screenStandard = (
  review: LiteratureReview,
  pool: readonly PoolWork[],
): readonly StandardCandidate[] => {
  const seeds = new Set(review.seeds);
  const decided = new Set(Object.keys(review.decisions));
  return pool
    .filter((work) => !seeds.has(work.id) && !decided.has(work.id))
    .map((work, index) => ({ workId: work.id, rank: index + 1 }));
};
