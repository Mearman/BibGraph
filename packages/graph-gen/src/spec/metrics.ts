/**
 * Metric Properties
 *
 * Properties based on distance metrics and graph dimensions.
 */

// ============================================================================
// DIAMETER-BASED PROPERTIES
// ============================================================================

/** Longest shortest path in graph */
export type Diameter =
  | { kind: "diameter"; value: number }
  | { kind: "unconstrained" };

/** Minimum eccentricity among all vertices */
export type Radius =
  | { kind: "radius"; value: number }
  | { kind: "unconstrained" };

// ============================================================================
// GIRTH & CIRCUMFERENCE
// ============================================================================

/** Length of shortest cycle */
export type Girth =
  | { kind: "girth"; girth: number }
  | { kind: "unconstrained" };

/** Length of longest cycle */
export type Circumference =
  | { kind: "circumference"; value: number }
  | { kind: "unconstrained" };
