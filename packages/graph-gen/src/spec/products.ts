/**
 * Graph Products and Related Structures
 *
 * Graph products, minor-free graphs, and specialized graph structures.
 */

// ============================================================================
// ROBUSTNESS MEASURES
// ============================================================================

/** Toughness: minimum k such that removing k vertices disconnects */
export type Toughness =
  | { kind: "toughness"; value: number }
  | { kind: "unconstrained" };

/** Integrity: resilience measure based on vertex removal */
export type Integrity =
  | { kind: "integrity"; value: number }
  | { kind: "unconstrained" };

// ============================================================================
// EXTREMAL GRAPHS
// ============================================================================

/** Cage graph: (girth, degree) combination with minimal vertices */
export type Cage =
  | { kind: "cage"; girth: number; degree: number }
  | { kind: "not_cage" }
  | { kind: "unconstrained" };

/** Moore graph: maximum vertices for given (diameter, degree) bound */
export type MooreGraph =
  | { kind: "moore"; diameter: number; degree: number }
  | { kind: "not_moore" }
  | { kind: "unconstrained" };

/** Ramanujan graph: optimal expander with spectral gap property */
export type Ramanujan =
  | { kind: "ramanujan"; degree: number }
  | { kind: "not_ramanujan" }
  | { kind: "unconstrained" };

// ============================================================================
// GRAPH PRODUCTS
// ============================================================================

/** Cartesian product G □ H */
export type CartesianProduct =
  | { kind: "cartesian_product"; leftFactors: number; rightFactors: number }
  | { kind: "not_cartesian_product" }
  | { kind: "unconstrained" };

/** Tensor (direct) product G × H */
export type TensorProduct =
  | { kind: "tensor_product"; leftFactors: number; rightFactors: number }
  | { kind: "not_tensor_product" }
  | { kind: "unconstrained" };

/** Strong product G ⊠ H */
export type StrongProduct =
  | { kind: "strong_product"; leftFactors: number; rightFactors: number }
  | { kind: "not_strong_product" }
  | { kind: "unconstrained" };

/** Lexicographic product G ∘ H */
export type LexicographicProduct =
  | { kind: "lexicographic_product"; leftFactors: number; rightFactors: number }
  | { kind: "not_lexicographic_product" }
  | { kind: "unconstrained" };

// ============================================================================
// MINOR-FREE GRAPHS
// ============================================================================

/** Minor-free: excludes specific graph minors (Kuratowski-Wagner theorem) */
export type MinorFree =
  | { kind: "minor_free"; forbiddenMinors: string[] }
  | { kind: "not_minor_free" }
  | { kind: "unconstrained" };

/** Topological minor-free: excludes specific subdivisions */
export type TopologicalMinorFree =
  | { kind: "topological_minor_free"; forbiddenMinors: string[] }
  | { kind: "not_topological_minor_free" }
  | { kind: "unconstrained" };

// ============================================================================
// SPECIAL BIPARTITE PROPERTIES
// ============================================================================

/** Complete bipartite property K_{m,n} */
export type CompleteBipartite =
  | { kind: "complete_bipartite"; m: number; n: number }
  | { kind: "not_complete_bipartite" }
  | { kind: "unconstrained" };

// ============================================================================
// EULERIAN/TRAIL PROPERTIES
// ============================================================================

/** Eulerian circuit property (uses every edge exactly once, returns to start) */
export type Eulerian =
  | { kind: "eulerian" }        // Has Eulerian circuit
  | { kind: "semi_eulerian" }   // Has Eulerian trail (start ≠ end)
  | { kind: "non_eulerian" }
  | { kind: "unconstrained" };

// ============================================================================
// ADVANCED CONNECTIVITY (k-vertex and k-edge)
// ============================================================================

/** k-vertex-connected property (cannot disconnect by removing < k vertices) */
export type KVertexConnected =
  | { kind: "k_vertex_connected"; k: number }  // k-connected
  | { kind: "unconstrained" };

/** k-edge-connected property (cannot disconnect by removing < k edges) */
export type KEdgeConnected =
  | { kind: "k_edge_connected"; k: number }  // k-edge-connected
  | { kind: "unconstrained" };

// ============================================================================
// SPECIAL GRAPH STRUCTURES
// ============================================================================

/** Wheel graph property (cycle + central hub connected to all) */
export type Wheel =
  | { kind: "wheel" }
  | { kind: "not_wheel" }
  | { kind: "unconstrained" };

/** Grid/lattice graph property */
export type Grid =
  | { kind: "grid"; rows: number; cols: number }
  | { kind: "not_grid" }
  | { kind: "unconstrained" };

/** Toroidal graph property (grid on torus) */
export type Toroidal =
  | { kind: "toroidal"; rows: number; cols: number }
  | { kind: "not_toroidal" }
  | { kind: "unconstrained" };

/** Star graph property (one central vertex) */
export type Star =
  | { kind: "star" }
  | { kind: "not_star" }
  | { kind: "unconstrained" };

// ============================================================================
// COMPARISON AND ORDER GRAPHS
// ============================================================================

/** Comparability graph property (represents partial order) */
export type Comparability =
  | { kind: "comparability" }
  | { kind: "incomparability" }
  | { kind: "unconstrained" };

/** Interval graph property (intersection of intervals) */
export type Interval =
  | { kind: "interval" }
  | { kind: "not_interval" }
  | { kind: "unconstrained" };

/** Permutation graph property */
export type Permutation =
  | { kind: "permutation" }
  | { kind: "not_permutation" }
  | { kind: "unconstrained" };

/** Chordal graph property (no induced cycles > 3) */
export type Chordal =
  | { kind: "chordal" }
  | { kind: "non_chordal" }
  | { kind: "unconstrained" };

// ============================================================================
// MATCHING PROPERTIES
// ============================================================================

/** Perfect matching property */
export type PerfectMatching =
  | { kind: "perfect_matching" }    // All vertices matched
  | { kind: "near_perfect" }        // All but one vertex matched
  | { kind: "no_perfect_matching" }
  | { kind: "unconstrained" };

// ============================================================================
// COLORING PROPERTIES
// ============================================================================

/** k-colorable property */
export type KColorable =
  | { kind: "k_colorable"; k: number }  // Can be colored with k colors
  | { kind: "bipartite_colorable" }     // 2-colorable
  | { kind: "unconstrained" };

/** Chromatic number property (minimum colors needed) */
export type ChromaticNumber =
  | { kind: "chromatic_number"; chi: number }
  | { kind: "unconstrained" };

// ============================================================================
// DECOMPOSITION PROPERTIES
// ============================================================================

/** Treewidth property (how tree-like the graph is) */
export type Treewidth =
  | { kind: "treewidth"; width: number }
  | { kind: "unconstrained" };

/** Branchwidth property */
export type Branchwidth =
  | { kind: "branchwidth"; width: number }
  | { kind: "unconstrained" };

// ============================================================================
// FLOW NETWORKS
// ============================================================================

/** Flow network property */
export type FlowNetwork =
  | { kind: "flow_network"; source: string; sink: string }
  | { kind: "not_flow_network" }
  | { kind: "unconstrained" };

// ============================================================================
// SPECIALIZED TREE PROPERTIES
// ============================================================================

/** Binary tree property */
export type BinaryTree =
  | { kind: "binary_tree" }     // Each node has ≤ 2 children
  | { kind: "full_binary" }     // Each node has 0 or 2 children
  | { kind: "complete_binary" } // All levels filled except possibly last
  | { kind: "not_binary_tree" }
  | { kind: "unconstrained" };

/** Spanning tree property */
export type SpanningTree =
  | { kind: "spanning_tree"; of: string }  // Spanning tree of graph with ID
  | { kind: "not_spanning_tree" }
  | { kind: "unconstrained" };

// ============================================================================
// TOURNAMENT GRAPHS
// ============================================================================

/** Tournament property (complete oriented graph) */
export type Tournament =
  | { kind: "tournament" }
  | { kind: "not_tournament" }
  | { kind: "unconstrained" };
