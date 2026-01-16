/**
 * Integration tests for structural representativeness experiments
 *
 * Tests the full pipeline:
 * 1. Create synthetic graph
 * 2. Compute ground truth between-graph
 * 3. Run expansion methods
 * 4. Compute representativeness metrics
 * 5. Verify metrics are valid
 */
import { describe, expect, it, beforeAll } from 'vitest';

import { Graph } from '../../../algorithms/src/index';
import type { GraphExpander, Neighbor } from '../../../graph-expansion/src/interfaces/graph-expander';
import { DegreePrioritisedExpansion } from '../../../graph-expansion/src/traversal/degree-prioritised-expansion';
import { StandardBfsExpansion } from '../../../graph-expansion/src/baselines/standard-bfs';
import { FrontierBalancedExpansion } from '../../../graph-expansion/src/baselines/frontier-balanced';
import { RandomPriorityExpansion } from '../../../graph-expansion/src/baselines/random-priority';

import {
  enumerateBetweenGraph,
  computeEgoNetwork,
} from '../ground-truth/between-graph';
import {
  computeStructuralRepresentativeness,
  aggregateRepresentativenessResults,
} from '../metrics/structural-representativeness';
import {
  computePathDiversityMetrics,
  identifyHubNodes,
} from '../metrics/path-diversity';
import { compareDegreeDistributions } from '../metrics/degree-distribution';

// ============================================================================
// Test Infrastructure
// ============================================================================

interface TestNode {
  id: string;
}

interface TestEdge {
  source: string;
  target: string;
  type?: string;
}

/**
 * Adapter to use Graph class with expansion algorithms
 */
class GraphExpanderAdapter implements GraphExpander<TestNode> {
  private adjacency = new Map<string, Neighbor[]>();
  private degrees = new Map<string, number>();
  private nodes = new Map<string, TestNode>();

  constructor(
    private readonly graph: Graph<TestNode, TestEdge>,
    directed = false
  ) {
    for (const node of graph.getAllNodes()) {
      this.nodes.set(node.id, node);
      this.adjacency.set(node.id, []);
    }

    for (const edge of graph.getAllEdges()) {
      const neighbors = this.adjacency.get(edge.source) ?? [];
      neighbors.push({ targetId: edge.target, relationshipType: edge.type ?? 'edge' });
      this.adjacency.set(edge.source, neighbors);

      if (!directed) {
        const reverseNeighbors = this.adjacency.get(edge.target) ?? [];
        reverseNeighbors.push({ targetId: edge.source, relationshipType: edge.type ?? 'edge' });
        this.adjacency.set(edge.target, reverseNeighbors);
      }
    }

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

  async getNode(nodeId: string): Promise<TestNode | null> {
    return this.nodes.get(nodeId) ?? null;
  }

  addEdge(): void {
    // No-op
  }

  getAllDegrees(): Map<string, number> {
    return this.degrees;
  }
}

/**
 * Create a test graph from edge list
 */
function createGraph(edges: Array<[string, string]>): Graph<TestNode, TestEdge> {
  const graph = new Graph<TestNode, TestEdge>();

  const nodeIds = new Set<string>();
  for (const [source, target] of edges) {
    nodeIds.add(source);
    nodeIds.add(target);
  }

  for (const id of nodeIds) {
    graph.addNode({ id });
  }

  for (const [source, target] of edges) {
    graph.addEdge({ source, target, type: 'edge' });
    graph.addEdge({ source: target, target: source, type: 'edge' });
  }

  return graph;
}

// ============================================================================
// Synthetic Graph Generators
// ============================================================================

function createChainGraph(length: number): Graph<TestNode, TestEdge> {
  const edges: Array<[string, string]> = [];
  for (let i = 0; i < length - 1; i++) {
    edges.push([`N${i}`, `N${i + 1}`]);
  }
  return createGraph(edges);
}

function createGridGraph(rows: number, cols: number): Graph<TestNode, TestEdge> {
  const edges: Array<[string, string]> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const node = `${r}_${c}`;
      if (c < cols - 1) {
        edges.push([node, `${r}_${c + 1}`]);
      }
      if (r < rows - 1) {
        edges.push([node, `${r + 1}_${c}`]);
      }
    }
  }

  return createGraph(edges);
}

function createHubGraph(numHubs: number, leavesPerHub: number): Graph<TestNode, TestEdge> {
  const edges: Array<[string, string]> = [];

  // Connect hubs
  for (let i = 0; i < numHubs; i++) {
    for (let j = i + 1; j < numHubs; j++) {
      edges.push([`H${i}`, `H${j}`]);
    }
  }

  // Connect leaves
  for (let h = 0; h < numHubs; h++) {
    for (let l = 0; l < leavesPerHub; l++) {
      edges.push([`H${h}`, `L${h}_${l}`]);
    }
  }

  return createGraph(edges);
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Structural Representativeness Integration', () => {
  describe('Between-Graph Ground Truth', () => {
    it('should enumerate between-graph for chain', () => {
      const graph = createChainGraph(7);
      const result = enumerateBetweenGraph(graph, 'N0', 'N6');

      // Should find the path through the chain
      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.nodes.size).toBe(7); // All nodes on the path

      // Statistics should be valid
      expect(result.stats.pathCount).toBeGreaterThan(0);
      expect(result.stats.meanPathLength).toBeGreaterThan(0);
    });

    it('should enumerate between-graph for grid', () => {
      const graph = createGridGraph(4, 4);
      const result = enumerateBetweenGraph(graph, '0_0', '3_3', { maxPaths: 100 });

      // Grid has multiple paths between corners
      expect(result.paths.length).toBeGreaterThan(1);
      expect(result.nodes.size).toBeGreaterThan(2);
    });

    it('should compute ego network', () => {
      const graph = createGridGraph(5, 5);
      const result = computeEgoNetwork(graph, '2_2', 2);

      // Should include center and 2-hop neighbors
      expect(result.nodes.has('2_2')).toBe(true);
      expect(result.nodes.size).toBeGreaterThan(1);

      // Degrees should be computed
      expect(result.degrees.size).toBe(result.nodes.size);
    });
  });

  describe('Full Representativeness Pipeline', () => {
    let graph: Graph<TestNode, TestEdge>;
    let expander: GraphExpanderAdapter;

    beforeAll(() => {
      graph = createGridGraph(6, 6);
      expander = new GraphExpanderAdapter(graph, false);
    });

    it('should compute representativeness for expansion vs ground truth', async () => {
      const seedA = '0_0';
      const seedB = '5_5';

      // Compute ground truth
      const groundTruth = enumerateBetweenGraph(graph, seedA, seedB, {
        maxPathLength: 12,
        maxPaths: 500,
      });

      // Run expansion
      const expansion = new DegreePrioritisedExpansion(expander, [seedA, seedB]);
      const result = await expansion.run();

      // Compute sampled degrees
      const sampledDegrees = new Map<string, number>();
      for (const nodeId of result.sampledNodes) {
        sampledDegrees.set(nodeId, expander.getDegree(nodeId));
      }

      // Compute representativeness
      const metrics = computeStructuralRepresentativeness(
        result.sampledNodes,
        groundTruth.nodes,
        sampledDegrees,
        groundTruth.degrees
      );

      // Metrics should be in valid ranges
      expect(metrics.coverage).toBeGreaterThanOrEqual(0);
      expect(metrics.coverage).toBeLessThanOrEqual(1);
      expect(metrics.precision).toBeGreaterThanOrEqual(0);
      expect(metrics.precision).toBeLessThanOrEqual(1);
      expect(metrics.f1Score).toBeGreaterThanOrEqual(0);
      expect(metrics.f1Score).toBeLessThanOrEqual(1);
      expect(metrics.degreeKL).toBeGreaterThanOrEqual(0);
    });

    it('should compare all expansion methods', async () => {
      const seedA = '1_1';
      const seedB = '4_4';

      // Compute ground truth
      const groundTruth = enumerateBetweenGraph(graph, seedA, seedB, {
        maxPathLength: 8,
        maxPaths: 200,
      });

      if (groundTruth.nodes.size < 3) {
        // Skip if ground truth is too small
        return;
      }

      const methods = [
        { name: 'Degree-Prioritised', expansion: new DegreePrioritisedExpansion(expander, [seedA, seedB]) },
        { name: 'Standard BFS', expansion: new StandardBfsExpansion(expander, [seedA, seedB]) },
        { name: 'Frontier-Balanced', expansion: new FrontierBalancedExpansion(expander, [seedA, seedB]) },
        { name: 'Random Priority', expansion: new RandomPriorityExpansion(expander, [seedA, seedB], 42) },
      ];

      const results = await Promise.all(
        methods.map(async (m) => {
          const result = await m.expansion.run();

          const sampledDegrees = new Map<string, number>();
          for (const nodeId of result.sampledNodes) {
            sampledDegrees.set(nodeId, expander.getDegree(nodeId));
          }

          const metrics = computeStructuralRepresentativeness(
            result.sampledNodes,
            groundTruth.nodes,
            sampledDegrees,
            groundTruth.degrees
          );

          return { name: m.name, metrics };
        })
      );

      // All methods should produce valid metrics
      for (const r of results) {
        expect(r.metrics.coverage).toBeGreaterThanOrEqual(0);
        expect(r.metrics.precision).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(r.metrics.degreeKL)).toBe(true);
      }
    });
  });

  describe('Ego Network Representativeness (N=1)', () => {
    it('should compare expansion to ego network ground truth', async () => {
      const graph = createGridGraph(7, 7);
      const expander = new GraphExpanderAdapter(graph, false);
      const seed = '3_3';

      // Compute ground truth ego network
      const groundTruth = computeEgoNetwork(graph, seed, 3);

      // Run single-seed expansion
      const expansion = new DegreePrioritisedExpansion(expander, [seed]);
      const result = await expansion.run();

      // Compute degrees
      const sampledDegrees = new Map<string, number>();
      for (const nodeId of result.sampledNodes) {
        sampledDegrees.set(nodeId, expander.getDegree(nodeId));
      }

      // Compute representativeness
      const metrics = computeStructuralRepresentativeness(
        result.sampledNodes,
        groundTruth.nodes,
        sampledDegrees,
        groundTruth.degrees
      );

      // Should have some coverage
      expect(metrics.coverage).toBeGreaterThan(0);
      expect(metrics.intersectionSize).toBeGreaterThan(0);
    });
  });

  describe('Aggregation', () => {
    it('should aggregate results across multiple seed pairs', async () => {
      const graph = createGridGraph(5, 5);
      const expander = new GraphExpanderAdapter(graph, false);

      const seedPairs: Array<[string, string]> = [
        ['0_0', '4_4'],
        ['0_4', '4_0'],
        ['2_0', '2_4'],
      ];

      const allMetrics = [];

      for (const [seedA, seedB] of seedPairs) {
        const groundTruth = enumerateBetweenGraph(graph, seedA, seedB, {
          maxPathLength: 10,
          maxPaths: 100,
        });

        if (groundTruth.nodes.size < 3) continue;

        const expansion = new DegreePrioritisedExpansion(expander, [seedA, seedB]);
        const result = await expansion.run();

        const sampledDegrees = new Map<string, number>();
        for (const nodeId of result.sampledNodes) {
          sampledDegrees.set(nodeId, expander.getDegree(nodeId));
        }

        const metrics = computeStructuralRepresentativeness(
          result.sampledNodes,
          groundTruth.nodes,
          sampledDegrees,
          groundTruth.degrees
        );

        allMetrics.push(metrics);
      }

      if (allMetrics.length > 0) {
        const aggregated = aggregateRepresentativenessResults(allMetrics);

        // Aggregated metrics should be averages
        expect(aggregated.coverage).toBeGreaterThanOrEqual(0);
        expect(aggregated.coverage).toBeLessThanOrEqual(1);
        expect(Number.isFinite(aggregated.degreeKL)).toBe(true);
      }
    });
  });
});

describe('Path Diversity Integration', () => {
  it('should compute diversity metrics for expansion results', async () => {
    const graph = createGridGraph(5, 5);
    const expander = new GraphExpanderAdapter(graph, false);

    const expansion = new DegreePrioritisedExpansion(expander, ['0_0', '4_4']);
    const result = await expansion.run();

    // Convert paths to string arrays
    const pathArrays = result.paths.map((p) => p.nodes);

    if (pathArrays.length > 0) {
      const diversity = computePathDiversityMetrics(pathArrays);

      expect(diversity.pathCount).toBe(pathArrays.length);
      expect(diversity.uniqueNodeCount).toBeGreaterThan(0);
      expect(diversity.meanPathLength).toBeGreaterThan(0);

      if (pathArrays.length > 1) {
        expect(diversity.nodeJaccardDistance).toBeGreaterThanOrEqual(0);
        expect(diversity.nodeJaccardDistance).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should compute hub coverage', async () => {
    const graph = createHubGraph(3, 8);
    const expander = new GraphExpanderAdapter(graph, false);

    // Identify hubs
    const hubNodes = identifyHubNodes(expander.getAllDegrees(), 0.2);

    const expansion = new DegreePrioritisedExpansion(expander, ['L0_0', 'L2_7']);
    const result = await expansion.run();

    const pathArrays = result.paths.map((p) => p.nodes);

    if (pathArrays.length > 0) {
      // Paths between leaves should go through hubs
      const hubInPaths = pathArrays.some((path) =>
        path.some((node) => hubNodes.has(node))
      );
      expect(hubInPaths).toBe(true);
    }
  });
});

describe('Degree Distribution Integration', () => {
  it('should compare degree distributions', async () => {
    const graph = createGridGraph(6, 6);
    const expander = new GraphExpanderAdapter(graph, false);

    const groundTruth = enumerateBetweenGraph(graph, '0_0', '5_5', {
      maxPathLength: 12,
      maxPaths: 200,
    });

    const expansion = new DegreePrioritisedExpansion(expander, ['0_0', '5_5']);
    const result = await expansion.run();

    // Get degree arrays
    const sampledDegrees: number[] = [];
    for (const nodeId of result.sampledNodes) {
      sampledDegrees.push(expander.getDegree(nodeId));
    }

    const gtDegrees = [...groundTruth.degrees.values()];

    if (sampledDegrees.length > 0 && gtDegrees.length > 0) {
      const comparison = compareDegreeDistributions(sampledDegrees, gtDegrees);

      expect(comparison.klDivergence).toBeGreaterThanOrEqual(0);
      expect(comparison.jsDivergence).toBeGreaterThanOrEqual(0);
      expect(comparison.emd).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(comparison.sampledMeanDegree)).toBe(true);
      expect(Number.isFinite(comparison.groundTruthMeanDegree)).toBe(true);
    }
  });
});
