/**
 * Work entity relationship extractors
 * @module extractors/work-extractors
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
 * Extract relationships from Work entity
 * @param data - Raw work data from OpenAlex API
 * @param workId - The work's OpenAlex ID
 * @param outgoing - Array to push outgoing relationship sections to
 * @param incoming - Array to push incoming relationship sections to
 */
export const extractWorkRelationships = (
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
  incoming: RelationshipSection[],
): void => {
  extractWorkAuthorships(data, workId, outgoing);
  extractWorkPublication(data, workId, outgoing);
  extractWorkReferences(data, workId, outgoing);
  extractWorkTopics(data, workId, outgoing);
  extractWorkCitations(data, incoming);
  extractWorkGrants(data, workId, outgoing);
  extractWorkKeywords(data, workId, outgoing);
  extractWorkConcepts(data, workId, outgoing);
};

/**
 * AUTHORSHIP: Work → Authors
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractWorkAuthorships = (
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
): void => {
  const authorships = data.authorships as
    | Array<{
        author?: {
          id?: string;
          display_name?: string;
          orcid?: string;
        };
        author_position?: string;
        is_corresponding?: boolean;
      }>
    | undefined;

  if (authorships && authorships.length > 0) {
    const authorItems: RelationshipItem[] = authorships
      .filter((auth) => auth.author?.id && auth.author?.display_name)
      .map((auth) => {
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
      outgoing.push(
        createRelationshipSection(
          RelationType.AUTHORSHIP,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.AUTHORSHIP],
          authorItems,
        ),
      );
    }
  }
};

/**
 * PUBLICATION: Work → Source
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractWorkPublication = (
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
): void => {
  const primaryLocation = data.primary_location as
    | {
        source?: {
          id?: string;
          display_name?: string;
          issn_l?: string;
          type?: string;
        };
      }
    | undefined;

  if (primaryLocation?.source?.id && primaryLocation?.source?.display_name) {
    const sourceItem = createRelationshipItem(
      workId,
      primaryLocation.source.id,
      'works' as EntityType,
      'sources' as EntityType,
      RelationType.PUBLICATION,
      'outbound',
      primaryLocation.source.display_name,
    );

    outgoing.push(
      createRelationshipSection(
        RelationType.PUBLICATION,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.PUBLICATION],
        [sourceItem],
      ),
    );
  }
};

/**
 * REFERENCE: Work → Referenced Works
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractWorkReferences = (
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
): void => {
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
        refWorkId, // Only have ID, not display name
      ),
    );

    outgoing.push(
      createRelationshipSection(
        RelationType.REFERENCE,
        'outbound',
        RELATIONSHIP_TYPE_LABELS[RelationType.REFERENCE],
        referenceItems,
        true, // Partial data - only IDs available
      ),
    );
  }
};

/**
 * TOPIC: Work → Topics
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractWorkTopics = (
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
): void => {
  const workTopics = data.topics as
    | Array<{
        id?: string;
        display_name?: string;
        score?: number;
      }>
    | undefined;

  if (workTopics && workTopics.length > 0) {
    const topicItems: RelationshipItem[] = workTopics
      .filter((topic) => topic.id && topic.display_name)
      .map((topic) => {
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
      outgoing.push(
        createRelationshipSection(
          RelationType.TOPIC,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.TOPIC],
          topicItems,
        ),
      );
    }
  }
};

/**
 * Citations (incoming references) - count only
 * @param data - Raw work data
 * @param incoming - Array to push relationship sections to
 */
const extractWorkCitations = (
  data: Record<string, unknown>,
  incoming: RelationshipSection[],
): void => {
  const citedByCount = data.cited_by_count as number | undefined;
  if (citedByCount && citedByCount > 0) {
    incoming.push(
      createRelationshipSection(
        RelationType.REFERENCE,
        'inbound',
        'Citations',
        [],
        true, // Partial data - count only, no actual items
      ),
    );
  }
};

/**
 * FUNDED_BY: Work → Funders
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractWorkGrants = (
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
): void => {
  const grants = data.grants as
    | Array<{
        funder?: string;
        funder_display_name?: string;
        award_id?: string | null;
      }>
    | undefined;

  if (grants && grants.length > 0) {
    const grantItems: RelationshipItem[] = grants
      .filter((grant) => grant.funder && grant.funder_display_name)
      .map((grant) => {
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
      outgoing.push(
        createRelationshipSection(
          RelationType.FUNDED_BY,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.FUNDED_BY],
          grantItems,
        ),
      );
    }
  }
};

/**
 * WORK_HAS_KEYWORD: Work → Keywords
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractWorkKeywords = (
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
): void => {
  const keywords = data.keywords as
    | Array<{
        id?: string;
        display_name?: string;
        score?: number;
      }>
    | undefined;

  if (keywords && keywords.length > 0) {
    const keywordItems: RelationshipItem[] = keywords
      .filter((keyword) => keyword.id && keyword.display_name)
      .map((keyword) => {
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
      outgoing.push(
        createRelationshipSection(
          RelationType.WORK_HAS_KEYWORD,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.WORK_HAS_KEYWORD],
          keywordItems,
        ),
      );
    }
  }
};

/**
 * CONCEPT: Work → Concepts (legacy)
 * @param data - Raw work data
 * @param workId - The work's OpenAlex ID
 * @param outgoing - Array to push relationship sections to
 */
const extractWorkConcepts = (
  data: Record<string, unknown>,
  workId: string,
  outgoing: RelationshipSection[],
): void => {
  const concepts = data.concepts as
    | Array<{
        id?: string;
        display_name?: string;
        score?: number;
        level?: number;
        wikidata?: string;
      }>
    | undefined;

  if (concepts && concepts.length > 0) {
    // Deduplicate concepts by ID (OpenAlex API may return duplicates)
    const seenConceptIds = new Set<string>();
    const conceptItems: RelationshipItem[] = concepts
      .filter((concept) => {
        if (!concept.id || !concept.display_name) return false;
        if (seenConceptIds.has(concept.id)) return false;
        seenConceptIds.add(concept.id);
        return true;
      })
      .map((concept) => {
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
      outgoing.push(
        createRelationshipSection(
          RelationType.CONCEPT,
          'outbound',
          RELATIONSHIP_TYPE_LABELS[RelationType.CONCEPT],
          conceptItems,
        ),
      );
    }
  }
};
