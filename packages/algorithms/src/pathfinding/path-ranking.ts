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
 * @module pathfinding/path-ranking
 */

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
}

/**
 * Configuration for path ranking.
 * @template N - Node type
 */
export interface PathRankingConfig<N extends Node> {
  /**
   * Length penalty parameter λ.
   * - λ = 0: Path length irrelevant, purely information quality (default)
   * - λ > 0: Longer paths penalised exponentially
   * - λ → ∞: Reduces to shortest path selection
   * @default 0
   */
  lambda?: number;

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
  miConfig?: MutualInformationConfig<N>;

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
 * @returns Array of all shortest paths
 * @internal
 */
const findAllShortestPaths = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  startId: string,
  endId: string,
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

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;

    // Stop if we've exceeded the target distance
    if (currentDist >= targetDistance) {
      continue;
    }

    const edgesResult = graph.getOutgoingEdges(current);
    if (!edgesResult.ok) continue;

    for (const edge of edgesResult.value) {
      const neighbour = edge.source === current ? edge.target : edge.source;
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
        predecessors.get(neighbour)!.push({ nodeId: current, edge });
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
 * Compute the ranking score for a path.
 *
 * M(P) = exp((1/k) × Σᵢ log(I(uᵢ; vᵢ))) × exp(-λk)
 *
 * @param path - The path to score
 * @param miCache - Pre-computed MI values
 * @param lambda - Length penalty parameter
 * @param epsilon - Small constant for log safety
 * @returns Object containing score and component values
 * @internal
 */
const computePathScore = <N extends Node, E extends Edge>(
  path: Path<N, E>,
  miCache: MutualInformationCache,
  lambda: number,
  epsilon: number,
): { score: number; geometricMeanMI: number; edgeMIValues: number[] } => {
  const k = path.edges.length;

  if (k === 0) {
    // Self-loop: path from node to itself
    return { score: 1.0, geometricMeanMI: 1.0, edgeMIValues: [] };
  }

  // Collect MI values for each edge
  const edgeMIValues: number[] = [];
  let sumLogMI = 0;

  for (const edge of path.edges) {
    const mi = miCache.get(edge.id) ?? epsilon;
    edgeMIValues.push(mi);
    sumLogMI += Math.log(mi + epsilon);
  }

  // Geometric mean: exp(mean(log(MI)))
  const geometricMeanMI = Math.exp(sumLogMI / k);

  // Length penalty: exp(-λk)
  const lengthPenalty = Math.exp(-lambda * k);

  // Final score
  const score = geometricMeanMI * lengthPenalty;

  return { score, geometricMeanMI, edgeMIValues };
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
  config: PathRankingConfig<N> = {},
): Result<Option<RankedPath<N, E>[]>, GraphError> => {
  const {
    lambda = 0,
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

  // Find all shortest paths
  const paths = findAllShortestPaths(graph, startId, endId);

  if (paths.length === 0) {
    return Ok(None()); // No path exists
  }

  // Score and rank paths
  const rankedPaths: RankedPath<N, E>[] = paths.map((path) => {
    const { score, geometricMeanMI, edgeMIValues } = computePathScore(
      path,
      miCache,
      lambda,
      epsilon,
    );

    return {
      path,
      score,
      geometricMeanMI,
      edgeMIValues,
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
  config: PathRankingConfig<N> = {},
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
  config: Omit<PathRankingConfig<N>, 'miCache'> = {},
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
      overrides: Partial<PathRankingConfig<N>> = {},
    ) => rankPaths(graph, startId, endId, { ...config, ...overrides, miCache }),

    /**
     * Get the best path between two nodes.
     */
    getBest: (
      startId: string,
      endId: string,
      overrides: Partial<PathRankingConfig<N>> = {},
    ) =>
      getBestPath(graph, startId, endId, { ...config, ...overrides, miCache }),

    /**
     * Access the underlying MI cache.
     */
    getMICache: () => miCache,
  };
};
