/**
 * Dexie-based entity cache database
 * Provides persistent browser storage for OpenAlex entity data
 */

import Dexie from "dexie";

import type { StaticEntityType } from "../../internal/static-data-utils";

// Constants
const DB_NAME = "bibgraph-entity-cache";
const DB_VERSION = 1;

/**
 * Cached entity record structure
 */
export interface CachedEntityRecord {
  /**
  Composite key: entityType:entityId
   */
  id: string;
  /**
  Entity type (author, work, etc.)
   */
  entityType: StaticEntityType;
  /**
  Entity ID (e.g., A123, W456)
   */
  entityId: string;
  /**
  Serialized entity data
   */
  data: string;
  /**
  When the entity was cached
   */
  cachedAt: number;
  /**
  When the entity was last accessed
   */
  lastAccessedAt: number;
  /**
  Number of times this entity has been accessed
   */
  accessCount: number;
  /**
  Size of the cached data in bytes
   */
  dataSize: number;
  /**
  Optional TTL in milliseconds (null = no expiration)
   */
  ttl: number | null;
}

/**
 * Cache metadata for statistics (renamed to avoid conflict with disk-writer.ts)
 */
export interface EntityCacheMetadata {
  id: string;
  key: string;
  value: string | number;
  updatedAt: number;
}

/**
 * Dexie database class for entity caching
 */
class EntityCacheDB extends Dexie {
  entities!: Dexie.Table<CachedEntityRecord, string>;
  metadata!: Dexie.Table<EntityCacheMetadata, string>;

  constructor() {
    super(DB_NAME);

    this.version(DB_VERSION).stores({
      // Primary key is composite id, with indexes for common queries
      entities: "id, entityType, entityId, cachedAt, lastAccessedAt, [entityType+entityId]",
      // Metadata for cache statistics
      metadata: "id, key",
    });
  }
}

// Singleton instance (lazily initialized)
let databaseInstance: EntityCacheDB | null = null;

/**
 * Check if IndexedDB is available in the current environment
 */
export const isIndexedDBAvailable = (): boolean => {
  try {
    // Check for browser environment and indexedDB availability
    return typeof globalThis !== "undefined" && "indexedDB" in globalThis;
  } catch {
    return false;
  }
};

/**
 * Get the database instance (lazy initialization)
 */
export const getEntityCacheDB = (): EntityCacheDB | null => {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  if (!databaseInstance) {
    try {
      databaseInstance = new EntityCacheDB();
    } catch (error) {
      console.error("Failed to initialize entity cache database:", error);
      return null;
    }
  }

  return databaseInstance;
};

/**
 * Close the database connection
 */
export const closeEntityCacheDB = (): void => {
  if (!databaseInstance) {
  	return;
  }

  databaseInstance.close();
  databaseInstance = null;
};

/**
 * Delete the entire entity cache database
 */
export const deleteEntityCacheDB = async (): Promise<void> => {
  closeEntityCacheDB();
  if (isIndexedDBAvailable()) {
    await Dexie.delete(DB_NAME);
  }
};

/**
 * Generate a composite cache key
 */
export const generateCacheKey = (entityType: StaticEntityType, entityId: string): string => `${entityType}:${entityId}`;

export { EntityCacheDB };
