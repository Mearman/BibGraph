/**
 * Topic entity relationship extractors
 */

import { RelationType } from '@bibgraph/types';

import type { RelationshipSection } from '@/types/relationship';

import { createRelationshipItem, createRelationshipSection } from '../relationship-helpers';
import { readObject, readString } from './unknown-helpers';

/**
 * TOPIC_PART_OF_FIELD: Topic → Field
 * @param data - Raw topic data
 * @param topicId - The topic's OpenAlex ID
 * @returns Relationship sections extracted from the topic's field, or an empty array if there is none
 */
const extractTopicField = (
  data: Record<string, unknown>,
  topicId: string,
): RelationshipSection[] => {
  const field = readObject(data, 'field');
  if (field === undefined) {
    return [];
  }

  const fieldId = readString(field, 'id');
  const fieldName = readString(field, 'display_name');
  if (fieldId === undefined || fieldName === undefined) {
    return [];
  }

  const fieldItem = createRelationshipItem(
    topicId,
    fieldId,
    'topics',
    'fields',
    RelationType.TOPIC_PART_OF_FIELD,
    'outbound',
    fieldName,
  );

  return [createRelationshipSection(RelationType.TOPIC_PART_OF_FIELD, 'outbound', 'Field', [fieldItem])];
};

/**
 * FIELD_PART_OF_DOMAIN: Topic → Domain
 * @param data - Raw topic data
 * @param topicId - The topic's OpenAlex ID
 * @returns Relationship sections extracted from the topic's domain, or an empty array if there is none
 */
const extractTopicDomain = (
  data: Record<string, unknown>,
  topicId: string,
): RelationshipSection[] => {
  const domain = readObject(data, 'domain');
  if (domain === undefined) {
    return [];
  }

  const domainId = readString(domain, 'id');
  const domainName = readString(domain, 'display_name');
  if (domainId === undefined || domainName === undefined) {
    return [];
  }

  const domainItem = createRelationshipItem(
    topicId,
    domainId,
    'topics',
    'domains',
    RelationType.FIELD_PART_OF_DOMAIN,
    'outbound',
    domainName,
  );

  return [
    createRelationshipSection(RelationType.FIELD_PART_OF_DOMAIN, 'outbound', 'Domain', [domainItem]),
  ];
};

/**
 * Extract relationships from Topic entity
 * @param data - Raw topic data from OpenAlex API
 * @param topicId - The topic's OpenAlex ID
 * @returns Outgoing relationship sections extracted from the topic's data
 */
export const extractTopicRelationships = (
  data: Record<string, unknown>,
  topicId: string,
): RelationshipSection[] => {
  return [...extractTopicField(data, topicId), ...extractTopicDomain(data, topicId)];
};
