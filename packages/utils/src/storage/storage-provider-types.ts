/**
 * Storage Provider Types
 *
 * Parameter and result type definitions for CatalogueStorageProvider operations.
 * @package
 */

import type {
  EntityType,
} from '@bibgraph/types';

import type { GenericLogger } from '../logger.js';
import type {
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
 * Factory function type for creating storage providers
 */
export type StorageProviderFactory = (logger?: GenericLogger) => import('./catalogue-storage-provider.js').CatalogueStorageProvider;
