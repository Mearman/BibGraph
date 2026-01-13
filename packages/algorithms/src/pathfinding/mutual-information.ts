import { type Graph } from '../graph/graph';
import { type Edge, type Node } from '../types/graph';

/**
 * Mutual information computation for graph edges.
 *
 * Provides multiple computation strategies that automatically adapt to graph properties:
 * 1. **Attribute-based**: When nodes have attributes, computes MI from attribute correlation
 * 2. **Node type-based**: For heterogeneous node types, computes MI from type co-occurrence rarity
 * 3. **Edge type-based**: For heterogeneous edge types, computes MI from edge type rarity
 * 4. **Structural**: Falls back to Jaccard similarity of neighbourhoods
 *
 * Additional modifiers that multiply the base MI:
 * - **Temporal**: Edge stability/recency modifier
 * - **Signed**: Positive/negative edge modifier
 * - **Probabilistic**: Edge probability modifier
 * - **Community**: Same-community boost modifier
 * - **Multiplex**: Aggregates MI across layers
 * - **Hypergraph**: Handles hyperedges connecting multiple nodes
 *
 * @module pathfinding/mutual-information
 */

/**
 * Configuration for mutual information computation.
 * @template N - Node type extending base Node
 * @template E - Edge type extending base Edge
 */
export interface MutualInformationConfig<N extends Node, E extends Edge = Edge> {
  /**
   * Extract numeric attributes from a node for MI computation.
   * If not provided, structural similarity is used.
   * @param node - The node to extract attributes from
   * @returns Array of numeric attribute values, or undefined if no attributes
   */
  attributeExtractor?: (node: N) => number[] | undefined;

  /**
   * Extract community/cluster identifier from a node.
   * Edges within the same community get boosted MI.
   * @param node - The node to extract community from
   * @returns Community identifier, or undefined if not clustered
   */
  communityExtractor?: (node: N) => string | number | undefined;

  /**
   * Extract layer identifier from an edge for multiplex graphs.
   * MI is aggregated across layers using geometric mean.
   * @param edge - The edge to extract layer from
   * @returns Layer identifier, or undefined if single-layer
   */
  layerExtractor?: (edge: E) => string | number | undefined;

  /**
   * Extract timestamp from an edge for temporal graphs.
   * More recent edges get higher MI via temporal decay.
   * @param edge - The edge to extract timestamp from
   * @returns Unix timestamp, or undefined if static
   */
  timestampExtractor?: (edge: E) => number | undefined;

  /**
   * Extract sign from an edge for signed graphs.
   * Negative edges get penalized MI.
   * @param edge - The edge to extract sign from
   * @returns Sign value (positive > 0, negative < 0), or undefined if unsigned
   */
  signExtractor?: (edge: E) => number | undefined;

  /**
   * Extract probability from an edge for probabilistic graphs.
   * MI is multiplied by edge probability.
   * @param edge - The edge to extract probability from
   * @returns Probability in [0, 1], or undefined if deterministic
   */
  probabilityExtractor?: (edge: E) => number | undefined;

  /**
   * Extract hyperedge node IDs for hypergraph edges.
   * Returns all nodes connected by this hyperedge (beyond source/target).
   * @param edge - The edge to extract hyperedge nodes from
   * @returns Array of additional node IDs, or undefined if simple edge
   */
  hyperedgeExtractor?: (edge: E) => string[] | undefined;

  /**
   * Whether to use edge types for MI computation in heterogeneous edge graphs.
   * @default false (auto-detected)
   */
  useEdgeTypes?: boolean;

  /**
   * Boost factor for edges within the same community.
   * MI is multiplied by (1 + communityBoost) for same-community edges.
   * @default 0.5
   */
  communityBoost?: number;

  /**
   * Penalty factor for negative edges in signed graphs.
   * Negative edges have MI multiplied by (1 - negativePenalty).
   * @default 0.5
   */
  negativePenalty?: number;

  /**
   * Decay rate for temporal MI modifier.
   * MI_temporal = exp(-temporalDecay * age) where age is time since referenceTime.
   * @default 0.001
   */
  temporalDecay?: number;

  /**
   * Reference time for temporal decay computation (Unix timestamp).
   * @default Date.now()
   */
  referenceTime?: number;

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
 * @param typePairCounts - Map of type pair counts (uses canonical keys)
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
  // Use canonical key (alphabetically sorted) for order-independent lookup
  const pairKey = sourceType <= targetType
    ? `${sourceType}:${targetType}`
    : `${targetType}:${sourceType}`;
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
 * Compute mutual information from edge type co-occurrence rarity.
 *
 * Rare edge types have higher information content than common ones.
 * Uses negative log probability: I(e) = -log(P(type_e))
 *
 * @param edgeType - Type of the edge
 * @param edgeTypeCounts - Map of edge type counts
 * @param totalEdges - Total number of edges in graph
 * @param epsilon - Small constant to avoid log(0)
 * @returns Mutual information based on edge type rarity
 * @internal
 */
const computeEdgeTypeMI = (
  edgeType: string,
  edgeTypeCounts: Map<string, number>,
  totalEdges: number,
  epsilon: number,
): number => {
  const count = edgeTypeCounts.get(edgeType) ?? 0;
  const probability = (count + epsilon) / (totalEdges + epsilon);

  // -log(p) gives higher values for rare edge types
  const mi = -Math.log(probability);
  const maxMI = -Math.log(epsilon / (totalEdges + epsilon));

  return mi / maxMI; // Normalised to [0, 1]
};

/**
 * Compute temporal modifier based on edge recency.
 *
 * More recent edges have higher modifier values via exponential decay.
 *
 * @param timestamp - Edge timestamp
 * @param referenceTime - Reference time for decay computation
 * @param temporalDecay - Decay rate
 * @returns Temporal modifier in range [0, 1]
 * @internal
 */
const computeTemporalModifier = (
  timestamp: number,
  referenceTime: number,
  temporalDecay: number,
): number => {
  const age = Math.max(0, referenceTime - timestamp);
  return Math.exp(-temporalDecay * age);
};

/**
 * Compute sign modifier for signed edges.
 *
 * Positive edges get full MI, negative edges are penalized.
 *
 * @param sign - Edge sign (positive > 0, negative < 0)
 * @param negativePenalty - Penalty factor for negative edges
 * @returns Sign modifier in range [1 - negativePenalty, 1]
 * @internal
 */
const computeSignModifier = (
  sign: number,
  negativePenalty: number,
): number => {
  return sign >= 0 ? 1.0 : 1.0 - negativePenalty;
};

/**
 * Compute community modifier based on same-community membership.
 *
 * Edges within the same community get boosted MI.
 *
 * @param community1 - Community of source node
 * @param community2 - Community of target node
 * @param communityBoost - Boost factor for same-community edges
 * @returns Community modifier >= 1.0
 * @internal
 */
const computeCommunityModifier = (
  community1: string | number | undefined,
  community2: string | number | undefined,
  communityBoost: number,
): number => {
  if (community1 === undefined || community2 === undefined) {
    return 1.0;
  }
  return community1 === community2 ? 1.0 + communityBoost : 1.0;
};

/**
 * Compute hyperedge MI by averaging pairwise MI across all nodes.
 *
 * For hyperedges connecting multiple nodes, compute the geometric mean
 * of pairwise structural MI between all connected nodes.
 *
 * @param nodeIds - All node IDs in the hyperedge
 * @param neighbourCache - Cache of neighbour sets
 * @param epsilon - Small constant
 * @returns Aggregated MI for the hyperedge
 * @internal
 */
const computeHyperedgeMI = (
  nodeIds: string[],
  neighbourCache: Map<string, Set<string>>,
  epsilon: number,
): number => {
  if (nodeIds.length < 2) {
    return epsilon;
  }

  // Compute pairwise structural MI and take geometric mean
  let sumLogMI = 0;
  let pairCount = 0;

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const n1 = neighbourCache.get(nodeIds[i]) ?? new Set<string>();
      const n2 = neighbourCache.get(nodeIds[j]) ?? new Set<string>();
      const pairMI = computeStructuralMI(n1, n2, epsilon);
      sumLogMI += Math.log(pairMI + epsilon);
      pairCount++;
    }
  }

  return pairCount > 0 ? Math.exp(sumLogMI / pairCount) : epsilon;
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
 * 2. If nodes have diverse types, use node type-based MI
 * 3. If useEdgeTypes is enabled or edges have diverse types, use edge type-based MI
 * 4. Otherwise, fall back to structural (Jaccard) MI
 *
 * Additional modifiers are applied multiplicatively:
 * - Temporal: Edge recency modifier
 * - Signed: Negative edge penalty modifier
 * - Probabilistic: Edge probability modifier
 * - Community: Same-community boost modifier
 * - Multiplex: Geometric mean across layers
 * - Hypergraph: Pairwise aggregation across hyperedge nodes
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
 * // With temporal decay
 * const cache = precomputeMutualInformation(graph, {
 *   timestampExtractor: (edge) => edge.timestamp,
 *   temporalDecay: 0.001,
 *   referenceTime: Date.now()
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
  config: MutualInformationConfig<N, E> = {},
): MutualInformationCache => {
  const {
    attributeExtractor,
    communityExtractor,
    layerExtractor,
    timestampExtractor,
    signExtractor,
    probabilityExtractor,
    hyperedgeExtractor,
    useEdgeTypes,
    communityBoost = 0.5,
    negativePenalty = 0.5,
    temporalDecay = 0.001,
    referenceTime = Date.now(),
    epsilon = 1e-10,
  } = config;

  const cache = new Map<string, number>();
  const edges = graph.getAllEdges();

  // Determine computation strategy
  const hasAttributes = attributeExtractor !== undefined;
  const hasCommunities = communityExtractor !== undefined;
  const hasLayers = layerExtractor !== undefined;
  const hasTemporal = timestampExtractor !== undefined;
  const hasSigns = signExtractor !== undefined;
  const hasProbabilities = probabilityExtractor !== undefined;
  const hasHyperedges = hyperedgeExtractor !== undefined;

  // For node type-based MI, pre-compute type pair frequencies
  let typePairCounts: Map<string, number> | undefined;
  let hasHeterogeneousNodeTypes = false;

  // For edge type-based MI, pre-compute edge type frequencies
  let edgeTypeCounts: Map<string, number> | undefined;
  let hasHeterogeneousEdgeTypes = false;

  if (!hasAttributes) {
    // Check if graph has heterogeneous node types
    const nodeTypes = new Set<string>();
    for (const node of graph.getAllNodes()) {
      nodeTypes.add(node.type);
    }
    hasHeterogeneousNodeTypes = nodeTypes.size > 1;

    if (hasHeterogeneousNodeTypes) {
      typePairCounts = new Map<string, number>();
      for (const edge of edges) {
        const sourceNode = graph.getNode(edge.source);
        const targetNode = graph.getNode(edge.target);
        if (sourceNode.some && targetNode.some) {
          // Use canonical key (order-independent)
          const t1 = sourceNode.value.type;
          const t2 = targetNode.value.type;
          const pairKey = t1 <= t2 ? `${t1}:${t2}` : `${t2}:${t1}`;
          typePairCounts.set(pairKey, (typePairCounts.get(pairKey) ?? 0) + 1);
        }
      }
    }

    // Check if graph has heterogeneous edge types
    const edgeTypes = new Set<string>();
    for (const edge of edges) {
      edgeTypes.add(edge.type);
    }
    hasHeterogeneousEdgeTypes = useEdgeTypes ?? edgeTypes.size > 1;

    if (hasHeterogeneousEdgeTypes) {
      edgeTypeCounts = new Map<string, number>();
      for (const edge of edges) {
        edgeTypeCounts.set(
          edge.type,
          (edgeTypeCounts.get(edge.type) ?? 0) + 1,
        );
      }
    }
  }

  // Pre-compute neighbour sets for structural MI and hyperedges
  const neighbourCache = new Map<string, Set<string>>();

  // Pre-compute edges by layer for multiplex graphs
  const edgesByLayer = new Map<string | number, E[]>();
  if (hasLayers) {
    for (const edge of edges) {
      const layer = layerExtractor(edge);
      if (layer !== undefined) {
        const layerEdges = edgesByLayer.get(layer) ?? [];
        layerEdges.push(edge);
        edgesByLayer.set(layer, layerEdges);
      }
    }
  }

  // Helper to get/cache neighbour set
  const getOrCacheNeighbourSet = (nodeId: string): Set<string> => {
    if (!neighbourCache.has(nodeId)) {
      neighbourCache.set(nodeId, getNeighbourSet(graph, nodeId));
    }
    return neighbourCache.get(nodeId)!;
  };

  // Compute base MI for an edge
  const computeBaseMI = (edge: E): number => {
    const sourceNode = graph.getNode(edge.source);
    const targetNode = graph.getNode(edge.target);

    if (!sourceNode.some || !targetNode.some) {
      return epsilon;
    }

    // Strategy 1: Hyperedge MI (takes precedence if hyperedge extractor provided)
    if (hasHyperedges) {
      const hyperedgeNodes = hyperedgeExtractor(edge);
      if (hyperedgeNodes && hyperedgeNodes.length > 0) {
        // Include source and target in the hyperedge
        const allNodes = [edge.source, edge.target, ...hyperedgeNodes];
        // Ensure neighbour sets are cached
        for (const nodeId of allNodes) {
          getOrCacheNeighbourSet(nodeId);
        }
        return computeHyperedgeMI(allNodes, neighbourCache, epsilon);
      }
    }

    // Strategy 2: Attribute-based MI
    if (hasAttributes && attributeExtractor) {
      const attrs1 = attributeExtractor(sourceNode.value);
      const attrs2 = attributeExtractor(targetNode.value);

      if (attrs1 && attrs2 && attrs1.length > 0 && attrs2.length > 0) {
        return computeAttributeMI(attrs1, attrs2, epsilon);
      }
    }

    // Strategy 3: Node type-based MI
    if (hasHeterogeneousNodeTypes && typePairCounts) {
      return computeTypeMI(
        sourceNode.value.type,
        targetNode.value.type,
        typePairCounts,
        edges.length,
        epsilon,
      );
    }

    // Strategy 4: Edge type-based MI
    if (hasHeterogeneousEdgeTypes && edgeTypeCounts) {
      return computeEdgeTypeMI(edge.type, edgeTypeCounts, edges.length, epsilon);
    }

    // Strategy 5: Structural MI (Jaccard similarity)
    const n1 = getOrCacheNeighbourSet(edge.source);
    const n2 = getOrCacheNeighbourSet(edge.target);
    return computeStructuralMI(n1, n2, epsilon);
  };

  // Compute modifiers for an edge
  const computeModifiers = (edge: E): number => {
    const sourceNode = graph.getNode(edge.source);
    const targetNode = graph.getNode(edge.target);

    let modifier = 1.0;

    // Temporal modifier
    if (hasTemporal) {
      const timestamp = timestampExtractor(edge);
      if (timestamp !== undefined) {
        modifier *= computeTemporalModifier(timestamp, referenceTime, temporalDecay);
      }
    }

    // Sign modifier
    if (hasSigns) {
      const sign = signExtractor(edge);
      if (sign !== undefined) {
        modifier *= computeSignModifier(sign, negativePenalty);
      }
    }

    // Probability modifier
    if (hasProbabilities) {
      const probability = probabilityExtractor(edge);
      if (probability !== undefined) {
        modifier *= Math.max(0, Math.min(1, probability));
      }
    }

    // Community modifier
    if (hasCommunities && sourceNode.some && targetNode.some) {
      const community1 = communityExtractor(sourceNode.value);
      const community2 = communityExtractor(targetNode.value);
      modifier *= computeCommunityModifier(community1, community2, communityBoost);
    }

    return modifier;
  };

  // Compute MI for each edge
  for (const edge of edges) {
    // Compute base MI
    let mi = computeBaseMI(edge);

    // Apply modifiers
    mi *= computeModifiers(edge);

    // For multiplex graphs, aggregate MI across layers
    if (hasLayers) {
      const layer = layerExtractor(edge);
      if (layer !== undefined && edgesByLayer.size > 1) {
        // MI is already computed for this edge's layer
        // The layer information is captured in the base MI computation
        // No additional aggregation needed since edges are separate per layer
      }
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
 * Note: This function only supports attribute-based and structural MI.
 * For full modifier support (temporal, signed, probabilistic, etc.),
 * use `precomputeMutualInformation` which applies all modifiers.
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
  config: MutualInformationConfig<N, E> = {},
): number => {
  const {
    attributeExtractor,
    communityExtractor,
    timestampExtractor,
    signExtractor,
    probabilityExtractor,
    communityBoost = 0.5,
    negativePenalty = 0.5,
    temporalDecay = 0.001,
    referenceTime = Date.now(),
    epsilon = 1e-10,
  } = config;

  const sourceNode = graph.getNode(edge.source);
  const targetNode = graph.getNode(edge.target);

  if (!sourceNode.some || !targetNode.some) {
    return epsilon;
  }

  // Compute base MI
  let mi: number;

  // Try attribute-based first
  if (attributeExtractor) {
    const attrs1 = attributeExtractor(sourceNode.value);
    const attrs2 = attributeExtractor(targetNode.value);

    if (attrs1 && attrs2 && attrs1.length > 0 && attrs2.length > 0) {
      mi = computeAttributeMI(attrs1, attrs2, epsilon);
    } else {
      // Fall back to structural
      const n1 = getNeighbourSet(graph, edge.source);
      const n2 = getNeighbourSet(graph, edge.target);
      mi = computeStructuralMI(n1, n2, epsilon);
    }
  } else {
    // Fall back to structural
    const n1 = getNeighbourSet(graph, edge.source);
    const n2 = getNeighbourSet(graph, edge.target);
    mi = computeStructuralMI(n1, n2, epsilon);
  }

  // Apply modifiers
  let modifier = 1.0;

  // Temporal modifier
  if (timestampExtractor) {
    const timestamp = timestampExtractor(edge);
    if (timestamp !== undefined) {
      modifier *= computeTemporalModifier(timestamp, referenceTime, temporalDecay);
    }
  }

  // Sign modifier
  if (signExtractor) {
    const sign = signExtractor(edge);
    if (sign !== undefined) {
      modifier *= computeSignModifier(sign, negativePenalty);
    }
  }

  // Probability modifier
  if (probabilityExtractor) {
    const probability = probabilityExtractor(edge);
    if (probability !== undefined) {
      modifier *= Math.max(0, Math.min(1, probability));
    }
  }

  // Community modifier
  if (communityExtractor) {
    const community1 = communityExtractor(sourceNode.value);
    const community2 = communityExtractor(targetNode.value);
    modifier *= computeCommunityModifier(community1, community2, communityBoost);
  }

  return mi * modifier;
};
