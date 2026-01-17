/**
 * Persistent Graph Node Helpers
 *
 * Helper functions for node operations in the persistent graph.
 * @module cache/dexie/persistent-graph-nodes
 */

import type {
  CompletenessStatus,
  GraphNodeInput,
  GraphNodeRecord,
} from '@bibgraph/types';

import type { GraphCache } from './persistent-graph-types';

/**
 * Completeness order for upgrade comparison
 */
const COMPLETENESS_ORDER: Record<CompletenessStatus, number> = {
  stub: 0,
  partial: 1,
  full: 2,
};

/**
 * Create a node record from input
 * @param input
 * @param timestamp
 */
export const createNodeRecord = (input: GraphNodeInput, timestamp: number): GraphNodeRecord => ({
    ...input,
    cachedAt: timestamp,
    updatedAt: timestamp,
  });

/**
 * Add a node to the cache with empty adjacency lists
 * @param cache
 * @param record
 */
export const addNodeToCache = (cache: GraphCache, record: GraphNodeRecord): void => {
  cache.nodes.set(record.id, record);
  cache.outboundEdges.set(record.id, new Set());
  cache.inboundEdges.set(record.id, new Set());
};

/**
 * Check if completeness should be upgraded
 * Only upgrades: stub → partial → full (never downgrades)
 * @param current
 * @param proposed
 */
export const shouldUpgradeCompleteness = (current: CompletenessStatus, proposed: CompletenessStatus): boolean => COMPLETENESS_ORDER[proposed] > COMPLETENESS_ORDER[current];

/**
 * Create an updated node record with new completeness/label/metadata
 * @param existing
 * @param completeness
 * @param label
 * @param metadata
 */
export const createUpdatedNodeRecord = (existing: GraphNodeRecord, completeness: CompletenessStatus, label?: string, metadata?: Record<string, unknown>): GraphNodeRecord => {
  const updated: GraphNodeRecord = {
    ...existing,
    updatedAt: Date.now(),
  };

  if (shouldUpgradeCompleteness(existing.completeness, completeness)) {
    updated.completeness = completeness;
  }

  if (label && label !== existing.label) {
    updated.label = label;
  }

  if (metadata) {
    updated.metadata = { ...existing.metadata, ...metadata };
  }

  return updated;
};
