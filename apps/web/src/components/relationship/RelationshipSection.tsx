/**
 * RelationshipSection component Displays a grouped section of relationships by type (e.g., "Citations", "Authors", "Affiliations") Shows relationship type label, count badge, and list of relationship items
 * @see specs/016-entity-relationship-viz/spec.md
 */

import { Alert,Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import { BORDER_STYLE_GRAY_3 } from '@/config/style-constants';
import type { RelationshipSection as RelationshipSectionType } from '@/types/relationship';

import { RelationshipList } from './RelationshipList';


export interface RelationshipSectionProps {
  /**
  The relationship section data to display
   */
  section: RelationshipSectionType;

  /**
  Callback when page changes (0-indexed page number)
   */
  onPageChange?: (page: number) => void;

  /**
  Callback when page size changes
   */
  onPageSizeChange?: (pageSize: number) => void;

  /**
  Whether pagination is currently loading
   */
  isLoading?: boolean;
}

/**
 * Displays a section of grouped relationships
 * Shows type label, count, and paginated list of relationship items
 */
export const RelationshipSection = ({
  section,
  onPageChange,
  onPageSizeChange,
  isLoading,
}: Readonly<RelationshipSectionProps>) => {
  const testId = `relationship-section-${section.type}-${section.direction}`;

  return (
    <Paper
      p="md"
      style={{ border: BORDER_STYLE_GRAY_3 }}
      data-testid={testId}
    >
      <Stack gap="md">
        {/* Header with label and count */}
        <Group justify="space-between">
          <Group gap="xs">
            <Text fw={600} size="sm">
              {section.label}
            </Text>
            {section.icon !== undefined && section.icon !== '' && <Text size="sm">{section.icon}</Text>}
          </Group>
          <Badge
            variant="light"
            size="sm"
            data-testid="relationship-count"
          >
            {section.totalCount}
          </Badge>
        </Group>

        {/* Partial data warning */}
        {section.isPartialData === true && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Incomplete Data"
            color="yellow"
            variant="light"
            data-testid="partial-data-warning"
          >
            Relationship data may be incomplete. The graph visualization is still loading or only shows a subset of available relationships.
          </Alert>
        )}

        {/* Relationship list */}
        <RelationshipList
          section={section}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={isLoading}
        />
      </Stack>
    </Paper>
  );
};
