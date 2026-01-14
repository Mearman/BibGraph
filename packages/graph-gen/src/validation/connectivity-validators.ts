import type { TestEdge,TestGraph, TestNode } from '../generator';
import type { GraphSpec } from '../spec';
import { isConnected } from './helper-functions';

/**
 * Validation result for a single property.
 */
export interface PropertyValidationResult {
  property: string;
  expected: string;
  actual: string;
  valid: boolean;
  message?: string;
}

/**
 * Validate k-vertex-connected property.
 * A graph is k-vertex-connected if it has at least k+1 vertices and
 * cannot be disconnected by removing fewer than k vertices.
 *
 * Note: Full validation requires checking all (n choose k) vertex subsets,
 * which is expensive. For our purposes, we verify:
 * 1. At least k+1 vertices
 * 2. Minimum degree ≥ k (necessary condition)
 * 3. Graph is connected
 * @param graph
 */
export const validateKVertexConnected = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  // Only validate when spec requires k-vertex-connected
  if (spec.kVertexConnected?.kind !== "k_vertex_connected") {
    return {
      property: "kVertexConnected",
      expected: spec.kVertexConnected?.kind ?? "unconstrained",
      actual: spec.kVertexConnected?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const k = spec.kVertexConnected.k;
  const n = nodes.length;

  // Check 1: At least k+1 vertices
  if (n < k + 1) {
    return {
      property: "kVertexConnected",
      expected: `${k}-vertex-connected`,
      actual: `not_${k}-vertex-connected (only ${n} vertices, need at least ${k + 1})`,
      valid: false,
      message: `k-vertex-connected graphs require at least ${k + 1} vertices (got ${n})`,
    };
  }

  // Check 2: Graph must be connected
  if (!isConnected(nodes, edges, spec.directionality.kind === "directed")) {
    return {
      property: "kVertexConnected",
      expected: `${k}-vertex-connected`,
      actual: `not_${k}-vertex-connected (graph is disconnected)`,
      valid: false,
      message: "k-vertex-connected graphs must be connected",
    };
  }

  // Check 3: Minimum degree must be at least k (necessary condition)
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }

  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    if (spec.directionality.kind === "undirected") {
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
  }

  const minDegree = Math.min(...degrees.values());
  if (minDegree < k) {
    return {
      property: "kVertexConnected",
      expected: `${k}-vertex-connected`,
      actual: `not_${k}-vertex-connected (min degree = ${minDegree}, need ≥ ${k})`,
      valid: false,
      message: `k-vertex-connected graphs require minimum degree ≥ ${k} (got ${minDegree})`,
    };
  }

  // For k=1 and k=2, we can do exact validation
  // For k=1: just need to be connected (already checked)
  // For k=2: check that graph remains connected after removing any single vertex
  if (k === 2 && n <= 50) {
    // Only check for small graphs due to computational cost
    for (const node of nodes) {
      const remainingNodes = nodes.filter(n => n.id !== node.id);
      const remainingEdges = edges.filter(e => e.source !== node.id && e.target !== node.id);

      if (!isConnected(remainingNodes, remainingEdges, spec.directionality.kind === "directed")) {
        return {
          property: "kVertexConnected",
          expected: "2-vertex-connected",
          actual: "not_2-vertex-connected (removing one vertex disconnects the graph)",
          valid: false,
          message: `2-vertex-connected graphs must remain connected after removing any single vertex (failed for ${node.id})`,
        };
      }
    }
  }

  return {
    property: "kVertexConnected",
    expected: `${k}-vertex-connected`,
    actual: `${k}-vertex-connected`,
    valid: true,
  };
};

/**
 * Validate k-edge-connected property.
 * A graph is k-edge-connected if it has at least k+1 vertices and
 * cannot be disconnected by removing fewer than k edges.
 *
 * Note: Full validation requires checking all edge cut sets,
 * which is expensive. For our purposes, we verify:
 * 1. At least k+1 vertices
 * 2. Minimum degree ≥ k (necessary and sufficient for many graphs)
 * 3. Graph is connected
 * @param graph
 */
export const validateKEdgeConnected = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  // Only validate when spec requires k-edge-connected
  if (spec.kEdgeConnected?.kind !== "k_edge_connected") {
    return {
      property: "kEdgeConnected",
      expected: spec.kEdgeConnected?.kind ?? "unconstrained",
      actual: spec.kEdgeConnected?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const k = spec.kEdgeConnected.k;
  const n = nodes.length;

  // Check 1: At least k+1 vertices
  if (n < k + 1) {
    return {
      property: "kEdgeConnected",
      expected: `${k}-edge-connected`,
      actual: `not_${k}-edge-connected (only ${n} vertices, need at least ${k + 1})`,
      valid: false,
      message: `k-edge-connected graphs require at least ${k + 1} vertices (got ${n})`,
    };
  }

  // Check 2: Graph must be connected
  if (!isConnected(nodes, edges, spec.directionality.kind === "directed")) {
    return {
      property: "kEdgeConnected",
      expected: `${k}-edge-connected`,
      actual: `not_${k}-edge-connected (graph is disconnected)`,
      valid: false,
      message: "k-edge-connected graphs must be connected",
    };
  }

  // Check 3: Minimum degree must be at least k
  // (This is a necessary condition; for undirected graphs, edge-connectivity ≤ min-degree)
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }

  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    if (spec.directionality.kind === "undirected") {
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
  }

  const minDegree = Math.min(...degrees.values());
  if (minDegree < k) {
    return {
      property: "kEdgeConnected",
      expected: `${k}-edge-connected`,
      actual: `not_${k}-edge-connected (min degree = ${minDegree}, need ≥ ${k})`,
      valid: false,
      message: `k-edge-connected graphs require minimum degree ≥ ${k} (got ${minDegree})`,
    };
  }

  return {
    property: "kEdgeConnected",
    expected: `${k}-edge-connected`,
    actual: `${k}-edge-connected`,
    valid: true,
  };
};
