import type { GraphSpec } from '../spec';
import { SeededRandom, type TestEdge, type TestNode } from './types';

// Re-export spectral property computers
export {
  computeAndStoreAlgebraicConnectivity,
  computeAndStoreSpectralRadius,
  computeAndStoreSpectrum,
} from './spectral';

/**
 * Compute and store toughness graph property.
 * Toughness measures graph resilience to vertex removal.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreToughness = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.toughness?.kind !== "toughness") {
    throw new Error("Toughness computation requires toughness spec");
  }

  const { value: targetToughness } = spec.toughness;

  // Store target toughness for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetToughness = targetToughness;
  });
};

/**
 * Compute and store integrity (resilience measure).
 * Integrity minimizes (removed vertices + largest remaining component).
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreIntegrity = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.integrity?.kind !== "integrity") {
    throw new Error("Integrity computation requires integrity spec");
  }

  const { value: targetIntegrity } = spec.integrity;

  // Store target integrity for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetIntegrity = targetIntegrity;
  });
};

/**
 * Compute and store cage graph classification.
 * Cage graphs have minimal vertices for given (girth, degree).
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreCage = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.cage?.kind !== "cage") {
    throw new Error("Cage computation requires cage spec");
  }

  const { girth, degree } = spec.cage;

  // Store cage parameters for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetCageGirth = girth;
    node.data.targetCageDegree = degree;
  });
};

/**
 * Compute and store Moore graph classification.
 * Moore graphs achieve maximum vertices for given (diameter, degree).
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreMooreGraph = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.moore?.kind !== "moore") {
    throw new Error("Moore graph computation requires moore spec");
  }

  const { diameter, degree } = spec.moore;

  // Store Moore graph parameters for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetMooreDiameter = diameter;
    node.data.targetMooreDegree = degree;
  });
};

/**
 * Compute and store Ramanujan graph classification.
 * Ramanujan graphs are optimal expanders with spectral gap property.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreRamanujan = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.ramanujan?.kind !== "ramanujan") {
    throw new Error("Ramanujan graph computation requires ramanujan spec");
  }

  const { degree } = spec.ramanujan;

  // Store Ramanujan graph degree for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetRamanujanDegree = degree;
  });
};

/**
 * Compute and store Cartesian product classification.
 * Cartesian product G □ H combines two graphs.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreCartesianProduct = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.cartesianProduct?.kind !== "cartesian_product") {
    throw new Error("Cartesian product computation requires cartesian_product spec");
  }

  const { leftFactors, rightFactors } = spec.cartesianProduct;

  // Store Cartesian product parameters for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetCartesianProductLeft = leftFactors;
    node.data.targetCartesianProductRight = rightFactors;
  });
};

/**
 * Compute and store tensor (direct) product classification.
 * Tensor product G × H combines two graphs.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreTensorProduct = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.tensorProduct?.kind !== "tensor_product") {
    throw new Error("Tensor product computation requires tensor_product spec");
  }

  const { leftFactors, rightFactors } = spec.tensorProduct;

  // Store tensor product parameters for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetTensorProductLeft = leftFactors;
    node.data.targetTensorProductRight = rightFactors;
  });
};

/**
 * Compute and store strong product classification.
 * Strong product G ⊠ H combines two graphs.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreStrongProduct = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.strongProduct?.kind !== "strong_product") {
    throw new Error("Strong product computation requires strong_product spec");
  }

  const { leftFactors, rightFactors } = spec.strongProduct;

  // Store strong product parameters for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetStrongProductLeft = leftFactors;
    node.data.targetStrongProductRight = rightFactors;
  });
};

/**
 * Compute and store lexicographic product classification.
 * Lexicographic product G ∘ H combines two graphs.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreLexicographicProduct = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.lexicographicProduct?.kind !== "lexicographic_product") {
    throw new Error("Lexicographic product computation requires lexicographic_product spec");
  }

  const { leftFactors, rightFactors } = spec.lexicographicProduct;

  // Store lexicographic product parameters for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetLexicographicProductLeft = leftFactors;
    node.data.targetLexicographicProductRight = rightFactors;
  });
};

/**
 * Compute and store minor-free graph classification.
 * Minor-free graphs exclude specific graph minors (Kuratowski-Wagner theorem).
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreMinorFree = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.minorFree?.kind !== "minor_free") {
    throw new Error("Minor-free computation requires minor_free spec");
  }

  const { forbiddenMinors } = spec.minorFree;

  // Store minor-free parameters for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetForbiddenMinors = forbiddenMinors;
  });
};

/**
 * Compute and store topological minor-free classification.
 * Topological minor-free graphs exclude specific subdivisions.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused)
 */
export const computeAndStoreTopologicalMinorFree = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void => {
  if (spec.topologicalMinorFree?.kind !== "topological_minor_free") {
    throw new Error("Topological minor-free computation requires topological_minor_free spec");
  }

  const { forbiddenMinors } = spec.topologicalMinorFree;

  // Store topological minor-free parameters for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetTopologicalForbiddenMinors = forbiddenMinors;
  });
};
