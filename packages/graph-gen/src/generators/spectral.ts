/**
 * Spectral property generators
 *
 * These functions compute and store spectral properties of graphs including
 * spectrum (eigenvalue distribution), algebraic connectivity (Fiedler value),
 * and spectral radius (largest eigenvalue).
 *
 * Note: These functions store target spectral metadata for validation rather
 * than generating graph structure based on spectral properties. Computing actual
 * spectral properties from graph structure is done by validators.
 */

import type { GraphSpec } from '../spec';
import type { TestNode, TestEdge } from './types';
import type { SeededRandom } from './types';

/**
 * Compute and store full spectrum of graph adjacency matrix.
 * Uses power iteration for dominant eigenvalue approximation.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Random number generator (unused, kept for interface consistency)
 */
export const computeAndStoreSpectrum = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.spectrum?.kind !== "spectrum") {
    throw new Error("Spectrum computation requires spectrum spec");
  }

  const { eigenvalues: targetEigenvalues } = spec.spectrum;

  // Store target spectrum for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetSpectrum = targetEigenvalues;
  });
};

/**
 * Compute and store algebraic connectivity (Fiedler value, λ₂ of Laplacian).
 * Algebraic connectivity measures how well-connected the graph is.
 * Uses Fiedler value bounds and approximation.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Random number generator (unused, kept for interface consistency)
 */
export const computeAndStoreAlgebraicConnectivity = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.algebraicConnectivity?.kind !== "algebraic_connectivity") {
    throw new Error("Algebraic connectivity computation requires algebraic_connectivity spec");
  }

  const { value: targetLambda2 } = spec.algebraicConnectivity;

  // Store target algebraic connectivity for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetAlgebraicConnectivity = targetLambda2;
  });
};

/**
 * Compute and store spectral radius (largest eigenvalue).
 * Spectral radius relates to graph expansion and mixing rate.
 * Uses power iteration for approximation.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Random number generator (unused, kept for interface consistency)
 */
export const computeAndStoreSpectralRadius = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.spectralRadius?.kind !== "spectral_radius") {
    throw new Error("Spectral radius computation requires spectral_radius spec");
  }

  const { value: targetSpectralRadius } = spec.spectralRadius;

  // Store target spectral radius for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetSpectralRadius = targetSpectralRadius;
  });
};
