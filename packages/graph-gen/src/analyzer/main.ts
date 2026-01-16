/**
 * Graph Spec Analyzer - Main API
 *
 * Main exports for the analyzer module including InferredGraphSpec type
 * and computeGraphSpecFromGraph function.
 */

import {
  computeEdgeOrdering,
  computeEmbedding,
  computeLayering,
  computeMeasureSemantics,
  computeObservability,
  computeOperationalSemantics,
  computePorts,
  computeRooting,
  computeTemporal} from './advanced-props';
import {
  computeAutoRegular,
  computeClawFree,
  computeCograph,
  computeCompleteBipartite,
  computeCubic,
  computeLine,
  computePerfect,
  computeSelfComplementary,
  computeSplit,
  computeStronglyRegular,
  computeThreshold,
  computeVertexTransitive} from './advanced-structures';
import {
  computeConnectivity,
  computeCycles,
  computeDegreeConstraint
} from './connectivity';
// Import all compute functions from their modules
import {
  computeDirectionality,
  computeEdgeArity,
  computeEdgeData,
  computeEdgeMultiplicity,
  computeSchemaHomogeneity,
  computeSelfLoops,
  computeSignedness,
  computeUncertainty,
  computeVertexCardinality,
  computeVertexData,
  computeVertexIdentity,
  computeVertexOrdering,
  computeWeighting} from './core-props';
import {
  computeHamiltonian,
  computeTraceable
} from './path-props';
import {
  computeCommunityStructure,
  computeScaleFree,
  computeSmallWorld} from './spectral';
import {
  computeCompleteness,
  computeDensity,
  computePartiteness} from './structure';
import type {
  AnalyzerGraph,
  AnalyzerVertexId,
  ComputePolicy} from './types';
import {
  defaultComputePolicy
} from './types';

// Re-export all functions

// ============================================================================
// Type-safe GraphSpec (inferred from graph structure)
// ============================================================================

export type InferredGraphSpec = Readonly<{
  vertexCardinality: ReturnType<typeof computeVertexCardinality>;
  vertexIdentity: ReturnType<typeof computeVertexIdentity>;
  vertexOrdering: ReturnType<typeof computeVertexOrdering>;

  edgeArity: ReturnType<typeof computeEdgeArity>;
  edgeMultiplicity: ReturnType<typeof computeEdgeMultiplicity>;
  selfLoops: ReturnType<typeof computeSelfLoops>;

  directionality: ReturnType<typeof computeDirectionality>;

  weighting: ReturnType<typeof computeWeighting>;
  signedness: ReturnType<typeof computeSignedness>;
  uncertainty: ReturnType<typeof computeUncertainty>;

  vertexData: ReturnType<typeof computeVertexData>;
  edgeData: ReturnType<typeof computeEdgeData>;
  schema: ReturnType<typeof computeSchemaHomogeneity>;

  connectivity: ReturnType<typeof computeConnectivity>;
  cycles: ReturnType<typeof computeCycles>;
  degreeConstraint: ReturnType<typeof computeDegreeConstraint>;
  completeness: ReturnType<typeof computeCompleteness>;
  partiteness: ReturnType<typeof computePartiteness>;
  density: ReturnType<typeof computeDensity>;

  embedding: ReturnType<typeof computeEmbedding>;
  rooting: ReturnType<typeof computeRooting>;
  temporal: ReturnType<typeof computeTemporal>;
  layering: ReturnType<typeof computeLayering>;
  edgeOrdering: ReturnType<typeof computeEdgeOrdering>;
  ports: ReturnType<typeof computePorts>;

  observability: ReturnType<typeof computeObservability>;
  operationalSemantics: ReturnType<typeof computeOperationalSemantics>;
  measureSemantics: ReturnType<typeof computeMeasureSemantics>;

  // Network analysis properties
  scaleFree: ReturnType<typeof computeScaleFree>;
  smallWorld: ReturnType<typeof computeSmallWorld>;
  communityStructure: ReturnType<typeof computeCommunityStructure>;

  // Path and cycle properties
  hamiltonian: ReturnType<typeof computeHamiltonian>;
  traceable: ReturnType<typeof computeTraceable>;

  // Structural properties
  perfect: ReturnType<typeof computePerfect>;
  split: ReturnType<typeof computeSplit>;
  cograph: ReturnType<typeof computeCograph>;
  threshold: ReturnType<typeof computeThreshold>;
  line: ReturnType<typeof computeLine>;
  clawFree: ReturnType<typeof computeClawFree>;

  // Regularity properties
  cubic: ReturnType<typeof computeCubic>;
  specificRegular: ReturnType<typeof computeAutoRegular>;
  stronglyRegular: ReturnType<typeof computeStronglyRegular>;

  // Symmetry properties
  selfComplementary: ReturnType<typeof computeSelfComplementary>;
  vertexTransitive: ReturnType<typeof computeVertexTransitive>;

  // Special bipartite properties
  completeBipartite: ReturnType<typeof computeCompleteBipartite>;
}>;

// ============================================================================
// Main API: Compute full GraphSpec from graph
// ============================================================================

export const computeGraphSpecFromGraph = (g: AnalyzerGraph, policy: Partial<ComputePolicy> = {}): InferredGraphSpec => {
  const p: ComputePolicy = { ...defaultComputePolicy, ...policy };

  return {
    vertexCardinality: computeVertexCardinality(g),
    vertexIdentity: computeVertexIdentity(g),
    vertexOrdering: computeVertexOrdering(g, p),

    edgeArity: computeEdgeArity(g),
    edgeMultiplicity: computeEdgeMultiplicity(g),
    selfLoops: computeSelfLoops(g),

    directionality: computeDirectionality(g),

    weighting: computeWeighting(g, p),
    signedness: computeSignedness(g),
    uncertainty: computeUncertainty(g, p),

    vertexData: computeVertexData(g),
    edgeData: computeEdgeData(g),
    schema: computeSchemaHomogeneity(g),

    connectivity: computeConnectivity(g),
    cycles: computeCycles(g),
    degreeConstraint: computeDegreeConstraint(g),
    completeness: computeCompleteness(g),
    partiteness: computePartiteness(g),
    density: computeDensity(g),

    embedding: computeEmbedding(g, p),
    rooting: computeRooting(g, p),
    temporal: computeTemporal(g, p),
    layering: computeLayering(g, p),
    edgeOrdering: computeEdgeOrdering(g, p),
    ports: computePorts(g, p),

    observability: computeObservability(g),
    operationalSemantics: computeOperationalSemantics(g),
    measureSemantics: computeMeasureSemantics(g),

    // Network analysis properties
    scaleFree: computeScaleFree(g),
    smallWorld: computeSmallWorld(g),
    communityStructure: computeCommunityStructure(g, p),

    // Path and cycle properties
    hamiltonian: computeHamiltonian(g),
    traceable: computeTraceable(g),

    // Structural properties
    perfect: computePerfect(g),
    split: computeSplit(g),
    cograph: computeCograph(g),
    threshold: computeThreshold(g),
    line: computeLine(g),
    clawFree: computeClawFree(g),

    // Regularity properties
    cubic: computeCubic(g),
    specificRegular: computeAutoRegular(g),
    stronglyRegular: computeStronglyRegular(g),

    // Symmetry properties
    selfComplementary: computeSelfComplementary(g),
    vertexTransitive: computeVertexTransitive(g),

    // Special bipartite properties
    completeBipartite: computeCompleteBipartite(g),
  };
};

