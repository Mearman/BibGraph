/**
 * Unit tests for path diversity metrics
 */
import { describe, expect, it } from 'vitest';

import {
  jaccardDistance,
  pathToNodeSet,
  meanPairwiseJaccardDistance,
  meanPairwiseEdgeJaccardDistance,
  computePathDiversityMetrics,
  computeHubCoverage,
  identifyHubNodes,
} from './path-diversity';

describe('jaccardDistance', () => {
  it('should return 0 for identical sets', () => {
    const setA = new Set(['A', 'B', 'C']);
    const setB = new Set(['A', 'B', 'C']);
    expect(jaccardDistance(setA, setB)).toBe(0);
  });

  it('should return 1 for completely disjoint sets', () => {
    const setA = new Set(['A', 'B', 'C']);
    const setB = new Set(['D', 'E', 'F']);
    expect(jaccardDistance(setA, setB)).toBe(1);
  });

  it('should return 0.5 for sets with half overlap', () => {
    // setA = {A, B}, setB = {B, C}
    // intersection = {B}, size 1
    // union = {A, B, C}, size 3
    // similarity = 1/3, distance = 2/3
    const setA = new Set(['A', 'B']);
    const setB = new Set(['B', 'C']);
    expect(jaccardDistance(setA, setB)).toBeCloseTo(2 / 3);
  });

  it('should return 0 for two empty sets', () => {
    const setA = new Set<string>();
    const setB = new Set<string>();
    expect(jaccardDistance(setA, setB)).toBe(0);
  });

  it('should return 1 when one set is empty and other is not', () => {
    const setA = new Set(['A', 'B']);
    const setB = new Set<string>();
    expect(jaccardDistance(setA, setB)).toBe(1);
  });
});

describe('pathToNodeSet', () => {
  it('should convert path array to set', () => {
    const path = ['A', 'B', 'C', 'D'];
    const nodeSet = pathToNodeSet(path);
    expect(nodeSet.size).toBe(4);
    expect(nodeSet.has('A')).toBe(true);
    expect(nodeSet.has('D')).toBe(true);
  });

  it('should deduplicate repeated nodes', () => {
    const path = ['A', 'B', 'A', 'C']; // A appears twice
    const nodeSet = pathToNodeSet(path);
    expect(nodeSet.size).toBe(3);
  });

  it('should handle empty path', () => {
    const path: string[] = [];
    const nodeSet = pathToNodeSet(path);
    expect(nodeSet.size).toBe(0);
  });
});

describe('meanPairwiseJaccardDistance', () => {
  it('should return 0 for single path', () => {
    const paths = [['A', 'B', 'C']];
    expect(meanPairwiseJaccardDistance(paths)).toBe(0);
  });

  it('should return 0 for empty paths array', () => {
    const paths: string[][] = [];
    expect(meanPairwiseJaccardDistance(paths)).toBe(0);
  });

  it('should return 0 for identical paths', () => {
    const paths = [
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
    ];
    expect(meanPairwiseJaccardDistance(paths)).toBe(0);
  });

  it('should return 1 for completely disjoint paths', () => {
    const paths = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
    ];
    expect(meanPairwiseJaccardDistance(paths)).toBe(1);
  });

  it('should compute average across multiple path pairs', () => {
    // Path 1 and 2 share B, Path 1 and 3 share C, Path 2 and 3 are disjoint
    const paths = [
      ['A', 'B'],
      ['B', 'C'],
      ['D', 'E'],
    ];
    const result = meanPairwiseJaccardDistance(paths);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
});

describe('meanPairwiseEdgeJaccardDistance', () => {
  it('should return 0 for single path', () => {
    const paths = [['A', 'B', 'C']];
    expect(meanPairwiseEdgeJaccardDistance(paths)).toBe(0);
  });

  it('should return 0 for paths with identical edges', () => {
    const paths = [
      ['A', 'B', 'C'],
      ['A', 'B', 'C'],
    ];
    expect(meanPairwiseEdgeJaccardDistance(paths)).toBe(0);
  });

  it('should be direction-independent for edges', () => {
    // A-B-C has edges A--B, B--C
    // C-B-A has edges C--B, B--A (normalized: A--B, B--C)
    const paths = [
      ['A', 'B', 'C'],
      ['C', 'B', 'A'],
    ];
    expect(meanPairwiseEdgeJaccardDistance(paths)).toBe(0);
  });

  it('should detect edge differences in paths sharing nodes', () => {
    // Both paths share node B, but have different edges
    // Path 1: A-B-C has edges A--B, B--C
    // Path 2: A-B-D has edges A--B, B--D
    const paths = [
      ['A', 'B', 'C'],
      ['A', 'B', 'D'],
    ];
    const result = meanPairwiseEdgeJaccardDistance(paths);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
});

describe('computePathDiversityMetrics', () => {
  it('should return zeros for empty paths', () => {
    const metrics = computePathDiversityMetrics([]);
    expect(metrics.pathCount).toBe(0);
    expect(metrics.nodeJaccardDistance).toBe(0);
    expect(metrics.edgeJaccardDistance).toBe(0);
    expect(metrics.uniqueNodeCount).toBe(0);
    expect(metrics.uniqueEdgeCount).toBe(0);
    expect(metrics.meanPathLength).toBe(0);
    expect(metrics.stdPathLength).toBe(0);
  });

  it('should compute correct counts', () => {
    const paths = [
      ['A', 'B', 'C'],
      ['A', 'D', 'E'],
    ];
    const metrics = computePathDiversityMetrics(paths);
    expect(metrics.pathCount).toBe(2);
    expect(metrics.uniqueNodeCount).toBe(5); // A, B, C, D, E
    expect(metrics.uniqueEdgeCount).toBe(4); // A--B, B--C, A--D, D--E
  });

  it('should compute correct mean path length', () => {
    const paths = [
      ['A', 'B', 'C'], // length 3
      ['A', 'B', 'C', 'D', 'E'], // length 5
    ];
    const metrics = computePathDiversityMetrics(paths);
    expect(metrics.meanPathLength).toBe(4);
  });

  it('should compute path length standard deviation', () => {
    const paths = [
      ['A', 'B'], // length 2
      ['A', 'B', 'C', 'D'], // length 4
    ];
    const metrics = computePathDiversityMetrics(paths);
    expect(metrics.meanPathLength).toBe(3);
    // Variance = ((2-3)² + (4-3)²) / 2 = (1 + 1) / 2 = 1
    // Std = sqrt(1) = 1
    expect(metrics.stdPathLength).toBe(1);
  });
});

describe('computeHubCoverage', () => {
  it('should return 0 for empty paths', () => {
    const hubs = new Set(['H1', 'H2']);
    expect(computeHubCoverage([], hubs)).toBe(0);
  });

  it('should return 0 when no paths traverse hubs', () => {
    const paths = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
    ];
    const hubs = new Set(['H1', 'H2']);
    expect(computeHubCoverage(paths, hubs)).toBe(0);
  });

  it('should return 1 when all paths traverse hubs', () => {
    const paths = [
      ['A', 'H1', 'C'],
      ['D', 'H2', 'F'],
    ];
    const hubs = new Set(['H1', 'H2']);
    expect(computeHubCoverage(paths, hubs)).toBe(1);
  });

  it('should return fraction when some paths traverse hubs', () => {
    const paths = [
      ['A', 'H1', 'C'],
      ['D', 'E', 'F'],
    ];
    const hubs = new Set(['H1', 'H2']);
    expect(computeHubCoverage(paths, hubs)).toBe(0.5);
  });
});

describe('identifyHubNodes', () => {
  it('should identify top percentile as hubs', () => {
    const degrees = new Map([
      ['A', 10],
      ['B', 8],
      ['C', 5],
      ['D', 3],
      ['E', 1],
    ]);
    // Top 20% of 5 nodes = 1 node
    const hubs = identifyHubNodes(degrees, 0.2);
    expect(hubs.size).toBe(1);
    expect(hubs.has('A')).toBe(true);
  });

  it('should return at least one hub', () => {
    const degrees = new Map([
      ['A', 10],
      ['B', 8],
      ['C', 5],
    ]);
    // Even with very small percentile, should return at least 1
    const hubs = identifyHubNodes(degrees, 0.01);
    expect(hubs.size).toBeGreaterThanOrEqual(1);
    expect(hubs.has('A')).toBe(true);
  });

  it('should handle empty degree map', () => {
    const degrees = new Map<string, number>();
    const hubs = identifyHubNodes(degrees, 0.1);
    expect(hubs.size).toBe(0);
  });

  it('should use default percentile of 0.1', () => {
    const degrees = new Map([
      ['A', 100],
      ['B', 90],
      ['C', 80],
      ['D', 70],
      ['E', 60],
      ['F', 50],
      ['G', 40],
      ['H', 30],
      ['I', 20],
      ['J', 10],
    ]);
    // Top 10% of 10 nodes = 1 node
    const hubs = identifyHubNodes(degrees);
    expect(hubs.size).toBe(1);
    expect(hubs.has('A')).toBe(true);
  });
});
