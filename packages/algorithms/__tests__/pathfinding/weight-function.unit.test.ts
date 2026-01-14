import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { dijkstra } from '../../src/pathfinding/dijkstra';
import { type Node, type Edge } from '../../src/types/graph';
import { type WeightFunction } from '../../src/types/weight-function';

interface TestNode extends Node {
  id: string;
  type: string;
  elevation?: number;
  difficulty?: number;
}

interface TestEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  distance?: number;
  cost?: number;
}

describe('Custom Weight Functions', () => {
  describe('Edge attribute weights', () => {
    it('should use custom edge attribute as weight', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test' });
      graph.addNode({ id: 'B', type: 'test' });
      graph.addNode({ id: 'C', type: 'test' });

      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'edge',
        weight: 10,
        cost: 2,
      });
      graph.addEdge({
        id: 'E2',
        source: 'B',
        target: 'C',
        type: 'edge',
        weight: 10,
        cost: 3,
      });
      graph.addEdge({
        id: 'E3',
        source: 'A',
        target: 'C',
        type: 'edge',
        weight: 15,
        cost: 20,
      });

      // Using cost attribute (A->B->C should be cheaper: 2+3=5 vs A->C: 20)
      const costFn: WeightFunction<TestNode, TestEdge> = (edge) => edge.cost ?? 1;
      const result = dijkstra(graph, 'A', 'C', costFn);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;
        expect(path.nodes.map((n) => n.id)).toEqual(['A', 'B', 'C']);
        expect(path.totalWeight).toBe(5);
      }
    });

    it('should use distance attribute multiplied by constant', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test' });
      graph.addNode({ id: 'B', type: 'test' });

      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'edge',
        distance: 10,
      });

      // Multiply distance by 2
      const distanceFn: WeightFunction<TestNode, TestEdge> = (edge) =>
        (edge.distance ?? 0) * 2;
      const result = dijkstra(graph, 'A', 'B', distanceFn);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value.totalWeight).toBe(20);
      }
    });
  });

  describe('Node attribute weights', () => {
    it('should use elevation difference as weight', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test', elevation: 100 });
      graph.addNode({ id: 'B', type: 'test', elevation: 150 });
      graph.addNode({ id: 'C', type: 'test', elevation: 120 });
      graph.addNode({ id: 'D', type: 'test', elevation: 180 });

      // Path 1: A -> B -> D (elevation changes: +50, +30 = 80)
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'edge' });

      // Path 2: A -> C -> D (elevation changes: +20, +60 = 80)
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'edge' });

      const elevationFn: WeightFunction<TestNode, TestEdge> = (_edge, source, target) =>
        Math.abs((target.elevation ?? 0) - (source.elevation ?? 0));

      const result = dijkstra(graph, 'A', 'D', elevationFn);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;
        expect(path.totalWeight).toBe(80);
        // Both paths have same weight, so either is valid
        expect(path.nodes.length).toBe(3);
        expect(path.nodes[0].id).toBe('A');
        expect(path.nodes[2].id).toBe('D');
      }
    });

    it('should use target node difficulty as weight', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test', difficulty: 1 });
      graph.addNode({ id: 'B', type: 'test', difficulty: 5 });
      graph.addNode({ id: 'C', type: 'test', difficulty: 2 });
      graph.addNode({ id: 'D', type: 'test', difficulty: 3 });

      // Path 1: A -> B -> D (difficulty: 5 + 3 = 8)
      graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'edge' });
      graph.addEdge({ id: 'E2', source: 'B', target: 'D', type: 'edge' });

      // Path 2: A -> C -> D (difficulty: 2 + 3 = 5) - should win
      graph.addEdge({ id: 'E3', source: 'A', target: 'C', type: 'edge' });
      graph.addEdge({ id: 'E4', source: 'C', target: 'D', type: 'edge' });

      const difficultyFn: WeightFunction<TestNode, TestEdge> = (_edge, _source, target) =>
        target.difficulty ?? 1;

      const result = dijkstra(graph, 'A', 'D', difficultyFn);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        const path = result.value.value;
        expect(path.nodes.map((n) => n.id)).toEqual(['A', 'C', 'D']);
        expect(path.totalWeight).toBe(5);
      }
    });
  });

  describe('Combined edge and node weights', () => {
    it('should combine edge distance with target difficulty', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test', difficulty: 1 });
      graph.addNode({ id: 'B', type: 'test', difficulty: 3 });
      graph.addNode({ id: 'C', type: 'test', difficulty: 2 });

      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'edge',
        distance: 2,
      });
      graph.addEdge({
        id: 'E2',
        source: 'A',
        target: 'C',
        type: 'edge',
        distance: 5,
      });

      // Weight = distance * target_difficulty
      // A -> B: 2 * 3 = 6
      // A -> C: 5 * 2 = 10
      const combinedFn: WeightFunction<TestNode, TestEdge> = (edge, _source, target) =>
        (edge.distance ?? 1) * (target.difficulty ?? 1);

      const result = dijkstra(graph, 'A', 'B', combinedFn);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value.totalWeight).toBe(6);
      }
    });

    it('should use complex formula combining multiple attributes', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test', elevation: 100, difficulty: 1 });
      graph.addNode({ id: 'B', type: 'test', elevation: 150, difficulty: 2 });

      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'edge',
        distance: 10,
      });

      // Weight = (distance + elevation_change) * target_difficulty
      // (10 + 50) * 2 = 120
      const complexFn: WeightFunction<TestNode, TestEdge> = (edge, source, target) => {
        const distance = edge.distance ?? 0;
        const elevationChange = Math.abs(
          (target.elevation ?? 0) - (source.elevation ?? 0)
        );
        const difficulty = target.difficulty ?? 1;
        return (distance + elevationChange) * difficulty;
      };

      const result = dijkstra(graph, 'A', 'B', complexFn);

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value.totalWeight).toBe(120);
      }
    });
  });

  describe('Backward compatibility', () => {
    it('should use default edge.weight when no weight function provided', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test' });
      graph.addNode({ id: 'B', type: 'test' });

      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'edge',
        weight: 42,
        cost: 100,
      });

      // No weight function = use edge.weight
      const result = dijkstra(graph, 'A', 'B');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value.totalWeight).toBe(42);
      }
    });

    it('should default to 1 when edge has no weight and no function provided', () => {
      const graph = new Graph<TestNode, TestEdge>(true);

      graph.addNode({ id: 'A', type: 'test' });
      graph.addNode({ id: 'B', type: 'test' });

      graph.addEdge({
        id: 'E1',
        source: 'A',
        target: 'B',
        type: 'edge',
      });

      const result = dijkstra(graph, 'A', 'B');

      expect(result.ok).toBe(true);
      if (result.ok && result.value.some) {
        expect(result.value.value.totalWeight).toBe(1);
      }
    });
  });
});
