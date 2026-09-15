/**
 * Unit tests for cache configuration utilities Tests cache configuration constants, entity-specific settings, and utility functions
 */

import { describe, expect,it } from "vitest";

import {
  CACHE_CONFIG,
  type CacheKeyType,
  ENTITY_CACHE_TIMES,
  getCacheConfig,
} from "./cache";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_QUARTER = 90;
const DAYS_FOR_AUTHOR_RETENTION = 3;
const HOURS_FOR_AUTHOR_STALE = 12;
const HOURS_FOR_RELATED_STALE = 6;
const DEFAULT_STALE_MINUTES = 5;
const BYTES_PER_KILOBYTE = 1024;
const MAX_CACHE_SIZE_MEGABYTES = 100;
const DEFAULT_RETRY_ATTEMPTS = 3;

const ONE_MINUTE_MS = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE;
const ONE_HOUR_MS = ONE_MINUTE_MS * MINUTES_PER_HOUR;
const ONE_DAY_MS = ONE_HOUR_MS * HOURS_PER_DAY;
const ONE_WEEK_MS = ONE_DAY_MS * DAYS_PER_WEEK;
const ONE_MONTH_MS = ONE_DAY_MS * DAYS_PER_MONTH;
const ONE_QUARTER_MS = ONE_DAY_MS * DAYS_PER_QUARTER;
const TWELVE_HOURS_MS = HOURS_FOR_AUTHOR_STALE * ONE_HOUR_MS;
const THREE_DAYS_MS = DAYS_FOR_AUTHOR_RETENTION * ONE_DAY_MS;
const SIX_HOURS_MS = HOURS_FOR_RELATED_STALE * ONE_HOUR_MS;
const FIVE_MINUTES_MS = DEFAULT_STALE_MINUTES * ONE_MINUTE_MS;
const MAX_CACHE_SIZE_BYTES = MAX_CACHE_SIZE_MEGABYTES * BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;

describe("cache configuration", () => {
  describe("CACHE_CONFIG", () => {
    it("should have correct general cache configuration", () => {
      expect(CACHE_CONFIG).toEqual({
        maxAge: ONE_WEEK_MS,
        maxSize: MAX_CACHE_SIZE_BYTES,
        compressionThreshold: BYTES_PER_KILOBYTE,
        defaultRetries: DEFAULT_RETRY_ATTEMPTS,
        defaultStaleTime: FIVE_MINUTES_MS,
      });
    });

    it("should have reasonable cache size limits", () => {
      // Max age should be 7 days
      expect(CACHE_CONFIG.maxAge).toBe(ONE_WEEK_MS);

      // Max size should be 100MB
      expect(CACHE_CONFIG.maxSize).toBe(MAX_CACHE_SIZE_BYTES);

      // Compression threshold should be 1KB
      expect(CACHE_CONFIG.compressionThreshold).toBe(BYTES_PER_KILOBYTE);

      // Default retries should be reasonable
      expect(CACHE_CONFIG.defaultRetries).toBe(DEFAULT_RETRY_ATTEMPTS);

      // Default stale time should be 5 minutes
      expect(CACHE_CONFIG.defaultStaleTime).toBe(FIVE_MINUTES_MS);
    });
  });

  describe("ENTITY_CACHE_TIMES", () => {
    it("should have works cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.works).toEqual({
        stale: ONE_DAY_MS,
        gc: ONE_WEEK_MS,
      });
    });

    it("should have authors cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.authors).toEqual({
        stale: TWELVE_HOURS_MS,
        gc: THREE_DAYS_MS,
      });
    });

    it("should have sources cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.sources).toEqual({
        stale: ONE_WEEK_MS,
        gc: ONE_MONTH_MS,
      });
    });

    it("should have institutions cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.institutions).toEqual({
        stale: ONE_MONTH_MS,
        gc: ONE_QUARTER_MS,
      });
    });

    it("should have topics cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.topics).toEqual({
        stale: ONE_WEEK_MS,
        gc: ONE_MONTH_MS,
      });
    });

    it("should have publishers cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.publishers).toEqual({
        stale: ONE_MONTH_MS,
        gc: ONE_QUARTER_MS,
      });
    });

    it("should have funders cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.funders).toEqual({
        stale: ONE_MONTH_MS,
        gc: ONE_QUARTER_MS,
      });
    });

    it("should have search cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.search).toEqual({
        stale: FIVE_MINUTES_MS,
        gc: ONE_HOUR_MS,
      });
    });

    it("should have related cache configuration", () => {
      expect(ENTITY_CACHE_TIMES.related).toEqual({
        stale: SIX_HOURS_MS,
        gc: ONE_DAY_MS,
      });
    });

    it("should have appropriate cache duration hierarchy", () => {
      // Stable entities should have longer cache times
      expect(ENTITY_CACHE_TIMES.institutions.stale).toBeGreaterThan(
        ENTITY_CACHE_TIMES.authors.stale,
      );
      expect(ENTITY_CACHE_TIMES.sources.stale).toBeGreaterThan(
        ENTITY_CACHE_TIMES.authors.stale,
      );
      expect(ENTITY_CACHE_TIMES.publishers.stale).toBeGreaterThan(
        ENTITY_CACHE_TIMES.works.stale,
      );

      // Dynamic content should have shorter cache times
      expect(ENTITY_CACHE_TIMES.search.stale).toBeLessThan(
        ENTITY_CACHE_TIMES.authors.stale,
      );
      expect(ENTITY_CACHE_TIMES.related.stale).toBeLessThan(
        ENTITY_CACHE_TIMES.works.stale,
      );

      // GC times should be longer than stale times for all entities
      expect(ENTITY_CACHE_TIMES.works.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.works.stale,
      );
      expect(ENTITY_CACHE_TIMES.authors.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.authors.stale,
      );
      expect(ENTITY_CACHE_TIMES.sources.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.sources.stale,
      );
      expect(ENTITY_CACHE_TIMES.institutions.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.institutions.stale,
      );
      expect(ENTITY_CACHE_TIMES.topics.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.topics.stale,
      );
      expect(ENTITY_CACHE_TIMES.publishers.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.publishers.stale,
      );
      expect(ENTITY_CACHE_TIMES.funders.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.funders.stale,
      );
      expect(ENTITY_CACHE_TIMES.search.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.search.stale,
      );
      expect(ENTITY_CACHE_TIMES.related.gc).toBeGreaterThan(
        ENTITY_CACHE_TIMES.related.stale,
      );
    });

    it("should have all required entity types", () => {
      const requiredCacheKeys: CacheKeyType[] = [
        "works",
        "authors",
        "sources",
        "institutions",
        "topics",
        "publishers",
        "funders",
        "keywords",
        "concepts",
        "domains",
        "fields",
        "subfields",
        "search",
        "related",
      ];

      for (const cacheKey of requiredCacheKeys) {
        expect(ENTITY_CACHE_TIMES).toHaveProperty(cacheKey);
        expect(ENTITY_CACHE_TIMES[cacheKey]).toHaveProperty("stale");
        expect(ENTITY_CACHE_TIMES[cacheKey]).toHaveProperty("gc");
      }
    });

    it("should have positive cache durations", () => {
      const cacheKeys = Object.keys(ENTITY_CACHE_TIMES) as CacheKeyType[];

      for (const cacheKey of cacheKeys) {
        const config = ENTITY_CACHE_TIMES[cacheKey];
        expect(config.stale).toBeGreaterThan(0);
        expect(config.gc).toBeGreaterThan(0);
      }
    });

    it("should have reasonable time values", () => {
      // Works: 1 day stale, 7 days gc
      expect(ENTITY_CACHE_TIMES.works.stale).toBe(ONE_DAY_MS);
      expect(ENTITY_CACHE_TIMES.works.gc).toBe(ONE_WEEK_MS);

      // Authors: 12 hours stale, 3 days gc
      expect(ENTITY_CACHE_TIMES.authors.stale).toBe(TWELVE_HOURS_MS);
      expect(ENTITY_CACHE_TIMES.authors.gc).toBe(THREE_DAYS_MS);

      // Search: 5 minutes stale, 1 hour gc (most dynamic)
      expect(ENTITY_CACHE_TIMES.search.stale).toBe(FIVE_MINUTES_MS);
      expect(ENTITY_CACHE_TIMES.search.gc).toBe(ONE_HOUR_MS);

      // Institutions: 30 days stale, 90 days gc (most stable)
      expect(ENTITY_CACHE_TIMES.institutions.stale).toBe(ONE_MONTH_MS);
      expect(ENTITY_CACHE_TIMES.institutions.gc).toBe(ONE_QUARTER_MS);
    });
  });

  describe("getCacheConfig", () => {
    it("should return correct configuration for each entity type", () => {
      expect(getCacheConfig("works")).toEqual(ENTITY_CACHE_TIMES.works);
      expect(getCacheConfig("authors")).toEqual(ENTITY_CACHE_TIMES.authors);
      expect(getCacheConfig("sources")).toEqual(ENTITY_CACHE_TIMES.sources);
      expect(getCacheConfig("institutions")).toEqual(
        ENTITY_CACHE_TIMES.institutions,
      );
      expect(getCacheConfig("topics")).toEqual(ENTITY_CACHE_TIMES.topics);
      expect(getCacheConfig("publishers")).toEqual(
        ENTITY_CACHE_TIMES.publishers,
      );
      expect(getCacheConfig("funders")).toEqual(ENTITY_CACHE_TIMES.funders);
      expect(getCacheConfig("keywords")).toEqual(ENTITY_CACHE_TIMES.keywords);
      expect(getCacheConfig("concepts")).toEqual(ENTITY_CACHE_TIMES.concepts);
      expect(getCacheConfig("search")).toEqual(ENTITY_CACHE_TIMES.search);
      expect(getCacheConfig("related")).toEqual(ENTITY_CACHE_TIMES.related);
    });

    it("should return references to the original configurations", () => {
      // Should return the same object reference
      expect(getCacheConfig("works")).toBe(ENTITY_CACHE_TIMES.works);
      expect(getCacheConfig("authors")).toBe(ENTITY_CACHE_TIMES.authors);
      expect(getCacheConfig("search")).toBe(ENTITY_CACHE_TIMES.search);
    });

    it("should work with all valid cache keys", () => {
      const cacheKeys: CacheKeyType[] = [
        "works",
        "authors",
        "sources",
        "institutions",
        "topics",
        "publishers",
        "funders",
        "keywords",
        "concepts",
        "domains",
        "fields",
        "subfields",
        "search",
        "related",
      ];

      for (const cacheKey of cacheKeys) {
        const config = getCacheConfig(cacheKey);
        expect(config).toBeDefined();
        expect(config).toHaveProperty("stale");
        expect(config).toHaveProperty("gc");
        expect(typeof config.stale).toBe("number");
        expect(typeof config.gc).toBe("number");
      }
    });

    it("should maintain type safety", () => {
      // TypeScript should enforce that only valid EntityType values are passed This test ensures the function signature matches the type definition
      const workConfig = getCacheConfig("works");
      expect(workConfig.stale).toBeTypeOf("number");
      expect(workConfig.gc).toBeTypeOf("number");

      const searchConfig = getCacheConfig("search");
      expect(searchConfig.stale).toBeTypeOf("number");
      expect(searchConfig.gc).toBeTypeOf("number");
    });
  });

  describe("EntityType type", () => {
    it("should include all expected entity types", () => {
      // This test ensures the EntityType type includes all expected values
      const expectedTypes = [
        "works",
        "authors",
        "sources",
        "institutions",
        "topics",
        "publishers",
        "funders",
        "keywords",
        "concepts",
        "domains",
        "fields",
        "subfields",
        "search",
        "related",
      ];

      // Verify all expected types exist in ENTITY_CACHE_TIMES
      for (const type of expectedTypes) {
        expect(ENTITY_CACHE_TIMES).toHaveProperty(type);
      }

      // Verify the number of types matches expectations
      expect(Object.keys(ENTITY_CACHE_TIMES)).toHaveLength(
        expectedTypes.length,
      );
    });
  });
});
