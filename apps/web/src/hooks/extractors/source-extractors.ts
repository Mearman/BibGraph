/**
 * Source entity relationship extractors
 */

import { RelationType } from '@bibgraph/types';

import type { RelationshipItem, RelationshipSection } from '@/types/relationship';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship';

import {
  createRelationshipItem,
  createRelationshipSection,
} from '../relationship-helpers';
import { isPlainObject, readArray, readString } from './unknown-helpers';

/**
 * HOST_ORGANIZATION: Source → Publisher
 * @param data - Raw source data
 * @param sourceId - The source's OpenAlex ID
 * @returns Relationship sections extracted from the source's host organization, or an empty array if there is none
 */
const extractSourceHostOrganization = (
  data: Record<string, unknown>,
  sourceId: string,
): RelationshipSection[] => {
  const hostOrganization = readString(data, 'host_organization');
  const hostOrganizationName = readString(data, 'host_organization_name');

  if (hostOrganization === undefined || hostOrganizationName === undefined) {
    return [];
  }

  const publisherItem = createRelationshipItem(
    sourceId,
    hostOrganization,
    'sources',
    'publishers',
    RelationType.HOST_ORGANIZATION,
    'outbound',
    hostOrganizationName,
  );

  return [
    createRelationshipSection(
      RelationType.HOST_ORGANIZATION,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.HOST_ORGANIZATION],
      [publisherItem],
    ),
  ];
};

/**
 * TOPIC: Source → Topics
 * @param data - Raw source data
 * @param sourceId - The source's OpenAlex ID
 * @returns Relationship sections extracted from the source's topic coverage, or an empty array if there are none
 */
const extractSourceTopics = (
  data: Record<string, unknown>,
  sourceId: string,
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
        sourceId,
        topicId,
        'sources',
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

  return [createRelationshipSection(RelationType.TOPIC, 'outbound', 'Topic Coverage', topicItems)];
};

/**
 * Extract relationships from Source entity
 * @param data - Raw source data from OpenAlex API
 * @param sourceId - The source's OpenAlex ID
 * @returns Outgoing relationship sections extracted from the source's data
 */
export const extractSourceRelationships = (
  data: Record<string, unknown>,
  sourceId: string,
): RelationshipSection[] => {
  return [...extractSourceHostOrganization(data, sourceId), ...extractSourceTopics(data, sourceId)];
};
