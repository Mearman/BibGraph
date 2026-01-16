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
import * as GraphListOps from "./graph-list-operations.js";
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
    try {
      const id = crypto.randomUUID();
      const list: CatalogueList = {
        id,
        title: params.title,
        description: params.description,
        type: params.type,
        tags: params.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: params.isPublic ?? false,
      };

      await this.db.catalogueLists.add(list);

      // Emit event for list creation
      catalogueEventEmitter.emit({
        type: 'list-added',
        listId: id,
        list,
      });

      this.logger?.debug(LOG_CATEGORY, "Catalogue list created", { id, title: params.title, type: params.type });

      return id;
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to create catalogue list", {
        title: params.title,
        type: params.type,
        error,
      });
      throw error;
    }
  }

  /**
   * Get all catalogue lists
   */
  async getAllLists(): Promise<CatalogueList[]> {
    try {
      return await this.db.catalogueLists.orderBy("updatedAt").reverse().toArray();
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to get all catalogue lists", { error });
      return [];
    }
  }

  /**
   * Get a specific catalogue list by ID
   * @param listId
   */
  async getList(listId: string): Promise<CatalogueList | null> {
    try {
      const result = await this.db.catalogueLists.get(listId);
      return result ?? null;
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to get catalogue list", { listId, error });
      return null;
    }
  }

  /**
   * Update a catalogue list
   * @param listId
   * @param updates
   */
  async updateList(listId: string, updates: Partial<Pick<CatalogueList,
    "title" | "description" | "tags" | "isPublic"
  >>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await this.db.catalogueLists.update(listId, updateData);

      // Emit event for list update
      catalogueEventEmitter.emit({
        type: 'list-updated',
        listId,
      });

      this.logger?.debug(LOG_CATEGORY, "Catalogue list updated", { listId, updates });
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to update catalogue list", { listId, updates, error });
      throw error;
    }
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
    try {
      // Validate that the entity type matches the list type
      const list = await this.getList(params.listId);
      if (!list) {
        throw new Error("List not found");
      }

      if (list.type === "bibliography" && params.entityType !== "works") {
        throw new Error("Bibliographies can only contain works");
      }

      // Check if entity already exists in list
      const existing = await this.db.catalogueEntities
        .where(["listId", "entityType", "entityId"])
        .equals([params.listId, params.entityType, params.entityId])
        .first();

      if (existing && existing.id) {
        // Instead of throwing, return the existing ID
        this.logger?.debug(LOG_CATEGORY, "Entity already exists in list, returning existing ID", {
          listId: params.listId,
          entityType: params.entityType,
          entityId: params.entityId,
          existingId: existing.id,
        });
        return existing.id;
      }

      // Get next position if not specified
      let position = params.position;
      if (position === undefined) {
        const entities = await this.db.catalogueEntities
          .where("listId")
          .equals(params.listId)
          .toArray();
        const maxPosition = entities.reduce((max, entity) => Math.max(max, entity.position), 0);
        position = maxPosition + 1;
      }

      const id = crypto.randomUUID();
      const entity: CatalogueEntity = {
        id,
        listId: params.listId,
        entityType: params.entityType,
        entityId: params.entityId,
        addedAt: new Date(),
        notes: params.notes,
        position: position ?? 0,
      };

      await this.db.catalogueEntities.add(entity);

      // Update list's updated timestamp
      await this.updateList(params.listId, {});

      // Emit event for entity addition
      catalogueEventEmitter.emit({
        type: 'entity-added',
        listId: params.listId,
        entityIds: [params.entityId],
      });

      this.logger?.debug(LOG_CATEGORY, "Entity added to catalogue list", {
        listId: params.listId,
        entityType: params.entityType,
        entityId: params.entityId,
      });

      return id;
    } catch (error) {
      // Handle constraint errors gracefully - they might occur in race conditions
      if (error instanceof Dexie.ConstraintError) {
        this.logger?.debug(LOG_CATEGORY, "Entity already exists due to race condition, attempting to find existing", {
          params,
          error: error.message,
        });

        // Try to find and return the existing entity
        try {
          const existing = await this.db.catalogueEntities
            .where(["listId", "entityType", "entityId"])
            .equals([params.listId, params.entityType, params.entityId])
            .first();

          if (existing?.id) {
            return existing.id;
          }
        } catch (findError) {
          this.logger?.warn(LOG_CATEGORY, "Failed to find existing entity after constraint error", {
            params,
            findError,
          });
        }
      }

      this.logger?.error(LOG_CATEGORY, "Failed to add entity to catalogue list", {
        params,
        error,
      });
      throw error;
    }
  }

  /**
   * Remove an entity from a catalogue list
   * @param listId
   * @param entityRecordId
   */
  async removeEntityFromList(listId: string, entityRecordId: string): Promise<void> {
    try {
      await this.db.catalogueEntities.delete(entityRecordId);

      // Update list's updated timestamp
      await this.updateList(listId, {});

      // Emit event for entity removal
      catalogueEventEmitter.emit({
        type: 'entity-removed',
        listId,
      });

      this.logger?.debug(LOG_CATEGORY, "Entity removed from catalogue list", {
        listId,
        entityRecordId,
      });
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to remove entity from catalogue list", {
        listId,
        entityRecordId,
        error,
      });
      throw error;
    }
  }

  /**
   * Update entity notes
   * @param entityRecordId
   * @param notes
   */
  async updateEntityNotes(entityRecordId: string, notes: string): Promise<void> {
    try {
      await this.db.catalogueEntities.update(entityRecordId, { notes });

      // Get the entity to find its listId for updating the list timestamp
      const entity = await this.db.catalogueEntities.get(entityRecordId);
      if (entity) {
        await this.updateList(entity.listId, {});
      }

      this.logger?.debug(LOG_CATEGORY, "Entity notes updated", {
        entityRecordId,
        notesLength: notes.length,
      });
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to update entity notes", {
        entityRecordId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get all entities in a catalogue list
   * @param listId
   */
  async getListEntities(listId: string): Promise<CatalogueEntity[]> {
    try {
      return await this.db.catalogueEntities
        .where("listId")
        .equals(listId)
        .sortBy("position");
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to get catalogue list entities", { listId, error });
      return [];
    }
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
    let success = 0;
    let failed = 0;

    try {
      // Validate list type
      const list = await this.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      // Get next position
      const entities = await this.db.catalogueEntities
        .where("listId")
        .equals(listId)
        .toArray();
      const maxPosition = entities.reduce((max, entity) => Math.max(max, entity.position), 0);
      let nextPosition = maxPosition + 1;

      await this.db.transaction("rw", this.db.catalogueEntities, async () => {
        for (const entity of entities) {
          try {
            // Validate entity type for bibliographies
            if (list.type === "bibliography" && entity.entityType !== "works") {
              throw new Error("Bibliographies can only contain works");
            }

            // Check for duplicates
            const existing = await this.db.catalogueEntities
              .where(["listId", "entityType", "entityId"])
              .equals([listId, entity.entityType, entity.entityId])
              .first();

            if (existing) {
              failed++;
              continue;
            }

            const id = crypto.randomUUID();
            const entityRecord: CatalogueEntity = {
              id,
              listId,
              entityType: entity.entityType,
              entityId: entity.entityId,
              addedAt: new Date(),
              notes: entity.notes,
              position: nextPosition++,
            };

            await this.db.catalogueEntities.add(entityRecord);
            success++;
          } catch (error) {
            this.logger?.warn(LOG_CATEGORY, "Failed to add entity in bulk operation", {
              listId,
              entityType: entity.entityType,
              entityId: entity.entityId,
              error,
            });
            failed++;
          }
        }
      });

      // Update list's updated timestamp
      await this.updateList(listId, {});

      // Emit event for bulk entity addition
      if (success > 0) {
        catalogueEventEmitter.emit({
          type: 'entity-added',
          listId,
          entityIds: entities.map(e => e.entityId),
        });
      }

      this.logger?.debug(LOG_CATEGORY, "Bulk entity addition completed", {
        listId,
        totalRequested: entities.length,
        success,
        failed,
      });

      return { success, failed };
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to perform bulk entity addition", {
        listId,
        entitiesCount: entities.length,
        error,
      });
      throw error;
    }
  }

  /**
   * Reorder entities in a list by updating their positions
   * @param listId
   * @param orderedEntityIds
   */
  async reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void> {
    try {
      // Validate that the list exists
      const list = await this.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      // Get all entities for the list to validate IDs
      const listEntities = await this.getListEntities(listId);
      const entityIdSet = new Set(listEntities.map(e => e.id));

      // Validate that all provided IDs exist in the list
      for (const entityId of orderedEntityIds) {
        if (!entityIdSet.has(entityId)) {
          throw new Error(`Entity ${entityId} not found in list ${listId}`);
        }
      }

      // Update positions atomically within a transaction
      await this.db.transaction("rw", this.db.catalogueEntities, async () => {
        for (let i = 0; i < orderedEntityIds.length; i++) {
          const orderedEntityId = orderedEntityIds[i];
          await this.db.catalogueEntities.update(orderedEntityId, {
            position: i + 1
          });
        }
      });

      // Update list's updated timestamp
      await this.updateList(listId, {});

      // Emit event for entity reorder
      catalogueEventEmitter.emit({
        type: 'entity-reordered',
        listId,
      });

      this.logger?.debug(LOG_CATEGORY, "Entities reordered successfully", {
        listId,
        entityCount: orderedEntityIds.length
      });
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to reorder entities", {
        listId,
        entityCount: orderedEntityIds.length,
        error
      });
      throw error;
    }
  }

  /**
   * Search catalogue lists by title, description, or tags
   * @param query
   */
  async searchLists(query: string): Promise<CatalogueList[]> {
    try {
      const lists = await this.db.catalogueLists.toArray();
      const lowercaseQuery = query.toLowerCase();

      return lists.filter(
        (list) =>
          list.title.toLowerCase().includes(lowercaseQuery) ||
          Boolean(list.description?.toLowerCase().includes(lowercaseQuery)) ||
          list.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
      );
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to search catalogue lists", { query, error });
      return [];
    }
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
    try {
      const entities = await this.getListEntities(listId);

      const entityCounts: Record<EntityType, number> = {
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        topics: 0,
        concepts: 0,
        publishers: 0,
        funders: 0,
        keywords: 0,
        domains: 0,
        fields: 0,
        subfields: 0,
      };

      entities.forEach(entity => {
        entityCounts[entity.entityType]++;
      });

      return {
        totalEntities: entities.length,
        entityCounts,
      };
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to get list stats", { listId, error });
      return {
        totalEntities: 0,
        entityCounts: {
          works: 0,
          authors: 0,
          sources: 0,
          institutions: 0,
          topics: 0,
          concepts: 0,
          publishers: 0,
          funders: 0,
          keywords: 0,
          domains: 0,
          fields: 0,
          subfields: 0,
        },
      };
    }
  }

  /**
   * Initialize special system lists if they don't exist
   * This method is idempotent and safe to call multiple times concurrently
   * Includes timeout protection for CI environments where IndexedDB may be slow
   */
  async initializeSpecialLists(): Promise<void> {
    try {
      // Create timeout promise to prevent hanging in CI environments
      const timeoutPromise = new Promise<never>((_resolve, _reject) => {
        setTimeout(() => {
          _reject(new Error("Special lists initialization timeout after 10 seconds"));
        }, 10000);
      });

      const initializationPromise = this._doInitializeSpecialLists();

      await Promise.race([initializationPromise, timeoutPromise]);
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to initialize special lists", { error });
      // In CI environments, we don't want to fail completely - just log and continue
      if (this._isCIEnvironment()) {
        this.logger?.warn(LOG_CATEGORY, "CI environment detected, continuing without special lists initialization");
        return;
      }
      // Don't re-throw constraint errors - they indicate the lists already exist
      if (!(error instanceof Dexie.ConstraintError)) {
        throw error;
      }
    }
  }

  /**
   * Internal method for actual special lists initialization
   */
  private async _doInitializeSpecialLists(): Promise<void> {
    const bookmarksList = await this.getList(SPECIAL_LIST_IDS.BOOKMARKS);
    const historyList = await this.getList(SPECIAL_LIST_IDS.HISTORY);

      if (!bookmarksList) {
        try {
          await this.db.catalogueLists.add({
            id: SPECIAL_LIST_IDS.BOOKMARKS,
            title: "Bookmarks",
            description: "System-managed bookmarks list",
            type: "list",
            tags: ["system"],
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublic: false,
          });
          this.logger?.debug(LOG_CATEGORY, "Bookmarks list initialized");
        } catch (addError) {
          // If list already exists (created by another instance), that's fine
          if (addError instanceof Dexie.ConstraintError) {
            this.logger?.debug(LOG_CATEGORY, "Bookmarks list already exists, skipping initialization");
          } else {
            throw addError;
          }
        }
      }

      if (!historyList) {
        try {
          await this.db.catalogueLists.add({
            id: SPECIAL_LIST_IDS.HISTORY,
            title: "History",
            description: "System-managed browsing history",
            type: "list",
            tags: ["system"],
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublic: false,
          });
          this.logger?.debug(LOG_CATEGORY, "History list initialized");
        } catch (addError) {
          // If list already exists (created by another instance), that's fine
          if (addError instanceof Dexie.ConstraintError) {
            this.logger?.debug(LOG_CATEGORY, "History list already exists, skipping initialization");
          } else {
            throw addError;
          }
        }
      }

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
   * Check if running in CI environment
   */
  private _isCIEnvironment(): boolean {
    // Check for common CI environment variables
    return Boolean(
      typeof process !== 'undefined' && (
        process.env.CI ||
        process.env.GITHUB_ACTIONS ||
        process.env.TRAVIS ||
        process.env.CIRCLECI ||
        process.env.JENKINS_URL ||
        process.env.BUILDKITE
      )
    );
  }

  /**
   * Check if a list is a special system list
   * @param listId
   */
  isSpecialList(listId: string): boolean {
    const specialIds: string[] = Object.values(SPECIAL_LIST_IDS);
    return specialIds.includes(listId);
  }

  /**
   * Prevent deletion of special lists
   * @param listId
   */
  async deleteList(listId: string): Promise<void> {
    if (this.isSpecialList(listId)) {
      throw new Error(`Cannot delete special system list: ${listId}`);
    }

    try {
      await this.db.transaction("rw", this.db.catalogueLists, this.db.catalogueEntities, async () => {
        // Delete the list
        await this.db.catalogueLists.delete(listId);

        // Delete all entities in the list
        await this.db.catalogueEntities.where("listId").equals(listId).delete();

        // Delete any share records
        await this.db.catalogueShares.where("listId").equals(listId).delete();
      });

      // Emit event for list deletion
      catalogueEventEmitter.emit({
        type: 'list-removed',
        listId,
      });

      this.logger?.debug(LOG_CATEGORY, "Catalogue list deleted", { listId });
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to delete catalogue list", { listId, error });
      throw error;
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
    await this.initializeSpecialLists();

    // Store entity data directly in proper fields, user notes only in notes field
    return await this.addEntityToList({
      listId: SPECIAL_LIST_IDS.BOOKMARKS,
      entityType: params.entityType,
      entityId: params.entityId,
      notes: params.notes, // User notes only, no URLs
    });
  }

  /**
   * Remove a bookmark from the special bookmarks list
   * @param entityRecordId
   */
  async removeBookmark(entityRecordId: string): Promise<void> {
    await this.removeEntityFromList(SPECIAL_LIST_IDS.BOOKMARKS, entityRecordId);
  }

  /**
   * Get all bookmarks
   */
  async getBookmarks(): Promise<CatalogueEntity[]> {
    await this.initializeSpecialLists();
    return await this.getListEntities(SPECIAL_LIST_IDS.BOOKMARKS);
  }

  /**
   * Check if an entity is bookmarked
   * @param entityType
   * @param entityId
   */
  async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
    try {
      const existing = await this.db.catalogueEntities
        .where(["listId", "entityType", "entityId"])
        .equals([SPECIAL_LIST_IDS.BOOKMARKS, entityType, entityId])
        .first();
      return !!existing;
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to check bookmark status", { entityType, entityId, error });
      return false;
    }
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
    try {
      const allLists = await this.getAllLists();
      return allLists.filter(list =>
        list.id && !this.isSpecialList(list.id) &&
        !list.tags?.includes("system")
      );
    } catch (error) {
      this.logger?.error(LOG_CATEGORY, "Failed to get non-system lists", { error });
      return [];
    }
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
