/**
 * Advanced Graph Properties
 *
 * Extended property axes for future graph generation capabilities.
 */

// ============================================================================
// ADVANCED PROPERTY AXES (future extension)
// ============================================================================

/** Vertex set cardinality */
export type VertexCardinality =
  | { kind: "finite"; n?: number }
  | { kind: "countably_infinite" }
  | { kind: "uncountably_infinite" };

/** Vertex identity */
export type VertexIdentity =
  | { kind: "distinguishable" }
  | { kind: "indistinguishable" };

/** Vertex ordering */
export type VertexOrdering =
  | { kind: "unordered" }
  | { kind: "total_order" }
  | { kind: "partial_order" };

/** Edge arity (binary vs hypergraph) */
export type EdgeArity =
  | { kind: "binary" }
  | { kind: "k_ary"; k: number };

/** Edge signedness */
export type Signedness =
  | { kind: "unsigned" }
  | { kind: "signed" }
  | { kind: "multi_signed" };

/** Edge uncertainty */
export type Uncertainty =
  | { kind: "deterministic" }
  | { kind: "probabilistic" }
  | { kind: "fuzzy" };

/** Vertex metadata */
export type VertexData =
  | { kind: "unlabelled" }
  | { kind: "labelled" }
  | { kind: "attributed" };

/** Edge metadata */
export type EdgeData =
  | { kind: "unlabelled" }
  | { kind: "labelled" }
  | { kind: "attributed" };

/** Degree constraints */
export type DegreeConstraint =
  | { kind: "unconstrained" }
  | { kind: "bounded"; max: number }
  | { kind: "regular"; degree: number }
  | { kind: "degree_sequence"; sequence: readonly number[] };

/** Partiteness (bipartite, k-partite) */
export type Partiteness =
  | { kind: "unrestricted" }
  | { kind: "bipartite" }
  | { kind: "k_partite"; k: number };

/** Graph embedding */
export type Embedding =
  | { kind: "abstract" }
  | { kind: "planar" }
  | { kind: "surface_embedded" }
  | { kind: "geometric_metric_space" }
  | { kind: "spatial_coordinates"; dims: 2 | 3 };

/** Tree rooting */
export type Rooting =
  | { kind: "unrooted" }
  | { kind: "rooted" }
  | { kind: "multi_rooted" };

/** Temporal properties */
export type Temporal =
  | { kind: "static" }
  | { kind: "dynamic_structure" }
  | { kind: "temporal_edges" }
  | { kind: "temporal_vertices" }
  | { kind: "time_ordered" };

/** Layering (multiplex networks, etc.) */
export type Layering =
  | { kind: "single_layer" }
  | { kind: "multi_layer" }
  | { kind: "multiplex" }
  | { kind: "interdependent" };

/** Edge ordering */
export type EdgeOrdering =
  | { kind: "unordered" }
  | { kind: "ordered" };

/** Port specification */
export type Ports =
  | { kind: "none" }
  | { kind: "port_labelled_vertices" };

/** Observability */
export type Observability =
  | { kind: "fully_specified" }
  | { kind: "partially_observed" }
  | { kind: "latent_or_inferred" };

/** Operational semantics */
export type OperationalSemantics =
  | { kind: "structural_only" }
  | { kind: "annotated_with_functions" }
  | { kind: "executable" };

/** Measure semantics (cost, utility, etc.) */
export type MeasureSemantics =
  | { kind: "none" }
  | { kind: "metric" }
  | { kind: "cost" }
  | { kind: "utility" };
