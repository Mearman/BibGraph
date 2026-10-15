/**
 * Unit tests for the review service: starting a review from a seed set keeps the seeds and records the measured composition, a zero-seeds start picks seeds with the suggested selector, screening ranks the pool against the seeds, and refining folds included works back in as seeds while hiding decided works. A start reports its stages, stops on an abort before anything is stored, refuses an empty pool with plain wording, and reports a truncated search and missing seeds; seed edits keep at least one seed and bring new works into the pool. The pool fetcher and the review store are injected fakes, so the whole flow runs offline.
 */

import { describe, expect, it, vi } from "vitest";

import type {
  LiteratureReview,
  SuggestedComposition,
} from "../../stores/review-store";
import { MIN_REVIEW_SEEDS } from "../reviews/review-constants";
import type { PoolFetcher } from "./pool-loader";
import {
  addSeed,
  refineReview,
  removeSeed,
  type ReviewStorePort,
  ReviewUserError,
  screenReview,
  screenStandard,
  startReview,
  type StartStage,
} from "./review-service";

const SELECTION_SIZE = 2;
/**
 * The cap a test start passes; the chain pool below has one more work than this.
 */
const POOL_CAP = 3;

const work = (id: string, references: readonly string[]) => ({
  id,
  referenced_works: references,
});

/**
 * Chain pool: s1 - m - s2 plus a distant d; m cites both seeds, d cites m, so m is the strongest bridge and d a weaker one.
 */
const makeFetcher = (overrides: Partial<PoolFetcher> = {}): PoolFetcher => ({
  search: async () => {
    await Promise.resolve();
    return [
      work("W1", []),
      work("W2", ["W1", "W3"]),
      work("W3", []),
      work("W4", ["W2"]),
    ];
  },
  byIds: async (ids) => {
    await Promise.resolve();
    return ids.map((id) => work(id, []));
  },
  ...overrides,
});

const makeStore = (): {
  store: ReviewStorePort;
  saved: Map<string, LiteratureReview>;
  pools: Map<string, readonly unknown[]>;
  creates: () => number;
} => {
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
        ...(input.pickedSeeds !== undefined && { pickedSeeds: input.pickedSeeds }),
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
  return { store, saved, pools, creates: () => counter };
};

interface StartOverrides {
  readonly input?: Partial<Parameters<typeof startReview>[0]>;
  readonly fetcher?: PoolFetcher;
  readonly store?: ReviewStorePort;
  readonly options?: {
    readonly onProgress?: (stage: StartStage) => void;
    readonly signal?: AbortSignal;
  };
}

/**
 * One start against fresh state, sharing the chain pool; returns the outcome with the fake store for assertions.
 */
const runStart = async (overrides: StartOverrides = {}) => {
  const made = makeStore();
  const started = await startReview(
    {
      name: "r",
      query: "q",
      seeds: ["W1", "W3"],
      selectionSize: SELECTION_SIZE,
      maxPoolSize: POOL_CAP,
      ...overrides.input,
    },
    {
      fetcher: makeFetcher(),
      store: made.store,
      ...(overrides.fetcher !== undefined && { fetcher: overrides.fetcher }),
      ...(overrides.store !== undefined && { store: overrides.store }),
    },
    overrides.options,
  );
  return { started, made };
};

describe("review service", () => {
  it("starts from a seed set, keeping the seeds and recording the composition", async () => {
    const { started, made } = await runStart();
    expect(started.review.seeds).toEqual(["W1", "W3"]);
    const recorded: SuggestedComposition | null | undefined = made.saved.get(
      started.review.id,
    )?.suggestedComposition;
    expect(recorded?.exploration?.algorithmId).toBeDefined();
    expect(recorded?.seedSelection).toBeNull();
  });

  it("starts from zero seeds by picking seeds with the suggested selector", async () => {
    const { started, made } = await runStart({ input: { seeds: [] } });
    expect(started.review.seeds).toHaveLength(SELECTION_SIZE);
    expect(made.saved.get(started.review.id)?.seeds).toEqual(
      started.review.seeds,
    );
    // The picks are recorded as the app's, so a later selector switch replaces exactly them.
    expect(made.saved.get(started.review.id)?.pickedSeeds).toEqual(
      started.review.seeds,
    );
    expect(started.composition.seedSelection?.algorithmId).toBeDefined();
  });

  it("reports the start stages in order, with choosing-seeds only for a zero-seeds start", async () => {
    const zeroSeedsStages: string[] = [];
    await runStart({
      input: { seeds: [] },
      options: {
        onProgress: (stage) => {
          zeroSeedsStages.push(stage);
        },
      },
    });
    expect(zeroSeedsStages).toEqual([
      "loading-pool",
      "choosing-seeds",
      "saving",
    ]);
    const seededStages: string[] = [];
    await runStart({
      options: {
        onProgress: (stage) => {
          seededStages.push(stage);
        },
      },
    });
    expect(seededStages).toEqual(["loading-pool", "saving"]);
  });

  it("stops on an abort before anything is stored", async () => {
    const made = makeStore();
    const controller = new AbortController();
    const progress = vi.fn((stage: string) => {
      if (stage === "loading-pool") controller.abort();
    });
    await expect(
      startReview(
        {
          name: "r",
          query: "q",
          seeds: [],
          selectionSize: SELECTION_SIZE,
          maxPoolSize: POOL_CAP,
        },
        { fetcher: makeFetcher(), store: made.store },
        { onProgress: progress, signal: controller.signal },
      ),
    ).rejects.toThrow();
    expect(made.creates()).toBe(0);
  });

  it("refuses a start whose pool is empty, in plain wording", async () => {
    const emptyFetcher = makeFetcher({
      search: async () => {
        await Promise.resolve();
        return [];
      },
      byIds: async () => {
        await Promise.resolve();
        return [];
      },
    });
    await expect(
      runStart({ input: { seeds: [] }, fetcher: emptyFetcher }),
    ).rejects.toBeInstanceOf(ReviewUserError);
    await expect(
      runStart({ input: { query: "", seeds: ["W9"] }, fetcher: emptyFetcher }),
    ).rejects.toThrow(/OpenAlex has none of the starting works/);
  });

  it("flags a search cut at the pool cap, and not a shorter one", async () => {
    const { started } = await runStart();
    expect(started.queryResultCount).toBeGreaterThan(POOL_CAP);
    expect(started.poolCapped).toBe(true);
    const shortFetcher = makeFetcher({
      search: async () => {
        await Promise.resolve();
        return [work("W1", [])];
      },
    });
    const { started: short } = await runStart({ fetcher: shortFetcher });
    expect(short.poolCapped).toBe(false);
  });

  it("names starting works OpenAlex did not return", async () => {
    const dropping = makeFetcher({
      byIds: async () => {
        await Promise.resolve();
        return [];
      },
    });
    const { started } = await runStart({
      input: { seeds: ["W1", "W9"] },
      fetcher: dropping,
    });
    expect(started.missingSeeds).toEqual(["W9"]);
  });

  it("screens the pool against the seeds, ranking candidates without seeds", async () => {
    const { started } = await runStart();
    const screened = screenReview(started.review, started.pool);
    expect(screened.map((c) => c.workId)).toContain("W2");
    expect(screened.map((c) => c.workId)).not.toContain("W1");
  });

  it("refines by folding inclusions into the seeds and hiding decided works", async () => {
    const { started } = await runStart();
    const decided: LiteratureReview = {
      ...started.review,
      decisions: { W2: "include", W4: "exclude" },
    };
    const refined = refineReview(decided, started.pool);
    expect(refined.seeds).toEqual(["W1", "W3", "W2"]);
    expect(refined.candidates.map((c) => c.workId)).not.toContain("W2");
    expect(refined.candidates.map((c) => c.workId)).not.toContain("W4");
  });

  it("screens the standard path in query order, skipping seeds and decided works", async () => {
    const { started } = await runStart({ input: { seeds: ["W1"] } });
    const decided: LiteratureReview = {
      ...started.review,
      decisions: { W3: "exclude" },
    };
    const standard = screenStandard(decided, started.pool);
    expect(standard.map((c) => c.workId)).toEqual(["W2", "W4"]);
    expect(standard.map((c) => c.rank)).toEqual([1, 2]);
  });

  it("stores the pool snapshot with the review so it is never refetched", async () => {
    const { started, made } = await runStart();
    expect(made.pools.get(started.review.id)).toEqual(started.pool);
  });
});

describe("seed edits", () => {
  it("removes a seed and stores the shorter list", async () => {
    const { started, made } = await runStart();
    const edited = await removeSeed(started.review, "W3", made.store);
    expect(edited.seeds).toEqual(["W1"]);
    expect(made.saved.get(started.review.id)?.seeds).toEqual(["W1"]);
  });

  it("removes a picked seed from the picked set too, keeping it a subset of the seeds", async () => {
    const { started, made } = await runStart({ input: { seeds: [], selectionSize: 2 } });
    const removed = started.review.seeds[0] ?? "";
    const remaining = started.review.seeds.filter((seed) => seed !== removed);
    const edited = await removeSeed(started.review, removed, made.store);
    expect(edited.seeds).toEqual(remaining);
    expect(made.saved.get(started.review.id)?.pickedSeeds).toEqual(remaining);
  });

  it("refuses to remove the last seed", async () => {
    const { started, made } = await runStart({ input: { seeds: ["W1"] } });
    await expect(
      removeSeed(started.review, "W1", made.store),
    ).rejects.toBeInstanceOf(ReviewUserError);
  });

  it("adds a seed already in the pool without refetching or resaving", async () => {
    const made = makeStore();
    const fetcher = makeFetcher({
      byIds: async () => {
        await Promise.resolve();
        throw new Error(
          "byIds must not be called for a work already in the pool",
        );
      },
    });
    const started = await startReview(
      {
        name: "r",
        query: "q",
        seeds: ["W1"],
        selectionSize: SELECTION_SIZE,
        maxPoolSize: POOL_CAP,
      },
      { fetcher, store: made.store },
    );
    const edited = await addSeed(started.review, started.pool, "W2", {
      fetcher,
      store: made.store,
    });
    expect(edited.review.seeds).toEqual(["W1", "W2"]);
    expect(edited.pool).toEqual(started.pool);
    expect(made.pools.get(started.review.id)).toEqual(started.pool);
  });

  it("adds a seed outside the pool by fetching it into the stored snapshot", async () => {
    const made = makeStore();
    const fetcher = makeFetcher({
      byIds: async (ids) => {
        await Promise.resolve();
        return ids.map((id) => work(id, ["W1"]));
      },
    });
    const started = await startReview(
      {
        name: "r",
        query: "q",
        seeds: ["W1"],
        selectionSize: SELECTION_SIZE,
        maxPoolSize: POOL_CAP,
      },
      { fetcher, store: made.store },
    );
    const edited = await addSeed(started.review, started.pool, "W9", {
      fetcher,
      store: made.store,
    });
    expect(edited.review.seeds).toEqual(["W1", "W9"]);
    expect(edited.pool.map((w) => w.id)).toContain("W9");
    expect(made.pools.get(started.review.id)).toEqual(edited.pool);
  });

  it("refuses a seed OpenAlex does not know, in plain wording", async () => {
    const made = makeStore();
    const fetcher = makeFetcher({
      byIds: async () => {
        await Promise.resolve();
        return [];
      },
    });
    const started = await startReview(
      {
        name: "r",
        query: "q",
        seeds: ["W1"],
        selectionSize: SELECTION_SIZE,
        maxPoolSize: POOL_CAP,
      },
      { fetcher, store: made.store },
    );
    await expect(
      addSeed(started.review, started.pool, "W9", {
        fetcher,
        store: made.store,
      }),
    ).rejects.toBeInstanceOf(ReviewUserError);
  });

  it("keeps at least the configured minimum of seeds", () => {
    expect(MIN_REVIEW_SEEDS).toBe(1);
  });
});
