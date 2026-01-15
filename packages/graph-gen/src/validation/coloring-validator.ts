import type { TestEdge,TestGraph, TestNode } from '../generator';
import { buildAdjacencyList } from './helper-functions';
import type { PropertyValidationResult } from './types';

/**
 * Validate k-colorable property of a graph.
 * A graph is k-colorable if its vertices can be colored with k colors
 * such that no two adjacent vertices share the same color.
 *
 * This function uses a greedy coloring algorithm as an upper bound,
 * which gives us an approximation of the chromatic number χ(G).
 * If greedy uses > k colors, the graph is definitely not k-colorable.
 * If greedy uses ≤ k colors, we verify the coloring is valid.
 *
 * @param graph - The test graph to validate
 * @returns PropertyValidationResult with k-colorable validation
 */
export const validateKColorable = (graph: TestGraph): PropertyValidationResult => {
  const { nodes, edges, spec } = graph;

  // Only validate when spec requires k_colorable
  if (spec.kColorable?.kind !== "k_colorable" && spec.kColorable?.kind !== "bipartite_colorable") {
    return {
      property: "kColorable",
      expected: spec.kColorable?.kind ?? "unconstrained",
      actual: spec.kColorable?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const k = spec.kColorable.kind === "bipartite_colorable" ? 2 : (spec.kColorable.kind === "k_colorable" ? spec.kColorable.k : 0);

  // Edge case: empty graph is trivially k-colorable for any k
  if (nodes.length === 0) {
    return {
      property: "kColorable",
      expected: spec.kColorable.kind,
      actual: spec.kColorable.kind,
      valid: true,
    };
  }

  // Edge case: k must be at least 1
  if (k < 1) {
    return {
      property: "kColorable",
      expected: spec.kColorable.kind,
      actual: "not_k_colorable",
      valid: false,
      message: `k must be at least 1 for k-colorable property`,
    };
  }

  // For k=1, graph must have no edges (independent set)
  if (k === 1) {
    const isColorable = edges.length === 0;
    return {
      property: "kColorable",
      expected: "k_colorable",
      actual: isColorable ? "1_colorable" : "not_1_colorable",
      valid: isColorable,
      message: isColorable ? undefined : "Graph with edges cannot be 1-colorable",
    };
  }

  // For k=2, use bipartite check (more efficient)
  if (k === 2) {
    const isBipartiteResult = isBipartite(nodes, edges, spec.directionality.kind === 'directed');
    return {
      property: "kColorable",
      expected: "bipartite_colorable",
      actual: isBipartiteResult ? "bipartite_colorable" : "not_2_colorable",
      valid: isBipartiteResult,
      message: isBipartiteResult ? undefined : "Graph is not bipartite, therefore not 2-colorable",
    };
  }

  // For k >= 3, use greedy coloring to get upper bound on χ(G)
  const coloring = greedyColoring(nodes, edges, spec.directionality.kind === 'directed');
  const maxColorUsed = Math.max(...coloring.values());

  // If greedy needs more than k colors, graph is definitely not k-colorable
  if (maxColorUsed > k - 1) {
    return {
      property: "kColorable",
      expected: spec.kColorable.kind,
      actual: `not_${k}_colorable`,
      valid: false,
      message: `Graph requires at least ${maxColorUsed + 1} colors, which exceeds ${k}`,
    };
  }

  // Greedy found a valid coloring with ≤ k colors
  return {
    property: "kColorable",
    expected: spec.kColorable.kind,
    actual: `${k}_colorable`,
    valid: true,
  };
};

/**
 * Greedy graph coloring algorithm.
 * Assigns colors to vertices sequentially, always using the smallest
 * available color that doesn't conflict with already-colored neighbors.
 *
 * This is an approximation algorithm that uses at most Δ(G) + 1 colors,
 * where Δ(G) is the maximum degree of the graph. The actual chromatic
 * number χ(G) may be smaller.
 *
 * Time complexity: O(V + E) where V = vertices, E = edges
 * Space complexity: O(V) for color storage
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @param directed - Whether the graph is directed
 * @returns Map of node ID to color (0-indexed)
 */
export const greedyColoring = (nodes: TestNode[], edges: TestEdge[], directed: boolean): Map<string, number> => {
  const colors = new Map<string, number>();

  // Edge case: empty graph
  if (nodes.length === 0) {
    return colors;
  }

  // Build adjacency list for efficient neighbor lookups
  const adjacency = buildAdjacencyList(nodes, edges, directed);

  // Sort nodes by degree (descending) for better coloring
  // This is the "largest-first" or "Welsh-Powell" ordering
  const sortedNodes = [...nodes].sort((a, b) => {
    const degreeA = (adjacency.get(a.id) ?? []).length;
    const degreeB = (adjacency.get(b.id) ?? []).length;
    return degreeB - degreeA; // Descending order
  });

  // Color each vertex greedily
  for (const node of sortedNodes) {
    const neighbors = adjacency.get(node.id) ?? [];

    // Find colors used by already-colored neighbors
    const usedColors = new Set<number>();
    for (const neighbor of neighbors) {
      const neighborColor = colors.get(neighbor);
      if (neighborColor !== undefined) {
        usedColors.add(neighborColor);
      }
    }

    // Assign the smallest available color (starting from 0)
    let color = 0;
    while (usedColors.has(color)) {
      color++;
    }

    colors.set(node.id, color);
  }

  return colors;
};

/**
 * Check if a graph is bipartite (2-colorable) using BFS.
 * A graph is bipartite if and only if it is 2-colorable.
 *
 * This is a specialized optimization for k=2 case, which is
 * equivalent to checking bipartiteness.
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @param directed - Whether the graph is directed
 * @returns true if the graph is bipartite, false otherwise
 */
const isBipartite = (nodes: TestNode[], edges: TestEdge[], directed: boolean): boolean => {
  if (nodes.length === 0) {
    return true;
  }

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
