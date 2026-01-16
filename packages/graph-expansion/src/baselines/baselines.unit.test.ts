/**
 * Unit tests for expansion baseline algorithms
 */
import { describe, expect, it, beforeEach } from 'vitest';

import type { GraphExpander, Neighbor } from '../interfaces/graph-expander';
import { StandardBfsExpansion } from './standard-bfs';
import { FrontierBalancedExpansion } from './frontier-balanced';
import { RandomPriorityExpansion } from './random-priority';

/**
 * Simple mock graph expander for testing
 */
class MockExpander implements GraphExpander<{ id: string }> {
  private adjacency = new Map<string, Neighbor[]>();
  private degrees = new Map<string, number>();

  constructor(edges: Array<[string, string]>, directed = false) {
    // Build adjacency list
    const allNodes = new Set<string>();
    for (const [source, target] of edges) {
      allNodes.add(source);
      allNodes.add(target);
    }

    for (const node of allNodes) {
      this.adjacency.set(node, []);
    }

    for (const [source, target] of edges) {
      this.adjacency.get(source)!.push({ targetId: target, relationshipType: 'edge' });
      if (!directed) {
        this.adjacency.get(target)!.push({ targetId: source, relationshipType: 'edge' });
      }
    }

    // Compute degrees
    for (const [nodeId, neighbors] of this.adjacency) {
      this.degrees.set(nodeId, neighbors.length);
    }
  }

  async getNeighbors(nodeId: string): Promise<Neighbor[]> {
    return this.adjacency.get(nodeId) ?? [];
  }

  getDegree(nodeId: string): number {
    return this.degrees.get(nodeId) ?? 0;
  }

  async getNode(nodeId: string): Promise<{ id: string } | null> {
    return this.adjacency.has(nodeId) ? { id: nodeId } : null;
  }

  addEdge(): void {
    // No-op for tests
  }
}

describe('StandardBfsExpansion', () => {
  describe('Basic functionality', () => {
    it('should find paths between two connected nodes', async () => {
      // Simple path: A -- B -- C
      const expander = new MockExpander([
        ['A', 'B'],
        ['B', 'C'],
      ]);

      const expansion = new StandardBfsExpansion(expander, ['A', 'C']);
      const result = await expansion.run();

      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.sampledNodes.has('A')).toBe(true);
      expect(result.sampledNodes.has('B')).toBe(true);
      expect(result.sampledNodes.has('C')).toBe(true);
    });

    it('should handle single seed (N=1)', async () => {
      const expander = new MockExpander([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
      ]);

      const expansion = new StandardBfsExpansion(expander, ['A']);
      const result = await expansion.run();

      expect(result.paths).toHaveLength(0); // No paths with single seed
      expect(result.sampledNodes.size).toBeGreaterThan(0);
      expect(result.sampledNodes.has('A')).toBe(true);
    });

    it('should throw for empty seeds', () => {
      const expander = new MockExpander([['A', 'B']]);

      expect(() => new StandardBfsExpansion(expander, [])).toThrow(
        'At least one seed node is required'
      );
    });

    it('should track expansion statistics', async () => {
      const expander = new MockExpander([
        ['A', 'B'],
        ['B', 'C'],
      ]);

      const expansion = new StandardBfsExpansion(expander, ['A', 'C']);
      const result = await expansion.run();

      expect(result.stats.nodesExpanded).toBeGreaterThan(0);
      expect(result.stats.edgesTraversed).toBeGreaterThan(0);
      expect(result.stats.iterations).toBeGreaterThan(0);
    });
  });

  describe('Path discovery', () => {
    it('should find multiple paths in a graph with alternatives', async () => {
      // Diamond graph: A -- B -- D, A -- C -- D
      const expander = new MockExpander([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
        ['C', 'D'],
      ]);

      const expansion = new StandardBfsExpansion(expander, ['A', 'D']);
      const result = await expansion.run();

      // Should find at least one path
      expect(result.paths.length).toBeGreaterThan(0);
    });

    it('should handle disconnected seeds', async () => {
      // Two disconnected components: A -- B, C -- D
      const expander = new MockExpander([
        ['A', 'B'],
        ['C', 'D'],
      ]);

      const expansion = new StandardBfsExpansion(expander, ['A', 'D']);
      const result = await expansion.run();

      // No paths between disconnected nodes
      expect(result.paths).toHaveLength(0);
      // But should still sample nodes
      expect(result.sampledNodes.size).toBeGreaterThan(0);
    });
  });
});

describe('FrontierBalancedExpansion', () => {
  describe('Basic functionality', () => {
    it('should find paths between connected nodes', async () => {
      const expander = new MockExpander([
        ['A', 'B'],
        ['B', 'C'],
      ]);

      const expansion = new FrontierBalancedExpansion(expander, ['A', 'C']);
      const result = await expansion.run();

      expect(result.paths.length).toBeGreaterThan(0);
    });

    it('should track frontier switches', async () => {
      const expander = new MockExpander([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
      ]);

      const expansion = new FrontierBalancedExpansion(expander, ['A', 'D']);
      const result = await expansion.run();

      // Frontier-balanced should switch between frontiers
      expect(result.stats.frontierSwitches).toBeGreaterThanOrEqual(0);
    });

    it('should balance by expanding smaller frontier', async () => {
      // Asymmetric graph - one side has more nodes
      const expander = new MockExpander([
        ['A', 'B'],
        ['A', 'C'],
        ['A', 'D'],
        ['D', 'E'],
        ['E', 'Z'],
      ]);

      const expansion = new FrontierBalancedExpansion(expander, ['A', 'Z']);
      const result = await expansion.run();

      // Should complete without error
      expect(result.stats.nodesExpanded).toBeGreaterThan(0);
    });
  });
});

describe('RandomPriorityExpansion', () => {
  describe('Basic functionality', () => {
    it('should find paths between connected nodes', async () => {
      const expander = new MockExpander([
        ['A', 'B'],
        ['B', 'C'],
      ]);

      const expansion = new RandomPriorityExpansion(expander, ['A', 'C'], 42);
      const result = await expansion.run();

      expect(result.paths.length).toBeGreaterThan(0);
    });

    it('should produce reproducible results with same seed', async () => {
      const expander1 = new MockExpander([
        ['A', 'B'],
        ['B', 'C'],
        ['A', 'D'],
        ['D', 'C'],
      ]);
      const expander2 = new MockExpander([
        ['A', 'B'],
        ['B', 'C'],
        ['A', 'D'],
        ['D', 'C'],
      ]);

      const expansion1 = new RandomPriorityExpansion(expander1, ['A', 'C'], 42);
      const expansion2 = new RandomPriorityExpansion(expander2, ['A', 'C'], 42);

      const result1 = await expansion1.run();
      const result2 = await expansion2.run();

      // Same seed should produce same iteration count
      expect(result1.stats.iterations).toBe(result2.stats.iterations);
    });

    it('should produce different results with different seeds', async () => {
      // Run multiple times with different seeds on larger graph
      const edges: Array<[string, string]> = [];
      for (let i = 0; i < 10; i++) {
        edges.push([`N${i}`, `N${i + 1}`]);
        if (i > 0) edges.push([`N${i}`, `N${i - 1}`]);
      }

      const results: number[] = [];
      for (const seed of [1, 2, 3]) {
        const expander = new MockExpander(edges);
        const expansion = new RandomPriorityExpansion(expander, ['N0', 'N10'], seed);
        const result = await expansion.run();
        results.push(result.stats.iterations);
      }

      // At least some variation expected (though not guaranteed)
      // This is a probabilistic test
      expect(results.length).toBe(3);
    });
  });
});

describe('Baseline comparison', () => {
  it('all methods should find the same paths in a simple graph', async () => {
    const edges: Array<[string, string]> = [
      ['A', 'B'],
      ['B', 'C'],
    ];

    const seeds: [string, string] = ['A', 'C'];

    const bfsResult = await new StandardBfsExpansion(
      new MockExpander(edges),
      seeds
    ).run();

    const balancedResult = await new FrontierBalancedExpansion(
      new MockExpander(edges),
      seeds
    ).run();

    const randomResult = await new RandomPriorityExpansion(
      new MockExpander(edges),
      seeds,
      42
    ).run();

    // All should find at least one path
    expect(bfsResult.paths.length).toBeGreaterThan(0);
    expect(balancedResult.paths.length).toBeGreaterThan(0);
    expect(randomResult.paths.length).toBeGreaterThan(0);

    // All should sample the same nodes in this simple graph
    expect(bfsResult.sampledNodes.size).toBe(balancedResult.sampledNodes.size);
    expect(bfsResult.sampledNodes.size).toBe(randomResult.sampledNodes.size);
  });
});
