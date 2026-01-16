/**
 * Ego network extraction utilities.
 *
 * Ego networks (k-hop neighborhoods) are subgraphs containing all nodes
 * within k hops of one or more seed nodes, useful for citation context
 * exploration and local network analysis.
 *
 * **Generic Implementation**: Works with any graph implementing ReadableGraph.
 * Supports in-memory graphs, database-backed graphs, and lazy-loading graphs.
 *
 * Algorithm:
 * 1. Validate input parameters (radius, seed nodes exist)
 * 2. For each seed node, perform BFS limited to k hops
 * 3. Collect union of all nodes discovered within k hops
 * 4. Extract induced subgraph containing those nodes
 *
 * Time Complexity: O(V + E) where V is nodes in ego network, E is edges
 * Space Complexity: O(V) for visited set and result graph
 *
 * @template N - Node type (extends NodeBase with id field)
 * @template E - Edge type (extends EdgeBase with source, target fields)
 */
import type { EdgeBase, NodeBase, ReadableGraph } from '@bibgraph/types';

export interface EgoNetworkOptions {
  /** Number of hops to include (0 = seed nodes only, 1 = immediate neighbors) */
  radius: number;

  /** Seed node IDs to extract ego networks around */
  seedNodes: string[];

  /** Whether to include seed nodes in result (default: true) */
  includeSeed?: boolean;
}

export interface ExtractionError {
  type: 'invalid-input' | 'invalid-options';
  message: string;
}

export interface InducedSubgraph<N extends NodeBase, E extends EdgeBase> {
  /** Nodes in the extracted subgraph */
  nodes: N[];

  /** Edges in the extracted subgraph (only edges between nodes in this subgraph) */
  edges: E[];
}

export interface Ok<T> {
  ok: true;
  value: T;
}

export interface Err<E> {
  ok: false;
  error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Validate ego network extraction options.
 * @param graph
 * @param options
 */
const validateEgoNetworkOptions = <N extends NodeBase, E extends EdgeBase>(
  graph: ReadableGraph<N, E>,
  options: EgoNetworkOptions
): Result<EgoNetworkOptions, ExtractionError> => {
  if (options.radius < 0) {
    return {
      ok: false,
      error: {
        type: 'invalid-options',
        message: 'Radius must be non-negative',
      },
    };
  }

  if (options.seedNodes.length === 0) {
    return {
      ok: false,
      error: {
        type: 'invalid-options',
        message: 'At least one seed node is required',
      },
    };
  }

  // Validate seed nodes exist
  for (const seedId of options.seedNodes) {
    if (!graph.hasNode(seedId)) {
      return {
        ok: false,
        error: {
          type: 'invalid-input',
          message: `Seed node '${seedId}' not found in graph`,
        },
      };
    }
  }

  return {
    ok: true,
    value: {
      ...options,
      includeSeed: options.includeSeed ?? true,
    },
  };
};

/**
 * Extracts a k-hop ego network around one or more seed nodes.
 *
 * An ego network includes all nodes within k hops (radius) of the seed nodes,
 * along with all edges between those nodes. This is useful for exploring
 * citation contexts, local neighborhoods, and relationship patterns.
 *
 * @param graph - Source graph to extract from (any ReadableGraph implementation)
 * @param options - Ego network extraction options
 * @returns Extracted subgraph or validation error
 * @example
 * ```typescript
 * // Using algorithms Graph class (via adapter)
 * const graph = new Graph<MyNode, MyEdge>(true);
 * // ... add nodes and edges ...
 *
 * const adapter = new GraphAdapter(graph);
 * const result = extractEgoNetwork(adapter, {
 *   radius: 2,
 *   seedNodes: ['P123'],
 * });
 *
 * if (result.ok) {
 *   console.log(`Found ${result.value.nodes.length} papers in 2-hop neighborhood`);
 * }
 *
 * // Using custom graph implementation
 * class MyDatabaseGraph implements ReadableGraph<MyNode, MyEdge> {
 *   // ... implementation ...
 * }
 *
 * const result = extractEgoNetwork(new MyDatabaseGraph(), {
 *   radius: 1,
 *   seedNodes: ['A123', 'A456'],
 * });
 * ```
 */
export const extractEgoNetwork = <N extends NodeBase, E extends EdgeBase>(
  graph: ReadableGraph<N, E>,
  options: EgoNetworkOptions
): Result<InducedSubgraph<N, E>, ExtractionError> => {
  // Validate options
  const validationResult = validateEgoNetworkOptions(graph, options);
  if (!validationResult.ok) {
    return validationResult as Result<InducedSubgraph<N, E>, ExtractionError>;
  }

  const validatedOptions = validationResult.value;
  const { radius, seedNodes, includeSeed } = validatedOptions;

  // Collect all nodes within k hops of any seed node
  const egoNodeIds = new Set<string>();

  // Handle radius 0 special case (only seed nodes)
  if (radius === 0) {
    if (includeSeed) {
      for (const seedId of seedNodes) {
        egoNodeIds.add(seedId);
      }
    }
    return extractInducedSubgraph(graph, egoNodeIds);
  }

  // For each seed node, perform BFS to discover k-hop neighborhood
  for (const seedId of seedNodes) {
    const nodesAtDistance = discoverNodesWithinRadius(graph, seedId, radius);

    // Add discovered nodes to ego network
    for (const [nodeId, distance] of nodesAtDistance.entries()) {
      // Include seed node based on includeSeed option
      if (distance === 0 && !includeSeed) {
        continue;
      }
      egoNodeIds.add(nodeId);
    }
  }

  // Extract induced subgraph containing all ego nodes
  return extractInducedSubgraph(graph, egoNodeIds);
};

/**
 * Discovers all nodes within a given radius using BFS with distance tracking.
 * @param graph
 * @param startId
 * @param maxRadius
 */
const discoverNodesWithinRadius = <N extends NodeBase, E extends EdgeBase>(
  graph: ReadableGraph<N, E>,
  startId: string,
  maxRadius: number
): Map<string, number> => {
  const distances = new Map<string, number>();
  const queue: Array<{ nodeId: string; distance: number }> = [
    { nodeId: startId, distance: 0 },
  ];

  distances.set(startId, 0);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const { nodeId, distance } = current;

    // Stop expanding if we've reached the radius limit
    if (distance >= maxRadius) {
      continue;
    }

    // Explore neighbors
    const neighbors = graph.getNeighbors(nodeId);
    for (const neighborId of neighbors) {
      // Skip if already visited
      if (distances.has(neighborId)) {
        continue;
      }

      // Mark distance and enqueue for exploration
      distances.set(neighborId, distance + 1);
      queue.push({ nodeId: neighborId, distance: distance + 1 });
    }
  }

  return distances;
};

/**
 * Extracts an induced subgraph containing only the specified nodes and edges between them.
 * @param graph
 * @param nodeIds
 */
const extractInducedSubgraph = <N extends NodeBase, E extends EdgeBase>(
  graph: ReadableGraph<N, E>,
  nodeIds: Set<string>
): Result<InducedSubgraph<N, E>, ExtractionError> => {
  const nodes: N[] = [];
  const edges: E[] = [];

  // Collect all nodes
  for (const nodeId of nodeIds) {
    const node = graph.getNode(nodeId);
    if (node) {
      nodes.push(node);
    }
  }

  // Collect edges between nodes in the subgraph (if graph supports getOutgoingEdges)
  if (graph.getOutgoingEdges) {
    for (const nodeId of nodeIds) {
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        // Only include edges where both endpoints are in the subgraph
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
          edges.push(edge);
        }
      }
    }
  }

  return {
    ok: true,
    value: { nodes, edges },
  };
};

/**
 * Convenience wrapper for extracting multi-source ego network.
 *
 * Extracts the union of ego networks around multiple seed nodes.
 * This is a simplified API for the common case of multi-source extraction.
 *
 * @param graph - Source graph
 * @param seedNodes - Array of seed node IDs
 * @param radius - Number of hops to include
 * @param includeSeed - Whether to include seed nodes (default: true)
 * @returns Extracted subgraph or error
 * @example
 * ```typescript
 * // Extract 1-hop neighborhoods around multiple authors
 * const result = extractMultiSourceEgoNetwork(
 *   adapter,
 *   ['A123', 'A456', 'A789'],
 *   1
 * );
 * ```
 */
export const extractMultiSourceEgoNetwork = <N extends NodeBase, E extends EdgeBase>(
  graph: ReadableGraph<N, E>,
  seedNodes: string[],
  radius: number,
  includeSeed: boolean = true
): Result<InducedSubgraph<N, E>, ExtractionError> =>
  extractEgoNetwork(graph, {
    radius,
    seedNodes,
    includeSeed,
  });
