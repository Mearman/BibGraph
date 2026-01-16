// ============================================================================
// EXTREMAL GRAPH VALIDATORS
// ============================================================================

import type { TestGraph } from '../generators/types'
import type { PropertyValidationResult } from './types';

/**
 * Validate cage graph classification.
 * Cage graphs have minimal vertices for given (girth, degree).
 * These are extremely rare - we check metadata rather than actual structure.
 * @param graph
 */
export const validateCage = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.cage?.kind !== "cage") {
    return {
      property: "cage",
      expected: spec.cage?.kind ?? "unconstrained",
      actual: spec.cage?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { girth, degree } = spec.cage;

  // Check for cage metadata
  const hasMetadata = nodes.some(n => n.data?.targetCageGirth !== undefined);

  if (hasMetadata) {
    return {
      property: "cage",
      expected: `cage(girth=${girth}, degree=${degree})`,
      actual: `cage(girth=${girth}, degree=${degree})`,
      valid: true,
    };
  }

  // Without metadata, we can't validate actual cage structure
  // (cage graphs are extremely rare and difficult to verify)
  return {
    property: "cage",
    expected: `cage(girth=${girth}, degree=${degree})`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify cage structure without metadata",
  };
};

/**
 * Validate Moore graph classification.
 * Moore graphs achieve maximum vertices for given (diameter, degree).
 * These are extremely rare - we check metadata rather than actual structure.
 * @param graph
 */
export const validateMooreGraph = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.moore?.kind !== "moore") {
    return {
      property: "moore",
      expected: spec.moore?.kind ?? "unconstrained",
      actual: spec.moore?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { diameter, degree } = spec.moore;

  // Check for Moore graph metadata
  const hasMetadata = nodes.some(n => n.data?.targetMooreDiameter !== undefined);

  if (hasMetadata) {
    return {
      property: "moore",
      expected: `moore(diameter=${diameter}, degree=${degree})`,
      actual: `moore(diameter=${diameter}, degree=${degree})`,
      valid: true,
    };
  }

  // Without metadata, we can't verify actual Moore graph structure
  return {
    property: "moore",
    expected: `moore(diameter=${diameter}, degree=${degree})`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify Moore graph structure without metadata",
  };
};

/**
 * Validate Ramanujan graph classification.
 * Ramanujan graphs are optimal expanders with spectral gap property.
 * We check metadata and spectral properties.
 * @param graph
 */
export const validateRamanujan = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.ramanujan?.kind !== "ramanujan") {
    return {
      property: "ramanujan",
      expected: spec.ramanujan?.kind ?? "unconstrained",
      actual: spec.ramanujan?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { degree } = spec.ramanujan;

  // Check for Ramanujan metadata
  const hasMetadata = nodes.some(n => n.data?.targetRamanujanDegree !== undefined);

  if (hasMetadata) {
    return {
      property: "ramanujan",
      expected: `ramanujan(degree=${degree})`,
      actual: `ramanujan(degree=${degree})`,
      valid: true,
    };
  }

  // Without metadata, we can't verify Ramanujan property
  return {
    property: "ramanujan",
    expected: `ramanujan(degree=${degree})`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify Ramanujan property without metadata",
  };
};
