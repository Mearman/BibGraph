/**
 * Source entity relationship extractors
 * @module extractors/source-extractors
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';

import type { RelationshipItem, RelationshipSection } from '@/types/relationship';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship';

import {
  createRelationshipItem,
  createRelationshipSection,
  safeStringId,
} from '../relationship-helpers';

/**
 * Extract relationships from Source entity
 * @param data - Raw source data from OpenAlex API
 * @param sourceId - The source's OpenAlex ID
 * @param outgoing - Array to push outgoing relationship sections to
 */
export const extractSourceRelationships = (
  data: Record<string, unknown>,
  sourceId: string,
  outgoing: RelationshipSection[],
): void => {
  extractSourceHostOrganization(data, sourceId, outgoing);
  extractSourceTopics(data, sourceId, outgoing);
};

/**
 * HOST_ORGANIZATION: Source → Publisher
 * @param data - Raw source data
 * @param sourceId - The source's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractSourceHostOrganization = (
  data: Record<string, unknown>,
  sourceId: string,
  outgoing: RelationshipSection[],
): void => {
  const hostOrganization = data.host_organization as string | undefined;
  const hostOrganizationName = data.host_organization_name as string | undefined;

  if (hostOrganization && hostOrganizationName) {
    const publisherItem = createRelationshipItem(
      sourceId,
      hostOrganization,
      'sources' as EntityType,
      'publishers' as EntityType,
      RelationType.HOST_ORGANIZATION,
      'outbound',
      hostOrganizationName,
    );

    outgoing.push(
      createRelationshipSection(
        RelationType.HOST_ORGANIZATION,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.HOST_ORGANIZATION],
        [publisherItem],
      ),
    );
  }
};

/**
 * TOPIC: Source → Topics
 * @param data - Raw source data
 * @param sourceId - The source's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractSourceTopics = (
  data: Record<string, unknown>,
  sourceId: string,
  outgoing: RelationshipSection[],
): void => {
  const topics = data.topics as
    | Array<{
        id?: string;
        display_name?: string;
        count?: number;
        score?: number;
      }>
    | undefined;

  if (topics && topics.length > 0) {
    const topicItems: RelationshipItem[] = topics
      .filter((topic) => topic.id && topic.display_name)
      .map((topic) => {
        const topicId = safeStringId(topic.id);
        const topicName = safeStringId(topic.display_name);
        return createRelationshipItem(
          sourceId,
          topicId,
          'sources' as EntityType,
          'topics' as EntityType,
          RelationType.TOPIC,
          'outbound',
          topicName,
        );
      });

    if (topicItems.length > 0) {
      outgoing.push(
        createRelationshipSection(RelationType.TOPIC, 'outbound', 'Topic Coverage', topicItems),
      );
    }
  }
};
