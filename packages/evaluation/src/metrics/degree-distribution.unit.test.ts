/**
 * Unit tests for degree distribution metrics
 */
import { describe, expect, it } from 'vitest';

import {
  computeDegreeDistribution,
  klDivergence,
  jsDivergence,
  earthMoversDistance,
  compareDegreeDistributions,
  degreeDistributionFromMap,
  computeDegreeHistogram,
} from './degree-distribution';

describe('computeDegreeDistribution', () => {
  it('should return empty map for empty input', () => {
    const dist = computeDegreeDistribution([]);
    expect(dist.size).toBe(0);
  });

  it('should normalize to sum to 1', () => {
    const dist = computeDegreeDistribution([1, 2, 2, 3, 3, 3]);
    let sum = 0;
    for (const prob of dist.values()) {
      sum += prob;
    }
    expect(sum).toBeCloseTo(1);
  });

  it('should compute correct probabilities', () => {
    const dist = computeDegreeDistribution([1, 1, 2, 2, 2, 3]);
    // 1 appears 2 times out of 6: 2/6 = 1/3
    // 2 appears 3 times out of 6: 3/6 = 1/2
    // 3 appears 1 time out of 6: 1/6
    expect(dist.get(1)).toBeCloseTo(2 / 6);
    expect(dist.get(2)).toBeCloseTo(3 / 6);
    expect(dist.get(3)).toBeCloseTo(1 / 6);
  });

  it('should handle single value', () => {
    const dist = computeDegreeDistribution([5]);
    expect(dist.size).toBe(1);
    expect(dist.get(5)).toBe(1);
  });
});

describe('klDivergence', () => {
  it('should return 0 for identical distributions', () => {
    const p = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    const q = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    expect(klDivergence(p, q)).toBeCloseTo(0, 5);
  });

  it('should return positive value for different distributions', () => {
    const p = new Map([
      [1, 0.9],
      [2, 0.1],
    ]);
    const q = new Map([
      [1, 0.1],
      [2, 0.9],
    ]);
    expect(klDivergence(p, q)).toBeGreaterThan(0);
  });

  it('should be asymmetric', () => {
    const p = new Map([
      [1, 0.9],
      [2, 0.1],
    ]);
    const q = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    const klPQ = klDivergence(p, q);
    const klQP = klDivergence(q, p);
    // KL divergence is asymmetric, so these should be different
    expect(klPQ).not.toBeCloseTo(klQP);
  });

  it('should handle distributions with different supports', () => {
    const p = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    const q = new Map([
      [2, 0.5],
      [3, 0.5],
    ]);
    // Should not throw, even though supports differ
    const result = klDivergence(p, q);
    expect(result).toBeGreaterThan(0);
  });
});

describe('jsDivergence', () => {
  it('should return 0 for identical distributions', () => {
    const p = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    const q = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    expect(jsDivergence(p, q)).toBeCloseTo(0, 5);
  });

  it('should be symmetric', () => {
    const p = new Map([
      [1, 0.9],
      [2, 0.1],
    ]);
    const q = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    const jsPQ = jsDivergence(p, q);
    const jsQP = jsDivergence(q, p);
    expect(jsPQ).toBeCloseTo(jsQP);
  });

  it('should be bounded by log(2)', () => {
    // For maximally different distributions, JS divergence approaches log(2) ≈ 0.693
    const p = new Map([[1, 1.0]]);
    const q = new Map([[2, 1.0]]);
    const result = jsDivergence(p, q);
    expect(result).toBeLessThanOrEqual(Math.log(2) + 0.01); // Small epsilon for numerical precision
  });
});

describe('earthMoversDistance', () => {
  it('should return 0 for identical distributions', () => {
    const p = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    const q = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    expect(earthMoversDistance(p, q)).toBeCloseTo(0);
  });

  it('should return 0 for empty distributions', () => {
    const p = new Map<number, number>();
    const q = new Map<number, number>();
    expect(earthMoversDistance(p, q)).toBe(0);
  });

  it('should be symmetric', () => {
    const p = new Map([
      [1, 0.9],
      [2, 0.1],
    ]);
    const q = new Map([
      [1, 0.5],
      [2, 0.5],
    ]);
    const emdPQ = earthMoversDistance(p, q);
    const emdQP = earthMoversDistance(q, p);
    expect(emdPQ).toBeCloseTo(emdQP);
  });

  it('should increase with distance between distribution centers', () => {
    // Distribution centered at degree 1
    const p = new Map([[1, 1.0]]);
    // Distribution centered at degree 5
    const q1 = new Map([[5, 1.0]]);
    // Distribution centered at degree 10
    const q2 = new Map([[10, 1.0]]);

    const emd1 = earthMoversDistance(p, q1);
    const emd2 = earthMoversDistance(p, q2);

    // Farther distribution should have higher EMD
    expect(emd2).toBeGreaterThan(emd1);
  });
});

describe('compareDegreeDistributions', () => {
  it('should compute all metrics', () => {
    const sampled = [1, 2, 2, 3, 3, 3];
    const groundTruth = [1, 2, 2, 3, 3, 3, 4];
    const metrics = compareDegreeDistributions(sampled, groundTruth);

    expect(metrics).toHaveProperty('klDivergence');
    expect(metrics).toHaveProperty('jsDivergence');
    expect(metrics).toHaveProperty('emd');
    expect(metrics).toHaveProperty('sampledMeanDegree');
    expect(metrics).toHaveProperty('groundTruthMeanDegree');
    expect(metrics).toHaveProperty('sampledStdDegree');
    expect(metrics).toHaveProperty('groundTruthStdDegree');
    expect(metrics).toHaveProperty('sampledMaxDegree');
    expect(metrics).toHaveProperty('groundTruthMaxDegree');
  });

  it('should compute correct mean degree', () => {
    const sampled = [2, 4, 6]; // mean = 4
    const groundTruth = [1, 2, 3]; // mean = 2
    const metrics = compareDegreeDistributions(sampled, groundTruth);

    expect(metrics.sampledMeanDegree).toBe(4);
    expect(metrics.groundTruthMeanDegree).toBe(2);
  });

  it('should compute correct max degree', () => {
    const sampled = [1, 5, 10];
    const groundTruth = [2, 8, 20];
    const metrics = compareDegreeDistributions(sampled, groundTruth);

    expect(metrics.sampledMaxDegree).toBe(10);
    expect(metrics.groundTruthMaxDegree).toBe(20);
  });

  it('should handle empty arrays', () => {
    const metrics = compareDegreeDistributions([], []);

    expect(metrics.sampledMeanDegree).toBe(0);
    expect(metrics.groundTruthMeanDegree).toBe(0);
    expect(metrics.sampledMaxDegree).toBe(0);
    expect(metrics.groundTruthMaxDegree).toBe(0);
  });

  it('should compute standard deviation correctly', () => {
    const sampled = [2, 4, 6]; // mean=4, variance=(4+0+4)/3, std=sqrt(8/3)
    const groundTruth = [3, 3, 3]; // mean=3, variance=0, std=0
    const metrics = compareDegreeDistributions(sampled, groundTruth);

    expect(metrics.sampledStdDegree).toBeCloseTo(Math.sqrt(8 / 3));
    expect(metrics.groundTruthStdDegree).toBe(0);
  });
});

describe('degreeDistributionFromMap', () => {
  it('should convert node degree map to distribution', () => {
    const nodeDegrees = new Map([
      ['A', 1],
      ['B', 2],
      ['C', 2],
      ['D', 3],
    ]);
    const dist = degreeDistributionFromMap(nodeDegrees);

    expect(dist.get(1)).toBeCloseTo(0.25); // 1/4
    expect(dist.get(2)).toBeCloseTo(0.5); // 2/4
    expect(dist.get(3)).toBeCloseTo(0.25); // 1/4
  });

  it('should handle empty map', () => {
    const nodeDegrees = new Map<string, number>();
    const dist = degreeDistributionFromMap(nodeDegrees);
    expect(dist.size).toBe(0);
  });
});

describe('computeDegreeHistogram', () => {
  it('should create correct buckets', () => {
    const degrees = [1, 5, 6, 10, 11, 50, 51, 100, 101, 500, 501, 1000, 1001];
    const histogram = computeDegreeHistogram(degrees);

    expect(histogram.get('1-5')).toBe(2);
    expect(histogram.get('6-10')).toBe(2);
    expect(histogram.get('11-50')).toBe(2);
    expect(histogram.get('51-100')).toBe(2);
    expect(histogram.get('101-500')).toBe(2);
    expect(histogram.get('501-1000')).toBe(2);
    expect(histogram.get('1000+')).toBe(1);
  });

  it('should initialize all buckets even if empty', () => {
    const degrees = [1, 2, 3];
    const histogram = computeDegreeHistogram(degrees);

    expect(histogram.has('1-5')).toBe(true);
    expect(histogram.has('6-10')).toBe(true);
    expect(histogram.has('1000+')).toBe(true);
    expect(histogram.get('6-10')).toBe(0);
    expect(histogram.get('1000+')).toBe(0);
  });

  it('should handle empty input', () => {
    const histogram = computeDegreeHistogram([]);

    // All buckets should exist but be 0
    for (const count of histogram.values()) {
      expect(count).toBe(0);
    }
  });
});
