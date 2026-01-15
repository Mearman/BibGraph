/**
 * Graph validation module
 *
 * Provides validators for various graph properties.
 * All validators return PropertyValidationResult objects.
 */

// Export types
export type { PropertyValidationResult, GraphValidationResult } from './types';

// Note: Helper functions (buildAdjacencyList, findComponentsForDensity, checkBipartiteWithBFS)
// are not re-exported - import directly from './helper-functions' if needed

// Export basic validators
export {
  validateDirectionality,
  validateWeighting,
  validateCycles,
  validateConnectivity,
  validateSchema,
  validateEdgeMultiplicity,
  validateSelfLoops,
  detectCycle
} from './basic-validators';

// Export structural validators
export {
  validateDensityAndCompleteness,
  validateBipartite,
  validateTournament,
  validateSplit,
  validateCograph,
  validateClawFree,
  validateChordal,
  validateInterval,
  validatePermutation,
  validateComparability,
  validatePerfect,
  validateScaleFree,
  validateSmallWorld,
  validateModular,
  validateLine,
  validateSelfComplementary,
  validateThreshold,
  validateUnitDisk,
  validatePlanar,
  validateHamiltonian,
  validateTraceable,
  validateStronglyRegular,
  validateVertexTransitive,
  validateEdgeTransitive,
  validateArcTransitive,
  validateDiameter,
  validateRadius,
  validateGirth,
  validateCircumference,
  validateHereditaryClass,
  validateIndependenceNumber,
  validateVertexCover,
  validateDominationNumber,
  validateSpectrum,
  validateAlgebraicConnectivity,
  validateSpectralRadius
} from './structural-validators';

// Export degree validators
export {
  validateRegularGraph,
  validateEulerian
} from './degree-validators';

// Export connectivity validators
export {
  validateKVertexConnected,
  validateKEdgeConnected
} from './connectivity-validators';

// Export treewidth validator
export {
  validateTreewidth,
  findMaxCliqueSize
} from './treewidth-validator';

// Export coloring validator
export {
  validateKColorable,
  greedyColoring
} from './coloring-validator';

// Export flow validator
export { validateFlowNetwork } from './flow-validator';
