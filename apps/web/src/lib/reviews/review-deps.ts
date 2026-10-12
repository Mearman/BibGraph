/**
 * Production dependencies for the review service: the cached OpenAlex client behind the pool fetcher and the Dexie review store behind the store port. This is the only module that joins the headless review engines to the network and the database; components and hooks import the ready-made dependencies from here.
 */

import { cachedOpenAlex } from "@bibgraph/client";

import type { ReviewSessionDeps } from "@/hooks/use-review-session";
import type { ReviewsDeps } from "@/hooks/use-reviews";
import { createReview, getReview, listReviews, setDecision, updateReview } from "@/stores/review-store";

import { createOpenAlexPoolFetcher } from "../algorithms/openalex-pool-fetcher";
import { type ReviewServiceDeps, startReview } from "../algorithms/review-service";
import { createWorkLabelFetcher } from "../algorithms/work-labels";
import { MAX_REVIEW_POOL_SIZE } from "./review-constants";

export const reviewServiceDeps: ReviewServiceDeps = {
	fetcher: createOpenAlexPoolFetcher(
		{
			getWorks: async (params) => {
				const response = await cachedOpenAlex.client.works.getWorks(params);
				return {
					results: response.results.map((work) => ({
						id: work.id,
						referenced_works: work.referenced_works ?? [],
					})),
				};
			},
		},
		{ maxPoolSize: MAX_REVIEW_POOL_SIZE },
	),
	store: { createReview, updateReview },
};

export const fetchWorkLabels = createWorkLabelFetcher({
	getWorks: async (params) => {
		const response = await cachedOpenAlex.client.works.getWorks(params);
		return {
			results: response.results.map((work) => ({
				id: work.id,
				display_name: work.display_name,
				publication_year: work.publication_year ?? null,
			})),
		};
	},
});

export const reviewsDeps: ReviewsDeps = {
	listReviews,
	startReview: async (input) => startReview(input, reviewServiceDeps),
};

export const reviewSessionDeps: ReviewSessionDeps = {
	fetcher: reviewServiceDeps.fetcher,
	fetchLabels: fetchWorkLabels,
	store: { getReview, setDecision, updateReview },
};
