/**
 * Unit tests for DFS traversal algorithm
 */
import { beforeEach,describe, expect, it } from 'vitest';

import type { EdgeBase,NodeBase, ReadableGraph } from '../interfaces/readable-graph';
import { dfs } from './dfs';

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

describe('dfs (Depth-First Search)', () => {
  let graph: TestGraph;

  beforeEach(() => {
    graph = new TestGraph(true);
  });

  describe('Basic traversal', () => {
    it('should traverse connected graph in depth-first order', () => {
      // Create graph: A -> B -> C
      //                \-> D
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addNode({ id: 'D', label: 'Node D' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });
      graph.addEdge({ id: 'E3', source: 'A', target: 'D', type: 'test' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(4);
        expect(result.value.visitOrder[0].id).toBe('A');
        const ids = result.value.visitOrder.map(n => n.id);
        expect(ids).toContain('B');
        expect(ids).toContain('C');
        expect(ids).toContain('D');
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

      const result = dfs(graph, 'A');

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

      const result = dfs(graph, 'A');

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
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.parents.get('A')).toBeNull();
        expect(result.value.parents.get('B')).toBe('A');
        expect(result.value.parents.get('C')).toBe('B');
      }
    });
  });

  describe('Discovery and finish times', () => {
    it('should record discovery and finish times', () => {
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.discovered).toBeDefined();
        expect(result.value.finished).toBeDefined();
        expect(result.value.discovered!.get('A')).toBeLessThan(result.value.discovered!.get('B')!);
        expect(result.value.finished!.get('B')).toBeLessThan(result.value.finished!.get('A')!);
      }
    });

    it('should record timestamps in valid order', () => {
      // Linear chain: A -> B -> C
      graph.addNode({ id: 'A', label: 'Node A' });
      graph.addNode({ id: 'B', label: 'Node B' });
      graph.addNode({ id: 'C', label: 'Node C' });
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'test' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const discovered = result.value.discovered!;
        const finished = result.value.finished!;

        // Discovery times increase
        expect(discovered.get('A')!).toBeLessThan(discovered.get('B')!);
        expect(discovered.get('B')!).toBeLessThan(discovered.get('C')!);

        // Finish times respect nested structure
        expect(finished.get('C')!).toBeLessThan(finished.get('B')!);
        expect(finished.get('B')!).toBeLessThan(finished.get('A')!);
      }
    });
  });

  describe('Error handling', () => {
    it('should return error for null graph', () => {
      const result = dfs(null as any, 'A');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('null or undefined');
      }
    });

    it('should return error for missing start node', () => {
      graph.addNode({ id: 'A', label: 'Node A' });

      const result = dfs(graph, 'Z');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('Z');
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle single node graph', () => {
      graph.addNode({ id: 'A', label: 'Node A' });

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(1);
        expect(result.value.visitOrder[0].id).toBe('A');
        expect(result.value.parents.get('A')).toBeNull();
        expect(result.value.discovered!.get('A')).toBeDefined();
        expect(result.value.finished!.get('A')).toBeDefined();
      }
    });

    it('should handle undirected graph correctly', () => {
      const undirected = new TestGraph(false);
      undirected.addNode({ id: 'A', label: 'Node A' });
      undirected.addNode({ id: 'B', label: 'Node B' });
      undirected.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'test' });

      const result = dfs(undirected, 'A');

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

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(1);
        expect(result.value.visitOrder[0].id).toBe('A');
      }
    });

    it('should handle complex graph with multiple branches', () => {
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

      const result = dfs(graph, 'A');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toHaveLength(6);
        expect(result.value.parents.get('A')).toBeNull();
        expect(result.value.parents.get('E')).toBe('B');
        expect(result.value.parents.get('F')).toBe('D');
      }
    });
  });
});
