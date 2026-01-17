/**
 * Entity prefetch utilities for relationship queries
 * Background prefetching for ID-only relationships
 * @module relationship-query-prefetch
 */

import {
  getAuthors,
  getFunderById,
  getInstitutions,
  getPublisherById,
  getSources,
  getTopicById,
  getWorks,
} from '@bibgraph/client';
import type { EntityType } from '@bibgraph/types';
import type { QueryClient } from '@tanstack/react-query';

/** Cache duration for prefetched entities (5 minutes) */
const PREFETCH_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Prefetch an entity in the background to populate the cache
 * This is used for ID-only relationships where we only have the ID,
 * not the full entity data (e.g., Institutions parent lineage)
 * @param queryClient
 * @param entityId
 * @param targetEntityType
 */
export const prefetchEntity = async (
  queryClient: QueryClient,
  entityId: string,
  targetEntityType: EntityType,
): Promise<void> => {
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
    staleTime: PREFETCH_STALE_TIME_MS,
  });
};
