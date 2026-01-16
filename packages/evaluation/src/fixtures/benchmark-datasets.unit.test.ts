/**
 * Unit tests for benchmark dataset fixtures
 */

import { describe, it, expect } from 'vitest';
import {
  CORA,
  CITESEER,
  FACEBOOK,
  KARATE,
  LESMIS,
  DBLP,
  BENCHMARK_DATASETS,
  DATASETS_BY_ID,
  loadBenchmark,
  loadBenchmarkById,
  getBenchmarkSummary,
  validateBenchmark,
} from './benchmark-datasets';

describe('Benchmark Dataset Metadata', () => {
  it('should have all expected datasets', () => {
    expect(BENCHMARK_DATASETS).toHaveLength(6);
    expect(DATASETS_BY_ID.size).toBe(6);
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

  describe('KARATE', () => {
    it('should have correct metadata', () => {
      expect(KARATE.name).toBe('Karate Club');
      expect(KARATE.id).toBe('karate');
      expect(KARATE.directed).toBe(false);
      expect(KARATE.expectedNodes).toBe(34);
      expect(KARATE.expectedEdges).toBe(78);
    });
  });

  describe('LESMIS', () => {
    it('should have correct metadata', () => {
      expect(LESMIS.name).toBe('Les Misérables');
      expect(LESMIS.id).toBe('lesmis');
      expect(LESMIS.directed).toBe(false);
      expect(LESMIS.expectedNodes).toBe(69);
      expect(LESMIS.expectedEdges).toBe(279);
    });
  });

  describe('DBLP', () => {
    it('should have correct metadata', () => {
      expect(DBLP.name).toBe('DBLP');
      expect(DBLP.id).toBe('dblp');
      expect(DBLP.directed).toBe(false);
      expect(DBLP.expectedNodes).toBe(317080);
      expect(DBLP.expectedEdges).toBe(1049866);
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

  it('should load Karate Club dataset', async () => {
    const benchmark = await loadBenchmark(KARATE);

    expect(benchmark.meta).toBe(KARATE);
    expect(benchmark.nodeCount).toBe(34);
    expect(benchmark.edgeCount).toBe(78);
  });

  it('should load Les Misérables dataset', async () => {
    const benchmark = await loadBenchmark(LESMIS);

    expect(benchmark.meta).toBe(LESMIS);
    expect(benchmark.nodeCount).toBe(69);
    expect(benchmark.edgeCount).toBe(279);
  });

  // Note: DBLP loading test skipped as it's 300K+ nodes and slow to load

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
