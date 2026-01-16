/**
 * Graph Spec Analyzer - Advanced Properties
 *
 * Compute advanced graph properties including embedding, rooting, temporal,
 * layering, edge ordering, ports, observability, operational semantics,
 * and measure semantics.
 */

import type {
  AnalyzerGraph,
  ComputePolicy
} from './types';
import {
  unique
} from './types';

export const computeEmbedding = (g: AnalyzerGraph, policy: ComputePolicy): { kind: "abstract" } | { kind: "geometric_metric_space" } | { kind: "spatial_coordinates"; dims: 2 | 3 } => {
  // Convention: if every vertex has pos {x,y} or {x,y,z}, treat as spatial_coordinates.
  const poss = g.vertices.map(v => v.attrs?.[policy.posKey]);
  const allHavePos = poss.length > 0 && poss.every(p => typeof p === "object" && p != null);
  if (!allHavePos) return { kind: "abstract" };

  const dims = poss.map(p => {
    const o = p as Record<string, unknown>;
    const hasX = typeof o.x === "number";
    const hasY = typeof o.y === "number";
    const hasZ = typeof o.z === "number";
    if (hasX && hasY && hasZ) return 3 as const;
    if (hasX && hasY) return 2 as const;
    return null;
  });

  if (dims.some(d => d == null)) return { kind: "abstract" };
  const uniq = unique(dims as Array<2 | 3>);
  if (uniq.length === 1) return { kind: "spatial_coordinates", dims: uniq[0] };
  // mixed dims -> fall back
  return { kind: "abstract" };
};

export const computeRooting = (g: AnalyzerGraph, policy: ComputePolicy): { kind: "unrooted" } | { kind: "rooted" } | { kind: "multi_rooted" } => {
  // Convention:
  // - rooted if exactly one vertex has attrs[rootKey] === true
  // - multi_rooted if >1
  // - unrooted otherwise
  const roots = g.vertices.filter(v => v.attrs?.[policy.rootKey] === true);
  if (roots.length === 1) return { kind: "rooted" };
  if (roots.length > 1) return { kind: "multi_rooted" };
  return { kind: "unrooted" };
};

export const computeTemporal = (g: AnalyzerGraph, policy: ComputePolicy):
  | { kind: "static" }
  | { kind: "dynamic_structure" }
  | { kind: "temporal_edges" }
  | { kind: "temporal_vertices" }
  | { kind: "time_ordered" } => {
  // Convention:
  // - temporal_vertices if any vertex has attrs[timeKey]
  // - temporal_edges if any edge has attrs[timeKey]
  // - time_ordered if both and values look ordered (numbers)
  // - static otherwise
  const vTimes = g.vertices.map(v => v.attrs?.[policy.timeKey]);
  const eTimes = g.edges.map(e => e.attrs?.[policy.timeKey]);
  const anyV = vTimes.some(t => t != null);
  const anyE = eTimes.some(t => t != null);

  const allNumericV = anyV && vTimes.every(t => t == null || typeof t === "number");
  const allNumericE = anyE && eTimes.every(t => t == null || typeof t === "number");

  if (anyV && anyE && allNumericV && allNumericE) return { kind: "time_ordered" };
  if (anyV) return { kind: "temporal_vertices" };
  if (anyE) return { kind: "temporal_edges" };
  return { kind: "static" };
};

export const computeLayering = (g: AnalyzerGraph, policy: ComputePolicy):
  | { kind: "single_layer" }
  | { kind: "multi_layer" }
  | { kind: "multiplex" }
  | { kind: "interdependent" } => {
  // Convention:
  // - multi_layer if vertices or edges have a layer label and >1 unique layers
  const layers: Array<string | number> = [];
  for (const v of g.vertices) {
    const lv = v.attrs?.[policy.layerKey];
    if (typeof lv === "string" || typeof lv === "number") layers.push(lv);
  }
  for (const e of g.edges) {
    const le = e.attrs?.[policy.layerKey];
    if (typeof le === "string" || typeof le === "number") layers.push(le);
  }
  const uniq = unique(layers.map(String));
  return uniq.length > 1 ? { kind: "multi_layer" } : { kind: "single_layer" };
};

export const computeEdgeOrdering = (g: AnalyzerGraph, policy: ComputePolicy): { kind: "unordered" } | { kind: "ordered" } => {
  const orders = g.edges.map(e => e.attrs?.[policy.edgeOrderKey]);
  if (!orders.every(x => typeof x === "number")) return { kind: "unordered" };
  return { kind: "ordered" };
};

export const computePorts = (g: AnalyzerGraph, policy: ComputePolicy): { kind: "none" } | { kind: "port_labelled_vertices" } => {
  // Convention: vertex.attrs[portKey] exists => ports
  const anyPorts = g.vertices.some(v => v.attrs?.[policy.portKey] != null);
  return anyPorts ? { kind: "port_labelled_vertices" } : { kind: "none" };
};

export const computeObservability = (g: AnalyzerGraph): { kind: "fully_specified" } | { kind: "partially_observed" } | { kind: "latent_or_inferred" } => {
  // Convention: if any vertex/edge has attrs.latent===true => latent_or_inferred
  // else if any has attrs.observed===false => partially_observed
  // else fully_specified
  const anyLatent =
    g.vertices.some(v => v.attrs?.["latent"] === true) ||
    g.edges.some(e => e.attrs?.["latent"] === true);

  if (anyLatent) return { kind: "latent_or_inferred" };

  const anyUnobserved =
    g.vertices.some(v => v.attrs?.["observed"] === false) ||
    g.edges.some(e => e.attrs?.["observed"] === false);

  if (anyUnobserved) return { kind: "partially_observed" };

  return { kind: "fully_specified" };
};

export const computeOperationalSemantics = (g: AnalyzerGraph):
  | { kind: "structural_only" }
  | { kind: "annotated_with_functions" }
  | { kind: "executable" } => {
  // Convention: if any vertex/edge has attrs.exec===true => executable
  // else if any has attrs.fn present => annotated_with_functions
  // else structural_only
  const anyExec =
    g.vertices.some(v => v.attrs?.["exec"] === true) ||
    g.edges.some(e => e.attrs?.["exec"] === true);
  if (anyExec) return { kind: "executable" };

  const anyFn =
    g.vertices.some(v => typeof v.attrs?.["fn"] === "string") ||
    g.edges.some(e => typeof e.attrs?.["fn"] === "string");
  if (anyFn) return { kind: "annotated_with_functions" };

  return { kind: "structural_only" };
};

export const computeMeasureSemantics = (g: AnalyzerGraph): { kind: "none" } | { kind: "metric" } | { kind: "cost" } | { kind: "utility" } => {
  // Convention: if weights exist => metric/cost/utility is unknown; choose "metric"
  // If attrs.cost exists => cost; attrs.utility exists => utility
  const anyCost =
    g.edges.some(e => typeof e.attrs?.["cost"] === "number") ||
    g.vertices.some(v => typeof v.attrs?.["cost"] === "number");
  if (anyCost) return { kind: "cost" };

  const anyUtility =
    g.edges.some(e => typeof e.attrs?.["utility"] === "number") ||
    g.vertices.some(v => typeof v.attrs?.["utility"] === "number");
  if (anyUtility) return { kind: "utility" };

  const anyWeight =
    g.edges.some(e => typeof e.weight === "number") ||
    g.edges.some(e => Array.isArray(e.attrs?.["weightVector"]));
  if (anyWeight) return { kind: "metric" };

  return { kind: "none" };
};
