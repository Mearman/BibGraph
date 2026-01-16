/**
 * Catalogue Database Schema and Migrations
 * Dexie database definition with version migrations
 */

import Dexie from "dexie";

import type {
  CatalogueEntity,
  CatalogueList,
  CatalogueShareRecord,
  GraphAnnotationStorage,
  GraphSnapshotStorage,
  SearchHistoryEntry,
} from "./index.js";
import { CORRUPTED_ENTITY_ID_PATTERN, DB_NAME } from "./index.js";

/**
 * Catalogue database class
 * Defines IndexedDB schema and handles migrations
 */
class CatalogueDB extends Dexie {
  catalogueLists!: Dexie.Table<CatalogueList, string>;
  catalogueEntities!: Dexie.Table<CatalogueEntity, string>;
  catalogueShares!: Dexie.Table<CatalogueShareRecord, string>;
  searchHistory!: Dexie.Table<SearchHistoryEntry, string>;
  annotations!: Dexie.Table<GraphAnnotationStorage, string>;
  snapshots!: Dexie.Table<GraphSnapshotStorage, string>;

  constructor() {
    super(DB_NAME);

    // T076: Optimized indexes for common query patterns
    this.version(1).stores({
      catalogueLists: "id, title, type, createdAt, updatedAt, isPublic, shareToken, *tags",
      // Added compound index [listId+position] for efficient reordering and sorted entity retrieval
      // Added compound index [listId+entityType+entityId] for duplicate detection
      catalogueEntities: "id, listId, entityType, entityId, addedAt, position, [listId+position], [listId+entityType+entityId]",
      catalogueShares: "id, listId, shareToken, createdAt, expiresAt",
    });

    // Migration v2: Clean up corrupted history entries containing [object Object]
    // This fixes data corruption from the useNavigationEnhancements.ts bug where
    // TanStack Router's location.search (an object) was concatenated with strings
    this.version(2)
      .stores({
        // Same schema as v1 - no structural changes
        catalogueLists: "id, title, type, createdAt, updatedAt, isPublic, shareToken, *tags",
        catalogueEntities: "id, listId, entityType, entityId, addedAt, position, [listId+position], [listId+entityType+entityId]",
        catalogueShares: "id, listId, shareToken, createdAt, expiresAt",
      })
      .upgrade(async (tx) => {
        const entities = tx.table("catalogueEntities");
        const corruptedEntries = await entities
          .filter((entity: CatalogueEntity) =>
            entity.entityId.includes(CORRUPTED_ENTITY_ID_PATTERN)
          )
          .toArray();

        if (corruptedEntries.length > 0) {
          const corruptedIds = corruptedEntries
            .map((e: CatalogueEntity) => e.id)
            .filter((id): id is string => id !== undefined);

          await entities.bulkDelete(corruptedIds);

          // Log cleanup (console.log since logger not available in migration context)
          console.log(
            `[catalogue-db] Migration v2: Cleaned up ${corruptedIds.length} corrupted history entries`
          );
        }
      });

    // Migration v3: Add search history table
    this.version(3)
      .stores({
        // Same schema as v2
        catalogueLists: "id, title, type, createdAt, updatedAt, isPublic, shareToken, *tags",
        catalogueEntities: "id, listId, entityType, entityId, addedAt, position, [listId+position], [listId+entityType+entityId]",
        catalogueShares: "id, listId, shareToken, createdAt, expiresAt",
        // New search history table
        searchHistory: "id, query, timestamp",
      })
      .upgrade(async () => {
        // No data migration needed - this is a new table
        console.log('[catalogue-db] Migration v3: Added search history table');
      });

    // Migration v4: Add graph annotations table
    this.version(4)
      .stores({
        // Same schema as v3
        catalogueLists: "id, title, type, createdAt, updatedAt, isPublic, shareToken, *tags",
        catalogueEntities: "id, listId, entityType, entityId, addedAt, position, [listId+position], [listId+entityType+entityId]",
        catalogueShares: "id, listId, shareToken, createdAt, expiresAt",
        searchHistory: "id, query, timestamp",
        // New annotations table with indexes for querying by graph and type
        annotations: "id, type, createdAt, updatedAt, visible, graphId, nodeId",
      })
      .upgrade(async () => {
        // No data migration needed - this is a new table
        console.log('[catalogue-db] Migration v4: Added graph annotations table');
      });

    // Migration v5: Add graph snapshots table
    this.version(5)
      .stores({
        // Same schema as v4
        catalogueLists: "id, title, type, createdAt, updatedAt, isPublic, shareToken, *tags",
        catalogueEntities: "id, listId, entityType, entityId, addedAt, position, [listId+position], [listId+entityType+entityId]",
        catalogueShares: "id, listId, shareToken, createdAt, expiresAt",
        searchHistory: "id, query, timestamp",
        annotations: "id, type, createdAt, updatedAt, visible, graphId, nodeId",
        // New snapshots table with indexes for querying and auto-save management
        snapshots: "id, name, createdAt, updatedAt, isAutoSave, shareToken",
      })
      .upgrade(async () => {
        // No data migration needed - this is a new table
        console.log('[catalogue-db] Migration v5: Added graph snapshots table');
      });
  }
}

// Singleton instance
let dbInstance: CatalogueDB | null = null;

export const getDB = (): CatalogueDB => {
  dbInstance ??= new CatalogueDB();
  return dbInstance;
};

export { CatalogueDB };
