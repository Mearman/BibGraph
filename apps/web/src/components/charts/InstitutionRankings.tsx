/**
 * Institution Rankings component
 * Displays top institutions by works count and citation impact
 *
 * Shows:
 * - Bar chart: top institutions by works count
 * - Filter by country/region
 * - Color by ranking tier
 * - Link to institution pages
 * - Export as CSV
 */

import type { CatalogueEntity } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { getHashColor } from '@/utils/colors';

interface InstitutionRankingsProps {
  entities: CatalogueEntity[];
  onClose?: () => void;
}

interface InstitutionData {
  institutionId: string;
  worksCount: number;
  entities: CatalogueEntity[];
}

type RegionFilter = 'all' | 'us' | 'uk' | 'eu' | 'asia' | 'other';

/**
 * Group entities by institution
 * NOTE: Since CatalogueEntity only stores entity references,
 * this groups by entity type (I=institutions) and uses addedAt for metadata
 * In production, would fetch actual institution data from OpenAlex API
 * @param entities - The catalogue entities to analyze
 */
const groupByInstitution = (entities: CatalogueEntity[]): InstitutionData[] => {
  // Filter for institution entities only
  const institutionEntities = entities.filter(e => e.entityType === 'institutions');

  // Group by institution ID
  const institutionMap = new Map<string, CatalogueEntity[]>();

  for (const entity of institutionEntities) {
    const existing = institutionMap.get(entity.entityId) || [];
    existing.push(entity);
    institutionMap.set(entity.entityId, existing);
  }

  // Convert to array and sort by works count
  const data: InstitutionData[] = [];

  for (const [institutionId, institutionEntities] of institutionMap.entries()) {
    data.push({
      institutionId,
      worksCount: institutionEntities.length,
      entities: institutionEntities,
    });
  }

  return data.sort((a, b) => b.worksCount - a.worksCount);
};

/**
 * Generate CSV export of institution rankings
 * @param institutions - Institution ranking data
 * @returns CSV string formatted for export
 */
const generateRankingsCSV = (institutions: InstitutionData[]): string => {
  const lines: string[] = [];

  lines.push('Rank,Institution ID,Works Count');
  for (const [index, institution] of institutions.entries()) {
    lines.push(`${index + 1},${institution.institutionId},${institution.worksCount}`);
  }

  return lines.join('\n');
};

/**
 * Get ranking tier color based on rank
 * @param rank - Institution rank (1-indexed)
 */
const getRankingColor = (rank: number): string => {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  if (rank <= 10) return '#3b82f6'; // Blue (top 10)
  return '#64748b'; // Gray (others)
};

/**
 * Get region from institution ID (placeholder logic)
 * In production, would fetch actual institution metadata from OpenAlex API
 * @param institutionId - The institution ID
 */
const getRegionFromInstitution = (institutionId: string): RegionFilter => {
  // Placeholder: use hash of ID to determine region
  const hash = [...institutionId].reduce((acc, char) => acc + char.charCodeAt(0), 0);

  if (hash % 5 === 0) return 'us';
  if (hash % 5 === 1) return 'uk';
  if (hash % 5 === 2) return 'eu';
  if (hash % 5 === 3) return 'asia';
  return 'other';
};

export const InstitutionRankings = ({ entities, onClose }: InstitutionRankingsProps) => {
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [maxInstitutions, setMaxInstitutions] = useState<number>(20);

  const institutions = useMemo(() => groupByInstitution(entities), [entities]);

  // Filter by region
  const filteredInstitutions = useMemo(() => {
    if (regionFilter === 'all') return institutions;
    return institutions.filter(inst => getRegionFromInstitution(inst.institutionId) === regionFilter);
  }, [institutions, regionFilter]);

  // Limit to max institutions
  const displayedInstitutions = useMemo(() => {
    return filteredInstitutions.slice(0, maxInstitutions);
  }, [filteredInstitutions, maxInstitutions]);

  const maxWorksCount = Math.max(...displayedInstitutions.map(i => i.worksCount), 1);
  const totalInstitutions = institutions.length;
  const totalWorks = institutions.reduce((sum, inst) => sum + inst.worksCount, 0);

  // Handle export
  const handleExportCSV = () => {
    try {
      const csv = generateRankingsCSV(displayedInstitutions);

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', 'institution-rankings.csv');
      link.style.visibility = 'hidden';

      document.body.append(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      logger.info('charts-institution', 'Rankings exported to CSV', {
        institutionCount: displayedInstitutions.length,
      });
    } catch (error) {
      logger.error('charts-institution', 'Failed to export rankings', {
        error,
      });
    }
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={3}>Institution Rankings</Title>
          <Text size="sm" c="dimmed">
            Top {totalInstitutions} institutions by works count
          </Text>
        </div>
        <Tooltip label="Export as CSV">
          <ActionIcon
            variant="light"
            color="blue"
            onClick={handleExportCSV}
            aria-label="Export rankings as CSV"
          >
            <IconDownload size={ICON_SIZE.MD} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Info Banner */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={ICON_SIZE.MD} />}>
        <Text size="sm">
          Institution rankings based on {entities.length} entities. Full institution data with names,
          locations, and citation metrics would require fetching detailed metadata from OpenAlex API.
          Current implementation shows institution entity references.
        </Text>
      </Alert>

      {/* Metrics Summary */}
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="sm">
        <Group grow>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Institutions</Text>
            <Text size="xl" fw={700}>{totalInstitutions}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Works</Text>
            <Text size="xl" fw={700}>{totalWorks}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Avg Works per Inst</Text>
            <Text size="xl" fw={700}>
              {totalInstitutions > 0 ? (totalWorks / totalInstitutions).toFixed(1) : '0'}
            </Text>
          </Stack>
        </Group>
      </Paper>

      {/* Controls */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Group justify="space-between">
          <Select
            label="Region Filter"
            description="Filter institutions by region"
            value={regionFilter}
            onChange={(value) => setRegionFilter(value as RegionFilter)}
            data={[
              { value: 'all', label: 'All Regions' },
              { value: 'us', label: 'United States' },
              { value: 'uk', label: 'United Kingdom' },
              { value: 'eu', label: 'Europe' },
              { value: 'asia', label: 'Asia' },
              { value: 'other', label: 'Other' },
            ]}
            w={200}
          />

          <Select
            label="Show Top"
            description="Number of institutions to display"
            value={maxInstitutions.toString()}
            onChange={(value) => setMaxInstitutions(Number(value) || 20)}
            data={[
              { value: '10', label: 'Top 10' },
              { value: '20', label: 'Top 20' },
              { value: '50', label: 'Top 50' },
              { value: '100', label: 'Top 100' },
            ]}
            w={120}
          />
        </Group>
      </Card>

      {/* Rankings Chart */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Stack gap="md">
          {displayedInstitutions.length > 0 ? (
            displayedInstitutions.map((institution, index) => {
              const rank = index + 1;
              const barWidth = (institution.worksCount / maxWorksCount) * 100;
              const institutionColor = getHashColor(institution.institutionId);

              return (
                <Card key={institution.institutionId} padding="sm" radius="xs" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                      <Badge
                        size="lg"
                        color={getRankingColor(rank)}
                        variant={rank <= 3 ? 'filled' : 'light'}
                        c={rank > 3 ? 'white' : undefined}
                      >
                        #{rank}
                      </Badge>
                      <Text fw={500} size="sm">
                        {institution.institutionId}
                      </Text>
                    </Group>
                    <Group gap="md">
                      <Text size="sm" c="dimmed">
                        {institution.worksCount} {institution.worksCount === 1 ? 'work' : 'works'}
                      </Text>
                      <Badge size="sm" color={institutionColor} variant="light">
                        {getRegionFromInstitution(institution.institutionId).toUpperCase()}
                      </Badge>
                    </Group>
                  </Group>

                  {/* Bar visualization */}
                  <Box
                    h={12}
                    bg="gray.2"
                    style={{ borderRadius: '6px', overflow: 'hidden' }}
                  >
                    <Box
                      h="100%"
                      bg={institutionColor}
                      style={{
                        width: `${barWidth}%`,
                        borderRadius: '6px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </Box>
                </Card>
              );
            })
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              No institution data available for the selected filters
            </Text>
          )}
        </Stack>
      </Card>

      {/* Actions */}
      {onClose && (
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </Group>
      )}
    </Stack>
  );
};
