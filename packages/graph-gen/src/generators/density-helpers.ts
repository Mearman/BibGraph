import type { GraphSpec } from '../spec';
import type { TestEdge, TestNode } from './types';
import { findComponents } from './validation-helpers';

/**
 * Check if a graph specification has an exact structure that should not be modified by density edges.
 * Graphs with exact structural definitions should not have additional random edges added.
 */
export const hasExactStructure = (spec: GraphSpec): boolean => {
  // Graphs with exact edge structures
  if (spec.completeBipartite?.kind === "complete_bipartite") return true;
  if (spec.grid?.kind === "grid") return true;
  if (spec.toroidal?.kind === "toroidal") return true;
  if (spec.star?.kind === "star") return true;
  if (spec.wheel?.kind === "wheel") return true;
  if (spec.binaryTree?.kind === "binary_tree" ||
      spec.binaryTree?.kind === "full_binary" ||
      spec.binaryTree?.kind === "complete_binary") return true;
  if (spec.tournament?.kind === "tournament") return true;

  // Regularity constraints
  if (spec.cubic?.kind === "cubic") return true;
  if (spec.specificRegular?.kind === "k_regular") return true;

  // Connectivity constraints
  if (spec.flowNetwork?.kind === "flow_network") return true;
  if (spec.eulerian?.kind === "eulerian" || spec.eulerian?.kind === "semi_eulerian") return true;
  if (spec.kVertexConnected?.kind === "k_vertex_connected") return true;
  if (spec.kEdgeConnected?.kind === "k_edge_connected") return true;
  if (spec.treewidth?.kind === "treewidth") return true;
  if (spec.kColorable?.kind === "k_colorable" || spec.kColorable?.kind === "bipartite_colorable") return true;

  // Simple structural variants
  if (spec.split?.kind === "split") return true;
  if (spec.cograph?.kind === "cograph") return true;
  if (spec.clawFree?.kind === "claw_free") return true;

  // Chordal-based graph classes
  if (spec.chordal?.kind === "chordal") return true;
  if (spec.interval?.kind === "interval") return true;
  if (spec.permutation?.kind === "permutation") return true;
  if (spec.comparability?.kind === "comparability") return true;
  if (spec.perfect?.kind === "perfect") return true;

  // Network science generators
  if (spec.scaleFree?.kind === "scale_free") return true;
  if (spec.smallWorld?.kind === "small_world") return true;
  if (spec.communityStructure?.kind === "modular") return true;
  if (spec.line?.kind === "line_graph") return true;
  if (spec.selfComplementary?.kind === "self_complementary") return true;

  // Advanced structural graphs
  if (spec.threshold?.kind === "threshold") return true;
  if (spec.unitDisk?.kind === "unit_disk") return true;
  if (spec.planarity?.kind === "planar") return true;
  if (spec.hamiltonian?.kind === "hamiltonian") return true;
  if (spec.traceable?.kind === "traceable") return true;

  // Symmetry graphs
  if (spec.stronglyRegular?.kind === "strongly_regular") return true;
  if (spec.vertexTransitive?.kind === "vertex_transitive") return true;

  return false;
};

/**
 * Calculate the maximum possible edges for a graph given its specification.
 * Accounts for directionality, self-loops, bipartite structure, and component structure.
 */
export const calculateMaxPossibleEdges = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec
): number => {
  const n = nodes.length;
  const selfLoopEdges = spec.selfLoops.kind === "allowed" ? n : 0;

  // Check if bipartite
  const isBipartite = spec.partiteness?.kind === "bipartite";
  if (isBipartite) {
    const leftPartition = nodes.filter((node): node is TestNode & { partition: 'left' } =>
      node.partition === "left"
    );
    const rightPartition = nodes.filter((node): node is TestNode & { partition: 'right' } =>
      node.partition === "right"
    );

    return spec.directionality.kind === 'directed'
      ? (2 * leftPartition.length * rightPartition.length) + selfLoopEdges
      : (leftPartition.length * rightPartition.length);
  }

  // Check if disconnected with multiple components
  if (spec.connectivity.kind === "unconstrained") {
    const components = findComponents(nodes, edges, spec.directionality.kind === 'directed');
    if (components.length > 1) {
      return components.reduce((total, comp) => {
        const compSize = comp.length;
        if (spec.directionality.kind === 'directed') {
          return total + (compSize * (compSize - 1));
        } else {
          return total + ((compSize * (compSize - 1)) / 2);
        }
      }, 0) + selfLoopEdges;
    }
  }

  // Default: connected graph
  return spec.directionality.kind === 'directed'
    ? (n * (n - 1)) + selfLoopEdges
    : ((n * (n - 1)) / 2);
};

/**
 * Get the target edge count based on density specification and completeness.
 */
export const getTargetEdgeCount = (
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  maxPossibleEdges: number
): number => {
  // Handle completeness
  if (spec.completeness.kind === "complete") {
    return maxPossibleEdges;
  }

  // Handle trees (already have exactly n-1 edges)
  const isUndirectedTree = spec.directionality.kind === "undirected" &&
    spec.cycles.kind === "acyclic" &&
    spec.connectivity.kind === "connected";

  if (isUndirectedTree) {
    return edges.length; // Don't add more edges to trees
  }

  // Map density to percentage of max edges
  const edgePercentage: Record<string, number> = {
    sparse: 0.15,     // 10-20% (use 15% as midpoint)
    moderate: 0.4,    // 30-50% (use 40% as midpoint)
    dense: 0.7,       // 60-80% (use 70% as midpoint)
    unconstrained: 0.4, // Default to moderate for unconstrained
  };

  return Math.floor(maxPossibleEdges * edgePercentage[spec.density.kind]);
};

/**
 * Check if a graph needs self-loop edges.
 */
export const needsSelfLoop = (nodes: TestNode[], spec: GraphSpec): boolean => {
  return spec.selfLoops.kind === "allowed" &&
         spec.completeness.kind !== "complete" &&
         nodes.length > 0;
};

/**
 * Get the maximum attempts for edge addition loop based on density.
 */
export const getMaxAttempts = (edgesToAdd: number, densityKind: string): number => {
  const multiplier = densityKind === "dense" ? 100 : 10;
  return edgesToAdd * multiplier;
};
