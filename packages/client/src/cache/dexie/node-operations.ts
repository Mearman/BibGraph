/**
 * Node Operations
 *
 * Provides CRUD operations for graph nodes in the IndexedDB storage tier.
 */

import type {
  CompletenessStatus,
  GraphNodeInput,
  GraphNodeRecord,
} from '@bibgraph/types';
import { logger } from '@bibgraph/utils';

import { shouldUpgradeCompleteness } from './completeness-utils';
import { getGraphIndexDB } from './graph-index-db';

const LOG_PREFIX = 'graph-index-tier';

/**
 * Add a node to the graph index
 * @param input
 */
export const addNode = async (input: GraphNodeInput): Promise<void> => {
  const db = getGraphIndexDB();
  if (!db) {
    return;
  }

  const now = Date.now();
  const record: GraphNodeRecord = {
    ...input,
    cachedAt: now,
    updatedAt: now,
  };

  try {
    await db.nodes.put(record);
    logger.debug(LOG_PREFIX, 'Node added', {
      id: input.id,
      completeness: input.completeness,
    });
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error adding node', { id: input.id, error });
  }
};

/**
 * Get a node by ID
 * @param id
 */
export const getNode = async (
  id: string
): Promise<GraphNodeRecord | undefined> => {
  const db = getGraphIndexDB();
  if (!db) {
    return undefined;
  }

  try {
    return await db.nodes.get(id);
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error getting node', { id, error });
    return undefined;
  }
};

/**
 * Check if a node exists
 * @param id
 */
export const hasNode = async (id: string): Promise<boolean> => {
  const db = getGraphIndexDB();
  if (!db) {
    return false;
  }

  try {
    const node = await db.nodes.get(id);
    return node !== undefined;
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error checking node existence', { id, error });
    return false;
  }
};

/**
 * Update a node's completeness status
 * Only upgrades: stub → partial → full (never downgrades)
 * @param id
 * @param completeness
 * @param label
 * @param metadata
 */
export const updateNodeCompleteness = async (
  id: string,
  completeness: CompletenessStatus,
  label?: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  const db = getGraphIndexDB();
  if (!db) {
    return;
  }

  try {
    const existing = await db.nodes.get(id);
    if (!existing) {
      logger.warn(LOG_PREFIX, 'Cannot update completeness: node not found', {
        id,
      });
      return;
    }

    // Only upgrade completeness, never downgrade
    const shouldUpgrade = shouldUpgradeCompleteness(
      existing.completeness,
      completeness
    );
    if (!shouldUpgrade && !label && !metadata) {
      return;
    }

    const updates: Partial<GraphNodeRecord> = {
      updatedAt: Date.now(),
    };

    if (shouldUpgrade) {
      updates.completeness = completeness;
    }

    if (label && label !== existing.label) {
      updates.label = label;
    }

    if (metadata) {
      updates.metadata = { ...existing.metadata, ...metadata };
    }

    await db.nodes.update(id, updates);
    logger.debug(LOG_PREFIX, 'Node completeness updated', {
      id,
      from: existing.completeness,
      to: shouldUpgrade ? completeness : existing.completeness,
    });
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error updating node completeness', { id, error });
  }
};

/**
 * Mark a node as expanded (relationships have been fetched)
 * @param id
 */
export const markNodeExpanded = async (id: string): Promise<void> => {
  const db = getGraphIndexDB();
  if (!db) {
    return;
  }

  try {
    const existing = await db.nodes.get(id);
    if (!existing) {
      logger.warn(LOG_PREFIX, 'Cannot mark as expanded: node not found', {
        id,
      });
      return;
    }

    await db.nodes.update(id, {
      expandedAt: Date.now(),
      updatedAt: Date.now(),
    });

    logger.debug(LOG_PREFIX, 'Node marked as expanded', { id });
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error marking node as expanded', { id, error });
  }
};

/**
 * Get all nodes
 */
export const getAllNodes = async (): Promise<GraphNodeRecord[]> => {
  const db = getGraphIndexDB();
  if (!db) {
    return [];
  }

  try {
    return await db.nodes.toArray();
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error getting all nodes', { error });
    return [];
  }
};

/**
 * Get nodes by completeness status
 * @param status
 */
export const getNodesByCompleteness = async (
  status: CompletenessStatus
): Promise<GraphNodeRecord[]> => {
  const db = getGraphIndexDB();
  if (!db) {
    return [];
  }

  try {
    return await db.nodes.where('completeness').equals(status).toArray();
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error getting nodes by completeness', {
      status,
      error,
    });
    return [];
  }
};

/**
 * Get node count
 */
export const getNodeCount = async (): Promise<number> => {
  const db = getGraphIndexDB();
  if (!db) {
    return 0;
  }

  try {
    return await db.nodes.count();
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error counting nodes', { error });
    return 0;
  }
};

/**
 * Delete a node
 * @param id
 */
export const deleteNode = async (id: string): Promise<void> => {
  const db = getGraphIndexDB();
  if (!db) {
    return;
  }

  try {
    await db.nodes.delete(id);
    logger.debug(LOG_PREFIX, 'Node deleted', { id });
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error deleting node', { id, error });
  }
};

/**
 * Add multiple nodes in a batch
 * @param inputs
 */
export const addNodes = async (inputs: GraphNodeInput[]): Promise<void> => {
  const db = getGraphIndexDB();
  if (!db) {
    return;
  }

  const now = Date.now();
  const records: GraphNodeRecord[] = inputs.map((input) => ({
    ...input,
    cachedAt: now,
    updatedAt: now,
  }));

  try {
    await db.nodes.bulkPut(records);
    logger.debug(LOG_PREFIX, 'Bulk nodes added', { count: records.length });
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error adding bulk nodes', { error });
  }
};
