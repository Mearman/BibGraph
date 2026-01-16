/**
 * Regularity Properties
 *
 * Properties related to regular graphs and degree constraints.
 */

// ============================================================================
// REGULARITY PROPERTIES (cubic, k-regular, strongly regular)
// ============================================================================

/** Cubic graph property (3-regular) */
export type Cubic =
  | { kind: "cubic" }           // All vertices have degree 3
  | { kind: "non_cubic" }
  | { kind: "unconstrained" };

/** Specific regularity property */
export type SpecificRegular =
  | { kind: "k_regular"; k: number }  // All vertices have degree k
  | { kind: "not_k_regular" }
  | { kind: "unconstrained" };

/** Strongly regular graph property */
export type StronglyRegular =
  | { kind: "strongly_regular"; k: number; lambda: number; mu: number }
  | { kind: "not_strongly_regular" }
  | { kind: "unconstrained" };
