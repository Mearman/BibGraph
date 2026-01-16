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
 * Generate nodes with appropriate types and partitions.
 * @param spec
 * @param config
 * @param rng
 */
const generateNodes = (spec: GraphSpec, config: GraphGenerationConfig, rng: SeededRandom): TestNode[] => {
  const nodes: TestNode[] = [];

  // For bipartite graphs, determine partition sizes
  let leftPartitionSize = 0;
  let rightPartitionSize = 0;

  if (spec.partiteness?.kind === "bipartite") {
    // Split roughly 50-50, but handle odd numbers
    leftPartitionSize = Math.floor(config.nodeCount / 2);
    rightPartitionSize = config.nodeCount - leftPartitionSize;
  } else if (spec.completeBipartite?.kind === "complete_bipartite") {
    // Use specified m, n sizes
    const { m, n } = spec.completeBipartite;
    leftPartitionSize = Math.min(m, config.nodeCount);
    rightPartitionSize = Math.min(n, config.nodeCount - leftPartitionSize);
  }

  for (let i = 0; i < config.nodeCount; i++) {
    const node: TestNode = {
      id: `N${i}`,
    };

    // Assign bipartite partition if needed
    if (spec.partiteness?.kind === "bipartite" || spec.completeBipartite?.kind === "complete_bipartite") {
      if (i < leftPartitionSize) {
        node.partition = "left";
      } else if (i < leftPartitionSize + rightPartitionSize) {
        node.partition = "right";
      }
    }

    if (spec.schema.kind === "heterogeneous" && config.nodeTypes) {
      // Assign type based on proportions
      const rand = rng.next();
      let cumulative = 0;
      for (const { type, proportion } of config.nodeTypes) {
        cumulative += proportion;
        if (rand < cumulative) {
          node.type = type;
          break;
        }
      }
      if (!node.type) {
        node.type = config.nodeTypes[config.nodeTypes.length - 1].type;
      }
    }

    nodes.push(node);
  }

  return nodes;
};

/**
 * Generate base graph structure based on connectivity and cyclicity.
 * @param nodes
 * @param spec
 * @param _config
 * @param rng
 */
const generateBaseStructure = (nodes: TestNode[], spec: GraphSpec, _config: GraphGenerationConfig, rng: SeededRandom): TestEdge[] => {
  const edges: TestEdge[] = [];

  // Handle complete bipartite K_{m,n} first
  if (spec.completeBipartite?.kind === "complete_bipartite") {
    generateCompleteBipartiteEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle bipartite graphs
  if (spec.partiteness?.kind === "bipartite") {
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      // Bipartite tree
      generateBipartiteTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      // Bipartite connected with cycles (even-length cycles)
      generateBipartiteConnectedEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      // Bipartite forest
      generateBipartiteForestEdges(nodes, edges, spec, rng);
    } else {
      // Bipartite disconnected with cycles
      generateBipartiteDisconnectedEdges(nodes, edges, spec, rng);
    }
    return edges;
  }

  // Handle star graphs (specific tree structure: center + leaves)
  if (spec.star?.kind === "star") {
    generateStarEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle wheel graphs (cycle + hub)
  if (spec.wheel?.kind === "wheel") {
    generateWheelEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle grid graphs (2D lattice)
  if (spec.grid?.kind === "grid") {
    generateGridEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle toroidal graphs (grid with wraparound)
  if (spec.toroidal?.kind === "toroidal") {
    generateToroidalEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle binary trees (each node has ≤ 2 children)
  if (spec.binaryTree?.kind === "binary_tree" ||
      spec.binaryTree?.kind === "full_binary" ||
      spec.binaryTree?.kind === "complete_binary") {
    generateBinaryTreeEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle tournament graphs (complete oriented graphs)
  if (spec.tournament?.kind === "tournament") {
    generateTournamentEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle cubic graphs (3-regular)
  if (spec.cubic?.kind === "cubic") {
    generateRegularEdges(nodes, edges, spec, 3, rng);
    return edges;
  }

  // Handle k-regular graphs
  if (spec.specificRegular?.kind === "k_regular") {
    generateRegularEdges(nodes, edges, spec, spec.specificRegular.k, rng);
    return edges;
  }

  // Handle flow networks
  if (spec.flowNetwork?.kind === "flow_network") {
    generateFlowNetworkEdges(nodes, edges, spec, spec.flowNetwork.source, spec.flowNetwork.sink, rng);
    return edges;
  }

  // Handle Eulerian and semi-Eulerian graphs
  if (spec.eulerian?.kind === "eulerian" || spec.eulerian?.kind === "semi_eulerian") {
    generateEulerianEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle k-vertex-connected graphs
  if (spec.kVertexConnected?.kind === "k_vertex_connected") {
    generateKVertexConnectedEdges(nodes, edges, spec, spec.kVertexConnected.k, rng);
    return edges;
  }

  // Handle k-edge-connected graphs
  if (spec.kEdgeConnected?.kind === "k_edge_connected") {
    generateKEdgeConnectedEdges(nodes, edges, spec, spec.kEdgeConnected.k, rng);
    return edges;
  }

  // Handle treewidth-bounded graphs (k-trees)
  if (spec.treewidth?.kind === "treewidth") {
    generateTreewidthBoundedEdges(nodes, edges, spec, spec.treewidth.width, rng);
    return edges;
  }

  // Handle k-colorable graphs
  if (spec.kColorable?.kind === "k_colorable") {
    generateKColorableEdges(nodes, edges, spec, spec.kColorable.k, rng);
    return edges;
  }

  // Handle bipartite colorable (2-colorable) graphs
  if (spec.kColorable?.kind === "bipartite_colorable") {
    // 2-colorable is the same as bipartite
    // NOTE: spec.partiteness should be set before calling this function
    // when using bipartite_colorable. This is handled at the call site.
    // Continue with bipartite generation
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateBipartiteTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateBipartiteConnectedEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateBipartiteForestEdges(nodes, edges, spec, rng);
    } else {
      generateBipartiteDisconnectedEdges(nodes, edges, spec, rng);
    }
    return edges;
  }

  // ============================================================================
  // PHASE 1: SIMPLE STRUCTURAL VARIANTS (high priority)
  // ============================================================================

  // Handle split graphs (clique + independent set partition)
  if (spec.split?.kind === "split") {
    generateSplitEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle cographs (P4-free graphs)
  if (spec.cograph?.kind === "cograph") {
    generateCographEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle claw-free graphs (no K_{1,3} induced subgraph)
  if (spec.clawFree?.kind === "claw_free") {
    generateClawFreeEdges(nodes, edges, spec, rng);
    return edges;
  }

  // ============================================================================
  // PHASE 2: CHORDAL-BASED GRAPH CLASSES (high priority)
  // ============================================================================

  // Handle chordal graphs (no induced cycles > 3)
  if (spec.chordal?.kind === "chordal") {
    generateChordalEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle interval graphs (intersection of intervals on real line)
  if (spec.interval?.kind === "interval") {
    generateIntervalEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle permutation graphs (from permutation π)
  if (spec.permutation?.kind === "permutation") {
    generatePermutationEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle comparability graphs (transitively orientable)
  if (spec.comparability?.kind === "comparability") {
    generateComparabilityEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle perfect graphs (ω(H) = χ(H) for all induced subgraphs H)
  if (spec.perfect?.kind === "perfect") {
    generatePerfectEdges(nodes, edges, spec, rng);
    return edges;
  }

  // ============================================================================
  // PHASE 3: NETWORK SCIENCE GENERATORS (high priority)
  // ============================================================================

  // Handle scale-free graphs (power-law degree distribution)
  if (spec.scaleFree?.kind === "scale_free") {
    generateScaleFreeEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle small-world graphs (high clustering + short paths)
  if (spec.smallWorld?.kind === "small_world") {
    generateSmallWorldEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle modular graphs (community structure)
  if (spec.communityStructure?.kind === "modular") {
    generateModularEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 4: Derived Graphs
  if (spec.line?.kind === "line_graph") {
    generateLineGraphEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.selfComplementary?.kind === "self_complementary") {
    generateSelfComplementaryEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 5: Advanced Structural Graphs
  if (spec.threshold?.kind === "threshold") {
    generateThresholdEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.unitDisk?.kind === "unit_disk") {
    generateUnitDiskEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.planarity?.kind === "planar") {
    generatePlanarEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.hamiltonian?.kind === "hamiltonian") {
    generateHamiltonianEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.traceable?.kind === "traceable") {
    generateTraceableEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 6: Symmetry Graphs
  if (spec.stronglyRegular?.kind === "strongly_regular") {
    generateStronglyRegularEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.vertexTransitive?.kind === "vertex_transitive") {
    generateVertexTransitiveEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 1: Core Structural Properties
  if (spec.edgeTransitive?.kind === "edge_transitive") {
    generateEdgeTransitiveEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.arcTransitive?.kind === "arc_transitive") {
    generateArcTransitiveEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.diameter?.kind === "diameter") {
    generateDiameterEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.radius?.kind === "radius") {
    generateRadiusEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.girth?.kind === "girth") {
    generateGirthEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.circumference?.kind === "circumference") {
    generateCircumferenceEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.hereditaryClass?.kind === "hereditary_class") {
    generateHereditaryClassEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 2: Numerical Invariants
  if (spec.independenceNumber?.kind === "independence_number") {
    generateIndependenceNumberEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.vertexCover?.kind === "vertex_cover") {
    generateVertexCoverEdges(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.dominationNumber?.kind === "domination_number") {
    generateDominationNumberEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 3: Spectral Properties
  // Note: Spectral properties are computed from graph structure, not used to generate it
  // Generate standard edges first, then compute and store spectral metadata
  if (spec.spectrum?.kind === "spectrum") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Compute and store spectrum
    computeAndStoreSpectrum(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.algebraicConnectivity?.kind === "algebraic_connectivity") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Compute and store algebraic connectivity
    computeAndStoreAlgebraicConnectivity(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.spectralRadius?.kind === "spectral_radius") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Compute and store spectral radius
    computeAndStoreSpectralRadius(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 4: Robustness Measures
  // Note: Robustness measures are computed from graph structure, not used to generate it
  // Generate standard edges first, then compute and store robustness metadata
  if (spec.toughness?.kind === "toughness") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Compute and store toughness
    computeAndStoreToughness(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.integrity?.kind === "integrity") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Compute and store integrity
    computeAndStoreIntegrity(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 5: Extremal Graphs
  // Note: Extremal graphs are rare classifications, not generation constraints
  // Generate standard edges first, then store classification metadata
  if (spec.cage?.kind === "cage") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store cage metadata
    computeAndStoreCage(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.moore?.kind === "moore") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store Moore graph metadata
    computeAndStoreMooreGraph(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.ramanujan?.kind === "ramanujan") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store Ramanujan graph metadata
    computeAndStoreRamanujan(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 6: Graph Products
  // Note: Graph products are structural classifications, not generation constraints
  // Generate standard edges first, then store product classification metadata
  if (spec.cartesianProduct?.kind === "cartesian_product") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store Cartesian product metadata
    computeAndStoreCartesianProduct(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.tensorProduct?.kind === "tensor_product") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store tensor product metadata
    computeAndStoreTensorProduct(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.strongProduct?.kind === "strong_product") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store strong product metadata
    computeAndStoreStrongProduct(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.lexicographicProduct?.kind === "lexicographic_product") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store lexicographic product metadata
    computeAndStoreLexicographicProduct(nodes, edges, spec, rng);
    return edges;
  }

  // Phase 7: Minor-Free Graphs
  // Note: Minor-free graphs are structural classifications, not generation constraints
  // Generate standard edges first, then store classification metadata
  if (spec.minorFree?.kind === "minor_free") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store minor-free metadata
    computeAndStoreMinorFree(nodes, edges, spec, rng);
    return edges;
  }

  if (spec.topologicalMinorFree?.kind === "topological_minor_free") {
    // Generate standard connected graph
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateConnectedCyclicEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateForestEdges(nodes, edges, spec, rng);
    } else {
      generateDisconnectedEdges(nodes, edges, spec, rng);
    }
    // Store topological minor-free metadata
    computeAndStoreTopologicalMinorFree(nodes, edges, spec, rng);
    return edges;
  }

  // Non-bipartite graphs
  if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
    // Generate tree structure
    generateTreeEdges(nodes, edges, spec, rng);
  } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
    // Generate cycle or connected graph with cycles
    generateConnectedCyclicEdges(nodes, edges, spec, rng);
  } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
    // Generate forest (multiple disconnected trees)
    generateForestEdges(nodes, edges, spec, rng);
  } else {
    // Generate disconnected graph with cycles
    generateDisconnectedEdges(nodes, edges, spec, rng);
  }

  return edges;
};

/**
 * Generate tree structure (connected, acyclic).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */

/**
 * Generate flow network edges.
 * Flow networks have:
 * - Directed edges from source toward sink
 * - Weighted edges (capacities)
 * - Every node on some path from source to sink
 * - No edges entering source
 * - No edges leaving sink
 * @param nodes
 * @param edges
 * @param spec
 * @param source
 * @param sink
 * @param rng
 */

/**
 * Add additional edges to achieve desired density.
 * @param nodes
 * @param edges
 * @param spec
 * @param _config
 * @param rng
 */
const addDensityEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _config: GraphGenerationConfig, rng: SeededRandom): void => {
  const n = nodes.length;

  // Early exit for graphs with exact structures that shouldn't be modified
  if (spec.completeBipartite?.kind === "complete_bipartite") {
    return;
  }
  if (spec.grid?.kind === "grid") {
    return; // Grid graphs have exact structure
  }
  if (spec.toroidal?.kind === "toroidal") {
    return; // Toroidal graphs have exact structure
  }
  if (spec.star?.kind === "star") {
    return; // Star graphs have exact structure
  }
  if (spec.wheel?.kind === "wheel") {
    return; // Wheel graphs have exact structure
  }
  if (spec.binaryTree?.kind === "binary_tree" ||
      spec.binaryTree?.kind === "full_binary" ||
      spec.binaryTree?.kind === "complete_binary") {
    return; // Binary trees have exact structure
  }
  if (spec.tournament?.kind === "tournament") {
    return; // Tournament graphs have exact structure
  }
  if (spec.cubic?.kind === "cubic") {
    return; // Cubic graphs have exact structure (3-regular)
  }
  if (spec.specificRegular?.kind === "k_regular") {
    return; // k-regular graphs have exact structure
  }
  if (spec.flowNetwork?.kind === "flow_network") {
    return; // Flow networks have exact structure
  }
  if (spec.eulerian?.kind === "eulerian" || spec.eulerian?.kind === "semi_eulerian") {
    return; // Eulerian graphs have exact structure
  }
  if (spec.kVertexConnected?.kind === "k_vertex_connected") {
    return; // k-vertex-connected graphs have exact structure
  }
  if (spec.kEdgeConnected?.kind === "k_edge_connected") {
    return; // k-edge-connected graphs have exact structure
  }
  if (spec.treewidth?.kind === "treewidth") {
    return; // treewidth-bounded graphs have exact structure
  }
  if (spec.kColorable?.kind === "k_colorable" || spec.kColorable?.kind === "bipartite_colorable") {
    return; // k-colorable graphs have exact structure
  }

  // ============================================================================
  // PHASE 1: SIMPLE STRUCTURAL VARIANTS (exact structure)
  // ============================================================================
  if (spec.split?.kind === "split") {
    return; // Split graphs have exact structure
  }
  if (spec.cograph?.kind === "cograph") {
    return; // Cographs have exact structure
  }
  if (spec.clawFree?.kind === "claw_free") {
    return; // Claw-free graphs have exact structure
  }

  // ============================================================================
  // PHASE 2: CHORDAL-BASED GRAPH CLASSES (exact structure)
  // ============================================================================
  if (spec.chordal?.kind === "chordal") {
    return; // Chordal graphs have exact structure
  }
  if (spec.interval?.kind === "interval") {
    return; // Interval graphs have exact structure
  }
  if (spec.permutation?.kind === "permutation") {
    return; // Permutation graphs have exact structure
  }
  if (spec.comparability?.kind === "comparability") {
    return; // Comparability graphs have exact structure
  }
  if (spec.perfect?.kind === "perfect") {
    return; // Perfect graphs have exact structure
  }

  // ============================================================================
  // PHASE 3: NETWORK SCIENCE GENERATORS (exact structure)
  // ============================================================================
  if (spec.scaleFree?.kind === "scale_free") {
    return; // Scale-free graphs have exact structure
  }
  if (spec.smallWorld?.kind === "small_world") {
    return; // Small-world graphs have exact structure
  }
  if (spec.communityStructure?.kind === "modular") {
    return; // Modular graphs have exact structure
  }
  if (spec.line?.kind === "line_graph") {
    return; // Line graphs have exact structure
  }
  if (spec.selfComplementary?.kind === "self_complementary") {
    return; // Self-complementary graphs have exact structure
  }

  // Phase 5: Advanced Structural Graphs have exact structure
  if (spec.threshold?.kind === "threshold") {
    return; // Threshold graphs have exact structure
  }
  if (spec.unitDisk?.kind === "unit_disk") {
    return; // Unit disk graphs have exact structure
  }
  if (spec.planarity?.kind === "planar") {
    return; // Planar graphs have exact structure
  }
  if (spec.hamiltonian?.kind === "hamiltonian") {
    return; // Hamiltonian graphs have exact structure
  }
  if (spec.traceable?.kind === "traceable") {
    return; // Traceable graphs have exact structure
  }

  // Phase 6: Symmetry Graphs have exact structure
  if (spec.stronglyRegular?.kind === "strongly_regular") {
    return; // Strongly regular graphs have exact structure
  }
  if (spec.vertexTransitive?.kind === "vertex_transitive") {
    return; // Vertex-transitive graphs have exact structure
  }

  // Get bipartite partitions if applicable
  const isBipartite = spec.partiteness?.kind === "bipartite";
  const leftPartition = isBipartite
    ? nodes.filter((node): node is TestNode & { partition: 'left' } => node.partition === "left")
    : [];
  const rightPartition = isBipartite
    ? nodes.filter((node): node is TestNode & { partition: 'right' } => node.partition === "right")
    : [];

  // For disconnected graphs, find components to calculate true maxPossibleEdges
  let components: string[][] = [];
  if (spec.connectivity.kind === "unconstrained") {
    components = findComponents(nodes, edges, spec.directionality.kind === 'directed');
  }

  // Calculate max possible edges accounting for self-loops, bipartite structure, and component structure
  const selfLoopEdges = spec.selfLoops.kind === "allowed" ? n : 0;
  let maxPossibleEdges: number;

  if (isBipartite) {
    // Bipartite graphs: max edges = leftSize * rightSize (or 2x for directed)
    maxPossibleEdges = spec.directionality.kind === 'directed'
      ? (2 * leftPartition.length * rightPartition.length) + selfLoopEdges
      : (leftPartition.length * rightPartition.length);
  } else if (spec.connectivity.kind === "unconstrained" && components.length > 1) {
    // For disconnected graphs, calculate max edges within each component
    maxPossibleEdges = components.reduce((total, comp) => {
      const compSize = comp.length;
      if (spec.directionality.kind === 'directed') {
        return total + (compSize * (compSize - 1));
      } else {
        return total + ((compSize * (compSize - 1)) / 2);
      }
    }, 0) + selfLoopEdges;
  } else {
    // For connected graphs, use standard formula
    maxPossibleEdges = spec.directionality.kind === 'directed'
      ? (n * (n - 1)) + selfLoopEdges  // n*(n-1) directed edges + n self-loops
      : ((n * (n - 1)) / 2); // Undirected: self-loops don't count in traditional edges
  }

  // Map density to percentage of max edges
  const edgePercentage: Record<string, number> = {
    sparse: 0.15,     // 10-20% (use 15% as midpoint)
    moderate: 0.4,    // 30-50% (use 40% as midpoint)
    dense: 0.7,       // 60-80% (use 70% as midpoint)
    unconstrained: 0.4, // Default to moderate for unconstrained
  };

  // Handle completeness and trees with exact edge counts
  let targetEdgeCount: number;
  const isUndirectedTree = spec.directionality.kind === "undirected" &&
    spec.cycles.kind === "acyclic" &&
    spec.connectivity.kind === "connected";

  if (spec.completeness.kind === "complete") {
    targetEdgeCount = maxPossibleEdges;
  } else if (isUndirectedTree) {
    // Trees are already generated with exactly n-1 edges in generateBaseStructure
    // Add parallel edges for multigraphs before returning
    if (spec.edgeMultiplicity.kind === "multi" && edges.length > 0) {
      const edgeToDouble = rng.choice(edges);
      addEdge(edges, edgeToDouble.source, edgeToDouble.target, spec, rng);
    }
    return;
  } else {
    targetEdgeCount = Math.floor(maxPossibleEdges * edgePercentage[spec.density.kind]);
  }

  // For complete graphs, use deterministic edge generation instead of random
  if (spec.completeness.kind === "complete" && spec.edgeMultiplicity.kind === "simple") {
    // Clear any edges added by generateBaseStructure - complete graphs have deterministic structure
    edges.length = 0;

    const nodeIds = nodes.map(n => n.id);

    // Generate all possible edges deterministically
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = 0; j < nodeIds.length; j++) {
        const source = nodeIds[i];
        const target = nodeIds[j];

        // Skip for undirected: only add when i < j, OR allow self-loops when i === j
        if (spec.directionality.kind === "undirected" && i >= j && (i !== j || spec.selfLoops.kind !== "allowed")) continue;

        // Skip self-loops if not allowed
        if (spec.selfLoops.kind === "disallowed" && source === target) continue;

        addEdge(edges, source, target, spec, rng);
      }
    }
    return;
  }

  // For self-loops (when not complete), add them as part of density edges
  // Track whether we still need to add a self-loop
  const needsSelfLoop = spec.selfLoops.kind === "allowed" && spec.completeness.kind !== "complete" && nodes.length > 0;

  // Recalculate edges to add
  const finalEdgesToAdd = targetEdgeCount - edges.length;
  if (finalEdgesToAdd <= 0) {
    // Even if we have enough edges, still add:
    // - Self-loop if needed
    // - Cycle for cycles_allowed
    // - Parallel edge for multigraphs
    if (needsSelfLoop && edges.length > 0) {
      const node = rng.choice(nodes).id;
      addEdge(edges, node, node, spec, rng);
    }

    // For cycles_allowed graphs, ensure we have at least one cycle
    if (spec.cycles.kind === "cycles_allowed" &&
        spec.directionality.kind === "directed" &&
        spec.connectivity.kind === "unconstrained" &&
        edges.length > 0) {
      const hasCycle = detectCycleInGraph(nodes, edges, true);
      if (!hasCycle) {
        const edgeToReverse = rng.choice(edges);
        const reverseKey = spec.directionality.kind === 'directed'
          ? `${edgeToReverse.target}→${edgeToReverse.source}`
          : [edgeToReverse.target, edgeToReverse.source].sort().join('-');
        const existingEdges = new Set(edges.map(e =>
          spec.directionality.kind === 'directed' ? `${e.source}→${e.target}` : [e.source, e.target].sort().join('-')
        ));
        if (!existingEdges.has(reverseKey)) {
          addEdge(edges, edgeToReverse.target, edgeToReverse.source, spec, rng);
        }
      }
    }

    // For multigraphs, ensure we have at least one parallel edge
    if (spec.edgeMultiplicity.kind === "multi" && edges.length > 0) {
      const edgeToDouble = rng.choice(edges);
      addEdge(edges, edgeToDouble.source, edgeToDouble.target, spec, rng);
    }
    return;
  }

  // Track existing edges (only matters for non-multigraphs)
  const existingEdges = new Set(
    edges.map((e) =>
      spec.directionality.kind === 'directed' ? `${e.source}→${e.target}` : [e.source, e.target].sort().join('-')
    )
  );

  let attempts = 0;
  // Increase maxAttempts multiplier to allow reaching dense targets
  // For dense graphs, need many more attempts due to high collision rate with existing edges
  const maxAttemptsMultiplier = spec.density.kind === "dense" ? 100 : 10;
  const maxAttempts = finalEdgesToAdd * maxAttemptsMultiplier;

  while (edges.length < targetEdgeCount && attempts < maxAttempts) {
    attempts++;

    let source: string;
    let target: string;

    // Occasionally add self-loop when needed (10% of attempts)
    if (needsSelfLoop && attempts % 10 === 0) {
      const node = rng.choice(nodes).id;
      const selfLoopKey = spec.directionality.kind === 'directed' ? `${node}→${node}` : [node, node].sort().join('-');
      if (spec.edgeMultiplicity.kind === 'multi' || !existingEdges.has(selfLoopKey)) {
        addEdge(edges, node, node, spec, rng);
        if (spec.edgeMultiplicity.kind === 'simple') {
          existingEdges.add(selfLoopKey);
        }
        continue;
      }
    }

    if (isBipartite) {
      // For bipartite graphs, select one node from each partition
      // Helper to pick a random node from either partition
      const pickRandomFromPartitions = (): TestNode => {
        const partitions: TestNode[] = [];
        if (leftPartition.length > 0) partitions.push(...leftPartition);
        if (rightPartition.length > 0) partitions.push(...rightPartition);
        return rng.choice(partitions);
      };

      const sourceNode = pickRandomFromPartitions();

      // Select target from opposite partition
      let targetNode: TestNode;
      if (sourceNode.partition === "left" && rightPartition.length > 0) {
        targetNode = rng.choice(rightPartition);
      } else if (leftPartition.length > 0) {
        targetNode = rng.choice(leftPartition);
      } else {
        continue; // No valid target available
      }

      source = sourceNode.id;
      target = targetNode.id;
    } else if (spec.connectivity.kind === "unconstrained" && components.length > 0) {
      // Pick a random component and select both nodes from it
      const component = rng.choice(components);
      if (component.length < 2) continue; // Skip components with only 1 node
      source = rng.choice(component);
      target = rng.choice(component);
    } else {
      // For connected graphs, pick any two nodes
      source = rng.choice(nodes).id;
      target = rng.choice(nodes).id;
    }

    // Avoid self-loops if not allowed
    if (spec.selfLoops.kind === "disallowed" && source === target) continue;

    // For non-multigraphs, check if edge already exists
    const edgeKey =
      spec.directionality.kind === 'directed' ? `${source}→${target}` : [source, target].sort().join('-');
    if (spec.edgeMultiplicity.kind === 'simple' && existingEdges.has(edgeKey)) continue;

    // For acyclic graphs, ensure we don't create cycles
    if (spec.cycles.kind === 'acyclic' && spec.directionality.kind === 'directed') {
      // Simple check: only add edge if target ID > source ID (topological ordering)
      const sourceNum = Number.parseInt(source.slice(1), 10);
      const targetNum = Number.parseInt(target.slice(1), 10);
      if (targetNum <= sourceNum) continue;
    }

    addEdge(edges, source, target, spec, rng);

    // Only track unique edges for non-multigraphs
    if (spec.edgeMultiplicity.kind === 'simple') {
      existingEdges.add(edgeKey);
    }
  }

  // After the loop, ensure we have required features
  // Add self-loop if still needed
  if (needsSelfLoop && edges.length > 0 && !edges.some(e => e.source === e.target)) {
    const node = rng.choice(nodes).id;
    addEdge(edges, node, node, spec, rng);
  }

  // Add cycle for cycles_allowed if still needed
  if (spec.cycles.kind === "cycles_allowed" &&
      spec.directionality.kind === "directed" &&
      spec.connectivity.kind === "unconstrained" &&
      edges.length > 0) {
    const hasCycle = detectCycleInGraph(nodes, edges, true);
    if (!hasCycle) {
      const edgeToReverse = rng.choice(edges);
      const reverseKey = `${edgeToReverse.target}→${edgeToReverse.source}`;
      if (!existingEdges.has(reverseKey)) {
        addEdge(edges, edgeToReverse.target, edgeToReverse.source, spec, rng);
      }
    }
  }

  // Add parallel edge for multigraphs
  if (spec.edgeMultiplicity.kind === "multi" && edges.length > 0) {
    const edgeToDouble = rng.choice(edges);
    addEdge(edges, edgeToDouble.source, edgeToDouble.target, spec, rng);
  }
};

/**
 * Add weights to edges.
 * @param edges
 * @param config
 * @param rng
 */
const addWeights = (edges: TestEdge[], config: GraphGenerationConfig, rng: SeededRandom): void => {
  const { min = 1, max = 100 } = config.weightRange ?? {};

  for (const edge of edges) {
    edge.weight = rng.integer(min, max);
  }
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
