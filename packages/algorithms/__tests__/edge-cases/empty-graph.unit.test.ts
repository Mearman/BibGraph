import { describe, it, expect } from 'vitest';
import {
  Graph,
  dfs,
  bfs,
  dijkstra,
  topologicalSort,
  detectCycle,
  connectedComponents,
  stronglyConnectedComponents,
  type Node,
  type Edge,
} from '../../src/index';

describe('empty graph edge cases', () => {
  describe('traversal algorithms with empty graph', () => {
    it('DFS should handle empty graph gracefully', () => {
      const graph = new Graph<Node, Edge>(true);

      // Attempt traversal from non-existent node
      const result = dfs(graph, 'A');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('not found');
      }
    });

    it('BFS should handle empty graph gracefully', () => {
      const graph = new Graph<Node, Edge>(false);

      // Attempt traversal from non-existent node
      const result = bfs(graph, 'A');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('pathfinding algorithms with empty graph', () => {
    it('Dijkstra should handle empty graph gracefully', () => {
      const graph = new Graph<Node, Edge>(true);

      // Attempt pathfinding in empty graph
      const result = dijkstra(graph, 'A', 'B');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('analysis algorithms with empty graph', () => {
    it('topologicalSort should return empty array for empty graph', () => {
      const graph = new Graph<Node, Edge>(true);

      const result = topologicalSort(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('detectCycle should find no cycles in empty graph', () => {
      const graph = new Graph<Node, Edge>(true);

      const result = detectCycle(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(false);
      }
    });

    it('connectedComponents should return empty array for empty graph', () => {
      const graph = new Graph<Node, Edge>(false);

      const result = connectedComponents(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('stronglyConnectedComponents should return empty array for empty graph', () => {
      const graph = new Graph<Node, Edge>(true);

      const result = stronglyConnectedComponents(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('empty graph with directedness variations', () => {
    it('should handle empty directed graph consistently', () => {
      const graph = new Graph<Node, Edge>(true);

      expect(graph.isDirected()).toBe(true);
      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);

      const topoResult = topologicalSort(graph);
      expect(topoResult.ok && topoResult.value).toEqual([]);

      const cycleResult = detectCycle(graph);
      expect(cycleResult.ok && !cycleResult.value.some).toBe(true);

      const sccResult = stronglyConnectedComponents(graph);
      expect(sccResult.ok && sccResult.value).toEqual([]);
    });

    it('should handle empty undirected graph consistently', () => {
      const graph = new Graph<Node, Edge>(false);

      expect(graph.isDirected()).toBe(false);
      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);

      const cycleResult = detectCycle(graph);
      expect(cycleResult.ok && !cycleResult.value.some).toBe(true);

      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok && componentsResult.value).toEqual([]);
    });
  });

  describe('graph operations on empty graph', () => {
    it('should handle node removal from empty graph', () => {
      const graph = new Graph<Node, Edge>(true);

      const result = graph.removeNode('A');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle edge removal from empty graph', () => {
      const graph = new Graph<Node, Edge>(true);

      const result = graph.removeEdge('e1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle getNode from empty graph', () => {
      const graph = new Graph<Node, Edge>(true);

      const result = graph.getNode('A');
      expect(result.some).toBe(false);
    });

    it('should handle getNeighbors from empty graph', () => {
      const graph = new Graph<Node, Edge>(true);

      const result = graph.getNeighbors('A');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should handle hasNode from empty graph', () => {
      const graph = new Graph<Node, Edge>(true);

      expect(graph.hasNode('A')).toBe(false);
    });
  });

  describe('transition from empty to non-empty', () => {
    it('should work correctly after adding first node', () => {
      const graph = new Graph<Node, Edge>(true);

      // Start empty
      expect(graph.getNodeCount()).toBe(0);

      // Add first node
      const addResult = graph.addNode({ id: 'A', type: 'node' });
      expect(addResult.ok).toBe(true);
      expect(graph.getNodeCount()).toBe(1);

      // Now algorithms should work
      const dfsResult = dfs(graph, 'A');
      expect(dfsResult.ok).toBe(true);
      if (dfsResult.ok) {
        expect(dfsResult.value.visitOrder).toHaveLength(1);
      }

      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok).toBe(true);
      if (componentsResult.ok) {
        expect(componentsResult.value).toHaveLength(1);
        expect(componentsResult.value[0].size).toBe(1);
      }
    });

    it('should work correctly after adding nodes then removing all', () => {
      const graph = new Graph<Node, Edge>(true);

      // Add nodes
      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      expect(graph.getNodeCount()).toBe(2);

      // Remove all nodes
      graph.removeNode('A');
      graph.removeNode('B');
      expect(graph.getNodeCount()).toBe(0);

      // Should behave like empty graph
      const topoResult = topologicalSort(graph);
      expect(topoResult.ok && topoResult.value).toEqual([]);

      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok && componentsResult.value).toEqual([]);
    });
  });
});
