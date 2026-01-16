/**
 * Memory cache tier with LRU eviction
 * Fast in-memory caching with automatic size management
 */

import type { StaticEntityType } from "../../static-data-utils";
import { logger } from "@bibgraph/utils";
import type { CachedEntityEntry } from "../../static-data-provider";
import { CacheTier } from "../../static-data-provider";
import type { StaticDataResult } from "../../static-data-provider";
import type { CacheTierInterface } from "../../cache-tiers-types";

interface CacheEntry {
	data: unknown;
	timestamp: number;
	accessCount: number;
}

interface CacheStats {
	requests: number;
	hits: number;
	totalLoadTime: number;
}

/**
 * Calculate cache statistics from raw stats
 */
function calculateCacheStats(stats: CacheStats): {
	requests: number;
	hits: number;
	averageLoadTime: number;
} {
	return {
		requests: stats.requests,
		hits: stats.hits,
		averageLoadTime:
			stats.requests > 0 ? stats.totalLoadTime / stats.requests : 0,
	};
}

/**
 * Memory cache implementation with LRU eviction
 */
export class MemoryCacheTier implements CacheTierInterface {
	private cache = new Map<string, CacheEntry>();
	private maxSize = 1000;
	private stats: CacheStats = { requests: 0, hits: 0, totalLoadTime: 0 };
	private readonly LOG_PREFIX = "memory-cache";

	private getKey(entityType: StaticEntityType, id: string): string {
		return `${entityType}:${id}`;
	}

	/**
	 * Enumerate all entities in the memory cache
	 */
	enumerateEntities(): CachedEntityEntry[] {
		const entries: CachedEntityEntry[] = [];
		for (const [key, entry] of this.cache.entries()) {
			const [entityType, entityId] = key.split(":") as [
				StaticEntityType,
				string,
			];
			entries.push({
				entityType,
				entityId,
				cachedAt: entry.timestamp,
				lastAccessedAt: entry.timestamp,
				accessCount: entry.accessCount,
				dataSize: JSON.stringify(entry.data).length,
			});
		}
		return entries;
	}

	/**
	 * Get the number of entities in the cache
	 */
	getSize(): number {
		return this.cache.size;
	}

	private evictLRU(): void {
		if (this.cache.size <= this.maxSize) return;

		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		for (const [key, entry] of this.cache.entries()) {
			if (entry.timestamp < oldestTime) {
				oldestTime = entry.timestamp;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			logger.debug(this.LOG_PREFIX, "Evicted LRU entry from memory cache", {
				key: oldestKey,
			});
		}
	}

	async get(
		entityType: StaticEntityType,
		id: string,
	): Promise<StaticDataResult> {
		const startTime = Date.now();
		this.stats.requests++;

		const key = this.getKey(entityType, id);
		const entry = this.cache.get(key);

		if (entry) {
			// Update access info for LRU
			entry.timestamp = Date.now();
			entry.accessCount++;
			this.cache.set(key, entry);

			this.stats.hits++;
			const loadTime = Date.now() - startTime;
			this.stats.totalLoadTime += loadTime;

			return {
				found: true,
				data: entry.data,
				cacheHit: true,
				tier: CacheTier.MEMORY,
				loadTime,
			};
		}

		return { found: false };
	}

	async has(entityType: StaticEntityType, id: string): Promise<boolean> {
		const key = this.getKey(entityType, id);
		return this.cache.has(key);
	}

	async set(
		entityType: StaticEntityType,
		id: string,
		data: unknown,
	): Promise<void> {
		const key = this.getKey(entityType, id);
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			accessCount: 1,
		});

		this.evictLRU();
	}

	async clear(): Promise<void> {
		this.cache.clear();
		this.stats = { requests: 0, hits: 0, totalLoadTime: 0 };
	}

	async getStats(): Promise<{
		requests: number;
		hits: number;
		averageLoadTime: number;
	}> {
		return calculateCacheStats(this.stats);
	}
}
