import { type Graph } from '../graph/graph';
import { type Edge, type Node } from '../types/graph';

/**
 * Mutual information computation for graph edges.
 *
 * Provides three computation strategies that automatically adapt to graph properties:
 * 1. **Attribute-based**: When nodes have attributes, computes MI from attribute correlation
 * 2. **Type-based**: For heterogeneous graphs, computes MI from type co-occurrence rarity
 * 3. **Structural**: Falls back to Jaccard similarity of neighbourhoods
 *
 * @module pathfinding/mutual-information
 */

/**
 * Configuration for mutual information computation.
 * @template N - Node type extending base Node
 */
export interface MutualInformationConfig<N extends Node> {
  /**
   * Extract numeric attributes from a node for MI computation.
   * If not provided, structural similarity is used.
   * @param node - The node to extract attributes from
   * @returns Array of numeric attribute values, or undefined if no attributes
   */
  attributeExtractor?: (node: N) => number[] | undefined;

  /**
   * Small constant added to avoid log(0).
   * @default 1e-10
   */
  epsilon?: number;
}

/**
 * Pre-computed mutual information cache for a graph.
 * Stores MI values keyed by edge ID for O(1) lookup during path ranking.
 */
export interface MutualInformationCache {
  /**
   * Get the MI value for an edge.
   * @param edgeId - The edge identifier
   * @returns MI value, or undefined if not cached
   */
  get(edgeId: string): number | undefined;

  /**
   * Get all cached edge IDs.
   */
  keys(): IterableIterator<string>;

  /**
   * Number of cached entries.
   */
  readonly size: number;
}

/**
 * Compute mutual information between two nodes based on their attributes.
 *
 * Uses correlation coefficient as a proxy for MI when attributes are numeric vectors.
 * For discrete attributes, this should be extended to use proper entropy-based MI.
 *
 * @param attrs1 - Attribute vector of first node
 * @param attrs2 - Attribute vector of second node
 * @param epsilon - Small constant to avoid division by zero
 * @returns Mutual information estimate in range [0, 1]
 * @internal
 */
const computeAttributeMI = (
  attrs1: number[],
  attrs2: number[],
  epsilon: number,
): number => {
  if (attrs1.length === 0 || attrs2.length === 0) {
    return epsilon;
  }

  // Use minimum length if arrays differ
  const len = Math.min(attrs1.length, attrs2.length);

  // Compute means
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < len; i++) {
    sum1 += attrs1[i];
    sum2 += attrs2[i];
  }
  const mean1 = sum1 / len;
  const mean2 = sum2 / len;

  // Compute correlation coefficient (Pearson)
  let covariance = 0;
  let var1 = 0;
  let var2 = 0;
  for (let i = 0; i < len; i++) {
    const d1 = attrs1[i] - mean1;
    const d2 = attrs2[i] - mean2;
    covariance += d1 * d2;
    var1 += d1 * d1;
    var2 += d2 * d2;
  }

  const denom = Math.sqrt(var1 * var2);
  if (denom < epsilon) {
    return epsilon;
  }

  // Correlation in [-1, 1], transform to [0, 1] for MI proxy
  const correlation = covariance / denom;
  return (Math.abs(correlation) + epsilon);
};

/**
 * Compute mutual information from node type co-occurrence rarity.
 *
 * Rare type combinations have higher information content than common ones.
 * Uses negative log probability: I(u,v) = -log(P(type_u, type_v))
 *
 * @param sourceType - Type of source node
 * @param targetType - Type of target node
 * @param typePairCounts - Map of type pair counts
 * @param totalEdges - Total number of edges in graph
 * @param epsilon - Small constant to avoid log(0)
 * @returns Mutual information based on type rarity
 * @internal
 */
const computeTypeMI = (
  sourceType: string,
  targetType: string,
  typePairCounts: Map<string, number>,
  totalEdges: number,
  epsilon: number,
): number => {
  const pairKey = `${sourceType}:${targetType}`;
  const count = typePairCounts.get(pairKey) ?? 0;
  const probability = (count + epsilon) / (totalEdges + epsilon);

  // -log(p) gives higher values for rare type pairs
  // Normalise by max possible value (-log(epsilon/totalEdges))
  const mi = -Math.log(probability);
  const maxMI = -Math.log(epsilon / (totalEdges + epsilon));

  return mi / maxMI; // Normalised to [0, 1]
};

/**
 * Compute structural mutual information using Jaccard similarity.
 *
 * When no attributes or types are available, neighbourhood overlap
 * serves as a proxy for node similarity.
 *
 * @param neighbours1 - Set of neighbour IDs for first node
 * @param neighbours2 - Set of neighbour IDs for second node
 * @param epsilon - Small constant for empty neighbourhoods
 * @returns Jaccard similarity in range [0, 1]
 * @internal
 */
const computeStructuralMI = (
  neighbours1: Set<string>,
  neighbours2: Set<string>,
  epsilon: number,
): number => {
  if (neighbours1.size === 0 && neighbours2.size === 0) {
    return epsilon;
  }

  // Compute intersection
  let intersectionSize = 0;
  for (const n of neighbours1) {
    if (neighbours2.has(n)) {
      intersectionSize++;
    }
  }

  // Union size = |A| + |B| - |A ∩ B|
  const unionSize = neighbours1.size + neighbours2.size - intersectionSize;

  if (unionSize === 0) {
    return epsilon;
  }

  return intersectionSize / unionSize + epsilon;
};

/**
 * Get the set of neighbour IDs for a node.
 * @internal
 */
const getNeighbourSet = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeId: string,
): Set<string> => {
  const neighbours = new Set<string>();

  const outgoing = graph.getOutgoingEdges(nodeId);
  if (outgoing.ok) {
    for (const edge of outgoing.value) {
      const neighbourId = edge.source === nodeId ? edge.target : edge.source;
      neighbours.add(neighbourId);
    }
  }

  return neighbours;
};

/**
 * Pre-compute mutual information for all edges in a graph.
 *
 * Automatically selects the appropriate MI computation method based on
 * graph properties:
 * 1. If attributeExtractor is provided and returns values, use attribute-based MI
 * 2. If nodes have diverse types, use type-based MI
 * 3. Otherwise, fall back to structural (Jaccard) MI
 *
 * Time Complexity: O(E × avg_degree) for structural MI, O(E) for attribute/type MI
 * Space Complexity: O(E) for the cache
 *
 * @template N - Node type
 * @template E - Edge type
 * @param graph - The graph to analyse
 * @param config - Optional configuration for MI computation
 * @returns Cache of pre-computed MI values keyed by edge ID
 *
 * @example
 * ```typescript
 * const graph = new Graph<MyNode, MyEdge>(true);
 * // ... add nodes and edges ...
 *
 * // With attribute extractor
 * const cache = precomputeMutualInformation(graph, {
 *   attributeExtractor: (node) => [node.value, node.weight]
 * });
 *
 * // Without attributes (uses structural similarity)
 * const cache = precomputeMutualInformation(graph);
 *
 * // Get MI for an edge
 * const mi = cache.get('edge-1'); // number | undefined
 * ```
 */
export const precomputeMutualInformation = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  config: MutualInformationConfig<N> = {},
): MutualInformationCache => {
  const { attributeExtractor, epsilon = 1e-10 } = config;
  const cache = new Map<string, number>();
  const edges = graph.getAllEdges();

  // Determine computation strategy
  const hasAttributes = attributeExtractor !== undefined;

  // For type-based MI, pre-compute type pair frequencies
  let typePairCounts: Map<string, number> | undefined;
  let hasHeterogeneousTypes = false;

  if (!hasAttributes) {
    // Check if graph has heterogeneous node types
    const nodeTypes = new Set<string>();
    for (const node of graph.getAllNodes()) {
      nodeTypes.add(node.type);
    }
    hasHeterogeneousTypes = nodeTypes.size > 1;

    if (hasHeterogeneousTypes) {
      typePairCounts = new Map<string, number>();
      for (const edge of edges) {
        const sourceNode = graph.getNode(edge.source);
        const targetNode = graph.getNode(edge.target);
        if (sourceNode.some && targetNode.some) {
          const pairKey = `${sourceNode.value.type}:${targetNode.value.type}`;
          typePairCounts.set(pairKey, (typePairCounts.get(pairKey) ?? 0) + 1);
        }
      }
    }
  }

  // Pre-compute neighbour sets for structural MI (only if needed)
  let neighbourCache: Map<string, Set<string>> | undefined;
  if (!hasAttributes && !hasHeterogeneousTypes) {
    neighbourCache = new Map<string, Set<string>>();
  }

  // Compute MI for each edge
  for (const edge of edges) {
    const sourceNode = graph.getNode(edge.source);
    const targetNode = graph.getNode(edge.target);

    if (!sourceNode.some || !targetNode.some) {
      cache.set(edge.id, epsilon);
      continue;
    }

    let mi: number;

    if (hasAttributes && attributeExtractor) {
      // Strategy 1: Attribute-based MI
      const attrs1 = attributeExtractor(sourceNode.value);
      const attrs2 = attributeExtractor(targetNode.value);

      if (attrs1 && attrs2 && attrs1.length > 0 && attrs2.length > 0) {
        mi = computeAttributeMI(attrs1, attrs2, epsilon);
      } else {
        // Fall back to structural if attributes unavailable
        const n1 = getNeighbourSet(graph, edge.source);
        const n2 = getNeighbourSet(graph, edge.target);
        mi = computeStructuralMI(n1, n2, epsilon);
      }
    } else if (hasHeterogeneousTypes && typePairCounts) {
      // Strategy 2: Type-based MI
      mi = computeTypeMI(
        sourceNode.value.type,
        targetNode.value.type,
        typePairCounts,
        edges.length,
        epsilon,
      );
    } else {
      // Strategy 3: Structural MI (Jaccard similarity)
      // Use cached neighbour sets
      if (!neighbourCache!.has(edge.source)) {
        neighbourCache!.set(edge.source, getNeighbourSet(graph, edge.source));
      }
      if (!neighbourCache!.has(edge.target)) {
        neighbourCache!.set(edge.target, getNeighbourSet(graph, edge.target));
      }

      const n1 = neighbourCache!.get(edge.source)!;
      const n2 = neighbourCache!.get(edge.target)!;
      mi = computeStructuralMI(n1, n2, epsilon);
    }

    cache.set(edge.id, mi);
  }

  return {
    get: (edgeId: string) => cache.get(edgeId),
    keys: () => cache.keys(),
    size: cache.size,
  };
};

/**
 * Compute mutual information for a single edge.
 *
 * This is a convenience function for computing MI for individual edges
 * without pre-computing the entire graph. For ranking multiple paths,
 * use `precomputeMutualInformation` instead for better performance.
 *
 * @template N - Node type
 * @template E - Edge type
 * @param graph - The graph containing the edge
 * @param edge - The edge to compute MI for
 * @param config - Optional configuration
 * @returns MI value for the edge
 */
export const computeEdgeMI = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  edge: E,
  config: MutualInformationConfig<N> = {},
): number => {
  const { attributeExtractor, epsilon = 1e-10 } = config;

  const sourceNode = graph.getNode(edge.source);
  const targetNode = graph.getNode(edge.target);

  if (!sourceNode.some || !targetNode.some) {
    return epsilon;
  }

  // Try attribute-based first
  if (attributeExtractor) {
    const attrs1 = attributeExtractor(sourceNode.value);
    const attrs2 = attributeExtractor(targetNode.value);

    if (attrs1 && attrs2 && attrs1.length > 0 && attrs2.length > 0) {
      return computeAttributeMI(attrs1, attrs2, epsilon);
    }
  }

  // Fall back to structural
  const n1 = getNeighbourSet(graph, edge.source);
  const n2 = getNeighbourSet(graph, edge.target);
  return computeStructuralMI(n1, n2, epsilon);
};
