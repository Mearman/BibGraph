/**
 * Storage Provider Interface for Catalogue Operations
 *
 * This interface defines the contract for catalogue storage providers.
 * Implementations can use different backends (IndexedDB, in-memory, remote API, etc.)
 * while maintaining consistent behavior for all catalogue operations.
 * @package
 * @see {@link https://github.com/joe/BibGraph/specs/001-storage-abstraction/spec.md}
 */

import type {
  AddToGraphListParams,
  EntityType,
  GraphListNode,
  PruneGraphListResult,
} from '@bibgraph/types';

import type { GenericLogger } from '../logger.js';
import type {
  CatalogueEntity,
  CatalogueList,
  ListType,
} from './catalogue-db/index.js';

/**
 * Parameters for creating a new catalogue list
 */
export interface CreateListParams {
  /** User-provided list name (1-200 characters) */
  title: string;
  /** Optional list description (max 1000 characters) */
  description?: string;
  /** List category: "list" (any entities) or "bibliography" (works only) */
  type: ListType;
  /** User-defined tags for organization (max 50 tags, each 1-50 chars) */
  tags?: string[];
  /** Whether list can be shared publicly (defaults to false) */
  isPublic?: boolean;
}

/**
 * Parameters for adding an entity to a catalogue list
 */
export interface AddEntityParams {
  /** ID of the list to add entity to */
  listId: string;
  /** Type of academic entity (works, authors, institutions, etc.) */
  entityType: EntityType;
  /** OpenAlex ID of the entity (e.g., "W2741809807") */
  entityId: string;
  /** Optional user notes about this entity (max 5000 characters) */
  notes?: string;
  /** Optional sort position (defaults to end of list) */
  position?: number;
}

/**
 * Parameters for adding to browsing history
 */
export interface AddToHistoryParams {
  /** Type of academic entity */
  entityType: EntityType;
  /** OpenAlex ID of the entity */
  entityId: string;
  /** URL where entity was viewed */
  url: string;
  /** Optional title of the entity */
  title?: string;
  /** Optional custom timestamp (defaults to now) */
  timestamp?: Date;
}

/**
 * Parameters for adding a bookmark
 */
export interface AddBookmarkParams {
  /** Type of academic entity */
  entityType: EntityType;
  /** OpenAlex ID of the entity */
  entityId: string;
  /** Optional user notes */
  notes?: string;
}

/**
 * Statistics about entities in a list
 */
export interface ListStats {
  /** Total number of entities in the list */
  totalEntities: number;
  /** Breakdown of entity counts by type */
  entityCounts: Record<EntityType, number>;
}

/**
 * Result of batch entity addition operation
 */
export interface BatchAddResult {
  /** Number of entities successfully added */
  success: number;
  /** Number of entities that failed to add */
  failed: number;
}

/**
 * Result of accessing a shared list via token
 */
export interface ShareAccessResult {
  /** The catalogue list, or null if not found/invalid */
  list: CatalogueList | null;
  /** Whether the share token is valid (exists and not expired) */
  valid: boolean;
}

/**
 * Storage Provider Interface
 *
 * All operations return Promises and throw errors for failure cases.
 * Callers should use try-catch blocks for error handling.
 *
 * Null vs Errors:
 * - getList() returns null if list not found (not an error)
 * - getAllLists() returns empty array if no lists exist (not an error)
 * - Other operations throw Error if resource not found or operation fails
 *
 * Transactions:
 * - Not exposed in interface - handled internally by implementations
 * - Dexie uses automatic transaction zones
 * - In-memory storage uses synchronous Map operations
 */
export interface CatalogueStorageProvider {
  // ========================================
  // List Operations
  // ========================================

  /**
   * Create a new catalogue list
   * @param params - List creation parameters
   * @returns Promise resolving to the new list ID (UUID)
   * @throws {Error} If list creation fails (e.g., validation error, storage full)
   * @example
   * ```typescript
   * const listId = await provider.createList({
   *   title: "Cultural Heritage ML Papers",
   *   description: "Research papers for thesis Chapter 3",
   *   type: "bibliography",
   *   tags: ["machine-learning", "cultural-heritage"],
   *   isPublic: false
   * });
   * ```
   */
  createList(params: CreateListParams): Promise<string>;

  /**
   * Get a specific list by ID
   * @param listId - Unique identifier of the list
   * @returns Promise resolving to list or null if not found
   * @throws {Error} If storage operation fails (but not if list doesn't exist)
   * @example
   * ```typescript
   * const list = await provider.getList("a1b2c3d4-...");
   * if (list) {
   *   console.log(list.title);
   * }
   * ```
   */
  getList(listId: string): Promise<CatalogueList | null>;

  /**
   * Get all lists ordered by updatedAt (descending)
   * @returns Promise resolving to array of lists (empty if none exist)
   * @throws {Error} If storage operation fails
   * @example
   * ```typescript
   * const allLists = await provider.getAllLists();
   * console.log(`You have ${allLists.length} lists`);
   * ```
   */
  getAllLists(): Promise<CatalogueList[]>;

  /**
   * Update list properties
   *
   * Automatically updates the list's `updatedAt` timestamp.
   * @param listId - ID of the list to update
   * @param updates - Partial object with fields to update
   * @returns Promise resolving when update completes
   * @throws {Error} If list not found or update fails
   * @example
   * ```typescript
   * await provider.updateList("a1b2c3d4-...", {
   *   title: "Updated Title",
   *   tags: ["new-tag"]
   * });
   * ```
   */
  updateList(
    listId: string,
    updates: Partial<Pick<CatalogueList, "title" | "description" | "tags" | "isPublic">>
  ): Promise<void>;

  /**
   * Delete a list and all its entities atomically
   *
   * This operation cascades to delete:
   * - All catalogue entities in the list
   * - All share records for the list
   * @param listId - ID of the list to delete
   * @returns Promise resolving when deletion completes
   * @throws {Error} If list not found, is a special system list, or deletion fails
   * @example
   * ```typescript
   * try {
   *   await provider.deleteList("a1b2c3d4-...");
   *   console.log("List deleted successfully");
   * } catch (error) {
   *   if (error.message.includes("special system list")) {
   *     console.error("Cannot delete Bookmarks or History");
   *   }
   * }
   * ```
   */
  deleteList(listId: string): Promise<void>;

  // ========================================
  // Entity Operations
  // ========================================

  /**
   * Add an entity to a catalogue list
   *
   * Automatically assigns position to end of list if not specified.
   * Updates the parent list's `updatedAt` timestamp.
   * @param params - Entity addition parameters
   * @returns Promise resolving to the new entity record ID (UUID)
   * @throws {Error} If list not found, entity already exists, type mismatch, or add fails
   * @example
   * ```typescript
   * const entityRecordId = await provider.addEntityToList({
   *   listId: "a1b2c3d4-...",
   *   entityType: "works",
   *   entityId: "W2741809807",
   *   notes: "Cite in methodology section"
   * });
   * ```
   */
  addEntityToList(params: AddEntityParams): Promise<string>;

  /**
   * Get all entities in a list, sorted by position
   * @param listId - ID of the list
   * @returns Promise resolving to array of entities (empty if none exist)
   * @throws {Error} If storage operation fails
   * @example
   * ```typescript
   * const entities = await provider.getListEntities("a1b2c3d4-...");
   * entities.forEach((entity, index) => {
   *   console.log(`${index + 1}. ${entity.entityType}: ${entity.entityId}`);
   * });
   * ```
   */
  getListEntities(listId: string): Promise<CatalogueEntity[]>;

  /**
   * Remove an entity from a list
   *
   * Updates the parent list's `updatedAt` timestamp.
   * @param listId - ID of the list containing the entity
   * @param entityRecordId - ID of the catalogue entity record (not the OpenAlex entity ID)
   * @returns Promise resolving when removal completes
   * @throws {Error} If entity not found or removal fails
   * @example
   * ```typescript
   * await provider.removeEntityFromList("a1b2c3d4-...", "e1f2g3h4-...");
   * ```
   */
  removeEntityFromList(listId: string, entityRecordId: string): Promise<void>;

  /**
   * Update notes for an entity
   *
   * Updates the parent list's `updatedAt` timestamp.
   * @param entityRecordId - ID of the catalogue entity record
   * @param notes - New notes content (max 5000 characters)
   * @returns Promise resolving when update completes
   * @throws {Error} If entity not found or update fails
   * @example
   * ```typescript
   * await provider.updateEntityNotes("e1f2g3h4-...", "Key paper for literature review");
   * ```
   */
  updateEntityNotes(entityRecordId: string, notes: string): Promise<void>;

  /**
   * Add multiple entities to a list in a batch operation
   *
   * This operation is more efficient than multiple `addEntityToList()` calls.
   * Failures are handled gracefully - partial success is possible.
   * @param listId - ID of the list
   * @param entities - Array of entities to add
   * @returns Promise resolving to success/failed counts
   * @throws {Error} If list not found
   * @example
   * ```typescript
   * const result = await provider.addEntitiesToList("a1b2c3d4-...", [
   *   { entityType: "works", entityId: "W123", notes: "Paper 1" },
   *   { entityType: "works", entityId: "W456", notes: "Paper 2" },
   * ]);
   * console.log(`Added ${result.success}, failed ${result.failed}`);
   * ```
   */
  addEntitiesToList(
    listId: string,
    entities: Array<{
      entityType: EntityType;
      entityId: string;
      notes?: string;
    }>
  ): Promise<BatchAddResult>;

  /**
   * Reorder entities in a list by updating their positions
   *
   * Takes an ordered array of entity record IDs and updates their positions
   * to match the array order. This operation is atomic.
   * @param listId - ID of the list containing the entities
   * @param orderedEntityIds - Array of entity record IDs in the desired order
   * @returns Promise resolving when reorder completes
   * @throws {Error} If list not found, entity IDs invalid, or reorder fails
   * @example
   * ```typescript
   * // Move entity at index 2 to index 0
   * const entities = await provider.getListEntities("a1b2c3d4-...");
   * const reordered = [entities[2].id!, entities[0].id!, entities[1].id!, ...entities.slice(3).map(e => e.id!)];
   * await provider.reorderEntities("a1b2c3d4-...", reordered);
   * ```
   */
  reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void>;

  // ========================================
  // Search & Statistics Operations
  // ========================================

  /**
   * Search lists by title, description, or tags
   *
   * Case-insensitive search across all text fields.
   * @param query - Search query string
   * @returns Promise resolving to array of matching lists
   * @throws {Error} If search operation fails
   * @example
   * ```typescript
   * const results = await provider.searchLists("machine learning");
   * results.forEach(list => console.log(list.title));
   * ```
   */
  searchLists(query: string): Promise<CatalogueList[]>;

  /**
   * Get statistics about entities in a list
   * @param listId - ID of the list
   * @returns Promise resolving to entity count statistics
   * @throws {Error} If list not found or stats calculation fails
   * @example
   * ```typescript
   * const stats = await provider.getListStats("a1b2c3d4-...");
   * console.log(`Total: ${stats.totalEntities}`);
   * console.log(`Works: ${stats.entityCounts.works}`);
   * ```
   */
  getListStats(listId: string): Promise<ListStats>;

  // ========================================
  // Sharing Operations
  // ========================================

  /**
   * Generate a share token for a list
   *
   * Creates a share record with expiration (default: 1 year).
   * Updates the list to set `isPublic: true` and assign `shareToken`.
   * @param listId - ID of the list to share
   * @returns Promise resolving to the generated share token (UUID)
   * @throws {Error} If list not found or token generation fails
   * @example
   * ```typescript
   * const token = await provider.generateShareToken("a1b2c3d4-...");
   * const shareUrl = `https://app.example.com/shared/${token}`;
   * console.log(`Share URL: ${shareUrl}`);
   * ```
   */
  generateShareToken(listId: string): Promise<string>;

  /**
   * Get a list by its share token
   *
   * Automatically increments access count and updates last accessed timestamp.
   * Checks token expiration and returns valid=false if expired.
   * @param shareToken - The share token (UUID)
   * @returns Promise resolving to share access result
   * @throws {Error} If token lookup fails (but not if token doesn't exist)
   * @example
   * ```typescript
   * const result = await provider.getListByShareToken("f1e2d3c4-...");
   * if (result.valid && result.list) {
   *   console.log(`Viewing shared list: ${result.list.title}`);
   * } else {
   *   console.error("Invalid or expired share link");
   * }
   * ```
   */
  getListByShareToken(shareToken: string): Promise<ShareAccessResult>;

  // ========================================
  // Special System Lists Operations
  // ========================================

  /**
   * Initialize special system lists (Bookmarks, History)
   *
   * Creates system lists if they don't already exist.
   * Safe to call multiple times (idempotent).
   * @returns Promise resolving when initialization completes
   * @throws {Error} If initialization fails
   * @example
   * ```typescript
   * // Call on app startup
   * await provider.initializeSpecialLists();
   * ```
   */
  initializeSpecialLists(): Promise<void>;

  /**
   * Check if a list is a special system list
   *
   * System lists (Bookmarks, History) cannot be deleted or modified by users.
   * @param listId - ID of the list to check
   * @returns True if list is system-managed, false otherwise
   * @example
   * ```typescript
   * if (provider.isSpecialList(listId)) {
   *   console.warn("Cannot delete system list");
   * }
   * ```
   */
  isSpecialList(listId: string): boolean;

  /**
   * Add an entity to the Bookmarks system list
   *
   * Appends URL to notes for reference.
   * @param params - Bookmark parameters
   * @returns Promise resolving to the entity record ID
   * @throws {Error} If entity already bookmarked or add fails
   * @example
   * ```typescript
   * await provider.addBookmark({
   *   entityType: "works",
   *   entityId: "W2741809807",
   *   url: "https://openalex.org/W2741809807",
   *   title: "ML for Cultural Heritage",
   *   notes: "Important for Chapter 3"
   * });
   * ```
   */
  addBookmark(params: AddBookmarkParams): Promise<string>;

  /**
   * Remove an entity from the Bookmarks system list
   * @param entityRecordId - ID of the bookmark entity record
   * @returns Promise resolving when removal completes
   * @throws {Error} If bookmark not found or removal fails
   * @example
   * ```typescript
   * await provider.removeBookmark("e1f2g3h4-...");
   * ```
   */
  removeBookmark(entityRecordId: string): Promise<void>;

  /**
   * Get all bookmarked entities
   * @returns Promise resolving to array of bookmark entities
   * @throws {Error} If retrieval fails
   * @example
   * ```typescript
   * const bookmarks = await provider.getBookmarks();
   * console.log(`You have ${bookmarks.length} bookmarks`);
   * ```
   */
  getBookmarks(): Promise<CatalogueEntity[]>;

  /**
   * Check if an entity is bookmarked
   * @param entityType - Type of the entity
   * @param entityId - OpenAlex ID of the entity
   * @returns Promise resolving to true if bookmarked, false otherwise
   * @throws {Error} If check fails
   * @example
   * ```typescript
   * const isBookmarked = await provider.isBookmarked("works", "W2741809807");
   * if (isBookmarked) {
   *   console.log("Already bookmarked");
   * }
   * ```
   */
  isBookmarked(entityType: EntityType, entityId: string): Promise<boolean>;

  /**
   * Add an entity to the History system list
   *
   * Updates timestamp if entity already exists in history.
   * Appends URL and title to notes for reference.
   * @param params - History entry parameters
   * @returns Promise resolving to the entity record ID
   * @throws {Error} If add fails
   * @example
   * ```typescript
   * await provider.addToHistory({
   *   entityType: "works",
   *   entityId: "W2741809807",
   *   url: "https://app.example.com/works/W2741809807",
   *   title: "ML for Cultural Heritage"
   * });
   * ```
   */
  addToHistory(params: AddToHistoryParams): Promise<string>;

  /**
   * Get all history entries
   * @returns Promise resolving to array of history entities
   * @throws {Error} If retrieval fails
   * @example
   * ```typescript
   * const history = await provider.getHistory();
   * history.forEach(entry => {
   *   console.log(`${entry.entityType}: ${entry.entityId} at ${entry.addedAt}`);
   * });
   * ```
   */
  getHistory(): Promise<CatalogueEntity[]>;

  /**
   * Clear all browsing history
   *
   * Removes all entities from the History system list.
   * @returns Promise resolving when history is cleared
   * @throws {Error} If clear operation fails
   * @example
   * ```typescript
   * await provider.clearHistory();
   * console.log("History cleared");
   * ```
   */
  clearHistory(): Promise<void>;

  /**
   * Get all user-created lists (excludes Bookmarks and History)
   * @returns Promise resolving to array of non-system lists
   * @throws {Error} If retrieval fails
   * @example
   * ```typescript
   * const userLists = await provider.getNonSystemLists();
   * console.log(`You have ${userLists.length} custom lists`);
   * ```
   */
  getNonSystemLists(): Promise<CatalogueList[]>;

  // ========================================
  // Graph List Operations (Feature 038-graph-list)
  // ========================================

  /**
   * Get all nodes in the graph list
   *
   * Returns all nodes currently in the persistent graph working set.
   * Nodes are ordered by addedAt timestamp (newest first).
   * @returns Promise resolving to array of graph list nodes
   * @throws {Error} If retrieval fails
   * @example
   * ```typescript
   * const nodes = await provider.getGraphList();
   * console.log(`Graph contains ${nodes.length} nodes`);
   * nodes.forEach(node => {
   *   console.log(`${node.label} (${node.provenance})`);
   * });
   * ```
   */
  getGraphList(): Promise<GraphListNode[]>;

  /**
   * Add a node to the graph list
   *
   * Adds a new node to the persistent graph working set. If a node with the
   * same entityId already exists, updates its provenance to the most recent.
   * Enforces size limit (max 1000 nodes). Throws error if list is full.
   * @param params - Node parameters (entityId, entityType, label, provenance)
   * @returns Promise resolving to node ID
   * @throws {Error} If graph list is full (1000 nodes)
   * @throws {Error} If addition fails
   * @example
   * ```typescript
   * const nodeId = await provider.addToGraphList({
   *   entityId: 'W2741809807',
   *   entityType: 'works',
   *   label: 'Attention Is All You Need',
   *   provenance: 'user'
   * });
   * ```
   */
  addToGraphList(params: AddToGraphListParams): Promise<string>;

  /**
   * Remove a node from the graph list
   *
   * Removes a specific node from the persistent graph working set.
   * Also removes all edges connected to this node from the graph visualization.
   * No-op if node doesn't exist in graph list.
   * @param entityId - OpenAlex entity ID to remove
   * @returns Promise resolving when removal complete
   * @throws {Error} If removal fails
   * @example
   * ```typescript
   * await provider.removeFromGraphList('W2741809807');
   * console.log('Node and connected edges removed');
   * ```
   */
  removeFromGraphList(entityId: string): Promise<void>;

  /**
   * Clear all nodes from the graph list
   *
   * Removes all nodes from the persistent graph working set.
   * Also cancels any ongoing auto-population tasks.
   * Graph list will be empty after this operation.
   * @returns Promise resolving when clear complete
   * @throws {Error} If clear operation fails
   * @example
   * ```typescript
   * await provider.clearGraphList();
   * console.log('Graph list cleared');
   * ```
   */
  clearGraphList(): Promise<void>;

  /**
   * Get current size of graph list
   *
   * Returns the number of nodes currently in the graph list.
   * Used for size limit checks and warnings.
   * @returns Promise resolving to node count
   * @throws {Error} If size retrieval fails
   * @example
   * ```typescript
   * const size = await provider.getGraphListSize();
   * if (size >= 900) {
   *   console.warn(`Graph approaching size limit: ${size}/1000`);
   * }
   * ```
   */
  getGraphListSize(): Promise<number>;

  /**
   * Prune old auto-populated nodes
   *
   * Removes auto-populated nodes that are older than 24 hours.
   * User-added, collection-load, and expansion nodes are never pruned.
   * This is used to keep the graph list manageable and remove stale data.
   * @returns Promise resolving to prune result (count and IDs of removed nodes)
   * @throws {Error} If prune operation fails
   * @example
   * ```typescript
   * const result = await provider.pruneGraphList();
   * console.log(`Pruned ${result.removedCount} auto-populated nodes`);
   * ```
   */
  pruneGraphList(): Promise<PruneGraphListResult>;

  /**
   * Check if a node exists in the graph list
   *
   * Efficiently checks if a specific entity is in the graph list.
   * Useful for UI states (e.g., "In graph" badge).
   * @param entityId - OpenAlex entity ID to check
   * @returns Promise resolving to true if node exists in graph list
   * @throws {Error} If check fails
   * @example
   * ```typescript
   * const inGraph = await provider.isInGraphList('W2741809807');
   * if (inGraph) {
   *   console.log('Node is already in graph');
   * }
   * ```
   */
  isInGraphList(entityId: string): Promise<boolean>;

  /**
   * Batch add nodes to graph list
   *
   * Efficiently adds multiple nodes in a single transaction.
   * Skips nodes that already exist (updates provenance instead).
   * Respects size limit (stops adding when limit reached).
   * @param nodes - Array of nodes to add
   * @returns Promise resolving to array of added node IDs
   * @throws {Error} If batch operation fails
   * @example
   * ```typescript
   * const ids = await provider.batchAddToGraphList([
   *   { entityId: 'W1', entityType: 'works', label: 'Paper 1', provenance: 'expansion' },
   *   { entityId: 'W2', entityType: 'works', label: 'Paper 2', provenance: 'expansion' },
   * ]);
   * console.log(`Added ${ids.length} nodes`);
   * ```
   */
  batchAddToGraphList(nodes: AddToGraphListParams[]): Promise<string[]>;
}

/**
 * Factory function type for creating storage providers
 * @example
 * ```typescript
 * // Production: IndexedDB
 * const createIndexedDBProvider: StorageProviderFactory = (logger?) => {
 *   return new DexieStorageProvider(logger);
 * };
 *
 * // Testing: In-Memory
 * const createInMemoryProvider: StorageProviderFactory = () => {
 *   return new InMemoryStorageProvider();
 * };
 *
 * // Usage
 * const provider = createIndexedDBProvider(logger);
 * await provider.initializeSpecialLists();
 * ```
 */
export type StorageProviderFactory = (logger?: GenericLogger) => CatalogueStorageProvider;
