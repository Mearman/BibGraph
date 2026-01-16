/**
 * Graph Invariants and Spectral Properties
 *
 * Numerical invariants, forbidden subgraphs, and spectral properties.
 */

// ============================================================================
// FORBIDDEN INDUCED SUBGRAPHS
// ============================================================================

/** Hereditary class with forbidden induced subgraphs */
export type HereditaryClass =
  | { kind: "hereditary_class"; forbidden: readonly string[] }
  | { kind: "unconstrained" };

// ============================================================================
// NUMERICAL INVARIANTS
// ============================================================================

/** Independence number (α): size of largest independent set */
export type IndependenceNumber =
  | { kind: "independence_number"; value: number }
  | { kind: "unconstrained" };

/** Vertex cover number (τ): minimum vertices covering all edges */
export type VertexCover =
  | { kind: "vertex_cover"; value: number }
  | { kind: "unconstrained" };

/** Domination number (γ): minimum vertices dominating all others */
export type DominationNumber =
  | { kind: "domination_number"; value: number }
  | { kind: "unconstrained" };

// ============================================================================
// SPECTRAL PROPERTIES
// ============================================================================

/** Full spectrum: eigenvalue-based properties */
export type Spectrum =
  | { kind: "spectrum"; eigenvalues: readonly number[] }
  | { kind: "unconstrained" };

/** Algebraic connectivity (λ₂): second smallest Laplacian eigenvalue (Fiedler value) */
export type AlgebraicConnectivity =
  | { kind: "algebraic_connectivity"; value: number }
  | { kind: "unconstrained" };

/** Spectral radius (ρ): largest eigenvalue (Perron-Frobenius for non-negative) */
export type SpectralRadius =
  | { kind: "spectral_radius"; value: number }
  | { kind: "unconstrained" };
