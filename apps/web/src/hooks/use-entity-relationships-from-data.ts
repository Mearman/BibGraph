/**
 * React hook for extracting entity relationships from raw entity data Falls back to parsing entity fields when GraphContext is not available
 */

import type { EntityType } from '@bibgraph/types';
import { useMemo } from 'react';

import type { RelationshipSection } from '@/types/relationship';

import {
  extractAuthorRelationships,
  extractInstitutionRelationships,
  extractSourceRelationships,
  extractTopicRelationships,
  extractWorkRelationships,
} from './extractors';

export interface UseEntityRelationshipsFromDataResult {
  /**
  Incoming relationship sections (other entities → this entity)
   */
  incoming: RelationshipSection[];

  /**
  Outgoing relationship sections (this entity → other entities)
   */
  outgoing: RelationshipSection[];

  /**
  Total count of incoming relationships
   */
  incomingCount: number;

  /**
  Total count of outgoing relationships
   */
  outgoingCount: number;
}

/**
 * Extract relationships from raw entity data (Author, Work, etc.)
 * This provides a fallback when GraphContext is not available
 * @param entityData - The raw entity data from OpenAlex API
 * @param entityType - The type of the entity
 * @returns Relationship sections extracted from entity fields
 */
export const useEntityRelationshipsFromData = (
  entityData: Record<string, unknown> | null | undefined,
  entityType: EntityType,
): UseEntityRelationshipsFromDataResult => {
  const entityId = typeof entityData?.id === 'string' ? entityData.id : '';

  const { incoming, outgoing } = useMemo(() => {
    if (!entityData || !entityId) {
      return { incoming: [], outgoing: [] };
    }

    const incomingSections: RelationshipSection[] = [];
    const outgoingSections: RelationshipSection[] = [];

    // Extract relationships based on entity type
    switch (entityType) {
      case 'authors':
        outgoingSections.push(...extractAuthorRelationships(entityData, entityId));
        break;
      case 'works': {
        const workRelationships = extractWorkRelationships(entityData, entityId);
        outgoingSections.push(...workRelationships.outgoing);
        incomingSections.push(...workRelationships.incoming);
        break;
      }
      case 'institutions':
        outgoingSections.push(...extractInstitutionRelationships(entityData, entityId));
        break;
      case 'sources':
        outgoingSections.push(...extractSourceRelationships(entityData, entityId));
        break;
      case 'topics':
        outgoingSections.push(...extractTopicRelationships(entityData, entityId));
        break;
      case 'funders':
        // Funders typically don't have embedded relationship data
        break;
      case 'publishers':
        // Publishers typically don't have embedded relationship data
        break;
      case 'concepts':
      case 'keywords':
      case 'domains':
      case 'fields':
      case 'subfields':
        // These entity types typically don't have embedded relationship data
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
