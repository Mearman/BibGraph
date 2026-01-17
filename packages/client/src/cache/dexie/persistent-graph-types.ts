/**
 * Persistent Graph Types
 *
 * Shared types and constants for the persistent graph module.
 * @module cache/dexie/persistent-graph-types
 */

import type {
  GraphEdgeRecord,
  GraphNodeRecord,
} from '@bibgraph/types';

/**
 * PersistentGraph hydration state
 */
export type HydrationState = 'not_started' | 'hydrating' | 'hydrated' | 'error';

/**
 * Log prefix for persistent graph operations
 */
export const LOG_PREFIX = 'persistent-graph';

/**
 * In-memory graph cache structure
 */
export interface GraphCache {
  /** Node ID -> Node record */
  nodes: Map<string, GraphNodeRecord>;
  /** Edge ID -> Edge record */
  edges: Map<string, GraphEdgeRecord>;
  /** Node ID -> Set of outbound edge IDs */
  outboundEdges: Map<string, Set<string>>;
  /** Node ID -> Set of inbound edge IDs */
  inboundEdges: Map<string, Set<string>>;
}

/**
 * Create an empty graph cache structure
 */
export const createEmptyCache = (): GraphCache => ({
    nodes: new Map(),
    edges: new Map(),
    outboundEdges: new Map(),
    inboundEdges: new Map(),
  });

/**
 * Clear all data from a graph cache
 * @param cache
 */
export const clearCache = (cache: GraphCache): void => {
  cache.nodes.clear();
  cache.edges.clear();
  cache.outboundEdges.clear();
  cache.inboundEdges.clear();
};
