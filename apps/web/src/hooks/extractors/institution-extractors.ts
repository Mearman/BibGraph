/**
 * Institution entity relationship extractors
 * @module extractors/institution-extractors
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
 * Extract relationships from Institution entity
 * @param data - Raw institution data from OpenAlex API
 * @param institutionId - The institution's OpenAlex ID
 * @param outgoing - Array to push outgoing relationship sections to
 */
export const extractInstitutionRelationships = (
  data: Record<string, unknown>,
  institutionId: string,
  outgoing: RelationshipSection[],
): void => {
  extractInstitutionLineage(data, institutionId, outgoing);
  extractInstitutionTopics(data, institutionId, outgoing);
  extractInstitutionRepositories(data, institutionId, outgoing);
  extractInstitutionRoles(data, institutionId, outgoing);
};

/**
 * LINEAGE: Institution → Parent Institutions
 * @param data - Raw institution data
 * @param institutionId - The institution's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractInstitutionLineage = (
  data: Record<string, unknown>,
  institutionId: string,
  outgoing: RelationshipSection[],
): void => {
  const lineage = data.lineage as string[] | undefined;
  if (lineage && lineage.length > 1) {
    const parentIds = lineage.filter((id) => id !== institutionId);
    if (parentIds.length > 0) {
      const parentItems: RelationshipItem[] = parentIds.map((parentId) =>
        createRelationshipItem(
          institutionId,
          parentId,
          'institutions' as EntityType,
          'institutions' as EntityType,
          RelationType.LINEAGE,
          'outbound',
          parentId,
        ),
      );

      outgoing.push(
        createRelationshipSection(
          RelationType.LINEAGE,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.LINEAGE],
          parentItems,
          true,
        ),
      );
    }
  }
};

/**
 * TOPIC: Institution → Topics
 * @param data - Raw institution data
 * @param institutionId - The institution's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractInstitutionTopics = (
  data: Record<string, unknown>,
  institutionId: string,
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
          institutionId,
          topicId,
          'institutions' as EntityType,
          'topics' as EntityType,
          RelationType.TOPIC,
          'outbound',
          topicName,
        );
      });

    if (topicItems.length > 0) {
      outgoing.push(
        createRelationshipSection(RelationType.TOPIC, 'outbound', 'Research Focus', topicItems),
      );
    }
  }
};

/**
 * INSTITUTION_HAS_REPOSITORY: Institution → Sources
 * @param data - Raw institution data
 * @param institutionId - The institution's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractInstitutionRepositories = (
  data: Record<string, unknown>,
  institutionId: string,
  outgoing: RelationshipSection[],
): void => {
  const repositories = data.repositories as
    | Array<{
        id?: string;
        display_name?: string;
        host_organization?: string;
      }>
    | undefined;

  if (repositories && repositories.length > 0) {
    const repoItems: RelationshipItem[] = repositories
      .filter((repo) => repo.id && repo.display_name)
      .map((repo) => {
        const repoId = safeStringId(repo.id);
        const repoName = safeStringId(repo.display_name);
        return createRelationshipItem(
          institutionId,
          repoId,
          'institutions' as EntityType,
          'sources' as EntityType,
          RelationType.INSTITUTION_HAS_REPOSITORY,
          'outbound',
          repoName,
        );
      });

    if (repoItems.length > 0) {
      outgoing.push(
        createRelationshipSection(
          RelationType.INSTITUTION_HAS_REPOSITORY,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.INSTITUTION_HAS_REPOSITORY],
          repoItems,
        ),
      );
    }
  }
};

/**
 * HAS_ROLE: Institution → Other Entities
 * @param data - Raw institution data
 * @param institutionId - The institution's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractInstitutionRoles = (
  data: Record<string, unknown>,
  institutionId: string,
  outgoing: RelationshipSection[],
): void => {
  const roles = data.roles as
    | Array<{
        role?: string;
        id?: string;
        works_count?: number;
      }>
    | undefined;

  if (roles && roles.length > 0) {
    const roleItems: RelationshipItem[] = roles
      .filter((role) => role.role && role.id)
      .map((role) => {
        const targetId = safeStringId(role.id);
        const roleName = role.role || '';
        let targetType: EntityType = 'works';
        switch (roleName) {
          case 'funder': {
            targetType = 'funders';
            break;
          }
          case 'institution': {
            targetType = 'institutions';
            break;
          }
          case 'publisher': {
            targetType = 'publishers';
            break;
          }
        }

        return createRelationshipItem(
          institutionId,
          targetId,
          'institutions' as EntityType,
          targetType,
          RelationType.HAS_ROLE,
          'outbound',
          `as ${roleName}`,
        );
      });

    if (roleItems.length > 0) {
      outgoing.push(
        createRelationshipSection(
          RelationType.HAS_ROLE,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.HAS_ROLE],
          roleItems,
        ),
      );
    }
  }
};
