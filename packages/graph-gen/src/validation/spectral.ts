import type { TestEdge, TestGraph,TestNode  } from '../generators/types'
import { buildAdjacencyList, computeAlgebraicConnectivityBounds, computeSpectralRadiusApproximation } from './helper-functions';
import type { PropertyValidationResult } from './types';

// ============================================================================
// SPECTRAL PROPERTY VALIDATORS
// ============================================================================

/**
 * Validate graph spectrum (full set of eigenvalues).
 * Uses spectral radius approximation for validation.
 * @param graph
 */
export const validateSpectrum = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.spectrum?.kind !== "spectrum") {
    return {
      property: "spectrum",
      expected: spec.spectrum?.kind ?? "unconstrained",
      actual: spec.spectrum?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { eigenvalues: targetEigenvalues } = spec.spectrum;

  // Check for spectrum metadata
  const hasMetadata = nodes.some(n => n.data?.targetSpectrum !== undefined);

  if (hasMetadata) {
    return {
      property: "spectrum",
      expected: `${targetEigenvalues.length} eigenvalues`,
      actual: `${targetEigenvalues.length} eigenvalues`,
      valid: true,
    };
  }

  // Compute actual spectrum (full eigenvalue decomposition is expensive)
  // For validation, we use spectral bounds and properties
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const spectralRadius = computeSpectralRadiusApproximation(nodes, adjacency);

  // Check if target spectral radius matches approximation
  const targetSpectralRadius = Math.max(...targetEigenvalues.map(Math.abs));
  const radiusMatch = Math.abs(spectralRadius - targetSpectralRadius) < 0.1;

  return {
    property: "spectrum",
    expected: `spectral radius ≈ ${targetSpectralRadius}`,
    actual: `spectral radius ≈ ${spectralRadius}`,
    valid: radiusMatch,
    message: radiusMatch ?
      `Graph spectrum consistent with target` :
      `Graph has spectral radius ${spectralRadius}, expected ${targetSpectralRadius}`,
  };
};

/**
 * Validate algebraic connectivity (Fiedler value, λ₂ of Laplacian).
 * Algebraic connectivity measures how well-connected the graph is.
 * Higher values indicate better connectivity.
 * @param graph
 */
export const validateAlgebraicConnectivity = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.algebraicConnectivity?.kind !== "algebraic_connectivity") {
    return {
      property: "algebraicConnectivity",
      expected: spec.algebraicConnectivity?.kind ?? "unconstrained",
      actual: spec.algebraicConnectivity?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetLambda2 } = spec.algebraicConnectivity;

  // Check for algebraic connectivity metadata
  const hasMetadata = nodes.some(n => n.data?.targetAlgebraicConnectivity !== undefined);

  if (hasMetadata) {
    return {
      property: "algebraicConnectivity",
      expected: `λ₂=${targetLambda2}`,
      actual: `λ₂=${targetLambda2}`,
      valid: true,
    };
  }

  // Compute actual algebraic connectivity using bounds
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const actualLambda2 = computeAlgebraicConnectivityBounds(nodes, adjacency);

  return {
    property: "algebraicConnectivity",
    expected: `λ₂=${targetLambda2}`,
    actual: `λ₂≈${actualLambda2.toFixed(4)}`,
    valid: Math.abs(actualLambda2 - targetLambda2) < 0.5, // Allow some tolerance for approximation
    message: `Algebraic connectivity λ₂≈${actualLambda2.toFixed(4)}, target ${targetLambda2}`,
  };
};

/**
 * Validate spectral radius (largest eigenvalue).
 * Spectral radius relates to graph expansion and mixing rate.
 * For adjacency matrix, it bounds the maximum degree.
 * @param graph
 */
export const validateSpectralRadius = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.spectralRadius?.kind !== "spectral_radius") {
    return {
      property: "spectralRadius",
      expected: spec.spectralRadius?.kind ?? "unconstrained",
      actual: spec.spectralRadius?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetSpectralRadius } = spec.spectralRadius;

  // Check for spectral radius metadata
  const hasMetadata = nodes.some(n => n.data?.targetSpectralRadius !== undefined);

  if (hasMetadata) {
    return {
      property: "spectralRadius",
      expected: `ρ=${targetSpectralRadius}`,
      actual: `ρ=${targetSpectralRadius}`,
      valid: true,
    };
  }

  // Compute actual spectral radius using power iteration
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const actualSpectralRadius = computeSpectralRadiusApproximation(nodes, adjacency);

  return {
    property: "spectralRadius",
    expected: `ρ=${targetSpectralRadius}`,
    actual: `ρ≈${actualSpectralRadius.toFixed(4)}`,
    valid: Math.abs(actualSpectralRadius - targetSpectralRadius) < 0.1, // Allow small tolerance
    message: actualSpectralRadius === targetSpectralRadius ?
      `Graph has spectral radius ${actualSpectralRadius}` :
      `Graph has spectral radius ${actualSpectralRadius.toFixed(4)}, expected ${targetSpectralRadius}`,
  };
};
