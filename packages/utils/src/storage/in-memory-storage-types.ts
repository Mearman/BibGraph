/**
 * Internal types for in-memory storage provider
 * Defines the structure of the Map-based storage
 */

import type {
	CatalogueEntity,
	CatalogueList,
	CatalogueShareRecord,
	GraphAnnotationStorage,
	GraphSnapshotStorage,
} from './catalogue-db/index.js';

/**
 * Search history entry stored in memory
 */
export interface SearchHistoryEntry {
	query: string;
	timestamp: Date;
}

/**
 * Internal storage structure for in-memory provider
 * All data is stored in Maps for O(1) lookup by ID
 */
export interface InMemoryStorage {
	lists: Map<string, CatalogueList>;
	entities: Map<string, CatalogueEntity>;
	shares: Map<string, CatalogueShareRecord>;
	annotations: Map<string, GraphAnnotationStorage>;
	snapshots: Map<string, GraphSnapshotStorage>;
	searchHistory: Map<string, SearchHistoryEntry>;
}

/**
 * Create a new empty storage instance
 */
export const createEmptyStorage = (): InMemoryStorage => ({
		lists: new Map(),
		entities: new Map(),
		shares: new Map(),
		annotations: new Map(),
		snapshots: new Map(),
		searchHistory: new Map(),
	});

/**
 * Clear all data from storage
 * @param storage
 */
export const clearStorage = (storage: InMemoryStorage): void => {
	storage.lists.clear();
	storage.entities.clear();
	storage.shares.clear();
	storage.annotations.clear();
	storage.snapshots.clear();
	storage.searchHistory.clear();
};
