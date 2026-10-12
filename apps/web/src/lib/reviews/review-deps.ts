/**
 * Production dependencies for the review service: the cached OpenAlex client behind the pool fetcher and the Dexie review store behind the store port. This is the only module that joins the headless review engines to the network and the database; components and hooks import the ready-made dependencies from here.
 */

import { cachedOpenAlex } from "@bibgraph/client";

import { createReview, updateReview } from "@/stores/review-store";

import { createOpenAlexPoolFetcher } from "../algorithms/openalex-pool-fetcher";
import type { ReviewServiceDeps } from "../algorithms/review-service";
import { createWorkLabelFetcher } from "../algorithms/work-labels";

/**
 * Upper bound on a review's query pool. One broad query must not exhaust the API budget; a systematic-review query returning more than this is narrowed by the reviewer.
 */
export const MAX_REVIEW_POOL_SIZE = 1000;

/**
 * Seeds a zero-seeds start picks.
 */
export const ZERO_SEEDS_SELECTION_SIZE = 5;

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
