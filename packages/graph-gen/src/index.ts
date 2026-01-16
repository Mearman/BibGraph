/**
 * Graph Generation and Specification
 *
 * Type-safe graph property specifications, test fixture generation,
 * and mathematical constraint validation.
 */

// Graph specification types
export * from "./spec";

// Graph property analysis
export * from "./analyzer";
export type {
  AnalyzerVertexId,
  AnalyzerVertex,
  AnalyzerEdge,
  AnalyzerGraph,
  ComputePolicy
} from "./analyzer-helpers";
export {
  defaultComputePolicy,
  unique,
  allEqual,
  edgeKeyBinary,
  hasAnyDirectedEdges,
  hasAnyUndirectedEdges,
  countSelfLoopsBinary,
  buildAdjUndirectedBinary,
  isConnectedUndirectedBinary,
  isAcyclicDirectedBinary,
  degreesUndirectedBinary,
  isBipartiteUndirectedBinary
} from "./analyzer-helpers";

// Mathematical constraint validation
export * from "./constraints";

// Graph validation
export * from "./validation/index";

// Test fixture generation
export * from "./generator";
