/**
 * Author entity relationship extractors
 */

import { RelationType } from '@bibgraph/types';

import type { RelationshipItem, RelationshipSection } from '@/types/relationship';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship';

import {
  createRelationshipItem,
  createRelationshipSection,
} from '../relationship-helpers';
import { isPlainObject, readArray, readObject, readString } from './unknown-helpers';

/**
 * AFFILIATION: Author → Institutions
 * @param data - Raw author data
 * @param authorId - The author's OpenAlex ID
 * @returns Relationship sections extracted from the author's affiliations, or an empty array if none are present
 */
const extractAuthorAffiliations = (
  data: Record<string, unknown>,
  authorId: string,
): RelationshipSection[] => {
  const affiliations = readArray(data, 'affiliations');
  if (affiliations === undefined || affiliations.length === 0) {
    return [];
  }

  const affiliationItems: RelationshipItem[] = [];
  for (const affiliation of affiliations) {
    if (!isPlainObject(affiliation)) {
      continue;
    }
    const institution = readObject(affiliation, 'institution');
    if (institution === undefined) {
      continue;
    }
    const institutionId = readString(institution, 'id');
    const institutionName = readString(institution, 'display_name');
    if (institutionId === undefined || institutionName === undefined) {
      continue;
    }
    affiliationItems.push(
      createRelationshipItem(
        authorId,
        institutionId,
        'authors',
        'institutions',
        RelationType.AFFILIATION,
        'outbound',
        institutionName,
      ),
    );
  }

  if (affiliationItems.length === 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.AFFILIATION,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.AFFILIATION],
      affiliationItems,
    ),
  ];
};

/**
 * AUTHOR_RESEARCHES: Author → Topics
 * @param data - Raw author data
 * @param authorId - The author's OpenAlex ID
 * @returns Relationship sections extracted from the author's research topics, or an empty array if none are present
 */
const extractAuthorTopics = (
  data: Record<string, unknown>,
  authorId: string,
): RelationshipSection[] => {
  const topics = readArray(data, 'topics');
  if (topics === undefined || topics.length === 0) {
    return [];
  }

  const topicItems: RelationshipItem[] = [];
  for (const topic of topics) {
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
        authorId,
        topicId,
        'authors',
        'topics',
        RelationType.AUTHOR_RESEARCHES,
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
      RelationType.AUTHOR_RESEARCHES,
      'outbound',
      'Research Topics',
      topicItems,
    ),
  ];
};

/**
 * Extract relationships from Author entity
 * @param data - Raw author data from OpenAlex API
 * @param authorId - The author's OpenAlex ID
 * @returns Outgoing relationship sections extracted from the author's data
 */
export const extractAuthorRelationships = (
  data: Record<string, unknown>,
  authorId: string,
): RelationshipSection[] => {
  return [...extractAuthorAffiliations(data, authorId), ...extractAuthorTopics(data, authorId)];
};
