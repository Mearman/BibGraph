/**
 * Graph Specification System
 *
 * Atomic graph-type properties using discriminated unions for type-safe composition.
 * Each property is a disjoint union with a `kind` discriminator for exhaustiveness checking.
 *
 * Property types are organized into focused modules in the spec/ directory.
 */

// ============================================================================
// PROPERTY TYPE IMPORTS
// ============================================================================

// Import all property types from modular structure for use in composite types
import type {
  // Core properties
  Directionality,
  Weighting,
  Cycles,
  Connectivity,
  SchemaHomogeneity,
  EdgeMultiplicity,
  SelfLoops,
  Density,
  Completeness,
  // Advanced properties
  VertexCardinality,
  VertexIdentity,
  VertexOrdering,
  EdgeArity,
  Signedness,
  Uncertainty,
  VertexData,
  EdgeData,
  DegreeConstraint,
  Partiteness,
  Embedding,
  Rooting,
  Temporal,
  Layering,
  EdgeOrdering,
  Ports,
  Observability,
  OperationalSemantics,
  MeasureSemantics,
  // Network analysis
  ScaleFree,
  SmallWorld,
  CommunityStructure,
  // Geometric
  UnitDisk,
  Planarity,
  // Path & cycle
  Hamiltonian,
  Traceable,
  // Structural classes
  Perfect,
  Split,
  Cograph,
  Threshold,
  Line,
  ClawFree,
  // Regularity
  Cubic,
  SpecificRegular,
  StronglyRegular,
  // Symmetry
  SelfComplementary,
  VertexTransitive,
  EdgeTransitive,
  ArcTransitive,
  // Metrics
  Diameter,
  Radius,
  Girth,
  Circumference,
  // Invariants & spectral
  HereditaryClass,
  IndependenceNumber,
  VertexCover,
  DominationNumber,
  Spectrum,
  AlgebraicConnectivity,
  SpectralRadius,
  // Products & structures
  Toughness,
  Integrity,
  Cage,
  MooreGraph,
  Ramanujan,
  CartesianProduct,
  TensorProduct,
  StrongProduct,
  LexicographicProduct,
  MinorFree,
  TopologicalMinorFree,
  CompleteBipartite,
  Eulerian,
  KVertexConnected,
  KEdgeConnected,
  Wheel,
  Grid,
  Toroidal,
  Star,
  Comparability,
  Interval,
  Permutation,
  Chordal,
  PerfectMatching,
  KColorable,
  ChromaticNumber,
  Treewidth,
  Branchwidth,
  FlowNetwork,
  BinaryTree,
  SpanningTree,
  Tournament,
} from "./spec/index.js";

// Re-export for backward compatibility
export type {
  // Core properties
  Directionality,
  Weighting,
  Cycles,
  Connectivity,
  SchemaHomogeneity,
  EdgeMultiplicity,
  SelfLoops,
  Density,
  Completeness,
  // Advanced properties
  VertexCardinality,
  VertexIdentity,
  VertexOrdering,
  EdgeArity,
  Signedness,
  Uncertainty,
  VertexData,
  EdgeData,
  DegreeConstraint,
  Partiteness,
  Embedding,
  Rooting,
  Temporal,
  Layering,
  EdgeOrdering,
  Ports,
  Observability,
  OperationalSemantics,
  MeasureSemantics,
  // Network analysis
  ScaleFree,
  SmallWorld,
  CommunityStructure,
  // Geometric
  UnitDisk,
  Planarity,
  // Path & cycle
  Hamiltonian,
  Traceable,
  // Structural classes
  Perfect,
  Split,
  Cograph,
  Threshold,
  Line,
  ClawFree,
  // Regularity
  Cubic,
  SpecificRegular,
  StronglyRegular,
  // Symmetry
  SelfComplementary,
  VertexTransitive,
  EdgeTransitive,
  ArcTransitive,
  // Metrics
  Diameter,
  Radius,
  Girth,
  Circumference,
  // Invariants & spectral
  HereditaryClass,
  IndependenceNumber,
  VertexCover,
  DominationNumber,
  Spectrum,
  AlgebraicConnectivity,
  SpectralRadius,
  // Products & structures
  Toughness,
  Integrity,
  Cage,
  MooreGraph,
  Ramanujan,
  CartesianProduct,
  TensorProduct,
  StrongProduct,
  LexicographicProduct,
  MinorFree,
  TopologicalMinorFree,
  CompleteBipartite,
  Eulerian,
  KVertexConnected,
  KEdgeConnected,
  Wheel,
  Grid,
  Toroidal,
  Star,
  Comparability,
  Interval,
  Permutation,
  Chordal,
  PerfectMatching,
  KColorable,
  ChromaticNumber,
  Treewidth,
  Branchwidth,
  FlowNetwork,
  BinaryTree,
  SpanningTree,
  Tournament,
};

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

  // Minor-free graphs
  minorFree?: MinorFree;
  topologicalMinorFree?: TopologicalMinorFree;

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
  "minorFree" | "topologicalMinorFree" |
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
