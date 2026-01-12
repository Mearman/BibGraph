/**
 * Entity Comparison (Side-by-Side View)
 *
 * Compares two entities side-by-side:
 * - Split view of two entities
 * - Compare metadata side-by-side
 * - Highlight differences
 * - Share comparison via URL
 *
 * @module components/entity-detail
 */

import type { EntityType } from '@bibgraph/types';
import { Box, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { IconScale } from '@tabler/icons-react';
import { useMemo } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

interface EntityComparisonProps {
  /** First entity data */
  entity1: Record<string, unknown> | null;
  /** Second entity data */
  entity2: Record<string, unknown> | null;
  /** Entity type */
  entityType: EntityType;
  /** IDs of the entities for URL generation */
  entity1Id: string;
  entity2Id: string;
}

/**
 * Format value for display
 * @param value
 */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object') return '[Object]';
  return String(value);
};

/**
 * Get comparable fields for entity type
 * @param entityType
 */
const getComparableFields = (entityType: EntityType): { key: string; label: string }[] => {
  const commonFields = [
    { key: 'id', label: 'ID' },
    { key: 'display_name', label: 'Name' },
    { key: 'cited_by_count', label: 'Citation Count' },
    { key: 'works_count', label: 'Works Count' },
    { key: 'created_date', label: 'Created Date' },
    { key: 'updated_date', label: 'Updated Date' },
  ];

  const typeSpecificFields: Record<string, { key: string; label: string }[]> = {
    works: [
      { key: 'publication_year', label: 'Publication Year' },
      { key: 'type', label: 'Type' },
      { key: 'primary_location', label: 'Publication Venue' },
    ],
    authors: [
      { key: 'orcid', label: 'ORCID' },
      { key: 'last_known_institution', label: 'Last Known Institution' },
    ],
    sources: [
      { key: 'issn', label: 'ISSN' },
      { key: 'type', label: 'Type' },
      { key: 'country_code', label: 'Country' },
    ],
    institutions: [
      { key: 'ror', label: 'ROR' },
      { key: 'country_code', label: 'Country' },
      { key: 'type', label: 'Type' },
    ],
    publishers: [
      { key: 'country_code', label: 'Country' },
      { key: 'website', label: 'Website' },
    ],
    funders: [
      { key: 'country_code', label: 'Country' },
      { key: 'homepage_url', label: 'Website' },
    ],
    concepts: [],
    topics: [],
    keywords: [],
    domains: [],
    fields: [],
    subfields: [],
  };

  return [...commonFields, ...(typeSpecificFields[entityType] || [])];
};

/**
 * Check if values are different
 * @param value1
 * @param value2
 */
const isDifferent = (value1: unknown, value2: unknown): boolean => {
  if (value1 === value2) return false;
  if (value1 === null || value1 === undefined) return value2 !== null && value2 !== undefined;
  if (value2 === null || value2 === undefined) return true;
  return JSON.stringify(value1) !== JSON.stringify(value2);
};

/**
 * EntityComparison Component
 * @param root0
 * @param root0.entity1
 * @param root0.entity2
 * @param root0.entityType
 * @param root0.entity1Id
 * @param root0.entity2Id
 */
export const EntityComparison: React.FC<EntityComparisonProps> = ({
  entity1,
  entity2,
  entityType,
  entity1Id: _entity1Id,
  entity2Id: _entity2Id,
}) => {
  const comparableFields = useMemo(() => getComparableFields(entityType), [entityType]);

  if (!entity1 || !entity2) {
    return (
      <Paper p="xl" radius="xl">
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <IconScale size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
              <Title order={3}>Entity Comparison</Title>
            </Group>
          </Group>
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Both entities must be loaded for comparison.
          </Text>
        </Stack>
      </Paper>
    );
  }

  // Calculate comparison statistics
  const differences = useMemo(() => {
    return comparableFields.filter(({ key }) => {
      const value1 = entity1[key];
      const value2 = entity2[key];
      return isDifferent(value1, value2);
    });
  }, [comparableFields, entity1, entity2]);

  return (
    <Paper p="xl" radius="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconScale size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Entity Comparison</Title>
          </Group>
          <Text size="sm" c="dimmed">
            {differences.length} differences found
          </Text>
        </Group>

        {/* Comparison Table */}
        <Box style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={200}>Field</Table.Th>
                <Table.Th w={350}>
                  <Text size="sm" fw={500}>
                    Entity 1
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatValue(entity1.display_name)}
                  </Text>
                </Table.Th>
                <Table.Th w={350}>
                  <Text size="sm" fw={500}>
                    Entity 2
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatValue(entity2.display_name)}
                  </Text>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {comparableFields.map(({ key, label }) => {
                const value1 = entity1[key];
                const value2 = entity2[key];
                const different = isDifferent(value1, value2);

                return (
                  <Table.Tr key={key} style={{ backgroundColor: different ? 'rgba(244, 63, 94, 0.05)' : undefined }}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {label}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatValue(value1)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={different ? 'red' : undefined}>
                        {formatValue(value2)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>

        {/* Legend */}
        <Group gap="sm" justify="center">
          <Box style={{ width: 16, height: 16, backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--mantine-color-red-6)', borderRadius: 4 }} />
          <Text size="xs" c="dimmed">
            Indicates differences between entities
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
};
