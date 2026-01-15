/**
 * Unit tests for GraphAdapter
 */

// eslint-disable-next-line n/no-extraneous-import
import { describe, expect, it, vi } from 'vitest';

import { GraphAdapter } from './graph-adapter';
import type { Edge, Graph, Node } from '@bibgraph/algorithms';

describe('GraphAdapter', () => {
  interface TestNode extends Node {
    id: string;
    type: string;
    data?: unknown;
  }

  interface TestEdge extends Edge {
    id: string;
    type: string;
    source: string;
    target: string;
    weight?: number;
  }

  /**
   * Create a mock Graph instance with Option/Result monad behavior
   */
  const createMockGraph = (overrides?: Partial<Graph<TestNode, TestEdge>>): Graph<TestNode, TestEdge> => {
    const mockGraph = {
      hasNode: vi.fn(),
      getNode: vi.fn(),
      getNeighbors: vi.fn(),
      getAllNodes: vi.fn(),
      isDirected: vi.fn(),
      getOutgoingEdges: vi.fn(),
      ...overrides,
    } as unknown as Graph<TestNode, TestEdge>;

    return mockGraph;
  };

  describe('hasNode', () => {
    it('should return true when node exists', () => {
      const mockGraph = createMockGraph({
        hasNode: vi.fn().mockReturnValue(true),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.hasNode('node1')).toBe(true);
      expect(mockGraph.hasNode).toHaveBeenCalledWith('node1');
    });

    it('should return false when node does not exist', () => {
      const mockGraph = createMockGraph({
        hasNode: vi.fn().mockReturnValue(false),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.hasNode('node1')).toBe(false);
      expect(mockGraph.hasNode).toHaveBeenCalledWith('node1');
    });
  });

  describe('getNode', () => {
    it('should return node data when node exists (Option.some)', () => {
      const node: TestNode = { id: 'node1', type: 'test', data: { label: 'Test' } };
      const mockGraph = createMockGraph({
        getNode: vi.fn().mockReturnValue({
          some: true,
          value: node,
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getNode('node1')).toEqual(node);
      expect(mockGraph.getNode).toHaveBeenCalledWith('node1');
    });

    it('should return null when node does not exist (Option.none)', () => {
      const mockGraph = createMockGraph({
        getNode: vi.fn().mockReturnValue({
          some: false,
          value: null,
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getNode('node1')).toBeNull();
      expect(mockGraph.getNode).toHaveBeenCalledWith('node1');
    });
  });

  describe('getNeighbors', () => {
    it('should return neighbor IDs when node exists (Result.ok)', () => {
      const neighbors = ['node2', 'node3', 'node4'];
      const mockGraph = createMockGraph({
        getNeighbors: vi.fn().mockReturnValue({
          ok: true,
          value: neighbors,
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getNeighbors('node1')).toEqual(neighbors);
      expect(mockGraph.getNeighbors).toHaveBeenCalledWith('node1');
    });

    it('should return empty array when node does not exist (Result.err)', () => {
      const mockGraph = createMockGraph({
        getNeighbors: vi.fn().mockReturnValue({
          ok: false,
          value: [],
          error: new Error('Node not found'),
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getNeighbors('node1')).toEqual([]);
      expect(mockGraph.getNeighbors).toHaveBeenCalledWith('node1');
    });

    it('should return empty array for empty neighbor list', () => {
      const mockGraph = createMockGraph({
        getNeighbors: vi.fn().mockReturnValue({
          ok: true,
          value: [],
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getNeighbors('node1')).toEqual([]);
      expect(mockGraph.getNeighbors).toHaveBeenCalledWith('node1');
    });
  });

  describe('getAllNodes', () => {
    it('should return all nodes in the graph', () => {
      const nodes: TestNode[] = [
        { id: 'node1', type: 'test', data: { label: 'Node 1' } },
        { id: 'node2', type: 'test', data: { label: 'Node 2' } },
        { id: 'node3', type: 'test', data: { label: 'Node 3' } },
      ];

      const mockGraph = createMockGraph({
        getAllNodes: vi.fn().mockReturnValue(nodes),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getAllNodes()).toEqual(nodes);
      expect(mockGraph.getAllNodes).toHaveBeenCalled();
    });

    it('should return empty array when graph has no nodes', () => {
      const mockGraph = createMockGraph({
        getAllNodes: vi.fn().mockReturnValue([]),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getAllNodes()).toEqual([]);
      expect(mockGraph.getAllNodes).toHaveBeenCalled();
    });
  });

  describe('isDirected', () => {
    it('should return true for directed graphs', () => {
      const mockGraph = createMockGraph({
        isDirected: vi.fn().mockReturnValue(true),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.isDirected()).toBe(true);
      expect(mockGraph.isDirected).toHaveBeenCalled();
    });

    it('should return false for undirected graphs', () => {
      const mockGraph = createMockGraph({
        isDirected: vi.fn().mockReturnValue(false),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.isDirected()).toBe(false);
      expect(mockGraph.isDirected).toHaveBeenCalled();
    });
  });

  describe('getOutgoingEdges', () => {
    it('should return outgoing edges when node exists (Result.ok)', () => {
      const edges: TestEdge[] = [
        { id: 'e1', type: 'test', source: 'node1', target: 'node2', weight: 1 },
        { id: 'e2', type: 'test', source: 'node1', target: 'node3', weight: 2 },
      ];

      const mockGraph = createMockGraph({
        getOutgoingEdges: vi.fn().mockReturnValue({
          ok: true,
          value: edges,
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getOutgoingEdges('node1')).toEqual(edges);
      expect(mockGraph.getOutgoingEdges).toHaveBeenCalledWith('node1');
    });

    it('should return empty array when node does not exist (Result.err)', () => {
      const mockGraph = createMockGraph({
        getOutgoingEdges: vi.fn().mockReturnValue({
          ok: false,
          value: [],
          error: new Error('Node not found'),
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getOutgoingEdges('node1')).toEqual([]);
      expect(mockGraph.getOutgoingEdges).toHaveBeenCalledWith('node1');
    });

    it('should return empty array for node with no outgoing edges', () => {
      const mockGraph = createMockGraph({
        getOutgoingEdges: vi.fn().mockReturnValue({
          ok: true,
          value: [],
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      expect(adapter.getOutgoingEdges('node1')).toEqual([]);
      expect(mockGraph.getOutgoingEdges).toHaveBeenCalledWith('node1');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete graph traversal workflow', () => {
      // Setup a simple graph: node1 -> node2 -> node3
      const nodes: TestNode[] = [
        { id: 'node1', type: 'test' },
        { id: 'node2', type: 'test' },
        { id: 'node3', type: 'test' },
      ];

      const edges: TestEdge[] = [
        { id: 'e1', type: 'test', source: 'node1', target: 'node2' },
        { id: 'e2', type: 'test', source: 'node2', target: 'node3' },
      ];

      const mockGraph = createMockGraph({
        hasNode: vi.fn((id: string) => id === 'node1' || id === 'node2' || id === 'node3'),
        // @ts-expect-error - Mocking Option type for testing
        getNode: vi.fn((id: string) => {
          const node = nodes.find(n => n.id === id);
          if (node) {
            return { some: true, value: node };
          }
          return { some: false, value: null };
        }),
        // @ts-expect-error - Mocking Result type for testing
        getNeighbors: vi.fn((id: string) => {
          if (id === 'node1') return { ok: true, value: ['node2'] };
          if (id === 'node2') return { ok: true, value: ['node3'] };
          return { ok: true, value: [] };
        }),
        getAllNodes: vi.fn().mockReturnValue(nodes),
        isDirected: vi.fn().mockReturnValue(true),
        // @ts-expect-error - Mocking Result type for testing
        getOutgoingEdges: vi.fn((id: string) => {
          if (id === 'node1') return { ok: true, value: [edges[0]] };
          if (id === 'node2') return { ok: true, value: [edges[1]] };
          return { ok: true, value: [] };
        }),
      });

      const adapter = new GraphAdapter(mockGraph);

      // Test graph properties
      expect(adapter.isDirected()).toBe(true);
      expect(adapter.getAllNodes()).toEqual(nodes);
      expect(adapter.hasNode('node1')).toBe(true);
      expect(adapter.hasNode('node4')).toBe(false);

      // Test node retrieval
      expect(adapter.getNode('node1')).toEqual(nodes[0]);
      expect(adapter.getNode('node4')).toBeNull();

      // Test neighbors
      expect(adapter.getNeighbors('node1')).toEqual(['node2']);
      expect(adapter.getNeighbors('node2')).toEqual(['node3']);
      expect(adapter.getNeighbors('node3')).toEqual([]);

      // Test outgoing edges
      expect(adapter.getOutgoingEdges('node1')).toEqual([edges[0]]);
      expect(adapter.getOutgoingEdges('node2')).toEqual([edges[1]]);
      expect(adapter.getOutgoingEdges('node3')).toEqual([]);
    });
  });
});
