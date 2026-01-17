/**
 * Type definitions for entity relationship query hooks
 * @module relationship-query-types
 */

import type { RelationshipItem, RelationshipSection } from '@/types/relationship';

/**
 * State for tracking loaded items per section
 */
export interface SectionLoadState {
  items: RelationshipItem[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
}

/**
 * Result from a relationship query
 */
export interface RelationshipQueryResult {
  results: Array<Record<string, unknown>>;
  totalCount: number;
  page: number;
  perPage: number;
}

/**
 * Result interface for the useEntityRelationshipQueries hook
 */
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
