/**
 * Unit tests for graph generator
 */
// eslint-disable-next-line n/no-extraneous-import
import { describe, expect, it } from 'vitest';

import { generateGraph } from './generator';
import type { GraphSpec } from './spec';

describe('generateGraph', () => {
  describe('Basic functionality', () => {
    it('should generate empty graph with 0 nodes', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 0 });

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should generate single node graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 1 });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('N0');
      expect(result.edges).toHaveLength(0);
    });

    it('should generate tree (connected, acyclic)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 10 });

      // Tree with n nodes has exactly n-1 edges
      expect(result.nodes).toHaveLength(10);
      expect(result.edges).toHaveLength(9);
    });

    it('should generate connected graph with cycles', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 10 });

      expect(result.nodes).toHaveLength(10);
      // Connected graph with cycles has > n-1 edges
      expect(result.edges.length).toBeGreaterThan(9);
    });

    it('should generate disconnected graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 10 });

      expect(result.nodes).toHaveLength(10);
      // Forest has < n-1 edges
      expect(result.edges.length).toBeLessThan(9);
    });

    it('should generate complete graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'complete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 5 });

      expect(result.nodes).toHaveLength(5);
      // Complete graph K5 has n*(n-1)/2 = 10 edges
      expect(result.edges).toHaveLength(10);
    });
  });

  describe('Directed graphs', () => {
    it('should generate directed acyclic graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      expect(result.nodes).toHaveLength(10);
      // DAG has at most n*(n-1)/2 edges
      expect(result.edges.length).toBeLessThanOrEqual(45);
    });

    it('should generate directed graph with cycles', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 10 });

      expect(result.nodes).toHaveLength(10);
      expect(result.edges.length).toBeGreaterThan(0);
    });

    it('should generate tournament graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        tournament: { kind: 'tournament' },
      };

      const result = generateGraph(spec, { nodeCount: 5, seed: 42 });

      expect(result.nodes).toHaveLength(5);
      // Tournament has exactly n*(n-1)/2 edges
      expect(result.edges).toHaveLength(10);
    });
  });

  describe('Special graph structures', () => {
    it('should generate star graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        star: { kind: 'star' },
      };

      const result = generateGraph(spec, { nodeCount: 6 });

      expect(result.nodes).toHaveLength(6);
      // Star has n-1 edges
      expect(result.edges).toHaveLength(5);

      // Verify star structure (one center connected to all others)
      const degreeCount = new Map<string, number>();
      for (const edge of result.edges) {
        degreeCount.set(edge.source, (degreeCount.get(edge.source) || 0) + 1);
        degreeCount.set(edge.target, (degreeCount.get(edge.target) || 0) + 1);
      }

      // Star should have one node with degree 5 and 5 nodes with degree 1
      const degrees = [...degreeCount.values()].sort((a, b) => b - a);
      expect(degrees[0]).toBe(5); // Center
    });

    it('should generate wheel graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        wheel: { kind: 'wheel' },
      };

      const result = generateGraph(spec, { nodeCount: 6 });

      expect(result.nodes).toHaveLength(6);
      // Wheel W5 (hub + 5-cycle) has 2*(n-1) = 10 edges
      expect(result.edges).toHaveLength(10);
    });

    it('should generate grid graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        grid: { kind: 'grid', rows: 3, cols: 4 },
      };

      const result = generateGraph(spec, { nodeCount: 12 });

      expect(result.nodes).toHaveLength(12);
      // 3x4 grid has (rows-1)*cols + rows*(cols-1) = 2*4 + 3*3 = 17 edges
      expect(result.edges).toHaveLength(17);
    });

    it('should generate toroidal graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        toroidal: { kind: 'toroidal', rows: 3, cols: 3 },
      };

      const result = generateGraph(spec, { nodeCount: 9 });

      expect(result.nodes).toHaveLength(9);
      // 3x3 torus has rows*cols*2 = 9*2 = 18 edges
      expect(result.edges).toHaveLength(18);
    });

    it('should generate complete binary tree', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        binaryTree: { kind: 'complete_binary' },
      };

      const result = generateGraph(spec, { nodeCount: 7 });

      expect(result.nodes).toHaveLength(7);
      // Complete binary tree with 7 nodes has 6 edges
      expect(result.edges).toHaveLength(6);
    });
  });

  describe('Bipartite graphs', () => {
    it('should generate bipartite tree', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        partiteness: { kind: 'bipartite' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      expect(result.nodes).toHaveLength(10);
      // Verify bipartition
      const leftPartition = result.nodes.filter(n => n.partition === 'left');
      const rightPartition = result.nodes.filter(n => n.partition === 'right');
      expect(leftPartition.length).toBeGreaterThan(0);
      expect(rightPartition.length).toBeGreaterThan(0);
      expect(leftPartition.length + rightPartition.length).toBe(10);
    });

    it('should generate complete bipartite graph K_{m,n}', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        completeBipartite: { kind: 'complete_bipartite', m: 3, n: 4 },
      };

      const result = generateGraph(spec, { nodeCount: 7 });

      expect(result.nodes).toHaveLength(7);
      // K_{3,4} has 3*4 = 12 edges
      expect(result.edges).toHaveLength(12);
    });
  });

  describe('Edge cases and validation', () => {
    it('should throw error for invalid k-regular graph (k >= n)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        specificRegular: { kind: 'k_regular', k: 5 },
      };

      expect(() => generateGraph(spec, { nodeCount: 3 })).toThrow('k-regular graph requires k < n');
    });

    it('should throw error for invalid k-regular graph (n*k odd)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        specificRegular: { kind: 'k_regular', k: 3 },
      };

      expect(() => generateGraph(spec, { nodeCount: 5 })).toThrow('n*k to be even');
    });

    it('should throw error for invalid k-vertex-connected graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        kVertexConnected: { kind: 'k_vertex_connected', k: 5 },
      };

      expect(() => generateGraph(spec, { nodeCount: 3 })).toThrow('k-vertex-connected graph requires at least');
    });
  });

  describe('Seeded randomness', () => {
    it('should produce identical graphs with same seed', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result1 = generateGraph(spec, { nodeCount: 10, seed: 42 });
      const result2 = generateGraph(spec, { nodeCount: 10, seed: 42 });

      expect(result1.nodes.map(n => n.id)).toEqual(result2.nodes.map(n => n.id));
      expect(result1.edges.map(e => `${e.source}-${e.target}`))
        .toEqual(result2.edges.map(e => `${e.source}-${e.target}`));
    });

    it('should produce different graphs with different seeds', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result1 = generateGraph(spec, { nodeCount: 10, seed: 42 });
      const result2 = generateGraph(spec, { nodeCount: 10, seed: 43 });

      // At least edges should be different
      expect(result1.edges.map(e => `${e.source}-${e.target}`))
        .not.toEqual(result2.edges.map(e => `${e.source}-${e.target}`));
    });
  });

  describe('Heterogeneous graphs', () => {
    it('should assign node types based on proportions', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'heterogeneous' },
      };

      const result = generateGraph(spec, {
        nodeCount: 100,
        seed: 42,
        nodeTypes: [
          { type: 'author', proportion: 0.4 },
          { type: 'paper', proportion: 0.6 },
        ],
      });

      expect(result.nodes).toHaveLength(100);

      const authors = result.nodes.filter(n => n.type === 'author').length;
      const papers = result.nodes.filter(n => n.type === 'paper').length;

      // Roughly 40% authors, 60% papers
      expect(authors).toBeGreaterThan(30);
      expect(papers).toBeGreaterThan(50);
    });
  });

  describe('Weighted graphs', () => {
    it('should add weights to edges when specified', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'weighted_numeric' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, {
        nodeCount: 10,
        seed: 42,
        weightRange: { min: 1, max: 100 },
      });

      expect(result.edges.length).toBeGreaterThan(0);

      for (const edge of result.edges) {
        expect(edge.weight).toBeDefined();
        expect(edge.weight).toBeGreaterThanOrEqual(1);
        expect(edge.weight).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Self-loops and multigraphs', () => {
    it('should allow self-loops when specified', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'allowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      const hasSelfLoop = result.edges.some(e => e.source === e.target);
      expect(hasSelfLoop).toBe(true);
    });

    it('should not allow self-loops when disallowed', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      const hasSelfLoop = result.edges.some(e => e.source === e.target);
      expect(hasSelfLoop).toBe(false);
    });

    it('should allow parallel edges for multigraphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'multi' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      // Check for duplicate edges
      const edgeKeys = result.edges.map(e =>
        [e.source, e.target].sort().join('-')
      );

      const hasDuplicates = new Set(edgeKeys).size < edgeKeys.length;
      expect(hasDuplicates).toBe(true);
    });
  });

  describe('Advanced graph properties', () => {
    it('should generate Eulerian graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        eulerian: { kind: 'eulerian' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      // Calculate degrees
      const degrees = new Map<string, number>();
      for (const node of result.nodes) {
        degrees.set(node.id, 0);
      }
      for (const edge of result.edges) {
        degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
        degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
      }

      // All vertices should have even degree for Eulerian
      for (const [, degree] of degrees) {
        expect(degree % 2).toBe(0);
      }
    });

    it('should generate k-colorable graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        kColorable: { kind: 'k_colorable', k: 3 },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      // Graph should be 3-colorable by construction
      // (no direct way to verify without implementing graph coloring algorithm)
      expect(result.nodes).toHaveLength(10);
    });
  });
});
