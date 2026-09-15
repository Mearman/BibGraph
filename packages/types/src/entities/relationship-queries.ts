/**
 * Entity Relationship Query Registry
 *
 * Centralized configuration for querying related entities via OpenAlex API. Defines inbound and outbound relationship queries for each entity type.
 */

import type { EntityType } from './entities';
import { ENTITY_RELATIONSHIP_QUERIES } from './relationship-queries-registry';

/**
 * Relationship type string literals (matches graph package RelationType enum) Defined here to avoid circular dependency between types and graph packages
 */
export type RelationshipTypeString =
  | 'AUTHORSHIP'
  | 'AFFILIATION'
  | 'PUBLICATION'
  | 'REFERENCE'
  | 'TOPIC'
  | 'HOST_ORGANIZATION'
  | 'LINEAGE'
  | 'author_researches'  // Lowercase to match RelationType enum value
  | 'funded_by'  // Lowercase to match RelationType enum value
  | 'topic_part_of_field'  // Lowercase to match RelationType enum value
  | 'topic_part_of_subfield'  // Lowercase to match RelationType enum value
  | 'field_part_of_domain'  // Lowercase to match RelationType enum value
  | 'related_to'  // Lowercase to match RelationType enum value
  | 'institution_has_repository';  // Lowercase to match RelationType enum value

/**
 * Embedded relationship item extracted from entity data
 */
export interface EmbeddedRelationshipItem {
  /**
  Entity ID (e.g., "https://openalex.org/A123")
   */
  id: string;
  /**
  Display name
   */
  displayName: string;
  /**
  Additional metadata from embedded data
   */
  metadata?: Record<string, unknown>;
}

/**
 * API-based relationship query configuration
 */
export interface ApiRelationshipQuery {
  /**
  Query source type
   */
  source: 'api';
  /**
   * Build the OpenAlex API filter string for this relationship
   * @param entityId - The ID of the source entity
   * @returns Filter string (e.g., "author.id:A123")
   */
  buildFilter: (entityId: string) => string;
  /**
  Optional: Page size for pagination (default: 25)
   */
  pageSize?: number;
  /**
  Optional: Fields to select in the API response
   */
  select?: string[];
}

/**
 * Embedded data relationship query configuration
 */
export interface EmbeddedRelationshipQuery {
  /**
  Query source type
   */
  source: 'embedded';
  /**
   * Extract relationships from entity's embedded data
   * @param entityData - The source entity's data
   * @returns Array of related entities extracted from embedded data
   */
  extractEmbedded: (entityData: Record<string, unknown>) => EmbeddedRelationshipItem[];
}

/**
 * Item extracted from embedded data that needs resolution (ID only, no display name)
 */
export interface EmbeddedItemNeedingResolution {
  /**
  Entity ID (e.g., "https://openalex.org/I123")
   */
  id: string;
  /**
  Additional metadata from embedded data
   */
  metadata?: Record<string, unknown>;
}

/**
 * Embedded data with resolution - extracts IDs from embedded data, then batch-fetches display names Use this when embedded data contains only IDs without display names (e.g., institution lineage)
 */
export interface EmbeddedWithResolutionQuery {
  /**
  Query source type
   */
  source: 'embedded-with-resolution';
  /**
   * Extract entity IDs from embedded data (display names will be fetched separately)
   * @param entityData - The source entity's data
   * @returns Array of items with IDs that need display name resolution
   */
  extractIds: (entityData: Record<string, unknown>) => EmbeddedItemNeedingResolution[];
  /**
  Fields to select when fetching entities for resolution
   */
  resolutionSelect?: string[];
}

/**
 * Configuration for a single relationship query. `TargetType` is the type of the target entity (the entity type returned by the query).
 */
export type RelationshipQueryConfig<
  TargetType extends EntityType = EntityType
> = {
  /**
  The type of relationship (e.g., AUTHORSHIP, REFERENCE)
   */
  type: RelationshipTypeString;

  /**
  The target entity type to query (e.g., 'works', 'authors')
   */
  targetType: TargetType;

  /**
  Human-readable label for this relationship
   */
  label: string;
} & (ApiRelationshipQuery | EmbeddedRelationshipQuery | EmbeddedWithResolutionQuery);

/**
 * Complete relationship query configuration for an entity type
 */
export interface EntityRelationshipQueries {
  /**
  Inbound relationships (other entities → this entity)
   */
  inbound: RelationshipQueryConfig[];

  /**
  Outbound relationships (this entity → other entities)
   */
  outbound: RelationshipQueryConfig[];
}

/**
 * Get relationship query configurations for a specific entity type
 * @param entityType - The type of entity (e.g., 'authors', 'works')
 * @returns Inbound and outbound relationship query configurations
 */
export const getEntityRelationshipQueries = (
	entityType: EntityType
): EntityRelationshipQueries => ENTITY_RELATIONSHIP_QUERIES[entityType];

/**
 * Get all inbound query configurations for an entity type
 * @param entityType - The type of entity
 * @returns Array of inbound relationship query configurations
 */
export const getInboundQueries = (
	entityType: EntityType
): RelationshipQueryConfig[] => ENTITY_RELATIONSHIP_QUERIES[entityType].inbound;

/**
 * Get all outbound query configurations for an entity type
 * @param entityType - The type of entity
 * @returns Array of outbound relationship query configurations
 */
export const getOutboundQueries = (
	entityType: EntityType
): RelationshipQueryConfig[] => ENTITY_RELATIONSHIP_QUERIES[entityType].outbound;

/**
 * Check if an entity type has any inbound queries configured
 * @param entityType - The type of entity
 * @returns True if inbound queries exist
 */
export const hasInboundQueries = (
	entityType: EntityType
): boolean => ENTITY_RELATIONSHIP_QUERIES[entityType].inbound.length > 0;

/**
 * Check if an entity type has any outbound queries configured
 * @param entityType - The type of entity
 * @returns True if outbound queries exist
 */
export const hasOutboundQueries = (
	entityType: EntityType
): boolean => ENTITY_RELATIONSHIP_QUERIES[entityType].outbound.length > 0;
