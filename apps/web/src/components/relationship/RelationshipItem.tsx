/**
 * RelationshipItem component
 * Displays an individual relationship connection with clickable entity link and optional metadata
 * @module RelationshipItem
 * @see specs/016-entity-relationship-viz/data-model.md
 */

import { Anchor, Group, Stack, Text } from '@mantine/core';
import { useNavigate } from '@tanstack/react-router';
import React from 'react';

import type { RelationshipItem as RelationshipItemType } from '@/types/relationship';
import { decodeHtmlEntities } from '@/utils/decode-html-entities';
import { formatMetadata } from '@/utils/formatMetadata';

export interface RelationshipItemProps {
  /** The relationship item to display */
  item: RelationshipItemType;
}

/**
 * Displays a single relationship connection
 * Shows the related entity name as a clickable link, with optional subtitle and metadata
 * @param root0
 * @param root0.item
 */
export const RelationshipItem: React.FC<RelationshipItemProps> = ({ item }) => {
  const navigate = useNavigate();

  // Defensive checks for required item properties
  if (!item.id || !item.direction) {
    return (
      <Text size="xs" c="red" data-testid="relationship-item-error">
        Invalid relationship data
      </Text>
    );
  }

  // Determine which entity to link to (the "other" entity, not the current one being viewed)
  const relatedEntityId = item.direction === 'inbound' ? item.sourceId : item.targetId;
  const entityType = item.direction === 'inbound' ? item.sourceType : item.targetType;

  // Validate we have the required entity info
  if (!relatedEntityId || !entityType) {
    return (
      <Text size="xs" c="dimmed" data-testid="relationship-item-missing">
        Unknown entity
      </Text>
    );
  }

  // Extract just the ID portion if it's a full OpenAlex URL
  const extractEntityId = (id: string): string => {
    if (id.startsWith('https://openalex.org/') || id.startsWith('http://openalex.org/')) {
      return id.split('/').pop() || id;
    }
    return id;
  };

  const cleanEntityId = extractEntityId(relatedEntityId);

  // Build the entity URL for navigation
  const entityUrl = `/#/${entityType}/${cleanEntityId}`;

  const handleClick = (e: React.MouseEvent) => {
    // Only intercept normal left clicks (no modifier keys)
    // This allows Ctrl+click, Cmd+click, middle-click to work as normal browser navigation
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      void navigate({ to: `/${entityType}/${cleanEntityId}` });
    }
    // Otherwise, let the browser handle it (opens in new tab, etc.)
  };

  return (
    <Stack gap="xs" data-testid={`relationship-item-${item.id}`}>
      <Group gap="xs">
        <Anchor href={entityUrl} onClick={handleClick} size="sm">
          {decodeHtmlEntities(item.displayName || cleanEntityId)}
        </Anchor>
        {item.isSelfReference && (
          <Text size="xs" c="dimmed">
            (self-reference)
          </Text>
        )}
      </Group>
      {item.subtitle && (
        <Text size="xs" c="dimmed" data-testid="relationship-subtitle">
          {decodeHtmlEntities(item.subtitle)}
        </Text>
      )}
      {item.metadata && (
        <Text size="xs" c="dimmed" data-testid="relationship-metadata">
          {formatMetadata(item.metadata)}
        </Text>
      )}
    </Stack>
  );
};
