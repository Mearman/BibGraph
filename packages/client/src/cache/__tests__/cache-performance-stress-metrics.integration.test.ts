/**
 * Cache Performance Tests - Stress Testing and Performance Monitoring/Metrics
 *
 * Performance tests for the static data caching system's stability under extreme mixed load and the accuracy of its own aggregated metrics.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  BYTES_PER_KB,
  BYTES_PER_MB,
  createPerformanceTestCache,
  generateLargeDataset,
  generateTestData,
  MockHighPerformanceCache,
} from "./cache-performance-test-helpers";

describe("Cache Performance Tests", () => {
  let performanceCache: MockHighPerformanceCache;

  beforeEach(() => {
    performanceCache = createPerformanceTestCache();
  });

  describe("Stress Testing", () => {
    it("should maintain stability under extreme load", async () => {
      const STRESS_MAX_MEMORY_MB = 2;
      const STRESS_BATCH_SIZE = 100;
      const STRESS_CONCURRENCY_LIMIT = 10;
      const STRESS_OPERATION_COUNT = 1000;
      const STRESS_OPERATION_MODULO = 3;
      const STRESS_WRITE_SIZE_RANDOM_RANGE_KB = 50;
      const STRESS_WRITE_SIZE_BASE_KB = 5;
      const STRESS_BATCH_ITEM_COUNT = 5;
      const STRESS_BATCH_ITEM_SIZE_KB = 5;
      const STRESS_MAX_ERROR_RATE = 0.01;
      const STRESS_AVG_DURATION_THRESHOLD_MS = 100;
      const stressCache = new MockHighPerformanceCache({
        maxMemoryUsage: STRESS_MAX_MEMORY_MB * BYTES_PER_MB, // 2MB
        batchSize: STRESS_BATCH_SIZE,
        concurrencyLimit: STRESS_CONCURRENCY_LIMIT,
      });

      const errors: Error[] = [];
      const durations: number[] = [];

      // Mix of operations under stress
      for (let index = 0; index < STRESS_OPERATION_COUNT; index++) {
        try {
          const startTime = Date.now();

          if (index % STRESS_OPERATION_MODULO === 0) {
            // Write operation
            const data = generateTestData(Math.random() * STRESS_WRITE_SIZE_RANDOM_RANGE_KB + STRESS_WRITE_SIZE_BASE_KB); // 5-55KB
            await stressCache.write(`stress:${String(index)}`, data);
          } else if (index % STRESS_OPERATION_MODULO === 1) {
            // Read operation
            await stressCache.read(`stress:${String(Math.floor(Math.random() * index))}`);
          } else {
            // Batch operation
            const smallBatch = generateLargeDataset(STRESS_BATCH_ITEM_COUNT, STRESS_BATCH_ITEM_SIZE_KB);
            await stressCache.writeBatch(smallBatch);
          }

          durations.push(Date.now() - startTime);
        } catch (error) {
          errors.push(error as Error);
        }
      }

      expect(errors.length).toBeLessThan(STRESS_OPERATION_COUNT * STRESS_MAX_ERROR_RATE); // <1% error rate

      const avgDuration =
        durations.reduce((sum, d) => sum + d, 0) / durations.length;
      expect(avgDuration).toBeLessThan(STRESS_AVG_DURATION_THRESHOLD_MS); // Average <100ms

      stressCache.destroy();
    });

    it("should recover gracefully from memory exhaustion", async () => {
      const RECOVERY_MAX_MEMORY_KB = 256;
      const RECOVERY_BATCH_SIZE = 5;
      const RECOVERY_ITEM_COUNT = 100;
      const RECOVERY_ITEM_SIZE_KB = 10;
      const RECOVERY_MAX_ERRORS = 100;
      const recoveryCache = new MockHighPerformanceCache({
        maxMemoryUsage: RECOVERY_MAX_MEMORY_KB * BYTES_PER_KB, // 256KB - very small limit
        batchSize: RECOVERY_BATCH_SIZE,
      });

      // Try to write much more data than memory allows
      const massiveDataset = generateLargeDataset(RECOVERY_ITEM_COUNT, RECOVERY_ITEM_SIZE_KB); // 1MB total

      let completed = 0;
      let errors = 0;

      for (const [key, data] of massiveDataset) {
        try {
          await recoveryCache.write(key, data);
          completed++;
        } catch {
          errors++;
        }
      }

      // Should have completed some writes and maintained stability
      expect(completed).toBeGreaterThan(0);
      expect(errors).toBeLessThan(RECOVERY_MAX_ERRORS); // Not everything should fail

      const stats = recoveryCache.getStats();
      expect(stats.memoryUsage).toBeLessThanOrEqual(RECOVERY_MAX_MEMORY_KB * BYTES_PER_KB);

      // Cache should still be functional
      await recoveryCache.read(
        [...massiveDataset.keys()][0],
      );
      // Should either have the data or return null, but not throw

      recoveryCache.destroy();
    });
  });

  describe("Performance Monitoring and Metrics", () => {
    it("should provide accurate performance metrics", async () => {
      const METRICS_TEST_ITEM_COUNT = 50;
      const METRICS_TEST_ITEM_SIZE_KB = 10;
      const METRICS_TEST_READ_SLICE_SIZE = 25;
      const METRICS_TEST_SINGLE_WRITE_SIZE_KB = 5;
      const dataset = generateLargeDataset(METRICS_TEST_ITEM_COUNT, METRICS_TEST_ITEM_SIZE_KB);

      // Perform various operations
      await performanceCache.writeBatch(dataset);

      const keys = [...dataset.keys()].slice(0, METRICS_TEST_READ_SLICE_SIZE);
      await performanceCache.readBatch(keys);

      // Some individual operations
      await performanceCache.read(keys[0]);
      await performanceCache.write("metrics:test", generateTestData(METRICS_TEST_SINGLE_WRITE_SIZE_KB));

      const aggregatedMetrics = performanceCache.getAggregatedMetrics();

      expect(aggregatedMetrics.batch).toBeDefined();
      expect(aggregatedMetrics.read).toBeDefined();
      expect(aggregatedMetrics.write).toBeDefined();

      // Verify metric accuracy
      expect(aggregatedMetrics.batch.count).toBeGreaterThan(0);
      expect(aggregatedMetrics.batch.avgDuration).toBeGreaterThan(0);
      expect(aggregatedMetrics.batch.cacheHitRate).toBeGreaterThan(0);

      expect(aggregatedMetrics.read.cacheHitRate).toBe(1); // Should be 100% for existing data
      expect(aggregatedMetrics.write.count).toBeGreaterThan(0);
    });

    it("should track memory usage accurately", async () => {
      const MEMORY_TRACKING_TEST_DATA_SIZE_KB = 100;
      const initialStats = performanceCache.getStats();
      expect(initialStats.memoryUsage).toBe(0);

      const testData = generateTestData(MEMORY_TRACKING_TEST_DATA_SIZE_KB); // 100KB
      await performanceCache.write("memory:test", testData);

      const afterWriteStats = performanceCache.getStats();
      expect(afterWriteStats.memoryUsage).toBeGreaterThan(MEMORY_TRACKING_TEST_DATA_SIZE_KB * BYTES_PER_KB); // At least 100KB
      expect(afterWriteStats.size).toBe(1);

      await performanceCache.clear();

      const afterClearStats = performanceCache.getStats();
      expect(afterClearStats.memoryUsage).toBe(0);
      expect(afterClearStats.size).toBe(0);
    });

    it("should calculate percentiles correctly for response times", async () => {
      const PERCENTILE_TEST_ITERATIONS = 100;
      const PERCENTILE_TEST_SIZE_RANDOM_RANGE_KB = 20;
      const PERCENTILE_TEST_SIZE_BASE_KB = 1;
      // Generate operations with varied response times
      for (let index = 0; index < PERCENTILE_TEST_ITERATIONS; index++) {
        const data = generateTestData(Math.random() * PERCENTILE_TEST_SIZE_RANDOM_RANGE_KB + PERCENTILE_TEST_SIZE_BASE_KB); // 1-21KB
        await performanceCache.write(`percentile:${String(index)}`, data);
      }

      const aggregatedMetrics = performanceCache.getAggregatedMetrics();
      const writeMetrics = aggregatedMetrics.write;

      expect(writeMetrics.p95Duration).toBeGreaterThanOrEqual(
        writeMetrics.avgDuration,
      );
      expect(writeMetrics.p99Duration).toBeGreaterThanOrEqual(
        writeMetrics.p95Duration,
      );
      expect(writeMetrics.maxDuration).toBeGreaterThanOrEqual(
        writeMetrics.p99Duration,
      );
      expect(writeMetrics.minDuration).toBeLessThanOrEqual(
        writeMetrics.avgDuration,
      );
    });
  });
});
