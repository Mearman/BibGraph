/**
 * Helper functions for creating relationship data structures
 * @module relationship-helpers
 */

import type { EntityType , RelationType } from '@bibgraph/types';

import type {
  PaginationState,
  RelationshipItem,
  RelationshipSection,
} from '@/types/relationship';
import { DEFAULT_PAGE_SIZE } from '@/types/relationship';

/**
 * Safely extract a string ID from an entity property
 * Prevents [object Object] appearing in URLs if API returns unexpected data
 * @param value
 */
export const safeStringId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
};

/**
 * Helper to create a properly structured RelationshipItem
 * @param sourceId
 * @param targetId
 * @param sourceType
 * @param targetType
 * @param relationType
 * @param direction
 * @param displayName
 */
export const createRelationshipItem = (
  sourceId: string,
  targetId: string,
  sourceType: EntityType,
  targetType: EntityType,
  relationType: RelationType,
  direction: 'outbound' | 'inbound',
  displayName: string,
): RelationshipItem => ({
  id: `${sourceId}-${relationType}-${targetId}`,
  sourceId,
  targetId,
  sourceType,
  targetType,
  type: relationType,
  direction,
  displayName,
  isSelfReference: sourceId === targetId,
});

/**
 * Helper to create a properly structured RelationshipSection
 * @param type
 * @param direction
 * @param label
 * @param items
 * @param isPartialData
 */
export const createRelationshipSection = (
  type: RelationType,
  direction: 'outbound' | 'inbound',
  label: string,
  items: RelationshipItem[],
  isPartialData: boolean = false,
): RelationshipSection => {
  const totalCount = items.length;
  const visibleItems = items.slice(0, DEFAULT_PAGE_SIZE);
  const visibleCount = visibleItems.length;
  const hasMore = totalCount > DEFAULT_PAGE_SIZE;

  const pagination: PaginationState = {
    pageSize: DEFAULT_PAGE_SIZE,
    currentPage: 0,
    totalPages: Math.ceil(totalCount / DEFAULT_PAGE_SIZE),
    hasNextPage: hasMore,
    hasPreviousPage: false,
  };

  return {
    id: `${type}-${direction}`,
    type,
    direction,
    label,
    items,
    visibleItems,
    totalCount,
    visibleCount,
    hasMore,
    pagination,
    isPartialData,
  };
};
