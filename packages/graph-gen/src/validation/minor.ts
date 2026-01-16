import type { TestGraph } from '../generators/types'
import type { PropertyValidationResult } from './types';

// ============================================================================
// MINOR-FREE GRAPH VALIDATORS
// ============================================================================

/**
 * Validate minor-free graph classification.
 * Minor-free graphs exclude specific graph minors (Kuratowski-Wagner theorem).
 * We check metadata rather than actual minor-free structure.
 * @param graph
 */
export const validateMinorFree = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.minorFree?.kind !== "minor_free") {
    return {
      property: "minorFree",
      expected: spec.minorFree?.kind ?? "unconstrained",
      actual: spec.minorFree?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { forbiddenMinors } = spec.minorFree;

  // Check for minor-free metadata
  const hasMetadata = nodes.some(n => n.data?.targetForbiddenMinors !== undefined);

  if (hasMetadata) {
    return {
      property: "minorFree",
      expected: `minor_free(forbidden=[${forbiddenMinors.join(", ")}])`,
      actual: `minor_free(forbidden=[${forbiddenMinors.join(", ")}])`,
      valid: true,
    };
  }

  // Without metadata, we can't verify minor-free structure
  return {
    property: "minorFree",
    expected: `minor_free(forbidden=[${forbiddenMinors.join(", ")}])`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify minor-free structure without metadata",
  };
};

/**
 * Validate topological minor-free graph classification.
 * Topological minor-free graphs exclude specific subdivisions.
 * We check metadata rather than actual structure.
 * @param graph
 */
export const validateTopologicalMinorFree = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.topologicalMinorFree?.kind !== "topological_minor_free") {
    return {
      property: "topologicalMinorFree",
      expected: spec.topologicalMinorFree?.kind ?? "unconstrained",
      actual: spec.topologicalMinorFree?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { forbiddenMinors } = spec.topologicalMinorFree;

  // Check for topological minor-free metadata
  const hasMetadata = nodes.some(n => n.data?.targetTopologicalForbiddenMinors !== undefined);

  if (hasMetadata) {
    return {
      property: "topologicalMinorFree",
      expected: `topological_minor_free(forbidden=[${forbiddenMinors.join(", ")}])`,
      actual: `topological_minor_free(forbidden=[${forbiddenMinors.join(", ")}])`,
      valid: true,
    };
  }

  // Without metadata, we can't verify topological minor-free structure
  return {
    property: "topologicalMinorFree",
    expected: `topological_minor_free(forbidden=[${forbiddenMinors.join(", ")}])`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify topological minor-free structure without metadata",
  };
};
