/**
 * Core Graph Properties
 *
 * Fundamental property axes used in current test fixtures.
 */

// ============================================================================
// CORE PROPERTY AXES (used in current test fixtures)
// ============================================================================

/** Edge direction property */
export type Directionality =
  | { kind: "directed" }
  | { kind: "undirected" };

/** Edge weighting property */
export type Weighting =
  | { kind: "unweighted" }
  | { kind: "weighted_numeric" }; // TODO: extend to weighted_vector, valued_symbolic

/** Cycle presence property */
export type Cycles =
  | { kind: "acyclic" }
  | { kind: "cycles_allowed" };

/** Connectivity property */
export type Connectivity =
  | { kind: "connected" }
  | { kind: "unconstrained" }; // "disconnected" in our old system

/** Node/edge type diversity property */
export type SchemaHomogeneity =
  | { kind: "homogeneous" }
  | { kind: "heterogeneous" };

/** Multiple edges between same vertices property */
export type EdgeMultiplicity =
  | { kind: "simple" }
  | { kind: "multi" };

/** Self-loop permission property */
export type SelfLoops =
  | { kind: "allowed" }
  | { kind: "disallowed" };

/** Target density for graph generation */
export type Density =
  | { kind: "sparse" }     // ~15% of max edges
  | { kind: "moderate" }   // ~40% of max edges
  | { kind: "dense" }      // ~70% of max edges
  | { kind: "unconstrained" };

/** Graph completeness property */
export type Completeness =
  | { kind: "complete" }
  | { kind: "incomplete" };
