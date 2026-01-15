/**
 * Unit tests for ego-network extraction algorithm
 */
import { beforeEach,describe, expect, it } from 'vitest';

import type { EdgeBase,NodeBase, ReadableGraph } from '../interfaces/readable-graph';
import {
  extractEgoNetwork,
  extractMultiSourceEgoNetwork,
} from './ego-network';

interface TestNode extends NodeBase {
  id: string;
  label: string;
}

interface TestEdge extends EdgeBase {
  id: string;
  source: string;
  target: string;
  type: string;
}

/**
 * Simple in-memory graph implementation for testing
 */
class TestGraph implements ReadableGraph<TestNode, TestEdge> {
  private nodes = new Map<string, TestNode>();
  private adjacency = new Map<string, Set<string>>();
  private edges = new Map<string, TestEdge>();
  private directed: boolean;

  constructor(directed: boolean) {
    this.directed = directed;
  }

  addNode(node: TestNode): void {
    this.nodes.set(node.id, node);
    this.adjacency.set(node.id, new Set());
  }

  addEdge(edge: TestEdge): void {
    this.edges.set(edge.id, edge);
    this.adjacency.get(edge.source)?.add(edge.target);
    if (!this.directed) {
      this.adjacency.get(edge.target)?.add(edge.source);
    }
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): TestNode | null {
    return this.nodes.get(id) || null;
  }

  getNeighbors(id: string): string[] {
    return [...this.adjacency.get(id) || []];
  }

  getAllNodes(): TestNode[] {
    return [...this.nodes.values()];
  }

  isDirected(): boolean {
    return this.directed;
  }

  getOutgoingEdges(id: string): TestEdge[] {
    return [...this.edges.values()].filter(
      e => e.source === id || (!this.directed && e.target === id)
    );
  }
}

describe('extractEgoNetwork', () => {
  let graph: TestGraph;

  beforeEach(() => {
    graph = new TestGraph(true);
  });

  describe('Basic extraction', () => {
    it('should extract radius 0 (seed nodes only)', () => {
      // Create graph: A -> B -> C
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 0,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(1);
        expect(result.value.nodes[0].id).toBe('A');
        expect(result.value.edges).toHaveLength(0);
      }
    });

    it('should extract radius 1 (immediate neighbors)', () => {
      // Create graph: A -> B -> C
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(2);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).not.toContain('C');
        expect(result.value.edges).toHaveLength(1);
        expect(result.value.edges[0].source).toBe('A');
        expect(result.value.edges[0].target).toBe('B');
      }
    });

    it('should extract radius 2 (two-hop neighbors)', () => {
      // Create graph: A -> B -> C -> D
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'D', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 2,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(3);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).toContain('C');
        expect(ids).not.toContain('D');
      }
    });

    it('should extract multi-source ego network', () => {
      // Create graph: A -> B, C -> D
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A', 'C'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(4);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).toContain('C');
        expect(ids).toContain('D');
      }
    });
  });

  describe('includeSeed option', () => {
    it('should include seed nodes when includeSeed is true', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A'],
        includeSeed: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(2);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
      }
    });

    it('should exclude seed nodes when includeSeed is false', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A'],
        includeSeed: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(1);
        expect(result.value.nodes[0].id).toBe('B');
      }
    });

    it('should default includeSeed to true', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A'],
        // includeSeed not specified, should default to true
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(2);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
      }
    });
  });

  describe('Validation errors', () => {
    it('should return error for negative radius', () => {
      graph.addNode({ id: 'A', label: 'Node A' });

      const result = extractEgoNetwork(graph, {
        radius: -1,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-options');
        expect(result.error.message).toContain('non-negative');
      }
    });

    it('should return error for empty seed nodes array', () => {
      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: [],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-options');
        expect(result.error.message).toContain('At least one seed node');
      }
    });

    it('should return error for missing seed node', () => {
      graph.addNode({ id: 'A', label: 'Node A' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['Z'], // Z doesn't exist
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('Z');
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return error for multiple missing seed nodes', () => {
      graph.addNode({ id: 'A', label: 'Node A' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A', 'Y', 'Z'], // Y and Z don't exist
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('Y');
      }
    });
  });

  describe('Directed vs undirected graphs', () => {
    it('should extract ego network from directed graph', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['B'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(2);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('B');
        expect(ids).toContain('C');
        expect(ids).not.toContain('A'); // A is not reachable from B in directed graph
      }
    });

    it('should extract ego network from undirected graph', () => {
      const undirected = new TestGraph(false);
      undirected.addNode({ id: 'A', label: 'Node A' });
      undirected.addNode({ id: 'B', label: 'Node B' });
      undirected.addNode({ id: 'C', label: 'Node C' });
      undirected.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      undirected.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });

      const result = extractEgoNetwork(undirected, {
        radius: 1,
        seedNodes: ['B'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(3);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).toContain('C');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle disconnected components', () => {
      // Create graph: A -> B, C -> D (disconnected)
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 2,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(2);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).not.toContain('C');
        expect(ids).not.toContain('D');
      }
    });

    it('should handle node with no edges', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(1);
        expect(result.value.nodes[0].id).toBe('A');
        expect(result.value.edges).toHaveLength(0);
      }
    });

    it('should handle large radius that captures entire graph', () => {
      // Create graph: A -> B -> C -> D
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'D', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 100, // Much larger than needed
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(4);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).toContain('C');
        expect(ids).toContain('D');
      }
    });

    it('should handle complex branching graph', () => {
      //      A
      //    / | \
      //   B  C  D
      //   |     |
      //   E     F
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addNode({ id: 'E', label: 'Node E' });
      graph.addNode({ id: 'F', label: 'Node F' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'A', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'D', type: 'test' });
      graph.addEdge({ id: 'E4', source: 'B', target: 'E', type: 'test' });
      graph.addEdge({ id: 'E5', source: 'D', target: 'F', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 2,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(6);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).toContain('C');
        expect(ids).toContain('D');
        expect(ids).toContain('E');
        expect(ids).toContain('F');
      }
    });

    it('should extract induced subgraph with correct edges', () => {
      // Create graph: A -> B, B -> C, A -> C (triangle)
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'test' });

      const result = extractEgoNetwork(graph, {
        radius: 1,
        seedNodes: ['A'],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Induced subgraph includes A, B, C (all nodes within 1 hop of A)
        // and all edges between them (A->B, A->C, B->C)
        expect(result.value.nodes).toHaveLength(3);
        expect(result.value.edges).toHaveLength(3);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).toContain('C');
      }
    });

    it('should handle radius 0 with includeSeed false', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });

      const result = extractEgoNetwork(graph, {
        radius: 0,
        seedNodes: ['A'],
        includeSeed: false,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(0);
        expect(result.value.edges).toHaveLength(0);
      }
    });
  });

  describe('extractMultiSourceEgoNetwork', () => {
    it('should extract union of multiple seed node neighborhoods', () => {
      // Create graph: A -> B, C -> D, B -> E
      // With radius 1 from A and C:
      // - A's neighborhood: {A, B}
      // - C's neighborhood: {C, D}
      // - Union: {A, B, C, D}
      // Note: E is at distance 2 from A (A->B->E), so NOT included with radius 1
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addNode({ id: 'E', label: 'Node E' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'B', target: 'E', type: 'test' });

      const result = extractMultiSourceEgoNetwork(graph, ['A', 'C'], 1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(4);
        const ids = result.value.nodes.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).toContain('C');
        expect(ids).toContain('D');
        expect(ids).not.toContain('E'); // E is at distance 2 from A
      }
    });

    it('should pass includeSeed parameter correctly', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });

      const result = extractMultiSourceEgoNetwork(graph, ['A'], 1, false);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nodes).toHaveLength(1);
        expect(result.value.nodes[0].id).toBe('B');
      }
    });

    it('should handle empty seed nodes array', () => {
      const result = extractMultiSourceEgoNetwork(graph, [], 1);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-options');
      }
    });
  });
});
