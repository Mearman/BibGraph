/**
 * Transform API results to RelationshipSection and RelationshipItem structures
 * @module relationship-query-transformers
 */

import type { RelationshipQueryConfig } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';

import type { PaginationState, RelationshipItem, RelationshipSection } from '@/types/relationship';
import { DEFAULT_PAGE_SIZE } from '@/types/relationship';

import type { RelationshipQueryResult, SectionLoadState } from './relationship-query-types';

/**
 * Type guard to check if a string is a valid RelationType enum value
 * This allows safe narrowing from string to the enum type
 * @param value
 */
export const isRelationType = (value: string): value is RelationType => {
  const validTypes = new Set(Object.values(RelationType));
  return validTypes.has(value as RelationType);
};

/**
 * Check if a displayName looks like an OpenAlex ID URL
 * These need to be prefetched to get the actual display name
 * @param displayName
 */
export const isOpenAlexIdUrl = (displayName: string): boolean =>
  displayName.startsWith('https://openalex.org/');

/**
 * Create a RelationshipItem from an API entity result
 * @param entity
 * @param config
 * @param direction
 */
export const createQueryRelationshipItem = (
  entity: Record<string, unknown>,
  config: RelationshipQueryConfig,
  direction: 'inbound' | 'outbound',
): RelationshipItem => {
  // Safely extract ID and display_name, ensuring they are strings
  // This prevents [object Object] appearing in IDs if API returns unexpected data
  const rawId = entity.id;
  const entityId = typeof rawId === 'string' ? rawId : rawId == null ? '' : String(rawId);
  const rawDisplayName = entity.display_name;
  const displayName =
    typeof rawDisplayName === 'string'
      ? rawDisplayName
      : rawDisplayName == null
        ? ''
        : String(rawDisplayName);

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
 * Create a RelationshipSection from query results
 * @param config
 * @param queryResult
 * @param direction
 * @param additionalState
 */
export const createQueryRelationshipSection = (
  config: RelationshipQueryConfig,
  queryResult: RelationshipQueryResult,
  direction: 'inbound' | 'outbound',
  additionalState?: SectionLoadState,
): RelationshipSection => {
  const { results, totalCount, page, perPage } = queryResult;

  // Transform initial results into RelationshipItems
  const initialItems: RelationshipItem[] = results.map((entity) =>
    createQueryRelationshipItem(entity, config, direction),
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
 * Get section ID from config and direction
 * @param config
 * @param direction
 */
export const getSectionId = (
  config: RelationshipQueryConfig,
  direction: 'inbound' | 'outbound',
): string => `${config.type}-${direction}`;

/**
 * Parse section ID to extract type and direction
 * @param sectionId
 */
export const parseSectionId = (
  sectionId: string,
): { type: string; direction: 'inbound' | 'outbound' } => {
  const [type, direction] = sectionId.split('-') as [string, 'inbound' | 'outbound'];
  return { type, direction };
};

/**
 * Get effective page size from config and state
 * @param config
 * @param statePageSize
 */
export const getEffectivePageSize = (
  config: RelationshipQueryConfig,
  statePageSize?: number,
): number => {
  const configPageSize = config.source === 'api' ? config.pageSize : undefined;
  return statePageSize ?? configPageSize ?? DEFAULT_PAGE_SIZE;
};
