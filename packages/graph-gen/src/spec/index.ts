/**
 * Graph Specification System
 *
 * Atomic graph-type properties using discriminated unions for type-safe composition.
 * Each property is a disjoint union with a `kind` discriminator for exhaustiveness checking.
 *
 * This module re-exports all property types for convenient importing.
 */

// Core properties
export type {
  Directionality,
  Weighting,
  Cycles,
  Connectivity,
  SchemaHomogeneity,
  EdgeMultiplicity,
  SelfLoops,
  Density,
  Completeness,
} from "./core.js";

// Advanced properties
export type {
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
} from "./advanced.js";

// Network analysis properties
export type {
  ScaleFree,
  SmallWorld,
  CommunityStructure,
} from "./network.js";

// Geometric properties
export type {
  UnitDisk,
  Planarity,
} from "./geometric.js";

// Path and cycle properties
export type {
  Hamiltonian,
  Traceable,
} from "./path-cycle.js";

// Structural classes
export type {
  Perfect,
  Split,
  Cograph,
  Threshold,
  Line,
  ClawFree,
} from "./structural.js";

// Regularity properties
export type {
  Cubic,
  SpecificRegular,
  StronglyRegular,
} from "./regularity.js";

// Symmetry properties
export type {
  SelfComplementary,
  VertexTransitive,
  EdgeTransitive,
  ArcTransitive,
} from "./symmetry.js";

// Metric properties
export type {
  Diameter,
  Radius,
  Girth,
  Circumference,
} from "./metrics.js";

// Invariants and spectral properties
export type {
  HereditaryClass,
  IndependenceNumber,
  VertexCover,
  DominationNumber,
  Spectrum,
  AlgebraicConnectivity,
  SpectralRadius,
} from "./invariants.js";

// Graph products and related structures
export type {
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
} from "./products.js";
