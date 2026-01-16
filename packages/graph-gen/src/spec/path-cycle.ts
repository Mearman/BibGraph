/**
 * Path and Cycle Properties
 *
 * Properties related to Hamiltonian paths and cycles.
 */

// ============================================================================
// PATH/CYCLE PROPERTIES (Hamiltonian, traceable)
// ============================================================================

/** Hamiltonian cycle property */
export type Hamiltonian =
  | { kind: "hamiltonian" }      // Has cycle visiting every vertex
  | { kind: "non_hamiltonian" }
  | { kind: "unconstrained" };

/** Hamiltonian path property */
export type Traceable =
  | { kind: "traceable" }        // Has path visiting every vertex
  | { kind: "non_traceable" }
  | { kind: "unconstrained" };
