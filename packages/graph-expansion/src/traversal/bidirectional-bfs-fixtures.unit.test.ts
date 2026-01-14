import { describe, test, expect } from 'vitest';
import { BidirectionalBFS } from './bidirectional-bfs';
import { MockGraphExpander } from '../fixtures/mock-graph-expander';
import { generateGraph, makeGraphSpec, type GraphSpec } from '@bibgraph/graph-gen';

describe('BidirectionalBFS with Test Fixtures', () => {
  describe('Simple canonical graphs', () => {
    test('finds path in linear chain: A→B→C→D', async () => {
      const graph = {
        nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'B', target: 'C' },
          { source: 'C', target: 'D' },
        ],
        spec: makeGraphSpec({ directionality: { kind: 'directed' } }),
      };

      const expander = new MockGraphExpander(graph);
      const bfs = new BidirectionalBFS(expander, 'A', 'D', {
        targetPaths: 1,
        maxIterations: 10,
      });

      const result = await bfs.search();

      expect(result.paths).toHaveLength(1);
      expect(result.paths[0]).toEqual(['A', 'B', 'C', 'D']);
    });

    test('finds multiple paths in diamond graph', async () => {
      const graph = {
        nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'A', target: 'C' },
          { source: 'B', target: 'D' },
          { source: 'C', target: 'D' },
        ],
        spec: makeGraphSpec({ directionality: { kind: 'undirected' } }),
      };

      const expander = new MockGraphExpander(graph);
      const bfs = new BidirectionalBFS(expander, 'A', 'D', {
        targetPaths: 2,
        maxIterations: 10,
        minIterations: 0, // Stop immediately after finding 2 paths
      });

      const result = await bfs.search();

      expect(result.paths.length).toBeGreaterThanOrEqual(2);
      // Should find both paths: A→B→D and A→C→D
      expect(result.paths).toContainEqual(['A', 'B', 'D']);
      expect(result.paths).toContainEqual(['A', 'C', 'D']);
    });

    test('returns empty paths when no path exists (disconnected)', async () => {
      const graph = {
        nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'C', target: 'D' },
        ],
        spec: makeGraphSpec({ directionality: { kind: 'directed' } }),
      };

      const expander = new MockGraphExpander(graph);
      const bfs = new BidirectionalBFS(expander, 'A', 'D', {
        targetPaths: 1,
        maxIterations: 10,
      });

      const result = await bfs.search();

      expect(result.paths).toHaveLength(0);
    });

    test('handles self-path (source === target)', async () => {
      const graph = {
        nodes: [{ id: 'A' }, { id: 'B' }],
        edges: [{ source: 'A', target: 'B' }],
        spec: makeGraphSpec({ directionality: { kind: 'directed' } }),
      };

      const expander = new MockGraphExpander(graph);
      const bfs = new BidirectionalBFS(expander, 'A', 'A', {
        targetPaths: 1,
        maxIterations: 10,
      });

      const result = await bfs.search();

      // Should find trivial path [A]
      expect(result.paths).toHaveLength(1);
      expect(result.paths[0]).toEqual(['A']);
    });
  });

  describe('Degree-based prioritization', () => {
    test('prioritizes low-degree nodes over high-degree nodes', async () => {
      // Create graph: A→(B,HUB), B→C, HUB→C
      // B has degree 1, HUB has degree 100
      // Should prefer path through B (low degree) over HUB (high degree)
      const graph = {
        nodes: [
          { id: 'A' },
          { id: 'B' },
          { id: 'HUB' },
          { id: 'C' },
          ...Array.from({ length: 100 }, (_, i) => ({ id: `LEAF${i}` })),
        ],
        edges: [
          { source: 'A', target: 'B' },
          { source: 'A', target: 'HUB' },
          { source: 'B', target: 'C' },
          { source: 'HUB', target: 'C' },
          // Add 100 edges to HUB to make it high-degree
          ...Array.from({ length: 100 }, (_, i) => ({ source: 'HUB', target: `LEAF${i}` })),
        ],
        spec: makeGraphSpec({ directionality: { kind: 'directed' } }),
      };

      const expander = new MockGraphExpander(graph);
      const bfs = new BidirectionalBFS(expander, 'A', 'C', {
        targetPaths: 1,
        maxIterations: 10,
        minIterations: 0, // Stop immediately after finding first path
      });

      const result = await bfs.search();

      // Should find path through low-degree B first
      expect(result.paths.length).toBeGreaterThanOrEqual(1);
      expect(result.paths[0]).toEqual(['A', 'B', 'C']);
    });
  });

  describe('Generated graph fixtures', () => {
    test('works with generated directed acyclic graph (DAG)', async () => {
      const spec = makeGraphSpec({
        directionality: { kind: 'directed' },
        cycles: { kind: 'acyclic' },
        connectivity: { kind: 'connected' },
        density: { kind: 'sparse' },
      });

      const graph = generateGraph(spec, { nodeCount: 10, seed: 42 });
      const expander = new MockGraphExpander(graph);

      // Try finding path between first and last node
      const seedA = graph.nodes[0].id;
      const seedB = graph.nodes[graph.nodes.length - 1].id;

      const bfs = new BidirectionalBFS(expander, seedA, seedB, {
        targetPaths: 1,
        maxIterations: 20,
      });

      const result = await bfs.search();

      // For connected DAGs, should find at least one path
      if (result.paths.length > 0) {
        expect(result.paths[0][0]).toBe(seedA);
        expect(result.paths[0][result.paths[0].length - 1]).toBe(seedB);
      }
    });

    test('works with generated undirected tree', async () => {
      const spec = makeGraphSpec({
        directionality: { kind: 'undirected' },
        cycles: { kind: 'acyclic' },
        connectivity: { kind: 'connected' },
        density: { kind: 'sparse' },
      });

      const graph = generateGraph(spec, { nodeCount: 15, seed: 123 });
      const expander = new MockGraphExpander(graph);

      // In a tree, there's exactly one path between any two nodes
      const seedA = graph.nodes[0].id;
      const seedB = graph.nodes[graph.nodes.length - 1].id;

      const bfs = new BidirectionalBFS(expander, seedA, seedB, {
        targetPaths: 1,
        maxIterations: 20,
      });

      const result = await bfs.search();

      // Tree is connected, so path must exist
      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.paths[0][0]).toBe(seedA);
      expect(result.paths[0][result.paths[0].length - 1]).toBe(seedB);
    });

    test('handles dense connected graph', async () => {
      const spec = makeGraphSpec({
        directionality: { kind: 'directed' },
        cycles: { kind: 'cycles_allowed' },
        connectivity: { kind: 'connected' },
        density: { kind: 'dense' },
      });

      const graph = generateGraph(spec, { nodeCount: 20, seed: 456 });
      const expander = new MockGraphExpander(graph);

      const seedA = graph.nodes[0].id;
      const seedB = graph.nodes[10].id;

      const bfs = new BidirectionalBFS(expander, seedA, seedB, {
        targetPaths: 5,
        maxIterations: 10,
      });

      const result = await bfs.search();

      // Dense connected graph should have many paths
      expect(result.paths.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    test('handles empty graph', async () => {
      const graph = {
        nodes: [],
        edges: [],
        spec: makeGraphSpec({ directionality: { kind: 'directed' } }),
      };

      const expander = new MockGraphExpander(graph);
      const bfs = new BidirectionalBFS(expander, 'A', 'B', {
        targetPaths: 1,
        maxIterations: 10,
      });

      const result = await bfs.search();

      expect(result.paths).toHaveLength(0);
    });

    test('handles single node graph', async () => {
      const graph = {
        nodes: [{ id: 'A' }],
        edges: [],
        spec: makeGraphSpec({ directionality: { kind: 'directed' } }),
      };

      const expander = new MockGraphExpander(graph);
      const bfs = new BidirectionalBFS(expander, 'A', 'A', {
        targetPaths: 1,
        maxIterations: 10,
      });

      const result = await bfs.search();

      expect(result.paths).toHaveLength(1);
      expect(result.paths[0]).toEqual(['A']);
    });

    test('respects maxIterations limit', async () => {
      const graph = {
        nodes: Array.from({ length: 100 }, (_, i) => ({ id: `N${i}` })),
        edges: Array.from({ length: 99 }, (_, i) => ({
          source: `N${i}`,
          target: `N${i + 1}`,
        })),
        spec: makeGraphSpec({ directionality: { kind: 'directed' } }),
      };

      const expander = new MockGraphExpander(graph);
      const bfs = new BidirectionalBFS(expander, 'N0', 'N99', {
        targetPaths: 1,
        maxIterations: 2, // Very low limit
      });

      const result = await bfs.search();

      expect(result.iterations).toBeLessThanOrEqual(2);
    });
  });
});
