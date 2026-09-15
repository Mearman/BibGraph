/**
 * Cache Performance Tests - Memory Management and Concurrent Access Performance
 *
 * Performance tests for the static data caching system's eviction behaviour under memory pressure and its behaviour under concurrent read/write load.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  BYTES_PER_KB,
  BYTES_PER_MB,
  createPerformanceTestCache,
  generateLargeDataset,
  MockHighPerformanceCache,
} from "./cache-performance-test-helpers";

describe("Cache Performance Tests", () => {
  let performanceCache: MockHighPerformanceCache;

  beforeEach(() => {
    performanceCache = createPerformanceTestCache();
  });

  describe("Memory Management Performance", () => {
    it("should efficiently evict entries when memory limit is reached", async () => {
      const EVICTION_TEST_MAX_MEMORY_MB = 1;
      const EVICTION_TEST_BATCH_SIZE = 10;
      const EVICTION_TEST_ITEM_COUNT = 200;
      const EVICTION_TEST_ITEM_SIZE_KB = 10;
      const maxMemory = EVICTION_TEST_MAX_MEMORY_MB * BYTES_PER_MB; // 1MB
      const limitedCache = new MockHighPerformanceCache({
        maxMemoryUsage: maxMemory,
        batchSize: EVICTION_TEST_BATCH_SIZE,
      });

      // Fill cache beyond memory limit
      const oversizedDataset = generateLargeDataset(EVICTION_TEST_ITEM_COUNT, EVICTION_TEST_ITEM_SIZE_KB); // 2MB total

      await limitedCache.writeBatch(oversizedDataset);

      const stats = limitedCache.getStats();
      expect(stats.memoryUsage).toBeLessThanOrEqual(maxMemory);
      expect(stats.size).toBeLessThan(EVICTION_TEST_ITEM_COUNT); // Some entries should be evicted

      limitedCache.destroy();
    });

    it("should maintain good performance during memory pressure", async () => {
      const PRESSURE_TEST_MAX_MEMORY_KB = 500;
      const PRESSURE_TEST_BATCH_SIZE = 20;
      const PRESSURE_TEST_ITERATIONS = 10;
      const PRESSURE_TEST_ITEM_COUNT = 20;
      const PRESSURE_TEST_ITEM_SIZE_KB = 5;
      const PRESSURE_TEST_HALF_SIZE = 5;
      const PRESSURE_TEST_MAX_SLOWDOWN_FACTOR = 1.5;
      const stressTestCache = new MockHighPerformanceCache({
        maxMemoryUsage: PRESSURE_TEST_MAX_MEMORY_KB * BYTES_PER_KB, // 500KB limit
        batchSize: PRESSURE_TEST_BATCH_SIZE,
      });

      const measurements: number[] = [];

      // Continuously write data to force evictions
      for (let index = 0; index < PRESSURE_TEST_ITERATIONS; index++) {
        const dataset = generateLargeDataset(PRESSURE_TEST_ITEM_COUNT, PRESSURE_TEST_ITEM_SIZE_KB); // 100KB per batch

        // Use performance.now() for consistent timing with the mock
        const startTime = performance.now();
        await stressTestCache.writeBatch(dataset);
        const endTime = performance.now();
        const duration = endTime - startTime;

        measurements.push(duration);
      }

      // Performance shouldn't degrade significantly over time
      const firstHalf = measurements.slice(0, PRESSURE_TEST_HALF_SIZE);
      const secondHalf = measurements.slice(PRESSURE_TEST_HALF_SIZE);

      const firstAvg =
        firstHalf.reduce((sum, d) => sum + d, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, d) => sum + d, 0) / secondHalf.length;

      // Second half shouldn't be more than 50% slower than first half
      expect(secondAvg).toBeLessThan(firstAvg * PRESSURE_TEST_MAX_SLOWDOWN_FACTOR);

      stressTestCache.destroy();
    });
  });

  describe("Concurrent Access Performance", () => {
    it("should handle high concurrent read load", async () => {
      const CONCURRENT_READ_DATASET_ITEM_COUNT = 100;
      const CONCURRENT_READ_DATASET_ITEM_SIZE_KB = 5;
      const CONCURRENT_READ_COUNT = 50;
      const CONCURRENT_READ_DURATION_THRESHOLD_MS = 500;
      // Populate cache with test data
      const dataset = generateLargeDataset(CONCURRENT_READ_DATASET_ITEM_COUNT, CONCURRENT_READ_DATASET_ITEM_SIZE_KB);
      await performanceCache.writeBatch(dataset);

      const keys = [...dataset.keys()];

      // Create concurrent read operations
      const startTime = Date.now();
      const readPromises = Array.from({ length: CONCURRENT_READ_COUNT }, async () => {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return performanceCache.read(randomKey);
      });

      const results = await Promise.all(readPromises);
      const duration = Date.now() - startTime;

      expect(results.filter((r) => r !== null)).toHaveLength(CONCURRENT_READ_COUNT);
      expect(duration).toBeLessThan(CONCURRENT_READ_DURATION_THRESHOLD_MS); // 500ms for 50 concurrent reads

      const metrics = performanceCache.getAggregatedMetrics();
      expect(metrics.read.cacheHitRate).toBe(1); // 100% hit rate
    });

    it("should maintain read performance during concurrent writes", async () => {
      const MIXED_DATASET_ITEM_COUNT = 50;
      const MIXED_DATASET_ITEM_SIZE_KB = 5;
      const MIXED_CONCURRENT_READ_COUNT = 25;
      const MIXED_DURATION_THRESHOLD_MS = 1000;
      // Pre-populate with read data
      const readDataset = generateLargeDataset(MIXED_DATASET_ITEM_COUNT, MIXED_DATASET_ITEM_SIZE_KB);
      await performanceCache.writeBatch(readDataset);

      const readKeys = [...readDataset.keys()];
      const writeDataset = generateLargeDataset(MIXED_DATASET_ITEM_COUNT, MIXED_DATASET_ITEM_SIZE_KB);

      // Perform concurrent reads and writes
      const startTime = Date.now();

      const readPromises = Array.from({ length: MIXED_CONCURRENT_READ_COUNT }, async () => {
        const randomKey = readKeys[Math.floor(Math.random() * readKeys.length)];
        return performanceCache.read(randomKey);
      });

      const writePromise = performanceCache.writeBatch(writeDataset);

      const [readResults] = await Promise.all([
        Promise.all(readPromises),
        writePromise,
      ]);

      const duration = Date.now() - startTime;

      expect(readResults.filter((r) => r !== null)).toHaveLength(MIXED_CONCURRENT_READ_COUNT);
      expect(duration).toBeLessThan(MIXED_DURATION_THRESHOLD_MS); // 1 second for mixed operations
    });
  });
});
