/**
 * List Operations Interface
 *
 * Interface definitions for catalogue list CRUD operations.
 * @package
 */

import type { CatalogueList } from './catalogue-db/index.js';
import type {
  CreateListParams,
  ListStats,
  ShareAccessResult,
} from './storage-provider-types.js';

/**
 * List Operations Interface
 *
 * CRUD operations for catalogue lists (user-created lists and bibliographies).
 */
export interface ListOperationsInterface {
  /**
   * Create a new catalogue list
   * @param params - List creation parameters
   * @returns Promise resolving to the new list ID (UUID)
   * @throws {Error} If list creation fails
   */
  createList(params: CreateListParams): Promise<string>;

  /**
   * Get a specific list by ID
   * @param listId - Unique identifier of the list
   * @returns Promise resolving to list or null if not found
   */
  getList(listId: string): Promise<CatalogueList | null>;

  /**
   * Get all lists ordered by updatedAt (descending)
   * @returns Promise resolving to array of lists
   */
  getAllLists(): Promise<CatalogueList[]>;

  /**
   * Update list properties. Automatically updates updatedAt timestamp.
   * @param listId - ID of the list to update
   * @param updates - Partial object with fields to update
   */
  updateList(
    listId: string,
    updates: Partial<Pick<CatalogueList, "title" | "description" | "tags" | "isPublic">>
  ): Promise<void>;

  /**
   * Delete a list and all its entities atomically
   * @param listId - ID of the list to delete
   * @throws {Error} If list is a special system list
   */
  deleteList(listId: string): Promise<void>;

  /**
   * Search lists by title, description, or tags (case-insensitive)
   * @param query - Search query string
   * @returns Promise resolving to array of matching lists
   */
  searchLists(query: string): Promise<CatalogueList[]>;

  /**
   * Get statistics about entities in a list
   * @param listId - ID of the list
   * @returns Promise resolving to entity count statistics
   */
  getListStats(listId: string): Promise<ListStats>;

  /**
   * Generate a share token for a list
   * @param listId - ID of the list to share
   * @returns Promise resolving to the generated share token (UUID)
   */
  generateShareToken(listId: string): Promise<string>;

  /**
   * Get a list by its share token
   * @param shareToken - The share token (UUID)
   * @returns Promise resolving to share access result
   */
  getListByShareToken(shareToken: string): Promise<ShareAccessResult>;

  /**
   * Get all user-created lists (excludes Bookmarks and History)
   * @returns Promise resolving to array of non-system lists
   */
  getNonSystemLists(): Promise<CatalogueList[]>;
}
