/**
 * Relationship Extraction Utilities
 *
 * Extracts relationships from OpenAlex entity data for graph visualization. This logic is shared between catalogue sources and cache sources.
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType as RT } from '@bibgraph/types';

import type { GraphSourceRelationship } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Read a string field from an untyped OpenAlex entity record, returning `undefined` when the field is missing or is not actually a string.
 */
const getString = (source: Readonly<Record<string, unknown>>, key: string): string | undefined => {
  const value = source[key];
  return isString(value) ? value : undefined;
};

/**
 * Read a string-array field from an untyped OpenAlex entity record, dropping any entries that are not actually strings.
 */
const getStringArray = (source: Readonly<Record<string, unknown>>, key: string): readonly string[] => {
  const value = source[key];
  return Array.isArray(value) ? value.filter(isString) : [];
};

/**
 * Read a nested object field from an untyped OpenAlex entity record, returning `undefined` when the field is missing or is not an object.
 */
const getRecord = (source: Readonly<Record<string, unknown>>, key: string): Record<string, unknown> | undefined => {
  const value = source[key];
  return isRecord(value) ? value : undefined;
};

/**
 * Read an object-array field from an untyped OpenAlex entity record, dropping any entries that are not actually objects.
 */
const getRecordArray = (source: Readonly<Record<string, unknown>>, key: string): readonly Record<string, unknown>[] => {
  const value = source[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
};

/**
 * Normalize an OpenAlex ID by extracting the short ID from a URL if needed. e.g., "https://openalex.org/A5048491430" -\> "A5048491430"
 */
export const normalizeOpenAlexId = (id: string): string => {
  if (!id) return id;
  // If it's a URL, extract just the ID part
  const urlMatch = /openalex\.org\/([ACDFIKPQSTW]\d+)$/i.exec(id);
  if (urlMatch) {
    return urlMatch[1].toUpperCase();
  }
  // Already a short ID - normalize to uppercase
  return id.toUpperCase();
};

/**
 * Extract display label from entity data based on entity type
 */
export const extractEntityLabel = (entityType: EntityType, entityId: string, entityData: Record<string, unknown>): string => {
  switch (entityType) {
    case 'works': {
      const title = getString(entityData, 'title');
      if (title !== undefined && title !== '') return title;
      const displayName = getString(entityData, 'display_name');
      return displayName !== undefined && displayName !== '' ? displayName : entityId;
    }
    case 'authors':
    case 'sources':
    case 'institutions':
    case 'topics':
    case 'concepts':
    case 'publishers':
    case 'funders':
    case 'keywords':
    case 'domains':
    case 'fields':
    case 'subfields': {
      const displayName = getString(entityData, 'display_name');
      return displayName !== undefined && displayName !== '' ? displayName : entityId;
    }
    default:
      return entityType satisfies never;
  }
};

/**
 * Extract TOPIC-style relationships (an entity's `topics` array of `{ id, display_name }` pairs) shared by works, authors, institutions and sources.
 */
const extractTopicEntries = (data: Readonly<Record<string, unknown>>, relationType: RT): GraphSourceRelationship[] => {
  const relationships: GraphSourceRelationship[] = [];
  for (const topic of getRecordArray(data, 'topics')) {
    const topicId = getString(topic, 'id');
    if (topicId !== undefined && topicId !== '') {
      relationships.push({
        targetId: normalizeOpenAlexId(topicId),
        targetType: 'topics',
        relationType,
        targetLabel: getString(topic, 'display_name'),
      });
    }
  }
  return relationships;
};

/**
 * Extract relationships from a Work entity
 */
export const extractWorkRelationships = (data: Record<string, unknown>): GraphSourceRelationship[] => {
  const relationships: GraphSourceRelationship[] = [];

  // Authorships -> Authors
  for (const authorship of getRecordArray(data, 'authorships')) {
    const author = getRecord(authorship, 'author');
    const authorId = author !== undefined ? getString(author, 'id') : undefined;
    if (authorId !== undefined && authorId !== '') {
      relationships.push({
        targetId: normalizeOpenAlexId(authorId),
        targetType: 'authors',
        relationType: RT.AUTHORSHIP,
        targetLabel: author !== undefined ? getString(author, 'display_name') : undefined,
      });
    }
  }

  // Primary location -> Source
  const primaryLocation = getRecord(data, 'primary_location');
  const primarySource = primaryLocation !== undefined ? getRecord(primaryLocation, 'source') : undefined;
  const primarySourceId = primarySource !== undefined ? getString(primarySource, 'id') : undefined;
  if (primarySourceId !== undefined && primarySourceId !== '') {
    relationships.push({
      targetId: normalizeOpenAlexId(primarySourceId),
      targetType: 'sources',
      relationType: RT.PUBLICATION,
      targetLabel: primarySource !== undefined ? getString(primarySource, 'display_name') : undefined,
    });
  }

  // Referenced works (only have IDs, no display_name available)
  for (const referenceId of getStringArray(data, 'referenced_works')) {
    relationships.push({
      targetId: normalizeOpenAlexId(referenceId),
      targetType: 'works',
      relationType: RT.REFERENCE,
    });
  }

  // Topics
  relationships.push(...extractTopicEntries(data, RT.TOPIC));

  // Grants -> Funders
  for (const grant of getRecordArray(data, 'grants')) {
    const funderId = getString(grant, 'funder');
    if (funderId !== undefined && funderId !== '') {
      relationships.push({
        targetId: normalizeOpenAlexId(funderId),
        targetType: 'funders',
        relationType: RT.FUNDED_BY,
        targetLabel: getString(grant, 'funder_display_name'),
      });
    }
  }

  return relationships;
};

/**
 * Extract relationships from an Author entity
 */
export const extractAuthorRelationships = (data: Record<string, unknown>): GraphSourceRelationship[] => {
  const relationships: GraphSourceRelationship[] = [];

  // Affiliations -> Institutions
  for (const affiliation of getRecordArray(data, 'affiliations')) {
    const institution = getRecord(affiliation, 'institution');
    const institutionId = institution !== undefined ? getString(institution, 'id') : undefined;
    if (institutionId !== undefined && institutionId !== '') {
      relationships.push({
        targetId: normalizeOpenAlexId(institutionId),
        targetType: 'institutions',
        relationType: RT.AFFILIATION,
        targetLabel: institution !== undefined ? getString(institution, 'display_name') : undefined,
      });
    }
  }

  // Topics
  relationships.push(...extractTopicEntries(data, RT.AUTHOR_RESEARCHES));

  return relationships;
};

/**
 * Extract relationships from an Institution entity
 */
export const extractInstitutionRelationships = (data: Record<string, unknown>): GraphSourceRelationship[] => {
  const relationships: GraphSourceRelationship[] = [];
  const rawId = getString(data, 'id');
  const institutionId = normalizeOpenAlexId(rawId ?? '');

  // Topics
  relationships.push(...extractTopicEntries(data, RT.TOPIC));

  // Lineage -> Parent institutions (only IDs available, no display_name)
  for (const parentId of getStringArray(data, 'lineage')) {
    if (parentId !== institutionId && parentId !== rawId) {
      relationships.push({
        targetId: normalizeOpenAlexId(parentId),
        targetType: 'institutions',
        relationType: RT.LINEAGE,
      });
    }
  }

  return relationships;
};

/**
 * Extract relationships from a Source entity
 */
export const extractSourceRelationships = (data: Record<string, unknown>): GraphSourceRelationship[] => {
  const relationships: GraphSourceRelationship[] = [];

  // Host organization -> Publisher OpenAlex provides host_organization (ID) and host_organization_name (display name)
  const hostOrg = getString(data, 'host_organization');
  const hostOrgName = getString(data, 'host_organization_name');
  if (hostOrg !== undefined && hostOrg !== '') {
    relationships.push({
      targetId: normalizeOpenAlexId(hostOrg),
      targetType: 'publishers',
      relationType: RT.HOST_ORGANIZATION,
      targetLabel: hostOrgName,
    });
  }

  // Topics
  relationships.push(...extractTopicEntries(data, RT.TOPIC));

  return relationships;
};

/**
 * Extract relationships from a Topic entity
 */
export const extractTopicRelationships = (data: Record<string, unknown>): GraphSourceRelationship[] => {
  const relationships: GraphSourceRelationship[] = [];

  // Field
  const field = getRecord(data, 'field');
  const fieldId = field !== undefined ? getString(field, 'id') : undefined;
  if (fieldId !== undefined && fieldId !== '') {
    relationships.push({
      targetId: normalizeOpenAlexId(fieldId),
      targetType: 'fields',
      relationType: RT.TOPIC_PART_OF_FIELD,
      targetLabel: field !== undefined ? getString(field, 'display_name') : undefined,
    });
  }

  // Domain
  const domain = getRecord(data, 'domain');
  const domainId = domain !== undefined ? getString(domain, 'id') : undefined;
  if (domainId !== undefined && domainId !== '') {
    relationships.push({
      targetId: normalizeOpenAlexId(domainId),
      targetType: 'domains',
      relationType: RT.FIELD_PART_OF_DOMAIN,
      targetLabel: domain !== undefined ? getString(domain, 'display_name') : undefined,
    });
  }

  return relationships;
};

/**
 * Extract relationships from any entity based on its type
 */
export const extractRelationships = (entityType: EntityType, entityData: Record<string, unknown>): GraphSourceRelationship[] => {
  switch (entityType) {
    case 'works':
      return extractWorkRelationships(entityData);
    case 'authors':
      return extractAuthorRelationships(entityData);
    case 'institutions':
      return extractInstitutionRelationships(entityData);
    case 'sources':
      return extractSourceRelationships(entityData);
    case 'topics':
      return extractTopicRelationships(entityData);
    case 'concepts':
    case 'publishers':
    case 'funders':
    case 'keywords':
    case 'domains':
    case 'fields':
    case 'subfields':
      // These entity types don't have relationships we extract.
      return [];
    default:
      return entityType satisfies never;
  }
};
