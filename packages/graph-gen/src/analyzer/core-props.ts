/**
 * Graph Spec Analyzer - Core Vertex and Edge Properties
 *
 * Compute basic graph properties: vertex cardinality, identity, ordering,
 * edge arity, multiplicity, self-loops, and directionality.
 */

import type {
  AnalyzerEdge,
  AnalyzerGraph,
  AnalyzerVertex,
  AnalyzerVertexId,
  ComputePolicy
} from './types';
import {
  allEqual,
  countSelfLoopsBinary,
  defaultComputePolicy,
  edgeKeyBinary,
  hasAnyDirectedEdges,
  hasAnyUndirectedEdges,
  unique} from './types';

// ============================================================================
// Axis Compute Functions
// ============================================================================
export const computeVertexCardinality = (g: AnalyzerGraph): { kind: "finite"; n: number } => ({ kind: "finite", n: g.vertices.length });

export const computeVertexIdentity = (g: AnalyzerGraph): { kind: "distinguishable" } | { kind: "indistinguishable" } => {
  const ids = g.vertices.map(v => v.id);
  return new Set(ids).size === ids.length ? { kind: "distinguishable" } : { kind: "indistinguishable" };
};

export const computeVertexOrdering = (g: AnalyzerGraph, policy: ComputePolicy): { kind: "unordered" } | { kind: "total_order" } | { kind: "partial_order" } => {
  const orders = g.vertices.map(v => v.attrs?.[policy.vertexOrderKey]);
  if (!orders.every(x => typeof x === "number")) return { kind: "unordered" };
  const nums = orders as number[];
  return new Set(nums).size === nums.length ? { kind: "total_order" } : { kind: "partial_order" };
};

export const computeEdgeArity = (g: AnalyzerGraph): { kind: "binary" } | { kind: "k_ary"; k: number } => {
  if (g.edges.length === 0) return { kind: "binary" };
  const arities = g.edges.map(e => e.endpoints.length);
  const all2 = arities.every(a => a === 2);
  if (all2) return { kind: "binary" };
  if (allEqual(arities, (a, b) => a === b)) return { kind: "k_ary", k: arities[0] };
  throw new Error(`Mixed edge arity cannot be represented as a single EdgeArity: ${unique(arities).join(", ")}`);
};

export const computeEdgeMultiplicity = (g: AnalyzerGraph): { kind: "simple" } | { kind: "multi" } => {
  const seen = new Set<string>();
  for (const e of g.edges) {
    if (e.endpoints.length === 2) {
      const [u, v] = e.endpoints;
      const k = edgeKeyBinary(u, v, e.directed);
      if (seen.has(k)) return { kind: "multi" };
      seen.add(k);
    } else {
      const k = `H:${[...e.endpoints].sort().join("|")}`;
      if (seen.has(k)) return { kind: "multi" };
      seen.add(k);
    }
  }
  return { kind: "simple" };
};

export const computeSelfLoops = (g: AnalyzerGraph): { kind: "disallowed" } | { kind: "allowed" } => countSelfLoopsBinary(g) > 0 ? { kind: "allowed" } : { kind: "disallowed" };

export const computeDirectionality = (g: AnalyzerGraph):
  | { kind: "undirected" }
  | { kind: "directed" }
  | { kind: "mixed" }
  | { kind: "bidirected" }
  | { kind: "antidirected" } => {
  const hasDir = hasAnyDirectedEdges(g);
  const hasUndir = hasAnyUndirectedEdges(g);
  if (hasDir && hasUndir) return { kind: "mixed" };
  if (!hasDir) return { kind: "undirected" };

  // purely directed -> refine if possible
  const directedBinary = g.edges.filter(e => e.directed && e.endpoints.length === 2);
  if (directedBinary.length === 0) return { kind: "directed" };

  const set = new Set(directedBinary.map(e => `${e.endpoints[0]}->${e.endpoints[1]}`));
  const allHaveOpposite = directedBinary.every(e => set.has(`${e.endpoints[1]}->${e.endpoints[0]}`));

  if (allHaveOpposite) return { kind: "bidirected" };

  // Antidirected: for every edge u→v, there's also v←u (i.e., v→u in opposite direction)
  // Check if every edge appears in both directions
  const antidirected = directedBinary.every(e => {
    const opp = `${e.endpoints[1]}->${e.endpoints[0]}`;
    return opp !== `${e.endpoints[0]}->${e.endpoints[1]}` && set.has(opp);
  });
  if (antidirected && directedBinary.length > 0) return { kind: "antidirected" };

  return { kind: "directed" };
};

export const computeWeighting = (g: AnalyzerGraph, _policy: ComputePolicy): { kind: "unweighted" } | { kind: "weighted_numeric"; min?: number; max?: number } => {
  if (g.edges.length === 0) return { kind: "unweighted" };

  const allNumeric = g.edges.every(e => typeof e.weight === "number");
  if (allNumeric) return { kind: "weighted_numeric" };

  return { kind: "unweighted" };
};

export const computeSignedness = (g: AnalyzerGraph): { kind: "unsigned" } | { kind: "signed" } => {
  const anySigned = g.edges.some(e => e.sign === -1 || e.sign === 1);
  return anySigned ? { kind: "signed" } : { kind: "unsigned" };
};

export const computeUncertainty = (g: AnalyzerGraph, policy: ComputePolicy): { kind: "deterministic" } | { kind: "probabilistic"; min?: number; max?: number } => {
  const anyProb =
    g.edges.some(e => typeof e.probability === "number") ||
    g.edges.some(e => typeof e.attrs?.[policy.probabilityKey] === "number");
  return anyProb ? { kind: "probabilistic" } : { kind: "deterministic" };
};

export const computeVertexData = (g: AnalyzerGraph): { kind: "unlabelled" } | { kind: "labelled" } | { kind: "attributed" } => {
  const anyAttrs = g.vertices.some(v => v.attrs && Object.keys(v.attrs).length > 0);
  const anyLabels = g.vertices.some(v => typeof v.label === "string" && v.label.length > 0);
  if (anyAttrs) return { kind: "attributed" };
  if (anyLabels) return { kind: "labelled" };
  return { kind: "unlabelled" };
};

export const computeEdgeData = (g: AnalyzerGraph): { kind: "unlabelled" } | { kind: "labelled" } | { kind: "attributed" } => {
  const anyAttrs = g.edges.some(e => e.attrs && Object.keys(e.attrs).length > 0);
  const anyLabels = g.edges.some(e => typeof e.label === "string" && e.label.length > 0);
  if (anyAttrs) return { kind: "attributed" };
  if (anyLabels) return { kind: "labelled" };
  return { kind: "unlabelled" };
};

export const computeSchemaHomogeneity = (g: AnalyzerGraph): { kind: "homogeneous" } | { kind: "heterogeneous" } => {
  // Convention:
  // - homogeneous if all vertices share the same set of attr keys AND all edges share the same set of attr keys
  // - otherwise heterogeneous
  const vertexKeySets = g.vertices.map(v => Object.keys(v.attrs ?? {}).sort().join("|"));
  const edgeKeySets = g.edges.map(e => Object.keys(e.attrs ?? {}).sort().join("|"));
  const vHom = allEqual(vertexKeySets, (a, b) => a === b);
  const eHom = allEqual(edgeKeySets, (a, b) => a === b);
  return vHom && eHom ? { kind: "homogeneous" } : { kind: "heterogeneous" };
};
