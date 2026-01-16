/**
 * Unit tests for between-graph ground truth computation
 */
import { describe, expect, it } from 'vitest';

import { Graph } from '@bibgraph/algorithms';

import {
  enumerateBetweenGraph,
  enumerateMultiSeedBetweenGraph,
  computeEgoNetwork,
} from './between-graph';

interface TestNode {
  id: string;
}

interface TestEdge {
  source: string;
  target: string;
  type?: string;
}

/**
 * Helper to create a test graph from edges
 */
function createTestGraph(edges: Array<[string, string]>): Graph<TestNode, TestEdge> {
  const graph = new Graph<TestNode, TestEdge>();

  // Collect all unique nodes
  const nodeIds = new Set<string>();
  for (const [source, target] of edges) {
    nodeIds.add(source);
    nodeIds.add(target);
  }

  // Add nodes
  for (const id of nodeIds) {
    graph.addNode({ id });
  }

  // Add edges (both directions for undirected)
  for (const [source, target] of edges) {
    graph.addEdge({ source, target, type: 'edge' });
    graph.addEdge({ source: target, target: source, type: 'edge' });
  }

  return graph;
}

describe('enumerateBetweenGraph', () => {
  describe('Basic path finding', () => {
    it('should find direct path between adjacent nodes', () => {
      const graph = createTestGraph([['A', 'B']]);
      const result = enumerateBetweenGraph(graph, 'A', 'B');

      expect(result.paths.length).toBe(1);
      expect(result.paths[0]).toEqual(['A', 'B']);
      expect(result.nodes.has('A')).toBe(true);
      expect(result.nodes.has('B')).toBe(true);
    });

    it('should find path through intermediate node', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['B', 'C'],
      ]);
      const result = enumerateBetweenGraph(graph, 'A', 'C');

      expect(result.paths.length).toBeGreaterThanOrEqual(1);
      expect(result.nodes.has('A')).toBe(true);
      expect(result.nodes.has('B')).toBe(true);
      expect(result.nodes.has('C')).toBe(true);
    });

    it('should return empty for disconnected nodes', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['C', 'D'],
      ]);
      const result = enumerateBetweenGraph(graph, 'A', 'D');

      expect(result.paths.length).toBe(0);
      expect(result.nodes.size).toBe(0);
    });
  });

  describe('Multiple paths', () => {
    it('should find multiple paths in diamond graph', () => {
      // Diamond: A connects to B and C, both connect to D
      const graph = createTestGraph([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
        ['C', 'D'],
      ]);
      const result = enumerateBetweenGraph(graph, 'A', 'D');

      // Should find paths through B and through C
      expect(result.paths.length).toBeGreaterThanOrEqual(2);
      expect(result.nodes.has('B')).toBe(true);
      expect(result.nodes.has('C')).toBe(true);
    });

    it('should collect all edges on paths', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['B', 'C'],
      ]);
      const result = enumerateBetweenGraph(graph, 'A', 'C');

      expect(result.edges.has('A--B')).toBe(true);
      expect(result.edges.has('B--C')).toBe(true);
    });
  });

  describe('Path length limits', () => {
    it('should respect maxPathLength option', () => {
      // Long chain: A - B - C - D - E - F
      const graph = createTestGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
        ['D', 'E'],
        ['E', 'F'],
      ]);

      // With max length 3, should not find path from A to F (length 6)
      const result = enumerateBetweenGraph(graph, 'A', 'F', { maxPathLength: 3 });
      expect(result.paths.length).toBe(0);

      // With max length 6, should find the path
      const result2 = enumerateBetweenGraph(graph, 'A', 'F', { maxPathLength: 6 });
      expect(result2.paths.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect maxPaths option', () => {
      // Grid-like graph with many paths
      const graph = createTestGraph([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
        ['C', 'D'],
        ['B', 'E'],
        ['C', 'E'],
        ['D', 'F'],
        ['E', 'F'],
      ]);

      const result = enumerateBetweenGraph(graph, 'A', 'F', { maxPaths: 2 });
      expect(result.paths.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Statistics computation', () => {
    it('should compute correct path statistics', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['B', 'C'],
      ]);
      const result = enumerateBetweenGraph(graph, 'A', 'C');

      expect(result.stats.pathCount).toBeGreaterThanOrEqual(1);
      expect(result.stats.minPathLength).toBeGreaterThan(0);
      expect(result.stats.maxPathLength).toBeGreaterThanOrEqual(result.stats.minPathLength);
      expect(result.stats.meanPathLength).toBeGreaterThan(0);
    });

    it('should handle no paths found', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['C', 'D'],
      ]);
      const result = enumerateBetweenGraph(graph, 'A', 'D');

      expect(result.stats.pathCount).toBe(0);
      expect(result.stats.minPathLength).toBe(0);
      expect(result.stats.maxPathLength).toBe(0);
      expect(result.stats.meanPathLength).toBe(0);
    });
  });

  describe('Degree computation', () => {
    it('should compute degrees within between-graph', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['B', 'D'], // D not on A-C path
      ]);
      const result = enumerateBetweenGraph(graph, 'A', 'C');

      // B connects to both A and C within the between-graph
      expect(result.degrees.get('B')).toBe(2);
      // A and C each connect only to B
      expect(result.degrees.get('A')).toBe(1);
      expect(result.degrees.get('C')).toBe(1);
    });
  });
});

describe('enumerateMultiSeedBetweenGraph', () => {
  it('should combine results from multiple seed pairs', () => {
    const graph = createTestGraph([
      ['A', 'B'],
      ['B', 'C'],
      ['D', 'E'],
      ['E', 'F'],
    ]);

    const result = enumerateMultiSeedBetweenGraph(graph, [
      ['A', 'C'],
      ['D', 'F'],
    ]);

    // Should include nodes from both paths
    expect(result.nodes.has('A')).toBe(true);
    expect(result.nodes.has('B')).toBe(true);
    expect(result.nodes.has('C')).toBe(true);
    expect(result.nodes.has('D')).toBe(true);
    expect(result.nodes.has('E')).toBe(true);
    expect(result.nodes.has('F')).toBe(true);
  });

  it('should handle overlapping paths', () => {
    const graph = createTestGraph([
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
    ]);

    const result = enumerateMultiSeedBetweenGraph(graph, [
      ['A', 'C'],
      ['B', 'D'],
    ]);

    // B and C should be in both paths
    expect(result.nodes.has('B')).toBe(true);
    expect(result.nodes.has('C')).toBe(true);
  });

  it('should handle empty seed pairs', () => {
    const graph = createTestGraph([['A', 'B']]);
    const result = enumerateMultiSeedBetweenGraph(graph, []);

    expect(result.nodes.size).toBe(0);
    expect(result.paths.length).toBe(0);
  });
});

describe('computeEgoNetwork', () => {
  describe('Basic functionality', () => {
    it('should include seed node', () => {
      const graph = createTestGraph([['A', 'B']]);
      const result = computeEgoNetwork(graph, 'A', 1);

      expect(result.nodes.has('A')).toBe(true);
    });

    it('should include direct neighbors at k=1', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'], // D is 2 hops from A
      ]);
      const result = computeEgoNetwork(graph, 'A', 1);

      expect(result.nodes.has('A')).toBe(true);
      expect(result.nodes.has('B')).toBe(true);
      expect(result.nodes.has('C')).toBe(true);
      expect(result.nodes.has('D')).toBe(false);
    });

    it('should include 2-hop neighbors at k=2', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'], // D is 3 hops from A
      ]);
      const result = computeEgoNetwork(graph, 'A', 2);

      expect(result.nodes.has('A')).toBe(true);
      expect(result.nodes.has('B')).toBe(true);
      expect(result.nodes.has('C')).toBe(true);
      expect(result.nodes.has('D')).toBe(false);
    });
  });

  describe('Edge collection', () => {
    it('should collect edges within ego network', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'C'],
      ]);
      const result = computeEgoNetwork(graph, 'A', 1);

      expect(result.edges.has('A--B')).toBe(true);
      expect(result.edges.has('A--C')).toBe(true);
      // Note: B--C edge might not be included depending on BFS traversal
    });
  });

  describe('Degree computation', () => {
    it('should compute degrees within ego network', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'C'],
        ['B', 'D'], // D is outside 1-hop ego of A
      ]);
      const result = computeEgoNetwork(graph, 'A', 1);

      // A connects to B and C within ego network
      expect(result.degrees.get('A')).toBe(2);
      // B connects to A (C might or might not be counted depending on edges found)
    });
  });

  describe('Statistics', () => {
    it('should return empty path statistics for single seed', () => {
      const graph = createTestGraph([['A', 'B']]);
      const result = computeEgoNetwork(graph, 'A', 1);

      expect(result.paths.length).toBe(0);
      expect(result.stats.pathCount).toBe(0);
    });
  });

  describe('Default parameter', () => {
    it('should use k=3 by default', () => {
      const graph = createTestGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
        ['D', 'E'], // E is 4 hops from A
      ]);
      const result = computeEgoNetwork(graph, 'A');

      expect(result.nodes.has('D')).toBe(true);
      expect(result.nodes.has('E')).toBe(false);
    });
  });

  describe('Isolated node', () => {
    it('should handle isolated seed node', () => {
      const graph = new Graph<TestNode, TestEdge>();
      graph.addNode({ id: 'A' });

      const result = computeEgoNetwork(graph, 'A', 3);

      expect(result.nodes.size).toBe(1);
      expect(result.nodes.has('A')).toBe(true);
      expect(result.edges.size).toBe(0);
    });
  });
});
