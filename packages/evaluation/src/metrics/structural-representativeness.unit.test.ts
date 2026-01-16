/**
 * Unit tests for structural representativeness metrics
 */
import { describe, expect, it } from 'vitest';

import {
  computeSetOverlap,
  spearmanRankCorrelation,
  degreeToRanking,
  computeCommunityCoverage,
  computeStructuralRepresentativeness,
  aggregateRepresentativenessResults,
  type StructuralRepresentativenessResult,
} from './structural-representativeness';

describe('computeSetOverlap', () => {
  it('should return zeros for empty ground truth', () => {
    const sampled = new Set(['A', 'B', 'C']);
    const groundTruth = new Set<string>();
    const result = computeSetOverlap(sampled, groundTruth);

    expect(result.coverage).toBe(0);
    expect(result.precision).toBe(0);
    expect(result.f1Score).toBe(0);
    expect(result.intersection).toBe(0);
  });

  it('should compute perfect scores for identical sets', () => {
    const sampled = new Set(['A', 'B', 'C']);
    const groundTruth = new Set(['A', 'B', 'C']);
    const result = computeSetOverlap(sampled, groundTruth);

    expect(result.coverage).toBe(1);
    expect(result.precision).toBe(1);
    expect(result.f1Score).toBe(1);
    expect(result.intersection).toBe(3);
  });

  it('should compute correct coverage (recall)', () => {
    // Sampled has 2 of 4 ground truth nodes
    const sampled = new Set(['A', 'B', 'X', 'Y']);
    const groundTruth = new Set(['A', 'B', 'C', 'D']);
    const result = computeSetOverlap(sampled, groundTruth);

    expect(result.coverage).toBe(0.5); // 2/4
  });

  it('should compute correct precision', () => {
    // 2 of 4 sampled nodes are in ground truth
    const sampled = new Set(['A', 'B', 'X', 'Y']);
    const groundTruth = new Set(['A', 'B', 'C', 'D']);
    const result = computeSetOverlap(sampled, groundTruth);

    expect(result.precision).toBe(0.5); // 2/4
  });

  it('should compute correct F1 score', () => {
    // coverage = 0.5, precision = 0.5
    // F1 = 2 * (0.5 * 0.5) / (0.5 + 0.5) = 0.5
    const sampled = new Set(['A', 'B', 'X', 'Y']);
    const groundTruth = new Set(['A', 'B', 'C', 'D']);
    const result = computeSetOverlap(sampled, groundTruth);

    expect(result.f1Score).toBe(0.5);
  });

  it('should handle disjoint sets', () => {
    const sampled = new Set(['X', 'Y', 'Z']);
    const groundTruth = new Set(['A', 'B', 'C']);
    const result = computeSetOverlap(sampled, groundTruth);

    expect(result.coverage).toBe(0);
    expect(result.precision).toBe(0);
    expect(result.f1Score).toBe(0);
    expect(result.intersection).toBe(0);
  });

  it('should handle empty sampled set', () => {
    const sampled = new Set<string>();
    const groundTruth = new Set(['A', 'B', 'C']);
    const result = computeSetOverlap(sampled, groundTruth);

    expect(result.coverage).toBe(0);
    expect(result.precision).toBe(0);
    expect(result.f1Score).toBe(0);
  });
});

describe('spearmanRankCorrelation', () => {
  it('should return 1 for identical rankings', () => {
    const ranking1 = new Map([
      ['A', 1],
      ['B', 2],
      ['C', 3],
    ]);
    const ranking2 = new Map([
      ['A', 1],
      ['B', 2],
      ['C', 3],
    ]);
    const common = new Set(['A', 'B', 'C']);

    expect(spearmanRankCorrelation(ranking1, ranking2, common)).toBeCloseTo(1);
  });

  it('should return -1 for perfectly reversed rankings', () => {
    const ranking1 = new Map([
      ['A', 1],
      ['B', 2],
      ['C', 3],
    ]);
    const ranking2 = new Map([
      ['A', 3],
      ['B', 2],
      ['C', 1],
    ]);
    const common = new Set(['A', 'B', 'C']);

    expect(spearmanRankCorrelation(ranking1, ranking2, common)).toBeCloseTo(-1);
  });

  it('should return 0 for fewer than 2 common nodes', () => {
    const ranking1 = new Map([['A', 1]]);
    const ranking2 = new Map([['A', 1]]);
    const common = new Set(['A']);

    expect(spearmanRankCorrelation(ranking1, ranking2, common)).toBe(0);
  });

  it('should only consider common nodes', () => {
    const ranking1 = new Map([
      ['A', 1],
      ['B', 2],
      ['C', 3],
      ['X', 4],
    ]);
    const ranking2 = new Map([
      ['A', 1],
      ['B', 2],
      ['C', 3],
      ['Y', 4],
    ]);
    // Only A, B, C are common
    const common = new Set(['A', 'B', 'C']);

    expect(spearmanRankCorrelation(ranking1, ranking2, common)).toBeCloseTo(1);
  });
});

describe('degreeToRanking', () => {
  it('should rank highest degree as 1', () => {
    const degrees = new Map([
      ['A', 10],
      ['B', 5],
      ['C', 1],
    ]);
    const ranking = degreeToRanking(degrees);

    expect(ranking.get('A')).toBe(1);
    expect(ranking.get('B')).toBe(2);
    expect(ranking.get('C')).toBe(3);
  });

  it('should handle ties (arbitrary but consistent ordering)', () => {
    const degrees = new Map([
      ['A', 5],
      ['B', 5],
      ['C', 5],
    ]);
    const ranking = degreeToRanking(degrees);

    // All have same degree, ranks should be 1, 2, 3 (order depends on sort stability)
    const ranks = [...ranking.values()].sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3]);
  });

  it('should handle empty input', () => {
    const degrees = new Map<string, number>();
    const ranking = degreeToRanking(degrees);
    expect(ranking.size).toBe(0);
  });

  it('should handle single node', () => {
    const degrees = new Map([['A', 10]]);
    const ranking = degreeToRanking(degrees);
    expect(ranking.get('A')).toBe(1);
  });
});

describe('computeCommunityCoverage', () => {
  it('should return 0 for empty communities', () => {
    const sampled = new Set(['A', 'B', 'C']);
    const communities: Array<Set<string>> = [];
    expect(computeCommunityCoverage(sampled, communities)).toBe(0);
  });

  it('should return 1 when all communities are covered', () => {
    const sampled = new Set(['A', 'D']);
    const communities = [new Set(['A', 'B', 'C']), new Set(['D', 'E', 'F'])];
    expect(computeCommunityCoverage(sampled, communities)).toBe(1);
  });

  it('should return 0 when no communities are covered', () => {
    const sampled = new Set(['X', 'Y', 'Z']);
    const communities = [new Set(['A', 'B', 'C']), new Set(['D', 'E', 'F'])];
    expect(computeCommunityCoverage(sampled, communities)).toBe(0);
  });

  it('should return fraction when some communities are covered', () => {
    const sampled = new Set(['A']);
    const communities = [
      new Set(['A', 'B', 'C']),
      new Set(['D', 'E', 'F']),
      new Set(['G', 'H', 'I']),
      new Set(['J', 'K', 'L']),
    ];
    expect(computeCommunityCoverage(sampled, communities)).toBe(0.25);
  });
});

describe('computeStructuralRepresentativeness', () => {
  it('should compute all metrics', () => {
    const sampled = new Set(['A', 'B', 'C']);
    const groundTruth = new Set(['A', 'B', 'D']);
    const sampledDegrees = new Map([
      ['A', 3],
      ['B', 2],
      ['C', 1],
    ]);
    const gtDegrees = new Map([
      ['A', 3],
      ['B', 2],
      ['D', 1],
    ]);

    const result = computeStructuralRepresentativeness(
      sampled,
      groundTruth,
      sampledDegrees,
      gtDegrees
    );

    expect(result).toHaveProperty('coverage');
    expect(result).toHaveProperty('precision');
    expect(result).toHaveProperty('f1Score');
    expect(result).toHaveProperty('degreeKL');
    expect(result).toHaveProperty('degreeJS');
    expect(result).toHaveProperty('betweennessCorrelation');
    expect(result).toHaveProperty('communityCoverage');
    expect(result).toHaveProperty('intersectionSize');
    expect(result).toHaveProperty('falsePositives');
    expect(result).toHaveProperty('falseNegatives');
  });

  it('should compute correct false positives and negatives', () => {
    const sampled = new Set(['A', 'B', 'X']); // X is false positive
    const groundTruth = new Set(['A', 'B', 'C']); // C is false negative
    const sampledDegrees = new Map([
      ['A', 3],
      ['B', 2],
      ['X', 1],
    ]);
    const gtDegrees = new Map([
      ['A', 3],
      ['B', 2],
      ['C', 1],
    ]);

    const result = computeStructuralRepresentativeness(
      sampled,
      groundTruth,
      sampledDegrees,
      gtDegrees
    );

    expect(result.falsePositives).toBe(1); // X
    expect(result.falseNegatives).toBe(1); // C
    expect(result.intersectionSize).toBe(2); // A, B
  });

  it('should use community coverage when provided', () => {
    const sampled = new Set(['A', 'D']);
    const groundTruth = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
    const sampledDegrees = new Map([
      ['A', 2],
      ['D', 2],
    ]);
    const gtDegrees = new Map([
      ['A', 2],
      ['B', 1],
      ['C', 1],
      ['D', 2],
      ['E', 1],
      ['F', 1],
    ]);
    const communities = [new Set(['A', 'B', 'C']), new Set(['D', 'E', 'F'])];

    const result = computeStructuralRepresentativeness(
      sampled,
      groundTruth,
      sampledDegrees,
      gtDegrees,
      communities
    );

    expect(result.communityCoverage).toBe(1); // Both communities covered
  });
});

describe('aggregateRepresentativenessResults', () => {
  it('should return zeros for empty results', () => {
    const result = aggregateRepresentativenessResults([]);

    expect(result.coverage).toBe(0);
    expect(result.precision).toBe(0);
    expect(result.f1Score).toBe(0);
    expect(result.degreeKL).toBe(0);
    expect(result.betweennessCorrelation).toBe(0);
  });

  it('should compute averages correctly', () => {
    const results: StructuralRepresentativenessResult[] = [
      {
        coverage: 0.6,
        precision: 0.8,
        f1Score: 0.69,
        degreeKL: 0.1,
        degreeJS: 0.05,
        betweennessCorrelation: 0.9,
        communityCoverage: 1.0,
        intersectionSize: 10,
        falsePositives: 2,
        falseNegatives: 4,
      },
      {
        coverage: 0.4,
        precision: 0.6,
        f1Score: 0.48,
        degreeKL: 0.3,
        degreeJS: 0.15,
        betweennessCorrelation: 0.7,
        communityCoverage: 0.5,
        intersectionSize: 6,
        falsePositives: 4,
        falseNegatives: 6,
      },
    ];

    const avg = aggregateRepresentativenessResults(results);

    expect(avg.coverage).toBeCloseTo(0.5);
    expect(avg.precision).toBeCloseTo(0.7);
    expect(avg.degreeKL).toBeCloseTo(0.2);
    expect(avg.betweennessCorrelation).toBeCloseTo(0.8);
    expect(avg.communityCoverage).toBeCloseTo(0.75);
    expect(avg.intersectionSize).toBeCloseTo(8);
    expect(avg.falsePositives).toBeCloseTo(3);
    expect(avg.falseNegatives).toBeCloseTo(5);
  });

  it('should handle single result', () => {
    const results: StructuralRepresentativenessResult[] = [
      {
        coverage: 0.6,
        precision: 0.8,
        f1Score: 0.69,
        degreeKL: 0.1,
        degreeJS: 0.05,
        betweennessCorrelation: 0.9,
        communityCoverage: 1.0,
        intersectionSize: 10,
        falsePositives: 2,
        falseNegatives: 4,
      },
    ];

    const avg = aggregateRepresentativenessResults(results);

    expect(avg.coverage).toBe(0.6);
    expect(avg.precision).toBe(0.8);
    expect(avg.degreeKL).toBe(0.1);
  });
});
