/**
 * Catalogue Service
 * Main service class for managing catalogue lists and entities
 */

import type {
  AddToGraphListParams,
  EntityType,
  GraphListNode,
  PruneGraphListResult,
} from "@bibgraph/types";
import Dexie from "dexie";

import type { GenericLogger } from "../../logger.js";
import * as AnnotationOps from "./annotation-operations.js";
import * as BookmarkOps from "./bookmark-operations.js";
import * as EntityOps from "./entity-operations.js";
import * as GraphListOps from "./graph-list-operations.js";
import * as ListOps from "./list-operations.js";
import type {
  CatalogueEntity,
  CatalogueList,
  CatalogueShareRecord,
  GraphAnnotationStorage,
  GraphSnapshotStorage,
  ListType,
  SearchHistoryEntry,
} from "./index.js";
import { catalogueEventEmitter, CORRUPTED_ENTITY_ID_PATTERN,LOG_CATEGORY, SPECIAL_LIST_IDS } from "./index.js";
import type { CatalogueDB } from "./schema.js";
import { getDB } from "./schema.js";
import * as SearchHistoryOps from "./search-history-operations.js";
import * as SnapshotOps from "./snapshot-operations.js";

/**
 * Service for managing catalogue lists and entities
 */
export class CatalogueService {
  private db: CatalogueDB;
  private logger?: GenericLogger;

  constructor(logger?: GenericLogger) {
    this.db = getDB();
    this.logger = logger;
  }

  /**
   * Create a new catalogue list
   * @param params
   * @param params.title
   * @param params.description
   * @param params.type
   * @param params.tags
   * @param params.isPublic
   */
  async createList(params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<string> {
    return await ListOps.createList(this.db, params, this.logger);
  }

  /**
   * Get all catalogue lists
   */
  async getAllLists(): Promise<CatalogueList[]> {
    return await ListOps.getAllLists(this.db, this.logger);
  }

  /**
   * Get a specific catalogue list by ID
   * @param listId
   */
  async getList(listId: string): Promise<CatalogueList | null> {
    return await ListOps.getList(this.db, listId, this.logger);
  }

  /**
   * Update a catalogue list
   * @param listId
   * @param updates
   */
  async updateList(listId: string, updates: Partial<Pick<CatalogueList,
    "title" | "description" | "tags" | "isPublic"
  >>): Promise<void> {
    return await ListOps.updateList(this.db, listId, updates, this.logger);
  }

  
  /**
   * Add an entity to a catalogue list
   * @param params
   * @param params.listId
   * @param params.entityType
   * @param params.entityId
   * @param params.notes
   * @param params.position
   */
  async addEntityToList(params: {
    listId: string;
    entityType: EntityType;
    entityId: string;
    notes?: string;
    position?: number;
  }): Promise<string> {
    return await EntityOps.addEntityToList(
      this.db,
      this.getList.bind(this),
      this.updateList.bind(this),
      params,
      this.logger
    );
  }

  /**
   * Remove an entity from a catalogue list
   * @param listId
   * @param entityRecordId
   */
  async removeEntityFromList(listId: string, entityRecordId: string): Promise<void> {
    return await EntityOps.removeEntityFromList(this.db, this.updateList.bind(this), listId, entityRecordId, this.logger);
  }

  /**
   * Update entity notes
   * @param entityRecordId
   * @param notes
   */
  async updateEntityNotes(entityRecordId: string, notes: string): Promise<void> {
    return await EntityOps.updateEntityNotes(this.db, this.updateList.bind(this), entityRecordId, notes, this.logger);
  }

  /**
   * Get all entities in a catalogue list
   * @param listId
   */
  async getListEntities(listId: string): Promise<CatalogueEntity[]> {
    return await EntityOps.getListEntities(this.db, listId, this.logger);
  }

  /**
   * Add multiple entities to a catalogue list
   * @param listId
   * @param entities
   */
  async addEntitiesToList(listId: string, entities: Array<{
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }>): Promise<{ success: number; failed: number }> {
    return await EntityOps.addEntitiesToList(this.db, this.getList.bind(this), this.updateList.bind(this), listId, entities, this.logger);
  }

  /**
   * Reorder entities in a list by updating their positions
   * @param listId
   * @param orderedEntityIds
   */
  async reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void> {
    return await EntityOps.reorderEntities(this.db, this.getList.bind(this), this.getListEntities.bind(this), this.updateList.bind(this), listId, orderedEntityIds, this.logger);
  }

  /**
   * Search catalogue lists by title, description, or tags
   * @param query
   */
  async searchLists(query: string): Promise<CatalogueList[]> {
    return await ListOps.searchLists(this.db, query, this.logger);
  }

  /**
   * Generate a share token for a list
   * @param listId
   */
  async generateShareToken(listId: string): Promise<string> {
    try {
      const shareToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Expires in 1 year

      const shareRecord: CatalogueShareRecord = {
        id: crypto.randomUUID(),
        listId,
        shareToken,
        createdAt: new Date(),
        expiresAt,
        accessCount: 0,
      };

      await this.db.catalogueShares.add(shareRecord);

      // Update list with share token
      await this.db.catalogueLists.update(listId, { shareToken, isPublic: true });

      this.logger?.debug(LOG_CATEGORY, "Share token generated", { listId, shareToken });

      return shareToken;
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to generate share token", { listId, error });
      throw error;
    }
  }

  /**
   * Get list by share token
   * @param shareToken
   */
  async getListByShareToken(shareToken: string): Promise<{ list: CatalogueList | null; valid: boolean }> {
    try {
      const shareRecord = await this.db.catalogueShares.where("shareToken").equals(shareToken).first();

      if (!shareRecord) {
        return { list: null, valid: false };
      }

      // Check if share has expired
      if (shareRecord.expiresAt && shareRecord.expiresAt < new Date()) {
        return { list: null, valid: false };
      }

      // Update access count
      if (shareRecord.id) {
        await this.db.catalogueShares.update(shareRecord.id, {
          accessCount: shareRecord.accessCount + 1,
          lastAccessedAt: new Date(),
        });
      }

      const list = await this.getList(shareRecord.listId);
      return { list, valid: true };
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to get list by share token", { shareToken, error });
      return { list: null, valid: false };
    }
  }

  /**
   * Get list statistics
   * @param listId
   */
  async getListStats(listId: string): Promise<{
    totalEntities: number;
    entityCounts: Record<EntityType, number>;
  }> {
    return await ListOps.getListStats(this.db, listId, this.getListEntities.bind(this), this.logger);
  }

  /**
   * Initialize special system lists if they don't exist
   * This method is idempotent and safe to call multiple times concurrently
   * Includes timeout protection for CI environments where IndexedDB may be slow
   */
  async initializeSpecialLists(): Promise<void> {
    await ListOps.initializeSpecialLists(this.db, this.getList.bind(this), this.logger);

    // Also initialize graph list
    const graphList = await this.getList(SPECIAL_LIST_IDS.GRAPH);
    if (!graphList) {
      try {
        await this.db.catalogueLists.add({
          id: SPECIAL_LIST_IDS.GRAPH,
          title: "Graph",
          description: "System-managed graph working set",
          type: "list",
          tags: ["system"],
          createdAt: new Date(),
          updatedAt: new Date(),
          isPublic: false,
        });
        this.logger?.debug(LOG_CATEGORY, "Graph list initialized");
      } catch (addError) {
        // If list already exists (created by another instance), that's fine
        if (addError instanceof Dexie.ConstraintError) {
          this.logger?.debug(LOG_CATEGORY, "Graph list already exists, skipping initialization");
        } else {
          throw addError;
        }
      }
    }
  }

  /**
   * Add a bookmark to the special bookmarks list
   * @param params
   * @param params.entityType
   * @param params.entityId
   * @param params.notes
   */
  async addBookmark(params: {
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }): Promise<string> {
    return await BookmarkOps.addBookmark(
      this.db,
      this.initializeSpecialLists.bind(this),
      this.addEntityToList.bind(this),
      params,
      this.logger
    );
  }

  /**
   * Remove a bookmark from the special bookmarks list
   * @param entityRecordId
   */
  async removeBookmark(entityRecordId: string): Promise<void> {
    return await BookmarkOps.removeBookmark(this.removeEntityFromList.bind(this), entityRecordId);
  }

  /**
   * Get all bookmarks
   */
  async getBookmarks(): Promise<CatalogueEntity[]> {
    return await BookmarkOps.getBookmarks(
      this.db,
      this.initializeSpecialLists.bind(this),
      this.getListEntities.bind(this),
      this.logger
    );
  }

  /**
   * Check if an entity is bookmarked
   * @param entityType
   * @param entityId
   */
  async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
    return await BookmarkOps.isBookmarked(this.db, entityType, entityId, this.logger);
  }

  /**
   * Add a page to the special history list
   * @param params
   * @param params.entityType
   * @param params.entityId
   * @param params.url
   * @param params.title
   * @param params.timestamp
   */
  async addToHistory(params: {
    entityType: EntityType;
    entityId: string;
    url: string;
    title?: string;
    timestamp?: Date;
  }): Promise<string> {
    await this.initializeSpecialLists();

    // Check if this entity/page already exists in history
    const existing = await this.db.catalogueEntities
      .where(["listId", "entityType", "entityId"])
      .equals([SPECIAL_LIST_IDS.HISTORY, params.entityType, params.entityId])
      .first();

    if (existing && // Update existing record with new timestamp
      existing.id) {
        await this.db.catalogueEntities.update(existing.id, {
          addedAt: params.timestamp || new Date(),
          notes: `URL: ${params.url}${params.title ? `\nTitle: ${params.title}` : ''}`,
        });

        // Update list's updated timestamp
        await this.updateList(SPECIAL_LIST_IDS.HISTORY, {});

        return existing.id;
      }

    // Add new history entry
    const notes = `URL: ${params.url}${params.title ? `\nTitle: ${params.title}` : ''}`;

    return await this.addEntityToList({
      listId: SPECIAL_LIST_IDS.HISTORY,
      entityType: params.entityType,
      entityId: params.entityId,
      notes,
    });
  }

  /**
   * Get all history entries
   * Filters out corrupted entries and deduplicates to show only most recent visit per entity
   */
  async getHistory(): Promise<CatalogueEntity[]> {
    await this.initializeSpecialLists();
    const entities = await this.getListEntities(SPECIAL_LIST_IDS.HISTORY);

    // Runtime cleanup: filter out corrupted entries that may have been created after migration
    // Check both entityId and notes (which contains URL) for corruption patterns
    const urlEncodedPattern = "[object%20Object]";

    // Entity ID prefix to URL path mapping for validation
    const entityPrefixToPath: Record<string, string> = {
      W: "/works/",
      A: "/authors/",
      I: "/institutions/",
      S: "/sources/",
      P: "/publishers/",
      F: "/funders/",
      T: "/topics/",
      C: "/concepts/",
    };

    // Non-entity pages that shouldn't be validated against entity patterns
    const nonEntityPatterns = ["/about", "/settings", "/history", "/bookmarks", "/catalogue", "/search"];

    const validEntities = entities.filter((entity) => {
      if (entity.entityId.length === 0) return false;
      if (entity.entityId.includes(CORRUPTED_ENTITY_ID_PATTERN)) return false;
      if (entity.entityId.includes(urlEncodedPattern)) return false;
      // Also check notes for corrupted URLs
      if (entity.notes?.includes(CORRUPTED_ENTITY_ID_PATTERN)) return false;
      if (entity.notes?.includes(urlEncodedPattern)) return false;

      // Validate entityId/entityType matches URL path (detect race condition mismatches)
      const urlMatch = entity.notes?.match(/URL: ([^\n]+)/);
      if (urlMatch) {
        const url = urlMatch[1];

        // Skip validation for non-entity pages
        const isNonEntityUrl = nonEntityPatterns.some(pattern => url.includes(pattern));
        if (isNonEntityUrl) {
          return true;
        }

        // Validate entityType matches URL path
        // This catches race conditions where entity A's props were recorded with entity B's URL
        const entityTypeUrlPath = `/${entity.entityType}/`;
        if (!url.includes(entityTypeUrlPath)) {
          return false;
        }

        // Also validate entityId matches URL path for prefixed IDs
        const entityPrefix = entity.entityId.charAt(0).toUpperCase();
        const expectedPath = entityPrefixToPath[entityPrefix];
        if (expectedPath && !url.includes(expectedPath)) {
          return false;
        }
      }

      return true;
    });

    // Deduplicate: keep only the most recent entry per unique entityType+entityId
    // This handles cases where the compound index didn't prevent duplicates
    // (e.g., race conditions, slightly different entityType values)
    const seen = new Map<string, CatalogueEntity>();
    for (const entity of validEntities) {
      const key = `${entity.entityType}:${entity.entityId}`;
      const existing = seen.get(key);
      // Keep the entry with the most recent addedAt timestamp
      if (!existing || entity.addedAt > existing.addedAt) {
        seen.set(key, entity);
      }
    }

    return [...seen.values()];
  }

  /**
   * Clear history (remove all entries from history list)
   */
  async clearHistory(): Promise<void> {
    try {
      await this.db.catalogueEntities.where("listId").equals(SPECIAL_LIST_IDS.HISTORY).delete();

      // Update list's updated timestamp
      await this.updateList(SPECIAL_LIST_IDS.HISTORY, {});

      this.logger?.debug(LOG_CATEGORY, "History cleared");
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to clear history", { error });
      throw error;
    }
  }

  /**
   * Get special lists without the system tag
   */
  async getNonSystemLists(): Promise<CatalogueList[]> {
    return await ListOps.getNonSystemLists(this.db, ListOps.isSpecialList, this.logger);
  }

  // ========== Graph List Operations (Feature 038-graph-list) ==========

  /**
   * Get all nodes in the graph list
   */
  async getGraphList(): Promise<GraphListNode[]> {
    return await GraphListOps.getGraphList(this.db, this.logger);
  }

  /**
   * Add a node to the graph list
   * @param params
   */
  async addToGraphList(params: AddToGraphListParams): Promise<string> {
    return await GraphListOps.addToGraphList(this.db, params, this.logger);
  }

  /**
   * Remove a node from the graph list
   * @param entityId
   */
  async removeFromGraphList(entityId: string): Promise<void> {
    await GraphListOps.removeFromGraphList(this.db, entityId, this.logger);
  }

  /**
   * Clear all nodes from the graph list
   */
  async clearGraphList(): Promise<void> {
    await GraphListOps.clearGraphList(this.db, this.logger);
  }

  /**
   * Get current size of graph list
   */
  async getGraphListSize(): Promise<number> {
    return await GraphListOps.getGraphListSize(this.db);
  }

  /**
   * Prune old auto-populated nodes
   */
  async pruneGraphList(): Promise<PruneGraphListResult> {
    return await GraphListOps.pruneGraphList(this.db, this.logger);
  }

  /**
   * Check if a node exists in the graph list
   * @param entityId
   */
  async isInGraphList(entityId: string): Promise<boolean> {
    return await GraphListOps.isInGraphList(this.db, entityId);
  }

  /**
   * Batch add nodes to graph list
   * @param nodes
   */
  async batchAddToGraphList(nodes: AddToGraphListParams[]): Promise<string[]> {
    return await GraphListOps.batchAddToGraphList(this.db, nodes, this.logger);
  }

  /**
   * Add search query to history with FIFO eviction
   * @param query Search query text
   * @param maxHistory Maximum entries to keep (default: 50)
   */
  async addSearchQuery(query: string, maxHistory = 50): Promise<void> {
    await SearchHistoryOps.addSearchQuery(this.db, query, maxHistory, this.logger);
  }

  /**
   * Get all search history entries ordered by timestamp (newest first)
   */
  async getSearchHistory(): Promise<SearchHistoryEntry[]> {
    return await SearchHistoryOps.getSearchHistory(this.db, this.logger);
  }

  /**
   * Remove search query from history
   * @param id Entry ID to remove
   */
  async removeSearchQuery(id: string): Promise<void> {
    await SearchHistoryOps.removeSearchQuery(this.db, id, this.logger);
  }

  /**
   * Clear all search history
   */
  async clearSearchHistory(): Promise<void> {
    await SearchHistoryOps.clearSearchHistory(this.db, this.logger);
  }

  // ========== Graph Annotation Operations ==========

  /**
   * Add a graph annotation
   * @param annotation Annotation data (id will be generated if not provided)
   */
  async addAnnotation(annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await AnnotationOps.addAnnotation(this.db, annotation, this.logger);
  }

  /**
   * Get all annotations for a specific graph (or all annotations if no graphId provided)
   * @param graphId Optional graph ID to filter annotations
   */
  async getAnnotations(graphId?: string): Promise<GraphAnnotationStorage[]> {
    return await AnnotationOps.getAnnotations(this.db, graphId, this.logger);
  }

  /**
   * Get a single annotation by ID
   * @param id Annotation ID
   */
  async getAnnotation(id: string): Promise<GraphAnnotationStorage | null> {
    return await AnnotationOps.getAnnotation(this.db, id, this.logger);
  }

  /**
   * Update an existing annotation
   * @param id Annotation ID
   * @param updates Fields to update
   */
  async updateAnnotation(id: string, updates: Partial<Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    await AnnotationOps.updateAnnotation(this.db, id, updates, this.logger);
  }

  /**
   * Delete an annotation
   * @param id Annotation ID
   */
  async deleteAnnotation(id: string): Promise<void> {
    await AnnotationOps.deleteAnnotation(this.db, id, this.logger);
  }

  /**
   * Delete all annotations for a specific graph
   * @param graphId Graph ID
   */
  async deleteAnnotationsByGraph(graphId: string): Promise<void> {
    await AnnotationOps.deleteAnnotationsByGraph(this.db, graphId, this.logger);
  }

  /**
   * Toggle annotation visibility
   * @param id Annotation ID
   * @param visible New visibility state
   */
  async toggleAnnotationVisibility(id: string, visible: boolean): Promise<void> {
    await AnnotationOps.toggleAnnotationVisibility(this.db, id, visible, this.logger);
  }

  /**
   * Create a new graph snapshot
   * @param snapshot Snapshot data (without id, timestamps)
   * @returns Snapshot ID
   */
  async addSnapshot(snapshot: Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await SnapshotOps.addSnapshot(this.db, snapshot, this.logger);
  }

  /**
   * Get all snapshots
   * @returns All snapshots
   */
  async getSnapshots(): Promise<GraphSnapshotStorage[]> {
    return await SnapshotOps.getSnapshots(this.db, this.logger);
  }

  /**
   * Get a specific snapshot by ID
   * @param id Snapshot ID
   * @returns Snapshot or null if not found
   */
  async getSnapshot(id: string): Promise<GraphSnapshotStorage | null> {
    return await SnapshotOps.getSnapshot(this.db, id, this.logger);
  }

  /**
   * Update an existing snapshot
   * @param id Snapshot ID
   * @param updates Fields to update
   */
  async updateSnapshot(id: string, updates: Partial<Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    await SnapshotOps.updateSnapshot(this.db, id, updates, this.logger);
  }

  /**
   * Delete a snapshot
   * @param id Snapshot ID
   */
  async deleteSnapshot(id: string): Promise<void> {
    await SnapshotOps.deleteSnapshot(this.db, id, this.logger);
  }

  /**
   * Delete old auto-saved snapshots, keeping only the most recent N
   * @param keep Number of auto-saved snapshots to keep (default: 5)
   */
  async pruneAutoSaveSnapshots(keep = 5): Promise<void> {
    await SnapshotOps.pruneAutoSaveSnapshots(this.db, keep, this.logger);
  }

  /**
   * Get snapshot by share token
   * @param shareToken Share token
   * @returns Snapshot or null if not found
   */
  async getSnapshotByShareToken(shareToken: string): Promise<GraphSnapshotStorage | null> {
    return await SnapshotOps.getSnapshotByShareToken(this.db, shareToken, this.logger);
  }
}


// Export singleton instance
export const catalogueService: CatalogueService = new CatalogueService();
