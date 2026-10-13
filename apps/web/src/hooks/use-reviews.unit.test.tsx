// @vitest-environment jsdom

/**
 * Unit tests for the reviews hook: it lists stored reviews, starting a review runs the review service and reports each stage, a cancel aborts the run without surfacing an error, a start that needs a check (app-picked seeds or a warning such as a truncated search) is held as a pending check whose seeds can be removed from and added to, and rename and delete go through the deps. The deps are injected fakes.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  StartReviewInput,
  StartReviewOptions,
} from "@/lib/algorithms/review-service";
import type { PoolWork } from "@/lib/algorithms/screening-engine";
import type { WorkLabel } from "@/lib/algorithms/work-labels";
import type { LiteratureReview } from "@/stores/review-store";

import {
  type ReviewsDeps,
  type StartOutcome,
  type StartReviewValues,
  useReviews,
} from "./use-reviews";

const review = (id: string): LiteratureReview => ({
  id,
  name: `Review ${id}`,
  query: "q",
  seeds: [],
  decisions: {},
  suggestedComposition: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

/**
 * Result count a fake start reports when the script says nothing else; the hook only surfaces it in the zero-works notice.
 */
const DEFAULT_QUERY_RESULTS = 10;

interface StartScript {
  readonly started: {
    readonly review: LiteratureReview;
    readonly poolCapped?: boolean;
    readonly queryResultCount?: number;
    readonly missingSeeds?: readonly string[];
    readonly appPickedSeeds?: boolean;
  };
}

const NO_NOTICES_SCRIPT: StartScript = { started: { review: review("b") } };

const makeDeps = (script: StartScript) => {
  const stored: LiteratureReview[] = [review("a")];
  const seenInputs: StartReviewInput[] = [];
  const seenOptions: StartReviewOptions[] = [];
  let saved = script.started.review;
  const deps: ReviewsDeps = {
    listReviews: async () => {
      await Promise.resolve();
      return [...stored];
    },
    startReview: async (input, options) => {
      seenInputs.push(input);
      seenOptions.push(options);
      await Promise.resolve();
      options.onProgress?.("loading-pool");
      options.onProgress?.("saving");
      return {
        review: saved,
        pool: [],
        composition: {
          exploration: null,
          ranking: null,
          seedSelection:
            script.started.appPickedSeeds === true
              ? { algorithmId: "x", evidence: "e", chosenBy: "app" }
              : null,
        },
        queryResultCount: script.started.queryResultCount ?? DEFAULT_QUERY_RESULTS,
        poolCapped: script.started.poolCapped ?? false,
        missingSeeds: script.started.missingSeeds ?? [],
      };
    },
    removeSeed: async (current, seedId) => {
      await Promise.resolve();
      saved = {
        ...current,
        seeds: current.seeds.filter((seed) => seed !== seedId),
      };
      return saved;
    },
    addSeed: async (current, pool, seedId) => {
      await Promise.resolve();
      saved = { ...current, seeds: [...current.seeds, seedId] };
      return { review: saved, pool: [...pool] as PoolWork[] };
    },
    renameReview: async (id, name) => {
      await Promise.resolve();
      const index = stored.findIndex((entry) => entry.id === id);
      if (index !== -1) stored[index] = { ...stored[index], name };
    },
    deleteReview: async (id) => {
      await Promise.resolve();
      const index = stored.findIndex((entry) => entry.id === id);
      if (index !== -1) stored.splice(index, 1);
    },
    fetchLabels: async (ids) => {
      await Promise.resolve();
      return new Map(
        ids.map((id) => [
          id,
          { title: `Title of ${id}`, year: 2020 } satisfies WorkLabel,
        ]),
      );
    },
  };
  return { deps, stored, seenInputs, seenOptions };
};

const wrapper = ({ children }: { readonly children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useReviews", () => {
  it("lists the stored reviews", async () => {
    const { deps } = makeDeps(NO_NOTICES_SCRIPT);
    const { result } = renderHook(() => useReviews(deps), { wrapper });
    await waitFor(() => {
      expect(result.current.reviews.map((r) => r.id)).toEqual(["a"]);
    });
    expect(result.current.loading).toBe(false);
  });

  it("starts a review, reporting the stages, and refreshes the list", async () => {
    const script: StartScript = {
      started: { review: { ...review("b"), name: "New", seeds: ["W1"] } },
    };
    const made = makeDeps(script);
    const seenInputs = made.seenInputs;
    let releaseStart: (() => void) | undefined;
    const deps: ReviewsDeps = {
      ...made.deps,
      startReview: async (input, options) => {
        seenInputs.push(input);
        options.onProgress?.("loading-pool");
        await new Promise<void>((resolve) => {
          releaseStart = resolve;
        });
        options.onProgress?.("saving");
        return {
          review: script.started.review,
          pool: [],
          composition: {
            exploration: null,
            ranking: null,
            seedSelection: null,
          },
          queryResultCount: 10,
          poolCapped: false,
          missingSeeds: [],
        };
      },
    };
    const { result } = renderHook(() => useReviews(deps), { wrapper });
    await waitFor(() => {
      expect(result.current.reviews).toHaveLength(1);
    });
    let outcome: StartOutcome | undefined;
    let running: Promise<StartOutcome> | undefined;
    act(() => {
      running = result.current.start({
        name: "New",
        query: "q",
        seeds: ["W1"],
      } satisfies StartReviewValues);
    });
    await waitFor(() => {
      expect(result.current.stage).toBe("loading-pool");
    });
    act(() => {
      releaseStart?.();
    });
    await act(async () => {
      outcome = await running;
    });
    expect(result.current.stage).toBeNull();
    expect(seenInputs[0]).toMatchObject({
      name: "New",
      query: "q",
      seeds: ["W1"],
    });
    expect(outcome?.needsCheck).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it("does not submit twice concurrently", async () => {
    let release: (() => void) | undefined;
    const base = makeDeps(NO_NOTICES_SCRIPT);
    const startReview = vi.fn(
      async (_input: StartReviewInput, _options: StartReviewOptions) =>
        new Promise<Awaited<ReturnType<ReviewsDeps["startReview"]>>>((resolve) => {
          release = () => {
            resolve({
              review: review("b"),
              pool: [],
              composition: {
                exploration: null,
                ranking: null,
                seedSelection: null,
              },
              queryResultCount: 1,
              poolCapped: false,
              missingSeeds: [],
            });
          };
        }),
    );
    const deps: ReviewsDeps = { ...base.deps, startReview };
    const { result } = renderHook(() => useReviews(deps), { wrapper });
    await waitFor(() => {
      expect(result.current.reviews).toHaveLength(1);
    });
    let first: Promise<StartOutcome> | undefined;
    let second: Promise<StartOutcome> | undefined;
    await act(async () => {
      first = result.current.start({ name: "x", query: "q", seeds: [] });
      second = result.current.start({ name: "x", query: "q", seeds: [] });
      // One tick lets the mutation start, so the call count below is meaningful.
      await Promise.resolve();
    });
    expect(startReview).toHaveBeenCalledTimes(1);
    release?.();
    let firstOutcome: StartOutcome | undefined;
    let secondOutcome: StartOutcome | undefined;
    await act(async () => {
      firstOutcome = await first;
      secondOutcome = await second;
    });
    expect(secondOutcome).toEqual(firstOutcome);
  });

  it("cancels a running start by aborting its signal, without an error", async () => {
    const seenOptions: StartReviewOptions[] = [];
    const deps: ReviewsDeps = {
      ...makeDeps(NO_NOTICES_SCRIPT).deps,
      startReview: async (_input, options) => {
        seenOptions.push(options);
        return new Promise((_resolve, reject) => {
          const abort = () => { reject(new DOMException("aborted", "AbortError")); };
          // The real service checks the signal between stages, so an abort that lands before the listener still stops the start.
          if (options.signal?.aborted === true) abort();
          else options.signal?.addEventListener("abort", abort);
        });
      },
    };
    const { result } = renderHook(() => useReviews(deps), { wrapper });
    await waitFor(() => {
      expect(result.current.reviews).toHaveLength(1);
    });
    let running: Promise<StartOutcome> | undefined;
    await act(async () => {
      running = result.current.start({ name: "x", query: "q", seeds: [] });
      result.current.cancelStart();
      await running.catch(() => undefined);
    });
    expect(seenOptions[0]?.signal?.aborted).toBe(true);
    expect(result.current.startError).toBeNull();
  });

  it("holds a zero-seeds start as a pending check with titles, notices, seed edits and continue", async () => {
    const script: StartScript = {
      started: {
        review: { ...review("b"), seeds: ["W1", "W2"] },
        appPickedSeeds: true,
        poolCapped: true,
        queryResultCount: 1000,
      },
    };
    const { deps } = makeDeps(script);
    const { result } = renderHook(() => useReviews(deps), { wrapper });
    await waitFor(() => {
      expect(result.current.reviews).toHaveLength(1);
    });
    await act(async () => {
      const outcome = await result.current.start({
        name: "Picked",
        query: "q",
        seeds: [],
      });
      expect(outcome.needsCheck).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.pending?.seeds.map((seed) => seed.id)).toEqual([
        "W1",
        "W2",
      ]);
    });
    await waitFor(() => {
      expect(
        result.current.pending?.seeds.every((seed) =>
          seed.title.startsWith("Title of "),
        ),
      ).toBe(true);
    });
    expect(result.current.pending?.notices.join(" ")).toContain("1,000");
    await act(async () => {
      await result.current.removePendingSeed("W1");
    });
    expect(result.current.pending?.seeds.map((seed) => seed.id)).toEqual([
      "W2",
    ]);
    await act(async () => {
      await result.current.addPendingSeed("W9");
    });
    expect(result.current.pending?.seeds.map((seed) => seed.id)).toEqual([
      "W2",
      "W9",
    ]);
    await act(async () => {
      await result.current.addPendingSeed("nonsense");
    });
    // The mutation's error state arrives through a batched notification, so it can land a tick after the awaited call.
    await waitFor(() => {
      expect(result.current.pendingError).toContain("not an OpenAlex work id");
    });
    expect(result.current.pending?.seeds).toHaveLength(2);
    act(() => {
      result.current.dismissPending();
    });
    expect(result.current.pending).toBeNull();
  });

  it("holds a start with missing starting works even when the seeds were supplied", async () => {
    const script: StartScript = {
      started: {
        review: { ...review("b"), seeds: ["W1"] },
        missingSeeds: ["W8"],
      },
    };
    const { deps } = makeDeps(script);
    const { result } = renderHook(() => useReviews(deps), { wrapper });
    await waitFor(() => {
      expect(result.current.reviews).toHaveLength(1);
    });
    await act(async () => {
      const outcome = await result.current.start({
        name: "s",
        query: "q",
        seeds: ["W1", "W8"],
      });
      expect(outcome.needsCheck).toBe(true);
    });
    expect(result.current.pending?.notices.join(" ")).toContain("W8");
  });

  it("renames and deletes through the deps", async () => {
    const { deps } = makeDeps(NO_NOTICES_SCRIPT);
    const { result } = renderHook(() => useReviews(deps), { wrapper });
    await waitFor(() => {
      expect(result.current.reviews).toHaveLength(1);
    });
    await act(async () => {
      await result.current.rename("a", "Renamed");
    });
    await waitFor(() => {
      expect(result.current.reviews.find((r) => r.id === "a")?.name).toBe(
        "Renamed",
      );
    });
    await act(async () => {
      await result.current.remove("a");
    });
    await waitFor(() => {
      expect(result.current.reviews.map((r) => r.id)).toEqual([]);
    });
  });
});
