/**
 * Persistent Graph Edge Helpers
 *
 * Helper functions for edge operations in the persistent graph.
 * @module cache/dexie/persistent-graph-edges
 */

import type {
  EdgePropertyFilter,
  GraphEdgeInput,
  GraphEdgeRecord,
} from '@bibgraph/types';

import { generateEdgeId } from './graph-index-db';
import type { GraphCache } from './persistent-graph-types';

/**
 * Create an edge record from input
 * @param input
 * @param timestamp
 */
export const createEdgeRecord = (input: GraphEdgeInput, timestamp: number): GraphEdgeRecord => {
  const edgeId = generateEdgeId(input.source, input.target, input.type);
  return {
    id: edgeId,
    source: input.source,
    target: input.target,
    type: input.type,
    direction: input.direction,
    discoveredAt: timestamp,
    authorPosition: input.authorPosition,
    isCorresponding: input.isCorresponding,
    isOpenAccess: input.isOpenAccess,
    version: input.version,
    score: input.score,
    years: input.years,
    awardId: input.awardId,
    role: input.role,
    metadata: input.metadata,
  };
};

/**
 * Add an edge to adjacency lists
 * @param cache
 * @param edgeId
 * @param source
 * @param target
 */
export const addToAdjacencyLists = (cache: GraphCache, edgeId: string, source: string, target: string): void => {
  const outbound = cache.outboundEdges.get(source);
  if (outbound) {
    outbound.add(edgeId);
  } else {
    cache.outboundEdges.set(source, new Set([edgeId]));
  }

  const inbound = cache.inboundEdges.get(target);
  if (inbound) {
    inbound.add(edgeId);
  } else {
    cache.inboundEdges.set(target, new Set([edgeId]));
  }
};

/**
 * Add edge to cache and adjacency lists
 * @param cache
 * @param record
 */
export const addEdgeToCache = (cache: GraphCache, record: GraphEdgeRecord): void => {
  cache.edges.set(record.id, record);
  addToAdjacencyLists(cache, record.id, record.source, record.target);
};

/**
 * Check if an edge property filter matches an edge
 * @param edge
 * @param filter
 */
const matchesFilter = (edge: GraphEdgeRecord, filter: EdgePropertyFilter): boolean => {
  if (filter.authorPosition !== undefined && edge.authorPosition !== filter.authorPosition) {
    return false;
  }
  if (filter.isCorresponding !== undefined && edge.isCorresponding !== filter.isCorresponding) {
    return false;
  }
  if (filter.isOpenAccess !== undefined && edge.isOpenAccess !== filter.isOpenAccess) {
    return false;
  }
  if (filter.version !== undefined && edge.version !== filter.version) {
    return false;
  }
  if (filter.scoreMin !== undefined && (edge.score === undefined || edge.score < filter.scoreMin)) {
    return false;
  }
  if (filter.scoreMax !== undefined && (edge.score === undefined || edge.score > filter.scoreMax)) {
    return false;
  }
  if (
    filter.yearsInclude !== undefined &&
    filter.yearsInclude.length > 0 &&
    (!edge.years || !filter.yearsInclude.some((year) => edge.years?.includes(year)))
  ) {
    return false;
  }
  if (filter.awardId !== undefined && edge.awardId !== filter.awardId) {
    return false;
  }
  if (filter.role !== undefined && edge.role !== filter.role) {
    return false;
  }
  return true;
};

/**
 * Apply edge property filter to edges
 * @param edges
 * @param filter
 */
export const applyEdgeFilter = (edges: GraphEdgeRecord[], filter: EdgePropertyFilter): GraphEdgeRecord[] => edges.filter((edge) => matchesFilter(edge, filter));
