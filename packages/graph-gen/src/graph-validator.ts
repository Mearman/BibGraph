import { analyzeGraphSpecConstraints, getAdjustedValidationExpectations } from './constraints';
import type { TestGraph } from './generator';
import type { GraphSpec } from './spec';
import {
  type GraphValidationResult,
  type PropertyValidationResult,
  validateBipartite,
  validateConnectivity,
  validateCycles,
  validateDensityAndCompleteness,
  validateDirectionality,
  validateEdgeMultiplicity,
  validateEulerian,
  validateFlowNetwork,
  validateKColorable,
  validateKEdgeConnected,
  validateKVertexConnected,
  validateRegularGraph,
  validateSchema,
  validateSelfLoops,
  validateTournament,
  validateTreewidth,
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

