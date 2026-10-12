/**
 * Production dependencies for the review service: the cached OpenAlex client behind the pool fetcher and the Dexie review store behind the store port. This is the only module that joins the headless review engines to the network and the database; components and hooks import the ready-made dependencies from here.
 */

import { cachedOpenAlex } from "@bibgraph/client";
import { z } from "zod";

import type { ReviewSessionDeps } from "@/hooks/use-review-session";
import type { ReviewsDeps } from "@/hooks/use-reviews";
import {
	createReview,
	getPool,
	getReview,
	listReviews,
	savePool,
	setDecision,
	updateReview,
} from "@/stores/review-store";

import { createOpenAlexPoolFetcher } from "../algorithms/openalex-pool-fetcher";
import { type ReviewServiceDeps, startReview } from "../algorithms/review-service";
import { createWorkLabelFetcher } from "../algorithms/work-labels";
import { workerCompute } from "./compute-client";
import { MAX_REVIEW_POOL_SIZE } from "./review-constants";

/**
 * Shapes of the two field projections the review screens request; the client validates a projected result against these rather than the full Work schema.
 */
const poolWorkSchema = z.object({ id: z.string(), referenced_works: z.array(z.string()) });
const labelWorkSchema = z.object({
	id: z.string(),
	display_name: z.string().nullable(),
	publication_year: z.number().nullable(),
});

export const reviewServiceDeps: ReviewServiceDeps = {
	fetcher: createOpenAlexPoolFetcher(
		{ getWorks: async (params) => cachedOpenAlex.client.works.getWorksProjection(params, poolWorkSchema) },
		{ maxPoolSize: MAX_REVIEW_POOL_SIZE },
	),
	store: { createReview, updateReview, savePool },
};

export const fetchWorkLabels = createWorkLabelFetcher({
	getWorks: async (params) => cachedOpenAlex.client.works.getWorksProjection(params, labelWorkSchema),
});

export const reviewsDeps: ReviewsDeps = {
	listReviews,
	startReview: async (input) => startReview(input, reviewServiceDeps),
};

export const reviewSessionDeps: ReviewSessionDeps = {
	compute: workerCompute,
	fetcher: reviewServiceDeps.fetcher,
	fetchLabels: fetchWorkLabels,
	store: { getReview, setDecision, updateReview, getPool, savePool },
};
