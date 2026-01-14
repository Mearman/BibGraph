/**
 * Entity extraction and relationship utilities for OpenAlex graph traversal.
 *
 * This module provides functions for:
 * - Detecting entity types from OpenAlex IDs
 * - Extracting relationships from entity data
 * - Normalizing OpenAlex IDs
 *
 * @module lib/entity-extraction
 */

/**
 * OpenAlex entity types supported by the API.
 */
export type EntityType =
  | 'work'
  | 'author'
  | 'institution'
  | 'source'
  | 'concept'
  | 'topic'
  | 'funder'
  | 'publisher';

/**
 * A relationship extracted from an entity.
 */
export interface ExtractedRelationship {
  /** The OpenAlex ID of the target entity */
  targetId: string;
  /** The type of relationship (e.g., 'has_author', 'cites') */
  relationshipType: string;
}

/**
 * An entity with its data payload.
 */
export interface Entity {
  id: string;
  type: EntityType;
  data: Record<string, unknown>;
}

/**
 * Map of ID prefixes to entity types.
 */
const PREFIX_TO_TYPE: Record<string, EntityType> = {
  W: 'work',
  A: 'author',
  I: 'institution',
  S: 'source',
  C: 'concept',
  T: 'topic',
  F: 'funder',
  P: 'publisher',
};

/**
 * Detect the entity type from an OpenAlex ID.
 *
 * @param id - OpenAlex ID (full URL or short form)
 * @returns The entity type, or null if not recognized
 *
 * @example
 * getEntityType('https://openalex.org/W123456789') // => 'work'
 * getEntityType('A123456789') // => 'author'
 * getEntityType('invalid') // => null
 */
export function getEntityType(id: string): EntityType | null {
  if (!id || typeof id !== 'string') return null;

  // Match the prefix letter followed by digits at the end
  const match = id.match(/([WAISCFTPG])\d+$/i);
  if (!match) return null;

  const prefix = match[1].toUpperCase();
  return PREFIX_TO_TYPE[prefix] ?? null;
}

/**
 * Normalize an OpenAlex ID to its canonical full URL form.
 *
 * @param id - OpenAlex ID in any form
 * @returns Normalized ID as full URL
 *
 * @example
 * normalizeId('W123456789') // => 'https://openalex.org/W123456789'
 * normalizeId('https://openalex.org/w123456789') // => 'https://openalex.org/W123456789'
 */
export function normalizeId(id: string): string {
  const match = id.match(/([WAISCFTPG]\d+)$/i);
  return match ? `https://openalex.org/${match[1].toUpperCase()}` : id;
}

/**
 * Extract the short ID portion from an OpenAlex URL.
 *
 * @param id - OpenAlex ID
 * @returns Short ID (e.g., 'W123456789')
 *
 * @example
 * extractShortId('https://openalex.org/W123456789') // => 'W123456789'
 */
export function extractShortId(id: string): string {
  const match = id.match(/([WAISCFTPG]\d+)$/i);
  return match ? match[1].toUpperCase() : id;
}

/**
 * Extract all relationships from an entity's data.
 *
 * This function examines the entity's type and data to extract
 * all related entity IDs based on the known relationship fields.
 *
 * @param entity - The entity to extract relationships from
 * @returns Array of extracted relationships
 *
 * @example
 * const work = { id: 'https://openalex.org/W123', type: 'work', data: {...} };
 * const relationships = extractRelationships(work);
 * // => [{ targetId: 'https://openalex.org/A456', relationshipType: 'has_author' }, ...]
 */
export function extractRelationships(entity: Entity): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];
  const data = entity.data;

  /**
   * Add a relationship if the ID is valid.
   */
  const addRelationship = (id: unknown, type: string): void => {
    if (typeof id === 'string' && getEntityType(id)) {
      relationships.push({
        targetId: normalizeId(id),
        relationshipType: type,
      });
    }
  };

  /**
   * Extract ID from an object with an 'id' field.
   */
  const extractFromObject = (obj: unknown, relationshipType: string): void => {
    if (!obj || typeof obj !== 'object') return;
    const record = obj as Record<string, unknown>;
    if (record.id) {
      addRelationship(record.id, relationshipType);
    }
  };

  /**
   * Extract IDs from an array of objects or strings.
   */
  const extractFromArray = (
    arr: unknown,
    relationshipType: string,
    idKey = 'id'
  ): void => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (typeof item === 'string') {
        addRelationship(item, relationshipType);
      } else if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        if (record[idKey]) {
          addRelationship(record[idKey], relationshipType);
        }
      }
    }
  };

  switch (entity.type) {
    case 'work':
      // Authorships -> Authors and Institutions
      if (Array.isArray(data.authorships)) {
        for (const authorship of data.authorships as Record<string, unknown>[]) {
          extractFromObject(authorship.author, 'has_author');
          if (Array.isArray(authorship.institutions)) {
            for (const inst of authorship.institutions as Record<
              string,
              unknown
            >[]) {
              extractFromObject(inst, 'authored_at_institution');
            }
          }
        }
      }

      // Primary location -> Source
      if (data.primary_location && typeof data.primary_location === 'object') {
        const loc = data.primary_location as Record<string, unknown>;
        extractFromObject(loc.source, 'published_in');
      }

      // Topics, Concepts, Funders, References
      extractFromArray(data.topics, 'has_topic');
      extractFromArray(data.concepts, 'has_concept');
      extractFromArray(data.funders, 'funded_by');
      extractFromArray(data.referenced_works, 'cites');
      extractFromArray(data.related_works, 'related_to');
      break;

    case 'author':
      extractFromArray(data.last_known_institutions, 'affiliated_with');
      extractFromArray(data.topics, 'researches_topic');
      if (Array.isArray(data.x_concepts)) {
        extractFromArray(data.x_concepts, 'researches_concept');
      }
      break;

    case 'institution':
      extractFromArray(data.associated_institutions, 'associated_with');
      extractFromArray(data.topics, 'researches_topic');
      break;

    case 'source':
      // host_organization can be a string ID or object with id
      if (typeof data.host_organization === 'string') {
        addRelationship(data.host_organization, 'hosted_by');
      } else {
        extractFromObject(data.host_organization, 'hosted_by');
      }
      extractFromArray(data.topics, 'covers_topic');
      break;

    case 'concept':
      extractFromArray(data.ancestors, 'child_of');
      extractFromArray(data.related_concepts, 'related_to');
      break;

    case 'topic':
      extractFromObject(data.domain, 'in_domain');
      extractFromObject(data.field, 'in_field');
      extractFromObject(data.subfield, 'in_subfield');
      extractFromArray(data.siblings, 'sibling_of');
      break;

    case 'funder':
      extractFromArray(data.topics, 'funds_topic');
      break;

    case 'publisher':
      extractFromObject(data.parent_publisher, 'subsidiary_of');
      break;
  }

  return relationships;
}

/**
 * Get the fields needed for relationship extraction for a given entity type.
 *
 * @param entityType - The entity type
 * @returns Comma-separated list of field names for the select parameter
 */
export function getRelationshipSelectFields(entityType: EntityType): string {
  const RELATIONSHIP_FIELDS: Record<EntityType, readonly string[]> = {
    work: [
      'id',
      'display_name',
      'authorships',
      'primary_location',
      'topics',
      'concepts',
      'funders',
      'referenced_works',
      'related_works',
      'cited_by_api_url', // URL for inbound citations (processed separately)
    ],
    author: [
      'id',
      'display_name',
      'last_known_institutions',
      'topics',
      'x_concepts',
      'works_api_url', // URL for author's works (processed separately)
    ],
    institution: [
      'id',
      'display_name',
      'associated_institutions',
      'topics',
      'works_api_url', // URL for institution's works (processed separately)
    ],
    source: [
      'id',
      'display_name',
      'host_organization',
      'topics',
      'works_api_url', // URL for source's works (processed separately)
    ],
    topic: [
      'id',
      'display_name',
      'domain',
      'field',
      'subfield',
      'siblings',
      'works_api_url', // URL for topic's works (processed separately)
    ],
    concept: [
      'id',
      'display_name',
      'ancestors',
      'related_concepts',
      'works_api_url', // URL for concept's works (processed separately)
    ],
    funder: ['id', 'display_name'], // Note: funders don't have works_api_url or topics field
    publisher: [
      'id',
      'display_name',
      'parent_publisher',
      'sources_api_url', // URL for publisher's sources (processed separately)
    ],
  };

  return RELATIONSHIP_FIELDS[entityType].join(',');
}

/**
 * Map entity type to API endpoint name.
 */
export const ENTITY_ENDPOINTS: Record<EntityType, string> = {
  work: 'works',
  author: 'authors',
  institution: 'institutions',
  source: 'sources',
  concept: 'concepts',
  topic: 'topics',
  funder: 'funders',
  publisher: 'publishers',
};

/**
 * Relationship types for filter-based entity expansions.
 *
 * These are used when constructing filter URLs to discover related entities
 * that aren't directly embedded in the entity data (unlike extractRelationships
 * which extracts IDs from entity data fields).
 *
 * Filter-based expansions use OpenAlex filter queries:
 * - institution → authors: affiliations.institution.id filter
 * - institution → child institutions: lineage filter
 * - concept → authors: x_concepts.id filter
 * - concept → sources: x_concepts.id filter
 * - concept → child concepts: ancestors.id filter
 * - topic → child topics: domain.id, field.id, subfield.id filters
 * - publisher → child publishers: lineage filter
 * - funder → works: funders.id filter
 */
export const FILTER_RELATIONSHIP_TYPES = {
  // Funder expansions (funders don't have works_api_url)
  FUNDER_WORK: 'funded_work',

  // Institution expansions
  INSTITUTION_AUTHOR: 'affiliated_author',
  INSTITUTION_CHILD: 'child_institution',

  // Concept expansions
  CONCEPT_AUTHOR: 'concept_author',
  CONCEPT_SOURCE: 'concept_source',
  CONCEPT_CHILD: 'child_concept',

  // Topic hierarchy expansions
  TOPIC_DOMAIN_CHILD: 'domain_child',
  TOPIC_FIELD_CHILD: 'field_child',
  TOPIC_SUBFIELD_CHILD: 'subfield_child',

  // Publisher expansions
  PUBLISHER_CHILD: 'child_publisher',
} as const;
