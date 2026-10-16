/**
 * Production dependencies for the review service: the cached OpenAlex client behind the pool fetcher and the Dexie review store behind the store port. This is the only module that joins the headless review engines to the network and the database; components and hooks import the ready-made dependencies from here.
 */

import { cachedOpenAlex } from "@bibgraph/client";
import { z } from "zod";

import type { ReviewSessionDeps } from "@/hooks/use-review-session";
import type { ReviewsDeps } from "@/hooks/use-reviews";
import { getBackgroundQueueDB } from "@/lib/background-sync/queue-db";
import {
  clearDecision,
  createReview,
  deleteReview,
  getMeasurements,
  getPool,
  getReview,
  listReviews,
  saveMeasurements,
  savePool,
  setDecision,
  updateReview,
} from "@/stores/review-store";

import { createOpenAlexPoolFetcher } from "../algorithms/openalex-pool-fetcher";
import {
  addSeed,
  removeSeed,
  type ReviewServiceDeps,
  startReview,
} from "../algorithms/review-service";
import { createWorkLabelFetcher } from "../algorithms/work-labels";
import { workerCompute } from "./compute-client";
import { withHydrationRetryQueue } from "./label-retry-queue";
import { MAX_REVIEW_POOL_SIZE } from "./review-constants";

/**
 * Shapes of the two field projections the review screens request; the client validates a projected result against these rather than the full Work schema.
 */
const poolWorkSchema = z.object({
  id: z.string(),
  referenced_works: z.array(z.string()),
});
const labelWorkSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable(),
  publication_year: z.number().nullable(),
});

export const reviewServiceDeps: ReviewServiceDeps = {
  fetcher: createOpenAlexPoolFetcher(
    {
      getWorks: async (params) =>
        cachedOpenAlex.client.works.getWorksProjection(params, poolWorkSchema),
    },
    { maxPoolSize: MAX_REVIEW_POOL_SIZE },
  ),
  store: { createReview, updateReview, savePool },
};

const baseFetchWorkLabels = createWorkLabelFetcher({
  getWorks: async (params) =>
    cachedOpenAlex.client.works.getWorksProjection(params, labelWorkSchema),
});

/**
 * The label fetcher, wrapped so a failed batch queues its ids for the background drain while the screens degrade exactly as before.
 */
export const fetchWorkLabels = withHydrationRetryQueue(
  getBackgroundQueueDB(),
  baseFetchWorkLabels,
);

export const reviewsDeps: ReviewsDeps = {
  listReviews,
  startReview: async (input, options) =>
    startReview(input, reviewServiceDeps, options),
  removeSeed: async (review, seedId) =>
    removeSeed(review, seedId, reviewServiceDeps.store),
  addSeed: async (review, pool, seedId) =>
    addSeed(review, pool, seedId, {
      fetcher: reviewServiceDeps.fetcher,
      store: reviewServiceDeps.store,
    }),
  renameReview: async (id, name) => {
    await updateReview(id, { name });
  },
  deleteReview,
  fetchLabels: fetchWorkLabels,
};

export const reviewSessionDeps: ReviewSessionDeps = {
  compute: workerCompute,
  fetcher: reviewServiceDeps.fetcher,
  fetchLabels: fetchWorkLabels,
  store: {
    getReview,
    setDecision,
    clearDecision,
    updateReview,
    getPool,
    savePool,
    getMeasurements,
    saveMeasurements,
  },
};
