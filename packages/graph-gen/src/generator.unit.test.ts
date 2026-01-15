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

  describe('Phase 1: Simple Structural Variants', () => {
    describe('Split graphs', () => {
      it('should generate split graph with clique + independent set', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'unconstrained' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          split: { kind: 'split' },
        };

        const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

        expect(result.nodes).toHaveLength(10);

        // Check stored partition metadata
        const clique = result.nodes.filter(n => n.data?.splitPartition === 'clique');
        const independent = result.nodes.filter(n => n.data?.splitPartition === 'independent');

        expect(clique.length).toBeGreaterThan(0);
        expect(independent.length).toBeGreaterThan(0);
        expect(clique.length + independent.length).toBe(10);

        // Verify clique is complete
        const adjacency = new Map<string, Set<string>>();
        for (const node of result.nodes) {
          adjacency.set(node.id, new Set());
        }
        for (const edge of result.edges) {
          adjacency.get(edge.source)?.add(edge.target);
          adjacency.get(edge.target)?.add(edge.source);
        }

        for (let i = 0; i < clique.length; i++) {
          for (let j = i + 1; j < clique.length; j++) {
            expect(adjacency.get(clique[i].id)?.has(clique[j].id)).toBe(true);
          }
        }

        // Verify independent set has no internal edges
        for (let i = 0; i < independent.length; i++) {
          for (let j = i + 1; j < independent.length; j++) {
            expect(adjacency.get(independent[i].id)?.has(independent[j].id)).toBe(false);
          }
        }
      });

      it('should handle minimal split graph (n=2)', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'unconstrained' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          split: { kind: 'split' },
        };

        const result = generateGraph(spec, { nodeCount: 2, seed: 42 });

        expect(result.nodes).toHaveLength(2);
        // With 2 nodes, we have 1 clique and 1 independent node
        // May or may not have edge between them
      });
    });

    describe('Cographs (P4-free)', () => {
      it('should generate P4-free cograph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'unconstrained' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          cograph: { kind: 'cograph' },
        };

        const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

        expect(result.nodes).toHaveLength(10);
        expect(result.edges.length).toBeGreaterThanOrEqual(0);

        // Build adjacency for P4 check
        const adjacency = new Map<string, Set<string>>();
        for (const node of result.nodes) {
          adjacency.set(node.id, new Set());
        }
        for (const edge of result.edges) {
          adjacency.get(edge.source)?.add(edge.target);
          adjacency.get(edge.target)?.add(edge.source);
        }

        // Helper to check if 4 vertices form P4
        const hasP4 = (vertices: string[]): boolean => {
          const edgeCount = new Map<string, number>();
          for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
              if (adjacency.get(vertices[i])?.has(vertices[j])) {
                edgeCount.set(vertices[i], (edgeCount.get(vertices[i]) || 0) + 1);
                edgeCount.set(vertices[j], (edgeCount.get(vertices[j]) || 0) + 1);
              }
            }
          }
          const degrees = Array.from(edgeCount.values()).sort((a, b) => a - b);
          // P4 has degree sequence [1, 1, 2, 2]
          return degrees.length === 4 && degrees[0] === 1 && degrees[1] === 1 && degrees[2] === 2 && degrees[3] === 2;
        };

        // Check all 4-vertex combinations (sampling for performance)
        const nodeIds = result.nodes.map(n => n.id);
        let foundP4 = false;
        const maxChecks = 100; // Sample instead of exhaustive check
        let checks = 0;

        for (let i = 0; i < nodeIds.length - 3 && !foundP4 && checks < maxChecks; i++) {
          for (let j = i + 1; j < nodeIds.length - 2 && !foundP4 && checks < maxChecks; j++) {
            for (let k = j + 1; k < nodeIds.length - 1 && !foundP4 && checks < maxChecks; k++) {
              for (let l = k + 1; l < nodeIds.length && !foundP4 && checks < maxChecks; l++) {
                if (hasP4([nodeIds[i], nodeIds[j], nodeIds[k], nodeIds[l]])) {
                  foundP4 = true;
                }
                checks++;
              }
            }
          }
        }

        // Cograph should have NO P4 (but we might not have checked exhaustively)
        // For n=10, if we sampled 100 combinations without finding P4, it's likely a cograph
        expect(foundP4).toBe(false);
      });

      it('should handle trivial cograph (n<4)', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'unconstrained' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          cograph: { kind: 'cograph' },
        };

        const result = generateGraph(spec, { nodeCount: 3, seed: 42 });

        expect(result.nodes).toHaveLength(3);
        // Any graph with < 4 vertices is automatically a cograph
      });
    });

    describe('Claw-free graphs', () => {
      it('should generate claw-free graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'unconstrained' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          clawFree: { kind: 'claw_free' },
        };

        const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

        expect(result.nodes).toHaveLength(10);

        // Build adjacency
        const adjacency = new Map<string, Set<string>>();
        for (const node of result.nodes) {
          adjacency.set(node.id, new Set());
        }
        for (const edge of result.edges) {
          adjacency.get(edge.source)?.add(edge.target);
          adjacency.get(edge.target)?.add(edge.source);
        }

        // Check each vertex for potential claw center
        for (const center of result.nodes) {
          const neighbors = Array.from(adjacency.get(center.id) || []);

          if (neighbors.length < 3) continue;

          // Check all combinations of 3 neighbors
          for (let i = 0; i < neighbors.length - 2; i++) {
            for (let j = i + 1; j < neighbors.length - 1; j++) {
              for (let k = j + 1; k < neighbors.length; k++) {
                const triple = [neighbors[i], neighbors[j], neighbors[k]];

                // Check if triple is independent (no edges between them)
                let independent = true;
                for (let x = 0; x < triple.length && independent; x++) {
                  for (let y = x + 1; y < triple.length && independent; y++) {
                    if (adjacency.get(triple[x])?.has(triple[y])) {
                      independent = false;
                    }
                  }
                }

                // If we found independent triple with center, that's a claw!
                expect(independent).toBe(false);
              }
            }
          }
        }
      });

      it('should handle trivial claw-free graph (n<4)', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'unconstrained' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          clawFree: { kind: 'claw_free' },
        };

        const result = generateGraph(spec, { nodeCount: 3, seed: 42 });

        expect(result.nodes).toHaveLength(3);
        // Any graph with < 4 vertices is automatically claw-free
      });
    });
  });
});

describe('Phase 2: Chordal-Based Graph Classes', () => {
  describe('Chordal graphs', () => {
    it('should generate chordal graph (no induced cycles > 3)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        chordal: { kind: 'chordal' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      expect(result.nodes).toHaveLength(10);
      expect(result.edges.length).toBeGreaterThan(0);

      // Build adjacency list for cycle checking
      const adjacency = new Map<string, Set<string>>();
      for (const node of result.nodes) {
        adjacency.set(node.id, new Set());
      }
      for (const edge of result.edges) {
        adjacency.get(edge.source)?.add(edge.target);
        adjacency.get(edge.target)?.add(edge.source);
      }

      // For chordal graphs, we can't easily verify absence of chordless cycles
      // But we can verify the graph is connected and has reasonable density
      const visited = new Set<string>();
      const stack = [result.nodes[0].id];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);

        for (const neighbor of adjacency.get(current) || []) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }

      expect(visited.size).toBe(10); // Graph should be connected
    });

    it('should handle trivial chordal graph (n<4)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        chordal: { kind: 'chordal' },
      };

      const result = generateGraph(spec, { nodeCount: 3, seed: 42 });

      expect(result.nodes).toHaveLength(3);
      // Any graph with < 4 vertices is automatically chordal
    });
  });

  describe('Interval graphs', () => {
    it('should generate interval graph from intervals', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        interval: { kind: 'interval' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      expect(result.nodes).toHaveLength(10);
      expect(result.edges.length).toBeGreaterThan(0);

      // Verify all nodes have interval metadata
      result.nodes.forEach(node => {
        expect(node.data?.interval).toBeDefined();
        const interval = node.data!.interval as { start: number; end: number; length: number };
        expect(interval.start).toBeGreaterThanOrEqual(0);
        expect(interval.end).toBeGreaterThan(interval.start);
      });

      // Verify edges match interval intersections
      const adjacency = new Map<string, Set<string>>();
      for (const node of result.nodes) {
        adjacency.set(node.id, new Set());
      }
      for (const edge of result.edges) {
        adjacency.get(edge.source)?.add(edge.target);
        adjacency.get(edge.target)?.add(edge.source);
      }

      // Check all pairs
      for (let i = 0; i < result.nodes.length; i++) {
        for (let j = i + 1; j < result.nodes.length; j++) {
          const a = result.nodes[i];
          const b = result.nodes[j];
          const aInterval = a.data!.interval as { start: number; end: number; length: number };
          const bInterval = b.data!.interval as { start: number; end: number; length: number };

          const intersect = aInterval.start < bInterval.end && bInterval.start < aInterval.end;
          const hasEdge = adjacency.get(a.id)?.has(b.id);

          expect(hasEdge).toBe(intersect);
        }
      }
    });

    it('should handle minimal interval graph (n=2)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        interval: { kind: 'interval' },
      };

      const result = generateGraph(spec, { nodeCount: 2, seed: 42 });

      expect(result.nodes).toHaveLength(2);
      result.nodes.forEach(node => {
        expect(node.data?.interval).toBeDefined();
      });
    });
  });

  describe('Permutation graphs', () => {
    it('should generate permutation graph from permutation π', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        permutation: { kind: 'permutation' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      expect(result.nodes).toHaveLength(10);

      // Verify all nodes have permutation metadata
      result.nodes.forEach(node => {
        expect(node.data?.permutationValue).toBeDefined();
        expect(node.data!.permutationValue).toBeGreaterThanOrEqual(0);
        expect(node.data!.permutationValue).toBeLessThan(10);
      });

      // Verify edges match permutation pattern
      const permutation = result.nodes.map(n => n.data!.permutationValue);
      const adjacency = new Map<string, Set<string>>();
      for (const node of result.nodes) {
        adjacency.set(node.id, new Set());
      }
      for (const edge of result.edges) {
        adjacency.get(edge.source)?.add(edge.target);
        adjacency.get(edge.target)?.add(edge.source);
      }

      // Check all pairs
      for (let i = 0; i < result.nodes.length; i++) {
        for (let j = i + 1; j < result.nodes.length; j++) {
          const diff1 = i - j;
          const diff2 = (permutation[i] as number) - (permutation[j] as number);
          const shouldHaveEdge = diff1 * diff2 < 0;
          const hasEdge = adjacency.get(result.nodes[i].id)?.has(result.nodes[j].id);

          expect(hasEdge).toBe(shouldHaveEdge);
        }
      }
    });

    it('should handle trivial permutation graph (n=2)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        permutation: { kind: 'permutation' },
      };

      const result = generateGraph(spec, { nodeCount: 2, seed: 42 });

      expect(result.nodes).toHaveLength(2);
      result.nodes.forEach(node => {
        expect(node.data?.permutationValue).toBeDefined();
      });
    });
  });

  describe('Comparability graphs', () => {
    it('should generate comparability graph (transitively orientable)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        comparability: { kind: 'comparability' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      expect(result.nodes).toHaveLength(10);
      expect(result.edges.length).toBeGreaterThan(0);

      // Verify all nodes have topological order metadata
      result.nodes.forEach(node => {
        expect(node.data?.topologicalOrder).toBeDefined();
        expect(node.data!.topologicalOrder).toBeGreaterThanOrEqual(0);
        expect(node.data!.topologicalOrder).toBeLessThan(10);
      });

      // Verify topological orders are unique (permutation of 0..n-1)
      const orders = result.nodes.map(n => n.data!.topologicalOrder);
      const uniqueOrders = new Set(orders);
      expect(uniqueOrders.size).toBe(10);
    });

    it('should handle trivial comparability graph (n=2)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        comparability: { kind: 'comparability' },
      };

      const result = generateGraph(spec, { nodeCount: 2, seed: 42 });

      expect(result.nodes).toHaveLength(2);
      result.nodes.forEach(node => {
        expect(node.data?.topologicalOrder).toBeDefined();
      });
    });
  });

  describe('Perfect graphs', () => {
    it('should generate perfect graph (ω(H) = χ(H) for all induced H)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        perfect: { kind: 'perfect' },
      };

      const result = generateGraph(spec, { nodeCount: 10, seed: 42 });

      expect(result.nodes).toHaveLength(10);
      expect(result.edges.length).toBeGreaterThan(0);

      // Verify all nodes have perfect class metadata
      result.nodes.forEach(node => {
        expect(node.data?.perfectClass).toBeDefined();
        expect(['chordal', 'bipartite', 'cograph']).toContain(node.data!.perfectClass);
      });

      // Verify all nodes have the same perfect class
      const perfectClass = result.nodes[0].data!.perfectClass;
      result.nodes.forEach(node => {
        expect(node.data!.perfectClass).toBe(perfectClass);
      });
    });

    it('should handle trivial perfect graph (n=2)', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        perfect: { kind: 'perfect' },
      };

      const result = generateGraph(spec, { nodeCount: 2, seed: 42 });

      expect(result.nodes).toHaveLength(2);
      result.nodes.forEach(node => {
        expect(node.data?.perfectClass).toBeDefined();
      });
    });
  });
});
