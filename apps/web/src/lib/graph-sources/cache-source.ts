/**
 * Cache-based Graph Data Sources
 *
 * Provides graph data sources from the IndexedDB and memory caches. Since entities are already cached, fetching their data is instant.
 */

import {
  cachedOpenAlex,
  getAuthorById,
  getFunderById,
  getInstitutionById,
  getPublisherById,
  getSourceById,
  getTopicById,
  getWorkById,
} from '@bibgraph/client';
import type { EntityType } from '@bibgraph/types';
import type {
  GraphDataSource,
  GraphSourceEntity,
} from '@bibgraph/utils';
import {
  extractEntityLabel,
  extractRelationships,
  logger,
  normalizeOpenAlexId,
} from '@bibgraph/utils';

/**
 * Map StaticEntityType to EntityType
 * StaticEntityType is a subset used by the cache
 */
const VALID_ENTITY_TYPES: readonly string[] = [
  'works', 'authors', 'sources', 'institutions',
  'topics', 'publishers', 'funders', 'concepts',
  'keywords', 'domains', 'fields', 'subfields',
] satisfies readonly EntityType[];

const isEntityType = (staticType: string): staticType is EntityType =>
  VALID_ENTITY_TYPES.includes(staticType);

const staticToEntityType = (staticType: string): EntityType | null =>
  isEntityType(staticType) ? staticType : null;

/**
 * Fetch entity data - will be a cache hit since we're loading from cache
 */
const fetchEntityData = async (entityType: EntityType, entityId: string): Promise<Record<string, unknown> | null> => {
  try {
    switch (entityType) {
      case 'works':
        return await getWorkById(entityId);
      case 'authors':
        return await getAuthorById(entityId);
      case 'institutions':
        return await getInstitutionById(entityId);
      case 'sources':
        return await getSourceById(entityId);
      case 'topics':
        return await getTopicById(entityId);
      case 'funders':
        return await getFunderById(entityId);
      case 'publishers':
        return await getPublisherById(entityId);
      case 'concepts':
      case 'keywords':
      case 'domains':
      case 'fields':
      case 'subfields':
      default:
        return null;
    }
  } catch (error) {
    logger.debug('cache-source', `Failed to fetch ${entityType} ${entityId}`, { error });
    return null;
  }
};

/**
 * Create a graph data source from the IndexedDB cache
 */
export const createIndexedDBCacheSource = (): GraphDataSource => {
  const sourceId = 'cache:indexeddb';

  return {
    id: sourceId,
    label: 'IndexedDB Cache',
    category: 'cache',
    description: 'Entities cached in browser IndexedDB (persistent)',

    getEntities: async (): Promise<GraphSourceEntity[]> => {
      const entries = await cachedOpenAlex.enumerateIndexedDBEntities();
      const results: GraphSourceEntity[] = [];

      // Process in batches to avoid overwhelming the browser
      const batchSize = 50;
      for (let index = 0; index < entries.length; index += batchSize) {
        const batch = entries.slice(index, index + batchSize);

        const fetchPromises = batch.map(async (entry) => {
          const entityType = staticToEntityType(entry.entityType);
          if (!entityType) return null;

          const entityData = await fetchEntityData(entityType, entry.entityId);
          if (!entityData) return null;

          const normalizedId = normalizeOpenAlexId(entry.entityId);
          const label = extractEntityLabel(entityType, normalizedId, entityData);
          const relationships = extractRelationships(entityType, entityData);

          return {
            entityType,
            entityId: normalizedId,
            label,
            entityData: {
              ...entityData,
              _cachedAt: entry.cachedAt,
              _lastAccessedAt: entry.lastAccessedAt,
              _accessCount: entry.accessCount,
            },
            sourceId,
            relationships,
          } satisfies GraphSourceEntity;
        });

        const fetched = await Promise.all(fetchPromises);
        for (const result of fetched) {
          if (result) results.push(result);
        }
      }

      return results;
    },

    getEntityCount: async (): Promise<number> => {
      const entries = await cachedOpenAlex.enumerateIndexedDBEntities();
      return entries.length;
    },

    isAvailable: async (): Promise<boolean> => {
      await Promise.resolve();
      return typeof indexedDB !== 'undefined';
    },
  };
};

/**
 * Create a graph data source from the memory cache
 */
export const createMemoryCacheSource = (): GraphDataSource => {
  const sourceId = 'cache:memory';

  return {
    id: sourceId,
    label: 'Memory Cache',
    category: 'cache',
    description: 'Entities cached in memory (session only)',

    getEntities: async (): Promise<GraphSourceEntity[]> => {
      const entries = cachedOpenAlex.enumerateMemoryCacheEntities();
      const results: GraphSourceEntity[] = [];

      const fetchPromises = entries.map(async (entry) => {
        const entityType = staticToEntityType(entry.entityType);
        if (!entityType) return null;

        const entityData = await fetchEntityData(entityType, entry.entityId);
        if (!entityData) return null;

        const normalizedId = normalizeOpenAlexId(entry.entityId);
        const label = extractEntityLabel(entityType, normalizedId, entityData);
        const relationships = extractRelationships(entityType, entityData);

        return {
          entityType,
          entityId: normalizedId,
          label,
          entityData: {
            ...entityData,
            _cachedAt: entry.cachedAt,
            _accessCount: entry.accessCount,
          },
          sourceId,
          relationships,
        } satisfies GraphSourceEntity;
      });

      const fetched = await Promise.all(fetchPromises);
      for (const result of fetched) {
        if (result) results.push(result);
      }

      return results;
    },

    getEntityCount: async (): Promise<number> => {
      await Promise.resolve();
      return cachedOpenAlex.getMemoryCacheSize();
    },

    isAvailable: async (): Promise<boolean> => {
      await Promise.resolve();
      return true;
    },
  };
};

/**
 * Create a graph data source from the static cache (GitHub Pages)
 */
export const createStaticCacheSource = (): GraphDataSource => {
  const sourceId = 'cache:static';

  return {
    id: sourceId,
    label: 'Static Cache',
    category: 'cache',
    description: 'Pre-cached entities from static files',

    getEntities: async (): Promise<GraphSourceEntity[]> => {
      const entries = await cachedOpenAlex.enumerateStaticCacheEntities();
      const results: GraphSourceEntity[] = [];

      // Process in batches
      const batchSize = 50;
      for (let index = 0; index < entries.length; index += batchSize) {
        const batch = entries.slice(index, index + batchSize);

        const fetchPromises = batch.map(async (entry) => {
          const entityType = staticToEntityType(entry.entityType);
          if (!entityType) return null;

          const entityData = await fetchEntityData(entityType, entry.entityId);
          if (!entityData) return null;

          const normalizedId = normalizeOpenAlexId(entry.entityId);
          const label = extractEntityLabel(entityType, normalizedId, entityData);
          const relationships = extractRelationships(entityType, entityData);

          return {
            entityType,
            entityId: normalizedId,
            label,
            entityData,
            sourceId,
            relationships,
          } satisfies GraphSourceEntity;
        });

        const fetched = await Promise.all(fetchPromises);
        for (const result of fetched) {
          if (result) results.push(result);
        }
      }

      return results;
    },

    getEntityCount: async (): Promise<number> => {
      const entries = await cachedOpenAlex.enumerateStaticCacheEntities();
      return entries.length;
    },

    isAvailable: async (): Promise<boolean> => {
      await Promise.resolve();
      const config = cachedOpenAlex.getStaticCacheTierConfig();
      return config.gitHubPages.isConfigured || config.localStatic.isAvailable;
    },
  };
};
