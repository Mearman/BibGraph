/**
 * Static data provider for OpenAlex client
 * Implements multi-tier caching with environment detection and automatic fallback
 */

import { logger } from "@bibgraph/utils";

import { DexieCacheTier } from "../cache/dexie/dexie-cache-tier";
import { isIndexedDBAvailable } from "../cache/dexie/entity-cache-db";
import type { StaticEntityType } from "./static-data-utils";

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

interface CacheTierInterface {
  get(entityType: StaticEntityType, id: string): Promise<StaticDataResult>;
  has(entityType: StaticEntityType, id: string): Promise<boolean>;
  set?(entityType: StaticEntityType, id: string, data: unknown): Promise<void>;
  clear?(): Promise<void>;
  getStats(): Promise<{
    requests: number;
    hits: number;
    averageLoadTime: number;
  }>;
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
 * Memory cache implementation with LRU eviction
 */
class MemoryCacheTier implements CacheTierInterface {
  private cache = new Map<
    string,
    { data: unknown; timestamp: number; accessCount: number }
  >();
  private maxSize = 1000;
  private stats = { requests: 0, hits: 0, totalLoadTime: 0 };
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
      const [entityType, entityId] = key.split(":") as [StaticEntityType, string];
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

/**
 * Local disk cache implementation (Node.js only)
 */
class LocalDiskCacheTier implements CacheTierInterface {
  private stats = { requests: 0, hits: 0, totalLoadTime: 0 };
  private cacheDir = "./cache/static-data";
  private readonly LOG_PREFIX = "local-disk-cache";

  private getFilePath(entityType: StaticEntityType, id: string): string {
    // Sanitize ID for filesystem
    const sanitizedId = id.replaceAll(/[^\w-]/g, "_");
    return `${this.cacheDir}/${entityType}/${sanitizedId}.json`;
  }

  async get(
    entityType: StaticEntityType,
    id: string,
  ): Promise<StaticDataResult> {
    const startTime = Date.now();
    this.stats.requests++;

    try {
      // In browser environment, this will fail gracefully
      if (typeof globalThis !== "undefined" && "window" in globalThis) {
        return { found: false };
      }

      const filePath = this.getFilePath(entityType, id);

      // Dynamic import for Node.js fs module
      const fs = await import("node:fs");

      if (!fs.existsSync(filePath)) {
        return { found: false };
      }

      const parsedData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      // Validate that parsedData is a valid value (not null/undefined for our use case)
      if (parsedData === null || parsedData === undefined) {
        throw new Error(`Invalid JSON data in file: ${filePath}`);
      }
      

      this.stats.hits++;
      const loadTime = Date.now() - startTime;
      this.stats.totalLoadTime += loadTime;

      return {
        found: true,
        data: parsedData,
        cacheHit: true,
        tier: CacheTier.LOCAL_DISK,
        loadTime,
      };
    } catch (error: unknown) {
      logger.debug(this.LOG_PREFIX, "Local disk cache miss", {
        entityType,
        id,
        error,
      });
      return { found: false };
    }
  }

  async has(entityType: StaticEntityType, id: string): Promise<boolean> {
    try {
      if (typeof globalThis !== "undefined" && "window" in globalThis) {
        return false;
      }

      const filePath = this.getFilePath(entityType, id);
      const fs = await import("node:fs");
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  async set(
    entityType: StaticEntityType,
    id: string,
    data: unknown,
  ): Promise<void> {
    try {
      if (typeof globalThis !== "undefined" && "window" in globalThis) {
        return; // Skip in browser
      }

      const filePath = this.getFilePath(entityType, id);
      const fs = await import("node:fs");
      const path = await import("node:path");

      // Ensure directory exists
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // Write data
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error: unknown) {
      logger.warn(this.LOG_PREFIX, "Failed to write to local disk cache", {
        entityType,
        id,
        error,
      });
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof globalThis !== "undefined" && "window" in globalThis) {
        return;
      }

      const fs = await import("node:fs");
      if (fs.existsSync(this.cacheDir)) {
        fs.rmSync(this.cacheDir, { recursive: true, force: true });
      }
      this.stats = { requests: 0, hits: 0, totalLoadTime: 0 };
    } catch (error: unknown) {
      logger.warn(this.LOG_PREFIX, "Failed to clear local disk cache", {
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
}

/**
 * IndexedDB cache implementation using Dexie
 * Provides persistent browser storage between Memory and GitHub Pages tiers
 */
class IndexedDBCacheTier implements CacheTierInterface {
  private dexieTier: DexieCacheTier;
  private stats = { requests: 0, hits: 0, totalLoadTime: 0 };
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
      const db = await import("../cache/dexie/entity-cache-db").then(m => m.getEntityCacheDB());
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

/**
 * GitHub Pages cache implementation for static data
 */
class GitHubPagesCacheTier implements CacheTierInterface {
  private stats = { requests: 0, hits: 0, totalLoadTime: 0 };
  private readonly LOG_PREFIX = "github-pages-cache";
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Don't set a default URL - require explicit configuration
    // This prevents attempting to fetch from non-existent placeholder URLs
    this.baseUrl = baseUrl ?? "";
  }
  // Track recent failures per URL to avoid repeated bursts against remote
  private recentFailures: Map<
    string,
    { lastFailure: number; attempts: number; cooldownUntil?: number }
  > = new Map();
  // Configurable retry policy for remote tier
  private retryConfig = (() => {
    const isTest = Boolean(
      globalThis.process?.env?.VITEST ??
        globalThis.process?.env?.NODE_ENV === "test",
    );
    return {
      maxAttempts: 3,
      baseDelayMs: isTest ? 50 : 1000,
      maxDelayMs: isTest ? 200 : 10_000,
      jitterMs: isTest ? 0 : 500,
      cooldownMs: isTest ? 1000 : 30_000, // shorter cooldown in tests
    };
  })();

  private getUrl(entityType: StaticEntityType, id: string): string {
    // Sanitize ID for URL
    const sanitizedId = encodeURIComponent(id);
    return `${this.baseUrl}${entityType}/${sanitizedId}.json`;
  }

  /**
   * Create a typed HTTP error object
   * @param response
   */
  private createHttpError(response: Response): {
    message: string;
    status: number;
    retryAfter?: string;
  } {
    return {
      message: `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
      retryAfter: response.headers.get("Retry-After") ?? undefined,
    };
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   * @param attempt
   * @param retryAfterSec
   */
  private calculateRetryDelay(attempt: number, retryAfterSec?: number): number {
    const base = this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * this.retryConfig.jitterMs;
    return Math.min(
      (retryAfterSec ? retryAfterSec * 1000 : base) + jitter,
      this.retryConfig.maxDelayMs,
    );
  }

  /**
   * Update failure state for a URL
   * @param url
   * @param error
   */
  private updateFailureState(url: string, error: unknown): void {
    const prev = this.recentFailures.get(url) ?? {
      lastFailure: 0,
      attempts: 0,
      cooldownUntil: undefined,
    };
    const newState = {
      lastFailure: Date.now(),
      attempts: prev.attempts + 1,
      cooldownUntil: prev.cooldownUntil,
    };

    // If it's a 404, don't set cooldown
    const is404 =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as Record<string, unknown>).status === "number" &&
      (error as Record<string, unknown>).status === 404;

    if (!is404 && newState.attempts >= this.retryConfig.maxAttempts) {
      newState.cooldownUntil = Date.now() + this.retryConfig.cooldownMs;
    }

    this.recentFailures.set(url, newState);
  }

  async get(
    entityType: StaticEntityType,
    id: string,
  ): Promise<StaticDataResult> {
    const startTime = Date.now();
    this.stats.requests++;

    // Skip if no base URL configured
    if (!this.baseUrl) {
      return { found: false };
    }

    const url = this.getUrl(entityType, id);

    // If we recently hit repeated failures for this URL, respect cooldown
    const failureState = this.recentFailures.get(url);
    if (
      failureState?.cooldownUntil &&
      Date.now() < failureState.cooldownUntil
    ) {
      logger.debug(
        this.LOG_PREFIX,
        "Skipping GitHub Pages fetch due to recent failures",
        { url, entityType, id, failureState },
      );
      return { found: false };
    }

    /**
     * Handle successful fetch response
     * @param response
     */
    const handleSuccessfulResponse = async (
      response: Response,
    ): Promise<StaticDataResult> => {
      const data: unknown = await response.json();
      this.recentFailures.delete(url);

      this.stats.hits++;
      const loadTime = Date.now() - startTime;
      this.stats.totalLoadTime += loadTime;

      return {
        found: true,
        data,
        cacheHit: true,
        tier: CacheTier.GITHUB_PAGES,
        loadTime,
      };
    };

    /**
     * Handle fetch error and determine if retry is needed
     * @param error
     * @param attempt
     */
    const handleFetchError = async (
      error: unknown,
      attempt: number,
    ): Promise<StaticDataResult> => {
      logger.debug(this.LOG_PREFIX, "GitHub Pages fetch attempt failed", {
        url,
        entityType,
        id,
        attempt,
        error,
      });

      this.updateFailureState(url, error);

      // Check if it's a 404 error
      const is404 =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as Record<string, unknown>).status === "number" &&
        (error as Record<string, unknown>).status === 404;
      if (is404) {
        return { found: false };
      }

      // Retry if attempts remain
      if (attempt < this.retryConfig.maxAttempts) {
        let retryAfterSec: number | undefined;
        if (
          typeof error === "object" &&
          error !== null &&
          "retryAfter" in error
        ) {
          const errorObj = error as Record<string, unknown>;
          const retryAfter = errorObj.retryAfter;
          if (typeof retryAfter === "string") {
            retryAfterSec = Number.parseInt(retryAfter);
          }
        }

        const delay = this.calculateRetryDelay(attempt, retryAfterSec);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return attemptFetch(attempt + 1);
      }

      return { found: false };
    };

    const attemptFetch = async (attempt: number): Promise<StaticDataResult> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 10_000); // 10 second timeout

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Cache-Control": "max-age=3600", // 1 hour cache
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            return { found: false };
          }
          throw this.createHttpError(response);
        }

        return await handleSuccessfulResponse(response);
      } catch (error: unknown) {
        return await handleFetchError(error, attempt);
      }
    };

    try {
      return await attemptFetch(1);
    } catch (finalErr) {
      logger.debug(this.LOG_PREFIX, "GitHub Pages fetch final failure", {
        url,
        entityType,
        id,
        error: String(finalErr),
      });
      return { found: false };
    }
  }

  async has(entityType: StaticEntityType, id: string): Promise<boolean> {
    // Skip if no base URL configured
    if (!this.baseUrl) {
      return false;
    }

    try {
      const url = this.getUrl(entityType, id);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000); // 5 second timeout for HEAD request

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
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
   * Get the configured base URL for the GitHub Pages cache
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * Helper function to calculate cache statistics
 * @param stats
 * @param stats.requests
 * @param stats.hits
 * @param stats.totalLoadTime
 */
const calculateCacheStats = (stats: {
  requests: number;
  hits: number;
  totalLoadTime: number;
}): {
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
   * @param entityType
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
   * @param entityType
   * @param id
   * @param data
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
