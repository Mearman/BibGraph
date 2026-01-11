/**
 * React hook for querying entity relationships via OpenAlex API
 * Uses the entity relationship query registry to fetch related entities
 * @module use-entity-relationship-queries
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
import type { EntityType , RelationshipQueryConfig } from '@bibgraph/types';
import { getInboundQueries, getOutboundQueries,RelationType } from '@bibgraph/types';
import { type QueryClient,useQueries, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect,useRef, useState } from 'react';

import type {
  PaginationState,
  RelationshipItem,
  RelationshipSection,
} from '@/types/relationship';
import { DEFAULT_PAGE_SIZE } from '@/types/relationship';


/**
 * Type guard to check if a string is a valid RelationType enum value
 * This allows safe narrowing from string to the enum type
 * @param value
 */
const isRelationType = (value: string): value is RelationType => {
  // Get all RelationType enum values (handles duplicates from deprecated aliases)
  const validTypes = new Set(Object.values(RelationType));
  return validTypes.has(value as RelationType);
};

/**
 * Check if a displayName looks like an OpenAlex ID URL
 * These need to be prefetched to get the actual display name
 * @param displayName
 */
const isOpenAlexIdUrl = (displayName: string): boolean => displayName.startsWith('https://openalex.org/');

/**
 * State for tracking loaded items per section
 */
interface SectionLoadState {
  items: RelationshipItem[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
}

export interface UseEntityRelationshipQueriesResult {
  /** Incoming relationship sections from API queries */
  incoming: RelationshipSection[];

  /** Outgoing relationship sections from API queries */
  outgoing: RelationshipSection[];

  /** Total count of incoming relationships */
  incomingCount: number;

  /** Total count of outgoing relationships */
  outgoingCount: number;

  /** Loading state - true if any query is loading */
  loading: boolean;

  /** Error from any failed query */
  error?: Error;

  /** Load more items for a specific section (appends to existing) */
  loadMore: (sectionId: string) => Promise<void>;

  /** Navigate to a specific page for a section (replaces items) */
  goToPage: (sectionId: string, page: number) => Promise<void>;

  /** Change page size for a section (resets to page 0) */
  setPageSize: (sectionId: string, pageSize: number) => Promise<void>;

  /** Check if a section is currently loading */
  isLoadingMore: (sectionId: string) => boolean;
}

/**
 * Query for entity relationships using the relationship query registry
 * Makes parallel API calls for all configured inbound/outbound relationships
 * @param entityId - The ID of the entity to query relationships for
 * @param entityType - The type of the entity
 * @returns Relationship sections from API queries with loading/error states
 */
export const useEntityRelationshipQueries = (entityId: string | undefined, entityType: EntityType): UseEntityRelationshipQueriesResult => {
  const queryClient = useQueryClient();

  // Track additional loaded items per section (beyond initial query)
  const [sectionStates, setSectionStates] = useState<Map<string, SectionLoadState>>(new Map());

  // Track which sections are currently loading more
  const loadingMoreRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState({});

  // Get query configurations from registry
  const inboundConfigs = getInboundQueries(entityType);
  const outboundConfigs = getOutboundQueries(entityType);

  // Execute all queries in parallel using useQueries
  const queryResults = useQueries({
    queries: [
      // Inbound queries
      ...inboundConfigs.map((config) => ({
        queryKey: ['entity-relationships', 'inbound', entityType, entityId, config.type],
        queryFn: () => {
          if (!entityId) {
            throw new Error('Entity ID is required');
          }
          return executeRelationshipQuery(entityId, entityType, config, 1);
        },
        enabled: !!entityId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      })),
      // Outbound queries
      ...outboundConfigs.map((config) => ({
        queryKey: ['entity-relationships', 'outbound', entityType, entityId, config.type],
        queryFn: () => {
          if (!entityId) {
            throw new Error('Entity ID is required');
          }
          return executeRelationshipQuery(entityId, entityType, config, 1);
        },
        enabled: !!entityId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      })),
    ],
  });

  // Split results into inbound and outbound
  const inboundResults = queryResults.slice(0, inboundConfigs.length);
  const outboundResults = queryResults.slice(inboundConfigs.length);

  // Create section ID helper
  const getSectionId = (config: RelationshipQueryConfig, direction: 'inbound' | 'outbound') =>
    `${config.type}-${direction}`;

  // Transform query results into RelationshipSections, merging with additional loaded items
  const incoming: RelationshipSection[] = inboundResults
    .map((result, index) => {
      if (!result.data) return null;
      const config = inboundConfigs[index];
      const sectionId = getSectionId(config, 'inbound');
      const additionalState = sectionStates.get(sectionId);
      return createRelationshipSection(
        config,
        result.data,
        'inbound',
        additionalState
      );
    })
    .filter((section): section is RelationshipSection => section !== null);

  const outgoing: RelationshipSection[] = outboundResults
    .map((result, index) => {
      if (!result.data) return null;
      const config = outboundConfigs[index];
      const sectionId = getSectionId(config, 'outbound');
      const additionalState = sectionStates.get(sectionId);
      return createRelationshipSection(
        config,
        result.data,
        'outbound',
        additionalState
      );
    })
    .filter((section): section is RelationshipSection => section !== null);

  // Calculate counts
  const incomingCount = incoming.reduce((sum, section) => sum + section.totalCount, 0);
  const outgoingCount = outgoing.reduce((sum, section) => sum + section.totalCount, 0);

  // Determine loading and error states
  const loading = queryResults.some((result) => result.isLoading);
  const error = queryResults.find((result) => result.error)?.error as Error | undefined;

  // Load more items for a specific section
  const loadMore = useCallback(async (sectionId: string) => {
    if (!entityId) return;
    if (loadingMoreRef.current.has(sectionId)) return; // Already loading

    // Find the config for this section
    const [type, direction] = sectionId.split('-') as [string, 'inbound' | 'outbound'];
    const configs = direction === 'inbound' ? inboundConfigs : outboundConfigs;
    const config = configs.find(c => c.type === type);
    if (!config) return;

    // Get current state
    const currentState = sectionStates.get(sectionId);
    const currentPage = currentState?.currentPage ?? 1;
    const nextPage = currentPage + 1;

    // Mark as loading
    loadingMoreRef.current.add(sectionId);
    forceUpdate({});

    try {
      // Fetch next page
      const result = await executeRelationshipQuery(entityId, entityType, config, nextPage);

      // Transform new items
      const newItems = result.results.map((entity) =>
        createRelationshipItem(entity, config, direction)
      );

      // Merge with existing items
      setSectionStates(prev => {
        const newMap = new Map(prev);
        const existing = prev.get(sectionId);
        const configPageSize = config.source === 'api' ? config.pageSize : undefined;
        newMap.set(sectionId, {
          items: [...(existing?.items ?? []), ...newItems],
          currentPage: nextPage,
          pageSize: existing?.pageSize ?? configPageSize ?? DEFAULT_PAGE_SIZE,
          totalCount: result.totalCount,
          loading: false,
        });
        return newMap;
      });
    } catch (err) {
      console.error(`Failed to load more for section ${sectionId}:`, err);
    } finally {
      loadingMoreRef.current.delete(sectionId);
      forceUpdate({});
    }
  }, [entityId, entityType, inboundConfigs, outboundConfigs, sectionStates]);

  // Check if a section is loading more
  const isLoadingMore = useCallback((sectionId: string) => {
    return loadingMoreRef.current.has(sectionId);
  }, []);

  // Navigate to a specific page (0-indexed)
  const goToPage = useCallback(async (sectionId: string, page: number) => {
    if (!entityId) return;
    if (loadingMoreRef.current.has(sectionId)) return;

    const [type, direction] = sectionId.split('-') as [string, 'inbound' | 'outbound'];
    const configs = direction === 'inbound' ? inboundConfigs : outboundConfigs;
    const config = configs.find(c => c.type === type);
    if (!config) return;

    const currentState = sectionStates.get(sectionId);
    const configPageSize = config.source === 'api' ? config.pageSize : undefined;
    const pageSize = currentState?.pageSize ?? configPageSize ?? DEFAULT_PAGE_SIZE;
    // Convert 0-indexed to 1-indexed for API
    const apiPage = page + 1;

    loadingMoreRef.current.add(sectionId);
    forceUpdate({});

    try {
      const result = await executeRelationshipQuery(entityId, entityType, config, apiPage, pageSize);
      const items = result.results.map((entity) =>
        createRelationshipItem(entity, config, direction)
      );

      setSectionStates(prev => {
        const newMap = new Map(prev);
        newMap.set(sectionId, {
          items,
          currentPage: apiPage,
          pageSize,
          totalCount: result.totalCount,
          loading: false,
        });
        return newMap;
      });
    } catch (err) {
      console.error(`Failed to go to page ${page} for section ${sectionId}:`, err);
    } finally {
      loadingMoreRef.current.delete(sectionId);
      forceUpdate({});
    }
  }, [entityId, entityType, inboundConfigs, outboundConfigs, sectionStates]);

  // Change page size (resets to page 0)
  const setPageSize = useCallback(async (sectionId: string, newPageSize: number) => {
    if (!entityId) return;
    if (loadingMoreRef.current.has(sectionId)) return;

    const [type, direction] = sectionId.split('-') as [string, 'inbound' | 'outbound'];
    const configs = direction === 'inbound' ? inboundConfigs : outboundConfigs;
    const config = configs.find(c => c.type === type);
    if (!config) return;

    loadingMoreRef.current.add(sectionId);
    forceUpdate({});

    try {
      // Reset to page 1 (API is 1-indexed)
      const result = await executeRelationshipQuery(entityId, entityType, config, 1, newPageSize);
      const items = result.results.map((entity) =>
        createRelationshipItem(entity, config, direction)
      );

      setSectionStates(prev => {
        const newMap = new Map(prev);
        newMap.set(sectionId, {
          items,
          currentPage: 1,
          pageSize: newPageSize,
          totalCount: result.totalCount,
          loading: false,
        });
        return newMap;
      });
    } catch (err) {
      console.error(`Failed to set page size for section ${sectionId}:`, err);
    } finally {
      loadingMoreRef.current.delete(sectionId);
      forceUpdate({});
    }
  }, [entityId, entityType, inboundConfigs, outboundConfigs]);

  // Reset section states when entity changes
  useEffect(() => {
    setSectionStates(new Map());
  }, [entityId, entityType]);

  // Background prefetch for ID-only relationships (displayName is OpenAlex ID URL)
  // This happens asynchronously without blocking the UI
  React.useEffect(() => {
    if (loading || !entityId) return;

    const allSections = [...incoming, ...outgoing];
    const itemsNeedingFetch = allSections.flatMap((section) =>
      section.items
        .filter((item) => isOpenAlexIdUrl(item.displayName))
        .map((item) => ({
          id: item.direction === 'inbound' ? item.sourceId : item.targetId,
          entityType: item.direction === 'inbound' ? item.sourceType : item.targetType,
        }))
    );

    // Prefetch each entity in the background
    itemsNeedingFetch.forEach(({ id, entityType: targetEntityType }) => {
      prefetchEntity(queryClient, id, targetEntityType);
    });
  }, [loading, entityId, incoming, outgoing, queryClient]);

  return {
    incoming,
    outgoing,
    incomingCount,
    outgoingCount,
    loading,
    error,
    loadMore,
    goToPage,
    setPageSize,
    isLoadingMore,
  };
};

/**
 * Parse a filter string like "key:value" into an object { key: value }
 * Used to convert filter strings for API functions that expect filter objects
 * @param filterString - Filter string in format "key:value"
 * @returns Object with the key-value pair
 */
const parseFilterStringToObject = (filterString: string): Record<string, string> => {
  const colonIndex = filterString.indexOf(':');
  if (colonIndex === -1) return {};
  const key = filterString.substring(0, colonIndex);
  const value = filterString.substring(colonIndex + 1);
  return { [key]: value };
};

/**
 * Execute a single relationship query using the OpenAlex API or embedded data extraction
 * @param entityId
 * @param entityType
 * @param config
 * @param page
 * @param customPageSize
 */
const executeRelationshipQuery = async (entityId: string, entityType: EntityType, config: RelationshipQueryConfig, page: number = 1, customPageSize?: number): Promise<RelationshipQueryResult> => {
  // Handle API-based queries
  if (config.source === 'api') {
    const filter = config.buildFilter(entityId);
    const pageSize = customPageSize ?? config.pageSize ?? DEFAULT_PAGE_SIZE;

    // Choose the appropriate API function based on target type
    // Note: Some API functions accept `filter` (string), others accept `filters` (object)
    // For functions expecting `filters` object, we parse the filter string into an object
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
  }

  // Handle embedded data extraction
  if (config.source === 'embedded') {
    // Fetch the entity data to extract embedded relationships from
    let entityData: Record<string, unknown>;

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
        entityData = response.results[0] as Record<string, unknown>;
        break;
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
        entityData = response.results[0] as Record<string, unknown>;
        break;
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
        entityData = response.results[0] as Record<string, unknown>;
        break;
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
        entityData = response.results[0] as Record<string, unknown>;
        break;
      }
      case 'topics': {
        const topic = await getTopicById(entityId);
        entityData = topic as Record<string, unknown>;
        break;
      }
      case 'publishers': {
        const publisher = await getPublisherById(entityId);
        entityData = publisher as Record<string, unknown>;
        break;
      }
      case 'funders': {
        const funder = await getFunderById(entityId);
        entityData = funder as Record<string, unknown>;
        break;
      }
      default:
        throw new Error(`Unsupported entity type for embedded extraction: ${entityType}`);
    }

    // Extract embedded relationships
    const embeddedItems = config.extractEmbedded(entityData);

    // Transform embedded items into the same format as API results
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
  }

  // Handle embedded data with resolution (IDs only, need to fetch display names)
  if (config.source === 'embedded-with-resolution') {
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
      // Add other entity types as needed
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
    // Use OR syntax for efficient batch query (up to 100 IDs per request)
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
  }

  throw new Error('Invalid relationship query configuration: missing source property');
};

/**
 * Result from a relationship query
 */
interface RelationshipQueryResult {
  results: Array<Record<string, unknown>>;
  totalCount: number;
  page: number;
  perPage: number;
}

/**
 * Create a RelationshipSection from query results
 * @param config
 * @param queryResult
 * @param direction
 * @param additionalState
 */
const createRelationshipSection = (config: RelationshipQueryConfig, queryResult: RelationshipQueryResult, direction: 'inbound' | 'outbound', additionalState?: SectionLoadState): RelationshipSection => {
  const { results, totalCount, page, perPage } = queryResult;

  // Transform initial results into RelationshipItems
  const initialItems: RelationshipItem[] = results.map((entity) =>
    createRelationshipItem(entity, config, direction)
  );

  // Use additional state items if available (replaces initial), otherwise use initial
  // When additionalState exists, it means user has navigated pages and contains the current page's items
  const allItems = additionalState ? additionalState.items : initialItems;

  const currentPage = additionalState?.currentPage ?? page;
  const effectivePageSize = additionalState?.pageSize ?? perPage;
  const effectiveTotalCount = additionalState?.totalCount ?? totalCount;
  const totalPages = Math.ceil(effectiveTotalCount / effectivePageSize);
  const hasMore = currentPage < totalPages;

  const pagination: PaginationState = {
    pageSize: effectivePageSize,
    currentPage: currentPage - 1, // OpenAlex uses 1-based, we use 0-based
    totalPages,
    hasNextPage: hasMore,
    hasPreviousPage: currentPage > 1,
  };

  // Use type guard to safely narrow RelationshipTypeString to RelationType
  if (!isRelationType(config.type)) {
    throw new Error(`Invalid relationship type: ${config.type}`);
  }

  return {
    id: `${config.type}-${direction}`,
    type: config.type, // Type is narrowed to RelationType by the guard
    direction,
    label: config.label,
    items: allItems,
    visibleItems: allItems,
    totalCount: effectiveTotalCount,
    visibleCount: allItems.length,
    hasMore,
    pagination,
    isPartialData: false, // API queries return complete data
  };
};

/**
 * Create a RelationshipItem from an API entity result
 * @param entity
 * @param config
 * @param direction
 */
const createRelationshipItem = (entity: Record<string, unknown>, config: RelationshipQueryConfig, direction: 'inbound' | 'outbound'): RelationshipItem => {
  // Safely extract ID and display_name, ensuring they are strings
  // This prevents [object Object] appearing in IDs if API returns unexpected data
  const rawId = entity.id;
  const entityId = typeof rawId === 'string' ? rawId : (rawId == null ? '' : String(rawId));
  const rawDisplayName = entity.display_name;
  const displayName = typeof rawDisplayName === 'string' ? rawDisplayName : (rawDisplayName == null ? '' : String(rawDisplayName));

  // Determine source and target based on direction
  // For inbound: target is the current entity (not in this context), source is the API result
  // For outbound: source is the current entity (not in this context), target is the API result
  const sourceId = direction === 'outbound' ? '?' : entityId; // Will be set by consuming code
  const targetId = direction === 'outbound' ? entityId : '?'; // Will be set by consuming code

  // Use type guard to safely narrow RelationshipTypeString to RelationType
  if (!isRelationType(config.type)) {
    throw new Error(`Invalid relationship type: ${config.type}`);
  }

  return {
    id: `query-${config.type}-${entityId}`,
    sourceId,
    targetId,
    sourceType: config.targetType, // This will need adjustment based on direction
    targetType: config.targetType,
    type: config.type, // Type is narrowed to RelationType by the guard
    direction,
    displayName,
    isSelfReference: false,
  };
};

/**
 * Prefetch an entity in the background to populate the cache
 * This is used for ID-only relationships where we only have the ID,
 * not the full entity data (e.g., Institutions parent lineage)
 * @param queryClient
 * @param entityId
 * @param targetEntityType
 */
const prefetchEntity = async (queryClient: QueryClient, entityId: string, targetEntityType: EntityType): Promise<void> => {
  // Create query key for the entity
  const queryKey = ['entity', targetEntityType, entityId];

  // Check if already in cache
  const existingData = queryClient.getQueryData(queryKey);
  if (existingData) return; // Already cached

  // Prefetch the entity
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      switch (targetEntityType) {
        case 'works': {
          const response = await getWorks({
            filter: `openalex_id:${entityId}`,
            per_page: 1,
            page: 1,
          });
          return response.results[0];
        }
        case 'authors': {
          const response = await getAuthors({
            filter: `openalex_id:${entityId}`,
            per_page: 1,
            page: 1,
          });
          return response.results[0];
        }
        case 'sources': {
          const response = await getSources({
            filters: { id: entityId },
            per_page: 1,
            page: 1,
          });
          return response.results[0];
        }
        case 'institutions': {
          const response = await getInstitutions({
            filters: { id: entityId },
            per_page: 1,
            page: 1,
          });
          return response.results[0];
        }
        case 'topics': {
          return await getTopicById(entityId);
        }
        case 'publishers': {
          return await getPublisherById(entityId);
        }
        case 'funders': {
          return await getFunderById(entityId);
        }
        default:
          throw new Error(`Unsupported entity type for prefetch: ${targetEntityType}`);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
