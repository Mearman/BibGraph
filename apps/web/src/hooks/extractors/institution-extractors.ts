/**
 * Institution entity relationship extractors
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';

import type { RelationshipItem, RelationshipSection } from '@/types/relationship';
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship';

import {
  createRelationshipItem,
  createRelationshipSection,
} from '../relationship-helpers';
import { isPlainObject, readArray, readString, readStringArray } from './unknown-helpers';

/**
 * LINEAGE: Institution → Parent Institutions
 * @param data - Raw institution data
 * @param institutionId - The institution's OpenAlex ID
 * @returns Relationship sections extracted from the institution's lineage, or an empty array if there are none
 */
const extractInstitutionLineage = (
  data: Record<string, unknown>,
  institutionId: string,
): RelationshipSection[] => {
  const lineage = readStringArray(data, 'lineage');
  if (lineage === undefined || lineage.length <= 1) {
    return [];
  }

  const parentIds = lineage.filter((id) => id !== institutionId);
  if (parentIds.length === 0) {
    return [];
  }

  const parentItems: RelationshipItem[] = parentIds.map((parentId) =>
    createRelationshipItem(
      institutionId,
      parentId,
      'institutions',
      'institutions',
      RelationType.LINEAGE,
      'outbound',
      parentId,
    ),
  );

  return [
    createRelationshipSection(
      RelationType.LINEAGE,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.LINEAGE],
      parentItems,
      true,
    ),
  ];
};

/**
 * TOPIC: Institution → Topics
 * @param data - Raw institution data
 * @param institutionId - The institution's OpenAlex ID
 * @returns Relationship sections extracted from the institution's research topics, or an empty array if there are none
 */
const extractInstitutionTopics = (
  data: Record<string, unknown>,
  institutionId: string,
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
        institutionId,
        topicId,
        'institutions',
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

  return [createRelationshipSection(RelationType.TOPIC, 'outbound', 'Research Focus', topicItems)];
};

/**
 * INSTITUTION_HAS_REPOSITORY: Institution → Sources
 * @param data - Raw institution data
 * @param institutionId - The institution's OpenAlex ID
 * @returns Relationship sections extracted from the institution's repositories, or an empty array if there are none
 */
const extractInstitutionRepositories = (
  data: Record<string, unknown>,
  institutionId: string,
): RelationshipSection[] => {
  const repositories = readArray(data, 'repositories');
  if (repositories === undefined || repositories.length === 0) {
    return [];
  }

  const repoItems: RelationshipItem[] = [];
  for (const repository of repositories) {
    if (!isPlainObject(repository)) {
      continue;
    }
    const repoId = readString(repository, 'id');
    const repoName = readString(repository, 'display_name');
    if (repoId === undefined || repoName === undefined) {
      continue;
    }
    repoItems.push(
      createRelationshipItem(
        institutionId,
        repoId,
        'institutions',
        'sources',
        RelationType.INSTITUTION_HAS_REPOSITORY,
        'outbound',
        repoName,
      ),
    );
  }

  if (repoItems.length === 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.INSTITUTION_HAS_REPOSITORY,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.INSTITUTION_HAS_REPOSITORY],
      repoItems,
    ),
  ];
};

/**
 * HAS_ROLE: Institution → Other Entities
 * @param data - Raw institution data
 * @param institutionId - The institution's OpenAlex ID
 * @returns Relationship sections extracted from the institution's roles, or an empty array if there are none
 */
const extractInstitutionRoles = (
  data: Record<string, unknown>,
  institutionId: string,
): RelationshipSection[] => {
  const roles = readArray(data, 'roles');
  if (roles === undefined || roles.length === 0) {
    return [];
  }

  const roleItems: RelationshipItem[] = [];
  for (const role of roles) {
    if (!isPlainObject(role)) {
      continue;
    }
    const roleName = readString(role, 'role');
    const targetId = readString(role, 'id');
    if (roleName === undefined || targetId === undefined) {
      continue;
    }

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

    roleItems.push(
      createRelationshipItem(
        institutionId,
        targetId,
        'institutions',
        targetType,
        RelationType.HAS_ROLE,
        'outbound',
        `as ${roleName}`,
      ),
    );
  }

  if (roleItems.length === 0) {
    return [];
  }

  return [
    createRelationshipSection(
      RelationType.HAS_ROLE,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.HAS_ROLE],
      roleItems,
    ),
  ];
};

/**
 * Extract relationships from Institution entity
 * @param data - Raw institution data from OpenAlex API
 * @param institutionId - The institution's OpenAlex ID
 * @returns Outgoing relationship sections extracted from the institution's data
 */
export const extractInstitutionRelationships = (
  data: Record<string, unknown>,
  institutionId: string,
): RelationshipSection[] => {
  return [
    ...extractInstitutionLineage(data, institutionId),
    ...extractInstitutionTopics(data, institutionId),
    ...extractInstitutionRepositories(data, institutionId),
    ...extractInstitutionRoles(data, institutionId),
  ];
};
