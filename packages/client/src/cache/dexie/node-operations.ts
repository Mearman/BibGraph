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
 */
export const addNode = async (input: GraphNodeInput): Promise<void> => {
  const database = getGraphIndexDB();
  if (!database) {
    return;
  }

  const now = Date.now();
  const record: GraphNodeRecord = {
    ...input,
    cachedAt: now,
    updatedAt: now,
  };

  try {
    await database.nodes.put(record);
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
 */
export const getNode = async (
  id: string
): Promise<GraphNodeRecord | undefined> => {
  const database = getGraphIndexDB();
  if (!database) {
    return undefined;
  }

  try {
    return await database.nodes.get(id);
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error getting node', { id, error });
    return undefined;
  }
};

/**
 * Check if a node exists
 */
export const hasNode = async (id: string): Promise<boolean> => {
  const database = getGraphIndexDB();
  if (!database) {
    return false;
  }

  try {
    const node = await database.nodes.get(id);
    return node !== undefined;
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error checking node existence', { id, error });
    return false;
  }
};

/**
 * Update a node's completeness status
 * Only upgrades: stub → partial → full (never downgrades)
 */
export const updateNodeCompleteness = async (
  id: string,
  completeness: CompletenessStatus,
  label?: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  const database = getGraphIndexDB();
  if (!database) {
    return;
  }

  try {
    const existing = await database.nodes.get(id);
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
    if (!shouldUpgrade && (label === undefined || label === "") && !metadata) {
      return;
    }

    const updates: Partial<GraphNodeRecord> = {
      updatedAt: Date.now(),
    };

    if (shouldUpgrade) {
      updates.completeness = completeness;
    }

    if (label !== undefined && label !== "" && label !== existing.label) {
      updates.label = label;
    }

    if (metadata) {
      updates.metadata = { ...existing.metadata, ...metadata };
    }

    await database.nodes.update(id, updates);
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
 */
export const markNodeExpanded = async (id: string): Promise<void> => {
  const database = getGraphIndexDB();
  if (!database) {
    return;
  }

  try {
    const existing = await database.nodes.get(id);
    if (!existing) {
      logger.warn(LOG_PREFIX, 'Cannot mark as expanded: node not found', {
        id,
      });
      return;
    }

    await database.nodes.update(id, {
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
  const database = getGraphIndexDB();
  if (!database) {
    return [];
  }

  try {
    return await database.nodes.toArray();
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error getting all nodes', { error });
    return [];
  }
};

/**
 * Get nodes by completeness status
 */
export const getNodesByCompleteness = async (
  status: CompletenessStatus
): Promise<GraphNodeRecord[]> => {
  const database = getGraphIndexDB();
  if (!database) {
    return [];
  }

  try {
    return await database.nodes.where('completeness').equals(status).toArray();
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
  const database = getGraphIndexDB();
  if (!database) {
    return 0;
  }

  try {
    return await database.nodes.count();
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error counting nodes', { error });
    return 0;
  }
};

/**
 * Delete a node
 */
export const deleteNode = async (id: string): Promise<void> => {
  const database = getGraphIndexDB();
  if (!database) {
    return;
  }

  try {
    await database.nodes.delete(id);
    logger.debug(LOG_PREFIX, 'Node deleted', { id });
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error deleting node', { id, error });
  }
};

/**
 * Add multiple nodes in a batch
 */
export const addNodes = async (inputs: readonly GraphNodeInput[]): Promise<void> => {
  const database = getGraphIndexDB();
  if (!database) {
    return;
  }

  const now = Date.now();
  const records: GraphNodeRecord[] = inputs.map((input) => ({
    ...input,
    cachedAt: now,
    updatedAt: now,
  }));

  try {
    await database.nodes.bulkPut(records);
    logger.debug(LOG_PREFIX, 'Bulk nodes added', { count: records.length });
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error adding bulk nodes', { error });
  }
};
