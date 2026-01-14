import type { TestEdge,TestNode } from '../graph-generator';

/**
 * Check if graph is connected using BFS.
 * @param nodes
 * @param edges
 * @param directed
 */
export const isConnected = (nodes: TestNode[], edges: TestEdge[], directed: boolean): boolean => {
  if (nodes.length === 0) return true;

  const adjacency = buildAdjacencyList(nodes, edges, directed);
  const visited = new Set<string>();
  const queue: string[] = [nodes[0].id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;

    visited.add(current);
    const neighbors = adjacency.get(current) ?? [];
    queue.push(...neighbors.filter((n) => !visited.has(n)));
  }

  return visited.size === nodes.length;
};

/**
 * Build adjacency list from edges.
 * @param nodes
 * @param edges
 * @param directed
 */
export const buildAdjacencyList = (nodes: TestNode[], edges: TestEdge[], directed: boolean): Map<string, string[]> => {
  const adjacency = new Map<string, string[]>();

  // Initialize all nodes
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  // Add edges
  for (const edge of edges) {
    adjacency.get(edge.source)!.push(edge.target);
    if (!directed) {
      adjacency.get(edge.target)!.push(edge.source);
    }
  }

  return adjacency;
};

/**
 * Find connected components for density calculation.
 * Returns array of components, where each component is an array of node IDs.
 * @param nodes
 * @param edges
 * @param directed
 */
export const findComponentsForDensity = (nodes: TestNode[], edges: TestEdge[], directed: boolean): string[][] => {
  const components: string[][] = [];
  const visited = new Set<string>();

  // Build adjacency list
  const adjacency = buildAdjacencyList(nodes, edges, directed);

  // BFS to find each component
  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component: string[] = [];
    const queue: string[] = [node.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
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
 * Check if a graph is bipartite using BFS 2-coloring.
 * A graph is bipartite if and only if it is 2-colorable.
 * @param nodes
 * @param edges
 * @param directed
 */
export const checkBipartiteWithBFS = (nodes: TestNode[], edges: TestEdge[], directed: boolean): boolean => {
  if (nodes.length === 0) return true;

  const adjacency = buildAdjacencyList(nodes, edges, directed);
  const colors = new Map<string, number>(); // 0 or 1 for bipartition
  const visited = new Set<string>();

  const bfs = (startNode: string): boolean => {
    const queue: string[] = [startNode];
    colors.set(startNode, 0);
    visited.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const neighbors = adjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          // Color with opposite color
          colors.set(neighbor, 1 - (colors.get(current) ?? 0));
          visited.add(neighbor);
          queue.push(neighbor);
        } else {
          // Check if neighbor has same color as current (not bipartite)
          if (colors.get(neighbor) === colors.get(current)) {
            return false;
          }
        }
      }
    }

    return true;
  };

  // Check all components (graph might be disconnected)
  for (const node of nodes) {
    if (!visited.has(node.id) && !bfs(node.id)) {
        return false;
      }
  }

  return true;
};
