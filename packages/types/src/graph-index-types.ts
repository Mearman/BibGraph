/**
 * Graph Index Type Definitions
 *
 * Types for the persistent graph index layer.
 * These types define the IndexedDB storage schema and API contracts.
 * @packageDocumentation
 */

import type { EntityType } from './entities';
import type { EdgeDirection } from './graph-types';
import type { RelationType } from './relationships';

// ============================================================================
// Completeness Status
// ============================================================================

/**
 * Indicates how much data is available for a graph node.
 *
 * State transitions are unidirectional (upgrade only):
 * stub → partial → full
 * @example
 * ```typescript
 * // Node from relationship reference (ID only)
 * const stubNode: CompletenessStatus = 'stub';
 *
 * // Node from list API response
 * const partialNode: CompletenessStatus = 'partial';
 *
 * // Node from detail API response
 * const fullNode: CompletenessStatus = 'full';
 * ```
 */
export type CompletenessStatus = 'full' | 'partial' | 'stub';

// ============================================================================
// Graph Node Record
// ============================================================================

/**
 * Represents a node in the persistent graph index.
 *
 * Stored in IndexedDB `nodes` table. Maps 1:1 with OpenAlex entities.
 * The `completeness` field indicates data quality/availability.
 */
export interface GraphNodeRecord {
  /**
   * OpenAlex ID in short form.
   * @example "W2741809807", "A5023888391", "I205783295"
   */
  id: string;

  /**
   * Entity type from OpenAlex taxonomy.
   */
  entityType: EntityType;

  /**
   * Display label for the node.
   * - Full/Partial: `display_name` from entity
   * - Stub: Falls back to ID
   */
  label: string;

  /**
   * Data completeness status.
   */
  completeness: CompletenessStatus;

  /**
   * Unix timestamp (ms) when node was first added to graph.
   */
  cachedAt: number;

  /**
   * Unix timestamp (ms) when node was last updated.
   * Updated when completeness upgrades or metadata changes.
   */
  updatedAt: number;

  /**
   * Optional metadata extracted from entity.
   * @example `{ cited_by_count: 1247, publication_year: 2018 }`
   */
  metadata?: Record<string, unknown>;

  /**
   * Unix timestamp (ms) when node's relationships were fully expanded.
   * Undefined means relationships haven't been discovered yet.
   * Used to determine if click-to-expand should fetch new relationships.
   */
  expandedAt?: number;
}

// ============================================================================
// Indexed Edge Property Types
// ============================================================================

/**
 * Author position in authorship list.
 */
export type AuthorPosition = 'first' | 'middle' | 'last';

/**
 * Publication version stage.
 */
export type PublicationVersion = 'accepted' | 'submitted' | 'published';

// ============================================================================
// Graph Edge Record
// ============================================================================

/**
 * Represents an edge in the persistent graph index.
 *
 * Stored in IndexedDB `edges` table. Captures a single relationship
 * between two entities. Edge ID format ensures deduplication.
 *
 * Commonly-queried metadata is promoted to indexed fields for efficient filtering.
 */
export interface GraphEdgeRecord {
  /**
   * Unique edge identifier.
   * Format: `${source}-${target}-${type}`
   * @example "W2741809807-A5023888391-AUTHORSHIP"
   */
  id: string;

  /**
   * Source node ID (OpenAlex ID).
   */
  source: string;

  /**
   * Target node ID (OpenAlex ID).
   */
  target: string;

  /**
   * Relationship type from OpenAlex taxonomy.
   */
  type: RelationType;

  /**
   * Direction indicator based on data ownership.
   * - 'outbound': Source entity's API response contains the relationship
   * - 'inbound': Discovered via reverse lookup
   */
  direction: EdgeDirection;

  /**
   * Unix timestamp (ms) when edge was discovered.
   */
  discoveredAt: number;

  // ==========================================================================
  // Indexed Edge Properties (commonly-queried metadata promoted to fields)
  // ==========================================================================

  /**
   * Author position in authorship list.
   * Only set for AUTHORSHIP edges.
   */
  authorPosition?: AuthorPosition;

  /**
   * Whether this is the corresponding author.
   * Only set for AUTHORSHIP edges.
   */
  isCorresponding?: boolean;

  /**
   * Whether the publication is open access.
   * Only set for PUBLICATION edges.
   */
  isOpenAccess?: boolean;

  /**
   * Publication version stage.
   * Only set for PUBLICATION edges.
   */
  version?: PublicationVersion;

  /**
   * Topic relevance score (0-1).
   * Only set for TOPIC edges.
   */
  score?: number;

  /**
   * Years of affiliation.
   * Only set for AFFILIATION edges.
   */
  years?: number[];

  /**
   * Grant/award identifier.
   * Only set for FUNDED_BY edges.
   */
  awardId?: string;

  /**
   * Entity role type (funder, publisher, etc.).
   * Only set for HAS_ROLE edges.
   */
  role?: string;

  // ==========================================================================

  /**
   * Optional additional metadata not covered by indexed fields.
   */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Input Types (for creating records)
// ============================================================================

/**
 * Input for creating a new graph node.
 * Timestamps are auto-generated.
 */
export interface GraphNodeInput {
  id: string;
  entityType: EntityType;
  label: string;
  completeness: CompletenessStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a new graph edge.
 * ID and timestamp are auto-generated.
 */
export interface GraphEdgeInput {
  source: string;
  target: string;
  type: RelationType;
  direction: EdgeDirection;

  // Optional indexed properties (extracted from entity data)
  authorPosition?: AuthorPosition;
  isCorresponding?: boolean;
  isOpenAccess?: boolean;
  version?: PublicationVersion;
  score?: number;
  years?: number[];
  awardId?: string;
  role?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Filter options for querying edges by indexed properties.
 */
export interface EdgePropertyFilter {
  /**
  Filter by author position
   */
  authorPosition?: AuthorPosition;
  /**
  Filter by corresponding author status
   */
  isCorresponding?: boolean;
  /**
  Filter by open access status
   */
  isOpenAccess?: boolean;
  /**
  Filter by publication version
   */
  version?: PublicationVersion;
  /**
  Minimum topic relevance score (inclusive)
   */
  scoreMin?: number;
  /**
  Maximum topic relevance score (inclusive)
   */
  scoreMax?: number;
  /**
  Filter affiliations that include any of these years
   */
  yearsInclude?: number[];
  /**
  Filter by grant/award ID
   */
  awardId?: string;
  /**
  Filter by entity role
   */
  role?: string;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Direction filter for edge queries.
 */
export type EdgeDirectionFilter = 'outbound' | 'inbound' | 'both';

/**
 * Options for neighbor queries.
 */
export interface NeighborQueryOptions {
  /**
  Filter by edge direction
   */
  direction?: EdgeDirectionFilter;
  /**
  Filter by relationship types
   */
  types?: RelationType[];
  /**
  Maximum number of neighbors to return
   */
  limit?: number;
}

/**
 * Result of a subgraph extraction.
 */
export interface SubgraphResult {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Graph statistics summary.
 */
export interface GraphStatistics {
  /**
  Total node count
   */
  nodeCount: number;
  /**
  Total edge count
   */
  edgeCount: number;
  /**
  Nodes by completeness status
   */
  nodesByCompleteness: Record<CompletenessStatus, number>;
  /**
  Nodes by entity type
   */
  nodesByType: Partial<Record<EntityType, number>>;
  /**
  Edges by relationship type
   */
  edgesByType: Partial<Record<RelationType, number>>;
  /**
  Timestamp of last update
   */
  lastUpdated: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Database name for graph index storage.
 */
export const GRAPH_INDEX_DB_NAME = 'bibgraph-graph-index';

/**
 * Current database schema version.
 */
export const GRAPH_INDEX_DB_VERSION = 1;

/**
 * Table names in the graph index database.
 */
export const GRAPH_INDEX_TABLES = {
  NODES: 'nodes',
  EDGES: 'edges',
} as const;

/**
 * Index definitions for the nodes table.
 */
export const NODE_INDEXES = 'id, entityType, completeness, cachedAt, updatedAt';

/**
 * Index definitions for the edges table.
 * Includes compound indexes for efficient queries and indexed property fields.
 */
export const EDGE_INDEXES = [
  'id',
  'source',
  'target',
  'type',
  'direction',
  '[source+type]',
  '[target+type]',
  '[source+target+type]',
  'discoveredAt',
  // Indexed edge properties
  'authorPosition',
  'isCorresponding',
  'isOpenAccess',
  'score',
  // Compound indexes for filtered queries
  '[source+type+authorPosition]',
  '[source+type+isOpenAccess]',
].join(', ');
