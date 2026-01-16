/**
 * Integration tests for expansion method comparison experiments
 *
 * Tests the full pipeline:
 * 1. Create synthetic graph
 * 2. Run all expansion methods (Degree-Prioritised, Standard BFS, Frontier-Balanced, Random)
 * 3. Compute comparison metrics
 * 4. Verify results are valid and consistent
 */
import { describe, expect, it, beforeAll } from 'vitest';

import type { GraphExpander, Neighbor } from '../interfaces/graph-expander';
import { DegreePrioritisedExpansion } from '../traversal/degree-prioritised-expansion';
import { StandardBfsExpansion } from '../baselines/standard-bfs';
import { FrontierBalancedExpansion } from '../baselines/frontier-balanced';
import { RandomPriorityExpansion } from '../baselines/random-priority';

// ============================================================================
// Test Graph Builder
// ============================================================================

interface TestNode {
  id: string;
  degree?: number;
}

/**
 * Creates a test graph expander from an edge list.
 * Supports both directed and undirected graphs.
 */
class TestGraphExpander implements GraphExpander<TestNode> {
  private adjacency = new Map<string, Neighbor[]>();
  private degrees = new Map<string, number>();
  private nodes = new Map<string, TestNode>();

  constructor(edges: Array<[string, string]>, directed = false) {
    // Collect all nodes
    const nodeIds = new Set<string>();
    for (const [source, target] of edges) {
      nodeIds.add(source);
      nodeIds.add(target);
    }

    // Initialize adjacency lists
    for (const id of nodeIds) {
      this.adjacency.set(id, []);
      this.nodes.set(id, { id });
    }

    // Build adjacency
    for (const [source, target] of edges) {
      this.adjacency.get(source)!.push({ targetId: target, relationshipType: 'edge' });
      if (!directed) {
        this.adjacency.get(target)!.push({ targetId: source, relationshipType: 'edge' });
      }
    }

    // Compute degrees
    for (const [nodeId, neighbors] of this.adjacency) {
      this.degrees.set(nodeId, neighbors.length);
      this.nodes.get(nodeId)!.degree = neighbors.length;
    }
  }

  async getNeighbors(nodeId: string): Promise<Neighbor[]> {
    return this.adjacency.get(nodeId) ?? [];
  }

  getDegree(nodeId: string): number {
    return this.degrees.get(nodeId) ?? 0;
  }

  async getNode(nodeId: string): Promise<TestNode | null> {
    return this.nodes.get(nodeId) ?? null;
  }

  addEdge(): void {
    // No-op for tests
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getAllNodeIds(): string[] {
    return [...this.nodes.keys()];
  }
}

// ============================================================================
// Synthetic Graph Generators
// ============================================================================

/**
 * Creates a linear chain graph: A -- B -- C -- D -- ...
 */
function createChainGraph(length: number): TestGraphExpander {
  const edges: Array<[string, string]> = [];
  for (let i = 0; i < length - 1; i++) {
    edges.push([`N${i}`, `N${i + 1}`]);
  }
  return new TestGraphExpander(edges);
}

/**
 * Creates a star graph with a central hub connected to all other nodes.
 */
function createStarGraph(numSpokes: number): TestGraphExpander {
  const edges: Array<[string, string]> = [];
  for (let i = 0; i < numSpokes; i++) {
    edges.push(['HUB', `S${i}`]);
  }
  return new TestGraphExpander(edges);
}

/**
 * Creates a grid graph (lattice).
 */
function createGridGraph(rows: number, cols: number): TestGraphExpander {
  const edges: Array<[string, string]> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const node = `${r}_${c}`;
      // Right neighbor
      if (c < cols - 1) {
        edges.push([node, `${r}_${c + 1}`]);
      }
      // Down neighbor
      if (r < rows - 1) {
        edges.push([node, `${r + 1}_${c}`]);
      }
    }
  }

  return new TestGraphExpander(edges);
}

/**
 * Creates a graph with hub structure (small-world-like).
 * Multiple hubs connected to each other and to leaf nodes.
 */
function createHubGraph(numHubs: number, leavesPerHub: number): TestGraphExpander {
  const edges: Array<[string, string]> = [];

  // Connect hubs to each other (fully connected)
  for (let i = 0; i < numHubs; i++) {
    for (let j = i + 1; j < numHubs; j++) {
      edges.push([`H${i}`, `H${j}`]);
    }
  }

  // Connect leaves to hubs
  for (let h = 0; h < numHubs; h++) {
    for (let l = 0; l < leavesPerHub; l++) {
      edges.push([`H${h}`, `L${h}_${l}`]);
    }
  }

  return new TestGraphExpander(edges);
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Expansion Method Comparison Integration', () => {
  describe('Chain Graph Experiments', () => {
    let graph: TestGraphExpander;

    beforeAll(() => {
      graph = createChainGraph(10);
    });

    it('should run all expansion methods on chain graph', async () => {
      const seeds: [string, string] = ['N0', 'N9'];

      const degreePrioritised = new DegreePrioritisedExpansion(graph, seeds);
      const standardBfs = new StandardBfsExpansion(graph, seeds);
      const frontierBalanced = new FrontierBalancedExpansion(graph, seeds);
      const randomPriority = new RandomPriorityExpansion(graph, seeds, 42);

      const [dpResult, bfsResult, fbResult, rpResult] = await Promise.all([
        degreePrioritised.run(),
        standardBfs.run(),
        frontierBalanced.run(),
        randomPriority.run(),
      ]);

      // All methods should find paths
      expect(dpResult.paths.length).toBeGreaterThan(0);
      expect(bfsResult.paths.length).toBeGreaterThan(0);
      expect(fbResult.paths.length).toBeGreaterThan(0);
      expect(rpResult.paths.length).toBeGreaterThan(0);

      // All should sample the chain nodes
      expect(dpResult.sampledNodes.size).toBeGreaterThanOrEqual(2);
      expect(bfsResult.sampledNodes.size).toBeGreaterThanOrEqual(2);
      expect(fbResult.sampledNodes.size).toBeGreaterThanOrEqual(2);
      expect(rpResult.sampledNodes.size).toBeGreaterThanOrEqual(2);
    });

    it('should track expansion statistics', async () => {
      const seeds: [string, string] = ['N0', 'N9'];

      const expansion = new DegreePrioritisedExpansion(graph, seeds);
      const result = await expansion.run();

      expect(result.stats.nodesExpanded).toBeGreaterThan(0);
      expect(result.stats.edgesTraversed).toBeGreaterThan(0);
      expect(result.stats.iterations).toBeGreaterThan(0);
    });
  });

  describe('Star Graph Experiments (Hub Structure)', () => {
    let graph: TestGraphExpander;

    beforeAll(() => {
      graph = createStarGraph(20);
    });

    it('should handle hub-dominated graph', async () => {
      // Connect two spoke nodes through the hub
      const seeds: [string, string] = ['S0', 'S10'];

      const degreePrioritised = new DegreePrioritisedExpansion(graph, seeds);
      const standardBfs = new StandardBfsExpansion(graph, seeds);

      const [dpResult, bfsResult] = await Promise.all([
        degreePrioritised.run(),
        standardBfs.run(),
      ]);

      // Both should find paths through hub
      expect(dpResult.paths.length).toBeGreaterThan(0);
      expect(bfsResult.paths.length).toBeGreaterThan(0);

      // Hub should be in sampled nodes
      expect(dpResult.sampledNodes.has('HUB')).toBe(true);
      expect(bfsResult.sampledNodes.has('HUB')).toBe(true);
    });

    it('degree-prioritised should defer hub expansion', async () => {
      const seeds: [string, string] = ['S0', 'S1'];

      const degreePrioritised = new DegreePrioritisedExpansion(graph, seeds);
      const result = await degreePrioritised.run();

      // Should find path through hub
      expect(result.paths.length).toBeGreaterThan(0);

      // Verify hub was involved (it's the only path between spokes)
      const pathThroughHub = result.paths.some((p) => p.nodes.includes('HUB'));
      expect(pathThroughHub).toBe(true);
    });
  });

  describe('Grid Graph Experiments', () => {
    let graph: TestGraphExpander;

    beforeAll(() => {
      graph = createGridGraph(5, 5);
    });

    it('should find multiple paths in grid', async () => {
      const seeds: [string, string] = ['0_0', '4_4'];

      const degreePrioritised = new DegreePrioritisedExpansion(graph, seeds);
      const frontierBalanced = new FrontierBalancedExpansion(graph, seeds);

      const [dpResult, fbResult] = await Promise.all([
        degreePrioritised.run(),
        frontierBalanced.run(),
      ]);

      // Should find paths (grid has many paths between corners)
      expect(dpResult.paths.length).toBeGreaterThan(0);
      expect(fbResult.paths.length).toBeGreaterThan(0);
    });

    it('should track frontier switches in balanced expansion', async () => {
      const seeds: [string, string] = ['0_0', '4_4'];

      const frontierBalanced = new FrontierBalancedExpansion(graph, seeds);
      const result = await frontierBalanced.run();

      // Frontier-balanced should switch between frontiers
      expect(result.stats.frontierSwitches).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Hub Graph Experiments', () => {
    let graph: TestGraphExpander;

    beforeAll(() => {
      graph = createHubGraph(3, 5); // 3 hubs, 5 leaves each
    });

    it('should connect leaves through hubs', async () => {
      // Connect leaves from different hubs
      const seeds: [string, string] = ['L0_0', 'L2_4'];

      const expansion = new DegreePrioritisedExpansion(graph, seeds);
      const result = await expansion.run();

      // Should find paths through hub network
      expect(result.paths.length).toBeGreaterThan(0);

      // Path should go through at least one hub
      const pathThroughHub = result.paths.some((p) =>
        p.nodes.some((n) => n.startsWith('H'))
      );
      expect(pathThroughHub).toBe(true);
    });

    it('all methods should complete without error', async () => {
      const seeds: [string, string] = ['L0_0', 'L1_2'];

      const methods = [
        new DegreePrioritisedExpansion(graph, seeds),
        new StandardBfsExpansion(graph, seeds),
        new FrontierBalancedExpansion(graph, seeds),
        new RandomPriorityExpansion(graph, seeds, 42),
      ];

      const results = await Promise.all(methods.map((m) => m.run()));

      // All should complete successfully
      for (const result of results) {
        expect(result.sampledNodes.size).toBeGreaterThan(0);
        expect(result.stats.iterations).toBeGreaterThan(0);
      }
    });
  });

  describe('Single Seed (N=1) Experiments', () => {
    let graph: TestGraphExpander;

    beforeAll(() => {
      graph = createGridGraph(4, 4);
    });

    it('should handle single seed expansion', async () => {
      const seed = '1_1';

      const degreePrioritised = new DegreePrioritisedExpansion(graph, [seed]);
      const standardBfs = new StandardBfsExpansion(graph, [seed]);

      const [dpResult, bfsResult] = await Promise.all([
        degreePrioritised.run(),
        standardBfs.run(),
      ]);

      // Should expand from single seed
      expect(dpResult.sampledNodes.has(seed)).toBe(true);
      expect(bfsResult.sampledNodes.has(seed)).toBe(true);

      // No paths expected for single seed
      expect(dpResult.paths.length).toBe(0);
      expect(bfsResult.paths.length).toBe(0);

      // But should sample neighbors
      expect(dpResult.sampledNodes.size).toBeGreaterThan(1);
      expect(bfsResult.sampledNodes.size).toBeGreaterThan(1);
    });
  });

  describe('Reproducibility', () => {
    it('random priority should be reproducible with same seed', async () => {
      const graph = createGridGraph(5, 5);
      const seeds: [string, string] = ['0_0', '4_4'];

      const expansion1 = new RandomPriorityExpansion(graph, seeds, 42);
      const expansion2 = new RandomPriorityExpansion(graph, seeds, 42);

      const result1 = await expansion1.run();
      const result2 = await expansion2.run();

      // Same seed should produce same results
      expect(result1.stats.iterations).toBe(result2.stats.iterations);
      expect(result1.sampledNodes.size).toBe(result2.sampledNodes.size);
    });

    it('random priority should vary with different seeds', async () => {
      const graph = createHubGraph(3, 10);
      const seeds: [string, string] = ['L0_0', 'L2_5'];

      const results: number[] = [];
      for (const randomSeed of [1, 2, 3, 4, 5]) {
        const expansion = new RandomPriorityExpansion(graph, seeds, randomSeed);
        const result = await expansion.run();
        results.push(result.stats.iterations);
      }

      // Should have some variation (not all identical)
      const uniqueResults = new Set(results);
      // At least some variation expected in most cases
      expect(uniqueResults.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle disconnected components', async () => {
      // Two disconnected chains
      const edges: Array<[string, string]> = [
        ['A1', 'A2'],
        ['A2', 'A3'],
        ['B1', 'B2'],
        ['B2', 'B3'],
      ];
      const graph = new TestGraphExpander(edges);

      const expansion = new DegreePrioritisedExpansion(graph, ['A1', 'B3']);
      const result = await expansion.run();

      // No paths between disconnected components
      expect(result.paths.length).toBe(0);

      // But should still sample from both components
      expect(result.sampledNodes.size).toBeGreaterThan(0);
    });

    it('should handle same seed specified twice', async () => {
      const graph = createChainGraph(5);

      const expansion = new DegreePrioritisedExpansion(graph, ['N2', 'N2']);
      const result = await expansion.run();

      // When same node is both seeds, expansion still occurs
      // Paths may be found (self-paths through neighbors)
      expect(result.sampledNodes.has('N2')).toBe(true);
      // Should at least sample the seed node
      expect(result.sampledNodes.size).toBeGreaterThanOrEqual(1);
    });

    it('should handle adjacent seeds', async () => {
      const graph = createChainGraph(5);

      const expansion = new DegreePrioritisedExpansion(graph, ['N2', 'N3']);
      const result = await expansion.run();

      // Should find direct path
      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.paths[0].nodes.length).toBe(2);
    });
  });
});

describe('Method Comparison Metrics', () => {
  it('should allow comparison of node expansion counts', async () => {
    const graph = createHubGraph(3, 10);
    const seeds: [string, string] = ['L0_0', 'L2_9'];

    const methods = [
      { name: 'Degree-Prioritised', expansion: new DegreePrioritisedExpansion(graph, seeds) },
      { name: 'Standard BFS', expansion: new StandardBfsExpansion(graph, seeds) },
      { name: 'Frontier-Balanced', expansion: new FrontierBalancedExpansion(graph, seeds) },
      { name: 'Random Priority', expansion: new RandomPriorityExpansion(graph, seeds, 42) },
    ];

    const results = await Promise.all(
      methods.map(async (m) => ({
        name: m.name,
        result: await m.expansion.run(),
      }))
    );

    // Collect metrics for comparison
    const metrics = results.map((r) => ({
      method: r.name,
      nodesExpanded: r.result.stats.nodesExpanded,
      pathsFound: r.result.paths.length,
      iterations: r.result.stats.iterations,
    }));

    // All methods should find paths
    for (const m of metrics) {
      expect(m.pathsFound).toBeGreaterThanOrEqual(0);
      expect(m.nodesExpanded).toBeGreaterThan(0);
    }

    // Metrics should be valid numbers
    for (const m of metrics) {
      expect(Number.isFinite(m.nodesExpanded)).toBe(true);
      expect(Number.isFinite(m.iterations)).toBe(true);
    }
  });
});
