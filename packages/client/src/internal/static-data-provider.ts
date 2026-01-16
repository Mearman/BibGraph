/**
 * Static data provider for OpenAlex client
 * Implements multi-tier caching with environment detection and automatic fallback
 *
 * Refactored to use extracted cache tier modules for improved maintainability
 */

import { logger } from "@bibgraph/utils";

import type { StaticEntityType } from "./static-data-utils";
import type { CacheTierInterface } from "./cache-tiers-types";

// Import extracted cache tiers
import {
	GitHubPagesCacheTier,
	IndexedDBCacheTier,
	LocalDiskCacheTier,
	MemoryCacheTier,
} from "./cache/tiers";

// Define and export types and enums
export interface StaticDataResult {
	found: boolean;
	data?: unknown;
	cacheHit?: boolean;
	tier?: CacheTier;
	loadTime?: number;
}

export interface CacheStatistics {
	totalRequests: number;
	hits: number;
	misses: number;
	hitRate: number;
	tierStats: Record<
		CacheTier,
		{
			requests: number;
			hits: number;
			averageLoadTime: number;
		}
	>;
	bandwidthSaved: number;
	lastUpdated: number;
}

export enum CacheTier {
	MEMORY = "memory",
	INDEXED_DB = "indexed_db",
	LOCAL_DISK = "local_disk",
	GITHUB_PAGES = "github_pages",
	API = "api",
}

export enum Environment {
	BROWSER = "browser",
	NODE = "node",
	WORKER = "worker",
}

export interface EnvironmentInfo {
	isDevelopment: boolean;
	isProduction: boolean;
	isTest: boolean;
}

/**
 * Cached entity entry for enumeration
 */
export interface CachedEntityEntry {
	entityType: StaticEntityType;
	entityId: string;
	cachedAt: number;
	lastAccessedAt: number;
	accessCount: number;
	dataSize: number;
}

/**
 * Multi-tier static data provider with automatic fallback and environment detection
 */
class StaticDataProvider {
	private readonly LOG_PREFIX = "static-cache";

	private memoryCacheTier: MemoryCacheTier;
	private indexedDBCacheTier: IndexedDBCacheTier;
	private localDiskCacheTier: LocalDiskCacheTier;
	private gitHubPagesCacheTier: GitHubPagesCacheTier;
	private environment: Environment;
	private globalStats!: CacheStatistics;

	constructor() {
		this.memoryCacheTier = new MemoryCacheTier();
		this.indexedDBCacheTier = new IndexedDBCacheTier();
		this.localDiskCacheTier = new LocalDiskCacheTier();
		this.gitHubPagesCacheTier = new GitHubPagesCacheTier();
		this.environment = this.detectEnvironment();
		this.initializeStats();
	}

	configure(config: { gitHubPagesBaseUrl?: string }) {
		if (config.gitHubPagesBaseUrl) {
			// Re-create the GitHub Pages tier with new URL
			this.gitHubPagesCacheTier = new GitHubPagesCacheTier(
				config.gitHubPagesBaseUrl,
			);
		}
	}

	private initializeStats() {
		this.globalStats = {
			totalRequests: 0,
			hits: 0,
			misses: 0,
			hitRate: 0,
			tierStats: {
				[CacheTier.MEMORY]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.INDEXED_DB]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.LOCAL_DISK]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.GITHUB_PAGES]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.API]: { requests: 0, hits: 0, averageLoadTime: 0 },
			},
			bandwidthSaved: 0,
			lastUpdated: Date.now(),
		};
	}

	private detectEnvironment(): Environment {
		if (typeof globalThis !== "undefined" && "window" in globalThis) {
			return Environment.BROWSER;
		}
		if (
			typeof globalThis !== "undefined" &&
			"WorkerGlobalScope" in globalThis
		) {
			return Environment.WORKER;
		}
		return Environment.NODE;
	}

	private getAvailableTiers(): CacheTierInterface[] {
		const tiers: CacheTierInterface[] = [this.memoryCacheTier];

		// Add IndexedDB tier for browser/worker environments (persistent local cache)
		if (
			this.environment === Environment.BROWSER ||
			this.environment === Environment.WORKER
		) {
			tiers.push(this.indexedDBCacheTier);
		}

		// Add local disk tier for Node.js environment
		if (this.environment === Environment.NODE) {
			tiers.push(this.localDiskCacheTier);
		}

		// Add GitHub Pages tier for all environments
		tiers.push(this.gitHubPagesCacheTier);

		return tiers;
	}

	private updateGlobalStats(
		tier: CacheTier,
		hit: boolean,
		loadTime: number,
	): void {
		this.globalStats.totalRequests++;
		this.globalStats.tierStats[tier].requests++;

		if (hit) {
			this.globalStats.hits++;
			this.globalStats.tierStats[tier].hits++;
		} else {
			this.globalStats.misses++;
		}

		this.globalStats.tierStats[tier].averageLoadTime =
			(this.globalStats.tierStats[tier].averageLoadTime *
				(this.globalStats.tierStats[tier].requests - 1) +
				loadTime) /
			this.globalStats.tierStats[tier].requests;

		this.globalStats.hitRate =
			this.globalStats.hits / this.globalStats.totalRequests;
		this.globalStats.lastUpdated = Date.now();

		// Estimate bandwidth saved (approximate 50KB per entity)
		if (hit) {
			this.globalStats.bandwidthSaved += 50_000;
		}
	}

	async getStaticData(
		entityType: StaticEntityType,
		id: string,
	): Promise<StaticDataResult> {
		const startTime = Date.now();
		const tiers = this.getAvailableTiers();

		// Try each tier in order
		for (const tier of tiers) {
			try {
				const result = await tier.get(entityType, id);
				const loadTime = Date.now() - startTime;

				if (result.found) {
					// Cache the result in higher-priority tiers
					await this.promoteToHigherTiers(entityType, id, result.data, tier);

					this.updateGlobalStats(
						result.tier ?? CacheTier.MEMORY,
						true,
						loadTime,
					);
					return result;
				}
			} catch (error: unknown) {
				logger.debug(this.LOG_PREFIX, "Cache tier error", {
					tier: tier.constructor.name,
					error,
				});
			}
		}

		const loadTime = Date.now() - startTime;
		this.updateGlobalStats(CacheTier.API, false, loadTime);
		return { found: false };
	}

	private async promoteToHigherTiers(
		entityType: StaticEntityType,
		id: string,
		data: unknown,
		sourceTier: CacheTierInterface,
	): Promise<void> {
		const tiers = this.getAvailableTiers();
		const sourceTierIndex = tiers.indexOf(sourceTier);

		// Promote to all higher-priority tiers
		for (let i = 0; i < sourceTierIndex; i++) {
			const tier = tiers[i];
			if (tier.set) {
				try {
					await tier.set(entityType, id, data);
				} catch (error: unknown) {
					logger.debug(this.LOG_PREFIX, "Failed to promote to higher tier", {
						tier: tier.constructor.name,
						error,
					});
				}
			}
		}
	}

	async hasStaticData(
		entityType: StaticEntityType,
		id: string,
	): Promise<boolean> {
		const tiers = this.getAvailableTiers();

		for (const tier of tiers) {
			try {
				if (await tier.has(entityType, id)) {
					return true;
				}
			} catch (error: unknown) {
				logger.debug(this.LOG_PREFIX, "Cache tier has() error", {
					tier: tier.constructor.name,
					error,
				});
			}
		}

		return false;
	}

	async getCacheStatistics(): Promise<CacheStatistics> {
		// Update individual tier stats
		const cacheTiers: Array<[CacheTier, CacheTierInterface]> = [
			[CacheTier.MEMORY, this.memoryCacheTier],
			[CacheTier.INDEXED_DB, this.indexedDBCacheTier],
			[CacheTier.LOCAL_DISK, this.localDiskCacheTier],
			[CacheTier.GITHUB_PAGES, this.gitHubPagesCacheTier],
		];
		for (const [tier, tierInterface] of cacheTiers) {
			try {
				const stats = await tierInterface.getStats();
				this.globalStats.tierStats[tier] = stats;
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				logger.debug(this.LOG_PREFIX, "Failed to get tier stats", {
					tier,
					error: errorMessage,
				});
			}
		}

		return { ...this.globalStats };
	}

	async clearCache(): Promise<void> {
		const tiers = this.getAvailableTiers();

		for (const tier of tiers) {
			if (tier.clear) {
				try {
					await tier.clear();
				} catch (error: unknown) {
					logger.warn(this.LOG_PREFIX, "Failed to clear cache tier", {
						tier: tier.constructor.name,
						error,
					});
				}
			}
		}

		// Reset global stats
		this.globalStats = {
			totalRequests: 0,
			hits: 0,
			misses: 0,
			hitRate: 0,
			tierStats: {
				[CacheTier.MEMORY]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.INDEXED_DB]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.LOCAL_DISK]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.GITHUB_PAGES]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.API]: { requests: 0, hits: 0, averageLoadTime: 0 },
			},
			bandwidthSaved: 0,
			lastUpdated: Date.now(),
		};
	}

	getEnvironment(): Environment {
		return this.environment;
	}

	/**
	 * Get detailed IndexedDB cache statistics
	 */
	async getIndexedDBStats() {
		return this.indexedDBCacheTier.getDetailedStats();
	}

	/**
	 * Cleanup expired entries from IndexedDB cache
	 */
	async cleanupIndexedDB(): Promise<number> {
		return this.indexedDBCacheTier.cleanup();
	}

	/**
	 * Clear IndexedDB cache entries by entity type
	 */
	async clearIndexedDBByType(entityType: StaticEntityType): Promise<number> {
		return this.indexedDBCacheTier.clearByType(entityType);
	}

	/**
	 * Get access to the IndexedDB cache tier for advanced operations
	 */
	getIndexedDBCacheTier(): IndexedDBCacheTier {
		return this.indexedDBCacheTier;
	}

	getEnvironmentInfo(): EnvironmentInfo {
		const isTest = Boolean(
			globalThis.process?.env?.VITEST ??
				globalThis.process?.env?.NODE_ENV === "test",
		);
		const isDevelopment = Boolean(
			globalThis.process?.env?.NODE_ENV === "development" ||
				(!globalThis.process?.env?.NODE_ENV && !isTest),
		);
		const isProduction = Boolean(
			globalThis.process?.env?.NODE_ENV === "production",
		);

		return {
			isDevelopment,
			isProduction,
			isTest,
		};
	}

	/**
	 * Set static data in the cache (memory and IndexedDB tiers)
	 * Used to cache API results for future lookups
	 */
	async setStaticData(
		entityType: StaticEntityType,
		id: string,
		data: unknown,
	): Promise<void> {
		// Cache in memory tier
		try {
			await this.memoryCacheTier.set(entityType, id, data);
		} catch (error: unknown) {
			logger.debug(this.LOG_PREFIX, "Failed to cache in memory tier", {
				entityType,
				id,
				error,
			});
		}

		// Cache in IndexedDB tier for persistence
		if (
			this.environment === Environment.BROWSER ||
			this.environment === Environment.WORKER
		) {
			try {
				await this.indexedDBCacheTier.set(entityType, id, data);
			} catch (error: unknown) {
				logger.debug(this.LOG_PREFIX, "Failed to cache in IndexedDB tier", {
					entityType,
					id,
					error,
				});
			}
		}

		// Cache in local disk tier for Node.js environment
		if (this.environment === Environment.NODE) {
			try {
				await this.localDiskCacheTier.set(entityType, id, data);
			} catch (error: unknown) {
				logger.debug(this.LOG_PREFIX, "Failed to cache in local disk tier", {
					entityType,
					id,
					error,
				});
			}
		}

		logger.debug(this.LOG_PREFIX, "Cached entity data", {
			entityType,
			id,
			environment: this.environment,
		});
	}

	/**
	 * Enumerate all entities in the memory cache
	 */
	enumerateMemoryCacheEntities(): CachedEntityEntry[] {
		return this.memoryCacheTier.enumerateEntities();
	}

	/**
	 * Enumerate all entities in the IndexedDB cache
	 */
	async enumerateIndexedDBEntities(): Promise<CachedEntityEntry[]> {
		return this.indexedDBCacheTier.enumerateEntities();
	}

	/**
	 * Get memory cache size
	 */
	getMemoryCacheSize(): number {
		return this.memoryCacheTier.getSize();
	}

	/**
	 * Get all cache tier entity counts for display
	 */
	async getCacheTierSummary(): Promise<{
		memory: { count: number; entities: CachedEntityEntry[] };
		indexedDB: { count: number; entities: CachedEntityEntry[] };
	}> {
		const memoryEntities = this.enumerateMemoryCacheEntities();
		const indexedDBEntities = await this.enumerateIndexedDBEntities();

		return {
			memory: {
				count: memoryEntities.length,
				entities: memoryEntities,
			},
			indexedDB: {
				count: indexedDBEntities.length,
				entities: indexedDBEntities,
			},
		};
	}

	/**
	 * Get static cache tier configuration for display
	 * Includes GitHub Pages URL and local static path info
	 */
	getStaticCacheTierConfig(): {
		gitHubPages: {
			url: string;
			isConfigured: boolean;
			isProduction: boolean;
			isLocalhost: boolean;
		};
		localStatic: {
			path: string;
			isAvailable: boolean;
		};
	} {
		const gitHubPagesUrl = this.gitHubPagesCacheTier.getBaseUrl();
		const isLocalhost = gitHubPagesUrl.startsWith("/");
		const isProduction = gitHubPagesUrl.includes("github.io") || gitHubPagesUrl.includes("bibgraph.com");

		return {
			gitHubPages: {
				url: gitHubPagesUrl,
				isConfigured: gitHubPagesUrl.length > 0,
				isProduction,
				isLocalhost,
			},
			localStatic: {
				path: isLocalhost ? gitHubPagesUrl : "",
				isAvailable: isLocalhost,
			},
		};
	}

	/**
	 * Enumerate available entities in the static cache by fetching index files
	 * Returns entities that are available in the static JSON cache (GitHub Pages or local)
	 */
	async enumerateStaticCacheEntities(): Promise<CachedEntityEntry[]> {
		const baseUrl = this.gitHubPagesCacheTier.getBaseUrl();
		if (!baseUrl) {
			return [];
		}

		const entries: CachedEntityEntry[] = [];
		const entityTypes: StaticEntityType[] = [
			"authors",
			"works",
			"sources",
			"institutions",
			"topics",
			"publishers",
			"funders",
			"concepts",
		];

		for (const entityType of entityTypes) {
			try {
				const indexUrl = `${baseUrl}${entityType}/index.json`;
				const response = await fetch(indexUrl, {
					method: "GET",
					headers: { Accept: "application/json" },
				});

				if (!response.ok) {
					continue;
				}

				const indexData = await response.json() as {
					lastUpdated?: string;
					files?: Record<string, {
						url?: string;
						lastRetrieved?: string;
						contentHash?: string;
					}>;
				};

				if (indexData.files) {
					for (const [entityId, fileInfo] of Object.entries(indexData.files)) {
						const lastRetrieved = fileInfo.lastRetrieved
							? new Date(fileInfo.lastRetrieved).getTime()
							: Date.now();

						entries.push({
							entityType,
							entityId,
							cachedAt: lastRetrieved,
							lastAccessedAt: lastRetrieved,
							accessCount: 0, // Static cache doesn't track access count
							dataSize: 0, // Would need to fetch to determine size
						});
					}
				}
			} catch (error) {
				logger.debug(this.LOG_PREFIX, `Failed to fetch index for ${entityType}`, { error });
			}
		}

		return entries;
	}
}

export const staticDataProvider = new StaticDataProvider();
