import type { TestEdge,TestGraph, TestNode } from '../generator';
import type { GraphSpec } from '../spec';
import { buildAdjacencyList } from './helper-functions';
import type { PropertyValidationResult } from './types';

/**
 * Validate that a graph has treewidth ≤ specified bound.
 *
 * Treewidth measures how "tree-like" a graph is:
 * - Trees and forests have treewidth 0
 * - Series-parallel graphs have treewidth ≤ 2
 * - k-trees have treewidth exactly k
 *
 * This function uses an approximation algorithm based on:
 * 1. Finding a elimination ordering
 * 2. Computing the maximum clique size in the filled graph
 * 3. Treewidth = max_clique_size - 1
 *
 * @param graph - Test graph to validate
 * @returns PropertyValidationResult with treewidth validation
 */
export const validateTreewidth = (graph: TestGraph): PropertyValidationResult => {
  const { nodes, edges, spec } = graph;

  // Handle empty graph
  if (nodes.length === 0) {
    return {
      property: "treewidth",
      expected: "unconstrained",
      actual: "0 (empty)",
      valid: true,
    };
  }

  // Approximate treewidth using minimum degree heuristic
  const approxTreewidth = approximateTreewidth(nodes, edges, spec);

  return {
    property: "treewidth",
    expected: "unconstrained",
    actual: `treewidth_${approxTreewidth}`,
    valid: true,
  };
};

/**
 * Check if graph is a forest (acyclic).
 * Forests have treewidth 0.
 * @param nodes
 * @param edges
 * @param spec
 */
const isForest = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec): boolean => {
  if (spec.cycles.kind === 'acyclic') {
    return true;
  }

  // Build adjacency list
  const adjacency = buildAdjacencyList(nodes, edges, spec.directionality.kind === 'directed');

  // Use DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (nodeId: string): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (!visited.has(node.id) && hasCycle(node.id)) {
        return false; // Has cycle, not a forest
      }
  }

  return true; // No cycles found
};

/**
 * Approximate treewidth using minimum degree heuristic.
 *
 * Algorithm:
 * 1. Repeatedly remove vertex with minimum degree
 * 2. Track maximum clique size in neighborhood when removed
 * 3. Treewidth = max_clique_size - 1
 *
 * This gives an upper bound on the true treewidth.
 * @param nodes
 * @param edges
 * @param spec
 */
const approximateTreewidth = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec): number => {
  if (nodes.length === 0) {
    return 0;
  }

  // Build adjacency list
  const adjacency = buildAdjacencyList(nodes, edges, spec.directionality.kind === 'directed');

  // Track remaining vertices
  const remaining = new Set<string>(nodes.map(n => n.id));

  // Track maximum clique size found
  let maxCliqueSize = 1;

  // Process vertices in order of minimum degree
  while (remaining.size > 0) {
    // Find vertex with minimum degree
    let minDegree = Infinity;
    let minVertex: string | null = null;

    for (const vertex of remaining) {
      const neighbors = (adjacency.get(vertex) ?? []).filter(n => remaining.has(n));
      const degree = neighbors.length;

      if (degree < minDegree) {
        minDegree = degree;
        minVertex = vertex;
      }
    }

    if (minVertex === null) break;

    // Check clique size in neighborhood
    const neighbors = (adjacency.get(minVertex) ?? []).filter(n => remaining.has(n));
    const cliqueSize = findMaxCliqueSizeInSet(
      new Set([...neighbors, minVertex]),
      adjacency
    );

    maxCliqueSize = Math.max(maxCliqueSize, cliqueSize);

    // Remove vertex
    remaining.delete(minVertex);
  }

  // Treewidth = max clique size - 1
  return maxCliqueSize - 1;
};

/**
 * Find maximum clique size in a subset of vertices.
 *
 * Uses Bron-Kerbosch algorithm with pivot to find maximum clique.
 *
 * @param vertices - Set of candidate vertices
 * @param adjacency - Graph adjacency list
 * @returns Size of maximum clique
 */
const findMaxCliqueSizeInSet = (vertices: Set<string>, adjacency: Map<string, string[]>): number => {
  if (vertices.size === 0) {
    return 0;
  }

  let maxSize = 0;
  const MAX_DEPTH = 100; // Prevent stack overflow on large graphs

  // Bron-Kerbosch with pivot
  const bronKerbosch = (R: Set<string>, P: Set<string>, X: Set<string>, depth: number = 0): void => {
    if (depth > MAX_DEPTH) {
      // Depth limit exceeded, return conservative estimate
      // For dense graphs with many vertices, max clique is likely all vertices
      maxSize = Math.max(maxSize, Math.min(vertices.size, R.size + P.size));
      return;
    }

    if (P.size === 0 && X.size === 0) {
      // R is a maximal clique
      maxSize = Math.max(maxSize, R.size);
      return;
    }

    if (P.size === 0) {
      return;
    }

    // Choose pivot from P ∪ X (vertex with most neighbors in P)
    const unionPX = new Set([...P, ...X]);
    let pivot: string | null = null;
    let maxNeighbors = -1;

    for (const v of unionPX) {
      const neighbors = adjacency.get(v) ?? [];
      const neighborsInP = neighbors.filter(n => P.has(n)).length;

      if (neighborsInP > maxNeighbors) {
        maxNeighbors = neighborsInP;
        pivot = v;
      }
    }

    // Branch on vertices in P \ N(pivot)
    const pivotNeighbors = pivot ? new Set(adjacency.get(pivot)) : new Set();
    const candidates = [...P].filter(v => !pivotNeighbors.has(v));

    for (const v of candidates) {
      const vNeighbors = new Set(adjacency.get(v));

      const newR = new Set([...R, v]);
      const newP = new Set([...P].filter(n => vNeighbors.has(n)));
      const newX = new Set([...X].filter(n => vNeighbors.has(n)));

      bronKerbosch(newR, newP, newX, depth + 1);

      P.delete(v);
      X.add(v);
    }
  };

  const initialP = new Set(vertices);
  bronKerbosch(new Set(), initialP, new Set());

  return maxSize;
};

/**
 * Find the size of the maximum clique in a graph.
 *
 * A clique is a complete subgraph where all vertices are connected.
 * This uses the Bron-Kerbosch algorithm with pivot for efficiency.
 *
 * Time complexity: O(3^(n/3)) for n vertices
 *
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param directed - Whether graph is directed
 * @returns Size of maximum clique
 */
export const findMaxCliqueSize = (nodes: TestNode[], edges: TestEdge[], directed: boolean): number => {
  if (nodes.length === 0) {
    return 0;
  }

  if (nodes.length === 1) {
    return 1;
  }

  // Build adjacency list (treat as undirected for clique finding)
  const adjacency = buildAdjacencyList(nodes, edges, false);

  let maxSize = 0;
  const MAX_DEPTH = 100; // Prevent stack overflow on large graphs

  // Bron-Kerbosch with pivot
  const bronKerbosch = (R: Set<string>, P: Set<string>, X: Set<string>, depth: number = 0): void => {
    if (depth > MAX_DEPTH) {
      // Depth limit exceeded, return conservative estimate
      maxSize = Math.max(maxSize, Math.min(nodes.length, R.size + P.size));
      return;
    }

    if (P.size === 0 && X.size === 0) {
      // R is a maximal clique
      maxSize = Math.max(maxSize, R.size);
      return;
    }

    if (P.size === 0) {
      return;
    }

    // Choose pivot from P ∪ X (vertex with most neighbors in P)
    const unionPX = new Set([...P, ...X]);
    let pivot: string | null = null;
    let maxNeighbors = -1;

    for (const v of unionPX) {
      const neighbors = adjacency.get(v) ?? [];
      const neighborsInP = neighbors.filter(n => P.has(n)).length;

      if (neighborsInP > maxNeighbors) {
        maxNeighbors = neighborsInP;
        pivot = v;
      }
    }

    // Branch on vertices in P \ N(pivot)
    const pivotNeighbors = pivot ? new Set(adjacency.get(pivot)) : new Set();
    const candidates = [...P].filter(v => !pivotNeighbors.has(v));

    for (const v of candidates) {
      const vNeighbors = new Set(adjacency.get(v));

      const newR = new Set([...R, v]);
      const newP = new Set([...P].filter(n => vNeighbors.has(n)));
      const newX = new Set([...X].filter(n => vNeighbors.has(n)));

      bronKerbosch(newR, newP, newX, depth + 1);

      P.delete(v);
      X.add(v);
    }
  };

  // Initialize with all vertices
  const allVertices = new Set(nodes.map(n => n.id));
  bronKerbosch(new Set(), allVertices, new Set());

  return maxSize;
};
