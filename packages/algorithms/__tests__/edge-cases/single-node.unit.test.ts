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

describe('single node graph edge cases', () => {
  describe('traversal algorithms with single node', () => {
    it('DFS should visit single node once', () => {
      const graph = new Graph<Node, Edge>(true);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);

      const result = dfs(graph, 'A');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toEqual([node]);
        expect(result.value.parents.get('A')).toBe(null);
        expect(result.value.discovered.get('A')).toBe(1);
        expect(result.value.finished.get('A')).toBe(2);
      }
    });

    it('BFS should visit single node once', () => {
      const graph = new Graph<Node, Edge>(false);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);

      const result = bfs(graph, 'A');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toEqual([node]);
        expect(result.value.parents.get('A')).toBe(null);
      }
    });
  });

  describe('pathfinding algorithms with single node', () => {
    it('Dijkstra should find trivial path from node to itself', () => {
      const graph = new Graph<Node, Edge>(true);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);

      const result = dijkstra(graph, 'A', 'A');
      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;
        expect(path.nodes).toEqual([node]);
        expect(path.edges).toEqual([]);
        expect(path.totalWeight).toBe(0);
      }
    });

    it('Dijkstra should find no path to non-existent node', () => {
      const graph = new Graph<Node, Edge>(true);
      graph.addNode({ id: 'A', type: 'node' });

      const result = dijkstra(graph, 'A', 'B');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('analysis algorithms with single node', () => {
    it('topologicalSort should return single node', () => {
      const graph = new Graph<Node, Edge>(true);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);

      const result = topologicalSort(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([node]);
      }
    });

    it('detectCycle should find no cycle in single node graph', () => {
      const graph = new Graph<Node, Edge>(true);
      graph.addNode({ id: 'A', type: 'node' });

      const result = detectCycle(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(false);
      }
    });

    it('connectedComponents should return one component with single node', () => {
      const graph = new Graph<Node, Edge>(false);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);

      const result = connectedComponents(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].nodes).toEqual([node]);
        expect(result.value[0].size).toBe(1);
        expect(result.value[0].id).toBe(0);
      }
    });

    it('stronglyConnectedComponents should return one SCC with single node', () => {
      const graph = new Graph<Node, Edge>(true);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);

      const result = stronglyConnectedComponents(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].nodes).toEqual([node]);
        expect(result.value[0].size).toBe(1);
      }
    });
  });

  describe('single node with self-loop', () => {
    it('DFS should handle self-loop correctly', () => {
      const graph = new Graph<Node, Edge>(true);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);
      graph.addEdge({ id: 'e1', source: 'A', target: 'A', type: 'self-loop' });

      const result = dfs(graph, 'A');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toEqual([node]);
        // Node visited once despite self-loop
      }
    });

    it('BFS should handle self-loop correctly', () => {
      const graph = new Graph<Node, Edge>(false);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);
      graph.addEdge({ id: 'e1', source: 'A', target: 'A', type: 'self-loop' });

      const result = bfs(graph, 'A');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.visitOrder).toEqual([node]);
      }
    });

    it('detectCycle should find cycle in directed self-loop', () => {
      const graph = new Graph<Node, Edge>(true);
      graph.addNode({ id: 'A', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'A', type: 'self-loop' });

      const result = detectCycle(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.some).toBe(true);
        if (result.value.some) {
          // Cycle path includes start and end nodes (A → A forms cycle)
          expect(result.value.value.nodes.length).toBeGreaterThanOrEqual(1);
          expect(result.value.value.nodes.some(n => n.id === 'A')).toBe(true);
        }
      }
    });

    it('topologicalSort should fail with self-loop cycle', () => {
      const graph = new Graph<Node, Edge>(true);
      graph.addNode({ id: 'A', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'A', type: 'self-loop' });

      const result = topologicalSort(graph);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('cycle-detected');
      }
    });

    it('stronglyConnectedComponents should identify self-loop as SCC', () => {
      const graph = new Graph<Node, Edge>(true);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);
      graph.addEdge({ id: 'e1', source: 'A', target: 'A', type: 'self-loop' });

      const result = stronglyConnectedComponents(graph);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].nodes).toEqual([node]);
      }
    });
  });

  describe('single node with weighted edges', () => {
    it('Dijkstra should handle self-loop with positive weight', () => {
      const graph = new Graph<Node, Edge>(true);
      const node: Node = { id: 'A', type: 'node' };
      graph.addNode(node);
      graph.addEdge({ id: 'e1', source: 'A', target: 'A', type: 'self-loop', weight: 5 });

      // Trivial path A → A should have weight 0 (no edges traversed)
      const result = dijkstra(graph, 'A', 'A');
      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value.totalWeight).toBe(0);
        expect(result.value.value.edges).toHaveLength(0);
      }
    });

    it('Dijkstra should reject self-loop with negative weight', () => {
      const graph = new Graph<Node, Edge>(true);
      graph.addNode({ id: 'A', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'A', type: 'self-loop', weight: -1 });

      const result = dijkstra(graph, 'A', 'A');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('negative-weight');
      }
    });
  });

  describe('directedness with single node', () => {
    it('should behave identically for directed vs undirected single node', () => {
      const directedGraph = new Graph<Node, Edge>(true);
      const undirectedGraph = new Graph<Node, Edge>(false);

      const node: Node = { id: 'A', type: 'node' };
      directedGraph.addNode(node);
      undirectedGraph.addNode(node);

      // DFS
      const dfsDirected = dfs(directedGraph, 'A');
      const dfsUndirected = dfs(undirectedGraph, 'A');
      expect(dfsDirected.ok && dfsDirected.value.visitOrder).toEqual(
        dfsUndirected.ok && dfsUndirected.value.visitOrder
      );

      // BFS
      const bfsDirected = bfs(directedGraph, 'A');
      const bfsUndirected = bfs(undirectedGraph, 'A');
      expect(bfsDirected.ok && bfsDirected.value.visitOrder).toEqual(
        bfsUndirected.ok && bfsUndirected.value.visitOrder
      );

      // Components
      const ccDirected = connectedComponents(directedGraph);
      const ccUndirected = connectedComponents(undirectedGraph);
      expect(ccDirected.ok && ccDirected.value.length).toBe(
        ccUndirected.ok && ccUndirected.value.length
      );
    });
  });

  describe('removal operations on single node graph', () => {
    it('should become empty after removing only node', () => {
      const graph = new Graph<Node, Edge>(true);
      graph.addNode({ id: 'A', type: 'node' });
      expect(graph.getNodeCount()).toBe(1);

      const removeResult = graph.removeNode('A');
      expect(removeResult.ok).toBe(true);
      expect(graph.getNodeCount()).toBe(0);

      // Should behave like empty graph
      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok && componentsResult.value).toEqual([]);
    });

    it('should handle adding and removing single node multiple times', () => {
      const graph = new Graph<Node, Edge>(true);

      for (let i = 0; i < 3; i++) {
        graph.addNode({ id: 'A', type: 'node' });
        expect(graph.getNodeCount()).toBe(1);

        const dfsResult = dfs(graph, 'A');
        expect(dfsResult.ok).toBe(true);

        graph.removeNode('A');
        expect(graph.getNodeCount()).toBe(0);
      }
    });
  });
});
