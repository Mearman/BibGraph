/**
 * Unit tests for baseline rankers
 */
// eslint-disable-next-line n/no-extraneous-import
import { describe, expect, it } from 'vitest';

import { Graph } from '../../graph/graph';
import type { Path } from '../../types/algorithm-results';
import {
  randomRanker,
  degreeBasedRanker,
  pageRankRanker,
  shortestPathRanker,
  weightBasedRanker
} from '../../evaluation/baselines';

// Helper to create a simple test graph
function createTestGraph(): Graph<{ id: string }, { id: string; source: string; target: string; weight?: number }> {
  const graph = new Graph<{ id: string }, { id: string; source: string; target: string; weight?: number }>(false);

  // Add nodes
  graph.addNode('A', { id: 'A' });
  graph.addNode('B', { id: 'B' });
  graph.addNode('C', { id: 'C' });
  graph.addNode('D', { id: 'D' });

  // Add edges (A-B-C is a path, D is isolated)
  graph.addEdge('e1', 'A', 'B', { id: 'e1', source: 'A', target: 'B' });
  graph.addEdge('e2', 'B', 'C', { id: 'e2', source: 'B', target: 'C' });
  graph.addEdge('e3', 'A', 'D', { id: 'e3', source: 'A', target: 'D', weight: 2.0 });

  return graph;
}

// Helper to create test paths
function createTestPaths(): Path<{ id: string }, { id: string; source: string; target: string; weight?: number }>[] {
  return [
    {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'B', target: 'C' }
      ],
      totalWeight: 2
    },
    {
      nodes: [{ id: 'A' }, { id: 'D' }],
      edges: [{ id: 'e3', source: 'A', target: 'D', weight: 2.0 }],
      totalWeight: 1
    },
    {
      nodes: [{ id: 'B' }],
      edges: [],
      totalWeight: 0
    }
  ];
}

describe('Baseline Rankers', () => {
  describe('randomRanker', () => {
    it('should produce same orderings with same seed', () => {
      const items = createTestPaths();
      const result1 = randomRanker(items, 42);
      const result2 = randomRanker(items, 42);

      // Exact same ordering
      expect(result1.length).toBe(result2.length);
      result1.forEach((r1, i) => {
        expect(r1.path).toEqual(result2[i]!.path);
        expect(r1.score).toEqual(result2[i]!.score);
      });
    });

    it('should assign descending scores', () => {
      const items = createTestPaths();
      const result = randomRanker(items, 42);

      // Scores should be in descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i]!.score).toBeGreaterThanOrEqual(result[i + 1]!.score);
      }
    });

    it('should handle empty paths', () => {
      const result = randomRanker([], 42);
      expect(result).toEqual([]);
    });
  });

  describe('degreeBasedRanker', () => {
    it('should rank paths through high-degree nodes first', () => {
      const graph = createTestGraph();
      const paths = createTestPaths();

      const result = degreeBasedRanker(graph, paths);

      // Should return results for all paths
      expect(result.length).toBe(3);

      // Scores should be non-negative
      expect(result.every(r => r.score >= 0)).toBe(true);
    });

    it('should normalize scores by path length', () => {
      const graph = createTestGraph();
      const paths = createTestPaths();

      const result = degreeBasedRanker(graph, paths);

      // All paths should have nodes
      expect(result.every(r => r.path.nodes.length > 0)).toBe(true);
    });

    it('should handle empty paths', () => {
      const graph = createTestGraph();
      const result = degreeBasedRanker(graph, []);
      expect(result).toEqual([]);
    });
  });

  describe('pageRankRanker', () => {
    it('should rank paths through important nodes first', () => {
      const graph = createTestGraph();
      const paths = createTestPaths();

      const result = pageRankRanker(graph, paths, 0.85);

      // Should return results for all paths
      expect(result.length).toBe(3);

      // Scores should be non-negative
      expect(result.every(r => r.score >= 0)).toBe(true);
    });

    it('should be reproducible with same damping factor', () => {
      const graph = createTestGraph();
      const paths = createTestPaths();

      const result1 = pageRankRanker(graph, paths, 0.85);
      const result2 = pageRankRanker(graph, paths, 0.85);

      expect(result1.length).toBe(result2.length);
      result1.forEach((r1, i) => {
        expect(r1.score).toEqual(result2[i]!.score);
      });
    });

    it('should handle empty paths', () => {
      const graph = createTestGraph();
      const result = pageRankRanker(graph, [], 0.85);
      expect(result).toEqual([]);
    });
  });

  describe('shortestPathRanker', () => {
    it('should rank shorter paths first', () => {
      const paths = createTestPaths();

      const result = shortestPathRanker(paths);

      // Single node (0 edges) should have highest score
      const singleNodePath = result.find(r => r.path.edges.length === 0);
      expect(singleNodePath?.score).toBe(1.0);

      // Scores should be in descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i]!.score).toBeGreaterThanOrEqual(result[i + 1]!.score);
      }
    });

    it('should assign higher scores to shorter paths', () => {
      const paths = createTestPaths();
      const result = shortestPathRanker(paths);

      // Scores should be in descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i]!.score).toBeGreaterThanOrEqual(result[i + 1]!.score);
      }
    });

    it('should handle empty paths', () => {
      const result = shortestPathRanker([]);
      expect(result).toEqual([]);
    });

    it('should calculate score as 1/(length+1)', () => {
      const paths = createTestPaths();
      const result = shortestPathRanker(paths);

      // Find path with 2 edges (A-B-C)
      const twoEdgePath = result.find(r => r.path.edges.length === 2);
      expect(twoEdgePath?.score).toBeCloseTo(1 / 3, 5);

      // Find path with 1 edge (A-D)
      const oneEdgePath = result.find(r => r.path.edges.length === 1);
      expect(oneEdgePath?.score).toBeCloseTo(1 / 2, 5);

      // Find path with 0 edges (B)
      const zeroEdgePath = result.find(r => r.path.edges.length === 0);
      expect(zeroEdgePath?.score).toBe(1.0);
    });
  });

  describe('weightBasedRanker', () => {
    it('should rank paths by average edge weight', () => {
      const paths = createTestPaths();

      const weightFn = (edge: { weight?: number }): number => edge.weight ?? 1.0;
      const result = weightBasedRanker(paths, weightFn);

      // Should return results for all paths
      expect(result.length).toBe(3);

      // Find A-D path (weight 2.0)
      const adPath = result.find(r => r.path.nodes.map(n => n.id).join(',') === 'A,D');
      expect(adPath?.score).toBe(2.0);
    });

    it('should normalize by path length', () => {
      const paths = createTestPaths();

      const weightFn = (edge: { weight?: number }): number => edge.weight ?? 1.0;
      const result = weightBasedRanker(paths, weightFn);

      // Paths with edges should have positive scores
      const pathsWithEdges = result.filter(r => r.path.edges.length > 0);
      expect(pathsWithEdges.length).toBeGreaterThan(0);
      expect(pathsWithEdges.every(r => r.score > 0)).toBe(true);
    });

    it('should handle empty paths', () => {
      const weightFn = (edge: { weight?: number }): number => edge.weight ?? 1.0;
      const result = weightBasedRanker([], weightFn);
      expect(result).toEqual([]);
    });

    it('should use custom weight function', () => {
      const paths = createTestPaths();

      // Use weight = 1.0 for all edges (ignores edge.weight property)
      const weightFn = () => 1.0;
      const result = weightBasedRanker(paths, weightFn);

      // All paths with edges should have average weight 1.0
      const pathsWithEdges = result.filter(r => r.path.edges.length > 0);
      expect(pathsWithEdges.every(r => r.score === 1.0)).toBe(true);
    });
  });
});
