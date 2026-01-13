import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../../src/graph/graph';
import {
  precomputeMutualInformation,
  computeEdgeMI,
} from '../../src/pathfinding/mutual-information';
import {
  rankPaths,
  getBestPath,
  createPathRanker,
} from '../../src/pathfinding/path-ranking';
import { type Node, type Edge } from '../../src/types/graph';

// Extended test interfaces
interface TestNode extends Node {
  id: string;
  type: string;
  label: string;
  attributes?: number[];
  community?: string | number;
}

interface TestEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  timestamp?: number;
  sign?: number;
  probability?: number;
  layer?: string | number;
  hyperedgeNodes?: string[];
}

describe('Extended Mutual Information Features', () => {
  describe('Edge Type-based MI', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);
    });

    it('should compute higher MI for rare edge types', () => {
      // Create graph with homogeneous node types but heterogeneous edge types
      graph.addNode({ id: 'A', type: 'node', label: 'A' });
      graph.addNode({ id: 'B', type: 'node', label: 'B' });
      graph.addNode({ id: 'C', type: 'node', label: 'C' });
      graph.addNode({ id: 'D', type: 'node', label: 'D' });

      // Many edges of type 'common'
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'common' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'common' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'D', type: 'common' });

      // One edge of type 'rare'
      graph.addEdge({ id: 'E4', source: 'A', target: 'D', type: 'rare' });

      const cache = precomputeMutualInformation(graph, {
        useEdgeTypes: true,
      });

      // Rare edge type should have higher MI
      const miRare = cache.get('E4');
      const miCommon = cache.get('E1');

      expect(miRare).toBeDefined();
      expect(miCommon).toBeDefined();
      expect(miRare!).toBeGreaterThan(miCommon!);
    });
  });

  describe('Temporal Modifier', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);
    });

    it('should apply temporal decay to older edges', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      const now = Date.now();

      // Recent edge
      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test',
        timestamp: now - 1000, // 1 second ago
      });

      // Old edge
      graph.addEdge({
        id: 'E2',
        source: 'B',
        target: 'C',
        type: 'test',
        timestamp: now - 100000, // 100 seconds ago
      });

      const cache = precomputeMutualInformation(graph, {
        timestampExtractor: (edge) => edge.timestamp,
        temporalDecay: 0.01, // Decay rate
        referenceTime: now,
      });

      const miRecent = cache.get('E1');
      const miOld = cache.get('E2');

      expect(miRecent).toBeDefined();
      expect(miOld).toBeDefined();
      expect(miRecent!).toBeGreaterThan(miOld!);
    });
  });

  describe('Signed Edge Modifier', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);
    });

    it('should penalize negative edges', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      // Positive edge
      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test',
        sign: 1,
      });

      // Negative edge
      graph.addEdge({
        id: 'E2',
        source: 'B',
        target: 'C',
        type: 'test',
        sign: -1,
      });

      const cache = precomputeMutualInformation(graph, {
        signExtractor: (edge) => edge.sign,
        negativePenalty: 0.5,
      });

      const miPositive = cache.get('E1');
      const miNegative = cache.get('E2');

      expect(miPositive).toBeDefined();
      expect(miNegative).toBeDefined();
      expect(miPositive!).toBeGreaterThan(miNegative!);
    });
  });

  describe('Probabilistic Edge Modifier', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);
    });

    it('should scale MI by edge probability', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      // High probability edge
      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test',
        probability: 0.9,
      });

      // Low probability edge
      graph.addEdge({
        id: 'E2',
        source: 'B',
        target: 'C',
        type: 'test',
        probability: 0.1,
      });

      const cache = precomputeMutualInformation(graph, {
        probabilityExtractor: (edge) => edge.probability,
      });

      const miHighProb = cache.get('E1');
      const miLowProb = cache.get('E2');

      expect(miHighProb).toBeDefined();
      expect(miLowProb).toBeDefined();
      expect(miHighProb!).toBeGreaterThan(miLowProb!);
    });
  });

  describe('Community/Hierarchical Modifier', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);
    });

    it('should boost MI for same-community edges', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A', community: 'group1' });
      graph.addNode({ id: 'B', type: 'test', label: 'B', community: 'group1' });
      graph.addNode({ id: 'C', type: 'test', label: 'C', community: 'group2' });

      // Same community edge
      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test',
      });

      // Cross-community edge
      graph.addEdge({
        id: 'E2',
        source: 'B',
        target: 'C',
        type: 'test',
      });

      const cache = precomputeMutualInformation(graph, {
        communityExtractor: (node) => node.community,
        communityBoost: 0.5,
      });

      const miSameCommunity = cache.get('E1');
      const miCrossCommunity = cache.get('E2');

      expect(miSameCommunity).toBeDefined();
      expect(miCrossCommunity).toBeDefined();
      expect(miSameCommunity!).toBeGreaterThan(miCrossCommunity!);
    });
  });

  describe('Multiplex/Multi-layer Support', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);
    });

    it('should handle edges with layer information', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });

      // Edge in layer 1
      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test',
        layer: 'social',
      });

      // Edge in layer 2
      graph.addEdge({
        id: 'E2',
        source: 'A',
        target: 'B',
        type: 'test',
        layer: 'professional',
      });

      const cache = precomputeMutualInformation(graph, {
        layerExtractor: (edge) => edge.layer,
      });

      // Both edges should have MI computed
      expect(cache.get('E1')).toBeDefined();
      expect(cache.get('E2')).toBeDefined();
      expect(cache.size).toBe(2);
    });
  });

  describe('Hypergraph Support', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);
    });

    it('should compute MI for hyperedges using pairwise aggregation', () => {
      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });
      graph.addNode({ id: 'D', type: 'test', label: 'D' });

      // Regular edge
      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test',
      });

      // Hyperedge connecting A, B, C, D
      graph.addEdge({
        id: 'E2',
        source: 'A',
        target: 'B',
        type: 'hyper',
        hyperedgeNodes: ['C', 'D'], // Additional nodes beyond source/target
      });

      const cache = precomputeMutualInformation(graph, {
        hyperedgeExtractor: (edge) => edge.hyperedgeNodes,
      });

      expect(cache.get('E1')).toBeDefined();
      expect(cache.get('E2')).toBeDefined();
    });
  });

  describe('computeEdgeMI with modifiers', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);
    });

    it('should apply multiple modifiers to single edge MI', () => {
      // Create a triangle to ensure nodes have shared neighbours (non-zero Jaccard)
      graph.addNode({ id: 'A', type: 'test', label: 'A', community: 'group1' });
      graph.addNode({ id: 'B', type: 'test', label: 'B', community: 'group1' });
      graph.addNode({ id: 'C', type: 'test', label: 'C', community: 'group1' });

      const now = Date.now();
      const edge: TestEdge = {
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test',
        timestamp: now - 1000,
        sign: 1,
        probability: 0.9,
      };
      graph.addEdge(edge);
      // Add edges to create shared neighbours
      graph.addEdge({ id: 'E2', source: 'A', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'B', target: 'C', type: 'test' });

      // With community boost (same-community nodes get boosted MI)
      const miWithBoost = computeEdgeMI(graph, edge, {
        communityExtractor: (node) => node.community,
        communityBoost: 0.5,
      });

      // Without community boost
      const miWithoutBoost = computeEdgeMI(graph, edge, {});

      expect(miWithBoost).toBeDefined();
      expect(miWithoutBoost).toBeDefined();
      expect(miWithBoost).toBeGreaterThan(0);
      expect(miWithoutBoost).toBeGreaterThan(0);
      // Same-community boost should increase MI by factor of (1 + communityBoost)
      expect(miWithBoost).toBeCloseTo(miWithoutBoost * 1.5, 5);
    });
  });
});

describe('Extended Path Ranking Features', () => {
  describe('Traversal Mode', () => {
    it('should respect directed traversal mode on directed graph', () => {
      const graph = new Graph<TestNode, TestEdge>(true); // Directed

      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      // A -> B -> C (directed)
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });

      // With directed traversal, should find A -> B -> C
      const directedResult = rankPaths(graph, 'A', 'C', {
        traversalMode: 'directed',
      });
      expect(directedResult.ok).toBe(true);
      if (directedResult.ok && directedResult.value.some) {
        expect(directedResult.value.value.length).toBeGreaterThan(0);
      }

      // Reverse direction should fail with directed traversal
      const reverseResult = rankPaths(graph, 'C', 'A', {
        traversalMode: 'directed',
      });
      expect(reverseResult.ok).toBe(true);
      if (reverseResult.ok) {
        expect(reverseResult.value.some).toBe(false); // No path found
      }
    });

    it('should allow reverse traversal with undirected mode', () => {
      const graph = new Graph<TestNode, TestEdge>(true); // Directed

      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      // A -> B -> C (directed)
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });

      // With undirected traversal, should find C -> B -> A
      const undirectedResult = rankPaths(graph, 'C', 'A', {
        traversalMode: 'undirected',
      });
      expect(undirectedResult.ok).toBe(true);
      if (undirectedResult.ok && undirectedResult.value.some) {
        expect(undirectedResult.value.value.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Weight Mode', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);

      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      // Path with low weights
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test', weight: 1 });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test', weight: 1 });
    });

    it('should ignore weights with mode none', () => {
      const result = rankPaths(graph, 'A', 'C', {
        weightMode: 'none',
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value[0];
        expect(path.weightFactor).toBeUndefined();
      }
    });

    it('should apply divide weight mode', () => {
      const result = rankPaths(graph, 'A', 'C', {
        weightMode: 'divide',
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value[0];
        expect(path.weightFactor).toBeDefined();
        expect(path.weightFactor!).toBeGreaterThan(0);
      }
    });

    it('should apply multiplicative weight mode', () => {
      const result = rankPaths(graph, 'A', 'C', {
        weightMode: 'multiplicative',
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value[0];
        expect(path.weightFactor).toBeDefined();
      }
    });

    it('should use custom weight extractor', () => {
      const result = rankPaths(graph, 'A', 'C', {
        weightMode: 'divide',
        weightExtractor: (edge) => (edge.weight ?? 1) * 2,
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value[0];
        expect(path.weightFactor).toBeDefined();
      }
    });
  });

  describe('Length Penalty', () => {
    let graph: Graph<TestNode, TestEdge>;

    beforeEach(() => {
      graph = new Graph<TestNode, TestEdge>(false);

      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });
      graph.addNode({ id: 'C', type: 'test', label: 'C' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });
    });

    it('should not include length penalty when lambda is 0', () => {
      const result = rankPaths(graph, 'A', 'C', {
        lambda: 0,
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value[0];
        expect(path.lengthPenalty).toBeUndefined();
      }
    });

    it('should include length penalty when lambda > 0', () => {
      const result = rankPaths(graph, 'A', 'C', {
        lambda: 0.1,
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value[0];
        expect(path.lengthPenalty).toBeDefined();
        expect(path.lengthPenalty!).toBeLessThan(1);
        expect(path.lengthPenalty!).toBeGreaterThan(0);
      }
    });
  });

  describe('createPathRanker with extended config', () => {
    it('should support all new config options', () => {
      const graph = new Graph<TestNode, TestEdge>(false);

      graph.addNode({ id: 'A', type: 'test', label: 'A', community: 'g1' });
      graph.addNode({ id: 'B', type: 'test', label: 'B', community: 'g1' });

      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'test',
        weight: 2,
        timestamp: Date.now() - 1000,
      });

      const ranker = createPathRanker(graph, {
        traversalMode: 'undirected',
        lambda: 0.1,
        weightMode: 'divide',
        miConfig: {
          communityExtractor: (node) => node.community,
          timestampExtractor: (edge) => edge.timestamp,
          communityBoost: 0.5,
        },
      });

      expect(ranker.getMICache().size).toBe(1);

      const result = ranker.rank('A', 'B');
      expect(result.ok).toBe(true);
    });
  });

  describe('getBestPath with extended config', () => {
    it('should return best path with all score components', () => {
      const graph = new Graph<TestNode, TestEdge>(false);

      graph.addNode({ id: 'A', type: 'test', label: 'A' });
      graph.addNode({ id: 'B', type: 'test', label: 'B' });

      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test', weight: 2 });

      const result = getBestPath(graph, 'A', 'B', {
        lambda: 0.1,
        weightMode: 'multiplicative',
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const best = result.value.value;
        expect(best.score).toBeGreaterThan(0);
        expect(best.geometricMeanMI).toBeGreaterThan(0);
        expect(best.lengthPenalty).toBeDefined();
        expect(best.weightFactor).toBeDefined();
      }
    });
  });
});

describe('Combined Features', () => {
  it('should work with all features enabled together', () => {
    const graph = new Graph<TestNode, TestEdge>(false);

    const now = Date.now();

    // Create nodes with communities and diverse types
    // Use different types to ensure type-based MI is non-zero
    // (alpha-beta pair = 1 edge, beta-gamma pair = 1 edge)
    graph.addNode({ id: 'A', type: 'alpha', label: 'A', community: 'group1' });
    graph.addNode({ id: 'B', type: 'beta', label: 'B', community: 'group1' });
    graph.addNode({ id: 'C', type: 'gamma', label: 'C', community: 'group2' });

    // Create edges with all properties
    graph.addEdge({
      id: 'E1',
      source: 'A',
      target: 'B',
      type: 'strong',
      weight: 1,
      timestamp: now - 100,
      sign: 1,
      probability: 0.95,
    });

    graph.addEdge({
      id: 'E2',
      source: 'B',
      target: 'C',
      type: 'weak',
      weight: 5,
      timestamp: now - 10000,
      sign: -1,
      probability: 0.3,
    });

    const cache = precomputeMutualInformation(graph, {
      communityExtractor: (node) => node.community,
      timestampExtractor: (edge) => edge.timestamp,
      signExtractor: (edge) => edge.sign,
      probabilityExtractor: (edge) => edge.probability,
      useEdgeTypes: true,
      communityBoost: 0.5,
      negativePenalty: 0.5,
      temporalDecay: 0.001,
      referenceTime: now,
    });

    // E1 should have higher MI (same community, positive, high probability, recent)
    // E2 should have lower MI (cross-community, negative, low probability, older)
    const miE1 = cache.get('E1');
    const miE2 = cache.get('E2');

    expect(miE1).toBeDefined();
    expect(miE2).toBeDefined();
    expect(miE1!).toBeGreaterThan(miE2!);

    // Test path ranking with all features
    const result = rankPaths(graph, 'A', 'C', {
      traversalMode: 'undirected',
      lambda: 0.1,
      weightMode: 'divide',
      weightExtractor: (edge) => edge.weight ?? 1,
      miCache: cache,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.value.some) {
      const path = result.value.value[0];
      expect(path.score).toBeGreaterThan(0);
      expect(path.lengthPenalty).toBeDefined();
      expect(path.weightFactor).toBeDefined();
    }
  });
});
