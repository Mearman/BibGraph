/**
 * Unit tests for BFS traversal algorithm
 */
import { beforeEach,describe, expect, it } from 'vitest';

import type { EdgeBase,NodeBase, ReadableGraph } from '../interfaces/readable-graph';
import { bfs } from './bfs';

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

describe('bfs (Breadth-First Search)', () => {
  let graph: TestGraph;

  beforeEach(() => {
    graph = new TestGraph(true);
  });

  describe('Basic traversal', () => {
    it('should traverse connected graph in breadth-first order', () => {
      // Create graph: A -> B, A -> C, B -> D
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'A', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'B', target: 'D', type: 'test' });

      const result = bfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(4);
        expect(result.value.visitOrder[0].id).toBe('A');

        // Level 1 nodes (B, C) should come before level 2 nodes (D)
        const ids = result.value.visitOrder.map(n => n.id);
        const indexB = ids.indexOf('B');
        const indexC = ids.indexOf('C');
        const indexD = ids.indexOf('D');

        expect(indexB).toBeLessThan(indexD);
        expect(indexC).toBeLessThan(indexD);
      }
    });

    it('should visit each node exactly once', () => {
      // Create graph with cycle: A -> B -> C -> A
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'C', target: 'A', type: 'test' });

      const result = bfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(3);
        const ids = result.value.visitOrder.map(n => n.id);
        expect(new Set(ids).size).toBe(3);
      }
    });

    it('should only visit reachable nodes from start', () => {
      // Create graph with disconnected component: A -> B, C -> D
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'C', target: 'D', type: 'test' });

      const result = bfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(2);
        const ids = result.value.visitOrder.map(n => n.id);
        expect(ids).toContain('A');
        expect(ids).toContain('B');
        expect(ids).not.toContain('C');
        expect(ids).not.toContain('D');
      }
    });
  });

  describe('Parent tracking', () => {
    it('should track parent relationships correctly', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'A', target: 'C', type: 'test' });

      const result = bfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.parents.get('A')).toBe(null);
        expect(result.value.parents.get('B')).toBe('A');
        expect(result.value.parents.get('C')).toBe('A');
      }
    });

    it('should allow path reconstruction from parent map', () => {
      // Create path: A -> B -> D
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'A', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'B', target: 'D', type: 'test' });

      const result = bfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Reconstruct path to D
        const path: string[] = [];
        let current: string | null = 'D';
        while (current !== null) {
          path.unshift(current);
          current = result.value.parents.get(current) ?? null;
        }

        expect(path).toEqual(['A', 'B', 'D']);
      }
    });
  });

  describe('Error handling', () => {
    it('should return error for null graph', () => {
      const result = bfs(null as any, 'A');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('null or undefined');
      }
    });

    it('should return error for missing start node', () => {
      graph.addNode({ id: 'A', label: 'Node A' });

      const result = bfs(graph, 'B');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('B');
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle single node graph', () => {
      graph.addNode({ id: 'A', label: 'Node A' });

      const result = bfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(1);
        expect(result.value.visitOrder[0].id).toBe('A');
        expect(result.value.parents.get('A')).toBe(null);
      }
    });

    it('should handle undirected graph correctly', () => {
      const undirected = new TestGraph(false);
      undirected.addNode({ id: 'A', label: 'Node A' });
      undirected.addNode({ id: 'B', label: 'Node B' });
      undirected.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });

      const result = bfs(undirected, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(2);
        expect(result.value.parents.get('B')).toBe('A');
      }
    });

    it('should handle graph with no edges', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });

      const result = bfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(1);
        expect(result.value.visitOrder[0].id).toBe('A');
      }
    });
  });
});
