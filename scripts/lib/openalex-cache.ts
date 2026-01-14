/**
 * System-wide per-request cache for OpenAlex API responses.
 *
 * Features:
 * - Simple JSON file storage (one file per unique request)
 * - Request URLs normalized by sorting query parameters
 * - Hash-based filenames for cache lookup
 * - XDG-compliant cache directory
 * - TTL (time-to-live) support via file modification time
 *
 * @module lib/openalex-cache
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { readFile, writeFile, unlink, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Default cache TTL in milliseconds (7 days).
 */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cache configuration options.
 */
export interface CacheConfig {
  /**
   * Custom cache directory. If not specified, uses XDG cache directory.
   */
  cacheDir?: string;

  /**
   * Time-to-live for cached entries in milliseconds.
   * @default 604800000 (7 days)
   */
  ttlMs?: number;

  /**
   * Whether to automatically prune expired entries on startup.
   * @default true
   */
  autoPrune?: boolean;
}

/**
 * Statistics about cache usage.
 */
export interface CacheStats {
  /** Total number of cached requests */
  totalRequests: number;
  /** Number of expired entries (pending pruning) */
  expiredEntries: number;
  /** Total cache size in bytes */
  totalSizeBytes: number;
}

/**
 * Stored response format in JSON files.
 */
interface StoredResponse {
  /** Original request URL */
  url: string;
  /** Normalized URL used for hashing */
  normalizedUrl: string;
  /** Response data */
  data: unknown;
  /** Timestamp when cached */
  cachedAt: number;
}

/**
 * Get the default cache directory using system temp directory.
 *
 * Uses os.tmpdir() which is automatically managed by the OS:
 * - macOS: /var/folders/.../T/bibgraph-openalex (auto-cleaned periodically)
 * - Linux: /tmp/bibgraph-openalex (typically cleaned on reboot)
 *
 * This ensures the cache doesn't accumulate indefinitely.
 */
function getDefaultCacheDir(): string {
  return join(tmpdir(), 'bibgraph-openalex');
}

/**
 * Normalize a URL by sorting its query parameters lexically.
 *
 * @param url - The URL to normalize
 * @returns Normalized URL with sorted query parameters
 *
 * @example
 * normalizeUrl('https://api.openalex.org/works?select=id&filter=author:A123')
 * // => 'https://api.openalex.org/works?filter=author:A123&select=id'
 */
export function normalizeUrl(url: string): string {
  const parsed = new URL(url);

  // Sort query parameters lexically
  const params = Array.from(parsed.searchParams.entries());
  params.sort((a, b) => {
    // First compare by key
    const keyCompare = a[0].localeCompare(b[0]);
    if (keyCompare !== 0) return keyCompare;
    // Then by value if keys are equal
    return a[1].localeCompare(b[1]);
  });

  // Rebuild URL with sorted params
  parsed.search = '';
  for (const [key, value] of params) {
    parsed.searchParams.append(key, value);
  }

  return parsed.toString();
}

/**
 * Generate a hash-based filename for a URL.
 *
 * @param url - The URL to hash (should be normalized first)
 * @returns A filename based on the URL hash
 */
export function getHashFilename(url: string): string {
  const hash = createHash('sha256').update(url).digest('hex');
  // Use first 16 chars of hash (64 bits) - collision probability negligible
  return `${hash.substring(0, 16)}.json`;
}

/**
 * System-wide cache for OpenAlex API responses.
 *
 * Uses individual JSON files for each unique request.
 * Request URLs are normalized by sorting query parameters,
 * then hashed to create the cache filename.
 *
 * @example
 * ```typescript
 * const cache = new OpenAlexCache();
 *
 * // Store a response
 * await cache.set('https://api.openalex.org/works/W123?select=id,title', {
 *   id: 'https://openalex.org/W123',
 *   title: 'Example Work'
 * });
 *
 * // Retrieve a response (query param order doesn't matter)
 * const data = await cache.get('https://api.openalex.org/works/W123?select=title,id');
 *
 * // Check if cached
 * if (await cache.has(url)) { ... }
 * ```
 */
export class OpenAlexCache {
  private ttlMs: number;
  private cacheDir: string;

  constructor(config: CacheConfig = {}) {
    this.cacheDir = config.cacheDir ?? getDefaultCacheDir();
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    // Auto-prune expired entries on startup
    if (config.autoPrune !== false) {
      this.pruneExpiredSync();
    }
  }

  /**
   * Get a cached response.
   *
   * @param url - Request URL
   * @returns The cached response data, or null if not found or expired
   */
  async get(url: string): Promise<unknown | null> {
    const normalizedUrl = normalizeUrl(url);
    const filename = getHashFilename(normalizedUrl);
    const filePath = join(this.cacheDir, filename);

    try {
      const fileStat = await stat(filePath);
      const now = Date.now();

      // Check if expired
      if (now - fileStat.mtimeMs > this.ttlMs) {
        await unlink(filePath);
        return null;
      }

      const content = await readFile(filePath, 'utf-8');
      const stored: StoredResponse = JSON.parse(content);

      return stored.data;
    } catch {
      return null;
    }
  }

  /**
   * Get a cached response synchronously.
   *
   * @param url - Request URL
   * @returns The cached response data, or null if not found or expired
   */
  getSync(url: string): unknown | null {
    const normalizedUrl = normalizeUrl(url);
    const filename = getHashFilename(normalizedUrl);
    const filePath = join(this.cacheDir, filename);

    try {
      const fileStat = statSync(filePath);
      const now = Date.now();

      // Check if expired
      if (now - fileStat.mtimeMs > this.ttlMs) {
        rmSync(filePath);
        return null;
      }

      const content = require('fs').readFileSync(filePath, 'utf-8');
      const stored: StoredResponse = JSON.parse(content);

      return stored.data;
    } catch {
      return null;
    }
  }

  /**
   * Store a response in the cache.
   *
   * @param url - Request URL
   * @param data - Response data to cache
   */
  async set(url: string, data: unknown): Promise<void> {
    const normalizedUrl = normalizeUrl(url);
    const filename = getHashFilename(normalizedUrl);
    const filePath = join(this.cacheDir, filename);

    const stored: StoredResponse = {
      url,
      normalizedUrl,
      data,
      cachedAt: Date.now(),
    };

    await writeFile(filePath, JSON.stringify(stored, null, 2), 'utf-8');
  }

  /**
   * Store a response synchronously.
   *
   * @param url - Request URL
   * @param data - Response data to cache
   */
  setSync(url: string, data: unknown): void {
    const normalizedUrl = normalizeUrl(url);
    const filename = getHashFilename(normalizedUrl);
    const filePath = join(this.cacheDir, filename);

    const stored: StoredResponse = {
      url,
      normalizedUrl,
      data,
      cachedAt: Date.now(),
    };

    require('fs').writeFileSync(filePath, JSON.stringify(stored, null, 2), 'utf-8');
  }

  /**
   * Check if a response is cached (and not expired).
   *
   * @param url - Request URL
   * @returns true if the response is cached and not expired
   */
  async has(url: string): Promise<boolean> {
    const data = await this.get(url);
    return data !== null;
  }

  /**
   * Check if a response is cached synchronously.
   *
   * @param url - Request URL
   * @returns true if the response is cached and not expired
   */
  hasSync(url: string): boolean {
    const data = this.getSync(url);
    return data !== null;
  }

  /**
   * Remove expired entries from the cache (synchronous).
   *
   * @returns Number of entries pruned
   */
  pruneExpiredSync(): number {
    const now = Date.now();
    let pruned = 0;

    try {
      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(this.cacheDir, file);
        try {
          const fileStat = statSync(filePath);
          if (now - fileStat.mtimeMs > this.ttlMs) {
            rmSync(filePath);
            pruned++;
          }
        } catch {
          // Skip files that can't be accessed
        }
      }
    } catch {
      // Cache directory doesn't exist
    }

    return pruned;
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    try {
      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          rmSync(join(this.cacheDir, file));
        }
      }
    } catch {
      // Cache directory doesn't exist
    }
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const now = Date.now();
    let totalRequests = 0;
    let expiredEntries = 0;
    let totalSizeBytes = 0;

    try {
      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(this.cacheDir, file);
        try {
          const fileStat = statSync(filePath);
          totalSizeBytes += fileStat.size;

          if (now - fileStat.mtimeMs > this.ttlMs) {
            expiredEntries++;
          }

          totalRequests++;
        } catch {
          // Skip files that can't be accessed
        }
      }
    } catch {
      // Cache directory doesn't exist
    }

    return {
      totalRequests,
      expiredEntries,
      totalSizeBytes,
    };
  }

  /**
   * Get the cache directory path.
   */
  getCacheDir(): string {
    return this.cacheDir;
  }
}

/**
 * Get the default cache instance.
 * Uses a singleton pattern for convenience.
 */
let defaultCache: OpenAlexCache | null = null;

export function getDefaultCache(config?: CacheConfig): OpenAlexCache {
  if (!defaultCache) {
    defaultCache = new OpenAlexCache(config);
  }
  return defaultCache;
}

/**
 * Reset the default cache instance.
 */
export function resetDefaultCache(): void {
  defaultCache = null;
}
