import type { GraphSpec } from '../spec';
import type { GraphGenerationConfig, TestEdge, TestNode } from './types';
import { SeededRandom } from './types';
import {
  generateForestEdges,
  generateConnectedCyclicEdges,
  generateDisconnectedEdges,
} from './connectivity';
import { generateTreeEdges } from './core-structures';

/**
 * Generate standard edges based on connectivity and cycle properties.
 * This is a common pattern used by many graph property handlers.
 */
const generateStandardEdges = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void => {
  if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
    generateTreeEdges(nodes, edges, spec, rng);
  } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
    generateConnectedCyclicEdges(nodes, edges, spec, rng);
  } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
    generateForestEdges(nodes, edges, spec, rng);
  } else {
    generateDisconnectedEdges(nodes, edges, spec, rng);
  }
};

/**
 * Create a property handler that generates standard edges then computes and stores metadata.
 * This factory reduces code duplication for spectral, robustness, extremal, and product properties.
 */
const createPropertyHandler = (
  computeFn: (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom) => void
) => {
  return (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): TestEdge[] => {
    generateStandardEdges(nodes, edges, spec, rng);
    computeFn(nodes, edges, spec, rng);
    return edges;
  };
};

// Import compute functions from property-computers
import {
  computeAndStoreAlgebraicConnectivity,
  computeAndStoreCartesianProduct,
  computeAndStoreIntegrity,
  computeAndStoreCage,
  computeAndStoreLexicographicProduct,
  computeAndStoreMinorFree,
  computeAndStoreMooreGraph,
  computeAndStoreRamanujan,
  computeAndStoreSpectralRadius,
  computeAndStoreSpectrum,
  computeAndStoreStrongProduct,
  computeAndStoreTensorProduct,
  computeAndStoreToughness,
  computeAndStoreTopologicalMinorFree,
} from './property-computers';

// ============================================================================
// SPECTRAL PROPERTY HANDLERS
// ============================================================================

export const handleSpectrum = createPropertyHandler(computeAndStoreSpectrum);
export const handleAlgebraicConnectivity = createPropertyHandler(computeAndStoreAlgebraicConnectivity);
export const handleSpectralRadius = createPropertyHandler(computeAndStoreSpectralRadius);

// ============================================================================
// ROBUSTNESS MEASURE HANDLERS
// ============================================================================

export const handleToughness = createPropertyHandler(computeAndStoreToughness);
export const handleIntegrity = createPropertyHandler(computeAndStoreIntegrity);

// ============================================================================
// EXTREMAL GRAPH HANDLERS
// ============================================================================

export const handleCage = createPropertyHandler(computeAndStoreCage);
export const handleMoore = createPropertyHandler(computeAndStoreMooreGraph);
export const handleRamanujan = createPropertyHandler(computeAndStoreRamanujan);

// ============================================================================
// GRAPH PRODUCT HANDLERS
// ============================================================================

export const handleCartesianProduct = createPropertyHandler(computeAndStoreCartesianProduct);
export const handleTensorProduct = createPropertyHandler(computeAndStoreTensorProduct);
export const handleStrongProduct = createPropertyHandler(computeAndStoreStrongProduct);
export const handleLexicographicProduct = createPropertyHandler(computeAndStoreLexicographicProduct);

// ============================================================================
// MINOR-FREE GRAPH HANDLERS
// ============================================================================

export const handleMinorFree = createPropertyHandler(computeAndStoreMinorFree);
export const handleTopologicalMinorFree = createPropertyHandler(computeAndStoreTopologicalMinorFree);
