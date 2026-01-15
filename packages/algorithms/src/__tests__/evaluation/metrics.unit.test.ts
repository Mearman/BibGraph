/**
 * Unit tests for evaluation metrics
 */
// eslint-disable-next-line n/no-extraneous-import
import { describe, expect, it } from 'vitest';

import {
  spearmanCorrelation,
  kendallTau,
  ndcg,
  meanAveragePrecision,
  meanReciprocalRank,
  precisionAtK,
  recallAtK
} from '../../evaluation';

describe('Rank Correlation Metrics', () => {
  describe('spearmanCorrelation', () => {
    it('should return 1.0 for identical rankings', () => {
      const ranking = ['A', 'B', 'C', 'D'];
      expect(spearmanCorrelation(ranking, ranking)).toBe(1);
    });

    it('should return -1.0 for reversed rankings', () => {
      const ranking = ['A', 'B', 'C', 'D'];
      const reversed = ['D', 'C', 'B', 'A'];
      expect(spearmanCorrelation(ranking, reversed)).toBe(-1);
    });

    it('should handle partial overlap', () => {
      const predicted = ['A', 'B', 'C'];
      const truth = ['B', 'A', 'C'];
      const rho = spearmanCorrelation(predicted, truth);
      expect(rho).toBeGreaterThan(-1);
      expect(rho).toBeLessThan(1);
    });

    it('should return 0 for empty rankings', () => {
      expect(spearmanCorrelation([], [])).toBe(0);
    });

    it('should handle rankings with different items', () => {
      const predicted = ['A', 'B', 'C'];
      const truth = ['D', 'E', 'F'];
      // No common items, should return 0
      expect(spearmanCorrelation(predicted, truth)).toBe(0);
    });

    it('should return 1 for single identical item', () => {
      expect(spearmanCorrelation(['A'], ['A'])).toBe(1);
    });
  });

  describe('kendallTau', () => {
    it('should return 1.0 for identical rankings', () => {
      const ranking = ['A', 'B', 'C', 'D'];
      expect(kendallTau(ranking, ranking)).toBe(1);
    });

    it('should return -1.0 for reversed rankings', () => {
      const ranking = ['A', 'B', 'C', 'D'];
      const reversed = ['D', 'C', 'B', 'A'];
      expect(kendallTau(ranking, reversed)).toBe(-1);
    });

    it('should handle partial agreement', () => {
      const predicted = ['A', 'B', 'C'];
      const truth = ['B', 'A', 'C'];
      const tau = kendallTau(predicted, truth);
      expect(tau).toBeGreaterThan(-1);
      expect(tau).toBeLessThan(1);
    });

    it('should return 1 for empty or single-item rankings', () => {
      expect(kendallTau([], [])).toBe(1);
      expect(kendallTau(['A'], ['A'])).toBe(1);
    });

    it('should handle rankings with different items', () => {
      const predicted = ['A', 'B', 'C'];
      const truth = ['D', 'E', 'F'];
      // No common items, should return 1
      expect(kendallTau(predicted, truth)).toBe(1);
    });
  });
});

describe('Information Retrieval Metrics', () => {
  describe('ndcg', () => {
    it('should return 1.0 for perfect ranking', () => {
      const items = [
        { id: 'A', relevance: 3 },
        { id: 'B', relevance: 2 },
        { id: 'C', relevance: 1 }
      ];
      expect(ndcg(items, items)).toBe(1);
    });

    it('should return lower score for suboptimal ranking', () => {
      const predicted = [
        { id: 'C', relevance: 1 },
        { id: 'B', relevance: 2 },
        { id: 'A', relevance: 3 }
      ];
      const ideal = [
        { id: 'A', relevance: 3 },
        { id: 'B', relevance: 2 },
        { id: 'C', relevance: 1 }
      ];
      const score = ndcg(predicted, ideal);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should handle cutoff parameter', () => {
      const predicted = [
        { id: 'C', relevance: 1 },
        { id: 'B', relevance: 2 },
        { id: 'A', relevance: 3 }
      ];
      const ideal = [
        { id: 'A', relevance: 3 },
        { id: 'B', relevance: 2 },
        { id: 'C', relevance: 1 }
      ];
      const ndcgAt2 = ndcg(predicted, ideal, 2);
      expect(ndcgAt2).toBeGreaterThan(0);
      expect(ndcgAt2).toBeLessThanOrEqual(1);
    });

    it('should return 0 for empty predictions', () => {
      const ideal = [{ id: 'A', relevance: 3 }];
      expect(ndcg([], ideal)).toBe(0);
    });

    it('should return 1 for no relevant items', () => {
      const predicted = [{ id: 'A', relevance: 0 }];
      const ideal = [{ id: 'A', relevance: 0 }];
      expect(ndcg(predicted, ideal)).toBe(1);
    });
  });

  describe('meanAveragePrecision', () => {
    it('should return 1.0 when all relevant items are ranked first', () => {
      const predicted = ['A', 'B', 'C', 'D'];
      const relevant = new Set(['A', 'B']);
      expect(meanAveragePrecision(predicted, relevant)).toBe(1);
    });

    it('should return 0 when no relevant items found', () => {
      const predicted = ['A', 'B', 'C', 'D'];
      const relevant = new Set(['X', 'Y']);
      expect(meanAveragePrecision(predicted, relevant)).toBe(0);
    });

    it('should calculate average precision correctly', () => {
      const predicted = ['A', 'X', 'B', 'Y', 'C'];
      const relevant = new Set(['A', 'B', 'C']);

      // A at position 1: precision = 1/1 = 1.0
      // B at position 3: precision = 2/3 ≈ 0.667
      // C at position 5: precision = 3/5 = 0.6
      // MAP = (1.0 + 0.667 + 0.6) / 3 ≈ 0.756

      const map = meanAveragePrecision(predicted, relevant);
      expect(map).toBeGreaterThan(0.7);
      expect(map).toBeLessThan(0.8);
    });

    it('should return 0 for empty predictions', () => {
      const relevant = new Set(['A', 'B']);
      expect(meanAveragePrecision([], relevant)).toBe(0);
    });

    it('should return 0 for empty relevant set', () => {
      const predicted = ['A', 'B', 'C'];
      const relevant = new Set<string>();
      expect(meanAveragePrecision(predicted, relevant)).toBe(0);
    });
  });

  describe('meanReciprocalRank', () => {
    it('should return 1.0 when first item is relevant', () => {
      const predicted = ['A', 'B', 'C'];
      const relevant = new Set(['A', 'B']);
      expect(meanReciprocalRank(predicted, relevant)).toBe(1);
    });

    it('should return 0.5 when second item is first relevant', () => {
      const predicted = ['X', 'A', 'B'];
      const relevant = new Set(['A', 'B']);
      expect(meanReciprocalRank(predicted, relevant)).toBe(0.5);
    });

    it('should return 0 when no relevant items found', () => {
      const predicted = ['X', 'Y', 'Z'];
      const relevant = new Set(['A', 'B']);
      expect(meanReciprocalRank(predicted, relevant)).toBe(0);
    });

    it('should handle empty predictions', () => {
      const relevant = new Set(['A']);
      expect(meanReciprocalRank([], relevant)).toBe(0);
    });
  });

  describe('precisionAtK', () => {
    it('should calculate precision correctly', () => {
      const predicted = ['A', 'B', 'X', 'C', 'Y'];
      const relevant = new Set(['A', 'B', 'C']);

      // Top 3: A, B, X -> 2/3 relevant
      expect(precisionAtK(predicted, relevant, 3)).toBeCloseTo(2 / 3, 5);
    });

    it('should return 0 for empty predictions', () => {
      const relevant = new Set(['A']);
      expect(precisionAtK([], relevant, 5)).toBe(0);
    });

    it('should return 0 for empty relevant set', () => {
      const predicted = ['A', 'B', 'C'];
      const relevant = new Set<string>();
      expect(precisionAtK(predicted, relevant, 5)).toBe(0);
    });

    it('should handle k larger than prediction length', () => {
      const predicted = ['A', 'B'];
      const relevant = new Set(['A']);
      expect(precisionAtK(predicted, relevant, 10)).toBeCloseTo(1 / 10, 5);
    });
  });

  describe('recallAtK', () => {
    it('should calculate recall correctly', () => {
      const predicted = ['A', 'B', 'X', 'C', 'Y'];
      const relevant = new Set(['A', 'B', 'C', 'D']);

      // Top 3: A, B, X -> 2/4 relevant found
      expect(recallAtK(predicted, relevant, 3)).toBeCloseTo(2 / 4, 5);
    });

    it('should return 0 for empty predictions', () => {
      const relevant = new Set(['A']);
      expect(recallAtK([], relevant, 5)).toBe(0);
    });

    it('should return 0 for empty relevant set', () => {
      const predicted = ['A', 'B', 'C'];
      const relevant = new Set<string>();
      expect(recallAtK(predicted, relevant, 5)).toBe(0);
    });

    it('should return 1 when all relevant items found', () => {
      const predicted = ['A', 'B', 'C'];
      const relevant = new Set(['A', 'B']);
      expect(recallAtK(predicted, relevant, 5)).toBe(1);
    });
  });
});
