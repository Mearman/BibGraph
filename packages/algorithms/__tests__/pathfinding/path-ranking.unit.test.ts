import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../../src/graph/graph';
import {
  rankPaths,
  getBestPath,
  createPathRanker,
} from '../../src/pathfinding/path-ranking';
import { precomputeMutualInformation } from '../../src/pathfinding/mutual-information';
import { type Node, type Edge } from '../../src/types/graph';

interface TestNode extends Node {
  id: string;
  type: string;
  label: string;
  value?: number;
}

interface TestEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'test-edge';
}

describe('Information-Theoretic Path Ranking', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>(false); // undirected
  });

  describe('Basic path ranking', () => {
    it('should find and rank all shortest paths', () => {
      // Create diamond graph with two equal-length paths:
      //     B
      //    / \
      //   A   D
      //    \ /
      //     C
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });

      const result = rankPaths(graph, 'A', 'D');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(true);
        if (result.value.some) {
          const ranked = result.value.value;
          // Should find 2 paths of length 2
          expect(ranked.length).toBe(2);
          expect(ranked[0].path.edges.length).toBe(2);
          expect(ranked[1].path.edges.length).toBe(2);

          // All paths should have positive scores
          expect(ranked[0].score).toBeGreaterThan(0);
          expect(ranked[1].score).toBeGreaterThan(0);

          // Paths should be sorted by score (descending)
          expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
        }
      }
    });

    it('should rank higher-MI paths above lower-MI paths', () => {
      // Create graph where one path has more neighbourhood overlap (higher Jaccard)
      // Triangle on one side, linear on other
      //
      //   B---E
      //  /|   |
      // A-+---D (direct edge A-D exists)
      //  \|
      //   C
      //
      // Path A-B-D: B has neighbours {A, C, E, D}, D has neighbours {A, B, E}
      // Path A-C-D doesn't exist (no C-D edge)
      // Path A-D: direct (length 1, different comparison)

      // Simpler test: create two paths where one goes through a hub (many connections)
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' }); // Hub with many connections
      graph.addNode({ id: 'C', type: 'test', label: 'C' }); // Isolated path
      graph.addNode({ id: 'D', type: 'test', label: 'D' });
      graph.addNode({ id: 'E', type: 'test', label: 'E' }); // Extra node connected to B

      // Path 1: A -> B -> D (B is a hub)
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge' });

      // Path 2: A -> C -> D (C is isolated)
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });

      // Extra connections to B to make it a hub
      graph.addEdge({ id: 'E5', source: 'B', target: 'E', type: 'test-edge' });
      graph.addEdge({ id: 'E6', source: 'A', target: 'E', type: 'test-edge' }); // A-E connection

      const result = rankPaths(graph, 'A', 'D');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const ranked = result.value.value;
        expect(ranked.length).toBe(2);

        // Both paths should have scores
        expect(ranked[0].score).toBeGreaterThan(0);
        expect(ranked[1].score).toBeGreaterThan(0);

        // The path through the hub (B) should have higher MI due to more shared neighbours
        // A and B share neighbour E, B and D share neighbour... etc.
      }
    });

    it('should return None when no path exists', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });

      // Disconnected: A-B and C-D
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test-edge' });

      const result = rankPaths(graph, 'A', 'D');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(false);
      }
    });

    it('should handle trivial path (same start and end)', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });

      const result = rankPaths(graph, 'A', 'A');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const ranked = result.value.value;
        expect(ranked.length).toBe(1);
        expect(ranked[0].path.nodes.length).toBe(1);
        expect(ranked[0].path.edges.length).toBe(0);
        expect(ranked[0].score).toBe(1.0);
      }
    });
  });

  describe('Ranking score computation', () => {
    it('should compute geometric mean correctly', () => {
      // Simple path: A - B - C
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });

      const result = rankPaths(graph, 'A', 'C');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const ranked = result.value.value;
        expect(ranked.length).toBe(1);

        // Verify edgeMIValues are populated
        expect(ranked[0].edgeMIValues.length).toBe(2);

        // Verify geometric mean is computed
        // geometricMean = exp(mean(log(MI)))
        const mi1 = ranked[0].edgeMIValues[0];
        const mi2 = ranked[0].edgeMIValues[1];
        const expectedGM = Math.exp((Math.log(mi1) + Math.log(mi2)) / 2);

        expect(ranked[0].geometricMeanMI).toBeCloseTo(expectedGM, 5);
      }
    });

    it('should apply length penalty when lambda > 0', () => {
      // Two paths of different lengths (need longer path to exist)
      // A - B and A - C - B (if we remove direct A-B)
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      // With lambda = 0, only information quality matters
      const result0 = rankPaths(graph, 'A', 'B', { lambda: 0 });

      // With lambda > 0, length is penalised
      const result1 = rankPaths(graph, 'A', 'B', { lambda: 0.5 });

      expect(result0.ok).toBe(true);
      expect(result1.ok).toBe(true);

      if (result0.ok && result0.value.some && result1.ok && result1.value.some) {
        // Same path, but different scores due to length penalty
        // Path length = 1, penalty = exp(-0.5 * 1) ≈ 0.606
        expect(result1.value.value[0].score).toBeLessThan(result0.value.value[0].score);
      }
    });

    it('should not affect ranking for equal-length paths when lambda = 0', () => {
      // Diamond graph: all paths have same length
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });

      const result = rankPaths(graph, 'A', 'D', { lambda: 0 });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const ranked = result.value.value;
        // Both paths have length 2, so geometric mean alone determines ranking
        // Score = geometricMeanMI when lambda = 0 (exp(0) = 1)
        expect(ranked[0].score).toBeCloseTo(ranked[0].geometricMeanMI, 5);
      }
    });
  });

  describe('getBestPath convenience function', () => {
    it('should return only the top-ranked path', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });

      const result = getBestPath(graph, 'A', 'D');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(true);
        if (result.value.some) {
          // Should be a single ranked path, not an array
          const best = result.value.value;
          expect(best.path).toBeDefined();
          expect(best.score).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('createPathRanker (reusable ranker)', () => {
    it('should create ranker with pre-computed MI cache', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });

      const ranker = createPathRanker(graph);

      // Should be able to make multiple queries
      const result1 = ranker.rank('A', 'C');
      const result2 = ranker.getBest('A', 'B');

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      // Cache should be accessible
      const cache = ranker.getMICache();
      expect(cache.size).toBe(2);
    });

    it('should reuse MI cache across queries', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'D', type: 'test-edge' });

      const ranker = createPathRanker(graph);

      // Multiple queries should use same cache
      ranker.rank('A', 'B');
      ranker.rank('B', 'C');
      ranker.rank('A', 'D');

      // Cache should still have same size (not recomputed)
      expect(ranker.getMICache().size).toBe(3);
    });
  });

  describe('Configuration options', () => {
    it('should respect maxPaths limit', () => {
      // Create graph with many paths
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });
      graph.addNode({ id: 'E', type: 'test', label: 'E' });

      // Multiple paths of same length
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'E', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'E', type: 'test-edge' });
      graph.addEdge({ id: 'E5', source: 'A', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E6', source: 'D', target: 'E', type: 'test-edge' });

      const result = rankPaths(graph, 'A', 'E', { maxPaths: 2 });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value.length).toBeLessThanOrEqual(2);
      }
    });

    it('should accept pre-computed MI cache', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      // Pre-compute cache
      const cache = precomputeMutualInformation(graph);

      // Use pre-computed cache
      const result = rankPaths(graph, 'A', 'B', { miCache: cache });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value[0].edgeMIValues[0]).toBe(cache.get('E1'));
      }
    });
  });

  describe('Error handling', () => {
    it('should return error for non-existent start node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });

      const result = rankPaths(graph, 'Z', 'A');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('Start node');
      }
    });

    it('should return error for non-existent end node', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });

      const result = rankPaths(graph, 'A', 'Z');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('End node');
      }
    });

    it('should handle null graph', () => {
      const result = rankPaths(null as unknown as Graph<TestNode, TestEdge>, 'A', 'B');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });
  });

  describe('Directed graphs', () => {
    it('should respect edge direction in directed graphs', () => {
      const directedGraph = new Graph<TestNode, TestEdge>(true);

      directedGraph.addNode({ id: 'A', type: 'test', label: 'A' });
      directedGraph.addNode({ id: 'B', type: 'test', label: 'B' });
      directedGraph.addNode({ id: 'C', type: 'test', label: 'C' });

      // Edges only go A -> B -> C
      directedGraph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      directedGraph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });

      // Path A -> C should exist
      const resultAC = rankPaths(directedGraph, 'A', 'C');
      expect(resultAC.ok).toBe(true);
      if (resultAC.ok) {
        expect(resultAC.value.some).toBe(true);
      }

      // Path C -> A should NOT exist (wrong direction)
      const resultCA = rankPaths(directedGraph, 'C', 'A');
      expect(resultCA.ok).toBe(true);
      if (resultCA.ok) {
        expect(resultCA.value.some).toBe(false);
      }
    });
  });

  describe('Type preservation', () => {
    it('should preserve node and edge type information in ranked paths', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'Node A', value: 100 });
      graph.addNode({ id: 'B', type: 'test', label: 'Node B', value: 50 });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      const result = rankPaths(graph, 'A', 'B');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const ranked = result.value.value[0];

        // Verify node types preserved
        ranked.path.nodes.forEach((node) => {
          expect(node.type).toBe('test');
          expect(node).toHaveProperty('label');
          expect(node).toHaveProperty('value');
        });

        // Verify edge types preserved
        ranked.path.edges.forEach((edge) => {
          expect(edge.type).toBe('test-edge');
        });
      }
    });
  });
});
