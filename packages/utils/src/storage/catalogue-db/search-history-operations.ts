/**
 * Search History Operations
 * CRUD operations for search history with FIFO eviction
 */

import type { GenericLogger } from "../../logger.js";
import type { SearchHistoryEntry } from "./index.js";
import { LOG_CATEGORY } from "./index.js";
import type { CatalogueDB } from "./schema.js";

/**
 * Add search query to history with FIFO eviction
 * @param db Database instance
 * @param query Search query text
 * @param maxHistory Maximum entries to keep (default: 50)
 * @param logger Optional logger
 */
export const addSearchQuery = async (
  db: CatalogueDB,
  query: string,
  maxHistory = 50,
  logger?: GenericLogger
): Promise<void> => {
  try {
    if (!query.trim()) return;

    const id = crypto.randomUUID();
    const entry: SearchHistoryEntry = {
      id,
      query: query.trim(),
      timestamp: new Date(),
    };

    await db.searchHistory.add(entry);

    // Enforce FIFO eviction by removing oldest entries if exceeding max
    const allEntries = await db.searchHistory.orderBy('timestamp').toArray();
    if (allEntries.length > maxHistory) {
      const entriesToRemove = allEntries.slice(0, allEntries.length - maxHistory);
      const idsToRemove = entriesToRemove
        .map((e) => e.id)
        .filter((id): id is string => id !== undefined);
      await db.searchHistory.bulkDelete(idsToRemove);
    }

    logger?.debug(LOG_CATEGORY, 'Added search query to history', { query });
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to add search query to history', { error, query });
    throw error;
  }
};

/**
 * Get all search history entries ordered by timestamp (newest first)
 * @param db Database instance
 * @param logger Optional logger
 * @returns Search history entries
 */
export const getSearchHistory = async (
  db: CatalogueDB,
  logger?: GenericLogger
): Promise<SearchHistoryEntry[]> => {
  try {
    return await db.searchHistory.orderBy('timestamp').reverse().toArray();
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to get search history', { error });
    return [];
  }
};

/**
 * Remove search query from history
 * @param db Database instance
 * @param id Entry ID to remove
 * @param logger Optional logger
 */
export const removeSearchQuery = async (
  db: CatalogueDB,
  id: string,
  logger?: GenericLogger
): Promise<void> => {
  try {
    await db.searchHistory.delete(id);
    logger?.debug(LOG_CATEGORY, 'Removed search query from history', { id });
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to remove search query from history', { error, id });
    throw error;
  }
};

/**
 * Clear all search history
 * @param db Database instance
 * @param logger Optional logger
 */
export const clearSearchHistory = async (
  db: CatalogueDB,
  logger?: GenericLogger
): Promise<void> => {
  try {
    await db.searchHistory.clear();
    logger?.debug(LOG_CATEGORY, 'Cleared search history');
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to clear search history', { error });
    throw error;
  }
};
