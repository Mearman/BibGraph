/**
 * Shared mocks, fixtures, and a mock high-performance cache implementation used by the cache-performance.*.integration.test.ts suites. Not a test file itself.
 */

import { vi } from "vitest";

// Mock performance measurement APIs
const MOCK_PERFORMANCE_NOW_JITTER_MS = 5;
export const MOCK_PERFORMANCE_NOW_BASE_INCREMENT_MS = 1;
let mockTime = 0;
export const performanceNowMock = vi.fn(() => {
  mockTime += Math.random() * MOCK_PERFORMANCE_NOW_JITTER_MS + MOCK_PERFORMANCE_NOW_BASE_INCREMENT_MS; // 1-6ms increment per call
  return mockTime;
});
Object.defineProperty(global, "performance", {
  value: {
    now: performanceNowMock,
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn().mockReturnValue([]),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  },
  writable: true,
});

// Mock Date.now to be consistent with performance.now
Date.now = () => mockTime;

// Mock Worker types
interface MockMessageEvent {
  data: unknown;
  origin: string;
  lastEventId?: string;
  ports: MessagePort[];
  source: MessageEventSource | ServiceWorker | null;
}

interface MockErrorEvent {
  error: Error | string;
  filename?: string;
  lineno?: number;
  colno?: number;
  message?: string;
}

// Mock Worker for background processing
const MOCK_WORKER_MESSAGE_DELAY_MS = 10;

class MockWorker {
  onmessage: ((event: MockMessageEvent) => void) | null = null;
  onerror: ((event: MockErrorEvent) => void) | null = null;

  postMessage(message: unknown): void {
    // Simulate async worker processing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: { result: "processed", original: message },
          ports: [],
          origin: "mock://test",
          lastEventId: "",
          source: null,
        });
      }
    }, MOCK_WORKER_MESSAGE_DELAY_MS);
  }

  terminate(): void {
    // Mock termination
  }
}

Object.defineProperty(global, "Worker", {
  value: MockWorker,
  writable: true,
});

// Mock cache interfaces for performance testing
interface PerformanceCacheEntry {
  data: unknown;
  size: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface PerformanceMetrics {
  operationType: "read" | "write" | "batch" | "batch-read" | "clear";
  duration: number;
  itemCount: number;
  dataSize: number;
  cacheHit: boolean;
  memoryUsage?: number;
}

export interface CachePerformanceConfig {
  maxMemoryUsage: number; // bytes
  maxResponseTime: number; // milliseconds
  batchSize: number;
  concurrencyLimit: number;
  enableCompression: boolean;
  enableBackgroundSync: boolean;
}

export interface AggregatedOperationMetrics {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  totalDataSize: number;
  avgDataSize: number;
  cacheHitRate: number;
}

const PERCENTILE_95 = 95;
const PERCENTILE_99 = 99;
const PERCENT_DIVISOR = 100;

// Byte-size unit helpers, used throughout this file's memory-limit configuration.
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

const DEFAULT_MAX_MEMORY_USAGE_MB = 50;
const DEFAULT_MAX_MEMORY_USAGE_BYTES = DEFAULT_MAX_MEMORY_USAGE_MB * BYTES_PER_MB;
const DEFAULT_MAX_RESPONSE_TIME_MS = 100;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CONCURRENCY_LIMIT = 10;
const MAX_RETAINED_METRICS = 1000;
const EVICTION_FRACTION = 0.1;

// Mock high-performance cache implementation
export class MockHighPerformanceCache {
  private readonly cache = new Map<string, PerformanceCacheEntry>();
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly config: CachePerformanceConfig;
  private backgroundWorker: Worker | null = null;

  constructor(config: Readonly<Partial<CachePerformanceConfig>> = {}) {
    this.config = {
      maxMemoryUsage: DEFAULT_MAX_MEMORY_USAGE_BYTES,
      maxResponseTime: DEFAULT_MAX_RESPONSE_TIME_MS,
      batchSize: DEFAULT_BATCH_SIZE,
      concurrencyLimit: DEFAULT_CONCURRENCY_LIMIT,
      enableCompression: false,
      enableBackgroundSync: true,
      ...config,
    };

    if (this.config.enableBackgroundSync) {
      this.initializeBackgroundWorker();
    }
  }

  async read(key: string): Promise<unknown> {
    const startTime = performance.now();

    try {
      // Yield to the microtask queue to emulate a real (async) cache backend.
      await Promise.resolve();
      const entry = this.cache.get(key);
      const duration = performance.now() - startTime;

      if (entry) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        this.recordMetric({
          operationType: "read",
          duration,
          itemCount: 1,
          dataSize: entry.size,
          cacheHit: true,
        });

        return entry.data;
      }

      this.recordMetric({
        operationType: "read",
        duration,
        itemCount: 1,
        dataSize: 0,
        cacheHit: false,
      });

      return null;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "read",
        duration,
        itemCount: 1,
        dataSize: 0,
        cacheHit: false,
      });
      throw error;
    }
  }

  async write(key: string, data: unknown): Promise<void> {
    const startTime = performance.now();

    try {
      const serializedData = JSON.stringify(data);
      const { size } = new Blob([serializedData]);

      // Check memory limits
      if (this.getCurrentMemoryUsage() + size > this.config.maxMemoryUsage) {
        await this.evictLeastRecentlyUsed();
      }

      const entry: PerformanceCacheEntry = {
        data,
        size,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      this.cache.set(key, entry);

      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "write",
        duration,
        itemCount: 1,
        dataSize: size,
        cacheHit: false,
        memoryUsage: this.getCurrentMemoryUsage(),
      });

      // Trigger background sync if enabled
      if (this.config.enableBackgroundSync && this.backgroundWorker) {
        this.backgroundWorker.postMessage({
          type: "sync",
          key,
          data: serializedData,
        });
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "write",
        duration,
        itemCount: 1,
        dataSize: 0,
        cacheHit: false,
      });
      throw error;
    }
  }

  async readBatch(keys: readonly string[]): Promise<Map<string, unknown>> {
    const startTime = performance.now();
    const results = new Map<string, unknown>();
    let totalSize = 0;
    let hitCount = 0;

    try {
      // Process in chunks to respect concurrency limits
      const chunks = this.chunkArray(keys, this.config.batchSize);

      for (const chunk of chunks) {
        // Yield to the microtask queue between chunks to emulate a real (async) cache backend.
        await Promise.resolve();
        chunk.forEach((key) => {
          const entry = this.cache.get(key);
          if (entry) {
            entry.accessCount++;
            entry.lastAccessed = Date.now();
            results.set(key, entry.data);
            totalSize += entry.size;
            hitCount++;
          }
        });
      }

      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "batch-read",
        duration,
        itemCount: keys.length,
        dataSize: totalSize,
        cacheHit: hitCount === keys.length, // All items must be found for 100% hit rate
      });

      return results;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "batch-read",
        duration,
        itemCount: keys.length,
        dataSize: 0,
        cacheHit: false,
      });
      throw error;
    }
  }

  async writeBatch(entries: Map<string, unknown>): Promise<void> {
    const startTime = performance.now();
    let totalSize = 0;

    try {
      const entriesArray = [...entries];
      const chunks = this.chunkArray(entriesArray, this.config.batchSize);

      for (const chunk of chunks) {
        const writePromises = chunk.map(async ([key, data]) => {
          await this.write(key, data);
          const entry = this.cache.get(key);
          if (entry) {
            totalSize += entry.size;
          }
        });

        // Respect concurrency limits
        await this.executeConcurrentlyWithLimit(
          writePromises,
          this.config.concurrencyLimit,
        );
      }

      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "batch",
        duration,
        itemCount: entries.size,
        dataSize: totalSize,
        cacheHit: true,
        memoryUsage: this.getCurrentMemoryUsage(),
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "batch",
        duration,
        itemCount: entries.size,
        dataSize: 0,
        cacheHit: false,
      });
      throw error;
    }
  }

  async clear(): Promise<void> {
    const startTime = performance.now();
    const itemCount = this.cache.size;

    try {
      // Yield to the microtask queue to emulate a real (async) cache backend.
      await Promise.resolve();
      this.cache.clear();

      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "clear",
        duration,
        itemCount,
        dataSize: 0,
        cacheHit: false,
        memoryUsage: 0,
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operationType: "clear",
        duration,
        itemCount,
        dataSize: 0,
        cacheHit: false,
      });
      throw error;
    }
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAggregatedMetrics(): Record<string, AggregatedOperationMetrics> {
    const groupedMetrics = this.metrics.reduce<Partial<Record<string, PerformanceMetrics[]>>>(
      (accumulator, metric) => {
        const bucket = accumulator[metric.operationType];
        if (bucket) {
          bucket.push(metric);
        } else {
          accumulator[metric.operationType] = [metric];
        }
        return accumulator;
      },
      {},
    );

    const aggregated: Record<string, AggregatedOperationMetrics> = {};

    for (const [operationType, metrics] of Object.entries(groupedMetrics)) {
      if (!metrics) {
        continue;
      }
      const durations = metrics.map((m) => m.duration);
      const dataSizes = metrics.map((m) => m.dataSize);

      aggregated[operationType] = {
        count: metrics.length,
        avgDuration:
          durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p95Duration: this.percentile(durations, PERCENTILE_95),
        p99Duration: this.percentile(durations, PERCENTILE_99),
        totalDataSize: dataSizes.reduce((sum, size) => sum + size, 0),
        avgDataSize:
          dataSizes.reduce((sum, size) => sum + size, 0) / dataSizes.length,
        cacheHitRate: metrics.filter((m) => m.cacheHit).length / metrics.length,
      };
    }

    return aggregated;
  }

  getCurrentMemoryUsage(): number {
    return [...this.cache.values()].reduce(
      (total, entry) => total + entry.size,
      0,
    );
  }

  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: this.getCurrentMemoryUsage(),
      maxMemoryUsage: this.config.maxMemoryUsage,
      memoryUtilization:
        this.getCurrentMemoryUsage() / this.config.maxMemoryUsage,
      averageEntrySize:
        this.cache.size > 0
          ? this.getCurrentMemoryUsage() / this.cache.size
          : 0,
      totalAccesses: [...this.cache.values()].reduce(
        (sum, entry) => sum + entry.accessCount,
        0,
      ),
    };
  }

  private recordMetric(metric: Readonly<PerformanceMetrics>): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics to prevent memory bloat
    if (this.metrics.length > MAX_RETAINED_METRICS) {
      this.metrics.splice(0, this.metrics.length - MAX_RETAINED_METRICS);
    }
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    // Yield to the microtask queue to emulate a real (async) cache backend.
    await Promise.resolve();
    const entries = [...this.cache];
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Remove a fraction of entries
    const toRemove = Math.ceil(entries.length * EVICTION_FRACTION);
    for (let index = 0; index < toRemove; index++) {
      this.cache.delete(entries[index][0]);
    }
  }

  private chunkArray<T>(array: readonly T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < array.length; index += chunkSize) {
      chunks.push(array.slice(index, index + chunkSize));
    }
    return chunks;
  }

  private async executeConcurrentlyWithLimit<T>(
    promises: readonly Promise<T>[],
    limit: number,
  ): Promise<T[]> {
    const results: T[] = [];

    for (let index = 0; index < promises.length; index += limit) {
      const batch = promises.slice(index, index + limit);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private percentile(values: readonly number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / PERCENT_DIVISOR) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private initializeBackgroundWorker(): void {
    try {
      this.backgroundWorker = new Worker("/cache-worker.js");

      this.backgroundWorker.onmessage = (_event) => {
        // Handle background sync results
      };
    } catch {
      // Worker not available, disable background sync
      this.config.enableBackgroundSync = false;
    }
  }

  destroy(): void {
    if (this.backgroundWorker) {
      this.backgroundWorker.terminate();
      this.backgroundWorker = null;
    }
    this.cache.clear();
    this.metrics.length = 0;
  }
}

// Test data generators
const TEST_STRING_CHUNK_SIZE = 1000;
const TEST_DATA_ID_RADIX = 36;
const TEST_DATA_ID_RANDOM_START = 2;
const TEST_DATA_ID_RANDOM_END = 11;
const DATASET_KEY_INDEX_PAD_WIDTH = 6;

export const generateTestData = (sizeKB: number) => {
  const targetSize = sizeKB * BYTES_PER_KB;
  const baseString = "A".repeat(TEST_STRING_CHUNK_SIZE); // 1KB string
  const repetitions = Math.ceil(targetSize / TEST_STRING_CHUNK_SIZE);

  return {
    id: `test-${Math.random().toString(TEST_DATA_ID_RADIX).slice(TEST_DATA_ID_RANDOM_START, TEST_DATA_ID_RANDOM_END)}`,
    content: baseString.repeat(repetitions).slice(0, Math.max(0, targetSize)),
    metadata: {
      generated: Date.now(),
      size: targetSize,
      type: "performance-test",
    },
  };
};

export const generateLargeDataset = (itemCount: number, itemSizeKB: number): Map<string, unknown> => {
  const dataset = new Map<string, unknown>();

  for (let index = 0; index < itemCount; index++) {
    const key = `large-dataset:${index.toString().padStart(DATASET_KEY_INDEX_PAD_WIDTH, "0")}`;
    const data = generateTestData(itemSizeKB);
    dataset.set(key, data);
  }

  return dataset;
};

const BEFORE_EACH_PERFORMANCE_NOW_JITTER_MS = 10;
const TEST_CACHE_MAX_MEMORY_MB = 10;
const TEST_CACHE_MAX_RESPONSE_TIME_MS = 50;
const TEST_CACHE_BATCH_SIZE = 50;
const TEST_CACHE_CONCURRENCY_LIMIT = 5;

/**
 * Resets the shared performance.now mock to realistic, monotonically-increasing timing and returns a freshly configured MockHighPerformanceCache for a test. Intended for use in each suite's own `beforeEach`.
 */
export const createPerformanceTestCache = (): MockHighPerformanceCache => {
  let currentTime = 0;
  performanceNowMock.mockImplementation(() => {
    currentTime += Math.random() * BEFORE_EACH_PERFORMANCE_NOW_JITTER_MS + MOCK_PERFORMANCE_NOW_BASE_INCREMENT_MS; // 1-11ms random increment
    return currentTime;
  });

  return new MockHighPerformanceCache({
    maxMemoryUsage: TEST_CACHE_MAX_MEMORY_MB * BYTES_PER_MB, // 10MB for testing
    maxResponseTime: TEST_CACHE_MAX_RESPONSE_TIME_MS,
    batchSize: TEST_CACHE_BATCH_SIZE,
    concurrencyLimit: TEST_CACHE_CONCURRENCY_LIMIT,
  });
};
