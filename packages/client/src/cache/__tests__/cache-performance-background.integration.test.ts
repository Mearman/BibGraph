/**
 * Cache Performance Tests - Background Operations Performance
 *
 * Performance tests verifying background sync and cleanup work never block foreground cache reads/writes.
 */

import { describe, expect, it } from "vitest";

import {
  BYTES_PER_KB,
  generateLargeDataset,
  generateTestData,
  MockHighPerformanceCache,
} from "./cache-performance-test-helpers";

describe("Cache Performance Tests", () => {
  describe("Background Operations Performance", () => {
    it("should not block foreground operations during background sync", async () => {
      const BG_SYNC_TEST_BATCH_SIZE = 10;
      const BG_SYNC_TEST_DATA_SIZE_KB = 50;
      const BG_SYNC_FOREGROUND_DURATION_THRESHOLD_MS = 50;
      const bgCache = new MockHighPerformanceCache({
        enableBackgroundSync: true,
        batchSize: BG_SYNC_TEST_BATCH_SIZE,
      });

      const testData = generateTestData(BG_SYNC_TEST_DATA_SIZE_KB);

      // Start background sync operation
      await bgCache.write("bg:test", testData);

      // Immediately perform foreground operations
      const foregroundStart = Date.now();
      const result = await bgCache.read("bg:test");
      const foregroundDuration = Date.now() - foregroundStart;

      expect(result).toEqual(testData);
      expect(foregroundDuration).toBeLessThan(BG_SYNC_FOREGROUND_DURATION_THRESHOLD_MS); // Should not be blocked

      bgCache.destroy();
    });

    it("should maintain performance during background cleanup", async () => {
      const CLEANUP_TEST_MAX_MEMORY_KB = 500;
      const CLEANUP_TEST_ITEM_COUNT = 100;
      const CLEANUP_TEST_ITEM_SIZE_KB = 8;
      const CLEANUP_TEST_ITERATIONS = 20;
      const CLEANUP_TEST_WRITE_SIZE_KB = 5;
      const CLEANUP_TEST_AVG_DURATION_THRESHOLD_MS = 100;
      const CLEANUP_TEST_MAX_DURATION_THRESHOLD_MS = 200;
      const cleanupCache = new MockHighPerformanceCache({
        maxMemoryUsage: CLEANUP_TEST_MAX_MEMORY_KB * BYTES_PER_KB, // 500KB
        enableBackgroundSync: true,
      });

      // Fill cache to trigger background cleanup
      const initialDataset = generateLargeDataset(CLEANUP_TEST_ITEM_COUNT, CLEANUP_TEST_ITEM_SIZE_KB); // 800KB total
      await cleanupCache.writeBatch(initialDataset);

      // Measure performance of subsequent operations
      const performanceMeasurements: number[] = [];

      for (let index = 0; index < CLEANUP_TEST_ITERATIONS; index++) {
        const startTime = Date.now();
        const newData = generateTestData(CLEANUP_TEST_WRITE_SIZE_KB);
        await cleanupCache.write(`cleanup:${String(index)}`, newData);
        performanceMeasurements.push(Date.now() - startTime);
      }

      // Performance should remain consistent
      const avgPerformance =
        performanceMeasurements.reduce((sum, d) => sum + d, 0) /
        performanceMeasurements.length;
      const maxPerformance = Math.max(...performanceMeasurements);

      expect(avgPerformance).toBeLessThan(CLEANUP_TEST_AVG_DURATION_THRESHOLD_MS); // <100ms average
      expect(maxPerformance).toBeLessThan(CLEANUP_TEST_MAX_DURATION_THRESHOLD_MS); // <200ms max (allowing for cleanup overhead)

      cleanupCache.destroy();
    });
  });
});
