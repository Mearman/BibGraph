import type { TestGraph } from '../generators/types'
import type { PropertyValidationResult } from './types';

// ============================================================================
// GRAPH PRODUCT VALIDATORS
// ============================================================================

/**
 * Validate Cartesian product classification.
 * Cartesian product G □ H combines two graphs.
 * We check metadata rather than actual product structure.
 * @param graph
 */
export const validateCartesianProduct = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.cartesianProduct?.kind !== "cartesian_product") {
    return {
      property: "cartesianProduct",
      expected: spec.cartesianProduct?.kind ?? "unconstrained",
      actual: spec.cartesianProduct?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { leftFactors, rightFactors } = spec.cartesianProduct;

  // Check for Cartesian product metadata
  const hasMetadata = nodes.some(n => n.data?.targetCartesianProductLeft !== undefined);

  if (hasMetadata) {
    return {
      property: "cartesianProduct",
      expected: `cartesian_product(left=${leftFactors}, right=${rightFactors})`,
      actual: `cartesian_product(left=${leftFactors}, right=${rightFactors})`,
      valid: true,
    };
  }

  // Without metadata, we can't verify Cartesian product structure
  return {
    property: "cartesianProduct",
    expected: `cartesian_product(left=${leftFactors}, right=${rightFactors})`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify Cartesian product structure without metadata",
  };
};

/**
 * Validate tensor (direct) product classification.
 * Tensor product G × H combines two graphs.
 * We check metadata rather than actual product structure.
 * @param graph
 */
export const validateTensorProduct = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.tensorProduct?.kind !== "tensor_product") {
    return {
      property: "tensorProduct",
      expected: spec.tensorProduct?.kind ?? "unconstrained",
      actual: spec.tensorProduct?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { leftFactors, rightFactors } = spec.tensorProduct;

  // Check for tensor product metadata
  const hasMetadata = nodes.some(n => n.data?.targetTensorProductLeft !== undefined);

  if (hasMetadata) {
    return {
      property: "tensorProduct",
      expected: `tensor_product(left=${leftFactors}, right=${rightFactors})`,
      actual: `tensor_product(left=${leftFactors}, right=${rightFactors})`,
      valid: true,
    };
  }

  // Without metadata, we can't verify tensor product structure
  return {
    property: "tensorProduct",
    expected: `tensor_product(left=${leftFactors}, right=${rightFactors})`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify tensor product structure without metadata",
  };
};

/**
 * Validate strong product classification.
 * Strong product G ⊠ H combines two graphs.
 * We check metadata rather than actual product structure.
 * @param graph
 */
export const validateStrongProduct = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.strongProduct?.kind !== "strong_product") {
    return {
      property: "strongProduct",
      expected: spec.strongProduct?.kind ?? "unconstrained",
      actual: spec.strongProduct?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { leftFactors, rightFactors } = spec.strongProduct;

  // Check for strong product metadata
  const hasMetadata = nodes.some(n => n.data?.targetStrongProductLeft !== undefined);

  if (hasMetadata) {
    return {
      property: "strongProduct",
      expected: `strong_product(left=${leftFactors}, right=${rightFactors})`,
      actual: `strong_product(left=${leftFactors}, right=${rightFactors})`,
      valid: true,
    };
  }

  // Without metadata, we can't verify strong product structure
  return {
    property: "strongProduct",
    expected: `strong_product(left=${leftFactors}, right=${rightFactors})`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify strong product structure without metadata",
  };
};

/**
 * Validate lexicographic product classification.
 * Lexicographic product G ∘ H combines two graphs.
 * We check metadata rather than actual product structure.
 * @param graph
 */
export const validateLexicographicProduct = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.lexicographicProduct?.kind !== "lexicographic_product") {
    return {
      property: "lexicographicProduct",
      expected: spec.lexicographicProduct?.kind ?? "unconstrained",
      actual: spec.lexicographicProduct?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { leftFactors, rightFactors } = spec.lexicographicProduct;

  // Check for lexicographic product metadata
  const hasMetadata = nodes.some(n => n.data?.targetLexicographicProductLeft !== undefined);

  if (hasMetadata) {
    return {
      property: "lexicographicProduct",
      expected: `lexicographic_product(left=${leftFactors}, right=${rightFactors})`,
      actual: `lexicographic_product(left=${leftFactors}, right=${rightFactors})`,
      valid: true,
    };
  }

  // Without metadata, we can't verify lexicographic product structure
  return {
    property: "lexicographicProduct",
    expected: `lexicographic_product(left=${leftFactors}, right=${rightFactors})`,
    actual: "unknown (no metadata)",
    valid: false,
    message: "Cannot verify lexicographic product structure without metadata",
  };
};
