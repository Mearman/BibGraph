/**
 * Pure aggregation helpers for the /cache management page (US-26). These functions have no React or storage dependencies, so the page's numbers are unit-testable without a browser.
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";

/**
 * The entity type of a cache entry (the client's static entity type)
 */
type CacheEntryType = CachedEntityEntry["entityType"];

/**
 * Per-entity-type usage derived from cache entries
 */
export interface EntityTypeCacheStats {
	entityType: CacheEntryType;
	count: number;
	totalSizeBytes: number;
	/**
	When the most recent entry of this type was written
	 */
	lastCachedAt: number;
	/**
	When the most recent entry of this type was read
	 */
	lastAccessedAt: number;
}

/**
 * Whole-cache usage derived from cache entries
 */
export interface CacheUsageSummary {
	totalEntries: number;
	totalSizeBytes: number;
	/**
	When the most recent entry was written, null for an empty cache
	 */
	lastCachedAt: number | null;
}

/**
 * Group entries by entity type, aggregating count, total size and recency. Types are sorted by descending count, then type name for determinism.
 */
export const aggregateByEntityType = (
	entries: readonly CachedEntityEntry[],
): EntityTypeCacheStats[] => {
	const byType = new Map<CacheEntryType, EntityTypeCacheStats>();

	for (const cacheEntry of entries) {
		const existing = byType.get(cacheEntry.entityType);
		if (existing) {
			existing.count += 1;
			existing.totalSizeBytes += cacheEntry.dataSize;
			existing.lastCachedAt = Math.max(existing.lastCachedAt, cacheEntry.cachedAt);
			existing.lastAccessedAt = Math.max(existing.lastAccessedAt, cacheEntry.lastAccessedAt);
		} else {
			byType.set(cacheEntry.entityType, {
				entityType: cacheEntry.entityType,
				count: 1,
				totalSizeBytes: cacheEntry.dataSize,
				lastCachedAt: cacheEntry.cachedAt,
				lastAccessedAt: cacheEntry.lastAccessedAt,
			});
		}
	}

	return [...byType.values()].sort((a, b) => {
		if (b.count !== a.count) {
			return b.count - a.count;
		}
		return a.entityType.localeCompare(b.entityType);
	});
};

/**
 * Summarise whole-cache usage: entry count, approximate byte size and the most recent write timestamp
 */
export const summariseCacheUsage = (
	entries: readonly CachedEntityEntry[],
): CacheUsageSummary => {
	if (entries.length === 0) {
		return { totalEntries: 0, totalSizeBytes: 0, lastCachedAt: null };
	}

	let totalSizeBytes = 0;
	let lastCachedAt = 0;
	for (const cacheEntry of entries) {
		totalSizeBytes += cacheEntry.dataSize;
		lastCachedAt = Math.max(lastCachedAt, cacheEntry.cachedAt);
	}

	return {
		totalEntries: entries.length,
		totalSizeBytes,
		lastCachedAt,
	};
};
