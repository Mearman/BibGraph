/**
 * List Analytics component
 * Shows analytics about entities in a list including citation trends, networks, and distributions
 */

import type { CatalogueEntity, CatalogueList } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconChartBar,
  IconDownload,
  IconInfoCircle,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';

interface ListAnalyticsProps {
  list: CatalogueList;
  entities: CatalogueEntity[];
  onClose: () => void;
}

interface EntityStats {
  entityType: string;
  count: number;
  percentage: number;
}

interface YearStats {
  year: number;
  count: number;
}

/**
 * Calculate entity type distribution
 */
function calculateEntityTypeDistribution(entities: CatalogueEntity[]): EntityStats[] {
  const typeCounts = new Map<string, number>();

  for (const entity of entities) {
    typeCounts.set(entity.entityType, (typeCounts.get(entity.entityType) || 0) + 1);
  }

  const total = entities.length;
  const stats: EntityStats[] = [];

  for (const [entityType, count] of typeCounts.entries()) {
    stats.push({
      entityType,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    });
  }

  return stats.sort((a, b) => b.count - a.count);
}

/**
 * Group entities by year (extracted from entityId if available)
 * Note: This is a simplified version - in production, you'd fetch actual publication years
 */
function calculateYearDistribution(entities: CatalogueEntity[]): YearStats[] {
  const yearCounts = new Map<number, number>();

  for (const entity of entities) {
    // Try to extract year from entityId (works have year in their metadata in production)
    // For now, we'll use a placeholder year based on addedAt
    const year = entity.addedAt.getFullYear();
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
  }

  const stats: YearStats[] = [];

  for (const [year, count] of yearCounts.entries()) {
    stats.push({ year, count });
  }

  return stats.sort((a, b) => a.year - b.year);
}

/**
 * Generate CSV export of analytics data
 */
function generateAnalyticsCSV(
  entityTypeStats: EntityStats[],
  yearStats: YearStats[]
): string {
  const lines: string[] = [];

  // Entity type distribution
  lines.push('Entity Type Distribution');
  lines.push('Type,Count,Percentage');
  for (const stat of entityTypeStats) {
    lines.push(`${stat.entityType},${stat.count},${stat.percentage.toFixed(2)}%`);
  }
  lines.push('');

  // Year distribution
  lines.push('Year Distribution');
  lines.push('Year,Count');
  for (const stat of yearStats) {
    lines.push(`${stat.year},${stat.count}`);
  }

  return lines.join('\n');
}

export const ListAnalytics = ({ list, entities, onClose }: ListAnalyticsProps) => {
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  // Calculate analytics
  const entityTypeStats = calculateEntityTypeDistribution(entities);
  const yearStats = calculateYearDistribution(entities);

  const totalEntities = entities.length;
  const uniqueEntityTypes = entityTypeStats.length;

  // Handle export
  const handleExportCSV = () => {
    try {
      const csv = generateAnalyticsCSV(entityTypeStats, yearStats);

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${list.title.replace(/[^a-z0-9]/gi, '_')}_analytics.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      logger.info('catalogue-analytics', 'Analytics exported to CSV', {
        listId: list.id,
        listTitle: list.title,
      });
    } catch (error) {
      logger.error('catalogue-analytics', 'Failed to export analytics', {
        listId: list.id,
        error,
      });
    }
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={3}>List Analytics</Title>
          <Text size="sm" c="dimmed">
            Analytics for "{list.title}"
          </Text>
        </div>
        <Button
          variant="light"
          leftSection={<IconDownload size={ICON_SIZE.MD} />}
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </Group>

      {/* Info Banner */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={ICON_SIZE.MD} />}>
        <Text size="sm">
          Analytics are based on the {totalEntities} entities currently in this list.
          Export data to CSV for further analysis in external tools.
        </Text>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={ICON_SIZE.MD} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="entities" leftSection={<IconUsers size={ICON_SIZE.MD} />}>
            Entity Types
          </Tabs.Tab>
          <Tabs.Tab value="timeline" leftSection={<IconChartBar size={ICON_SIZE.MD} />}>
            Timeline
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" pt="md">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="md">
              <Stack gap="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Entities
                </Text>
                <Text size="xl" fw={700}>
                  {totalEntities}
                </Text>
                <Badge size="xs" color="blue" variant="light">
                  All types
                </Badge>
              </Stack>
            </Paper>

            <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="md">
              <Stack gap="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Unique Types
                </Text>
                <Text size="xl" fw={700}>
                  {uniqueEntityTypes}
                </Text>
                <Badge size="xs" color="grape" variant="light">
                  Categories
                </Badge>
              </Stack>
            </Paper>

            <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="md">
              <Stack gap="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Most Common Type
                </Text>
                <Text size="xl" fw={700} tt="capitalize">
                  {entityTypeStats[0]?.entityType || 'N/A'}
                </Text>
                {entityTypeStats[0] && (
                  <Badge size="xs" color="green" variant="light">
                    {entityTypeStats[0].percentage.toFixed(1)}%
                  </Badge>
                )}
              </Stack>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        {/* Entity Types Tab */}
        <Tabs.Panel value="entities" pt="md">
          <ScrollArea.Autosize mah={400}>
            <Stack gap="sm">
              {entityTypeStats.map((stat) => (
                <Card key={stat.entityType} padding="sm" radius="sm" withBorder>
                  <Group justify="space-between">
                    <Text fw={500} tt="capitalize">
                      {stat.entityType}
                    </Text>
                    <Group gap="md">
                      <Text size="sm" c="dimmed">
                        {stat.count} {stat.count === 1 ? 'entity' : 'entities'}
                      </Text>
                      <Badge size="sm" color="blue" variant="light">
                        {stat.percentage.toFixed(1)}%
                      </Badge>
                    </Group>
                  </Group>
                  {/* Simple bar visualization */}
                  <Box
                    mt="xs"
                    h={8}
                    bg="gray.2"
                    style={{ borderRadius: '4px', overflow: 'hidden' }}
                  >
                    <Box
                      h="100%"
                      bg="blue"
                      style={{
                        width: `${stat.percentage}%`,
                        borderRadius: '4px',
                      }}
                    />
                  </Box>
                </Card>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Tabs.Panel>

        {/* Timeline Tab */}
        <Tabs.Panel value="timeline" pt="md">
          <ScrollArea.Autosize mah={400}>
            <Stack gap="sm">
              {yearStats.length > 0 ? (
                yearStats.map((stat) => (
                  <Card key={stat.year} padding="sm" radius="sm" withBorder>
                    <Group justify="space-between">
                      <Text fw={500}>
                        {stat.year}
                      </Text>
                      <Group gap="md">
                        <Text size="sm" c="dimmed">
                          {stat.count} {stat.count === 1 ? 'entity' : 'entities'}
                        </Text>
                        <Badge size="sm" color="orange" variant="light">
                          Year
                        </Badge>
                      </Group>
                    </Group>
                    {/* Simple bar visualization */}
                    <Box
                      mt="xs"
                      h={8}
                      bg="gray.2"
                      style={{ borderRadius: '4px', overflow: 'hidden' }}
                    >
                      <Box
                        h="100%"
                        bg="orange"
                        style={{
                          width: `${Math.min((stat.count / Math.max(...yearStats.map(s => s.count))) * 100, 100)}%`,
                          borderRadius: '4px',
                        }}
                      />
                    </Box>
                  </Card>
                ))
              ) : (
                <Text c="dimmed" ta="center">
                  No timeline data available
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Tabs.Panel>
      </Tabs>

      {/* Actions */}
      <Group justify="flex-end" gap="xs">
        <Button variant="subtle" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Stack>
  );
};
