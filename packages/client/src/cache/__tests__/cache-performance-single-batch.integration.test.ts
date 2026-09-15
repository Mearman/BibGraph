/**
 * Cache Performance Tests - Single Operation and Batch Operation Performance
 *
 * Performance tests for the static data caching system's single-item and batched read/write throughput.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { MockHighPerformanceCache } from "./cache-performance-test-helpers";
import {
  BYTES_PER_MB,
  createPerformanceTestCache,
  generateLargeDataset,
  generateTestData,
} from "./cache-performance-test-helpers";

describe("Cache Performance Tests", () => {
  let performanceCache: MockHighPerformanceCache;

  beforeEach(() => {
    performanceCache = createPerformanceTestCache();
  });

  describe("Single Operation Performance", () => {
    it("should complete read operations within performance thresholds", async () => {
      const READ_TEST_DATA_SIZE_KB = 10;
      const READ_DURATION_THRESHOLD_MS = 50;
      const testData = generateTestData(READ_TEST_DATA_SIZE_KB); // 10KB
      await performanceCache.write("perf:read-test", testData);

      const startTime = Date.now();
      const result = await performanceCache.read("perf:read-test");
      const duration = Date.now() - startTime;

      expect(result).toEqual(testData);
      expect(duration).toBeLessThan(READ_DURATION_THRESHOLD_MS); // 50ms threshold

      const metrics = performanceCache.getPerformanceMetrics();
      const readMetric = metrics.find((m) => m.operationType === "read");
      expect(readMetric).toBeDefined();
      expect(readMetric!.cacheHit).toBe(true);
    });

    it("should complete write operations within performance thresholds", async () => {
      const WRITE_TEST_DATA_SIZE_KB = 100;
      const WRITE_DURATION_THRESHOLD_MS = 100;
      const testData = generateTestData(WRITE_TEST_DATA_SIZE_KB); // 100KB

      const startTime = Date.now();
      await performanceCache.write("perf:write-test", testData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(WRITE_DURATION_THRESHOLD_MS); // 100ms threshold

      const stats = performanceCache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it("should handle very large individual items efficiently", async () => {
      const LARGE_ITEM_SIZE_KB = 1024;
      const LARGE_ITEM_WRITE_THRESHOLD_MS = 500;
      const LARGE_ITEM_READ_THRESHOLD_MS = 100;
      const largeData = generateTestData(LARGE_ITEM_SIZE_KB); // 1MB

      const startTime = Date.now();
      await performanceCache.write("perf:large-item", largeData);
      const writeTime = Date.now() - startTime;

      const readStartTime = Date.now();
      const result = await performanceCache.read("perf:large-item");
      const readTime = Date.now() - readStartTime;

      expect(result).toEqual(largeData);
      expect(writeTime).toBeLessThan(LARGE_ITEM_WRITE_THRESHOLD_MS); // 500ms for 1MB write
      expect(readTime).toBeLessThan(LARGE_ITEM_READ_THRESHOLD_MS); // 100ms for 1MB read
    });
  });

  describe("Batch Operation Performance", () => {
    it("should handle large batch reads efficiently", async () => {
      const BATCH_READ_ITEM_COUNT = 500;
      const BATCH_READ_ITEM_SIZE_KB = 5;
      const BATCH_READ_DURATION_THRESHOLD_MS = 1000;
      const BATCH_READ_MIN_HIT_RATE = 0.9;
      const dataset = generateLargeDataset(BATCH_READ_ITEM_COUNT, BATCH_READ_ITEM_SIZE_KB); // 500 items, 5KB each

      // Write the dataset
      await performanceCache.writeBatch(dataset);

      // Read the entire dataset
      const keys = [...dataset.keys()];
      const startTime = Date.now();
      const results = await performanceCache.readBatch(keys);
      const duration = Date.now() - startTime;

      expect(results.size).toBe(BATCH_READ_ITEM_COUNT);
      expect(duration).toBeLessThan(BATCH_READ_DURATION_THRESHOLD_MS); // 1 second for 500 items

      const metrics = performanceCache.getAggregatedMetrics();
      expect(metrics["batch-read"]).toBeDefined();
      expect(metrics["batch-read"].cacheHitRate).toBeGreaterThan(BATCH_READ_MIN_HIT_RATE); // >90% hit rate
    });

    it("should handle large batch writes with memory management", async () => {
      const BATCH_WRITE_ITEM_COUNT = 200;
      const BATCH_WRITE_ITEM_SIZE_KB = 10;
      const BATCH_WRITE_DURATION_THRESHOLD_MS = 2000;
      const BATCH_WRITE_MEMORY_LIMIT_MB = 10;
      const dataset = generateLargeDataset(BATCH_WRITE_ITEM_COUNT, BATCH_WRITE_ITEM_SIZE_KB); // 200 items, 10KB each

      const startTime = Date.now();
      await performanceCache.writeBatch(dataset);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(BATCH_WRITE_DURATION_THRESHOLD_MS); // 2 seconds for 2MB of data

      const stats = performanceCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(BATCH_WRITE_ITEM_COUNT);
      expect(stats.memoryUsage).toBeLessThanOrEqual(BATCH_WRITE_MEMORY_LIMIT_MB * BYTES_PER_MB); // Within 10MB limit
    });

    it("should process concurrent batch operations without blocking", async () => {
      const CONCURRENT_BATCH_ITEM_COUNT = 50;
      const CONCURRENT_BATCH_ITEM_SIZE_KB = 5;
      const CONCURRENT_BATCH_DURATION_THRESHOLD_MS = 1500;
      const CONCURRENT_BATCH_REMAINING_SIZE_LIMIT = 150;
      const datasets = [
        generateLargeDataset(CONCURRENT_BATCH_ITEM_COUNT, CONCURRENT_BATCH_ITEM_SIZE_KB),
        generateLargeDataset(CONCURRENT_BATCH_ITEM_COUNT, CONCURRENT_BATCH_ITEM_SIZE_KB),
        generateLargeDataset(CONCURRENT_BATCH_ITEM_COUNT, CONCURRENT_BATCH_ITEM_SIZE_KB),
      ];

      const startTime = Date.now();
      const promises = datasets.map(async (dataset) => {
        await performanceCache.writeBatch(dataset);
      });

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should complete all 3 batches faster than sequential processing
      expect(duration).toBeLessThan(CONCURRENT_BATCH_DURATION_THRESHOLD_MS); // 1.5 seconds for concurrent writes

      const stats = performanceCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(CONCURRENT_BATCH_REMAINING_SIZE_LIMIT); // Some may be evicted due to memory limits
    });
  });
});
