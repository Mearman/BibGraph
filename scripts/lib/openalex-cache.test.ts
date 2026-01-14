/**
 * Tests for the OpenAlex per-request cache module.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  OpenAlexCache,
  normalizeUrl,
  getHashFilename,
  getDefaultCache,
  resetDefaultCache,
} from './openalex-cache';

describe('normalizeUrl', () => {
  it('sorts query parameters alphabetically by key', () => {
    const url = 'https://api.openalex.org/works?select=id&filter=author:A123';
    const normalized = normalizeUrl(url);

    expect(normalized).toBe(
      'https://api.openalex.org/works?filter=author%3AA123&select=id'
    );
  });

  it('handles URLs with no query parameters', () => {
    const url = 'https://api.openalex.org/works/W123456789';
    const normalized = normalizeUrl(url);

    expect(normalized).toBe('https://api.openalex.org/works/W123456789');
  });

  it('handles URLs with single query parameter', () => {
    const url = 'https://api.openalex.org/works?per_page=50';
    const normalized = normalizeUrl(url);

    expect(normalized).toBe('https://api.openalex.org/works?per_page=50');
  });

  it('produces same result regardless of original parameter order', () => {
    const url1 = 'https://api.openalex.org/works?select=id&filter=author:A123&per_page=50';
    const url2 = 'https://api.openalex.org/works?per_page=50&select=id&filter=author:A123';
    const url3 = 'https://api.openalex.org/works?filter=author:A123&per_page=50&select=id';

    const normalized1 = normalizeUrl(url1);
    const normalized2 = normalizeUrl(url2);
    const normalized3 = normalizeUrl(url3);

    expect(normalized1).toBe(normalized2);
    expect(normalized2).toBe(normalized3);
  });

  it('handles duplicate keys by preserving all values', () => {
    const url = 'https://api.openalex.org/works?filter=author:A1&filter=author:A2';
    const normalized = normalizeUrl(url);

    // Both filter values should be preserved
    expect(normalized).toContain('filter=author%3AA1');
    expect(normalized).toContain('filter=author%3AA2');
  });

  it('sorts duplicate keys by value', () => {
    const url1 = 'https://api.openalex.org/works?tag=b&tag=a';
    const url2 = 'https://api.openalex.org/works?tag=a&tag=b';

    const normalized1 = normalizeUrl(url1);
    const normalized2 = normalizeUrl(url2);

    expect(normalized1).toBe(normalized2);
  });
});

describe('getHashFilename', () => {
  it('produces a 16-char hex hash with .json extension', () => {
    const url = 'https://api.openalex.org/works/W123456789';
    const filename = getHashFilename(url);

    expect(filename).toMatch(/^[a-f0-9]{16}\.json$/);
  });

  it('produces same hash for same URL', () => {
    const url = 'https://api.openalex.org/works/W123456789';

    expect(getHashFilename(url)).toBe(getHashFilename(url));
  });

  it('produces different hashes for different URLs', () => {
    const url1 = 'https://api.openalex.org/works/W123456789';
    const url2 = 'https://api.openalex.org/works/W987654321';

    expect(getHashFilename(url1)).not.toBe(getHashFilename(url2));
  });

  it('is sensitive to query parameter differences', () => {
    const url1 = 'https://api.openalex.org/works?select=id';
    const url2 = 'https://api.openalex.org/works?select=id,title';

    expect(getHashFilename(url1)).not.toBe(getHashFilename(url2));
  });
});

describe('OpenAlexCache', () => {
  let tempDir: string;
  let cache: OpenAlexCache;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'openalex-cache-test-'));
    cache = new OpenAlexCache({ cacheDir: tempDir, autoPrune: false });
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('set and get', () => {
    it('stores and retrieves data', async () => {
      const url = 'https://api.openalex.org/works/W123';
      const data = { id: 'https://openalex.org/W123', title: 'Test Work' };

      await cache.set(url, data);
      const retrieved = await cache.get(url);

      expect(retrieved).toEqual(data);
    });

    it('returns null for non-existent entries', async () => {
      const result = await cache.get('https://api.openalex.org/works/W999');

      expect(result).toBeNull();
    });

    it('matches URLs with different query param order', async () => {
      const url1 = 'https://api.openalex.org/works?select=id&filter=author:A123';
      const url2 = 'https://api.openalex.org/works?filter=author:A123&select=id';
      const data = { id: 'W123' };

      await cache.set(url1, data);
      const retrieved = await cache.get(url2);

      expect(retrieved).toEqual(data);
    });
  });

  describe('setSync and getSync', () => {
    it('stores and retrieves data synchronously', () => {
      const url = 'https://api.openalex.org/works/W456';
      const data = { id: 'https://openalex.org/W456', title: 'Sync Test' };

      cache.setSync(url, data);
      const retrieved = cache.getSync(url);

      expect(retrieved).toEqual(data);
    });

    it('returns null for non-existent entries', () => {
      const result = cache.getSync('https://api.openalex.org/works/W888');

      expect(result).toBeNull();
    });
  });

  describe('has and hasSync', () => {
    it('returns true for cached entries', async () => {
      const url = 'https://api.openalex.org/works/W789';
      await cache.set(url, { id: 'W789' });

      expect(await cache.has(url)).toBe(true);
    });

    it('returns false for missing entries', async () => {
      expect(await cache.has('https://api.openalex.org/works/W777')).toBe(false);
    });

    it('hasSync works correctly', () => {
      const url = 'https://api.openalex.org/works/W111';
      cache.setSync(url, { id: 'W111' });

      expect(cache.hasSync(url)).toBe(true);
      expect(cache.hasSync('https://api.openalex.org/works/W222')).toBe(false);
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after TTL', async () => {
      // Create cache with 1ms TTL
      const shortTtlCache = new OpenAlexCache({
        cacheDir: tempDir,
        ttlMs: 1,
        autoPrune: false,
      });

      const url = 'https://api.openalex.org/works/W999';
      await shortTtlCache.set(url, { id: 'W999' });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await shortTtlCache.get(url);
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all cached entries', async () => {
      const url1 = 'https://api.openalex.org/works/W1';
      const url2 = 'https://api.openalex.org/works/W2';

      await cache.set(url1, { id: 'W1' });
      await cache.set(url2, { id: 'W2' });

      expect(await cache.has(url1)).toBe(true);
      expect(await cache.has(url2)).toBe(true);

      cache.clear();

      expect(await cache.has(url1)).toBe(false);
      expect(await cache.has(url2)).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', async () => {
      await cache.set('https://api.openalex.org/works/W1', { id: 'W1' });
      await cache.set('https://api.openalex.org/works/W2', { id: 'W2' });
      await cache.set('https://api.openalex.org/works/W3', { id: 'W3' });

      const stats = cache.getStats();

      expect(stats.totalRequests).toBe(3);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('getCacheDir', () => {
    it('returns the cache directory path', () => {
      expect(cache.getCacheDir()).toBe(tempDir);
    });
  });
});

describe('getDefaultCache', () => {
  afterEach(() => {
    resetDefaultCache();
  });

  it('returns same instance on multiple calls', () => {
    const cache1 = getDefaultCache();
    const cache2 = getDefaultCache();

    expect(cache1).toBe(cache2);
  });

  it('can be reset', () => {
    const cache1 = getDefaultCache();
    resetDefaultCache();
    const cache2 = getDefaultCache();

    expect(cache1).not.toBe(cache2);
  });
});

describe('complex OpenAlex URLs', () => {
  let tempDir: string;
  let cache: OpenAlexCache;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'openalex-cache-complex-'));
    cache = new OpenAlexCache({ cacheDir: tempDir, autoPrune: false });
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('handles batch filter queries', async () => {
    const url =
      'https://api.openalex.org/works?filter=ids.openalex:W1|W2|W3&select=id,display_name&per_page=50';
    const data = {
      results: [
        { id: 'W1', display_name: 'Work 1' },
        { id: 'W2', display_name: 'Work 2' },
      ],
    };

    await cache.set(url, data);
    const retrieved = await cache.get(url);

    expect(retrieved).toEqual(data);
  });

  it('handles author works API URLs', async () => {
    const url =
      'https://api.openalex.org/works?filter=author.id:A5035271865&select=id,display_name,primary_location&per_page=200';
    const data = { results: [], meta: { count: 0 } };

    await cache.set(url, data);
    const retrieved = await cache.get(url);

    expect(retrieved).toEqual(data);
  });

  it('handles cursor pagination', async () => {
    const url =
      'https://api.openalex.org/works?filter=author.id:A123&cursor=abc123&per_page=200';
    const data = { results: [], meta: { next_cursor: 'def456' } };

    await cache.set(url, data);
    const retrieved = await cache.get(url);

    expect(retrieved).toEqual(data);
  });
});
