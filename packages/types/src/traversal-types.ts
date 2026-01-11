/**
 * Traversal and Weight Configuration Types
 *
 * Types for weighted graph traversal, pathfinding, and filtering operations.
 * These types bridge the PersistentGraph storage layer with the algorithms package.
 * @packageDocumentation
 */

import type { EntityType } from './entities';
import type { EdgePropertyFilter, GraphEdgeRecord, GraphNodeRecord } from './graph-index-types';

// ============================================================================
// Weight Configuration
// ============================================================================

/**
 * Edge properties that can be used as numeric weights.
 * These are the indexed properties on GraphEdgeRecord that are numeric.
 */
export type WeightableEdgeProperty = 'score' | 'weight';

/**
 * Generic weight function signature.
 * Allows weight calculation based on edge and optionally source/target nodes.
 * @template N - Node type
 * @template E - Edge type
 * @example
 * ```typescript
 * // Simple edge property weight
 * const byScore: WeightFunction = (edge) => edge.score ?? 1;
 *
 * // Complex weight using node properties
 * const byRelevance: WeightFunction = (edge, source, target) =>
 *   (edge.score ?? 0.5) * (target.metadata?.citedByCount ?? 1);
 * ```
 */
export type WeightFunction<N, E> = (edge: E, sourceNode: N, targetNode: N) => number;

/**
 * Configuration for how edge weights are calculated.
 * @template N - Node type (default: GraphNodeRecord)
 * @template E - Edge type (default: GraphEdgeRecord)
 * @example
 * ```typescript
 * // Use score property as weight
 * const config: WeightConfig = { property: 'score' };
 *
 * // Find strongest path (invert so high scores = low weight)
 * const strongestConfig: WeightConfig = { property: 'score', invert: true };
 *
 * // Custom weight function
 * const customConfig: WeightConfig = {
 *   weightFn: (edge) => edge.metadata?.citationCount ?? 1
 * };
 * ```
 */
export interface WeightConfig<
  N = GraphNodeRecord,
  E = GraphEdgeRecord,
> {
  /**
   * Use a predefined edge property as weight.
   * Takes precedence over weightFn if both are specified.
   */
  property?: WeightableEdgeProperty;

  /**
   * Custom weight function.
   * Used when property is not specified or for complex weight calculations.
   */
  weightFn?: WeightFunction<N, E>;

  /**
   * Invert the weight (1/weight) for finding "strongest" instead of "shortest" paths.
   * When true, high property values result in low traversal cost.
   * @default false
   */
  invert?: boolean;

  /**
   * Default weight to use when property is undefined on an edge.
   * @default 1
   */
  defaultWeight?: number;
}

// ============================================================================
// Traversal Options
// ============================================================================

/**
 * Direction filter for traversal operations.
 */
export type TraversalDirection = 'outbound' | 'inbound' | 'both';

/**
 * Options for graph traversal and pathfinding operations.
 *
 * Combines filtering, weight configuration, and traversal parameters
 * for flexible graph exploration.
 * @template N - Node type (default: GraphNodeRecord)
 * @template E - Edge type (default: GraphEdgeRecord)
 * @example
 * ```typescript
 * // Find shortest weighted path through authors only
 * const options: TraversalOptions = {
 *   weight: { property: 'score' },
 *   direction: 'both',
 *   nodeTypes: ['author'],
 *   edgeFilter: { type: 'AUTHORSHIP' },
 * };
 * ```
 */
export interface TraversalOptions<
  N = GraphNodeRecord,
  E = GraphEdgeRecord,
> {
  /**
   * Weight configuration for pathfinding algorithms.
   * If not specified, all edges have equal weight (1).
   */
  weight?: WeightConfig<N, E>;

  /**
   * Direction mode for traversal.
   * - 'outbound': Follow edges from source to target
   * - 'inbound': Follow edges from target to source
   * - 'both': Follow edges in both directions (undirected)
   * @default 'both'
   */
  direction?: TraversalDirection;

  /**
   * Filter edges by indexed properties during traversal.
   * Only edges matching the filter are considered.
   */
  edgeFilter?: EdgePropertyFilter;

  /**
   * Filter nodes by entity types during traversal.
   * Only nodes of these types are visited.
   * If empty or undefined, all node types are allowed.
   */
  nodeTypes?: EntityType[];

  /**
   * Maximum traversal depth (number of hops from start node).
   * Useful for BFS/DFS with depth limits.
   * If undefined, no depth limit is applied.
   */
  maxDepth?: number;

  /**
   * Whether to treat the graph as directed or undirected.
   * This affects how edges are followed during traversal.
   * @default true
   */
  directed?: boolean;
}

// ============================================================================
// Path Result Types
// ============================================================================

/**
 * Result of a weighted path search.
 */
export interface WeightedPathResult {
  /** Ordered list of node IDs in the path (from source to target) */
  path: string[];

  /** Total accumulated weight along the path */
  totalWeight: number;

  /** Whether a path was found */
  found: boolean;

  /** Individual edge weights along the path */
  edgeWeights?: number[];
}

/**
 * Options specific to pathfinding algorithms.
 */
export interface PathfindingOptions<
  N = GraphNodeRecord,
  E = GraphEdgeRecord,
> extends TraversalOptions<N, E> {
  /** Source node ID */
  sourceId: string;

  /** Target node ID */
  targetId: string;
}
