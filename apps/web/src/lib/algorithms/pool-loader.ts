/**
 * Review pool loader: turns a review's Boolean query and seeds into the pool the screening and composition engines run over. The OpenAlex access is an injected port (PoolFetcher), keeping this module free of network and storage imports so the whole flow tests offline and any transport can back it.
 */

import type { PoolWork } from "./screening-engine";

/**
 * The minimal work shape the pool needs from OpenAlex.
 */
export interface FetchedWork {
	readonly id: string;
	readonly referenced_works: readonly string[];
}

export interface PoolFetcher {
	/**
	 * Works matching a Boolean query, with their reference lists.
	 */
	readonly search: (query: string) => Promise<readonly FetchedWork[]>;
	/**
	 * Works by id, with their reference lists.
	 */
	readonly byIds: (ids: readonly string[]) => Promise<readonly FetchedWork[]>;
}

export interface ReviewPoolInput {
	readonly query: string;
	readonly seeds: readonly string[];
}

const toPoolWork = (fetched: FetchedWork): PoolWork => ({
	id: fetched.id,
	references: fetched.referenced_works,
});

/**
 * Loads the pool: query results first, then any seed the query missed, each work once, in first-seen order. A review with neither a query nor seeds has nothing to screen and is rejected.
 */
export const loadReviewPool = async (
	input: ReviewPoolInput,
	fetcher: PoolFetcher,
): Promise<readonly PoolWork[]> => {
	const query = input.query.trim();
	if (query === "" && input.seeds.length === 0) {
		throw new Error("a review pool needs a query or seeds");
	}
	const byId = new Map<string, PoolWork>();
	if (query !== "") {
		for (const fetched of await fetcher.search(query)) {
			if (!byId.has(fetched.id)) byId.set(fetched.id, toPoolWork(fetched));
		}
	}
	const missingSeeds = input.seeds.filter((seed) => !byId.has(seed));
	if (missingSeeds.length > 0) {
		for (const fetched of await fetcher.byIds(missingSeeds)) {
			if (!byId.has(fetched.id)) byId.set(fetched.id, toPoolWork(fetched));
		}
	}
	return [...byId.values()];
};
