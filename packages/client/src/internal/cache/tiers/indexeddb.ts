/**
 * IndexedDB cache tier using Dexie
 * Provides persistent browser storage between Memory and GitHub Pages tiers
 */

import { logger } from "@bibgraph/utils";

import { DexieCacheTier } from "../../../cache/dexie/dexie-cache-tier";
import { isIndexedDBAvailable } from "../../../cache/dexie/entity-cache-db";
import type { CacheTierInterface } from "../../cache-tiers-types";
import type { CachedEntityEntry , StaticDataResult } from "../../static-data-provider";
import { CacheTier } from "../../static-data-provider";
import type { StaticEntityType } from "../../static-data-utils";

interface CacheStats {
	requests: number;
	hits: number;
	totalLoadTime: number;
}

/**
 * Calculate cache statistics from raw stats
 * @param stats
 */
const calculateCacheStats = (stats: CacheStats): {
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
 * IndexedDB cache implementation using Dexie
 */
export class IndexedDBCacheTier implements CacheTierInterface {
	private dexieTier: DexieCacheTier;
	private stats: CacheStats = { requests: 0, hits: 0, totalLoadTime: 0 };
	private readonly LOG_PREFIX = "indexeddb-cache";

	constructor() {
		this.dexieTier = new DexieCacheTier({
			maxEntries: 10_000,
			defaultTtl: 7 * 24 * 60 * 60 * 1000, // 7 days default TTL
			enableLruEviction: true,
			evictionBatchSize: 100,
		});
	}

	async get(
		entityType: StaticEntityType,
		id: string,
	): Promise<StaticDataResult> {
		const startTime = Date.now();
		this.stats.requests++;

		// Skip if IndexedDB not available
		if (!isIndexedDBAvailable()) {
			return { found: false };
		}

		try {
			const result = await this.dexieTier.get(entityType, id);

			if (result.found) {
				this.stats.hits++;
				const loadTime = Date.now() - startTime;
				this.stats.totalLoadTime += loadTime;

				return {
					found: true,
					data: result.data,
					cacheHit: true,
					tier: CacheTier.INDEXED_DB,
					loadTime,
				};
			}

			return { found: false };
		} catch (error: unknown) {
			logger.debug(this.LOG_PREFIX, "IndexedDB cache miss", {
				entityType,
				id,
				error,
			});
			return { found: false };
		}
	}

	async has(entityType: StaticEntityType, id: string): Promise<boolean> {
		if (!isIndexedDBAvailable()) {
			return false;
		}

		try {
			return await this.dexieTier.has(entityType, id);
		} catch {
			return false;
		}
	}

	async set(
		entityType: StaticEntityType,
		id: string,
		data: unknown,
	): Promise<void> {
		if (!isIndexedDBAvailable()) {
			return;
		}

		try {
			await this.dexieTier.set(entityType, id, data);
		} catch (error: unknown) {
			logger.warn(this.LOG_PREFIX, "Failed to write to IndexedDB cache", {
				entityType,
				id,
				error,
			});
		}
	}

	async clear(): Promise<void> {
		if (!isIndexedDBAvailable()) {
			return;
		}

		try {
			await this.dexieTier.clear();
			this.stats = { requests: 0, hits: 0, totalLoadTime: 0 };
		} catch (error: unknown) {
			logger.warn(this.LOG_PREFIX, "Failed to clear IndexedDB cache", {
				error,
			});
		}
	}

	async getStats(): Promise<{
		requests: number;
		hits: number;
		averageLoadTime: number;
	}> {
		return calculateCacheStats(this.stats);
	}

	/**
	 * Get detailed cache statistics
	 */
	async getDetailedStats() {
		return this.dexieTier.getStats();
	}

	/**
	 * Cleanup expired entries
	 */
	async cleanup(): Promise<number> {
		return this.dexieTier.cleanup();
	}

	/**
	 * Clear entities of a specific type
	 * @param entityType
	 */
	async clearByType(entityType: StaticEntityType): Promise<number> {
		return this.dexieTier.clearByType(entityType);
	}

	/**
	 * Enumerate all entities in the IndexedDB cache
	 */
	async enumerateEntities(): Promise<CachedEntityEntry[]> {
		if (!isIndexedDBAvailable()) {
			return [];
		}

		try {
			const db = await import("../../../cache/dexie/entity-cache-db").then(m => m.getEntityCacheDB());
			if (!db) {
				return [];
			}

			const records = await db.entities.toArray();
			return records.map(record => ({
				entityType: record.entityType,
				entityId: record.entityId,
				cachedAt: record.cachedAt,
				lastAccessedAt: record.lastAccessedAt,
				accessCount: record.accessCount,
				dataSize: record.dataSize,
			}));
		} catch (error) {
			logger.warn(this.LOG_PREFIX, "Failed to enumerate IndexedDB entities", { error });
			return [];
		}
	}
}
