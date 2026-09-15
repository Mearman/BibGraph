/**
 * Entity prefetch utilities for relationship queries Background prefetching for ID-only relationships
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

import { MS_PER_MINUTE } from './time-constants';

/**
Cache duration for prefetched entities (5 minutes)
 */
const PREFETCH_STALE_TIME_MINUTES = 5;
const PREFETCH_STALE_TIME_MS = PREFETCH_STALE_TIME_MINUTES * MS_PER_MINUTE;

/**
 * Prefetch an entity in the background to populate the cache
 * This is used for ID-only relationships where we only have the ID,
 * not the full entity data (e.g., Institutions parent lineage)
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
  if (existingData !== undefined) return; // Already cached

  // Prefetch the entity; prefetch swallows errors by contract
  const noop = (): void => undefined;
  await queryClient.query({
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
        case 'concepts':
        case 'keywords':
        case 'domains':
        case 'fields':
        case 'subfields':
        default:
          throw new Error(`Unsupported entity type for prefetch: ${targetEntityType}`);
      }
    },
    staleTime: PREFETCH_STALE_TIME_MS,
  }).catch(noop);
};
