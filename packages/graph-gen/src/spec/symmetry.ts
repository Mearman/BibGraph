/**
 * Symmetry Properties
 *
 * Properties related to graph automorphisms and symmetries.
 */

// ============================================================================
// SYMMETRY PROPERTIES (self-complementary, vertex-transitive)
// ============================================================================

/** Self-complementary property */
export type SelfComplementary =
  | { kind: "self_complementary" }
  | { kind: "not_self_complementary" }
  | { kind: "unconstrained" };

/** Vertex-transitive property (automorphisms can map any vertex to any other) */
export type VertexTransitive =
  | { kind: "vertex_transitive" }
  | { kind: "not_vertex_transitive" }
  | { kind: "unconstrained" };

// ============================================================================
// SYMMETRY REFINEMENTS (edge-transitive, arc-transitive)
// ============================================================================

/** Edge-transitive property (automorphisms can map any edge to any other) */
export type EdgeTransitive =
  | { kind: "edge_transitive" }
  | { kind: "not_edge_transitive" }
  | { kind: "unconstrained" };

/** Arc-transitive property (both vertex AND edge transitive - symmetric graphs) */
export type ArcTransitive =
  | { kind: "arc_transitive" }
  | { kind: "not_arc_transitive" }
  | { kind: "unconstrained" };
