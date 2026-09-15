/**
 * Entity Relationship Query Registry Data
 *
 * The registry mapping each entity type to its inbound and outbound relationship queries.
 * Split out from relationship-queries.ts to keep that file within the repository's file-length
 * limit; this module holds only the data, and relationship-queries.ts holds the accessor
 * functions built on top of it.
 */

import type { EntityType } from './entities';
import { filterRecords, getArrayField, getRecordField, getStringField } from './relationship-extraction-helpers';
import type { EmbeddedRelationshipItem, EntityRelationshipQueries } from './relationship-queries';
import { isRecord } from './utils';

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
          const affiliations = getArrayField(entityData, 'affiliations');
          if (!affiliations) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const affiliation of filterRecords(affiliations)) {
            const institution = getRecordField(affiliation, 'institution');
            if (!institution) continue;

            const id = getStringField(institution, 'id');
            const displayName = getStringField(institution, 'display_name');
            if (id === undefined || displayName === undefined) continue;

            results.push({
              id,
              displayName,
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
          const topics = getArrayField(entityData, 'topics');
          if (!topics) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const topic of filterRecords(topics)) {
            const id = getStringField(topic, 'id');
            const displayName = getStringField(topic, 'display_name');
            if (id === undefined || displayName === undefined) continue;

            results.push({
              id,
              displayName,
              metadata: {
                count: topic.count,
              },
            });
          }
          return results;
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
          const authorships = getArrayField(entityData, 'authorships');
          if (!authorships) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const authorship of filterRecords(authorships)) {
            const author = getRecordField(authorship, 'author');
            if (!author) continue;

            const id = getStringField(author, 'id');
            const displayName = getStringField(author, 'display_name');
            if (id === undefined || displayName === undefined) continue;

            results.push({
              id,
              displayName,
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
          const topics = getArrayField(entityData, 'topics');
          if (!topics) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const topic of filterRecords(topics)) {
            const id = getStringField(topic, 'id');
            const displayName = getStringField(topic, 'display_name');
            if (id === undefined || displayName === undefined) continue;

            results.push({
              id,
              displayName,
              metadata: {
                score: topic.score,
              },
            });
          }
          return results;
        },
      },
      {
        source: 'embedded',
        type: 'PUBLICATION',
        targetType: 'sources',
        label: 'Published In',
        extractEmbedded: (entityData) => {
          const primaryLocation = getRecordField(entityData, 'primary_location');
          if (!primaryLocation) return [];

          const source = getRecordField(primaryLocation, 'source');
          if (!source) return [];

          const id = getStringField(source, 'id');
          const displayName = getStringField(source, 'display_name');
          if (id === undefined || displayName === undefined) return [];

          return [{
            id,
            displayName,
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
          const grants = getArrayField(entityData, 'grants');
          if (!grants) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const grant of filterRecords(grants)) {
            const funderId = getStringField(grant, 'funder');
            if (funderId === undefined) continue;
            const funderDisplayName = getStringField(grant, 'funder_display_name');

            results.push({
              id: funderId,
              displayName: funderDisplayName ?? funderId,
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
          const repositories = getArrayField(entityData, 'repositories');
          if (!repositories) return [];

          const results: EmbeddedRelationshipItem[] = [];
          for (const repo of filterRecords(repositories)) {
            const id = getStringField(repo, 'id');
            const displayName = getStringField(repo, 'display_name');
            if (id === undefined || displayName === undefined) continue;

            results.push({
              id,
              displayName,
              metadata: {
                host_organization: repo.host_organization,
                host_organization_name: repo.host_organization_name,
              },
            });
          }
          return results;
        },
      },
      {
        source: 'embedded-with-resolution',
        type: 'LINEAGE',
        targetType: 'institutions',
        label: 'Parent Institutions',
        extractIds: (entityData) => {
          const lineageField = getArrayField(entityData, 'lineage');
          if (!lineageField) return [];
          const lineage = lineageField.filter((value): value is string => typeof value === 'string');
          if (lineage.length === 0) return [];

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
          const hostOrgRaw = entityData.host_organization;
          const hostOrgName = getStringField(entityData, 'host_organization_name');

          // host_organization can be either a string ID or an object
          if (typeof hostOrgRaw === 'string') {
            return [{
              id: hostOrgRaw,
              displayName: hostOrgName ?? hostOrgRaw, // Use host_organization_name if available
              metadata: {},
            }];
          }

          if (!isRecord(hostOrgRaw)) return [];

          const id = getStringField(hostOrgRaw, 'id');
          const displayName = getStringField(hostOrgRaw, 'display_name');
          if (id === undefined || displayName === undefined) return [];

          return [{
            id,
            displayName,
            metadata: {
              country_codes: hostOrgRaw.country_codes,
              lineage: hostOrgRaw.lineage,
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
          const field = getRecordField(entityData, 'field');
          if (!field) return [];

          const id = getStringField(field, 'id');
          const displayName = getStringField(field, 'display_name');
          if (id === undefined || displayName === undefined) return [];

          return [{
            id,
            displayName,
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
          const domain = getRecordField(entityData, 'domain');
          if (!domain) return [];

          const id = getStringField(domain, 'id');
          const displayName = getStringField(domain, 'display_name');
          if (id === undefined || displayName === undefined) return [];

          return [{
            id,
            displayName,
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
          const subfield = getRecordField(entityData, 'subfield');
          if (!subfield) return [];

          const id = getStringField(subfield, 'id');
          const displayName = getStringField(subfield, 'display_name');
          if (id === undefined || displayName === undefined) return [];

          return [{
            id,
            displayName,
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
