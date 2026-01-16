/**
 * Duplicate Detection Utilities
 *
 * Provides utilities for detecting duplicate entities within and across catalogue lists.
 * @package
 */

import type { CatalogueEntity } from './storage/catalogue-db/index.js';

/**
 * Key function for identifying duplicates
 * @param entity - The entity to generate a key for
 * @returns A unique key identifying the entity
 */
const entityKey = (entity: CatalogueEntity): string => {
  return `${entity.entityType}:${entity.entityId}`;
};

/**
 * Result of duplicate detection
 */
export interface DuplicateGroup {
  /** The canonical key for this duplicate group */
  key: string;
  /** All entities that are duplicates of each other */
  entities: CatalogueEntity[];
  /** Lists where these duplicates appear */
  listIds: string[];
  /** Number of duplicates in this group */
  count: number;
}

/**
 * Options for duplicate detection
 */
export interface DuplicateDetectionOptions {
  /** Whether to include entities with the same ID but different types (default: false) */
  crossType?: boolean;
  /** Minimum number of occurrences to consider as duplicate (default: 2) */
  minOccurrences?: number;
}

/**
 * Detect duplicate entities within a single list
 * @param entities - Entities to check for duplicates
 * @param options - Detection options
 * @returns Array of duplicate groups found
 */
export const detectDuplicatesInList = (
  entities: CatalogueEntity[],
  options: DuplicateDetectionOptions = {}
): DuplicateGroup[] => {
  const { crossType = false, minOccurrences = 2 } = options;

  // Group entities by their key
  const entityMap = new Map<string, CatalogueEntity[]>();

  for (const entity of entities) {
    const key = crossType
      ? entity.entityId // Only use entity ID, ignore type
      : entityKey(entity); // Use both type and ID

    if (!entityMap.has(key)) {
      entityMap.set(key, []);
    }
    const existing = entityMap.get(key);
    if (existing) {
      existing.push(entity);
    }
  }

  // Filter to only groups with duplicates
  const duplicates: DuplicateGroup[] = [];

  for (const [key, groupEntities] of entityMap.entries()) {
    if (groupEntities.length >= minOccurrences) {
      const listIds = new Set<string>();
      for (const entity of groupEntities) {
        if (entity.listId) {
          listIds.add(entity.listId);
        }
      }

      duplicates.push({
        key,
        entities: groupEntities,
        listIds: [...listIds],
        count: groupEntities.length,
      });
    }
  }

  // Sort by count (most duplicates first)
  return duplicates.sort((a, b) => b.count - a.count);
};

/**
 * Detect duplicate entities across multiple lists
 * @param listEntities - Map of list ID to entities in that list
 * @param options - Detection options
 * @returns Array of duplicate groups found
 */
export const detectDuplicatesAcrossLists = (
  listEntities: Map<string, CatalogueEntity[]>,
  options: DuplicateDetectionOptions = {}
): DuplicateGroup[] => {
  const { crossType = false, minOccurrences = 2 } = options;

  // Collect all entities with their list IDs
  const entityMap = new Map<string, Array<{ entity: CatalogueEntity; listId: string }>>();

  for (const [listId, entities] of listEntities.entries()) {
    for (const entity of entities) {
      const key = crossType
        ? entity.entityId
        : entityKey(entity);

      if (!entityMap.has(key)) {
        entityMap.set(key, []);
      }
      const existing = entityMap.get(key);
      if (existing) {
        existing.push({ entity, listId });
      }
    }
  }

  // Filter to only groups with duplicates across lists
  const duplicates: DuplicateGroup[] = [];

  for (const [key, items] of entityMap.entries()) {
    if (items.length >= minOccurrences) {
      const uniqueListIds = new Set(items.map(item => item.listId));

      // Only include if duplicates appear in multiple lists
      if (uniqueListIds.size >= 2) {
        duplicates.push({
          key,
          entities: items.map(item => item.entity),
          listIds: [...uniqueListIds],
          count: items.length,
        });
      }
    }
  }

  // Sort by count (most duplicates first)
  return duplicates.sort((a, b) => b.count - a.count);
};

/**
 * Calculate duplicate statistics for a list
 * @param entities - Entities to analyze
 * @returns Statistics about duplicates
 */
export interface DuplicateStats {
  /** Total number of entities */
  totalEntities: number;
  /** Number of unique entities (no duplicates) */
  uniqueEntities: number;
  /** Number of duplicate entities (counted with multiplicity) */
  duplicateCount: number;
  /** Number of entities that could be removed by deduplication */
  removableCount: number;
  /** Percentage of entities that are duplicates */
  duplicatePercentage: number;
}

export const calculateDuplicateStats = (
  entities: CatalogueEntity[]
): DuplicateStats => {
  const totalEntities = entities.length;
  const duplicates = detectDuplicatesInList(entities);

  // Count all entities involved in duplicate groups
  const duplicateEntities = duplicates.reduce((sum, group) => sum + group.count, 0);

  // Calculate how many could be removed (all but one from each group)
  const removableCount = duplicates.reduce((sum, group) => sum + (group.count - 1), 0);

  const uniqueEntities = totalEntities - removableCount;

  return {
    totalEntities,
    uniqueEntities,
    duplicateCount: duplicateEntities,
    removableCount,
    duplicatePercentage: totalEntities > 0
      ? (removableCount / totalEntities) * 100
      : 0,
  };
};

/**
 * Suggest entities to remove to eliminate duplicates
 * @param entities - Entities to analyze
 * @returns Array of entity record IDs that can be safely removed
 */
export const suggestDuplicateRemovals = (
  entities: CatalogueEntity[]
): string[] => {
  const duplicates = detectDuplicatesInList(entities);
  const toRemove: string[] = [];

  for (const group of duplicates) {
    // Keep the first one, mark the rest for removal
    for (let i = 1; i < group.entities.length; i++) {
      const entity = group.entities[i];
      if (entity.id) {
        toRemove.push(entity.id);
      }
    }
  }

  return toRemove;
};
