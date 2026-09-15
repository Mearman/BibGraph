/**
 * Dexie-based cache tier implementation
 * Provides persistent IndexedDB storage for the multi-tier cache system
 */

import { logger } from "@bibgraph/utils";

import type { StaticEntityType } from "../../internal/static-data-utils";
import {
  type CachedEntityRecord,
  generateCacheKey,
  getEntityCacheDB,
  isIndexedDBAvailable,
} from "./entity-cache-db";

const LOG_PREFIX = "dexie-cache";

const DEFAULT_MAX_ENTRIES = 10_000;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DEFAULT_TTL_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const DEFAULT_EVICTION_BATCH_SIZE = 100;

/**
 * Configuration for the Dexie cache tier
 */
export interface DexieCacheTierConfig {
  /**
  Maximum number of entities to store (default: 10000)
   */
  maxEntries?: number;
  /**
  Default TTL in milliseconds (default: 24 hours, null = no expiration)
   */
  defaultTtl?: number | null;
  /**
  Enable LRU eviction when max entries reached (default: true)
   */
  enableLruEviction?: boolean;
  /**
  Number of entries to evict at once during cleanup (default: 100)
   */
  evictionBatchSize?: number;
}

/**
 * Result from cache operations
 */
export interface DexieCacheResult {
  found: boolean;
  data?: unknown;
  cacheHit?: boolean;
  tier?: "indexed_db";
  loadTime?: number;
}

/**
 * Cache statistics
 */
export interface DexieCacheStats {
  requests: number;
  hits: number;
  misses: number;
  averageLoadTime: number;
  totalEntries: number;
  totalSizeBytes: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * Dexie-based cache tier for persistent browser storage
 */
export class DexieCacheTier {
  private readonly config: Required<DexieCacheTierConfig>;
  private stats = {
    requests: 0,
    hits: 0,
    misses: 0,
    totalLoadTime: 0,
  };
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: Readonly<DexieCacheTierConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? DEFAULT_MAX_ENTRIES,
      defaultTtl: config.defaultTtl ?? DEFAULT_TTL_MS,
      enableLruEviction: config.enableLruEviction ?? true,
      evictionBatchSize: config.evictionBatchSize ?? DEFAULT_EVICTION_BATCH_SIZE,
    };
  }

  /**
   * Initialize the cache tier
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.initialized;
    }

    this.initializationPromise = this.initialize();
    await this.initializationPromise;
    return this.initialized;
  }

  private async initialize(): Promise<void> {
    if (!isIndexedDBAvailable()) {
      logger.debug(LOG_PREFIX, "IndexedDB not available, Dexie cache tier disabled");
      this.initialized = false;
      return;
    }

    try {
      const database = getEntityCacheDB();
      if (!database) {
        this.initialized = false;
        return;
      }

      // Test database connectivity
      await database.entities.count();
      this.initialized = true;

      logger.debug(LOG_PREFIX, "Dexie cache tier initialized", {
        maxEntries: this.config.maxEntries,
        defaultTtl: this.config.defaultTtl,
      });
    } catch (error) {
      logger.warn(LOG_PREFIX, "Failed to initialize Dexie cache tier", { error });
      this.initialized = false;
    }
  }

  /**
   * Get an entity from the cache
   */
  async get(entityType: StaticEntityType, id: string): Promise<DexieCacheResult> {
    const startTime = Date.now();
    this.stats.requests++;

    if (!(await this.ensureInitialized())) {
      return { found: false };
    }

    const database = getEntityCacheDB();
    if (!database) {
      return { found: false };
    }

    try {
      const cacheKey = generateCacheKey(entityType, id);
      const record = await database.entities.get(cacheKey);

      if (!record) {
        this.stats.misses++;
        return { found: false };
      }

      // Check if entry has expired
      if (this.isExpired(record)) {
        // Delete expired entry
        await database.entities.delete(cacheKey);
        this.stats.misses++;
        logger.debug(LOG_PREFIX, "Cache entry expired", { entityType, id });
        return { found: false };
      }

      // Update access metadata
      await database.entities.update(cacheKey, {
        lastAccessedAt: Date.now(),
        accessCount: record.accessCount + 1,
      });

      const data: unknown = JSON.parse(record.data);
      const loadTime = Date.now() - startTime;

      this.stats.hits++;
      this.stats.totalLoadTime += loadTime;

      logger.debug(LOG_PREFIX, "Cache hit", { entityType, id, loadTime });

      return {
        found: true,
        data,
        cacheHit: true,
        tier: "indexed_db",
        loadTime,
      };
    } catch (error) {
      this.stats.misses++;
      logger.warn(LOG_PREFIX, "Error reading from Dexie cache", { entityType, id, error });
      return { found: false };
    }
  }

  /**
   * Check if an entity exists in the cache
   */
  async has(entityType: StaticEntityType, id: string): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false;
    }

    const database = getEntityCacheDB();
    if (!database) {
      return false;
    }

    try {
      const cacheKey = generateCacheKey(entityType, id);
      const record = await database.entities.get(cacheKey);

      if (!record) {
        return false;
      }

      // Check if expired
      if (this.isExpired(record)) {
        await database.entities.delete(cacheKey);
        return false;
      }

      return true;
    } catch (error) {
      logger.warn(LOG_PREFIX, "Error checking Dexie cache", { entityType, id, error });
      return false;
    }
  }

  /**
   * Store an entity in the cache
   */
  async set(entityType: StaticEntityType, id: string, data: unknown, ttl?: number): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const database = getEntityCacheDB();
    if (!database) {
      return;
    }

    try {
      const cacheKey = generateCacheKey(entityType, id);
      const serializedData = JSON.stringify(data);
      const now = Date.now();

      const record: CachedEntityRecord = {
        id: cacheKey,
        entityType,
        entityId: id,
        data: serializedData,
        cachedAt: now,
        lastAccessedAt: now,
        accessCount: 1,
        dataSize: serializedData.length,
        ttl: ttl ?? this.config.defaultTtl,
      };

      await database.entities.put(record);

      logger.debug(LOG_PREFIX, "Entity cached", {
        entityType,
        id,
        dataSize: record.dataSize,
        ttl: record.ttl,
      });

      // Check if eviction is needed
      if (this.config.enableLruEviction) {
        await this.evictIfNeeded();
      }
    } catch (error) {
      logger.warn(LOG_PREFIX, "Error writing to Dexie cache", { entityType, id, error });
    }
  }

  /**
   * Delete an entity from the cache
   */
  async delete(entityType: StaticEntityType, id: string): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false;
    }

    const database = getEntityCacheDB();
    if (!database) {
      return false;
    }

    try {
      const cacheKey = generateCacheKey(entityType, id);
      await database.entities.delete(cacheKey);
      logger.debug(LOG_PREFIX, "Entity deleted from cache", { entityType, id });
      return true;
    } catch (error) {
      logger.warn(LOG_PREFIX, "Error deleting from Dexie cache", { entityType, id, error });
      return false;
    }
  }

  /**
   * Clear all cached entities
   */
  async clear(): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const database = getEntityCacheDB();
    if (!database) {
      return;
    }

    try {
      await database.entities.clear();
      this.resetStats();
      logger.debug(LOG_PREFIX, "Cache cleared");
    } catch (error) {
      logger.warn(LOG_PREFIX, "Error clearing Dexie cache", { error });
    }
  }

  /**
   * Clear entities of a specific type
   */
  async clearByType(entityType: StaticEntityType): Promise<number> {
    if (!(await this.ensureInitialized())) {
      return 0;
    }

    const database = getEntityCacheDB();
    if (!database) {
      return 0;
    }

    try {
      const count = await database.entities.where("entityType").equals(entityType).delete();
      logger.debug(LOG_PREFIX, "Entities cleared by type", { entityType, count });
      return count;
    } catch (error) {
      logger.warn(LOG_PREFIX, "Error clearing cache by type", { entityType, error });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<DexieCacheStats> {
    const baseStats: DexieCacheStats = {
      requests: this.stats.requests,
      hits: this.stats.hits,
      misses: this.stats.misses,
      averageLoadTime:
        this.stats.requests > 0 ? this.stats.totalLoadTime / this.stats.requests : 0,
      totalEntries: 0,
      totalSizeBytes: 0,
      oldestEntry: null,
      newestEntry: null,
    };

    if (!(await this.ensureInitialized())) {
      return baseStats;
    }

    const database = getEntityCacheDB();
    if (!database) {
      return baseStats;
    }

    try {
      const entities = await database.entities.toArray();

      let totalSize = 0;
      let oldest: number | null = null;
      let newest: number | null = null;

      for (const entity of entities) {
        totalSize += entity.dataSize;

        if (oldest === null || entity.cachedAt < oldest) {
          oldest = entity.cachedAt;
        }
        if (newest === null || entity.cachedAt > newest) {
          newest = entity.cachedAt;
        }
      }

      return {
        ...baseStats,
        totalEntries: entities.length,
        totalSizeBytes: totalSize,
        oldestEntry: oldest,
        newestEntry: newest,
      };
    } catch (error) {
      logger.warn(LOG_PREFIX, "Error getting cache stats", { error });
      return baseStats;
    }
  }

  /**
   * Get simple stats for the tier interface
   */
  async getTierStats(): Promise<{
    requests: number;
    hits: number;
    averageLoadTime: number;
  }> {
    await this.ensureInitialized();
    return {
      requests: this.stats.requests,
      hits: this.stats.hits,
      averageLoadTime:
        this.stats.requests > 0 ? this.stats.totalLoadTime / this.stats.requests : 0,
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    if (!(await this.ensureInitialized())) {
      return 0;
    }

    const database = getEntityCacheDB();
    if (!database) {
      return 0;
    }

    try {
      const entities = await database.entities.toArray();

      const expiredIds: string[] = [];
      for (const entity of entities) {
        if (this.isExpired(entity)) {
          expiredIds.push(entity.id);
        }
      }

      if (expiredIds.length > 0) {
        await database.entities.bulkDelete(expiredIds);
        logger.debug(LOG_PREFIX, "Expired entries cleaned up", { count: expiredIds.length });
      }

      return expiredIds.length;
    } catch (error) {
      logger.warn(LOG_PREFIX, "Error during cache cleanup", { error });
      return 0;
    }
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(record: Readonly<CachedEntityRecord>): boolean {
    if (record.ttl === null) {
      return false;
    }
    return Date.now() - record.cachedAt > record.ttl;
  }

  /**
   * Evict LRU entries if cache exceeds max size
   */
  private async evictIfNeeded(): Promise<void> {
    const database = getEntityCacheDB();
    if (!database) {
      return;
    }

    try {
      const count = await database.entities.count();

      if (count <= this.config.maxEntries) {
        return;
      }

      // Get oldest accessed entries
      const entriesToEvict = await database.entities
        .orderBy("lastAccessedAt")
        .limit(this.config.evictionBatchSize)
        .primaryKeys();

      if (entriesToEvict.length > 0) {
        await database.entities.bulkDelete(entriesToEvict);
        logger.debug(LOG_PREFIX, "LRU eviction completed", {
          evicted: entriesToEvict.length,
          previousCount: count,
        });
      }
    } catch (error) {
      logger.warn(LOG_PREFIX, "Error during LRU eviction", { error });
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      requests: 0,
      hits: 0,
      misses: 0,
      totalLoadTime: 0,
    };
  }

  /**
   * Check if the cache tier is available
   */
  isAvailable(): boolean {
    return isIndexedDBAvailable();
  }
}

/**
 * Create a singleton instance of the Dexie cache tier
 */
let dexieCacheTierInstance: DexieCacheTier | null = null;

export const getDexieCacheTier = (config?: DexieCacheTierConfig): DexieCacheTier => {
  dexieCacheTierInstance ??= new DexieCacheTier(config);
  return dexieCacheTierInstance;
};

/**
 * Reset the singleton instance (for testing)
 */
export const resetDexieCacheTier = (): void => {
  dexieCacheTierInstance = null;
};
