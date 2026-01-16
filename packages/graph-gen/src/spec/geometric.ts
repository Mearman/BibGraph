/**
 * Geometric and Topological Properties
 *
 * Properties related to geometric constraints and planarity.
 */

// ============================================================================
// GEOMETRIC AND TOPOLOGICAL PROPERTIES (Unit disk, planar)
// ============================================================================

/** Unit disk graph property (geometric constraint) */
export type UnitDisk =
  | { kind: "unit_disk"; unitRadius?: number; spaceSize?: number }
  | { kind: "not_unit_disk" }
  | { kind: "unconstrained" };

/** Planar graph property (K5/K3,3-free) */
export type Planarity =
  | { kind: "planar" }
  | { kind: "non_planar" }
  | { kind: "unconstrained" };
