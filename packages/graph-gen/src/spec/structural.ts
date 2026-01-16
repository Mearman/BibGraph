/**
 * Structural Graph Classes
 *
 * Properties defining specific structural classes of graphs.
 */

// ============================================================================
// STRUCTURAL GRAPH CLASSES (perfect, split, cograph, etc.)
// ============================================================================

/** Perfect graph property (ω(H) = χ(H) for all induced subgraphs) */
export type Perfect =
  | { kind: "perfect" }
  | { kind: "imperfect" }
  | { kind: "unconstrained" };

/** Split graph property (clique + independent set partition) */
export type Split =
  | { kind: "split" }
  | { kind: "non_split" }
  | { kind: "unconstrained" };

/** Cograph property (P4-free, can be constructed via union/complement) */
export type Cograph =
  | { kind: "cograph" }
  | { kind: "non_cograph" }
  | { kind: "unconstrained" };

/** Threshold graph property (split + cograph) */
export type Threshold =
  | { kind: "threshold" }
  | { kind: "non_threshold" }
  | { kind: "unconstrained" };

/** Line graph property */
export type Line =
  | { kind: "line_graph" }
  | { kind: "non_line_graph" }
  | { kind: "unconstrained" };

/** Claw-free property (no K1,3 induced subgraph) */
export type ClawFree =
  | { kind: "claw_free" }
  | { kind: "has_claw" }
  | { kind: "unconstrained" };
