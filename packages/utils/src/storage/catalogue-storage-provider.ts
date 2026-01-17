/**
 * Storage Provider Interface for Catalogue Operations
 *
 * This interface defines the contract for catalogue storage providers.
 * Implementations can use different backends (IndexedDB, in-memory, remote API, etc.)
 * while maintaining consistent behavior for all catalogue operations.
 *
 * The interface is composed from several operation-specific sub-interfaces:
 * - ListOperationsInterface: CRUD for catalogue lists
 * - EntityOperationsInterface: Entity management within lists
 * - GraphListOperationsInterface: Graph working set operations
 * - GraphAnnotationOperationsInterface: Visual annotation operations
 * - GraphSnapshotOperationsInterface: Graph state snapshot operations
 * - SpecialListOperationsInterface: System list initialization
 * - BookmarkOperationsInterface: Bookmark operations
 * - HistoryOperationsInterface: Browsing history operations
 * - SearchHistoryOperationsInterface: Search query history operations
 *
 * @package
 * @see {@link https://github.com/joe/BibGraph/specs/001-storage-abstraction/spec.md}
 */

// Re-export types from storage-provider-types for backward compatibility

// Import sub-interfaces for composition
import type { EntityOperationsInterface } from './entity-operations-types.js';
import type {
  GraphAnnotationOperationsInterface,
  GraphListOperationsInterface,
  GraphSnapshotOperationsInterface,
} from './graph-operations-types.js';
import type { ListOperationsInterface } from './list-operations-types.js';
import type {
  BookmarkOperationsInterface,
  HistoryOperationsInterface,
  SearchHistoryOperationsInterface,
  SpecialListOperationsInterface,
} from './special-list-operations-types.js';

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
 *
 * @example
 * ```typescript
 * // Create and use a storage provider
 * const provider = new DexieStorageProvider(logger);
 * await provider.initializeSpecialLists();
 *
 * // Create a list
 * const listId = await provider.createList({
 *   title: "Cultural Heritage ML Papers",
 *   description: "Research papers for thesis Chapter 3",
 *   type: "bibliography",
 *   tags: ["machine-learning", "cultural-heritage"],
 * });
 *
 * // Add entities to the list
 * await provider.addEntityToList({
 *   listId,
 *   entityType: "works",
 *   entityId: "W2741809807",
 *   notes: "Cite in methodology section"
 * });
 *
 * // Search lists
 * const results = await provider.searchLists("machine learning");
 *
 * // Use graph list
 * await provider.addToGraphList({
 *   entityId: 'W2741809807',
 *   entityType: 'works',
 *   label: 'Attention Is All You Need',
 *   provenance: 'user'
 * });
 * ```
 */
export interface CatalogueStorageProvider
  extends ListOperationsInterface,
    EntityOperationsInterface,
    GraphListOperationsInterface,
    GraphAnnotationOperationsInterface,
    GraphSnapshotOperationsInterface,
    SpecialListOperationsInterface,
    BookmarkOperationsInterface,
    HistoryOperationsInterface,
    SearchHistoryOperationsInterface {}
