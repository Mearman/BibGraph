/**
 * Network Analysis Properties
 *
 * Properties from network science: scale-free, small-world, community structure.
 */

// ============================================================================
// NETWORK ANALYSIS PROPERTIES (scale-free, small-world, community structure)
// ============================================================================

/** Scale-free property (power-law degree distribution) */
export type ScaleFree =
  | { kind: "scale_free"; exponent?: number }  // Power-law with given exponent γ (default: 2.1)
  | { kind: "not_scale_free" };              // Degree distribution not power-law

/** Small-world property (high clustering + short paths) */
export type SmallWorld =
  | { kind: "small_world"; rewireProbability?: number; meanDegree?: number }
  | { kind: "not_small_world" }
  | { kind: "unconstrained" };

/** Modular/community structure property */
export type CommunityStructure =
  | { kind: "modular"; numCommunities?: number; intraCommunityDensity?: number; interCommunityDensity?: number }
  | { kind: "non_modular" }
  | { kind: "unconstrained" };
