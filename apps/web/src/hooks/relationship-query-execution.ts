/**
 * API query execution for entity relationship queries
 * Handles fetching related entities from the OpenAlex API
 * @module relationship-query-execution
 */

import {
  getAuthors,
  getFunderById,
  getFunders,
  getInstitutions,
  getPublisherById,
  getPublishers,
  getSources,
  getTopicById,
  getTopics,
  getWorks,
} from '@bibgraph/client';
import type { EntityType, RelationshipQueryConfig } from '@bibgraph/types';

import { DEFAULT_PAGE_SIZE } from '@/types/relationship';

import type { RelationshipQueryResult } from './relationship-query-types';

/**
 * Parse a filter string like "key:value" into an object { key: value }
 * Used to convert filter strings for API functions that expect filter objects
 * @param filterString
 */
const parseFilterStringToObject = (filterString: string): Record<string, string> => {
  const colonIndex = filterString.indexOf(':');
  if (colonIndex === -1) return {};
  const key = filterString.slice(0, colonIndex);
  const value = filterString.slice(colonIndex + 1);
  return { [key]: value };
};

/**
 * Execute API-based relationship query
 * @param entityId
 * @param config
 * @param page
 * @param customPageSize
 */
const executeApiQuery = async (
  entityId: string,
  config: RelationshipQueryConfig & { source: 'api' },
  page: number,
  customPageSize?: number,
): Promise<RelationshipQueryResult> => {
  const filter = config.buildFilter(entityId);
  const pageSize = customPageSize ?? config.pageSize ?? DEFAULT_PAGE_SIZE;

  let response;
  switch (config.targetType) {
    case 'works':
      response = await getWorks({
        filter,
        per_page: pageSize,
        page,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'authors':
      response = await getAuthors({
        filter,
        per_page: pageSize,
        page,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'sources':
      response = await getSources({
        filters: parseFilterStringToObject(filter),
        per_page: pageSize,
        page,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'institutions':
      response = await getInstitutions({
        filters: parseFilterStringToObject(filter),
        per_page: pageSize,
        page,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'topics':
      response = await getTopics({
        filters: parseFilterStringToObject(filter),
        per_page: pageSize,
        page,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'publishers':
      response = await getPublishers({
        filters: parseFilterStringToObject(filter),
        per_page: pageSize,
        page,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'funders':
      response = await getFunders({
        filter,
        per_page: pageSize,
        page,
        ...(config.select && { select: config.select }),
      });
      break;
    default:
      throw new Error(`Unsupported target type: ${config.targetType}`);
  }

  return {
    results: response.results,
    totalCount: response.meta.count,
    page: response.meta.page || page,
    perPage: response.meta.per_page,
  };
};

/**
 * Fetch entity data for embedded extraction
 * @param entityId
 * @param entityType
 */
const fetchEntityForEmbedded = async (
  entityId: string,
  entityType: EntityType,
): Promise<Record<string, unknown>> => {
  switch (entityType) {
    case 'works': {
      const response = await getWorks({
        filter: `openalex_id:${entityId}`,
        per_page: 1,
        page: 1,
      });
      if (response.results.length === 0) {
        throw new Error(`Entity not found: ${entityId}`);
      }
      return response.results[0] as Record<string, unknown>;
    }
    case 'authors': {
      const response = await getAuthors({
        filter: `openalex_id:${entityId}`,
        per_page: 1,
        page: 1,
      });
      if (response.results.length === 0) {
        throw new Error(`Entity not found: ${entityId}`);
      }
      return response.results[0] as Record<string, unknown>;
    }
    case 'sources': {
      const response = await getSources({
        filters: { id: entityId },
        per_page: 1,
        page: 1,
      });
      if (response.results.length === 0) {
        throw new Error(`Entity not found: ${entityId}`);
      }
      return response.results[0] as Record<string, unknown>;
    }
    case 'institutions': {
      const response = await getInstitutions({
        filters: { id: entityId },
        per_page: 1,
        page: 1,
      });
      if (response.results.length === 0) {
        throw new Error(`Entity not found: ${entityId}`);
      }
      return response.results[0] as Record<string, unknown>;
    }
    case 'topics': {
      const topic = await getTopicById(entityId);
      return topic as Record<string, unknown>;
    }
    case 'publishers': {
      const publisher = await getPublisherById(entityId);
      return publisher as Record<string, unknown>;
    }
    case 'funders': {
      const funder = await getFunderById(entityId);
      return funder as Record<string, unknown>;
    }
    default:
      throw new Error(`Unsupported entity type for embedded extraction: ${entityType}`);
  }
};

/**
 * Execute embedded data extraction query
 * @param entityId
 * @param entityType
 * @param config
 */
const executeEmbeddedQuery = async (
  entityId: string,
  entityType: EntityType,
  config: RelationshipQueryConfig & { source: 'embedded' },
): Promise<RelationshipQueryResult> => {
  const entityData = await fetchEntityForEmbedded(entityId, entityType);
  const embeddedItems = config.extractEmbedded(entityData);

  const results = embeddedItems.map((item) => ({
    id: item.id,
    display_name: item.displayName,
    ...item.metadata,
  }));

  return {
    results,
    totalCount: results.length,
    page: 1,
    perPage: results.length,
  };
};

/**
 * Execute embedded data with resolution query (IDs only, need to fetch display names)
 * @param entityId
 * @param entityType
 * @param config
 */
const executeEmbeddedWithResolutionQuery = async (
  entityId: string,
  entityType: EntityType,
  config: RelationshipQueryConfig & { source: 'embedded-with-resolution' },
): Promise<RelationshipQueryResult> => {
  // Fetch the entity data to extract IDs from
  let entityData: Record<string, unknown>;

  switch (entityType) {
    case 'institutions': {
      const response = await getInstitutions({
        filters: { id: entityId },
        per_page: 1,
        page: 1,
      });
      if (response.results.length === 0) {
        throw new Error(`Entity not found: ${entityId}`);
      }
      entityData = response.results[0] as Record<string, unknown>;
      break;
    }
    default:
      throw new Error(`Unsupported entity type for embedded-with-resolution: ${entityType}`);
  }

  // Extract IDs that need resolution
  const itemsNeedingResolution = config.extractIds(entityData);

  if (itemsNeedingResolution.length === 0) {
    return {
      results: [],
      totalCount: 0,
      page: 1,
      perPage: 0,
    };
  }

  // Batch-fetch entities to resolve display names
  const idsToFetch = itemsNeedingResolution.map((item) => item.id);
  const idFilter = idsToFetch.join('|');

  let resolvedEntities: Array<Record<string, unknown>> = [];

  switch (config.targetType) {
    case 'institutions': {
      const response = await getInstitutions({
        filters: { id: idFilter },
        per_page: Math.min(idsToFetch.length, 100),
        page: 1,
        ...(config.resolutionSelect && { select: config.resolutionSelect }),
      });
      resolvedEntities = response.results as Array<Record<string, unknown>>;
      break;
    }
    case 'works': {
      const response = await getWorks({
        filter: `id:${idFilter}`,
        per_page: Math.min(idsToFetch.length, 100),
        page: 1,
        ...(config.resolutionSelect && { select: config.resolutionSelect }),
      });
      resolvedEntities = response.results as Array<Record<string, unknown>>;
      break;
    }
    case 'authors': {
      const response = await getAuthors({
        filter: `id:${idFilter}`,
        per_page: Math.min(idsToFetch.length, 100),
        page: 1,
        ...(config.resolutionSelect && { select: config.resolutionSelect }),
      });
      resolvedEntities = response.results as Array<Record<string, unknown>>;
      break;
    }
    default:
      throw new Error(`Unsupported target type for resolution: ${config.targetType}`);
  }

  // Create a map of ID -> resolved entity for efficient lookup
  const resolvedMap = new Map<string, Record<string, unknown>>();
  for (const entity of resolvedEntities) {
    const id = entity.id as string;
    resolvedMap.set(id, entity);
  }

  // Merge extracted metadata with resolved display names
  const results = itemsNeedingResolution.map((item) => {
    const resolved = resolvedMap.get(item.id);
    return {
      id: item.id,
      display_name: resolved?.display_name ?? item.id, // Fallback to ID if resolution failed
      ...resolved, // Include all resolved fields
      ...item.metadata, // Override with extracted metadata
    };
  });

  return {
    results,
    totalCount: results.length,
    page: 1,
    perPage: results.length,
  };
};

/**
 * Execute a single relationship query using the OpenAlex API or embedded data extraction
 * @param entityId
 * @param entityType
 * @param config
 * @param page
 * @param customPageSize
 */
export const executeRelationshipQuery = async (
  entityId: string,
  entityType: EntityType,
  config: RelationshipQueryConfig,
  page: number = 1,
  customPageSize?: number,
): Promise<RelationshipQueryResult> => {
  if (config.source === 'api') {
    return executeApiQuery(entityId, config, page, customPageSize);
  }

  if (config.source === 'embedded') {
    return executeEmbeddedQuery(entityId, entityType, config);
  }

  if (config.source === 'embedded-with-resolution') {
    return executeEmbeddedWithResolutionQuery(entityId, entityType, config);
  }

  throw new Error('Invalid relationship query configuration: missing source property');
};
