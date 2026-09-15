/**
 * Graph Data Source Types
 *
 * Defines the abstraction for different data sources that can contribute
 * entities to the graph visualization.
 */

import type { AuthorPosition, EntityType, GraphEdge, GraphNode, RelationType } from '@bibgraph/types';

/**
 * Source category for grouping in UI
 */
export type GraphSourceCategory = 'catalogue' | 'cache' | 'graph';

/**
 * Entity with source tracking and relationship data
 */
export interface GraphSourceEntity {
  /**
  Entity type (works, authors, etc.)
   */
  entityType: EntityType;

  /**
  OpenAlex entity ID (normalized short form, e.g., "A123")
   */
  entityId: string;

  /**
  Display label for the entity
   */
  label: string;

  /**
  Full entity data for display and relationship extraction
   */
  entityData: Record<string, unknown>;

  /**
  ID of the source this entity came from
   */
  sourceId: string;

  /**
  Extracted relationships to other entities
   */
  relationships: GraphSourceRelationship[];
}

/**
 * Relationship extracted from entity data
 */
export interface GraphSourceRelationship {
  /**
  Target entity ID (normalized short form)
   */
  targetId: string;

  /**
  Target entity type
   */
  targetType: EntityType;

  /**
  Relationship type
   */
  relationType: RelationType;

  /**
  Display label for target entity (extracted from nested data when available)
   */
  targetLabel?: string;

  // Edge properties (optional - populated from PersistentGraph edge records)
  /**
  Topic relevance score (0-1) - for TOPIC edges
   */
  score?: number;
  /**
  Author position in authorship list - for AUTHORSHIP edges
   */
  authorPosition?: AuthorPosition;
  /**
  Whether this is the corresponding author - for AUTHORSHIP edges
   */
  isCorresponding?: boolean;
  /**
  Whether the publication is open access - for PUBLICATION edges
   */
  isOpenAccess?: boolean;
}

/**
 * Interface for graph data sources
 *
 * Implementations provide entities from different storage mechanisms
 * (catalogue lists, IndexedDB cache, static cache, etc.)
 */
export interface GraphDataSource {
  /**
  Unique identifier for this source
   */
  readonly id: string;

  /**
  Human-readable display name
   */
  readonly label: string;

  /**
  Category for UI grouping
   */
  readonly category: GraphSourceCategory;

  /**
  Optional description
   */
  readonly description?: string;

  /**
   * Get all entities from this source
   * Includes relationship extraction
   */
  getEntities: () => Promise<GraphSourceEntity[]>;

  /**
   * Get entity count without loading full data
   * Used for displaying counts in toggle UI
   */
  getEntityCount: () => Promise<number>;

  /**
   * Check if this source is available/accessible
   */
  isAvailable: () => Promise<boolean>;
}

/**
 * State for a data source in the UI
 */
export interface GraphDataSourceState {
  /**
  The source instance
   */
  source: GraphDataSource;

  /**
  Whether this source is enabled/visible
   */
  enabled: boolean;

  /**
  Entity count (may be async-loaded)
   */
  entityCount: number | null;

  /**
  Loading state for this source
   */
  loading: boolean;

  /**
  Error if source failed to load
   */
  error: Error | null;
}

/**
 * Result of loading entities from multiple sources
 */
export interface MultiSourceGraphData {
  /**
  Combined nodes from all enabled sources
   */
  nodes: GraphNode[];

  /**
  Edges between any nodes (cross-source)
   */
  edges: GraphEdge[];

  /**
  Map of entityId to sourceId for debugging
   */
  entitySourceMap: Map<string, string>;
}

/**
 * Configuration for multi-source graph behavior
 */
export interface MultiSourceGraphConfig {
  /**
  Whether to show edges between entities from different sources
   */
  crossSourceEdges: boolean;

  /**
  Whether to deduplicate entities appearing in multiple sources
   */
  deduplicateEntities: boolean;

  /**
  Maximum entities to load per source (0 = no limit)
   */
  maxEntitiesPerSource: number;
}

/**
 * Default configuration
 */
export const DEFAULT_MULTI_SOURCE_CONFIG: MultiSourceGraphConfig = {
  crossSourceEdges: true,
  deduplicateEntities: true,
  maxEntitiesPerSource: 0,
};
