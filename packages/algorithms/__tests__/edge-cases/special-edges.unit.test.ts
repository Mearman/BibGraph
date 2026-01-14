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

describe('special edges edge cases', () => {
  describe('self-loops', () => {
    it('should handle graph with multiple self-loops', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addNode({ id: 'C', type: 'node' });

      // Self-loops on each node
      graph.addEdge({ id: 'loop1', source: 'A', target: 'A', type: 'self-loop' });
      graph.addEdge({ id: 'loop2', source: 'B', target: 'B', type: 'self-loop' });
      graph.addEdge({ id: 'loop3', source: 'C', target: 'C', type: 'self-loop' });

      // Regular edges
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });

      // DFS should visit all nodes despite self-loops
      const dfsResult = dfs(graph, 'A');
      expect(dfsResult.ok).toBe(true);
      if (dfsResult.ok) {
        expect(dfsResult.value.visitOrder).toHaveLength(3);
      }

      // Cycle detection should find cycles (self-loops are cycles)
      const cycleResult = detectCycle(graph);
      expect(cycleResult.ok).toBe(true);
      if (cycleResult.ok) {
        expect(cycleResult.value.some).toBe(true);
      }

      // Topological sort should fail
      const topoResult = topologicalSort(graph);
      expect(topoResult.ok).toBe(false);
      if (!topoResult.ok) {
        expect(topoResult.error.type).toBe('cycle-detected');
      }
    });

    it('should handle self-loop in undirected graph', () => {
      const graph = new Graph<Node, Edge>(false);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });

      graph.addEdge({ id: 'loop', source: 'A', target: 'A', type: 'self-loop' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });

      // BFS should work normally
      const bfsResult = bfs(graph, 'A');
      expect(bfsResult.ok).toBe(true);
      if (bfsResult.ok) {
        expect(bfsResult.value.visitOrder).toHaveLength(2);
      }

      // Cycle detection should find self-loop
      const cycleResult = detectCycle(graph);
      expect(cycleResult.ok).toBe(true);
      if (cycleResult.ok) {
        expect(cycleResult.value.some).toBe(true);
      }
    });

    it('should handle pathfinding through nodes with self-loops', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addNode({ id: 'C', type: 'node' });

      // Self-loops with high weight
      graph.addEdge({ id: 'loop1', source: 'A', target: 'A', type: 'self-loop', weight: 10 });
      graph.addEdge({ id: 'loop2', source: 'B', target: 'B', type: 'self-loop', weight: 10 });

      // Direct path
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge', weight: 1 });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge', weight: 1 });

      // Shortest path should ignore self-loops and find direct path
      const pathResult = dijkstra(graph, 'A', 'C');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        // Should use direct path A → B → C (weight 2), not self-loops
        expect(pathResult.value.value.totalWeight).toBe(2);
        expect(pathResult.value.value.nodes).toHaveLength(3);
      }
    });
  });

  describe('multi-edges (parallel edges)', () => {
    it('should handle multiple edges between same node pair', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });

      // Multiple edges A → B with different IDs
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'type1', weight: 5 });
      graph.addEdge({ id: 'e2', source: 'A', target: 'B', type: 'type2', weight: 3 });
      graph.addEdge({ id: 'e3', source: 'A', target: 'B', type: 'type3', weight: 7 });

      expect(graph.getEdgeCount()).toBe(3);

      // Get neighbors should return B multiple times (one per edge)
      const neighborsResult = graph.getNeighbors('A');
      expect(neighborsResult.ok).toBe(true);
      if (neighborsResult.ok) {
        // Array may contain duplicates for multi-edges
        expect(neighborsResult.value.length).toBeGreaterThanOrEqual(1);
        expect(neighborsResult.value.includes('B')).toBe(true);
      }

      // DFS visits B once
      const dfsResult = dfs(graph, 'A');
      expect(dfsResult.ok).toBe(true);
      if (dfsResult.ok) {
        expect(dfsResult.value.visitOrder).toHaveLength(2);
      }

      // Dijkstra should find path with minimum weight edge
      const pathResult = dijkstra(graph, 'A', 'B');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        // Should use e2 (weight 3) - lowest weight
        expect(pathResult.value.value.totalWeight).toBe(3);
      }
    });

    it('should handle bidirectional edges (A ↔ B)', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });

      // Both directions
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'forward', weight: 5 });
      graph.addEdge({ id: 'e2', source: 'B', target: 'A', type: 'backward', weight: 3 });

      expect(graph.getEdgeCount()).toBe(2);

      // Path A → B should use forward edge
      const pathAB = dijkstra(graph, 'A', 'B');
      expect(pathAB.ok).toBe(true);
      if (pathAB.ok && pathAB.value.some) {
        expect(pathAB.value.value.totalWeight).toBe(5);
      }

      // Path B → A should use backward edge
      const pathBA = dijkstra(graph, 'B', 'A');
      expect(pathBA.ok).toBe(true);
      if (pathBA.ok && pathBA.value.some) {
        expect(pathBA.value.value.totalWeight).toBe(3);
      }

      // Cycle detection should find cycle
      const cycleResult = detectCycle(graph);
      expect(cycleResult.ok).toBe(true);
      if (cycleResult.ok) {
        expect(cycleResult.value.some).toBe(true);
      }

      // Should form one SCC
      const sccResult = stronglyConnectedComponents(graph);
      expect(sccResult.ok).toBe(true);
      if (sccResult.ok) {
        expect(sccResult.value).toHaveLength(1);
        expect(sccResult.value[0].size).toBe(2);
      }
    });

    it('should handle edge removal with multi-edges', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });

      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge', weight: 5 });
      graph.addEdge({ id: 'e2', source: 'A', target: 'B', type: 'edge', weight: 3 });

      expect(graph.getEdgeCount()).toBe(2);

      // Remove one edge
      const removeResult = graph.removeEdge('e1');
      expect(removeResult.ok).toBe(true);
      expect(graph.getEdgeCount()).toBe(1);

      // Path should now use remaining edge
      const pathResult = dijkstra(graph, 'A', 'B');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        expect(pathResult.value.value.totalWeight).toBe(3);
      }

      // Remove second edge
      graph.removeEdge('e2');
      expect(graph.getEdgeCount()).toBe(0);

      // No path exists
      const noPathResult = dijkstra(graph, 'A', 'B');
      expect(noPathResult.ok).toBe(true);
      if (noPathResult.ok) {
        expect(noPathResult.value.some).toBe(false);
      }
    });
  });

  describe('complex edge patterns', () => {
    it('should handle graph with only self-loops (no regular edges)', () => {
      const graph = new Graph<Node, Edge>(true);

      for (let i = 1; i <= 5; i++) {
        const id = `N${i}`;
        graph.addNode({ id, type: 'node' });
        graph.addEdge({ id: `loop${i}`, source: id, target: id, type: 'self-loop' });
      }

      // Each node is isolated (self-loops don't connect nodes)
      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok).toBe(true);
      if (componentsResult.ok) {
        expect(componentsResult.value).toHaveLength(5); // 5 separate components
      }

      // Each node is its own SCC
      const sccResult = stronglyConnectedComponents(graph);
      expect(sccResult.ok).toBe(true);
      if (sccResult.ok) {
        expect(sccResult.value).toHaveLength(5);
      }
    });

    it('should handle combination of self-loops and multi-edges', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });

      // Self-loops
      graph.addEdge({ id: 'loop1', source: 'A', target: 'A', type: 'self-loop' });
      graph.addEdge({ id: 'loop2', source: 'B', target: 'B', type: 'self-loop' });

      // Multi-edges
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge1', weight: 5 });
      graph.addEdge({ id: 'e2', source: 'A', target: 'B', type: 'edge2', weight: 3 });

      // Bidirectional
      graph.addEdge({ id: 'e3', source: 'B', target: 'A', type: 'edge3', weight: 2 });

      expect(graph.getEdgeCount()).toBe(5);

      // DFS should visit both nodes
      const dfsResult = dfs(graph, 'A');
      expect(dfsResult.ok).toBe(true);
      if (dfsResult.ok) {
        expect(dfsResult.value.visitOrder).toHaveLength(2);
      }

      // Cycle exists (self-loops + bidirectional)
      const cycleResult = detectCycle(graph);
      expect(cycleResult.ok).toBe(true);
      if (cycleResult.ok) {
        expect(cycleResult.value.some).toBe(true);
      }

      // One SCC containing both nodes
      const sccResult = stronglyConnectedComponents(graph);
      expect(sccResult.ok).toBe(true);
      if (sccResult.ok) {
        expect(sccResult.value).toHaveLength(1);
        expect(sccResult.value[0].size).toBe(2);
      }
    });

    it('should handle zero-weight edges', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addNode({ id: 'C', type: 'node' });

      // Zero-weight edges
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge', weight: 0 });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge', weight: 0 });

      // Regular edge
      graph.addEdge({ id: 'e3', source: 'A', target: 'C', type: 'edge', weight: 5 });

      // Path should use zero-weight edges
      const pathResult = dijkstra(graph, 'A', 'C');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        // A → B → C with total weight 0
        expect(pathResult.value.value.totalWeight).toBe(0);
        expect(pathResult.value.value.nodes).toHaveLength(3);
      }
    });

    it('should handle very high edge weights', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });

      // Very high weight
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge', weight: Number.MAX_SAFE_INTEGER });

      const pathResult = dijkstra(graph, 'A', 'B');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        expect(pathResult.value.value.totalWeight).toBe(Number.MAX_SAFE_INTEGER);
      }
    });
  });

  describe('edge modifications', () => {
    it('should handle adding self-loop after graph creation', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });

      // Initially no cycle
      const cycle1 = detectCycle(graph);
      expect(cycle1.ok && !cycle1.value.some).toBe(true);

      // Add self-loop
      graph.addEdge({ id: 'loop', source: 'A', target: 'A', type: 'self-loop' });

      // Now has cycle
      const cycle2 = detectCycle(graph);
      expect(cycle2.ok && cycle2.value.some).toBe(true);
    });

    it('should handle removing self-loop', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });
      graph.addEdge({ id: 'loop', source: 'A', target: 'A', type: 'self-loop' });
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });

      // Has cycle
      const cycle1 = detectCycle(graph);
      expect(cycle1.ok && cycle1.value.some).toBe(true);

      // Remove self-loop
      graph.removeEdge('loop');

      // No cycle
      const cycle2 = detectCycle(graph);
      expect(cycle2.ok && !cycle2.value.some).toBe(true);

      // Topological sort now works
      const topoResult = topologicalSort(graph);
      expect(topoResult.ok).toBe(true);
    });

    it('should handle duplicate edge IDs gracefully', () => {
      const graph = new Graph<Node, Edge>(true);

      graph.addNode({ id: 'A', type: 'node' });
      graph.addNode({ id: 'B', type: 'node' });

      const edge1: Edge = { id: 'e1', source: 'A', target: 'B', type: 'edge' };
      const edge2: Edge = { id: 'e1', source: 'A', target: 'B', type: 'edge' }; // Same ID

      const add1 = graph.addEdge(edge1);
      expect(add1.ok).toBe(true);

      const add2 = graph.addEdge(edge2);
      expect(add2.ok).toBe(true); // Replaces previous edge

      // Should have only one edge
      expect(graph.getEdgeCount()).toBe(1);
    });
  });
});
