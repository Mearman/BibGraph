/**
 * OutgoingRelationships component Displays all outgoing relationship sections for an entity
 * @see specs/016-entity-relationship-viz/spec.md (User Story 2, User Story 3)
 */

import type { EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import { Button, Group,Paper, Skeleton, Stack, Text, Title } from '@mantine/core';
import React, { useEffect,useState } from 'react';

import { BORDER_STYLE_GRAY_3 } from '@/config/style-constants';
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { useEntityRelationshipsFromData } from '@/hooks/use-entity-relationships-from-data';
import type { RelationshipSection as RelationshipSectionType } from '@/types/relationship';

import { RelationshipSection } from './RelationshipSection';
import { RelationshipTypeFilter } from './RelationshipTypeFilter';

const RELATION_TYPE_VALUES = new Set<string>(Object.values(RelationType));

const isRelationType = (value: unknown): value is RelationType =>
  typeof value === 'string' && RELATION_TYPE_VALUES.has(value);

const isRelationTypeArray = (value: unknown): value is RelationType[] =>
  Array.isArray(value) && value.every(isRelationType);

export interface OutgoingRelationshipsProps {
  /**
  The entity whose outgoing relationships to display
   */
  entityId: string;

  /**
  The type of the entity
   */
  entityType: EntityType;

  /**
  Optional raw entity data for fallback when graph context is not available
   */
  entityData?: Record<string, unknown> | null;
}

/**
 * Displays outgoing relationship sections for an entity
 * Shows all types of relationships where this entity points to other entities
 */
export const OutgoingRelationships: React.FC<OutgoingRelationshipsProps> = ({
  entityId,
  entityType,
  entityData,
}) => {
  // Filter state with localStorage persistence (T047)
  const storageKey = `entity-relationship-filter-${entityType}-${entityId}-outgoing`;

  const [selectedTypes, setSelectedTypes] = useState<RelationType[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed: unknown = JSON.parse(stored);
        return isRelationTypeArray(parsed) ? parsed : [];
      }
    } catch {
      // Ignore parse errors, use empty array
    }
    return [];
  });

  // Persist filter state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(selectedTypes));
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }, [selectedTypes, storageKey]);

  // Query for API-based relationships (works by author, etc.)
  const {
    outgoing: apiOutgoing,
    loading: apiLoading,
    error: apiError,
    goToPage,
    setPageSize,
    isLoadingMore,
  } = useEntityRelationshipQueries(entityId, entityType);

  // Fall back to embedded data-based relationships if API has no data
  const dataRelationships = useEntityRelationshipsFromData(entityData, entityType);

  // Choose which source to use with priority: API queries > embedded data
  const hasApiData = apiOutgoing.length > 0 || apiLoading;

  let outgoing: RelationshipSectionType[];
  let loading: boolean;

  if (hasApiData) {
    // Priority 1: API-queried relationships (e.g., works by author)
    outgoing = apiOutgoing;
    loading = apiLoading;
  } else {
    // Priority 2: Embedded data relationships (fallback)
    outgoing = dataRelationships.outgoing;
    loading = false;
  }

  // Show loading skeleton while fetching
  if (loading) {
    return (
      <Stack gap="md" data-testid="outgoing-relationships-loading">
        <Title order={2} size="h3">Outgoing Relationships</Title>
        <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
          <Skeleton height={8} width="40%" mb="sm" />
          <Skeleton height={8} width="60%" mb="xs" />
          <Skeleton height={8} width="50%" />
        </Paper>
        <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
          <Skeleton height={8} width="35%" mb="sm" />
          <Skeleton height={8} width="55%" mb="xs" />
          <Skeleton height={8} width="45%" />
        </Paper>
      </Stack>
    );
  }

  if (apiError) {
    const handleRetry = () => {
      // Reload the page to retry loading
      window.location.reload();
    };

    return (
      <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }} data-testid="outgoing-relationships-error">
        <Stack gap="sm">
          <Text c="red" size="sm">
            Failed to load relationships: {apiError.message}
          </Text>
          <Group>
            <Button
              size="xs"
              variant="light"
              color="red"
              onClick={handleRetry}
              data-testid="outgoing-relationships-retry-button"
            >
              Retry
            </Button>
          </Group>
        </Stack>
      </Paper>
    );
  }

  // Don't render section if no outgoing relationships
  if (outgoing.length === 0) {
    return null;
  }

  return (
    <Stack gap="md" data-testid="outgoing-relationships">
      <Title order={2} size="h3">
        Outgoing Relationships
      </Title>

      <RelationshipTypeFilter
        selectedTypes={selectedTypes}
        onChange={(types) => { setSelectedTypes([...types]); }}
        title="Filter Outgoing Relationships"
      />

      {outgoing
        .filter((section) => section.totalCount > 0)
        .map((section) => (
          <RelationshipSection
            key={section.id}
            section={section}
            onPageChange={hasApiData ? (page: number) => { void goToPage(section.id, page); } : undefined}
            onPageSizeChange={hasApiData ? (size: number) => { void setPageSize(section.id, size); } : undefined}
            isLoading={hasApiData ? isLoadingMore(section.id) : false}
          />
        ))}
    </Stack>
  );
};
