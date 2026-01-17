/**
 * Author entity relationship extractors
 * @module extractors/author-extractors
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
 * Extract relationships from Author entity
 * @param data - Raw author data from OpenAlex API
 * @param authorId - The author's OpenAlex ID
 * @param outgoing - Array to push outgoing relationship sections to
 */
export const extractAuthorRelationships = (
  data: Record<string, unknown>,
  authorId: string,
  outgoing: RelationshipSection[],
): void => {
  extractAuthorAffiliations(data, authorId, outgoing);
  extractAuthorTopics(data, authorId, outgoing);
};

/**
 * AFFILIATION: Author → Institutions
 * @param data - Raw author data
 * @param authorId - The author's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractAuthorAffiliations = (
  data: Record<string, unknown>,
  authorId: string,
  outgoing: RelationshipSection[],
): void => {
  const affiliations = data.affiliations as
    | Array<{
        institution?: {
          id?: string;
          display_name?: string;
          ror?: string;
          country_code?: string;
          type?: string;
        };
        years?: number[];
      }>
    | undefined;

  if (affiliations && affiliations.length > 0) {
    const affiliationItems: RelationshipItem[] = affiliations
      .filter((aff) => aff.institution?.id && aff.institution?.display_name)
      .map((aff) => {
        const institution = aff.institution;
        return createRelationshipItem(
          authorId,
          safeStringId(institution?.id),
          'authors' as EntityType,
          'institutions' as EntityType,
          RelationType.AFFILIATION,
          'outbound',
          safeStringId(institution?.display_name),
        );
      });

    if (affiliationItems.length > 0) {
      outgoing.push(
        createRelationshipSection(
          RelationType.AFFILIATION,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.AFFILIATION],
          affiliationItems,
        ),
      );
    }
  }
};

/**
 * AUTHOR_RESEARCHES: Author → Topics
 * @param data - Raw author data
 * @param authorId - The author's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractAuthorTopics = (
  data: Record<string, unknown>,
  authorId: string,
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
          authorId,
          topicId,
          'authors' as EntityType,
          'topics' as EntityType,
          RelationType.AUTHOR_RESEARCHES,
          'outbound',
          topicName,
        );
      });

    if (topicItems.length > 0) {
      outgoing.push(
        createRelationshipSection(
          RelationType.AUTHOR_RESEARCHES,
          'outbound',
          'Research Topics',
          topicItems,
        ),
      );
    }
  }
};
