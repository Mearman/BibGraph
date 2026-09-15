/**
 * Special List Operations Interface
 *
 * Interface definitions for system-managed lists (Bookmarks, History) and Search History.
 */

import type { EntityType } from '@bibgraph/types';

import type { CatalogueEntity } from './catalogue-db/index.js';
import type {
  AddBookmarkParams as AddBookmarkParameters,
  AddToHistoryParams as AddToHistoryParameters,
} from './storage-provider-types.js';

/**
 * Special System Lists Operations Interface
 *
 * Operations for Bookmarks and History system lists.
 */
export interface SpecialListOperationsInterface {
  /**
   * Initialize special system lists (Bookmarks, History)
   * Safe to call multiple times (idempotent).
   */
  initializeSpecialLists: () => Promise<void>;

  /**
   * Check if a list is a special system list
   * @param listId - ID of the list to check
   * @returns True if list is system-managed
   */
  isSpecialList: (listId: string) => boolean;
}

/**
 * Bookmark Operations Interface
 *
 * Operations for the Bookmarks system list.
 */
export interface BookmarkOperationsInterface {
  /**
   * Add an entity to the Bookmarks system list
   * @param params - Bookmark parameters
   * @returns Promise resolving to the entity record ID
   * @throws Error if entity already bookmarked
   */
  addBookmark: (params: Readonly<AddBookmarkParameters>) => Promise<string>;

  /**
   * Remove an entity from the Bookmarks system list
   * @param entityRecordId - ID of the bookmark entity record
   */
  removeBookmark: (entityRecordId: string) => Promise<void>;

  /**
   * Get all bookmarked entities
   * @returns Promise resolving to array of bookmark entities
   */
  getBookmarks: () => Promise<CatalogueEntity[]>;

  /**
   * Check if an entity is bookmarked
   * @param entityType - Type of the entity
   * @param entityId - OpenAlex ID of the entity
   * @returns Promise resolving to true if bookmarked
   */
  isBookmarked: (entityType: EntityType, entityId: string) => Promise<boolean>;
}

/**
 * History Operations Interface
 *
 * Operations for the History system list.
 */
export interface HistoryOperationsInterface {
  /**
   * Add an entity to the History system list
   * @param params - History entry parameters
   * @returns Promise resolving to the entity record ID
   */
  addToHistory: (params: AddToHistoryParameters) => Promise<string>;

  /**
   * Get all history entries
   * @returns Promise resolving to array of history entities
   */
  getHistory: () => Promise<CatalogueEntity[]>;

  /**
   * Clear all browsing history
   */
  clearHistory: () => Promise<void>;
}

/**
 * Search History Operations Interface
 *
 * Operations for managing search query history.
 */
export interface SearchHistoryOperationsInterface {
  /**
   * Add a search query to history
   * @param query - Search query string
   * @param maxHistory - Maximum number of queries to keep (defaults to 50)
   */
  addSearchQuery: (query: string, maxHistory?: number) => Promise<void>;

  /**
   * Get all search history entries
   * @returns Promise resolving to array of search history entries
   */
  getSearchHistory: () => Promise<{ query: string; timestamp: Date }[]>;

  /**
   * Remove a specific search query from history
   * @param queryId - ID of the query to remove
   */
  removeSearchQuery: (queryId: string) => Promise<void>;

  /**
   * Clear all search history
   */
  clearSearchHistory: () => Promise<void>;
}
