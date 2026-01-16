/**
 * Graph Spec Analyzer - Connectivity Properties
 *
 * Compute graph connectivity, cycle detection, degree constraints,
 * completeness, partiteness, and density.
 */

import type {
  AnalyzerGraph,
  ComputePolicy
} from './types';
import {
  buildAdjUndirectedBinary,
  degreesUndirectedBinary,
  edgeKeyBinary,
  hasAnyDirectedEdges,
  hasAnyUndirectedEdges,
  isAcyclicDirectedBinary,
  isBipartiteUndirectedBinary,
  isConnectedUndirectedBinary} from './types';

export const computeConnectivity = (g: AnalyzerGraph): { kind: "unconstrained" } | { kind: "connected" } => {
  // We only compute "connected" safely for undirected binary graphs.
  // Otherwise return unconstrained.
  const isUndirectedBinary = g.edges.every(e => !e.directed && e.endpoints.length === 2);
  if (!isUndirectedBinary) return { kind: "unconstrained" };
  return isConnectedUndirectedBinary(g) ? { kind: "connected" } : { kind: "unconstrained" };
};

export const computeCycles = (g: AnalyzerGraph): { kind: "cycles_allowed" } | { kind: "acyclic" } => {
  // Check if all edges are binary directed
  const isDirectedBinary = g.edges.length > 0 && g.edges.every(e => e.directed && e.endpoints.length === 2);
  // Check if all edges are binary undirected
  const isUndirectedBinary = g.edges.length > 0 && g.edges.every(e => !e.directed && e.endpoints.length === 2);

  if (isDirectedBinary) {
    // Use Kahn's algorithm for directed acyclic check
    return isAcyclicDirectedBinary(g) ? { kind: "acyclic" } : { kind: "cycles_allowed" };
  }

  if (isUndirectedBinary) {
    // For undirected graphs: acyclic if E < V (forest)
    // A tree has E = V - 1, a forest with k components has E = V - k
    // So any undirected binary graph with E < V is acyclic
    return g.edges.length < g.vertices.length ? { kind: "acyclic" } : { kind: "cycles_allowed" };
  }

  // Mixed or non-binary graphs: conservative fallback
  return { kind: "cycles_allowed" };
};

export const computeDegreeConstraint = (g: AnalyzerGraph):
  | { kind: "unconstrained" }
  | { kind: "regular"; degree: number }
  | { kind: "degree_sequence"; sequence: readonly number[] } => {
  // Safe, non-committal: return degree_sequence for undirected-binary graphs, else unconstrained.
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  // Treat directed degree as total degree for this classifier.
  const deg = degreesUndirectedBinary(g);

  // If all degrees equal -> regular
  if (deg.length > 0 && new Set(deg).size === 1) return { kind: "regular", degree: deg[0] };

  return { kind: "degree_sequence", sequence: deg };
};
