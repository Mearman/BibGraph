/**
 * Graph Spec Analyzer - Path and Cycle Properties
 *
 * Compute Hamiltonian and traceable properties.
 */

import type {
  AnalyzerGraph,
  AnalyzerVertexId
} from './types';
import {
  buildAdjUndirectedBinary,
  degreesUndirectedBinary
} from './types';

// ============================================================================
// PATH/CYCLE PROPERTIES
// ============================================================================

/**
 * Compute Hamiltonian property using exhaustive search with pruning.
 * NP-complete, so this is expensive for larger graphs.
 * @param g
 */
export const computeHamiltonian = (g: AnalyzerGraph): { kind: "hamiltonian" } | { kind: "non_hamiltonian" } | { kind: "unconstrained" } => {
  // Only for small undirected/directed binary graphs due to NP-completeness
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  if (g.vertices.length > 10) return { kind: "unconstrained" }; // Too expensive

  const n = g.vertices.length;
  if (n < 3) return { kind: "non_hamiltonian" }; // Need at least 3 vertices for cycle

  const adj = buildAdjUndirectedBinary(g);

  // Check necessary condition: minimum degree >= 2
  const degs = degreesUndirectedBinary(g);
  if (Math.min(...degs) < 2) return { kind: "non_hamiltonian" };

  // Backtracking search for Hamiltonian cycle
  const visited = new Set<AnalyzerVertexId>();
  const path: AnalyzerVertexId[] = [];

  const backtrack = (current: AnalyzerVertexId, start: AnalyzerVertexId): boolean => {
    visited.add(current);
    path.push(current);

    if (path.length === n) {
      // Check if can return to start
      const neighbors = adj[current] ?? [];
      if (neighbors.includes(start)) {
        return true;
      }
      path.pop();
      visited.delete(current);
      return false;
    }

    // Try unvisited neighbors
    const neighbors = adj[current] ?? [];
    for (const nb of neighbors) {
      if (!visited.has(nb) && backtrack(nb, start)) {
          return true;
        }
    }

    path.pop();
    visited.delete(current);
    return false;
  };

  // Try starting from each vertex
  for (const v of g.vertices) {
    path.length = 0;
    visited.clear();
    if (backtrack(v.id, v.id)) {
      return { kind: "hamiltonian" };
    }
  }

  return { kind: "non_hamiltonian" };
};

/**
 * Compute traceable property (has Hamiltonian path).
 * @param g
 */
export const computeTraceable = (g: AnalyzerGraph): { kind: "traceable" } | { kind: "non_traceable" } | { kind: "unconstrained" } => {
  // Reuse Hamiltonian check for path (easier than cycle)
  const hamiltonian = computeHamiltonian(g);
  if (hamiltonian.kind === "hamiltonian") {
    return { kind: "traceable" }; // Hamiltonian cycle implies Hamiltonian path
  }

  if (g.vertices.length > 10) return { kind: "unconstrained" };

  const adj = buildAdjUndirectedBinary(g);
  const n = g.vertices.length;
  if (n < 2) return { kind: "non_traceable" };

  // Backtracking search for Hamiltonian path
  const visited = new Set<AnalyzerVertexId>();

  const backtrack = (current: AnalyzerVertexId): boolean => {
    visited.add(current);

    if (visited.size === n) {
      return true; // Found path visiting all vertices
    }

    const neighbors = adj[current] ?? [];
    for (const nb of neighbors) {
      if (!visited.has(nb) && backtrack(nb)) {
          return true;
        }
    }

    visited.delete(current);
    return false;
  };

  for (const v of g.vertices) {
    visited.clear();
    if (backtrack(v.id)) {
      return { kind: "traceable" };
    }
  }

  return { kind: "non_traceable" };
};
