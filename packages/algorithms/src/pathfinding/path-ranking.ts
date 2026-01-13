import { type Graph } from '../graph/graph';
import { type Path } from '../types/algorithm-results';
import { type GraphError } from '../types/errors';
import { type Edge, type Node } from '../types/graph';
import { None, type Option, Some } from '../types/option';
import { Err, Ok, type Result } from '../types/result';
import {
  type MutualInformationCache,
  type MutualInformationConfig,
  precomputeMutualInformation,
} from './mutual-information';

/**
 * Information-theoretic path ranking using mutual information.
 *
 * Ranks paths between two nodes based on the geometric mean of mutual
 * information along their edges, with an optional length penalty.
 *
 * Supports:
 * - **Traversal modes**: Directed or undirected traversal (independent of graph structure)
 * - **Weight modes**: None, divide by mean weight, or multiplicative penalty
 * - **Length penalty**: Exponential penalty for longer paths
 *
 * @module pathfinding/path-ranking
 */

/**
 * Traversal mode determines how edges are traversed during path finding.
 *
 * This is INDEPENDENT of the graph's inherent directionality:
 * - **directed**: Only traverse edges in their natural direction
 *   - On directed graph: Follow edge direction strictly
 *   - On undirected graph: Treat as ordered sequence
 * - **undirected**: Traverse edges in both directions
 *   - On directed graph: Can go against edge direction
 *   - On undirected graph: Bidirectional (default behaviour)
 */
export type TraversalMode = 'directed' | 'undirected';

/**
 * Weight mode determines how edge weights affect path scoring.
 *
 * - **none**: Ignore edge weights (default)
 * - **divide**: Divide MI score by arithmetic mean of edge weights
 *   Score = geometric_mean(MI) / arithmetic_mean(weights)
 * - **multiplicative**: Apply multiplicative penalty from weights
 *   Score = geometric_mean(MI) × exp(-mean(log(weights)))
 */
export type WeightMode = 'none' | 'divide' | 'multiplicative';

/**
 * A ranked path with its computed score.
 * @template N - Node type
 * @template E - Edge type
 */
export interface RankedPath<N extends Node, E extends Edge> {
  /** The path (nodes and edges) */
  path: Path<N, E>;

  /** Information-theoretic ranking score M(P) */
  score: number;

  /** Geometric mean of MI values along the path (before length penalty) */
  geometricMeanMI: number;

  /** Individual MI values for each edge in the path */
  edgeMIValues: number[];

  /** Length penalty factor exp(-λk), only present if lambda > 0 */
  lengthPenalty?: number;

  /** Weight factor applied to score, only present if weightMode != 'none' */
  weightFactor?: number;
}

/**
 * Configuration for path ranking.
 * @template N - Node type
 * @template E - Edge type
 */
export interface PathRankingConfig<N extends Node, E extends Edge = Edge> {
  /**
   * Traversal mode for path finding.
   * - 'directed': Only traverse edges in their natural direction
   * - 'undirected': Traverse edges in both directions (default)
   * @default 'undirected'
   */
  traversalMode?: TraversalMode;

  /**
   * Length penalty parameter λ.
   * - λ = 0: Path length irrelevant, purely information quality (default)
   * - λ > 0: Longer paths penalised exponentially
   * - λ → ∞: Reduces to shortest path selection
   * @default 0
   */
  lambda?: number;

  /**
   * Weight mode for incorporating edge weights.
   * - 'none': Ignore weights (default)
   * - 'divide': Divide score by mean weight
   * - 'multiplicative': Apply multiplicative weight penalty
   * @default 'none'
   */
  weightMode?: WeightMode;

  /**
   * Extract weight from an edge.
   * If not provided, uses edge.weight property (defaulting to 1).
   */
  weightExtractor?: (edge: E) => number;

  /**
   * Maximum number of paths to return.
   * @default 10
   */
  maxPaths?: number;

  /**
   * Maximum path length to consider.
   * Prevents exponential blowup in dense graphs.
   * @default Infinity (only shortest paths)
   */
  maxLength?: number;

  /**
   * Pre-computed MI cache. If not provided, MI will be computed on-demand.
   * For ranking multiple path queries on the same graph, pre-compute once
   * and pass the cache here for better performance.
   */
  miCache?: MutualInformationCache;

  /**
   * Configuration for MI computation (only used if miCache not provided).
   */
  miConfig?: MutualInformationConfig<N, E>;

  /**
   * Small constant to avoid log(0).
   * @default 1e-10
   */
  epsilon?: number;
}

/**
 * Find all shortest paths between two nodes using BFS.
 *
 * Returns all paths of minimum length, not just one.
 *
 * @template N - Node type
 * @template E - Edge type
 * @param graph - The graph to search
 * @param startId - Source node ID
 * @param endId - Target node ID
 * @param traversalMode - How to traverse edges
 * @returns Array of all shortest paths
 * @internal
 */
const findAllShortestPaths = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  startId: string,
  endId: string,
  traversalMode: TraversalMode = 'undirected',
): Path<N, E>[] => {
  if (startId === endId) {
    const node = graph.getNode(startId);
    if (node.some) {
      return [{ nodes: [node.value], edges: [], totalWeight: 0 }];
    }
    return [];
  }

  // BFS to find shortest distance first
  const distances = new Map<string, number>();
  const predecessors = new Map<string, Array<{ nodeId: string; edge: E }>>();

  distances.set(startId, 0);
  predecessors.set(startId, []);

  const queue: string[] = [startId];
  let targetDistance = Infinity;

  // For undirected traversal, pre-compute all edges where node is target
  // This allows traversing edges in reverse direction on directed graphs
  const incomingEdgesByNode = new Map<string, E[]>();
  if (traversalMode === 'undirected') {
    for (const edge of graph.getAllEdges()) {
      // Store edges by their target node (for reverse traversal)
      const targetEdges = incomingEdgesByNode.get(edge.target) ?? [];
      targetEdges.push(edge);
      incomingEdgesByNode.set(edge.target, targetEdges);
    }
  }

  // Helper to get traversable neighbours based on traversal mode
  const getTraversableNeighbours = (current: string): Array<{ neighbour: string; edge: E }> => {
    const result: Array<{ neighbour: string; edge: E }> = [];
    const seenEdges = new Set<string>();

    // Get outgoing edges (always valid)
    const outgoing = graph.getOutgoingEdges(current);
    if (outgoing.ok) {
      for (const edge of outgoing.value) {
        const neighbour = edge.source === current ? edge.target : edge.source;
        result.push({ neighbour, edge });
        seenEdges.add(edge.id);
      }
    }

    // For undirected traversal, also include edges where current is the target
    // (allows traversing edges in reverse direction)
    if (traversalMode === 'undirected') {
      const incoming = incomingEdgesByNode.get(current) ?? [];
      for (const edge of incoming) {
        if (!seenEdges.has(edge.id)) {
          // Current is the target, so source is the neighbour
          const neighbour = edge.source;
          result.push({ neighbour, edge });
          seenEdges.add(edge.id);
        }
      }
    }

    return result;
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const currentDist = distances.get(current);
    if (currentDist === undefined) {
      continue;
    }

    // Stop if we've exceeded the target distance
    if (currentDist >= targetDistance) {
      continue;
    }

    const neighbours = getTraversableNeighbours(current);

    for (const { neighbour, edge } of neighbours) {
      const newDist = currentDist + 1;

      const existingDist = distances.get(neighbour);

      if (existingDist === undefined) {
        // First time visiting this node
        distances.set(neighbour, newDist);
        predecessors.set(neighbour, [{ nodeId: current, edge }]);
        queue.push(neighbour);

        if (neighbour === endId) {
          targetDistance = newDist;
        }
      } else if (existingDist === newDist) {
        // Found another shortest path to this node
        const predList = predecessors.get(neighbour);
        if (predList) {
          predList.push({ nodeId: current, edge });
        }
      }
      // If existingDist < newDist, we already have a shorter path, skip
    }
  }

  // No path found
  if (!distances.has(endId)) {
    return [];
  }

  // Reconstruct all shortest paths
  const paths: Path<N, E>[] = [];

  const reconstructPaths = (
    nodeId: string,
    currentNodes: N[],
    currentEdges: E[],
  ): void => {
    if (nodeId === startId) {
      // Reached the start, save this path (reverse to get correct order)
      const startNode = graph.getNode(startId);
      if (startNode.some) {
        paths.push({
          nodes: [startNode.value, ...currentNodes],
          edges: [...currentEdges].reverse(),
          totalWeight: currentEdges.length,
        });
      }
      return;
    }

    const preds = predecessors.get(nodeId);
    if (!preds) return;

    for (const { nodeId: predId, edge } of preds) {
      const predNode = graph.getNode(predId);
      if (predNode.some) {
        const node = graph.getNode(nodeId);
        if (node.some) {
          reconstructPaths(
            predId,
            [node.value, ...currentNodes],
            [edge, ...currentEdges],
          );
        }
      }
    }
  };

  reconstructPaths(endId, [], []);

  return paths;
};

/**
 * Score result from path computation.
 * @internal
 */
interface PathScoreResult {
  score: number;
  geometricMeanMI: number;
  edgeMIValues: number[];
  lengthPenalty?: number;
  weightFactor?: number;
}

/**
 * Compute the ranking score for a path.
 *
 * M(P) = exp((1/k) × Σᵢ log(I(uᵢ; vᵢ))) × exp(-λk) × weightFactor
 *
 * @param path - The path to score
 * @param miCache - Pre-computed MI values
 * @param lambda - Length penalty parameter
 * @param epsilon - Small constant for log safety
 * @param weightMode - How to incorporate edge weights
 * @param weightExtractor - Function to extract weight from edge
 * @returns Object containing score and component values
 * @internal
 */
const computePathScore = <N extends Node, E extends Edge>(
  path: Path<N, E>,
  miCache: MutualInformationCache,
  lambda: number,
  epsilon: number,
  weightMode: WeightMode = 'none',
  weightExtractor?: (edge: E) => number,
): PathScoreResult => {
  const k = path.edges.length;

  if (k === 0) {
    // Self-loop: path from node to itself
    return { score: 1.0, geometricMeanMI: 1.0, edgeMIValues: [] };
  }

  // Collect MI values for each edge
  const edgeMIValues: number[] = [];
  let sumLogMI = 0;

  // Collect weights if needed
  const weights: number[] = [];

  for (const edge of path.edges) {
    const mi = miCache.get(edge.id) ?? epsilon;
    edgeMIValues.push(mi);
    sumLogMI += Math.log(mi + epsilon);

    if (weightMode !== 'none') {
      const weight = weightExtractor ? weightExtractor(edge) : (edge.weight ?? 1);
      weights.push(Math.max(weight, epsilon)); // Ensure positive
    }
  }

  // Geometric mean: exp(mean(log(MI)))
  const geometricMeanMI = Math.exp(sumLogMI / k);

  // Length penalty: exp(-λk)
  const lengthPenalty = lambda > 0 ? Math.exp(-lambda * k) : undefined;

  // Weight factor
  let weightFactor: number | undefined;
  if (weightMode === 'divide' && weights.length > 0) {
    // Divide by arithmetic mean of weights
    const meanWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    weightFactor = 1 / Math.max(meanWeight, epsilon);
  } else if (weightMode === 'multiplicative' && weights.length > 0) {
    // Multiplicative penalty: exp(-mean(log(weights)))
    const meanLogWeight = weights.reduce((a, w) => a + Math.log(w), 0) / weights.length;
    weightFactor = Math.exp(-meanLogWeight);
  }

  // Final score
  let score = geometricMeanMI;
  if (lengthPenalty !== undefined) {
    score *= lengthPenalty;
  }
  if (weightFactor !== undefined) {
    score *= weightFactor;
  }

  return {
    score,
    geometricMeanMI,
    edgeMIValues,
    lengthPenalty,
    weightFactor,
  };
};

/**
 * Rank paths between two nodes using information-theoretic scoring.
 *
 * Finds all shortest paths between source and target, then ranks them
 * by the geometric mean of mutual information along their edges.
 *
 * **Formula**: M(P) = exp((1/k) × Σᵢ log I(uᵢ; vᵢ)) × exp(-λk)
 *
 * Time Complexity: O(V + E) for path finding + O(n × k) for scoring n paths of length k
 * Space Complexity: O(V + E) for BFS + O(E) for MI cache
 *
 * @template N - Node type
 * @template E - Edge type
 * @param graph - The graph to search
 * @param startId - Source node ID
 * @param endId - Target node ID
 * @param config - Optional configuration
 * @returns Result containing ranked paths or error
 *
 * @example
 * ```typescript
 * const graph = new Graph<MyNode, MyEdge>(false);
 * // ... add nodes and edges ...
 *
 * // Basic usage: rank all shortest paths
 * const result = rankPaths(graph, 'A', 'Z');
 * if (result.ok && result.value.some) {
 *   const ranked = result.value.value;
 *   console.log('Best path:', ranked[0].path.nodes.map(n => n.id).join(' -> '));
 *   console.log('Score:', ranked[0].score);
 * }
 *
 * // With custom MI computation
 * const result = rankPaths(graph, 'A', 'Z', {
 *   miConfig: {
 *     attributeExtractor: (node) => [node.value, node.weight]
 *   },
 *   lambda: 0.1,  // Slight penalty for longer paths
 *   maxPaths: 5
 * });
 * ```
 */
export const rankPaths = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  startId: string,
  endId: string,
  config: PathRankingConfig<N, E> = {},
): Result<Option<RankedPath<N, E>[]>, GraphError> => {
  const {
    traversalMode = 'undirected',
    lambda = 0,
    weightMode = 'none',
    weightExtractor,
    maxPaths = 10,
    miCache: providedCache,
    miConfig = {},
    epsilon = 1e-10,
  } = config;

  // Validate inputs
  if (!graph) {
    return Err({
      type: 'invalid-input',
      message: 'Graph cannot be null or undefined',
    });
  }

  const startNode = graph.getNode(startId);
  if (!startNode.some) {
    return Err({
      type: 'invalid-input',
      message: `Start node '${startId}' not found in graph`,
    });
  }

  const endNode = graph.getNode(endId);
  if (!endNode.some) {
    return Err({
      type: 'invalid-input',
      message: `End node '${endId}' not found in graph`,
    });
  }

  // Get or compute MI cache
  const miCache = providedCache ?? precomputeMutualInformation(graph, miConfig);

  // Find all shortest paths with specified traversal mode
  const paths = findAllShortestPaths(graph, startId, endId, traversalMode);

  if (paths.length === 0) {
    return Ok(None()); // No path exists
  }

  // Score and rank paths
  const rankedPaths: RankedPath<N, E>[] = paths.map((path) => {
    const scoreResult = computePathScore(
      path,
      miCache,
      lambda,
      epsilon,
      weightMode,
      weightExtractor,
    );

    return {
      path,
      score: scoreResult.score,
      geometricMeanMI: scoreResult.geometricMeanMI,
      edgeMIValues: scoreResult.edgeMIValues,
      lengthPenalty: scoreResult.lengthPenalty,
      weightFactor: scoreResult.weightFactor,
    };
  });

  // Sort by score descending (highest first)
  rankedPaths.sort((a, b) => b.score - a.score);

  // Limit to maxPaths
  const limitedPaths = rankedPaths.slice(0, maxPaths);

  return Ok(Some(limitedPaths));
};

/**
 * Get the best (highest-ranked) path between two nodes.
 *
 * Convenience function that returns only the top-ranked path.
 *
 * @template N - Node type
 * @template E - Edge type
 * @param graph - The graph to search
 * @param startId - Source node ID
 * @param endId - Target node ID
 * @param config - Optional configuration
 * @returns Result containing best path or error
 *
 * @example
 * ```typescript
 * const result = getBestPath(graph, 'A', 'Z');
 * if (result.ok && result.value.some) {
 *   const best = result.value.value;
 *   console.log('Best path score:', best.score);
 * }
 * ```
 */
export const getBestPath = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  startId: string,
  endId: string,
  config: PathRankingConfig<N, E> = {},
): Result<Option<RankedPath<N, E>>, GraphError> => {
  const result = rankPaths(graph, startId, endId, { ...config, maxPaths: 1 });

  if (!result.ok) {
    return result as Result<Option<RankedPath<N, E>>, GraphError>;
  }

  if (!result.value.some || result.value.value.length === 0) {
    return Ok(None());
  }

  return Ok(Some(result.value.value[0]));
};

/**
 * Create a reusable path ranker with pre-computed MI cache.
 *
 * For ranking paths across multiple queries on the same graph,
 * this is more efficient than calling rankPaths repeatedly.
 *
 * @template N - Node type
 * @template E - Edge type
 * @param graph - The graph to analyse
 * @param config - Configuration for MI computation
 * @returns Object with ranking methods that reuse the MI cache
 *
 * @example
 * ```typescript
 * // Pre-compute once
 * const ranker = createPathRanker(graph, {
 *   attributeExtractor: (node) => [node.value]
 * });
 *
 * // Use for multiple queries (reuses MI cache)
 * const result1 = ranker.rank('A', 'B');
 * const result2 = ranker.rank('C', 'D');
 * const result3 = ranker.getBest('E', 'F');
 * ```
 */
export const createPathRanker = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  config: Omit<PathRankingConfig<N, E>, 'miCache'> = {},
) => {
  // Pre-compute MI cache once
  const miCache = precomputeMutualInformation(graph, config.miConfig ?? {});

  return {
    /**
     * Rank paths between two nodes.
     */
    rank: (
      startId: string,
      endId: string,
      overrides: Partial<PathRankingConfig<N, E>> = {},
    ) => rankPaths(graph, startId, endId, { ...config, ...overrides, miCache }),

    /**
     * Get the best path between two nodes.
     */
    getBest: (
      startId: string,
      endId: string,
      overrides: Partial<PathRankingConfig<N, E>> = {},
    ) =>
      getBestPath(graph, startId, endId, { ...config, ...overrides, miCache }),

    /**
     * Access the underlying MI cache.
     */
    getMICache: () => miCache,
  };
};
