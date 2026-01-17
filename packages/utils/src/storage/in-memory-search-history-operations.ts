/**
 * In-memory search history operations
 * Search query history management
 */

import type { InMemoryStorage } from './in-memory-storage-types.js';

const DEFAULT_MAX_HISTORY = 50;

/**
 * Add a search query to history
 * @param storage
 * @param query
 * @param maxHistory
 */
export const addSearchQuery = (storage: InMemoryStorage, query: string, maxHistory: number = DEFAULT_MAX_HISTORY): void => {
	const timestamp = new Date();
	const id = crypto.randomUUID();
	storage.searchHistory.set(id, { query, timestamp });

	// Prune old entries if exceeds max
	const entries = [...storage.searchHistory.entries()].sort(
		([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime()
	);

	if (entries.length > maxHistory) {
		for (const [idToDelete] of entries.slice(maxHistory)) {
			storage.searchHistory.delete(idToDelete);
		}
	}
};

/**
 * Get all search history entries sorted by timestamp (newest first)
 * @param storage
 */
export const getSearchHistory = (storage: InMemoryStorage): Array<{ query: string; timestamp: Date }> => [...storage.searchHistory.values()].sort(
		(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
	);

/**
 * Remove a specific search query from history
 * @param storage
 * @param queryId
 */
export const removeSearchQuery = (storage: InMemoryStorage, queryId: string): void => {
	storage.searchHistory.delete(queryId);
};

/**
 * Clear all search history
 * @param storage
 */
export const clearSearchHistory = (storage: InMemoryStorage): void => {
	storage.searchHistory.clear();
};
