/**
 * Topic entity relationship extractors
 * @module extractors/topic-extractors
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';

import type { RelationshipSection } from '@/types/relationship';

import { createRelationshipItem, createRelationshipSection } from '../relationship-helpers';

/**
 * Extract relationships from Topic entity
 * @param data - Raw topic data from OpenAlex API
 * @param topicId - The topic's OpenAlex ID
 * @param outgoing - Array to push outgoing relationship sections to
 */
export const extractTopicRelationships = (
  data: Record<string, unknown>,
  topicId: string,
  outgoing: RelationshipSection[],
): void => {
  extractTopicField(data, topicId, outgoing);
  extractTopicDomain(data, topicId, outgoing);
};

/**
 * TOPIC_PART_OF_FIELD: Topic → Field
 * @param data - Raw topic data
 * @param topicId - The topic's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractTopicField = (
  data: Record<string, unknown>,
  topicId: string,
  outgoing: RelationshipSection[],
): void => {
  const field = data.field as
    | {
        id?: string;
        display_name?: string;
      }
    | undefined;

  if (field?.id && field?.display_name) {
    const fieldItem = createRelationshipItem(
      topicId,
      field.id,
      'topics' as EntityType,
      'fields' as EntityType,
      RelationType.TOPIC_PART_OF_FIELD,
      'outbound',
      field.display_name,
    );

    outgoing.push(
      createRelationshipSection(RelationType.TOPIC_PART_OF_FIELD, 'outbound', 'Field', [fieldItem]),
    );
  }
};

/**
 * FIELD_PART_OF_DOMAIN: Topic → Domain
 * @param data - Raw topic data
 * @param topicId - The topic's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractTopicDomain = (
  data: Record<string, unknown>,
  topicId: string,
  outgoing: RelationshipSection[],
): void => {
  const domain = data.domain as
    | {
        id?: string;
        display_name?: string;
      }
    | undefined;

  if (domain?.id && domain?.display_name) {
    const domainItem = createRelationshipItem(
      topicId,
      domain.id,
      'topics' as EntityType,
      'domains' as EntityType,
      RelationType.FIELD_PART_OF_DOMAIN,
      'outbound',
      domain.display_name,
    );

    outgoing.push(
      createRelationshipSection(RelationType.FIELD_PART_OF_DOMAIN, 'outbound', 'Domain', [
        domainItem,
      ]),
    );
  }
};
