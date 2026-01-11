/**
 * Entity Relationship Query Registry
 *
 * Centralized configuration for querying related entities via OpenAlex API.
 * Defines inbound and outbound relationship queries for each entity type.
 * @module relationship-queries
 */

import type { EntityType } from './entities';

/**
 * Relationship type string literals (matches graph package RelationType enum)
 * Defined here to avoid circular dependency between types and graph packages
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
  /** Entity ID (e.g., "https://openalex.org/A123") */
  id: string;
  /** Display name */
  displayName: string;
  /** Additional metadata from embedded data */
  metadata?: Record<string, unknown>;
}

/**
 * API-based relationship query configuration
 */
export interface ApiRelationshipQuery {
  /** Query source type */
  source: 'api';
  /**
   * Build the OpenAlex API filter string for this relationship
   * @param entityId - The ID of the source entity
   * @returns Filter string (e.g., "author.id:A123")
   */
  buildFilter: (entityId: string) => string;
  /** Optional: Page size for pagination (default: 25) */
  pageSize?: number;
  /** Optional: Fields to select in the API response */
  select?: string[];
}

/**
 * Embedded data relationship query configuration
 */
export interface EmbeddedRelationshipQuery {
  /** Query source type */
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
  /** Entity ID (e.g., "https://openalex.org/I123") */
  id: string;
  /** Additional metadata from embedded data */
  metadata?: Record<string, unknown>;
}

/**
 * Embedded data with resolution - extracts IDs from embedded data, then batch-fetches display names
 * Use this when embedded data contains only IDs without display names (e.g., institution lineage)
 */
export interface EmbeddedWithResolutionQuery {
  /** Query source type */
  source: 'embedded-with-resolution';
  /**
   * Extract entity IDs from embedded data (display names will be fetched separately)
   * @param entityData - The source entity's data
   * @returns Array of items with IDs that need display name resolution
   */
  extractIds: (entityData: Record<string, unknown>) => EmbeddedItemNeedingResolution[];
  /** Fields to select when fetching entities for resolution */
  resolutionSelect?: string[];
}

/**
 * Configuration for a single relationship query
 * @template SourceType - The type of the source entity (the entity we're querying from)
 * @template TargetType - The type of the target entity (the entity type returned by the query)
 */
export type RelationshipQueryConfig<
  TargetType extends EntityType = EntityType
> = {
  /** The type of relationship (e.g., AUTHORSHIP, REFERENCE) */
  type: RelationshipTypeString;

  /** The target entity type to query (e.g., 'works', 'authors') */
  targetType: TargetType;

  /** Human-readable label for this relationship */
  label: string;
} & (ApiRelationshipQuery | EmbeddedRelationshipQuery | EmbeddedWithResolutionQuery);

/**
 * Complete relationship query configuration for an entity type
 */
export interface EntityRelationshipQueries {
  /** Inbound relationships (other entities → this entity) */
  inbound: RelationshipQueryConfig[];

  /** Outbound relationships (this entity → other entities) */
  outbound: RelationshipQueryConfig[];
}

/**
 * Registry mapping each entity type to its relationship queries
 */
export const ENTITY_RELATIONSHIP_QUERIES: Record<EntityType, EntityRelationshipQueries> = {
  /**
   * Authors
   * - Outbound: Institutions, topics (from embedded data in affiliations[], topics[])
   * - Inbound: Works they authored (cross-type: author.id filter on works endpoint)
   */
  authors: {
    inbound: [
      {
        source: 'api',
        type: 'AUTHORSHIP',
        targetType: 'works',
        label: 'Works Authored',
        buildFilter: (id) => `author.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [
      {
        source: 'embedded',
        type: 'AFFILIATION',
        targetType: 'institutions',
        label: 'Affiliated Institutions',
        extractEmbedded: (entityData) => {
          const affiliations = entityData.affiliations as
          	Array<Record<string, unknown>> | undefined;
          if (!affiliations || !Array.isArray(affiliations)) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const affiliation of affiliations) {
            const institution = affiliation.institution as Record<string, unknown> | undefined;
            if (!institution) continue;

            results.push({
              id: institution.id as string,
              displayName: institution.display_name as string,
              metadata: {
                years: affiliation.years,
              },
            });
          }
          return results;
        },
      },
      {
        source: 'embedded',
        type: 'author_researches',
        targetType: 'topics',
        label: 'Research Topics',
        extractEmbedded: (entityData) => {
          const topics = entityData.topics as Array<Record<string, unknown>> | undefined;
          if (!topics || !Array.isArray(topics)) return [];

          return topics.map((topic) => ({
            id: topic.id as string,
            displayName: topic.display_name as string,
            metadata: {
              count: topic.count,
            },
          }));
        },
      },
    ],
  },

  /**
   * Works
   * - Outbound: Referenced works, related works (same-type queries), authors/sources/topics (from embedded data)
   * - Inbound: Works that cite this work (same-type query via cites filter)
   */
  works: {
    inbound: [
      {
        source: 'api',
        type: 'REFERENCE',
        targetType: 'works',
        label: 'Cited By (Citing Works)',
        buildFilter: (id) => `cites:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [
      {
        source: 'api',
        type: 'REFERENCE',
        targetType: 'works',
        label: 'References (Works Cited)',
        buildFilter: (id) => `cited_by:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
      {
        source: 'api',
        type: 'related_to',
        targetType: 'works',
        label: 'Related Works',
        buildFilter: (id) => `related_to:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
      {
        source: 'embedded',
        type: 'AUTHORSHIP',
        targetType: 'authors',
        label: 'Authors',
        extractEmbedded: (entityData) => {
          const authorships = entityData.authorships as Array<Record<string, unknown>> | undefined;
          if (!authorships || !Array.isArray(authorships)) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const authorship of authorships) {
            const author = authorship.author as Record<string, unknown> | undefined;
            if (!author) continue;

            results.push({
              id: author.id as string,
              displayName: author.display_name as string,
              metadata: {
                author_position: authorship.author_position,
                institutions: authorship.institutions,
              },
            });
          }
          return results;
        },
      },
      {
        source: 'embedded',
        type: 'TOPIC',
        targetType: 'topics',
        label: 'Topics',
        extractEmbedded: (entityData) => {
          const topics = entityData.topics as Array<Record<string, unknown>> | undefined;
          if (!topics || !Array.isArray(topics)) return [];

          return topics.map((topic) => ({
            id: topic.id as string,
            displayName: topic.display_name as string,
            metadata: {
              score: topic.score,
            },
          }));
        },
      },
      {
        source: 'embedded',
        type: 'PUBLICATION',
        targetType: 'sources',
        label: 'Published In',
        extractEmbedded: (
          	entityData
          ) => {
          const primaryLocation = entityData.primary_location as
            Record<string, unknown> | undefined;
          if (!primaryLocation) return [];

          const source = primaryLocation.source as Record<string, unknown> | undefined;
          if (!source) return [];

          return [{
            id: source.id as string,
            displayName: source.display_name as string,
            metadata: {
              is_oa: primaryLocation.is_oa,
              version: primaryLocation.version,
            },
          }];
        },
      },
      {
        source: 'embedded',
        type: 'funded_by',
        targetType: 'funders',
        label: 'Funded By',
        extractEmbedded: (entityData) => {
          const grants = entityData.grants as Array<Record<string, unknown>> | undefined;
          if (!grants || !Array.isArray(grants)) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const grant of grants) {
            const funderId = grant.funder as string | undefined;
            const funderDisplayName = grant.funder_display_name as string | undefined;
            if (!funderId) continue;

            results.push({
              id: funderId,
              displayName: funderDisplayName || funderId,
              metadata: {
                award_id: grant.award_id,
              },
            });
          }
          return results;
        },
      },
    ],
  },

  /**
   * Institutions
   * - Outbound: Child institutions (same-type query via lineage filter), parent via embedded lineage[]
   * - Inbound: Authors affiliated, works from institution (cross-type queries)
   */
  institutions: {
    inbound: [
      {
        source: 'api',
        type: 'AFFILIATION',
        targetType: 'authors',
        label: 'Affiliated Authors',
        buildFilter: (id) => `last_known_institutions.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'orcid', 'works_count', 'cited_by_count'],
      },
      {
        source: 'api',
        type: 'AFFILIATION',
        targetType: 'works',
        label: 'Works from Institution',
        buildFilter: (id) => `institutions.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [
      {
        source: 'api',
        type: 'LINEAGE',
        targetType: 'institutions',
        label: 'Child Institutions',
        buildFilter: (id) => `lineage:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'country_code', 'type', 'works_count'],
      },
      {
        source: 'embedded',
        type: 'institution_has_repository',
        	targetType: 'sources',
        label: 'Repositories',
        extractEmbedded: (entityData) => {
          const repositories = entityData.repositories as
            Array<Record<string, unknown>> | undefined;
          if (!repositories || !Array.isArray(repositories)) return [];

          return repositories.map((repo) => ({
            id: repo.id as string,
            displayName: repo.display_name as string,
            metadata: {
              host_organization: repo.host_organization,
              host_organization_name: repo.host_organization_name,
            },
          }));
        },
      },
      {
        source: 'embedded-with-resolution',
        type: 'LINEAGE',
        targetType: 'institutions',
        label: 'Parent Institutions',
        extractIds: (entityData) => {
          const lineage = entityData.lineage as string[] | undefined;
          if (!lineage || !Array.isArray(lineage) || lineage.length === 0) return [];

          // Return all parent institutions in lineage (immediate parent first)
          return lineage.map((id, index) => ({
            id,
            metadata: {
              lineage_position: index,
            },
          }));
        },
        resolutionSelect: ['id', 'display_name', 'country_code', 'type'],
      },
    ],
  },

  /**
   * Sources (journals, conferences)
   * - Outbound: Publisher/host organization (from embedded data)
   * - Inbound: Works published in this source
   */
  sources: {
    inbound: [
      {
        source: 'api',
        type: 'PUBLICATION',
        targetType: 'works',
        label: 'Published Works',
        buildFilter: (id) => `primary_location.source.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
      {
        source: 'api',
        type: 'institution_has_repository',
        targetType: 'institutions',
        label: 'Hosting Institutions',
        buildFilter: (id) => `repositories.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'country_code', 'type', 'works_count'],
      },
    ],
    outbound: [
      {
        source: 'embedded',
        type: 'HOST_ORGANIZATION',
        	targetType: 'publishers',
        label: 'Published By',
        extractEmbedded: (entityData) => {
          const hostOrg = entityData.host_organization as
            Record<string, unknown> | string | undefined;
          const hostOrgName = entityData.host_organization_name as string | undefined;

          if (!hostOrg) return [];

          // host_organization can be either a string ID or an object
          if (typeof hostOrg === 'string') {
            return [{
              id: hostOrg,
              displayName: hostOrgName || hostOrg, // Use host_organization_name if available
              metadata: {},
            }];
          }

          return [{
            id: hostOrg.id as string,
            displayName: hostOrg.display_name as string,
            metadata: {
              country_codes: hostOrg.country_codes,
              lineage: hostOrg.lineage,
            },
          }];
        },
      },
    ],
  },

  /**
   * Topics
   * - Outbound: Field, domain (from embedded data)
   * - Inbound: Works on this topic, authors researching this topic
   */
  topics: {
    inbound: [
      {
        source: 'api',
        type: 'TOPIC',
        targetType: 'works',
        label: 'Works on Topic',
        buildFilter: (id) => `topics.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
      {
        source: 'api',
        type: 'author_researches',
        targetType: 'authors',
        label: 'Authors Researching',
        buildFilter: (id) => `topics.id:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'orcid', 'works_count', 'cited_by_count'],
      },
    ],
    outbound: [
      {
        source: 'embedded',
        type: 'topic_part_of_field',
        targetType: 'fields',
        label: 'Field',
        extractEmbedded: (entityData) => {
          const field = entityData.field as Record<string, unknown> | undefined;
          if (!field) return [];

          return [{
            id: field.id as string,
            displayName: field.display_name as string,
            metadata: {},
          }];
        },
      },
      {
        source: 'embedded',
        type: 'field_part_of_domain',
        targetType: 'domains',
        label: 'Domain',
        extractEmbedded: (entityData) => {
          const domain = entityData.domain as Record<string, unknown> | undefined;
          if (!domain) return [];

          return [{
            id: domain.id as string,
            displayName: domain.display_name as string,
            metadata: {},
          }];
        },
      },
      {
        source: 'embedded',
        type: 'topic_part_of_subfield',
        targetType: 'subfields',
        label: 'Subfield',
        extractEmbedded: (entityData) => {
          const subfield = entityData.subfield as Record<string, unknown> | undefined;
          if (!subfield) return [];

          return [{
            id: subfield.id as string,
            displayName: subfield.display_name as string,
            metadata: {},
          }];
        },
      },
    ],
  },

  /**
   * Concepts (deprecated, replaced by topics)
   * - Legacy entity type, minimal relationship support
   */
  concepts: {
    inbound: [],
    outbound: [],
  },

  /**
   * Publishers
   * - Outbound: None
   * - Inbound: Sources they host
   */
  publishers: {
    inbound: [
      {
        source: 'api',
        type: 'HOST_ORGANIZATION',
        targetType: 'sources',
        label: 'Hosted Sources',
        buildFilter: (id) => `host_organization:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'issn_l', 'type', 'works_count'],
      },
    ],
    outbound: [],
  },

  /**
   * Funders
   * - Outbound: None
   * - Inbound: Works they funded
   */
  funders: {
    inbound: [
      {
        source: 'api',
        type: 'funded_by',
        targetType: 'works',
        label: 'Funded Works',
        buildFilter: (id) => `grants.funder:${id}`,
        pageSize: 25,
        select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
      },
    ],
    outbound: [],
  },

  /**
   * Keywords
   * - New entity type, minimal relationship support for now
   */
  keywords: {
    inbound: [],
    outbound: [],
  },

  /**
   * Domains (Taxonomy entities - hierarchical parent/child, not edge-based)
   */
  domains: {
    inbound: [],
    outbound: [],
  },

  /**
   * Fields (Taxonomy entities - hierarchical parent/child, not edge-based)
   */
  fields: {
    inbound: [],
    outbound: [],
  },

  /**
   * Subfields (Taxonomy entities - hierarchical parent/child, not edge-based)
   */
  subfields: {
    inbound: [],
    outbound: [],
  },
};

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
