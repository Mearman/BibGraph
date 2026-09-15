/**
 * Work entity relationship extractors
 */

import { RelationType } from '@bibgraph/types';

import type { RelationshipItem, RelationshipSection } from '@/types/relationship';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship';

import {
  createRelationshipItem,
  createRelationshipSection,
} from '../relationship-helpers';
import { isPlainObject, readArray, readNumber, readObject, readString, readStringArray } from './unknown-helpers';

/**
 * AUTHORSHIP: Work → Authors
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @returns Relationship sections extracted from the work's authorships, or an empty array if there are none
 */
const extractWorkAuthorships = (
  data: Record<string, unknown>,
  workId: string,
): RelationshipSection[] => {
  const authorships = readArray(data, 'authorships');
  if (authorships === undefined || authorships.length === 0) {
    return [];
  }

  const authorItems: RelationshipItem[] = [];
  for (const authorship of authorships) {
    if (!isPlainObject(authorship)) {
      continue;
    }
    const author = readObject(authorship, 'author');
    if (author === undefined) {
      continue;
    }
    const authorId = readString(author, 'id');
    const authorName = readString(author, 'display_name');
    if (authorId === undefined || authorName === undefined) {
      continue;
    }
    authorItems.push(
      createRelationshipItem(
        workId,
        authorId,
        'works',
        'authors',
        RelationType.AUTHORSHIP,
        'outbound',
        authorName,
      ),
    );
  }

  if (authorItems.length === 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.AUTHORSHIP,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.AUTHORSHIP],
      authorItems,
    ),
  ];
};

/**
 * PUBLICATION: Work → Source
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @returns Relationship sections extracted from the work's primary publication location, or an empty array if there is none
 */
const extractWorkPublication = (
  data: Record<string, unknown>,
  workId: string,
): RelationshipSection[] => {
  const primaryLocation = readObject(data, 'primary_location');
  if (primaryLocation === undefined) {
    return [];
  }

  const source = readObject(primaryLocation, 'source');
  if (source === undefined) {
    return [];
  }

  const sourceId = readString(source, 'id');
  const sourceName = readString(source, 'display_name');
  if (sourceId === undefined || sourceName === undefined) {
    return [];
  }

  const sourceItem = createRelationshipItem(
    workId,
    sourceId,
    'works',
    'sources',
    RelationType.PUBLICATION,
    'outbound',
    sourceName,
  );

  return [
    createRelationshipSection(
      RelationType.PUBLICATION,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.PUBLICATION],
      [sourceItem],
    ),
  ];
};

/**
 * REFERENCE: Work → Referenced Works
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @returns Relationship sections extracted from the work's references, or an empty array if there are none
 */
const extractWorkReferences = (
  data: Record<string, unknown>,
  workId: string,
): RelationshipSection[] => {
  const referencedWorks = readStringArray(data, 'referenced_works');
  if (referencedWorks === undefined || referencedWorks.length === 0) {
    return [];
  }

  const referenceItems: RelationshipItem[] = referencedWorks.map((referenceWorkId) =>
    createRelationshipItem(
      workId,
      referenceWorkId,
      'works',
      'works',
      RelationType.REFERENCE,
      'outbound',
      referenceWorkId, // Only have ID, not display name
    ),
  );

  return [
    createRelationshipSection(
      RelationType.REFERENCE,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.REFERENCE],
      referenceItems,
      true, // Partial data - only IDs available
    ),
  ];
};

/**
 * TOPIC: Work → Topics
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @returns Relationship sections extracted from the work's topics, or an empty array if there are none
 */
const extractWorkTopics = (
  data: Record<string, unknown>,
  workId: string,
): RelationshipSection[] => {
  const workTopics = readArray(data, 'topics');
  if (workTopics === undefined || workTopics.length === 0) {
    return [];
  }

  const topicItems: RelationshipItem[] = [];
  for (const topic of workTopics) {
    if (!isPlainObject(topic)) {
      continue;
    }
    const topicId = readString(topic, 'id');
    const topicName = readString(topic, 'display_name');
    if (topicId === undefined || topicName === undefined) {
      continue;
    }
    topicItems.push(
      createRelationshipItem(
        workId,
        topicId,
        'works',
        'topics',
        RelationType.TOPIC,
        'outbound',
        topicName,
      ),
    );
  }

  if (topicItems.length === 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.TOPIC,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.TOPIC],
      topicItems,
    ),
  ];
};

/**
 * Citations (incoming references) - count only
 * @param data - Raw work data
 * @returns Relationship sections representing incoming citations, or an empty array if the work has none
 */
const extractWorkCitations = (data: Record<string, unknown>): RelationshipSection[] => {
  const citedByCount = readNumber(data, 'cited_by_count');
  if (citedByCount === undefined || citedByCount <= 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.REFERENCE,
      'inbound',
      'Citations',
      [],
      true, // Partial data - count only, no actual items
    ),
  ];
};

/**
 * FUNDED_BY: Work → Funders
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @returns Relationship sections extracted from the work's grants, or an empty array if there are none
 */
const extractWorkGrants = (
  data: Record<string, unknown>,
  workId: string,
): RelationshipSection[] => {
  const grants = readArray(data, 'grants');
  if (grants === undefined || grants.length === 0) {
    return [];
  }

  const grantItems: RelationshipItem[] = [];
  for (const grant of grants) {
    if (!isPlainObject(grant)) {
      continue;
    }
    const funderId = readString(grant, 'funder');
    const funderName = readString(grant, 'funder_display_name');
    if (funderId === undefined || funderName === undefined) {
      continue;
    }
    grantItems.push(
      createRelationshipItem(
        workId,
        funderId,
        'works',
        'funders',
        RelationType.FUNDED_BY,
        'outbound',
        funderName,
      ),
    );
  }

  if (grantItems.length === 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.FUNDED_BY,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.FUNDED_BY],
      grantItems,
    ),
  ];
};

/**
 * WORK_HAS_KEYWORD: Work → Keywords
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @returns Relationship sections extracted from the work's keywords, or an empty array if there are none
 */
const extractWorkKeywords = (
  data: Record<string, unknown>,
  workId: string,
): RelationshipSection[] => {
  const keywords = readArray(data, 'keywords');
  if (keywords === undefined || keywords.length === 0) {
    return [];
  }

  const keywordItems: RelationshipItem[] = [];
  for (const keyword of keywords) {
    if (!isPlainObject(keyword)) {
      continue;
    }
    const keywordId = readString(keyword, 'id');
    const keywordName = readString(keyword, 'display_name');
    if (keywordId === undefined || keywordName === undefined) {
      continue;
    }
    keywordItems.push(
      createRelationshipItem(
        workId,
        keywordId,
        'works',
        'keywords',
        RelationType.WORK_HAS_KEYWORD,
        'outbound',
        keywordName,
      ),
    );
  }

  if (keywordItems.length === 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.WORK_HAS_KEYWORD,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.WORK_HAS_KEYWORD],
      keywordItems,
    ),
  ];
};

/**
 * CONCEPT: Work → Concepts (legacy)
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @returns Relationship sections extracted from the work's concepts, deduplicated by ID, or an empty array if there are none
 */
const extractWorkConcepts = (
  data: Record<string, unknown>,
  workId: string,
): RelationshipSection[] => {
  const concepts = readArray(data, 'concepts');
  if (concepts === undefined || concepts.length === 0) {
    return [];
  }

  // Deduplicate concepts by ID (OpenAlex API may return duplicates)
  const seenConceptIds = new Set<string>();
  const conceptItems: RelationshipItem[] = [];
  for (const concept of concepts) {
    if (!isPlainObject(concept)) {
      continue;
    }
    const conceptId = readString(concept, 'id');
    const conceptName = readString(concept, 'display_name');
    if (conceptId === undefined || conceptName === undefined || seenConceptIds.has(conceptId)) {
      continue;
    }
    seenConceptIds.add(conceptId);
    conceptItems.push(
      createRelationshipItem(
        workId,
        conceptId,
        'works',
        'concepts',
        RelationType.CONCEPT,
        'outbound',
        conceptName,
      ),
    );
  }

  if (conceptItems.length === 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.CONCEPT,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.CONCEPT],
      conceptItems,
    ),
  ];
};

export interface WorkRelationships {
  /**
  Outgoing relationship sections (this work → other entities)
   */
  outgoing: RelationshipSection[];

  /**
  Incoming relationship sections (other entities → this work)
   */
  incoming: RelationshipSection[];
}

/**
 * Extract relationships from Work entity
 * @param data - Raw work data from OpenAlex API
 * @param workId - The work's OpenAlex ID
 * @returns Outgoing and incoming relationship sections extracted from the work's data
 */
export const extractWorkRelationships = (
  data: Record<string, unknown>,
  workId: string,
): WorkRelationships => {
  return {
    outgoing: [
      ...extractWorkAuthorships(data, workId),
      ...extractWorkPublication(data, workId),
      ...extractWorkReferences(data, workId),
      ...extractWorkTopics(data, workId),
      ...extractWorkGrants(data, workId),
      ...extractWorkKeywords(data, workId),
      ...extractWorkConcepts(data, workId),
    ],
    incoming: [...extractWorkCitations(data)],
  };
};
