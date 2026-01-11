/**
 * React hook for extracting entity relationships from raw entity data
 * Falls back to parsing entity fields when GraphContext is not available
 * @module use-entity-relationships-from-data
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import { useMemo } from 'react';

import type {
  PaginationState,
  RelationshipItem,
  RelationshipSection,
} from '@/types/relationship';
import { DEFAULT_PAGE_SIZE,RELATIONSHIP_TYPE_LABELS } from '@/types/relationship';

/**
 * Safely extract a string ID from an entity property
 * Prevents [object Object] appearing in URLs if API returns unexpected data
 * @param value
 */
const safeStringId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
};

export interface UseEntityRelationshipsFromDataResult {
  /** Incoming relationship sections (other entities → this entity) */
  incoming: RelationshipSection[];

  /** Outgoing relationship sections (this entity → other entities) */
  outgoing: RelationshipSection[];

  /** Total count of incoming relationships */
  incomingCount: number;

  /** Total count of outgoing relationships */
  outgoingCount: number;
}

/**
 * Extract relationships from raw entity data (Author, Work, etc.)
 * This provides a fallback when GraphContext is not available
 * @param entityData - The raw entity data from OpenAlex API
 * @param entityType - The type of the entity
 * @returns Relationship sections extracted from entity fields
 */
export const useEntityRelationshipsFromData = (entityData: Record<string, unknown> | null | undefined, entityType: EntityType): UseEntityRelationshipsFromDataResult => {
  const entityId = (entityData?.id as string) || '';

  const { incoming, outgoing } = useMemo(() => {
    if (!entityData || !entityId) {
      return { incoming: [], outgoing: [] };
    }

    const incomingSections: RelationshipSection[] = [];
    const outgoingSections: RelationshipSection[] = [];

    // Extract relationships based on entity type
    switch (entityType) {
      case 'authors':
        extractAuthorRelationships(entityData, entityId, outgoingSections);
        break;
      case 'works':
        extractWorkRelationships(entityData, entityId, outgoingSections, incomingSections);
        break;
      case 'institutions':
        extractInstitutionRelationships(entityData, entityId, outgoingSections);
        break;
      case 'sources':
        extractSourceRelationships(entityData, entityId, outgoingSections);
        break;
      case 'topics':
        extractTopicRelationships(entityData, entityId, outgoingSections);
        break;
      case 'funders':
        // Funders typically don't have embedded relationship data
        break;
      case 'publishers':
        // Publishers typically don't have embedded relationship data
        break;
    }

    return { incoming: incomingSections, outgoing: outgoingSections };
  }, [entityData, entityType, entityId]);

  const incomingCount = useMemo(() => {
    return incoming.reduce((sum, section) => sum + section.totalCount, 0);
  }, [incoming]);

  const outgoingCount = useMemo(() => {
    return outgoing.reduce((sum, section) => sum + section.totalCount, 0);
  }, [outgoing]);

  return {
    incoming,
    outgoing,
    incomingCount,
    outgoingCount,
  };
};

/**
 * Helper to create a properly structured RelationshipItem
 * @param sourceId
 * @param targetId
 * @param sourceType
 * @param targetType
 * @param relationType
 * @param direction
 * @param displayName
 */
const createRelationshipItem = (sourceId: string, targetId: string, sourceType: EntityType, targetType: EntityType, relationType: RelationType, direction: 'outbound' | 'inbound', displayName: string): RelationshipItem => ({
    id: `${sourceId}-${relationType}-${targetId}`,
    sourceId,
    targetId,
    sourceType,
    targetType,
    type: relationType,
    direction,
    displayName,
    isSelfReference: sourceId === targetId,
    // metadata is optional - we can add typed metadata in future iterations
  });

/**
 * Helper to create a properly structured RelationshipSection
 * @param type
 * @param direction
 * @param label
 * @param items
 * @param isPartialData
 */
const createRelationshipSection = (type: RelationType, direction: 'outbound' | 'inbound', label: string, items: RelationshipItem[], isPartialData: boolean = false): RelationshipSection => {
  const totalCount = items.length;
  
  const visibleItems = items.slice(0, DEFAULT_PAGE_SIZE);
  const visibleCount = visibleItems.length;
  const hasMore = totalCount > DEFAULT_PAGE_SIZE;

  const pagination: PaginationState = {
    pageSize: DEFAULT_PAGE_SIZE,
    currentPage: 0,
    totalPages: Math.ceil(totalCount / DEFAULT_PAGE_SIZE),
    hasNextPage: hasMore,
    hasPreviousPage: false,
  };

  return {
    id: `${type}-${direction}`,
    type,
    direction,
    label,
    items,
    visibleItems,
    totalCount,
    visibleCount,
    hasMore,
    pagination,
    isPartialData,
  };
};

/**
 * Extract relationships from Author entity
 * @param data
 * @param authorId
 * @param outgoing
 */
const extractAuthorRelationships = (data: Record<string, unknown>, authorId: string, outgoing: RelationshipSection[]): void => {
  // AFFILIATION: Author → Institutions
  const affiliations = data.affiliations as Array<{
    institution?: {
      id?: string;
      display_name?: string;
      ror?: string;
      country_code?: string;
      type?: string;
    };
    years?: number[];
  }> | undefined;

  if (affiliations && affiliations.length > 0) {
    const affiliationItems: RelationshipItem[] = affiliations
      .filter(aff => aff.institution?.id && aff.institution?.display_name)
      .map(aff => {
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
      outgoing.push(createRelationshipSection(
        RelationType.AFFILIATION,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.AFFILIATION],
        affiliationItems,
      ));
    }
  }

  // AUTHOR_RESEARCHES: Author → Topics
  const topics = data.topics as Array<{
    id?: string;
    display_name?: string;
    count?: number;
    score?: number;
  }> | undefined;

  if (topics && topics.length > 0) {
    const topicItems: RelationshipItem[] = topics
      .filter(topic => topic.id && topic.display_name)
      .map(topic => {
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
      outgoing.push(createRelationshipSection(
        RelationType.AUTHOR_RESEARCHES,
        'outbound',
        'Research Topics',
        topicItems,
      ));
    }
  }
};

/**
 * Extract relationships from Work entity
 * @param data
 * @param workId
 * @param outgoing
 * @param incoming
 */
const extractWorkRelationships = (data: Record<string, unknown>, workId: string, outgoing: RelationshipSection[], incoming: RelationshipSection[]): void => {
  // AUTHORSHIP: Work → Authors
  const authorships = data.authorships as Array<{
    author?: {
      id?: string;
      display_name?: string;
      orcid?: string;
    };
    author_position?: string;
    is_corresponding?: boolean;
  }> | undefined;

  if (authorships && authorships.length > 0) {
    const authorItems: RelationshipItem[] = authorships
      .filter(auth => auth.author?.id && auth.author?.display_name)
      .map(auth => {
        const author = auth.author;
        return createRelationshipItem(
          workId,
          safeStringId(author?.id),
          'works' as EntityType,
          'authors' as EntityType,
          RelationType.AUTHORSHIP,
          'outbound',
          safeStringId(author?.display_name),
        );
      });

    if (authorItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.AUTHORSHIP,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.AUTHORSHIP],
        authorItems,
      ));
    }
  }

  // PUBLICATION: Work → Source
  const primaryLocation = data.primary_location as {
    source?: {
      id?: string;
      display_name?: string;
      issn_l?: string;
      type?: string;
    };
  } | undefined;

  if (primaryLocation?.source?.id && primaryLocation?.source?.display_name) {
    const sourceItem = createRelationshipItem(
      workId,
      primaryLocation.source.id,
      'works' as EntityType,
      'sources' as EntityType,
      RelationType.PUBLICATION,
      'outbound',
      primaryLocation.source.display_name);

    outgoing.push(createRelationshipSection(
      RelationType.PUBLICATION,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.PUBLICATION],
      [sourceItem],
    ));
  }

  // REFERENCE: Work → Referenced Works
  const referencedWorks = data.referenced_works as string[] | undefined;
  if (referencedWorks && referencedWorks.length > 0) {
    const referenceItems: RelationshipItem[] = referencedWorks.map((refWorkId) =>
      createRelationshipItem(
        workId,
        refWorkId,
        'works' as EntityType,
        'works' as EntityType,
        RelationType.REFERENCE,
        'outbound',
        refWorkId // Only have ID, not display name
      )
    );

    outgoing.push(createRelationshipSection(
      RelationType.REFERENCE,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.REFERENCE],
      referenceItems,
      true, // Partial data - only IDs available
    ));
  }

  // TOPIC: Work → Topics
  const workTopics = data.topics as Array<{
    id?: string;
    display_name?: string;
    score?: number;
  }> | undefined;

  if (workTopics && workTopics.length > 0) {
    const topicItems: RelationshipItem[] = workTopics
      .filter(topic => topic.id && topic.display_name)
      .map(topic => {
        const topicId = safeStringId(topic.id);
        const topicName = safeStringId(topic.display_name);
        return createRelationshipItem(
          workId,
          topicId,
          'works' as EntityType,
          'topics' as EntityType,
          RelationType.TOPIC,
          'outbound',
          topicName,
        );
      });

    if (topicItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.TOPIC,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.TOPIC],
        topicItems,
      ));
    }
  }

  // Note: For incoming citations, we'd need to query the API
  // For now, we just note the count exists
  const citedByCount = data.cited_by_count as number | undefined;
  if (citedByCount && citedByCount > 0) {
    // We can't create actual items without fetching, so create an empty section
    // that indicates citations exist but aren't loaded
    incoming.push(createRelationshipSection(
      RelationType.REFERENCE, // Citations are reverse of references
      'inbound',
      'Citations',
      [],
      true, // Partial data - count only, no actual items
    ));
  }

  // FUNDED_BY: Work → Funders (US1)
  const grants = data.grants as Array<{
    funder?: string;
    funder_display_name?: string;
    award_id?: string | null;
  }> | undefined;

  if (grants && grants.length > 0) {
    const grantItems: RelationshipItem[] = grants
      .filter(grant => grant.funder && grant.funder_display_name)
      .map(grant => {
        const funderId = grant.funder || '';
        const funderName = grant.funder_display_name || '';
        return createRelationshipItem(
          workId,
          funderId,
          'works' as EntityType,
          'funders' as EntityType,
          RelationType.FUNDED_BY,
          'outbound',
          funderName,
        );
      });

    if (grantItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.FUNDED_BY,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.FUNDED_BY],
        grantItems,
      ));
    }
  }

  // WORK_HAS_KEYWORD: Work → Keywords (US2)
  const keywords = data.keywords as Array<{
    id?: string;
    display_name?: string;
    score?: number;
  }> | undefined;

  if (keywords && keywords.length > 0) {
    const keywordItems: RelationshipItem[] = keywords
      .filter(keyword => keyword.id && keyword.display_name)
      .map(keyword => {
        const keywordId = safeStringId(keyword.id);
        const keywordName = safeStringId(keyword.display_name);
        return createRelationshipItem(
          workId,
          keywordId,
          'works' as EntityType,
          'keywords' as EntityType,
          RelationType.WORK_HAS_KEYWORD,
          'outbound',
          keywordName,
        );
      });

    if (keywordItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.WORK_HAS_KEYWORD,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.WORK_HAS_KEYWORD],
        keywordItems,
      ));
    }
  }

  // CONCEPT: Work → Concepts (US6 - legacy)
  const concepts = data.concepts as Array<{
    id?: string;
    display_name?: string;
    score?: number;
    level?: number;
    wikidata?: string;
  }> | undefined;

  if (concepts && concepts.length > 0) {
    // Deduplicate concepts by ID (OpenAlex API may return duplicates)
    const seenConceptIds = new Set<string>();
    const conceptItems: RelationshipItem[] = concepts
      .filter(concept => {
        if (!concept.id || !concept.display_name) return false;
        if (seenConceptIds.has(concept.id)) return false;
        seenConceptIds.add(concept.id);
        return true;
      })
      .map(concept => {
        const conceptId = safeStringId(concept.id);
        const conceptName = safeStringId(concept.display_name);
        return createRelationshipItem(
          workId,
          conceptId,
          'works' as EntityType,
          'concepts' as EntityType,
          RelationType.CONCEPT,
          'outbound',
          conceptName,
        );
      });

    if (conceptItems.length > 0) {
      outgoing.push(createRelationshipSection(
        RelationType.CONCEPT,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.CONCEPT],
        conceptItems,
      ));
    }
  }
};

/**
 * Extract relationships from Institution entity
 * @param data
 * @param institutionId
 * @param outgoing
 */
const extractInstitutionRelationships = (data: Record<string, unknown>, institutionId: string, outgoing: RelationshipSection[]): void => {
  // LINEAGE: Institution → Parent Institutions
  const lineage = data.lineage as string[] | undefined;
  if (lineage && lineage.length > 1) {
    // lineage includes the institution itself, so filter it out
    const parentIds = lineage.filter(id => id !== institutionId);
    if (parentIds.length > 0) {
      const parentItems: RelationshipItem[] = parentIds.map((parentId) =>
        createRelationshipItem(
          institutionId,
          parentId,
          'institutions' as EntityType,
          'institutions' as EntityType,
          RelationType.LINEAGE,
          'outbound',
          parentId // Only have ID, not display name
        )
      );

      outgoing.push(createRelationshipSection(
        RelationType.LINEAGE,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.LINEAGE],
        parentItems,
        true, // Partial data - only IDs available
      ));
    }
  }

  // TOPIC: Institution → Topics (US5)
  const topics = data.topics as Array<{
    id?: string;
    display_name?: string;
    count?: number;
    score?: number;
  }> | undefined;

  if (topics && topics.length > 0) {
    const topicItems: RelationshipItem[] = topics
      .filter(topic => topic.id && topic.display_name)
      .map(topic => {
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
      outgoing.push(createRelationshipSection(
        RelationType.TOPIC,
        'outbound',
        'Research Focus',
        topicItems,
      ));
    }
  }

  // INSTITUTION_HAS_REPOSITORY: Institution → Sources (US7)
  const repositories = data.repositories as Array<{
    id?: string;
    display_name?: string;
    host_organization?: string;
  }> | undefined;

  if (repositories && repositories.length > 0) {
    const repoItems: RelationshipItem[] = repositories
      .filter(repo => repo.id && repo.display_name)
      .map(repo => {
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
      outgoing.push(createRelationshipSection(
        RelationType.INSTITUTION_HAS_REPOSITORY,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.INSTITUTION_HAS_REPOSITORY],
        repoItems,
      ));
    }
  }

  // HAS_ROLE: Institution → Other Entities (US8)
  const roles = data.roles as Array<{
    role?: string;
    id?: string;
    works_count?: number;
  }> | undefined;

  if (roles && roles.length > 0) {
    const roleItems: RelationshipItem[] = roles
      .filter(role => role.role && role.id)
      .map(role => {
        const targetId = safeStringId(role.id);
        const roleName = role.role || '';
        // Infer target entity type from role
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
        // No default
        }
        break;
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
      outgoing.push(createRelationshipSection(
        RelationType.HAS_ROLE,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.HAS_ROLE],
        roleItems,
      ));
    }
  }
};

/**
 * Extract relationships from Source entity
 * @param data
 * @param sourceId
 * @param outgoing
 */
const extractSourceRelationships = (data: Record<string, unknown>, sourceId: string, outgoing: RelationshipSection[]): void => {
  // HOST_ORGANIZATION: Source → Publisher
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
      hostOrganizationName);

    outgoing.push(createRelationshipSection(
      RelationType.HOST_ORGANIZATION,
      'outbound',
      RELATIONSHIP_TYPE_LABELS[RelationType.HOST_ORGANIZATION],
      [publisherItem],
    ));
  }

  // TOPIC: Source → Topics (US4)
  const topics = data.topics as Array<{
    id?: string;
    display_name?: string;
    count?: number;
    score?: number;
  }> | undefined;

  if (topics && topics.length > 0) {
    const topicItems: RelationshipItem[] = topics
      .filter(topic => topic.id && topic.display_name)
      .map(topic => {
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
      outgoing.push(createRelationshipSection(
        RelationType.TOPIC,
        'outbound',
        'Topic Coverage',
        topicItems,
      ));
    }
  }
};

/**
 * Extract relationships from Topic entity
 * @param data
 * @param topicId
 * @param outgoing
 */
const extractTopicRelationships = (data: Record<string, unknown>, topicId: string, outgoing: RelationshipSection[]): void => {
  // TOPIC_PART_OF_FIELD: Topic → Field → Domain hierarchy
  const field = data.field as {
    id?: string;
    display_name?: string;
  } | undefined;

  if (field?.id && field?.display_name) {
    const fieldItem = createRelationshipItem(
      topicId,
      field.id,
      'topics' as EntityType,
      'fields' as EntityType,
      RelationType.TOPIC_PART_OF_FIELD,
      'outbound',
      field.display_name);

    outgoing.push(createRelationshipSection(
      RelationType.TOPIC_PART_OF_FIELD,
      'outbound',
      'Field',
      [fieldItem],
    ));
  }

  const domain = data.domain as {
    id?: string;
    display_name?: string;
  } | undefined;

  if (domain?.id && domain?.display_name) {
    const domainItem = createRelationshipItem(
      topicId,
      domain.id,
      'topics' as EntityType,
      'domains' as EntityType,
      RelationType.FIELD_PART_OF_DOMAIN, // Domain is higher level than field
      'outbound',
      domain.display_name);

    outgoing.push(createRelationshipSection(
      RelationType.FIELD_PART_OF_DOMAIN,
      'outbound',
      'Domain',
      [domainItem],
    ));
  }
};
