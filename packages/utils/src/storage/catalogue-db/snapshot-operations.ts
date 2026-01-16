/**
 * Graph Snapshot Operations
 * CRUD operations for graph snapshots (saved graph states)
 */

import type { GenericLogger } from "../../logger.js";
import type { GraphSnapshotStorage } from "./index.js";
import { LOG_CATEGORY } from "./index.js";
import type { CatalogueDB } from "./schema.js";

type GraphSnapshotStorageInput = Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Create a new graph snapshot
 * @param db Database instance
 * @param snapshot Snapshot data (without id, timestamps)
 * @param logger Optional logger
 * @returns Snapshot ID
 */
export const addSnapshot = async (
  db: CatalogueDB,
  snapshot: GraphSnapshotStorageInput,
  logger?: GenericLogger
): Promise<string> => {
  try {
    const id = crypto.randomUUID();
    const now = new Date();

    await db.snapshots.add({
      ...snapshot,
      id,
      createdAt: now,
      updatedAt: now,
    });

    logger?.debug(LOG_CATEGORY, 'Created graph snapshot', { id, name: snapshot.name });
    return id;
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to create graph snapshot', { snapshot, error });
    throw error;
  }
};

/**
 * Get all snapshots
 * @param db Database instance
 * @param logger Optional logger
 * @returns All snapshots
 */
export const getSnapshots = async (
  db: CatalogueDB,
  logger?: GenericLogger
): Promise<GraphSnapshotStorage[]> => {
  try {
    const snapshots = await db.snapshots.orderBy('createdAt').reverse().toArray();
    return snapshots;
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to get snapshots', { error });
    return [];
  }
};

/**
 * Get a specific snapshot by ID
 * @param db Database instance
 * @param id Snapshot ID
 * @param logger Optional logger
 * @returns Snapshot or null if not found
 */
export const getSnapshot = async (
  db: CatalogueDB,
  id: string,
  logger?: GenericLogger
): Promise<GraphSnapshotStorage | null> => {
  try {
    const result = await db.snapshots.get(id);
    return result ?? null;
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to get snapshot', { id, error });
    return null;
  }
};

/**
 * Update an existing snapshot
 * @param db Database instance
 * @param id Snapshot ID
 * @param updates Fields to update
 * @param logger Optional logger
 */
export const updateSnapshot = async (
  db: CatalogueDB,
  id: string,
  updates: Partial<Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>>,
  logger?: GenericLogger
): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    await db.snapshots.update(id, updateData);
    logger?.debug(LOG_CATEGORY, 'Updated graph snapshot', { id, updates });
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to update graph snapshot', { id, updates, error });
    throw error;
  }
};

/**
 * Delete a snapshot
 * @param db Database instance
 * @param id Snapshot ID
 * @param logger Optional logger
 */
export const deleteSnapshot = async (
  db: CatalogueDB,
  id: string,
  logger?: GenericLogger
): Promise<void> => {
  try {
    await db.snapshots.delete(id);
    logger?.debug(LOG_CATEGORY, 'Deleted graph snapshot', { id });
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to delete graph snapshot', { id, error });
    throw error;
  }
};

/**
 * Delete old auto-saved snapshots, keeping only the most recent N
 * @param db Database instance
 * @param keep Number of auto-saved snapshots to keep (default: 5)
 * @param logger Optional logger
 */
export const pruneAutoSaveSnapshots = async (
  db: CatalogueDB,
  keep = 5,
  logger?: GenericLogger
): Promise<void> => {
  try {
    // Get all snapshots and filter for auto-saves
    const allSnapshots = await db.snapshots.orderBy('createdAt').reverse().toArray();
    const autoSnapshots = allSnapshots.filter(s => s.isAutoSave);

    if (autoSnapshots.length > keep) {
      const toDelete = autoSnapshots.slice(keep);
      const idsToDelete = toDelete.map(s => s.id).filter((id): id is string => id !== undefined);
      await db.snapshots.bulkDelete(idsToDelete);
      logger?.debug(LOG_CATEGORY, 'Pruned auto-save snapshots', { count: idsToDelete.length, keep });
    }
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to prune auto-save snapshots', { keep, error });
    throw error;
  }
};

/**
 * Get snapshot by share token
 * @param db Database instance
 * @param shareToken Share token
 * @param logger Optional logger
 * @returns Snapshot or null if not found
 */
export const getSnapshotByShareToken = async (
  db: CatalogueDB,
  shareToken: string,
  logger?: GenericLogger
): Promise<GraphSnapshotStorage | null> => {
  try {
    const result = await db.snapshots.where('shareToken').equals(shareToken).first();
    return result ?? null;
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to get snapshot by share token', { shareToken, error });
    return null;
  }
};
