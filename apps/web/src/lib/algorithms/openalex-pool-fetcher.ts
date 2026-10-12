/**
 * OpenAlex adapter for the review pool loader: the edge that turns the pool loader's two port calls (Boolean search, lookup by id) into OpenAlex works requests. Every id is normalised to the short W form so a seed, a pool work and a reference compare equal in the engines.
 */

import { normalizeOpenAlexId } from "@bibgraph/utils";

import type { FetchedWork, PoolFetcher } from "./pool-loader";

/**
 * OpenAlex returns at most this many results per page.
 */
export const SEARCH_PAGE_SIZE = 200;

/**
 * OpenAlex accepts at most this many OR-joined values in one filter.
 */
export const ID_LOOKUP_BATCH_SIZE = 100;

const POOL_FIELDS = ["id", "referenced_works"];

interface RawWork {
	readonly id: string;
	readonly referenced_works: readonly string[];
}

/**
 * The minimal works API the adapter needs; the cached OpenAlex client satisfies it.
 */
export interface PoolWorksApi {
	readonly getWorks: (params: {
		search?: string;
		filter?: string;
		page?: number;
		per_page?: number;
		select?: string[];
	}) => Promise<{ results: readonly RawWork[] }>;
}

export interface OpenAlexPoolFetcherOptions {
	/**
	 * Upper bound on works returned by a search, so one broad query cannot exhaust the API budget.
	 */
	readonly maxPoolSize: number;
}

const normalise = (raw: RawWork): FetchedWork => ({
	id: normalizeOpenAlexId(raw.id),
	referenced_works: raw.referenced_works.map(normalizeOpenAlexId),
});

export const createOpenAlexPoolFetcher = (
	api: PoolWorksApi,
	options: OpenAlexPoolFetcherOptions,
): PoolFetcher => ({
	search: async (query) => {
		const works: FetchedWork[] = [];
		let page = 1;
		let exhausted = false;
		while (!exhausted && works.length < options.maxPoolSize) {
			const response = await api.getWorks({ search: query, page, per_page: SEARCH_PAGE_SIZE, select: POOL_FIELDS });
			works.push(...response.results.map(normalise));
			exhausted = response.results.length < SEARCH_PAGE_SIZE;
			page++;
		}
		return works.slice(0, options.maxPoolSize);
	},
	byIds: async (ids) => {
		const works: FetchedWork[] = [];
		for (let start = 0; start < ids.length; start += ID_LOOKUP_BATCH_SIZE) {
			const batch = ids.slice(start, start + ID_LOOKUP_BATCH_SIZE);
			const response = await api.getWorks({
				filter: `openalex_id:${batch.join("|")}`,
				per_page: ID_LOOKUP_BATCH_SIZE,
				select: POOL_FIELDS,
			});
			works.push(...response.results.map(normalise));
		}
		return works;
	},
});
