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
  validateTournament
} from './structural';

export {
  validateSplit,
  validateCograph,
  validateClawFree,
  validateChordal,
  validateInterval,
  validatePermutation,
  validateComparability,
  validatePerfect
} from './structural-class';

export {
  validateScaleFree,
  validateSmallWorld,
  validateModular
} from './network';

export {
  validateUnitDisk,
  validatePlanar
} from './geometric';

export {
  validateHamiltonian,
  validateTraceable,
  validateDiameter,
  validateRadius,
  validateGirth,
  validateCircumference
} from './path-cycle';

export {
  validateLine,
  validateSelfComplementary,
  validateThreshold,
  validateStronglyRegular,
  validateVertexTransitive,
  validateEdgeTransitive,
  validateArcTransitive
} from './symmetry';

export {
  validateHereditaryClass,
  validateIndependenceNumber,
  validateVertexCover,
  validateDominationNumber
} from './invariant';

export {
  validateSpectrum,
  validateAlgebraicConnectivity,
  validateSpectralRadius
} from './spectral';

export {
  validateToughness,
  validateIntegrity
} from './robustness';

export {
  validateCage,
  validateMooreGraph,
  validateRamanujan
} from './extremal';

export {
  validateCartesianProduct,
  validateTensorProduct,
  validateStrongProduct,
  validateLexicographicProduct
} from './product';

export {
  validateMinorFree,
  validateTopologicalMinorFree
} from './minor';

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
