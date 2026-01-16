import type { GraphSpec } from '../spec';
import type { GraphGenerationConfig } from '../generator';
import { SeededRandom, type TestEdge, type TestNode } from './types';

/**
 * Add weights to edges based on configuration.
 * @param edges - Edge list to modify
 * @param config - Generation configuration
 * @param rng - Seeded random number generator
 */
export const addWeights = (
  edges: TestEdge[],
  config: GraphGenerationConfig,
  rng: SeededRandom
): void => {
  const { min = 1, max = 100 } = config.weightRange ?? {};

  for (const edge of edges) {
    edge.weight = rng.integer(min, max);
  }
};

/**
 * Detect cycles in a graph using DFS (simplified version for internal use).
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param directed - Whether graph is directed
 * @returns True if cycle detected
 */
export const detectCycleInGraph = (
  nodes: TestNode[],
  edges: TestEdge[],
  directed: boolean
): boolean => {
  if (nodes.length < 2) return false;

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const sourceList = adjacency.get(edge.source);
    if (sourceList) {
      sourceList.push(edge.target);
    }
    if (!directed) {
      const targetList = adjacency.get(edge.target);
      if (targetList) {
        targetList.push(edge.source);
      }
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (!visited.has(node.id) && dfs(node.id)) return true;
  }

  return false;
};

/**
 * Find connected components in the graph using BFS.
 * Returns array of components, where each component is an array of node IDs.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param directed - Whether graph is directed
 * @returns Array of connected components
 */
export const findComponents = (
  nodes: TestNode[],
  edges: TestEdge[],
  directed: boolean
): string[][] => {
  const components: string[][] = [];
  const visited = new Set<string>();

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const sourceList = adjacency.get(edge.source);
    if (sourceList) {
      sourceList.push(edge.target);
    }
    if (!directed) {
      const targetList = adjacency.get(edge.target);
      if (targetList) {
        targetList.push(edge.source);
      }
    }
  }

  // BFS to find each component
  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component: string[] = [];
    const queue: string[] = [node.id];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      if (visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      const neighbors = adjacency.get(current) ?? [];
      queue.push(...neighbors.filter((n) => !visited.has(n)));
    }

    components.push(component);
  }

  return components;
};

/**
 * Add an edge to the edge list.
 * @param edges - Edge list to modify
 * @param source - Source node ID
 * @param target - Target node ID
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
export const addEdge = (
  edges: TestEdge[],
  source: string,
  target: string,
  spec: GraphSpec,
  rng: SeededRandom
): void => {
  const edge: TestEdge = { source, target };

  if (spec.schema.kind === 'heterogeneous') {
    // Assign random edge type (could be based on config.edgeTypes)
    edge.type = rng.choice(['type_a', 'type_b', 'type_c']);
  }

  edges.push(edge);
};

/**
 * Shuffle array in-place using Fisher-Yates algorithm with seeded RNG.
 * @param array - Array to shuffle
 * @param rng - Seeded random number generator
 */
export const shuffleArray = <T>(array: T[], rng: SeededRandom): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = rng.integer(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
};

/**
 * Check if edge exists between source and target.
 * @param edges - Edge list
 * @param source - Source node ID
 * @param target - Target node ID
 * @returns True if edge exists
 */
export const hasEdge = (
  edges: TestEdge[],
  source: string,
  target: string
): boolean => {
  return edges.some(e =>
    (e.source === source && e.target === target) ||
    (e.source === target && e.target === source)
  );
};
