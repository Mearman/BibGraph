/**
 * Graph Specification System
 *
 * Atomic graph-type properties using discriminated unions for type-safe composition.
 * Each property is a disjoint union with a `kind` discriminator for exhaustiveness checking.
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

// ============================================================================
// ADVANCED PROPERTY AXES (future extension)
// ============================================================================

/** Vertex set cardinality */
export type VertexCardinality =
  | { kind: "finite"; n?: number }
  | { kind: "countably_infinite" }
  | { kind: "uncountably_infinite" };

/** Vertex identity */
export type VertexIdentity =
  | { kind: "distinguishable" }
  | { kind: "indistinguishable" };

/** Vertex ordering */
export type VertexOrdering =
  | { kind: "unordered" }
  | { kind: "total_order" }
  | { kind: "partial_order" };

/** Edge arity (binary vs hypergraph) */
export type EdgeArity =
  | { kind: "binary" }
  | { kind: "k_ary"; k: number };

/** Edge signedness */
export type Signedness =
  | { kind: "unsigned" }
  | { kind: "signed" }
  | { kind: "multi_signed" };

/** Edge uncertainty */
export type Uncertainty =
  | { kind: "deterministic" }
  | { kind: "probabilistic" }
  | { kind: "fuzzy" };

/** Vertex metadata */
export type VertexData =
  | { kind: "unlabelled" }
  | { kind: "labelled" }
  | { kind: "attributed" };

/** Edge metadata */
export type EdgeData =
  | { kind: "unlabelled" }
  | { kind: "labelled" }
  | { kind: "attributed" };

/** Degree constraints */
export type DegreeConstraint =
  | { kind: "unconstrained" }
  | { kind: "bounded"; max: number }
  | { kind: "regular"; degree: number }
  | { kind: "degree_sequence"; sequence: readonly number[] };

/** Partiteness (bipartite, k-partite) */
export type Partiteness =
  | { kind: "unrestricted" }
  | { kind: "bipartite" }
  | { kind: "k_partite"; k: number };

/** Graph embedding */
export type Embedding =
  | { kind: "abstract" }
  | { kind: "planar" }
  | { kind: "surface_embedded" }
  | { kind: "geometric_metric_space" }
  | { kind: "spatial_coordinates"; dims: 2 | 3 };

/** Tree rooting */
export type Rooting =
  | { kind: "unrooted" }
  | { kind: "rooted" }
  | { kind: "multi_rooted" };

/** Temporal properties */
export type Temporal =
  | { kind: "static" }
  | { kind: "dynamic_structure" }
  | { kind: "temporal_edges" }
  | { kind: "temporal_vertices" }
  | { kind: "time_ordered" };

/** Layering (multiplex networks, etc.) */
export type Layering =
  | { kind: "single_layer" }
  | { kind: "multi_layer" }
  | { kind: "multiplex" }
  | { kind: "interdependent" };

/** Edge ordering */
export type EdgeOrdering =
  | { kind: "unordered" }
  | { kind: "ordered" };

/** Port specification */
export type Ports =
  | { kind: "none" }
  | { kind: "port_labelled_vertices" };

/** Observability */
export type Observability =
  | { kind: "fully_specified" }
  | { kind: "partially_observed" }
  | { kind: "latent_or_inferred" };

/** Operational semantics */
export type OperationalSemantics =
  | { kind: "structural_only" }
  | { kind: "annotated_with_functions" }
  | { kind: "executable" };

/** Measure semantics (cost, utility, etc.) */
export type MeasureSemantics =
  | { kind: "none" }
  | { kind: "metric" }
  | { kind: "cost" }
  | { kind: "utility" };

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

// ============================================================================
// COMPOSABLE GRAPH SPECIFICATION
// ============================================================================

/**
 * Complete graph specification with all 46 property axes.
 * Uses discriminated unions for type-safe property composition.
 */
export type GraphSpec = Readonly<{
  // Core properties (currently used)
  directionality: Directionality;
  weighting: Weighting;
  cycles: Cycles;
  connectivity: Connectivity;
  schema: SchemaHomogeneity;
  edgeMultiplicity: EdgeMultiplicity;
  selfLoops: SelfLoops;
  density: Density;
  completeness: Completeness;

  // Advanced properties (future use)
  vertexCardinality?: VertexCardinality;
  vertexIdentity?: VertexIdentity;
  vertexOrdering?: VertexOrdering;
  edgeArity?: EdgeArity;
  signedness?: Signedness;
  uncertainty?: Uncertainty;
  vertexData?: VertexData;
  edgeData?: EdgeData;
  degreeConstraint?: DegreeConstraint;
  partiteness?: Partiteness;
  embedding?: Embedding;
  rooting?: Rooting;
  temporal?: Temporal;
  layering?: Layering;
  edgeOrdering?: EdgeOrdering;
  ports?: Ports;
  observability?: Observability;
  operationalSemantics?: OperationalSemantics;
  measureSemantics?: MeasureSemantics;

  // Network analysis properties
  scaleFree?: ScaleFree;
  smallWorld?: SmallWorld;
  communityStructure?: CommunityStructure;

  // Geometric and topological properties
  unitDisk?: UnitDisk;
  planarity?: Planarity;

  // Path/cycle properties
  hamiltonian?: Hamiltonian;
  traceable?: Traceable;

  // Structural graph classes
  perfect?: Perfect;
  split?: Split;
  cograph?: Cograph;
  threshold?: Threshold;
  line?: Line;
  clawFree?: ClawFree;

  // Regularity properties
  cubic?: Cubic;
  specificRegular?: SpecificRegular;
  stronglyRegular?: StronglyRegular;

  // Symmetry properties
  selfComplementary?: SelfComplementary;
  vertexTransitive?: VertexTransitive;
  edgeTransitive?: EdgeTransitive;
  arcTransitive?: ArcTransitive;

  // Diameter-based properties
  diameter?: Diameter;
  radius?: Radius;

  // Girth & circumference
  girth?: Girth;
  circumference?: Circumference;

  // Forbidden induced subgraphs
  hereditaryClass?: HereditaryClass;

  // Numerical invariants
  independenceNumber?: IndependenceNumber;
  vertexCover?: VertexCover;
  dominationNumber?: DominationNumber;

  // Spectral properties
  spectrum?: Spectrum;
  algebraicConnectivity?: AlgebraicConnectivity;
  spectralRadius?: SpectralRadius;

  // Robustness measures
  toughness?: Toughness;
  integrity?: Integrity;

  // Extremal graphs
  cage?: Cage;
  moore?: MooreGraph;
  ramanujan?: Ramanujan;

  // Graph products
  cartesianProduct?: CartesianProduct;
  tensorProduct?: TensorProduct;
  strongProduct?: StrongProduct;
  lexicographicProduct?: LexicographicProduct;

  // Special bipartite properties
  completeBipartite?: CompleteBipartite;

  // Eulerian/trail properties
  eulerian?: Eulerian;

  // Advanced connectivity
  kVertexConnected?: KVertexConnected;
  kEdgeConnected?: KEdgeConnected;

  // Special graph structures
  wheel?: Wheel;
  grid?: Grid;
  toroidal?: Toroidal;
  star?: Star;

  // Comparison and order graphs
  comparability?: Comparability;
  interval?: Interval;
  permutation?: Permutation;
  chordal?: Chordal;

  // Matching properties
  perfectMatching?: PerfectMatching;

  // Coloring properties
  kColorable?: KColorable;
  chromaticNumber?: ChromaticNumber;

  // Decomposition properties
  treewidth?: Treewidth;
  branchwidth?: Branchwidth;

  // Flow networks
  flowNetwork?: FlowNetwork;

  // Specialized tree properties
  binaryTree?: BinaryTree;
  spanningTree?: SpanningTree;

  // Tournament graphs
  tournament?: Tournament;
}>;

// ============================================================================
// DEFAULTS AND HELPERS
// ============================================================================

/** Default graph specification for common cases */
export const defaultGraphSpec: GraphSpec = {
  directionality: { kind: "undirected" },
  weighting: { kind: "unweighted" },
  cycles: { kind: "cycles_allowed" },
  connectivity: { kind: "unconstrained" },
  schema: { kind: "homogeneous" },
  edgeMultiplicity: { kind: "simple" },
  selfLoops: { kind: "disallowed" },
  density: { kind: "unconstrained" },
  completeness: { kind: "incomplete" },
};

/** Helper type for partial specifications */
export type GraphSpecPatch = Partial<Omit<GraphSpec,
  "vertexCardinality" | "vertexIdentity" | "vertexOrdering" | "edgeArity" | "signedness" | "uncertainty" | "vertexData" | "edgeData" | "degreeConstraint" | "partiteness" | "embedding" | "rooting" | "temporal" | "layering" | "edgeOrdering" | "ports" | "observability" | "operationalSemantics" | "measureSemantics" |
  "scaleFree" | "smallWorld" | "communityStructure" |
  "unitDisk" | "planarity" |
  "hamiltonian" | "traceable" |
  "perfect" | "split" | "cograph" | "threshold" | "line" | "clawFree" |
  "cubic" | "specificRegular" | "stronglyRegular" |
  "selfComplementary" | "vertexTransitive" | "edgeTransitive" | "arcTransitive" |
  "diameter" | "radius" | "girth" | "circumference" | "hereditaryClass" |
  "independenceNumber" | "vertexCover" | "dominationNumber" |
  "spectrum" | "algebraicConnectivity" | "spectralRadius" |
  "toughness" | "integrity" |
  "cage" | "moore" | "ramanujan" |
  "cartesianProduct" | "tensorProduct" | "strongProduct" | "lexicographicProduct" |
  "completeBipartite"
>>;

/**
 * Create a GraphSpec from defaults + overrides.
 * Provides type-safe property composition.
 * @param patch
 */
export const makeGraphSpec = (patch: GraphSpecPatch = {}): GraphSpec => ({ ...defaultGraphSpec, ...patch });

// ============================================================================
// COMMON GRAPH CLASS TYPES
// ============================================================================

/** Type-level intersection for simple undirected graphs */
export type SimpleUndirectedGraphSpec = GraphSpec & Readonly<{
  edgeMultiplicity: { kind: "simple" };
  selfLoops: { kind: "disallowed" };
  directionality: { kind: "undirected" };
}>;

export const simpleUndirectedGraph: SimpleUndirectedGraphSpec = makeGraphSpec({
  edgeMultiplicity: { kind: "simple" },
  selfLoops: { kind: "disallowed" },
  directionality: { kind: "undirected" },
}) as SimpleUndirectedGraphSpec;

/** Type-level intersection for simple directed graphs */
export type SimpleDirectedGraphSpec = GraphSpec & Readonly<{
  edgeMultiplicity: { kind: "simple" };
  selfLoops: { kind: "disallowed" };
  directionality: { kind: "directed" };
}>;

export const simpleDirectedGraph: SimpleDirectedGraphSpec = makeGraphSpec({
  edgeMultiplicity: { kind: "simple" },
  selfLoops: { kind: "disallowed" },
  directionality: { kind: "directed" },
}) as SimpleDirectedGraphSpec;

/** DAG specification */
export type DAGSpec = GraphSpec & Readonly<{
  directionality: { kind: "directed" };
  cycles: { kind: "acyclic" };
  edgeMultiplicity: { kind: "simple" };
  selfLoops: { kind: "disallowed" };
}>;

export const dag: DAGSpec = makeGraphSpec({
  directionality: { kind: "directed" },
  cycles: { kind: "acyclic" },
  edgeMultiplicity: { kind: "simple" },
  selfLoops: { kind: "disallowed" },
}) as DAGSpec;

/** Tree specification */
export type TreeSpec = GraphSpec & Readonly<{
  directionality: { kind: "undirected" };
  cycles: { kind: "acyclic" };
  connectivity: { kind: "connected" };
  edgeMultiplicity: { kind: "simple" };
  selfLoops: { kind: "disallowed" };
}>;

export const tree: TreeSpec = makeGraphSpec({
  directionality: { kind: "undirected" },
  cycles: { kind: "acyclic" },
  connectivity: { kind: "connected" },
  edgeMultiplicity: { kind: "simple" },
  selfLoops: { kind: "disallowed" },
}) as TreeSpec;

/** Weighted directed network */
export type WeightedDirectedNetworkSpec = GraphSpec & Readonly<{
  directionality: { kind: "directed" };
  weighting: { kind: "weighted_numeric" };
}>;

export const weightedDirectedNetwork: WeightedDirectedNetworkSpec = makeGraphSpec({
  directionality: { kind: "directed" },
  weighting: { kind: "weighted_numeric" },
}) as WeightedDirectedNetworkSpec;

// ============================================================================
// PERMUTATION GENERATION
// ============================================================================

/**
 * Generate all valid permutations of core GraphSpec properties.
 * Filters out invalid combinations (e.g., connected + acyclic + complete).
 */
export const generateCoreSpecPermutations = (): GraphSpec[] => {
  const permutations: GraphSpec[] = [];

  const directionalityOptions: Directionality[] = [
    { kind: "directed" },
    { kind: "undirected" },
  ];

  const weightingOptions: Weighting[] = [
    { kind: "unweighted" },
    { kind: "weighted_numeric" },
  ];

  const cyclesOptions: Cycles[] = [
    { kind: "acyclic" },
    { kind: "cycles_allowed" },
  ];

  const connectivityOptions: Connectivity[] = [
    { kind: "connected" },
    { kind: "unconstrained" },
  ];

  const schemaOptions: SchemaHomogeneity[] = [
    { kind: "homogeneous" },
    { kind: "heterogeneous" },
  ];

  const edgeMultiplicityOptions: EdgeMultiplicity[] = [
    { kind: "simple" },
    { kind: "multi" },
  ];

  const selfLoopsOptions: SelfLoops[] = [
    { kind: "allowed" },
    { kind: "disallowed" },
  ];

  const densityOptions: Density[] = [
    { kind: "sparse" },
    { kind: "moderate" },
    { kind: "dense" },
    { kind: "unconstrained" },
  ];

  const completenessOptions: Completeness[] = [
    { kind: "complete" },
    { kind: "incomplete" },
  ];

  // Generate all combinations
  for (const directionality of directionalityOptions) {
    for (const weighting of weightingOptions) {
      for (const cycles of cyclesOptions) {
        for (const connectivity of connectivityOptions) {
          for (const schema of schemaOptions) {
            for (const edgeMultiplicity of edgeMultiplicityOptions) {
              for (const selfLoops of selfLoopsOptions) {
                for (const density of densityOptions) {
                  for (const completeness of completenessOptions) {
                    const spec: GraphSpec = {
                      directionality,
                      weighting,
                      cycles,
                      connectivity,
                      schema,
                      edgeMultiplicity,
                      selfLoops,
                      density,
                      completeness,
                    };

                    // Validate constraints
                    if (isValidSpec(spec)) {
                      permutations.push(spec);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return permutations;
};

/**
 * Validate that a GraphSpec doesn't contain contradictory properties.
 * @param spec
 */
export const isValidSpec = (spec: GraphSpec): boolean => {
  // Self-loops require cycles
  if (spec.selfLoops.kind === "allowed" && spec.cycles.kind === "acyclic") {
    return false;
  }

  // Complete graphs cannot be acyclic (complete graphs on 3+ nodes have cycles)
  if (spec.completeness.kind === "complete" && spec.cycles.kind === "acyclic") {
    return false;
  }

  // Complete graphs require dense edge count
  if (spec.completeness.kind === "complete" && spec.density.kind === "sparse") {
    return false;
  }

  // Multigraphs can't be complete (parallel edges make completeness ill-defined)
  if (spec.edgeMultiplicity.kind === "multi" && spec.completeness.kind === "complete") {
    return false;
  }

  // Connected acyclic graphs (trees/DAGs) have structural edge constraints
  if (spec.cycles.kind === "acyclic" && spec.connectivity.kind === "connected" && // Trees need at least n-1 edges, which for n=10 is 10% (sparse range)
    // They can't be dense or complete
    (spec.density.kind === "dense" || spec.completeness.kind === "complete")) {
      return false;
    }

  // Disconnected acyclic graphs (forests) also have minimum edge constraints
  if (spec.cycles.kind === "acyclic" && spec.connectivity.kind === "unconstrained" && // Forests with multiple components need edges within each component
    // For n=10 split into 3 components, minimum is ~7-9 edges = 8-10%
    // Can only be sparse, not moderate/dense/complete
    (spec.density.kind === "moderate" || spec.density.kind === "dense" || spec.completeness.kind === "complete")) {
      return false;
    }

  // Connected dense graphs need enough edges - for n=10, dense requires ~70% = 63 edges
  // But the generator may not achieve this for all configurations
  // Allow dense + connected but be tolerant in validation

  return true;
};

/**
 * Generate a human-readable description of a GraphSpec.
 * @param spec
 */
export const describeSpec = (spec: GraphSpec): string => {
  const parts: string[] = [];

  if (spec.directionality.kind === "directed") parts.push("directed");
  else parts.push("undirected");

  if (spec.weighting.kind === "weighted_numeric") parts.push("weighted");

  if (spec.cycles.kind === "acyclic") parts.push("acyclic");

  if (spec.connectivity.kind === "connected") parts.push("connected");
  // Skip "unconstrained" as it's the default

  if (spec.schema.kind === "heterogeneous") parts.push("heterogeneous");

  if (spec.edgeMultiplicity.kind === "multi") parts.push("multigraph");

  if (spec.selfLoops.kind === "allowed") parts.push("self-loops");

  if (spec.density.kind !== "unconstrained") parts.push(spec.density.kind);

  if (spec.completeness.kind === "complete") parts.push("complete");

  return parts.join(", ") || "default graph";
};

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Convenience helper for creating specs with commonly-used properties
 * @param overrides
 */
export const createSpec = (overrides: GraphSpecPatch = {}): GraphSpec => makeGraphSpec(overrides);

/**
 * Type guard for directed graphs
 * @param spec
 */
export const isDirected = (spec: GraphSpec): spec is GraphSpec & { directionality: { kind: "directed" } } => spec.directionality.kind === "directed";

/**
 * Type guard for weighted graphs
 * @param spec
 */
export const isWeighted = (spec: GraphSpec): spec is GraphSpec & { weighting: { kind: "weighted_numeric" } } => spec.weighting.kind === "weighted_numeric";

/**
 * Type guard for acyclic graphs
 * @param spec
 */
export const isAcyclic = (spec: GraphSpec): spec is GraphSpec & { cycles: { kind: "acyclic" } } => spec.cycles.kind === "acyclic";

/**
 * Type guard for connected graphs
 * @param spec
 */
export const isConnected = (spec: GraphSpec): spec is GraphSpec & { connectivity: { kind: "connected" } } => spec.connectivity.kind === "connected";

/**
 * Type guard for heterogeneous graphs
 * @param spec
 */
export const isHeterogeneous = (spec: GraphSpec): spec is GraphSpec & { schema: { kind: "heterogeneous" } } => spec.schema.kind === "heterogeneous";

/**
 * Type guard for multigraphs
 * @param spec
 */
export const isMultigraph = (spec: GraphSpec): spec is GraphSpec & { edgeMultiplicity: { kind: "multi" } } => spec.edgeMultiplicity.kind === "multi";

/**
 * Type guard for graphs allowing self-loops
 * @param spec
 */
export const allowsSelfLoops = (spec: GraphSpec): spec is GraphSpec & { selfLoops: { kind: "allowed" } } => spec.selfLoops.kind === "allowed";
