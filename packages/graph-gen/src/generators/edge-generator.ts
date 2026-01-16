import {
  generateBipartiteConnectedEdges,
  generateBipartiteDisconnectedEdges,
  generateBipartiteForestEdges,
  generateBipartiteTreeEdges,
  generateCompleteBipartiteEdges} from './bipartite';
import {
  generateConnectedCyclicEdges,
  generateDisconnectedEdges,
  generateEulerianEdges,
  generateFlowNetworkEdges,
  generateForestEdges,
  generateKColorableEdges,
  generateKEdgeConnectedEdges,
  generateKVertexConnectedEdges,
  generateTreewidthBoundedEdges} from './connectivity';
import {
  generateBinaryTreeEdges,
  generateGridEdges,
  generateRegularEdges,
  generateStarEdges,
  generateToroidalEdges,
  generateTournamentEdges,
  generateTreeEdges,
  generateWheelEdges} from './core-structures';
import {
  generatePlanarEdges,
  generateUnitDiskEdges} from './geometric';
import {
  generateDominationNumberEdges,
  generateHereditaryClassEdges,
  generateIndependenceNumberEdges,
  generateVertexCoverEdges} from './invariants';
import {
  generateModularEdges,
  generateScaleFreeEdges,
  generateSmallWorldEdges} from './network-structures';
import {
  generateCircumferenceEdges,
  generateDiameterEdges,
  generateGirthEdges,
  generateHamiltonianEdges,
  generateRadiusEdges,
  generateTraceableEdges} from './path-cycle';
import {
  generateChordalEdges,
  generateClawFreeEdges,
  generateCographEdges,
  generateComparabilityEdges,
  generateIntervalEdges,
  generatePerfectEdges,
  generatePermutationEdges,
  generateSplitEdges} from './structural-classes';
import {
  generateArcTransitiveEdges,
  generateEdgeTransitiveEdges,
  generateLineGraphEdges,
  generateSelfComplementaryEdges,
  generateStronglyRegularEdges,
  generateThresholdEdges,
  generateVertexTransitiveEdges} from './symmetry';
import { SeededRandom, type TestEdge, type TestNode } from './types';
import { detectCycleInGraph, addEdge, findComponents } from './validation-helpers';
import type { GraphSpec } from '../spec';
import type { GraphGenerationConfig } from '../generator';
import {
  handleSpectrum,
  handleAlgebraicConnectivity,
  handleSpectralRadius,
  handleToughness,
  handleIntegrity,
  handleCage,
  handleMoore,
  handleRamanujan,
  handleCartesianProduct,
  handleTensorProduct,
  handleStrongProduct,
  handleLexicographicProduct,
  handleMinorFree,
  handleTopologicalMinorFree,
} from './structure-handlers';
import {
  hasExactStructure,
  calculateMaxPossibleEdges,
  getTargetEdgeCount,
  needsSelfLoop,
  getMaxAttempts,
} from './density-helpers';

/**
 * Generate base graph structure based on spec properties.
 * This is the main edge generation dispatcher that delegates to specialized generators.
 * @param nodes - Node array to connect with edges
 * @param spec - Graph specification
 * @param _config - Generation configuration (unused but kept for interface consistency)
 * @param rng - Seeded random number generator
 * @returns Array of edges forming the base graph structure
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

  // ============================================================================
  // SPECTRAL PROPERTIES (computed from structure)
  // ============================================================================
  if (spec.spectrum?.kind === "spectrum") {
    return handleSpectrum(nodes, edges, spec, rng);
  }

  if (spec.algebraicConnectivity?.kind === "algebraic_connectivity") {
    return handleAlgebraicConnectivity(nodes, edges, spec, rng);
  }

  if (spec.spectralRadius?.kind === "spectral_radius") {
    return handleSpectralRadius(nodes, edges, spec, rng);
  }

  // ============================================================================
  // ROBUSTNESS MEASURES (computed from structure)
  // ============================================================================
  if (spec.toughness?.kind === "toughness") {
    return handleToughness(nodes, edges, spec, rng);
  }

  if (spec.integrity?.kind === "integrity") {
    return handleIntegrity(nodes, edges, spec, rng);
  }

  // ============================================================================
  // EXTREMAL GRAPHS (computed classifications)
  // ============================================================================
  if (spec.cage?.kind === "cage") {
    return handleCage(nodes, edges, spec, rng);
  }

  if (spec.moore?.kind === "moore") {
    return handleMoore(nodes, edges, spec, rng);
  }

  if (spec.ramanujan?.kind === "ramanujan") {
    return handleRamanujan(nodes, edges, spec, rng);
  }

  // ============================================================================
  // GRAPH PRODUCTS (computed classifications)
  // ============================================================================
  if (spec.cartesianProduct?.kind === "cartesian_product") {
    return handleCartesianProduct(nodes, edges, spec, rng);
  }

  if (spec.tensorProduct?.kind === "tensor_product") {
    return handleTensorProduct(nodes, edges, spec, rng);
  }

  if (spec.strongProduct?.kind === "strong_product") {
    return handleStrongProduct(nodes, edges, spec, rng);
  }

  if (spec.lexicographicProduct?.kind === "lexicographic_product") {
    return handleLexicographicProduct(nodes, edges, spec, rng);
  }

  // ============================================================================
  // MINOR-FREE GRAPHS (computed classifications)
  // ============================================================================
  if (spec.minorFree?.kind === "minor_free") {
    return handleMinorFree(nodes, edges, spec, rng);
  }

  if (spec.topologicalMinorFree?.kind === "topological_minor_free") {
    return handleTopologicalMinorFree(nodes, edges, spec, rng);
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
 * Add additional edges to achieve desired density.
 * This function adds random edges to meet density requirements after base structure is generated.
 * @param nodes - Node array
 * @param edges - Edge array (modified in place)
 * @param spec - Graph specification
 * @param _config - Generation configuration (unused but kept for interface consistency)
 * @param rng - Seeded random number generator
 */
const addDensityEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _config: GraphGenerationConfig, rng: SeededRandom): void => {
  // Early exit for graphs with exact structures that shouldn't be modified
  if (hasExactStructure(spec)) {
    return;
  }

  const n = nodes.length;
  const maxPossibleEdges = calculateMaxPossibleEdges(nodes, edges, spec);
  const targetEdgeCount = getTargetEdgeCount(nodes, edges, spec, maxPossibleEdges);

  // Handle trees (already have exactly n-1 edges)
  const isUndirectedTree = spec.directionality.kind === "undirected" &&
    spec.cycles.kind === "acyclic" &&
    spec.connectivity.kind === "connected";

  if (isUndirectedTree) {
    // Add parallel edges for multigraphs
    if (spec.edgeMultiplicity.kind === "multi" && edges.length > 0) {
      const edgeToDouble = rng.choice(edges);
      addEdge(edges, edgeToDouble.source, edgeToDouble.target, spec, rng);
    }
    return;
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
  const needsSelfLoopEdge = needsSelfLoop(nodes, spec);

  // Recalculate edges to add
  const finalEdgesToAdd = targetEdgeCount - edges.length;

  // Get bipartite partitions if applicable
  const isBipartite = spec.partiteness?.kind === "bipartite";
  const leftPartition = isBipartite
    ? nodes.filter((node): node is TestNode & { partition: 'left' } => node.partition === "left")
    : [];
  const rightPartition = isBipartite
    ? nodes.filter((node): node is TestNode & { partition: 'right' } => node.partition === "right")
    : [];

  // For disconnected graphs, find components
  const components = spec.connectivity.kind === "unconstrained"
    ? findComponents(nodes, edges, spec.directionality.kind === 'directed')
    : [];

  if (finalEdgesToAdd <= 0) {
    // Even if we have enough edges, still add:
    // - Self-loop if needed
    // - Cycle for cycles_allowed
    // - Parallel edge for multigraphs
    if (needsSelfLoopEdge && edges.length > 0) {
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
  const maxAttempts = getMaxAttempts(finalEdgesToAdd, spec.density.kind);

  while (edges.length < targetEdgeCount && attempts < maxAttempts) {
    attempts++;

    let source: string;
    let target: string;

    // Occasionally add self-loop when needed (10% of attempts)
    if (needsSelfLoopEdge && attempts % 10 === 0) {
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
  if (needsSelfLoopEdge && edges.length > 0 && !edges.some(e => e.source === e.target)) {
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

export { generateBaseStructure, addDensityEdges };
