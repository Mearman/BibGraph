/**
 * Type definitions for entity relationship visualization
 * @module relationship
 * @see specs/016-entity-relationship-viz/data-model.md
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';

/**
 * Direction filter options
 */
export type EdgeDirectionFilter = 'outbound' | 'inbound' | 'both';

/**
 * Relationship error codes
 */
export enum RelationshipErrorCode {
  /** Failed to load graph data */
  GRAPH_LOAD_FAILED = 'GRAPH_LOAD_FAILED',

  /** Invalid entity ID */
  INVALID_ENTITY_ID = 'INVALID_ENTITY_ID',

  /** No relationship data available */
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE',

  /** Network error */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Relationship loading error
 */
export interface RelationshipError {
  /** Error message */
  message: string;

  /** Error code */
  code: RelationshipErrorCode;

  /** Whether the error is retryable */
  retryable: boolean;

  /** Timestamp of error */
  timestamp: Date;
}

/**
 * Pagination state for relationship sections
 */
export interface PaginationState {
  /** Items per page (default: 50) */
  pageSize: number;

  /** Current page (0-indexed) */
  currentPage: number;

  /** Total number of pages */
  totalPages: number;

  /** Whether there's a next page */
  hasNextPage: boolean;

  /** Whether there's a previous page */
  hasPreviousPage: boolean;
}

/**
 * Authorship-specific metadata
 */
export interface AuthorshipMetadata {
  type: 'authorship';
  /** Author position in author list (1-indexed) */
  position?: number;
  /** Whether author is corresponding author */
  isCorresponding?: boolean;
  /** Author's affiliation at time of publication */
  affiliations?: string[];
}

/**
 * Citation-specific metadata
 */
export interface CitationMetadata {
  type: 'citation';
  /** Publication year of citing work */
  year?: number;
  /** Citation context snippet */
  context?: string;
}

/**
 * Affiliation-specific metadata
 */
export interface AffiliationMetadata {
  type: 'affiliation';
  /** Affiliation start date */
  startDate?: string;
  /** Affiliation end date (if applicable) */
  endDate?: string;
  /** Whether this is the primary affiliation */
  isPrimary?: boolean;
}

/**
 * Funding-specific metadata
 */
export interface FundingMetadata {
  type: 'funding';
  /** Grant/award number */
  awardId?: string;
  /** Grant amount (if available) */
  amount?: number;
  /** Currency */
  currency?: string;
}

/**
 * Lineage-specific metadata (institutional hierarchy)
 */
export interface LineageMetadata {
  type: 'lineage';
  /** Hierarchy level (e.g., 1 = direct parent, 2 = grandparent) */
  level?: number;
}

/**
 * Optional relationship metadata
 */
export type RelationshipMetadata =
  | AuthorshipMetadata
  | CitationMetadata
  | AffiliationMetadata
  | FundingMetadata
  | LineageMetadata;

/**
 * Individual relationship connection
 */
export interface RelationshipItem {
  /** Unique identifier for this relationship */
  id: string;

  /** Source entity ID (data owner in OpenAlex model) */
  sourceId: string;

  /** Target entity ID (referenced entity) */
  targetId: string;

  /** Source entity type */
  sourceType: EntityType;

  /** Target entity type */
  targetType: EntityType;

  /** Relationship type */
  type: RelationType;

  /** Direction from perspective of viewed entity */
  direction: 'outbound' | 'inbound';

  /** Display name of the related entity */
  displayName: string;

  /** Optional subtitle (e.g., author affiliation, publication year) */
  subtitle?: string;

  /** Optional metadata (authorship position, citation context, etc.) */
  metadata?: RelationshipMetadata;

  /** Whether this is a self-referencing relationship */
  isSelfReference: boolean;
}

/**
 * Grouped display of a single relationship type
 */
export interface RelationshipSection {
  /** Unique identifier for this section */
  id: string;

  /** Relationship type (AUTHORSHIP, REFERENCE, etc.) */
  type: RelationType;

  /** Direction of relationships in this section */
  direction: EdgeDirectionFilter;

  /** Display label (e.g., "Authors", "Citations", "Affiliations") */
  label: string;

  /** Icon identifier for UI rendering */
  icon?: string;

  /** All relationship items in this section */
  items: RelationshipItem[];

  /** Currently visible items (after pagination) */
  visibleItems: RelationshipItem[];

  /** Total count of relationships */
  totalCount: number;

  /** Number of currently visible items */
  visibleCount: number;

  /** Whether more items are available to load */
  hasMore: boolean;

  /** Pagination state */
  pagination: PaginationState;

  /** Whether data might be incomplete (e.g., graph not fully loaded) */
  isPartialData?: boolean;
}

/**
 * Relationship filter configuration
 */
export interface RelationshipFilter {
  /** Direction filter: show outbound, inbound, or both */
  direction?: EdgeDirectionFilter;

  /** Relationship types to display (empty = show all) */
  types?: RelationType[];

  /** Whether to show self-referencing relationships (Phase 6) */
  showSelfReferences?: boolean;
}

/**
 * Per-type relationship counts
 */
export interface RelationshipTypeSummary {
  /** Relationship type */
  type: RelationType;

  /** Incoming count for this type */
  incomingCount: number;

  /** Outgoing count for this type */
  outgoingCount: number;

  /** Total for this type */
  totalCount: number;
}

/**
 * Summary statistics for relationships
 */
export interface RelationshipSummary {
  /** Total incoming relationships (all types) */
  incomingCount: number;

  /** Total outgoing relationships (all types) */
  outgoingCount: number;

  /** Total relationships (incoming + outgoing) */
  totalCount: number;

  /** Breakdown by relationship type */
  byType: Record<RelationType, RelationshipTypeSummary>;
}

/**
 * Complete relationship visualization for an entity detail page
 */
export interface EntityRelationshipView {
  /** The entity whose relationships are being displayed */
  entityId: string;

  /** Entity type (e.g., 'works', 'authors', 'institutions') */
  entityType: EntityType;

  /** Incoming relationship sections (other entities → this entity) */
  incomingSections: RelationshipSection[];

  /** Outgoing relationship sections (this entity → other entities) */
  outgoingSections: RelationshipSection[];

  /** Total counts across all relationship types */
  summary: RelationshipSummary;

  /** Current filter state */
  filter: RelationshipFilter;

  /** Loading state */
  loading: boolean;

  /** Error state (if any) */
  error?: RelationshipError;
}

/**
 * Default pagination page size
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Default relationship filter
 */
export const DEFAULT_RELATIONSHIP_FILTER: RelationshipFilter = {
  direction: 'both',
  types: [],
  showSelfReferences: true,
};

/**
 * Maximum relationships to load before warning user
 */
export const MAX_RELATIONSHIPS_WARNING_THRESHOLD = 1000;

/**
 * Display labels for relationship types
 * Note: Deprecated aliases (AUTHORED, AFFILIATED, etc.) have same string values as noun forms,
 * so they automatically map to the same labels
 */
export const RELATIONSHIP_TYPE_LABELS: Record<RelationType, string> = {
  // Core academic relationships
  [RelationType.AUTHORSHIP]: 'Authors',
  [RelationType.AFFILIATION]: 'Affiliations',
  [RelationType.PUBLICATION]: 'Source',
  [RelationType.REFERENCE]: 'Citations',
  [RelationType.TOPIC]: 'Research Topic',

  // Publishing relationships
  [RelationType.HOST_ORGANIZATION]: 'Publisher',

  // Institutional relationships
  [RelationType.LINEAGE]: 'Parent Institution',
  [RelationType.INSTITUTION_ASSOCIATED]: 'Associated Institution',
  [RelationType.INSTITUTION_HAS_REPOSITORY]: 'Repository',

  // Additional relationship types
  [RelationType.AUTHOR_RESEARCHES]: 'Research Topics',
  [RelationType.FIELD_PART_OF_DOMAIN]: 'Domain',
  [RelationType.FUNDED_BY]: 'Funders',
  [RelationType.FUNDER_LOCATED_IN]: 'Country',
  [RelationType.INSTITUTION_LOCATED_IN]: 'Location',
  [RelationType.PUBLISHER_CHILD_OF]: 'Parent Publisher',
  [RelationType.TOPIC_PART_OF_FIELD]: 'Field',
  [RelationType.TOPIC_PART_OF_SUBFIELD]: 'Subfield',
  [RelationType.TOPIC_SIBLING]: 'Related Topics',
  [RelationType.WORK_HAS_KEYWORD]: 'Keywords',
  [RelationType.CONCEPT]: 'Concept (Legacy)',
  [RelationType.HAS_ROLE]: 'Roles',

  // General catch-all
  [RelationType.RELATED_TO]: 'Related Entities',
};

/**
 * Category definition for grouping relationship types
 */
export interface RelationshipTypeCategory {
  /** Category identifier */
  id: string;
  /** Display label */
  label: string;
  /** Relationship types in this category */
  types: RelationType[];
}

/**
 * Relationship type categories for organized filter UI
 * Groups 22 relationship types into 6 logical categories
 */
export const RELATIONSHIP_TYPE_CATEGORIES: RelationshipTypeCategory[] = [
  {
    id: 'core',
    label: 'Core Academic',
    types: [
      RelationType.AUTHORSHIP,
      RelationType.AFFILIATION,
      RelationType.PUBLICATION,
      RelationType.REFERENCE,
      RelationType.TOPIC,
    ],
  },
  {
    id: 'institutional',
    label: 'Institutional',
    types: [
      RelationType.LINEAGE,
      RelationType.INSTITUTION_ASSOCIATED,
      RelationType.INSTITUTION_HAS_REPOSITORY,
      RelationType.INSTITUTION_LOCATED_IN,
    ],
  },
  {
    id: 'publishing',
    label: 'Publishing',
    types: [
      RelationType.HOST_ORGANIZATION,
      RelationType.PUBLISHER_CHILD_OF,
    ],
  },
  {
    id: 'research',
    label: 'Research Topics',
    types: [
      RelationType.AUTHOR_RESEARCHES,
      RelationType.TOPIC_PART_OF_FIELD,
      RelationType.TOPIC_PART_OF_SUBFIELD,
      RelationType.TOPIC_SIBLING,
      RelationType.FIELD_PART_OF_DOMAIN,
    ],
  },
  {
    id: 'content',
    label: 'Content',
    types: [
      RelationType.WORK_HAS_KEYWORD,
      RelationType.CONCEPT,
    ],
  },
  {
    id: 'other',
    label: 'Other',
    types: [
      RelationType.FUNDED_BY,
      RelationType.FUNDER_LOCATED_IN,
      RelationType.HAS_ROLE,
      RelationType.RELATED_TO,
    ],
  },
];

/**
 * Filter preset definition
 */
export interface FilterPreset {
  /** Preset identifier */
  id: string;
  /** Display label */
  label: string;
  /** Relationship types included in preset (empty = all) */
  types: RelationType[];
}

/**
 * Quick filter presets for common use cases
 */
export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'all',
    label: 'All',
    types: [],
  },
  {
    id: 'core',
    label: 'Core Only',
    types: [
      RelationType.AUTHORSHIP,
      RelationType.AFFILIATION,
      RelationType.PUBLICATION,
      RelationType.REFERENCE,
      RelationType.TOPIC,
    ],
  },
  {
    id: 'citations',
    label: 'Citations',
    types: [RelationType.REFERENCE],
  },
];
