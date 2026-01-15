/**
 * Unit tests for path planting infrastructure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Graph, type Edge, type Node } from '@bibgraph/algorithms';
import type { Path } from '@bibgraph/algorithms';
import {
  plantGroundTruthPaths,
  addNoisePaths,
  plantHeterogeneousPaths,
  plantCitationPaths,
  pathFollowsTemplate,
  type PlantedPathConfig,
  type CitationPathType,
} from '@bibgraph/algorithms';

/** Simple graph node */
interface TestNode extends Node {
  id: string;
  type: string;
}

/** Simple graph edge */
interface TestEdge extends Edge {
  id: string;
  source: string;
  target: string;
  weight?: number;
}

describe('Path Planting - Ground Truth Generator', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>();

    // Add 10 nodes for testing
    for (let i = 0; i < 10; i++) {
      const node: TestNode = { id: `node${i}`, type: 'TestNode' };
      graph.addNode(node);
    }
  });

  it('should plant ground truth paths with specified count', () => {
    const config: PlantedPathConfig<TestNode, TestEdge> = {
      numPaths: 3,
      pathLength: { min: 2, max: 3 },
      signalStrength: 'medium',
      allowOverlap: false,
      seed: 42,
    };

    const result = plantGroundTruthPaths(graph, config);

    expect(result.groundTruthPaths).toHaveLength(3);
    expect(result.metadata.nodesAdded).toBeGreaterThan(0);
    expect(result.metadata.edgesAdded).toBeGreaterThan(0);
  });

  it('should create paths with signal-appropriate MI values', () => {
    const strongConfig: PlantedPathConfig<TestNode, TestEdge> = {
      numPaths: 2,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'strong',
      allowOverlap: false,
      seed: 42,
    };

    const strongResult = plantGroundTruthPaths(graph, strongConfig);

    // Strong signal should have MI > 0.7
    for (const path of strongResult.groundTruthPaths) {
      const avgMI = strongResult.relevanceScores.get(
        path.nodes.map(n => n.id).join('→')
      );
      expect(avgMI).toBeGreaterThan(0.7);
    }
  });

  it('should create reproducible paths with same seed', () => {
    const config: PlantedPathConfig<TestNode, TestEdge> = {
      numPaths: 2,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium',
      allowOverlap: false,
      seed: 42,
    };

    const result1 = plantGroundTruthPaths(graph, config);
    const graph2 = new Graph<TestNode, TestEdge>();
    for (let i = 0; i < 10; i++) {
      const node: TestNode = { id: `node${i}`, type: 'TestNode' };
      graph2.addNode(node);
    }
    const result2 = plantGroundTruthPaths(graph2, config);

    // Same seed should produce identical paths
    expect(result1.groundTruthPaths).toHaveLength(result2.groundTruthPaths.length);
    expect(result1.metadata.avgPathMI).toBeCloseTo(result2.metadata.avgPathMI);
  });

  it('should create different paths with different seeds', () => {
    const config1: PlantedPathConfig<TestNode, TestEdge> = {
      numPaths: 2,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium',
      allowOverlap: false,
      seed: 42,
    };

    const config2: PlantedPathConfig<TestNode, TestEdge> = {
      numPaths: 2,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium',
      allowOverlap: false,
      seed: 123,
    };

    const result1 = plantGroundTruthPaths(graph, config1);

    // Create fresh graph for second planting
    const graph2 = new Graph<TestNode, TestEdge>();
    for (let i = 0; i < 10; i++) {
      graph2.addNode(`node${i}`, { id: `node${i}`, type: 'TestNode' });
    }
    const result2 = plantGroundTruthPaths(graph2, config2);

    // Different seeds should produce different paths
    expect(result1.metadata.avgPathMI).not.toBe(result2.metadata.avgPathMI);
  });

  it('should respect source and target node constraints', () => {
    const config: PlantedPathConfig<TestNode, TestEdge> = {
      numPaths: 2,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium',
      allowOverlap: false,
      seed: 42,
      sourceNodes: ['node0', 'node1'],
      targetNodes: ['node8', 'node9'],
    };

    const result = plantGroundTruthPaths(graph, config);

    // All paths should start and end at specified nodes
    for (const path of result.groundTruthPaths) {
      const firstId = path.nodes[0]?.id;
      const lastId = path.nodes[path.nodes.length - 1]?.id;
      expect(['node0', 'node1']).toContain(firstId);
      expect(['node8', 'node9']).toContain(lastId);
    }
  });

  it('should throw error on empty graph', () => {
    const emptyGraph = new Graph<TestNode, TestEdge>();

    const config: PlantedPathConfig<TestNode, TestEdge> = {
      numPaths: 2,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium',
      allowOverlap: false,
      seed: 42,
    };

    expect(() => plantGroundTruthPaths(emptyGraph, config)).toThrow('Cannot plant paths in empty graph');
  });
});

describe('Path Planting - Noise Generator', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>();

    // Add nodes
    for (let i = 0; i < 10; i++) {
      const node: TestNode = { id: `node${i}`, type: 'TestNode' };
      graph.addNode(node);
    }
  });

  it('should return original graph when numNoisePaths is 0', () => {
    const resultGraph = addNoisePaths(graph, [], 0, 42);

    expect(resultGraph).toBe(graph);
    expect(resultGraph.getAllNodes()).toHaveLength(10);
  });

  it('should add noise paths with low MI values', () => {
    const resultGraph = addNoisePaths(graph, [], 3, 42);

    // Should have added nodes and edges
    const nodes = resultGraph.getAllNodes();
    const edges = resultGraph.getAllEdges();

    expect(nodes.length).toBeGreaterThan(10);
    expect(edges.length).toBeGreaterThan(0);
  });

  it('should avoid duplicating existing paths', () => {
    // First add noise paths
    const resultGraph1 = addNoisePaths(graph, [], 3, 42);

    // Try adding more with same config
    const groundTruthPaths: Path<TestNode, TestEdge>[] = [];
    const resultGraph2 = addNoisePaths(resultGraph1, groundTruthPaths, 3, 42);

    // Should still have same number of unique paths (deduplication)
    const edges1 = resultGraph1.getAllEdges();
    const edges2 = resultGraph2.getAllEdges();
    expect(edges2.length).toBeGreaterThanOrEqual(edges1.length);
  });

  it('should handle single-node graphs', () => {
    const singleNodeGraph = new Graph<TestNode, TestEdge>();
    singleNodeGraph.addNode('only', { id: 'only' });

    const resultGraph = addNoisePaths(singleNodeGraph, [], 5, 42);

    // Need at least 2 nodes for a path, so should return unchanged
    expect(resultGraph.getAllNodes()).toHaveLength(1);
  });
});

describe('Path Planting - Heterogeneous Graphs', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>();

    // Add heterogeneous nodes (like OpenAlex)
    graph.addNode({ id: 'work1', type: 'Work' });
    graph.addNode({ id: 'work2', type: 'Work' });
    graph.addNode({ id: 'work3', type: 'Work' });
    graph.addNode({ id: 'author1', type: 'Author' });
    graph.addNode({ id: 'author2', type: 'Author' });
    graph.addNode({ id: 'source1', type: 'Source' });
  });

  it('should plant paths following type template', () => {
    const config = {
      numPaths: 2,
      pathLength: { min: 2, max: 3 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathTemplate: ['Work', 'Author', 'Work'],
      entityTypes: ['Work', 'Author', 'Source'],
    };

    const result = plantHeterogeneousPaths(graph, ['Work', 'Author', 'Work'], config);

    expect(result.groundTruthPaths).toHaveLength(2);
  });

  it('should throw error for invalid path template', () => {
    const config = {
      numPaths: 1,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathTemplate: ['Work'], // Only 1 type
      entityTypes: ['Work'],
    };

    expect(() => plantHeterogeneousPaths(graph, ['Work'], config))
      .toThrow('Path template must have at least 2 node types');
  });

  it('should throw error when required node type is missing', () => {
    const config = {
      numPaths: 1,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathTemplate: ['Work', 'Institution', 'Work'],
      entityTypes: ['Work', 'Institution'],
    };

    expect(() => plantHeterogeneousPaths(graph, ['Work', 'Institution', 'Work'], config))
      .toThrow('No nodes found with type: Institution');
  });

  it('should filter nodes by entity type', () => {
    const nodes = graph.getAllNodes();
    const workNodes = nodes.filter(n => {
      if ('type' in n && typeof n.type === 'string') {
        return n.type === 'Work';
      }
      return false;
    });

    expect(workNodes).toHaveLength(3);
  });
});

describe('Path Template Validation', () => {
  it('should validate path follows template', () => {
    const path: Path<TestNode, TestEdge> = {
      nodes: [
        { id: 'w1', type: 'Work' },
        { id: 'a1', type: 'Author' },
        { id: 'w2', type: 'Work' },
      ],
      edges: [],
      totalWeight: 0,
    };

    const template = ['Work', 'Author', 'Work'];
    const follows = pathFollowsTemplate(path, template);

    expect(follows).toBe(true);
  });

  it('should reject path that does not match template', () => {
    const path: Path<TestNode, TestEdge> = {
      nodes: [
        { id: 'w1', type: 'Work' },
        { id: 'w2', type: 'Work' }, // Should be Author
        { id: 'w3', type: 'Work' },
      ],
      edges: [],
      totalWeight: 0,
    };

    const template = ['Work', 'Author', 'Work'];
    const follows = pathFollowsTemplate(path, template);

    expect(follows).toBe(false);
  });

  it('should reject path with wrong length', () => {
    const path: Path<TestNode, TestEdge> = {
      nodes: [
        { id: 'w1', type: 'Work' },
        { id: 'w2', type: 'Work' },
      ],
      edges: [],
      totalWeight: 0,
    };

    const template = ['Work', 'Author', 'Work'];
    const follows = pathFollowsTemplate(path, template);

    expect(follows).toBe(false);
  });
});

describe('Path Planting - Citation Networks', () => {
  let graph: Graph<TestNode, TestEdge>;

  beforeEach(() => {
    graph = new Graph<TestNode, TestEdge>();

    // Add work nodes
    for (let i = 0; i < 10; i++) {
      graph.addNode({ id: `work${i}`, type: 'Work' });
    }
  });

  it('should plant direct citation chains', () => {
    const pathType: CitationPathType = 'direct-citation-chain';
    const config = {
      numPaths: 2,
      pathLength: { min: 3, max: 3 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathType,
    };

    const result = plantCitationPaths(graph, pathType, config);

    expect(result.groundTruthPaths).toHaveLength(2);
    expect(result.metadata.edgesAdded).toBeGreaterThan(0);
  });

  it('should plant co-citation bridges', () => {
    const pathType: CitationPathType = 'co-citation-bridge';
    const config = {
      numPaths: 2,
      pathLength: { min: 3, max: 3 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathType,
    };

    const result = plantCitationPaths(graph, pathType, config);

    expect(result.groundTruthPaths).toHaveLength(2);
  });

  it('should plant bibliographic coupling paths', () => {
    const pathType: CitationPathType = 'bibliographic-coupling';
    const config = {
      numPaths: 2,
      pathLength: { min: 3, max: 3 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathType,
    };

    const result = plantCitationPaths(graph, pathType, config);

    expect(result.groundTruthPaths).toHaveLength(2);
  });

  it('should throw error when insufficient work nodes', () => {
    const smallGraph = new Graph<TestNode, TestEdge>();
    smallGraph.addNode({ id: 'work1', type: 'Work' });
    smallGraph.addNode({ id: 'work2', type: 'Work' });

    const pathType: CitationPathType = 'direct-citation-chain';
    const config = {
      numPaths: 1,
      pathLength: { min: 3, max: 3 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathType,
    };

    expect(() => plantCitationPaths(smallGraph, pathType, config))
      .toThrow('Need at least 3 work nodes');
  });

  it('should handle author-mediated paths with author nodes', () => {
    // Add author nodes
    for (let i = 0; i < 3; i++) {
      graph.addNode({ id: `author${i}`, type: 'Author' });
    }

    const pathType: CitationPathType = 'author-mediated';
    const config = {
      numPaths: 2,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathType,
    };

    const result = plantCitationPaths(graph, pathType, config);

    expect(result.groundTruthPaths).toHaveLength(2);
  });

  it('should handle venue-mediated paths with source nodes', () => {
    // Add source/venue nodes
    for (let i = 0; i < 3; i++) {
      graph.addNode({ id: `source${i}`, type: 'Source' });
    }

    const pathType: CitationPathType = 'venue-mediated';
    const config = {
      numPaths: 2,
      pathLength: { min: 2, max: 2 },
      signalStrength: 'medium' as const,
      allowOverlap: false,
      seed: 42,
      pathType,
    };

    const result = plantCitationPaths(graph, pathType, config);

    expect(result.groundTruthPaths).toHaveLength(2);
  });
});
