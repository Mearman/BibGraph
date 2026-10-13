/**
 * Reviews hook: the list of stored reviews and the actions behind the reviews screen. Starting a review runs the review service (which loads the pool, measures the composition and, for a zero-seeds start, picks the seeds), reporting each stage and allowing a cancel, then refreshes the list. A start whose result needs a look (app-picked seeds, or a warning such as a truncated search) is held as a pending check where the reviewer can remove or add starting works before screening. Renaming and deleting go through the same deps. I/O arrives through the injected deps.
 */

import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

import type {
  StartedReview,
  StartReviewInput,
  StartReviewOptions,
  StartStage,
} from "@/lib/algorithms/review-service";
import { ReviewUserError } from "@/lib/algorithms/review-service";
import type { PoolWork } from "@/lib/algorithms/screening-engine";
import type { WorkLabel, WorkLabelFetcher } from "@/lib/algorithms/work-labels";
import {
  MAX_REVIEW_POOL_SIZE,
  ZERO_SEEDS_SELECTION_SIZE,
} from "@/lib/reviews/review-constants";
import { describeError, startNotices } from "@/lib/reviews/review-messages";
import { firstSeed, parseSeedTokens } from "@/lib/reviews/seed-input";
import type { LiteratureReview } from "@/stores/review-store";

export interface ReviewsDeps {
  readonly listReviews: () => Promise<LiteratureReview[]>;
  readonly startReview: (
    input: StartReviewInput,
    options: StartReviewOptions,
  ) => Promise<StartedReview>;
  readonly removeSeed: (
    review: LiteratureReview,
    seedId: string,
  ) => Promise<LiteratureReview>;
  readonly addSeed: (
    review: LiteratureReview,
    pool: readonly PoolWork[],
    seedId: string,
  ) => Promise<{
    readonly review: LiteratureReview;
    readonly pool: readonly PoolWork[];
  }>;
  readonly renameReview: (id: string, name: string) => Promise<void>;
  readonly deleteReview: (id: string) => Promise<void>;
  readonly fetchLabels: WorkLabelFetcher;
}

export interface StartReviewValues {
  readonly name: string;
  readonly query: string;
  readonly seeds: readonly string[];
}

export interface PendingSeed {
  readonly id: string;
  /**
   * The work's title once fetched; its id until then.
   */
  readonly title: string;
}

/**
 * A started review waiting for the reviewer's check: its starting works and any warnings.
 */
export interface PendingStart {
  readonly reviewId: string;
  readonly name: string;
  readonly seeds: readonly PendingSeed[];
  readonly notices: readonly string[];
}

export interface StartOutcome {
  readonly review: LiteratureReview;
  /**
   * True when the review is held as a pending check instead of being ready to open.
   */
  readonly needsCheck: boolean;
}

export interface UseReviewsResult {
  readonly reviews: readonly LiteratureReview[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly starting: boolean;
  /**
   * The stage a running start is in; null when none is running.
   */
  readonly stage: StartStage | null;
  readonly startError: string | null;
  readonly start: (values: StartReviewValues) => Promise<StartOutcome>;
  /**
   * Stops a running start before anything is stored.
   */
  readonly cancelStart: () => void;
  readonly pending: PendingStart | null;
  readonly pendingBusy: boolean;
  readonly pendingError: string | null;
  readonly removePendingSeed: (seedId: string) => Promise<void>;
  /**
   * Adds a work to the pending review; the token is an OpenAlex id or URL.
   */
  readonly addPendingSeed: (token: string) => Promise<void>;
  readonly dismissPending: () => void;
  readonly rename: (id: string, name: string) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly mutationError: string | null;
}

const REVIEWS_KEY = ["reviews"];

const NO_LABELS: ReadonlyMap<string, WorkLabel> = new Map();

/**
 * Titles for work ids, fetched once per distinct set. The key matches the screening session's label query, so the two share cached labels.
 */
export const useWorkLabels = (
  ids: readonly string[],
  fetchLabels: WorkLabelFetcher,
): ReadonlyMap<string, WorkLabel> => {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  const labels = useQuery({
    queryKey: ["review-labels", sorted.join(",")],
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    queryFn: sorted.length === 0 ? skipToken : async () => fetchLabels(sorted),
  });
  return labels.data ?? NO_LABELS;
};

/**
 * These actions report their failure through hook state, so the returned promise must not also reject unhandled.
 */
const swallow = async (action: Readonly<Promise<void>>): Promise<void> => {
  await action.catch(() => undefined);
};

const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

interface PendingState {
  readonly review: LiteratureReview;
  readonly pool: readonly PoolWork[];
  readonly notices: readonly string[];
}

export const useReviews = (deps: ReviewsDeps): UseReviewsResult => {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: [...REVIEWS_KEY, deps.listReviews],
    queryFn: deps.listReviews,
  });
  const [stage, setStage] = useState<StartStage | null>(null);
  const [pendingState, setPendingState] = useState<PendingState | null>(null);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef<Promise<StartOutcome> | null>(null);

  const refresh = async () =>
    queryClient.invalidateQueries({ queryKey: REVIEWS_KEY });

  const starter = useMutation({
    mutationFn: async (
      input: Readonly<{ values: StartReviewValues; signal: AbortSignal }>,
    ) =>
      deps.startReview(
        {
          ...input.values,
          selectionSize: ZERO_SEEDS_SELECTION_SIZE,
          maxPoolSize: MAX_REVIEW_POOL_SIZE,
        },
        { onProgress: setStage, signal: input.signal },
      ),
    onSuccess: refresh,
  });

  const editor = useMutation({
    mutationFn: async (
      edit: Readonly<
        { kind: "remove"; seedId: string } | { kind: "add"; token: string }
      >,
    ) => {
      if (pendingState === null) return;
      if (edit.kind === "remove") {
        const review = await deps.removeSeed(pendingState.review, edit.seedId);
        setPendingState({ ...pendingState, review });
        return;
      }
      const parsed = parseSeedTokens(edit.token);
      const seedId = firstSeed(parsed);
      if (seedId === null || parsed.invalid.length > 0) {
        throw new ReviewUserError(
          `"${edit.token.trim()}" is not an OpenAlex work id. Paste an id such as W2741809807 or a link such as https://openalex.org/W2741809807.`,
        );
      }
      const edited = await deps.addSeed(
        pendingState.review,
        pendingState.pool,
        seedId,
      );
      setPendingState({
        ...pendingState,
        review: edited.review,
        pool: edited.pool,
      });
    },
    onSuccess: refresh,
  });

  const renamer = useMutation({
    mutationFn: async (input: Readonly<{ id: string; name: string }>) => {
      await deps.renameReview(input.id, input.name);
    },
    onSuccess: refresh,
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      await deps.deleteReview(id);
      setPendingState((current) =>
        current?.review.id === id ? null : current,
      );
    },
    onSuccess: refresh,
  });

  const pendingIds = pendingState?.review.seeds ?? [];
  const labels = useWorkLabels(pendingIds, deps.fetchLabels);
  const pending: PendingStart | null =
    pendingState === null
      ? null
      : {
          reviewId: pendingState.review.id,
          name: pendingState.review.name,
          seeds: pendingState.review.seeds.map((id) => ({
            id,
            title: labels.get(id)?.title ?? id,
          })),
          notices: pendingState.notices,
        };

  const start = async (values: StartReviewValues): Promise<StartOutcome> => {
    if (inFlight.current !== null) return inFlight.current;
    const abort = new AbortController();
    controller.current = abort;
    const run = starter
      .mutateAsync({ values, signal: abort.signal })
      .then((started): StartOutcome => {
        const notices = startNotices(started, values.query.trim() !== "");
        const needsCheck =
          started.composition.seedSelection !== null || notices.length > 0;
        if (needsCheck) {
          editor.reset();
          setPendingState({
            review: started.review,
            pool: started.pool,
            notices,
          });
        }
        return { review: started.review, needsCheck };
      })
      .finally(() => {
        inFlight.current = null;
        controller.current = null;
        setStage(null);
      });
    inFlight.current = run;
    return run;
  };

  const failure = (error: unknown): string | null =>
    error === null || isAbort(error) ? null : describeError(error).message;

  return {
    reviews: list.data ?? [],
    loading: list.isPending,
    error: failure(list.error),
    starting: starter.isPending,
    stage,
    startError: failure(starter.error),
    start,
    cancelStart: () => {
      controller.current?.abort();
    },
    pending,
    pendingBusy: editor.isPending,
    pendingError: failure(editor.error),
    removePendingSeed: async (seedId) =>
      swallow(editor.mutateAsync({ kind: "remove", seedId })),
    addPendingSeed: async (token) =>
      swallow(editor.mutateAsync({ kind: "add", token })),
    dismissPending: () => {
      setPendingState(null);
    },
    rename: async (id, name) => swallow(renamer.mutateAsync({ id, name })),
    remove: async (id) => swallow(remover.mutateAsync(id)),
    mutationError: failure(renamer.error ?? remover.error),
  };
};
