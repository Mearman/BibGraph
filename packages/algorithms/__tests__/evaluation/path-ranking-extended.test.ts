import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { rankPaths } from '../../src/pathfinding/path-ranking';
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

/**
 * Phase 14: Non-Shortest Path Support Tests
 *
 * Tests for depth-limited path enumeration and λ trade-off functionality.
 */
describe('Non-Shortest Path Ranking (Phase 14)', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>(false); // undirected
  });

  describe('shortestOnly backward compatibility', () => {
    it('should be backwards compatible with shortestOnly=true (default)', () => {
      // Create graph with multiple paths of different lengths
      // A -> B -> D (shortest, length 2)
      // A -> B -> C -> D (longer, length 3)
      // A -> E -> F -> D (longer, length 3)

      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });
      graph.addNode({ id: 'E', type: 'test', label: 'E' });
      graph.addNode({ id: 'F', type: 'test', label: 'F' });

      // Shortest path
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge' });

      // Longer paths
      graph.addEdge({ id: 'E3', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E5', source: 'A', target: 'E', type: 'test-edge' });
      graph.addEdge({ id: 'E6', source: 'E', target: 'F', type: 'test-edge' });
      graph.addEdge({ id: 'E7', source: 'F', target: 'D', type: 'test-edge' });

      // Test default (shortestOnly=true by default)
      const result1 = rankPaths(graph, 'A', 'D');
      expect(result1.ok).toBe(true);
      if (result1.ok && result1.value.some) {
        // Should only find shortest paths (length 2)
        const paths = result1.value.value;
        paths.forEach(p => {
          expect(p.path.edges.length).toBe(2);
        });
      }

      // Test explicit shortestOnly=true
      const result2 = rankPaths(graph, 'A', 'D', { shortestOnly: true });
      expect(result2.ok).toBe(true);
      if (result2.ok && result2.value.some) {
        const paths = result2.value.value;
        paths.forEach(p => {
          expect(p.path.edges.length).toBe(2);
        });
      }

      // Results should be identical
      expect(result1).toEqual(result2);
    });

    it('should respect maxLength limit', () => {
      // Create graph with paths up to length 5
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });
      graph.addNode({ id: 'E', type: 'test', label: 'E' });
      graph.addNode({ id: 'F', type: 'test', label: 'F' });

      // Create chain: A-B-C-D-E-F
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E4', source: 'D', target: 'E', type: 'test-edge' });
      graph.addEdge({ id: 'E5', source: 'E', target: 'F', type: 'test-edge' });

      // Add some shortcuts to create multiple paths
      graph.addEdge({ id: 'E6', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E7', source: 'C', target: 'E', type: 'test-edge' });

      const result = rankPaths(graph, 'A', 'F', {
        shortestOnly: false,
        maxLength: 3,
      });

      expect(result.ok).toBe(true);
      if (result.ok && result1.value.some) {
        const paths = result1.value.value;
        // All paths should have length <= 3
        paths.forEach(p => {
          expect(p.path.edges.length).toBeLessThanOrEqual(3);
        });
      }
    });
  });

  describe('λ trade-off behaviour', () => {
    beforeEach(() => {
      // Create graph where:
      // - Short path (length 2) has LOW MI (goes through weak connections)
      // - Long path (length 4) has HIGH MI (goes through strong connections)
      //
      // Structure:
      //   B (weak) --- D (weak)
      //  /             \
      // A               F (target)
      //  \             /
      //   C (strong)--E (strong)
      //     |
      //   G (strong)

      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B', value: 1 }); // Weak hub
      graph.addNode({ id: 'C', type: 'test', label: 'C', value: 100 }); // Strong hub
      graph.addNode({ id: 'D', type: 'test', label: 'D', value: 1 });
      graph.addNode({ id: 'E', type: 'test', label: 'E', value: 100 });
      graph.addNode({ id: 'F', type: 'test', label: 'F' });
      graph.addNode({ id: 'G', type: 'test', label: 'G', value: 100 });

      // Short low-MI path: A -> B -> D -> F (length 3)
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'test-edge' });
      graph.addEdge({ id: 'E3', source: 'D', target: 'F', type: 'test-edge' });

      // Long high-MI path: A -> C -> E -> F (length 3, but with high MI)
      // Add extra connections to C and E to increase their MI
      graph.addEdge({ id: 'E4', source: 'A', target: 'C', type: 'test-edge' });
      graph.addEdge({ id: 'E5', source: 'C', target: 'G', type: 'test-edge' });
      graph.addEdge({ id: 'E6', source: 'G', target: 'E', type: 'test-edge' });
      graph.addEdge({ id: 'E7', source: 'E', target: 'F', type: 'test-edge' });
    });

    it('should prefer longer high-MI path when λ=0 (pure MI quality)', () => {
      const result = rankPaths(graph, 'A', 'F', {
        shortestOnly: false,
        maxLength: 6,
        lambda: 0, // Pure MI quality
        miConfig: {
          attributeExtractor: (node) => [node.value ?? 0],
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const ranked = result.value.value;

        // With λ=0, the high-MI path through C-G-E should rank first
        // even though it might be longer
        const topPath = ranked[0];

        // Verify it goes through high-value nodes (C, G, E)
        const nodeIds = topPath.path.nodes.map(n => n.id);
        expect(nodeIds).toContain('C');
        expect(nodeIds).toContain('E');
      }
    });

    it('should prefer shorter path when λ is high', () => {
      const result = rankPaths(graph, 'A', 'F', {
        shortestOnly: false,
        maxLength: 6,
        lambda: 2.0, // Strong length penalty
        miConfig: {
          attributeExtractor: (node) => [node.value ?? 0],
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const ranked = result.value.value;

        // With high λ, shorter paths should be preferred
        // The shortest path (A-B-D-F, length 3) should rank highly
        const shortestPathLength = Math.min(...ranked.map(r => r.path.edges.length));

        // Top path should be one of the shortest
        expect(ranked[0].path.edges.length).toBe(shortestPathLength);
      }
    });

    it('should balance MI and length when λ is moderate', () => {
      const result = rankPaths(graph, 'A', 'F', {
        shortestOnly: false,
        maxLength: 6,
        lambda: 0.1, // Moderate length penalty
        miConfig: {
          attributeExtractor: (node) => [node.value ?? 0],
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const ranked = result.value.value;

        // Should have multiple paths
        expect(ranked.length).toBeGreaterThan(1);

        // Scores should reflect both MI and length
        // (Verify scores are different, not all the same)
        const scores = ranked.map(r => r.score);
        const uniqueScores = new Set(scores);
        expect(uniqueScores.size).toBeGreaterThan(1);
      }
    });
  });

  describe('Path enumeration limits', () => {
    it('should early terminate when path count exceeds threshold', () => {
      // Create a dense graph with many possible paths
      const numNodes = 10;
      for (let i = 0; i < numNodes; i++) {
        graph.addNode({
          id: `N${i}`,
          type: 'test',
          label: `Node${i}`,
        });
      }

      // Create a highly connected structure (clique-like)
      for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
          graph.addEdge({
            id: `E${i}-${j}`,
            source: `N${i}`,
            target: `N${j}`,
            type: 'test-edge',
          });
        }
      }

      const result = rankPaths(graph, 'N0', 'N9', {
        shortestOnly: false,
        maxLength: 5,
        maxPaths: 100, // Should limit enumeration
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const paths = result.value.value;
        // Should return at most maxPaths paths
        expect(paths.length).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle invalid maxLength gracefully', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      // Negative maxLength should be treated as 0 or 1
      const result = rankPaths(graph, 'A', 'B', {
        shortestOnly: false,
        maxLength: -1,
      });

      expect(result.ok).toBe(true);
    });

    it('should handle zero-length path request', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test-edge' });

      const result = rankPaths(graph, 'A', 'B', {
        shortestOnly: false,
        maxLength: 0,
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        // maxLength=0 should only find direct connections
        const paths = result.value.value;
        paths.forEach(p => {
          expect(p.path.edges.length).toBe(1);
        });
      }
    });
  });

  describe('Integration with other features', () => {
    it('should work with weightMode and non-shortest paths', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });

      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test-edge',
        weight: 1.0,
      });
      graph.addEdge({
        id: 'E2',
        source: 'B',
        target: 'D',
        type: 'test-edge',
        weight: 1.0,
      });
      graph.addEdge({
        id: 'E3',
        source: 'A',
        target: 'C',
        type: 'test-edge',
        weight: 5.0, // Heavy weight
      });
      graph.addEdge({
        id: 'E4',
        source: 'C',
        target: 'D',
        type: 'test-edge',
        weight: 5.0, // Heavy weight
      });

      const result = rankPaths(graph, 'A', 'D', {
        shortestOnly: false,
        maxLength: 3,
        weightMode: 'divide',
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        // Paths with lower weights should be preferred
        expect(result.value.value.length).toBeGreaterThan(0);
      }
    });

    it('should work with traversal modes and non-shortest paths', () => {
      // Create directed graph
      const directedGraph = new Graph<TestNode, TestEdge>(true);
      directedGraph.addNode({ id: 'A', type: 'test', label: 'A' });
      directedGraph.addNode({ id: 'B', type: 'test', label: 'B' });
      directedGraph.addNode({ id: 'C', type: 'test', label: 'C' });
      directedGraph.addNode({ id: 'D', type: 'test', label: 'D' });

      directedGraph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test-edge',
      });
      directedGraph.addEdge({
        id: 'E2',
        source: 'B',
        target: 'D',
        type: 'test-edge',
      });
      directedGraph.addEdge({
        id: 'E3',
        source: 'A',
        target: 'C',
        type: 'test-edge',
      });
      directedGraph.addEdge({
        id: 'E4',
        source: 'C',
        target: 'D',
        type: 'test-edge',
      });

      // Test directed traversal
      const directedResult = rankPaths(directedGraph, 'A', 'D', {
        shortestOnly: false,
        maxLength: 3,
        traversalMode: 'directed',
      });

      expect(directedResult.ok).toBe(true);

      // Test undirected traversal on directed graph
      const undirectedResult = rankPaths(directedGraph, 'A', 'D', {
        shortestOnly: false,
        maxLength: 3,
        traversalMode: 'undirected',
      });

      expect(undirectedResult.ok).toBe(true);
    });
  });
});
