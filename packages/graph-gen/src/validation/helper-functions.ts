import type { TestEdge, TestNode } from '../generators/types';

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
    const current = queue.shift();
    if (!current || visited.has(current)) continue;

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
    const sourceNeighbors = adjacency.get(edge.source);
    if (sourceNeighbors) {
      sourceNeighbors.push(edge.target);
    }
    if (!directed) {
      const targetNeighbors = adjacency.get(edge.target);
      if (targetNeighbors) {
        targetNeighbors.push(edge.source);
      }
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
      const current = queue.shift();
      if (!current || visited.has(current)) continue;

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
      const current = queue.shift();
      if (!current) break;

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

// ============================================================================
// STRUCTURAL CLASS VALIDATION HELPERS
// ============================================================================

/**
 * Generate all k-combinations from array.
 * @param arr
 * @param k
 */
export const getCombinations = <T>(arr: T[], k: number): T[][] => {
  if (k === 0) return [[]];
  if (k > arr.length) return [];

  const [first, ...rest] = arr;
  const combsWithFirst = getCombinations(rest, k - 1).map(comb => [first, ...comb]);
  const combsWithoutFirst = getCombinations(rest, k);

  return [...combsWithFirst, ...combsWithoutFirst];
};

/**
 * Check if 4 vertices form induced P4 (path on 4 vertices).
 * @param vertices
 * @param adjacency
 * @param directed
 */
export const hasInducedP4 = (vertices: string[], adjacency: Map<string, Set<string>>, directed: boolean): boolean => {
  // For P4, we need exactly 3 edges forming a path: v1-v2-v3-v4
  // with no additional edges

  // Get all edges among these vertices
  const edgeCount = new Map<string, number>();
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const hasEdge = adjacency.get(vertices[i])?.has(vertices[j]) ||
        (!directed && adjacency.get(vertices[j])?.has(vertices[i]));

      if (hasEdge) {
        edgeCount.set(vertices[i], (edgeCount.get(vertices[i]) || 0) + 1);
        edgeCount.set(vertices[j], (edgeCount.get(vertices[j]) || 0) + 1);
      }
    }
  }

  // P4 has degree sequence: [1, 1, 2, 2] (two endpoints with degree 1, two middle with degree 2)
  const degrees = [...edgeCount.values()].sort((a, b) => a - b);

  return degrees.length === 4 &&
    degrees[0] === 1 && degrees[1] === 1 &&
    degrees[2] === 2 && degrees[3] === 2;
};

/**
 * Find all induced cycles of given length.
 * @param vertices
 * @param adjacency
 * @param length
 * @param directed
 */
export const findInducedCycles = (vertices: string[], adjacency: Map<string, Set<string>>, length: number, directed: boolean): string[][] => {
  if (length < 3) return [];
  if (length > vertices.length) return [];

  const cycles: string[][] = [];
  const visited = new Set<string>();

  /**
   * DFS to find cycles of target length.
   * @param current
   * @param start
   * @param path
   * @param pathSet
   */
  const findCyclesFrom = (
    current: string,
    start: string,
    path: string[],
    pathSet: Set<string>
  ): void => {
    if (path.length === length) {
      // Check if we can close the cycle
      if (adjacency.get(current)?.has(start) || (!directed && adjacency.get(start)?.has(current))) {
        cycles.push([...path, start]);
      }
      return;
    }

    for (const vertex of vertices) {
      if (pathSet.has(vertex)) continue;

      const hasEdge = adjacency.get(current)?.has(vertex) ||
        (!directed && adjacency.get(vertex)?.has(current));

      if (hasEdge) {
        findCyclesFrom(vertex, start, [...path, vertex], new Set([...pathSet, vertex]));
      }
    }
  };

  for (const startNode of vertices) {
    findCyclesFrom(startNode, startNode, [], new Set());
  }

  return cycles;
};

/**
 * Check if cycle has a chord (edge between non-consecutive vertices).
 * @param cycle
 * @param adjacency
 * @param directed
 */
export const hasChord = (cycle: string[], adjacency: Map<string, Set<string>>, directed: boolean): boolean => {
  // Check all pairs of non-consecutive vertices
  for (let i = 0; i < cycle.length; i++) {
    for (let j = i + 2; j < cycle.length; j++) {
      // Skip consecutive vertices and first-last pair
      if ((j === i + 1) || (i === 0 && j === cycle.length - 1)) continue;

      const hasEdge = adjacency.get(cycle[i])?.has(cycle[j]) ||
        (!directed && adjacency.get(cycle[j])?.has(cycle[i]));
      if (hasEdge) {
        return true; // Found chord
      }
    }
  }

  return false; // No chord found
};

/**
 * Check if graph is transitively orientable (simplified check).
 * @param nodes
 * @param edges
 * @param directed
 */
export const checkTransitiveOrientation = (nodes: TestNode[], edges: TestEdge[], directed: boolean): boolean => {
  // Simplified check: try to find a valid topological ordering
  // If graph is already a DAG (no cycles), it's transitively orientable

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    if (!directed) {
      adjacency.get(edge.target)?.add(edge.source);
    }
  }

  // Check for cycles using DFS
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const hasCycle = (nodeId: string): boolean => {
    if (visited.has(nodeId)) return false;
    if (visiting.has(nodeId)) return true; // Back edge = cycle

    visiting.add(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      if (hasCycle(neighbor)) return true;
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (hasCycle(node.id)) {
      return false; // Has cycle, may not be transitively orientable
    }
  }

  return true; // No cycles found, potentially transitively orientable
};

// ============================================================================
// SPECTRAL COMPUTATION HELPERS
// ============================================================================

/**
 * Compute spectral radius approximation using power iteration.
 * Returns the largest eigenvalue (in absolute value) of the adjacency matrix.
 * @param nodes - Graph nodes
 * @param adjacency - Adjacency list
 * @returns Approximate spectral radius
 */
export const computeSpectralRadiusApproximation = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  const nodeIds = nodes.map(n => n.id);
  const n = nodeIds.length;

  if (n === 0) return 0;

  // Power iteration for dominant eigenvalue
  let vector = new Array(n).fill(1); // Initial vector
  let eigenvalue = 0;

  const MAX_ITERATIONS = 100;
  const TOLERANCE = 1e-6;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Multiply: Av
    const newVector = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const neighbors = adjacency.get(nodeIds[i]) || [];
      for (const neighbor of neighbors) {
        const j = nodeIds.indexOf(neighbor);
        if (j !== -1) {
          newVector[i] += vector[j];
        }
      }
    }

    // Compute Rayleigh quotient
    const numerator = newVector.reduce((sum, val, i) => sum + val * vector[i], 0);
    const denominator = vector.reduce((sum, val) => sum + val * val, 0);
    const newEigenvalue = denominator > 0 ? numerator / denominator : 0;

    // Check convergence
    if (Math.abs(newEigenvalue - eigenvalue) < TOLERANCE) {
      eigenvalue = newEigenvalue;
      break;
    }

    eigenvalue = newEigenvalue;

    // Normalize vector
    const norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      vector = newVector.map(v => v / norm);
    } else {
      vector = newVector;
    }
  }

  return Math.abs(eigenvalue);
};

/**
 * Compute algebraic connectivity (Fiedler value) using bounds.
 * Returns approximation of λ₂ (second smallest Laplacian eigenvalue).
 * Uses Fiedler value bounds for efficiency.
 * @param nodes - Graph nodes
 * @param adjacency - Adjacency list
 * @returns Approximate algebraic connectivity
 */
export const computeAlgebraicConnectivityBounds = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  const nodeIds = nodes.map(n => n.id);
  const n = nodeIds.length;

  if (n === 0) return 0;
  if (n === 1) return 0; // Single node has λ₂ = 0

  // Compute degrees
  const degrees: Map<string, number> = new Map();
  for (const nodeId of nodeIds) {
    degrees.set(nodeId, (adjacency.get(nodeId) || []).length);
  }

  // Lower bound: 2 * (1 - cos(π/n)) for path graphs
  // Upper bound: minimum vertex degree
  const minDegree = Math.min(...degrees.values());

  // Fiedler's inequality: λ₂ ≥ (minimum degree) / (n - 1) * some factor
  // Use simple approximation based on graph connectivity

  // Check if graph is connected
  const visited = new Set<string>();
  const queue: string[] = [nodeIds[0]];
  visited.add(nodeIds[0]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // If disconnected, λ₂ = 0
  if (visited.size < n) {
    return 0;
  }

  // For connected graphs, use approximation based on graph properties
  // λ₂ is bounded by vertex connectivity and edge connectivity
  // Simple approximation: proportional to minimum degree / n
  const lambda2Approx = (minDegree / n) * 2;

  return lambda2Approx;
};
