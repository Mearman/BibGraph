/**
 * Memory cache tier with LRU eviction
 * Fast in-memory caching with automatic size management
 */

import { logger } from "@bibgraph/utils";

import type { CacheTierInterface } from "../../cache-tiers-types";
import type { CachedEntityEntry , StaticDataResult } from "../../static-data-provider";
import { CacheTier } from "../../static-data-provider";
import type { StaticEntityType } from "../../static-data-utils";
import { toStaticEntityType } from "../../static-data-utils";

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

const DEFAULT_MAX_CACHE_SIZE = 1000;

/**
 * Calculate cache statistics from raw stats
 */
const calculateCacheStats = (stats: Readonly<CacheStats>): {
	requests: number;
	hits: number;
	averageLoadTime: number;
} => ({
		requests: stats.requests,
		hits: stats.hits,
		averageLoadTime:
			stats.requests > 0 ? stats.totalLoadTime / stats.requests : 0,
	});

/**
 * Memory cache implementation with LRU eviction
 */
export class MemoryCacheTier implements CacheTierInterface {
	private readonly cache = new Map<string, CacheEntry>();
	private readonly maxSize = DEFAULT_MAX_CACHE_SIZE;
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
		for (const [key, entry] of this.cache) {
			const separatorIndex = key.indexOf(":");
			if (separatorIndex === -1) continue;
			const entityType = toStaticEntityType(key.slice(0, separatorIndex));
			const entityId = key.slice(separatorIndex + 1);
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

		for (const [key, entry] of this.cache) {
			if (!(entry.timestamp < oldestTime)) {
				continue;
			}

			oldestTime = entry.timestamp;
			oldestKey = key;
		}

		if (oldestKey !== null) {
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
		await Promise.resolve();
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
		await Promise.resolve();
		const key = this.getKey(entityType, id);
		return this.cache.has(key);
	}

	async set(
		entityType: StaticEntityType,
		id: string,
		data: unknown,
	): Promise<void> {
		await Promise.resolve();
		const key = this.getKey(entityType, id);
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			accessCount: 1,
		});

		this.evictLRU();
	}

	async clear(): Promise<void> {
		await Promise.resolve();
		this.cache.clear();
		this.stats = { requests: 0, hits: 0, totalLoadTime: 0 };
	}

	async getStats(): Promise<{
		requests: number;
		hits: number;
		averageLoadTime: number;
	}> {
		await Promise.resolve();
		return calculateCacheStats(this.stats);
	}
}
