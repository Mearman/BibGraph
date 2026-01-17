/**
 * React hook for querying entity relationships via OpenAlex API
 * Uses the entity relationship query registry to fetch related entities
 * @module use-entity-relationship-queries
 */

import type { EntityType, RelationshipQueryConfig } from '@bibgraph/types';
import { getInboundQueries, getOutboundQueries } from '@bibgraph/types';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { RelationshipSection } from '@/types/relationship';

import { executeRelationshipQuery } from './relationship-query-execution';
import { prefetchEntity } from './relationship-query-prefetch';
import {
  createQueryRelationshipItem,
  createQueryRelationshipSection,
  getEffectivePageSize,
  getSectionId,
  isOpenAlexIdUrl,
  parseSectionId,
} from './relationship-query-transformers';
import type {
  SectionLoadState,
  UseEntityRelationshipQueriesResult,
} from './relationship-query-types';

// Note: UseEntityRelationshipQueriesResult type is exported from './relationship-query-types'
// Consumers should import it directly from there if needed

/** Query cache duration (5 minutes) */
const QUERY_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Query for entity relationships using the relationship query registry
 * Makes parallel API calls for all configured inbound/outbound relationships
 * @param entityId
 * @param entityType
 */
export const useEntityRelationshipQueries = (
  entityId: string | undefined,
  entityType: EntityType,
): UseEntityRelationshipQueriesResult => {
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
      ...inboundConfigs.map((config) => ({
        queryKey: ['entity-relationships', 'inbound', entityType, entityId, config.type],
        queryFn: () => {
          if (!entityId) {
            throw new Error('Entity ID is required');
          }
          return executeRelationshipQuery(entityId, entityType, config, 1);
        },
        enabled: !!entityId,
        staleTime: QUERY_STALE_TIME_MS,
      })),
      ...outboundConfigs.map((config) => ({
        queryKey: ['entity-relationships', 'outbound', entityType, entityId, config.type],
        queryFn: () => {
          if (!entityId) {
            throw new Error('Entity ID is required');
          }
          return executeRelationshipQuery(entityId, entityType, config, 1);
        },
        enabled: !!entityId,
        staleTime: QUERY_STALE_TIME_MS,
      })),
    ],
  });

  // Split results into inbound and outbound
  const inboundResults = queryResults.slice(0, inboundConfigs.length);
  const outboundResults = queryResults.slice(inboundConfigs.length);

  // Transform query results into RelationshipSections
  const incoming: RelationshipSection[] = inboundResults
    .map((result, index) => {
      if (!result.data) return null;
      const config = inboundConfigs[index];
      const sectionId = getSectionId(config, 'inbound');
      const additionalState = sectionStates.get(sectionId);
      return createQueryRelationshipSection(config, result.data, 'inbound', additionalState);
    })
    .filter((section): section is RelationshipSection => section !== null);

  const outgoing: RelationshipSection[] = outboundResults
    .map((result, index) => {
      if (!result.data) return null;
      const config = outboundConfigs[index];
      const sectionId = getSectionId(config, 'outbound');
      const additionalState = sectionStates.get(sectionId);
      return createQueryRelationshipSection(config, result.data, 'outbound', additionalState);
    })
    .filter((section): section is RelationshipSection => section !== null);

  // Calculate counts
  const incomingCount = incoming.reduce((sum, section) => sum + section.totalCount, 0);
  const outgoingCount = outgoing.reduce((sum, section) => sum + section.totalCount, 0);

  // Determine loading and error states
  const loading = queryResults.some((result) => result.isLoading);
  const error = queryResults.find((result) => result.error)?.error as Error | undefined;

  // Find config for a section ID
  const findConfigForSection = useCallback(
    (sectionId: string): RelationshipQueryConfig | undefined => {
      const { type, direction } = parseSectionId(sectionId);
      const configs = direction === 'inbound' ? inboundConfigs : outboundConfigs;
      return configs.find((c) => c.type === type);
    },
    [inboundConfigs, outboundConfigs],
  );

  // Load more items for a specific section
  const loadMore = useCallback(
    async (sectionId: string) => {
      if (!entityId) return;
      if (loadingMoreRef.current.has(sectionId)) return;

      const { direction } = parseSectionId(sectionId);
      const config = findConfigForSection(sectionId);
      if (!config) return;

      const currentState = sectionStates.get(sectionId);
      const currentPage = currentState?.currentPage ?? 1;
      const nextPage = currentPage + 1;

      loadingMoreRef.current.add(sectionId);
      forceUpdate({});

      try {
        const result = await executeRelationshipQuery(entityId, entityType, config, nextPage);
        const newItems = result.results.map((entity) =>
          createQueryRelationshipItem(entity, config, direction),
        );

        setSectionStates((prev) => {
          const newMap = new Map(prev);
          const existing = prev.get(sectionId);
          newMap.set(sectionId, {
            items: [...(existing?.items ?? []), ...newItems],
            currentPage: nextPage,
            pageSize: getEffectivePageSize(config, existing?.pageSize),
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
    },
    [entityId, entityType, findConfigForSection, sectionStates],
  );

  // Check if a section is loading more
  const isLoadingMore = useCallback((sectionId: string) => {
    return loadingMoreRef.current.has(sectionId);
  }, []);

  // Navigate to a specific page (0-indexed)
  const goToPage = useCallback(
    async (sectionId: string, page: number) => {
      if (!entityId) return;
      if (loadingMoreRef.current.has(sectionId)) return;

      const { direction } = parseSectionId(sectionId);
      const config = findConfigForSection(sectionId);
      if (!config) return;

      const currentState = sectionStates.get(sectionId);
      const pageSize = getEffectivePageSize(config, currentState?.pageSize);
      const apiPage = page + 1; // Convert 0-indexed to 1-indexed for API

      loadingMoreRef.current.add(sectionId);
      forceUpdate({});

      try {
        const result = await executeRelationshipQuery(
          entityId,
          entityType,
          config,
          apiPage,
          pageSize,
        );
        const items = result.results.map((entity) =>
          createQueryRelationshipItem(entity, config, direction),
        );

        setSectionStates((prev) => {
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
    },
    [entityId, entityType, findConfigForSection, sectionStates],
  );

  // Change page size (resets to page 0)
  const setPageSize = useCallback(
    async (sectionId: string, newPageSize: number) => {
      if (!entityId) return;
      if (loadingMoreRef.current.has(sectionId)) return;

      const { direction } = parseSectionId(sectionId);
      const config = findConfigForSection(sectionId);
      if (!config) return;

      loadingMoreRef.current.add(sectionId);
      forceUpdate({});

      try {
        const result = await executeRelationshipQuery(entityId, entityType, config, 1, newPageSize);
        const items = result.results.map((entity) =>
          createQueryRelationshipItem(entity, config, direction),
        );

        setSectionStates((prev) => {
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
    },
    [entityId, entityType, findConfigForSection],
  );

  // Reset section states when entity changes
  useEffect(() => {
    setSectionStates(new Map());
  }, [entityId, entityType]);

  // Background prefetch for ID-only relationships (displayName is OpenAlex ID URL)
  React.useEffect(() => {
    if (loading || !entityId) return;

    const allSections = [...incoming, ...outgoing];
    const itemsNeedingFetch = allSections.flatMap((section) =>
      section.items
        .filter((item) => isOpenAlexIdUrl(item.displayName))
        .map((item) => ({
          id: item.direction === 'inbound' ? item.sourceId : item.targetId,
          entityType: item.direction === 'inbound' ? item.sourceType : item.targetType,
        })),
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
