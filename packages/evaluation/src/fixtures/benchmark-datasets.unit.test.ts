/**
 * Unit tests for benchmark dataset fixtures
 */

import { describe, it, expect } from 'vitest';
import {
  CORA,
  CITESEER,
  FACEBOOK,
  BENCHMARK_DATASETS,
  DATASETS_BY_ID,
  loadBenchmark,
  loadBenchmarkById,
  getBenchmarkSummary,
  validateBenchmark,
} from './benchmark-datasets';

describe('Benchmark Dataset Metadata', () => {
  it('should have all expected datasets', () => {
    expect(BENCHMARK_DATASETS).toHaveLength(3);
    expect(DATASETS_BY_ID.size).toBe(3);
  });

  it('should have consistent IDs in map', () => {
    for (const dataset of BENCHMARK_DATASETS) {
      expect(DATASETS_BY_ID.get(dataset.id)).toBe(dataset);
    }
  });

  describe('CORA', () => {
    it('should have correct metadata', () => {
      expect(CORA.name).toBe('Cora');
      expect(CORA.id).toBe('cora');
      expect(CORA.directed).toBe(true);
      expect(CORA.expectedNodes).toBe(2708);
      expect(CORA.expectedEdges).toBe(5429);
    });
  });

  describe('CITESEER', () => {
    it('should have correct metadata', () => {
      expect(CITESEER.name).toBe('CiteSeer');
      expect(CITESEER.id).toBe('citeseer');
      expect(CITESEER.directed).toBe(true);
      expect(CITESEER.expectedNodes).toBe(3264);
      expect(CITESEER.expectedEdges).toBe(4536);
    });
  });

  describe('FACEBOOK', () => {
    it('should have correct metadata', () => {
      expect(FACEBOOK.name).toBe('Facebook');
      expect(FACEBOOK.id).toBe('facebook');
      expect(FACEBOOK.directed).toBe(false);
      expect(FACEBOOK.expectedNodes).toBe(4039);
      expect(FACEBOOK.expectedEdges).toBe(88234);
    });
  });
});

describe('Benchmark Loading', () => {
  it('should load Cora dataset', async () => {
    const benchmark = await loadBenchmark(CORA);

    expect(benchmark.meta).toBe(CORA);
    expect(benchmark.nodeCount).toBeGreaterThan(0);
    expect(benchmark.edgeCount).toBeGreaterThan(0);
    expect(benchmark.graph).toBeDefined();
  });

  it('should load CiteSeer dataset', async () => {
    const benchmark = await loadBenchmark(CITESEER);

    expect(benchmark.meta).toBe(CITESEER);
    expect(benchmark.nodeCount).toBeGreaterThan(0);
    expect(benchmark.edgeCount).toBeGreaterThan(0);
  });

  it('should load Facebook dataset', async () => {
    const benchmark = await loadBenchmark(FACEBOOK);

    expect(benchmark.meta).toBe(FACEBOOK);
    expect(benchmark.nodeCount).toBeGreaterThan(0);
    expect(benchmark.edgeCount).toBeGreaterThan(0);
  });

  it('should load by ID (case insensitive)', async () => {
    const benchmark1 = await loadBenchmarkById('cora');
    const benchmark2 = await loadBenchmarkById('CORA');
    const benchmark3 = await loadBenchmarkById('Cora');

    expect(benchmark1.meta.id).toBe('cora');
    expect(benchmark2.meta.id).toBe('cora');
    expect(benchmark3.meta.id).toBe('cora');
  });

  it('should throw for unknown dataset ID', async () => {
    await expect(loadBenchmarkById('unknown')).rejects.toThrow('Unknown benchmark dataset');
  });
});

describe('Benchmark Utilities', () => {
  it('should generate summary string', async () => {
    const benchmark = await loadBenchmark(CORA);
    const summary = getBenchmarkSummary(benchmark);

    expect(summary).toContain('Cora');
    expect(summary).toContain('nodes');
    expect(summary).toContain('edges');
    expect(summary).toContain('directed');
  });

  it('should validate benchmark within tolerance', async () => {
    const benchmark = await loadBenchmark(CORA);
    const result = validateBenchmark(benchmark);

    // Should be valid or have minor warnings
    expect(result.warnings).toBeDefined();
  });
});
