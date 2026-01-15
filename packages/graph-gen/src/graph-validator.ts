import { analyzeGraphSpecConstraints, getAdjustedValidationExpectations } from './constraints';
import type { TestGraph } from './generator';
import {
  type GraphValidationResult,
  type PropertyValidationResult,
  validateAlgebraicConnectivity,
  validateArcTransitive,
  validateBipartite,
  validateChordal,
  validateCircumference,
  validateClawFree,
  validateCograph,
  validateComparability,
  validateConnectivity,
  validateCycles,
  validateDensityAndCompleteness,
  validateDiameter,
  validateDirectionality,
  validateDominationNumber,
  validateEdgeMultiplicity,
  validateEdgeTransitive,
  validateEulerian,
  validateFlowNetwork,
  validateGirth,
  validateHamiltonian,
  validateHereditaryClass,
  validateIndependenceNumber,
  validateInterval,
  validateKColorable,
  validateKEdgeConnected,
  validateKVertexConnected,
  validateLine,
  validateModular,
  validatePerfect,
  validatePermutation,
  validatePlanar,
  validateRadius,
  validateRegularGraph,
  validateScaleFree,
  validateSchema,
  validateSelfComplementary,
  validateSelfLoops,
  validateSmallWorld,
  validateSplit,
  validateSpectralRadius,
  validateSpectrum,
  validateStronglyRegular,
  validateThreshold,
  validateToughness,
  validateTraceable,
  validateTreewidth,
  validateTournament,
  validateUnitDisk,
  validateVertexCover,
  validateVertexTransitive,
  validateIntegrity,
  validateCage,
  validateMooreGraph,
  validateRamanujan,
  validateCartesianProduct,
  validateTensorProduct,
  validateStrongProduct,
  validateLexicographicProduct,
  validateWeighting} from './validation';

/**
 * Validate that a generated graph actually has its claimed properties.
 * @param graph
 */
export const validateGraphProperties = (graph: TestGraph): GraphValidationResult => {
  const results: PropertyValidationResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for impossible or problematic combinations
  const impossibilities = analyzeGraphSpecConstraints(graph.spec);
  const adjustments = getAdjustedValidationExpectations(graph.spec);

  for (const imp of impossibilities) {
    // Only track warnings, not errors - impossible combinations are filtered out before testing
    if (imp.severity === "warning") {
      warnings.push(`Problematic combination: ${imp.property} - ${imp.reason}`);
    }
  }

  // Validate each core property
  results.push(validateDirectionality(graph));
  results.push(validateWeighting(graph));
  results.push(validateCycles(graph, adjustments));
  results.push(validateConnectivity(graph));
  results.push(validateSchema(graph));
  results.push(validateEdgeMultiplicity(graph));
  results.push(validateSelfLoops(graph));
  results.push(validateDensityAndCompleteness(graph, adjustments));
  results.push(validateBipartite(graph));
  results.push(validateTournament(graph));
  results.push(validateSplit(graph));
  results.push(validateCograph(graph));
  results.push(validateClawFree(graph));
  results.push(validateChordal(graph));
  results.push(validateInterval(graph));
  results.push(validatePermutation(graph));
  results.push(validateComparability(graph));
  results.push(validatePerfect(graph));
  results.push(validateScaleFree(graph));
  results.push(validateSmallWorld(graph));
  results.push(validateModular(graph));
  results.push(validateLine(graph));
  results.push(validateSelfComplementary(graph));
  results.push(validateThreshold(graph));
  results.push(validateUnitDisk(graph));
  results.push(validatePlanar(graph));
  results.push(validateHamiltonian(graph));
  results.push(validateTraceable(graph));
  results.push(validateStronglyRegular(graph));
  results.push(validateVertexTransitive(graph));
  results.push(validateEdgeTransitive(graph));
  results.push(validateArcTransitive(graph));
  results.push(validateDiameter(graph));
  results.push(validateRadius(graph));
  results.push(validateGirth(graph));
  results.push(validateCircumference(graph));
  results.push(validateHereditaryClass(graph));
  results.push(validateIndependenceNumber(graph));
  results.push(validateVertexCover(graph));
  results.push(validateDominationNumber(graph));
  results.push(validateSpectrum(graph));
  results.push(validateAlgebraicConnectivity(graph));
  results.push(validateSpectralRadius(graph));
  results.push(validateToughness(graph));
  results.push(validateIntegrity(graph));
  results.push(validateCage(graph));
  results.push(validateMooreGraph(graph));
  results.push(validateRamanujan(graph));
  results.push(validateCartesianProduct(graph));
  results.push(validateTensorProduct(graph));
  results.push(validateStrongProduct(graph));
  results.push(validateLexicographicProduct(graph));
  results.push(validateRegularGraph(graph));
  results.push(validateEulerian(graph));
  results.push(validateKVertexConnected(graph));
  results.push(validateKEdgeConnected(graph));
  results.push(validateTreewidth(graph));
  results.push(validateKColorable(graph));
  results.push(validateFlowNetwork(graph));

  // Collect errors
  for (const result of results) {
    if (!result.valid) {
      errors.push(result.message ?? `Property ${result.property} validation failed`);
    }
  }

  return {
    properties: results,
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

// Re-export types for backward compatibility

