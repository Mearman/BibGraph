import {
  generateBipartiteConnectedEdges,
  generateBipartiteDisconnectedEdges,
  generateBipartiteForestEdges,
  generateBipartiteTreeEdges,
  generateCompleteBipartiteEdges} from './generators/bipartite';
import {
  generateConnectedCyclicEdges,
  generateDisconnectedEdges,
  generateEulerianEdges,
  generateFlowNetworkEdges,
  generateForestEdges,
  generateKColorableEdges,
  generateKEdgeConnectedEdges,
  generateKVertexConnectedEdges,
  generateTreewidthBoundedEdges} from './generators/connectivity';
import {
  generateBinaryTreeEdges,
  generateGridEdges,
  generateRegularEdges,
  generateStarEdges,
  generateToroidalEdges,
  generateTournamentEdges,
  generateTreeEdges,
  generateWheelEdges} from './generators/core-structures';
import {
  generatePlanarEdges,
  generateUnitDiskEdges} from './generators/geometric';
import {
  generateDominationNumberEdges,
  generateHereditaryClassEdges,
  generateIndependenceNumberEdges,
  generateVertexCoverEdges} from './generators/invariants';
import {
  generateModularEdges,
  generateScaleFreeEdges,
  generateSmallWorldEdges} from './generators/network-structures';
import {
  generateCircumferenceEdges,
  generateDiameterEdges,
  generateGirthEdges,
  generateHamiltonianEdges,
  generateRadiusEdges,
  generateTraceableEdges} from './generators/path-cycle';
import {
  computeAndStoreAlgebraicConnectivity,
  computeAndStoreSpectralRadius,
  computeAndStoreSpectrum} from './generators/spectral';
import {
  generateChordalEdges,
  generateClawFreeEdges,
  generateCographEdges,
  generateComparabilityEdges,
  generateIntervalEdges,
  generatePerfectEdges,
  generatePermutationEdges,
  generateSplitEdges} from './generators/structural-classes';
import {
  generateArcTransitiveEdges,
  generateEdgeTransitiveEdges,
  generateLineGraphEdges,
  generateSelfComplementaryEdges,
  generateStronglyRegularEdges,
  generateThresholdEdges,
  generateVertexTransitiveEdges} from './generators/symmetry';
import { SeededRandom, type TestEdge,type TestNode } from './generators/types';
import type { GraphSpec } from './spec';
import { generateNodes } from './generators/node-generator';
import { generateBaseStructure, addDensityEdges } from './generators/edge-generator';
import { addWeights } from './generators/validation-helpers';

/**
 * Node in a generated test graph.
 */

/**
 * Complete graph structure for testing.
 */
export interface TestGraph {
  nodes: TestNode[];
  edges: TestEdge[];
  spec: GraphSpec;
}

/**
 * Configuration for graph generation.
 */
export interface GraphGenerationConfig {
  /** Number of nodes to generate */
  nodeCount: number;

  /** Node type distribution (for heterogeneous graphs) */
  nodeTypes?: { type: string; proportion: number }[];

  /** Edge type distribution (for heterogeneous graphs) */
  edgeTypes?: { type: string; proportion: number }[];

  /** Weight range for weighted graphs */
  weightRange?: { min: number; max: number };

  /** Random seed for reproducibility */
  seed?: number;
}


/**
 * Generate a test graph matching specified properties.
 * @param spec
 * @param config
 */
export const generateGraph = (spec: GraphSpec, config: GraphGenerationConfig): TestGraph => {
  const rng = new SeededRandom(config.seed);
  const nodes = generateNodes(spec, config, rng);

  // Generate base structure
  const edges = generateBaseStructure(nodes, spec, config, rng);

  // Add additional edges for density
  addDensityEdges(nodes, edges, spec, config, rng);

  // Add weights if needed
  if (spec.weighting.kind === "weighted_numeric") {
    addWeights(edges, config, rng);
  }

  return { nodes, edges, spec };
};

/**
 * Detect cycles in a graph using DFS (simplified version for internal use).
 * @param nodes
 * @param edges
 * @param directed
 */
const detectCycleInGraph = (nodes: TestNode[], edges: TestEdge[], directed: boolean): boolean => {
  if (nodes.length < 2) return false;

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const sourceList = adjacency.get(edge.source);
    if (sourceList) {
      sourceList.push(edge.target);
    }
    if (!directed) {
      const targetList = adjacency.get(edge.target);
      if (targetList) {
        targetList.push(edge.source);
      }
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (!visited.has(node.id) && dfs(node.id)) return true;
  }

  return false;
};

/**
 * Find connected components in the graph using BFS.
 * Returns array of components, where each component is an array of node IDs.
 * @param nodes
 * @param edges
 * @param directed
 */
const findComponents = (nodes: TestNode[], edges: TestEdge[], directed: boolean): string[][] => {
  const components: string[][] = [];
  const visited = new Set<string>();

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const sourceList = adjacency.get(edge.source);
    if (sourceList) {
      sourceList.push(edge.target);
    }
    if (!directed) {
      const targetList = adjacency.get(edge.target);
      if (targetList) {
        targetList.push(edge.source);
      }
    }
  }

  // BFS to find each component
  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component: string[] = [];
    const queue: string[] = [node.id];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      if (visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      const neighbors = adjacency.get(current) ?? [];
      queue.push(...neighbors.filter((n) => !visited.has(n)));
    }

    components.push(component);
  }

  return components;
};

// PHASE 1: SIMPLE STRUCTURAL VARIANTS
// ============================================================================

/**
 * Generate split graph edges.
 * Split graph = vertices partition into clique K + independent set I.
 * Algorithm: Partition nodes ~1/3 clique + ~2/3 independent, add all clique edges,
 * add random cross edges with ~50% density.
 *
 * @param nodes - Graph nodes
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */

// ============================================================================
// PHASE 3: NETWORK SCIENCE GENERATORS
// ============================================================================

/**
 * Generate scale-free graph edges (Barabási-Albert preferential attachment).
 * Scale-free graphs have power-law degree distribution.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */

/**
 * Generate line graph edges.
 * Line graph L(G) has vertices representing edges of G, with adjacency when edges share a vertex.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */

/**
 * Generate unit disk graph edges.
 * Unit disk graphs are created by placing points in a plane and connecting
 * points within a specified distance (unit radius).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */

/**
 * Compute and store full spectrum of graph adjacency matrix.
 * Uses power iteration for dominant eigenvalue approximation.
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param spec - Graph specification
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreToughness = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreIntegrity = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreCage = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreMooreGraph = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreRamanujan = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreCartesianProduct = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreTensorProduct = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreStrongProduct = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreLexicographicProduct = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreMinorFree = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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
 * @param rng - Random number generator
 * @param _rng
 */
const computeAndStoreTopologicalMinorFree = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
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

/**
 * Add edge to edge list.
 * NOTE: For undirected graphs, only store one direction - the validator's
 * buildAdjacencyList will create bidirectional adjacency.
 * @param edges
 * @param source
 * @param target
 * @param spec
 * @param rng
 */
const addEdge = (edges: TestEdge[], source: string, target: string, spec: GraphSpec, rng: SeededRandom): void => {
  const edge: TestEdge = { source, target };

  if (spec.schema.kind === 'heterogeneous') {
    // Assign random edge type (could be based on config.edgeTypes)
    edge.type = rng.choice(['type_a', 'type_b', 'type_c']);
  }

  edges.push(edge);
};

/**
 * Shuffle array in-place using Fisher-Yates algorithm with seeded RNG.
 * @param array - Array to shuffle
 * @param rng - Seeded random number generator
 */
const shuffleArray = <T>(array: T[], rng: SeededRandom): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = rng.integer(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
};

/**
 * Check if edge exists between source and target.
 * @param edges - Edge list
 * @param source - Source node ID
 * @param target - Target node ID
 * @returns True if edge exists
 */
const hasEdge = (edges: TestEdge[], source: string, target: string): boolean => {
  return edges.some(e =>
    (e.source === source && e.target === target) ||
    (e.source === target && e.target === source)
  );
}
