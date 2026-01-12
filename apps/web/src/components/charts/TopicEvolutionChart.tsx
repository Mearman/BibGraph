/**
 * Topic Evolution Chart component
 * Displays topic/concept prevalence and evolution over time
 *
 * Shows:
 * - Stacked area chart: topic distribution over time
 * - Line chart: topic emergence
 * - Interactive legend to toggle topics
 * - Time range selector
 * - Export as SVG
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
  Checkbox,
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

interface TopicEvolutionChartProps {
  entities: CatalogueEntity[];
  onClose?: () => void;
}

interface TopicData {
  year: number;
  topics: Map<string, number>; // topic -> count
}

interface TopicInfo {
  name: string;
  color: string;
  total: number;
}

type TimeRange = 'all' | '5years' | '10years' | '20years';

/**
 * Group entities by year and topic (entityType as proxy)
 * NOTE: Since CatalogueEntity doesn't include full topic/concept data,
 * this uses entityType as a proxy for topics and addedAt for publication year
 * In production, would fetch actual topic data from OpenAlex API
 * @param entities - The catalogue entities to analyze
 */
const groupByYearAndTopic = (entities: CatalogueEntity[]): TopicData[] => {
  const yearMap = new Map<number, Map<string, number>>();

  for (const entity of entities) {
    const year = entity.addedAt.getFullYear();
    const topic = entity.entityType;

    if (!yearMap.has(year)) {
      yearMap.set(year, new Map());
    }

    const topicMap = yearMap.get(year);
    if (topicMap) {
      topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
    }
  }

  // Convert to array and sort by year
  const data: TopicData[] = [];

  for (const [year, topics] of yearMap.entries()) {
    data.push({ year, topics });
  }

  return data.sort((a, b) => a.year - b.year);
};

/**
 * Get all unique topics from data
 * @param data - Topic data array
 */
const getAllTopics = (data: TopicData[]): string[] => {
  const topicSet = new Set<string>();

  for (const { topics } of data) {
    for (const topic of topics.keys()) {
      topicSet.add(topic);
    }
  }

  return [...topicSet].sort();
};

/**
 * Calculate topic totals for legend
 * @param data - Topic data array
 * @returns Array of topic info with colors and totals
 */
const getTopicInfo = (data: TopicData[]): TopicInfo[] => {
  const topicCounts = new Map<string, number>();

  for (const { topics } of data) {
    for (const [topic, count] of topics.entries()) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + count);
    }
  }

  const info: TopicInfo[] = [];

  for (const [topic, total] of topicCounts.entries()) {
    info.push({
      name: topic,
      color: getHashColor(topic),
      total,
    });
  }

  return info.sort((a, b) => b.total - a.total);
};

/**
 * Generate SVG export of topic evolution chart
 * @param data - Topic data
 * @param visibleTopics - Set of visible topics
 * @param topicInfo - Topic information with colors
 */
const generateSVG = (
  data: TopicData[],
  visibleTopics: Set<string>,
  topicInfo: TopicInfo[]
): string => {
  const width = 800;
  const height = 400;
  const padding = 60;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  if (data.length === 0) return '';

  const years = data.map(d => d.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = maxYear - minYear || 1;

  // Calculate max stacked value
  let maxStacked = 0;
  for (const { topics } of data) {
    let sum = 0;
    for (const [topic, count] of topics.entries()) {
      if (visibleTopics.has(topic)) {
        sum += count;
      }
    }
    maxStacked = Math.max(maxStacked, sum);
  }

  const getX = (year: number) => padding + ((year - minYear) / yearRange) * chartWidth;
  const getY = (value: number) => height - padding - (value / maxStacked) * chartHeight;

  let svgContent = '';

  // Generate stacked areas for each topic
  const topicColorMap = new Map(topicInfo.map(t => [t.name, t.color]));

  for (const topic of visibleTopics) {
    const color = topicColorMap.get(topic) || '#666';

    // Build points for stacked area
    let cumulative = 0;
    const points: string[] = [];

    // Top edge of area
    for (const { year, topics } of data) {
      const count = topics.get(topic) || 0;
      cumulative += count;
      points.push(`${getX(year)},${getY(cumulative)}`);
    }

    // Bottom edge of area (reverse order)
    for (let i = data.length - 1; i >= 0; i--) {
      const { year, topics } = data[i];
      let bottomCumulative = 0;

      // Calculate cumulative for all topics below this one
      for (const [t, count] of topics.entries()) {
        if (visibleTopics.has(t) && t < topic) {
          bottomCumulative += count;
        }
      }

      points.push(`${getX(year)},${getY(bottomCumulative)}`);
    }

    svgContent += `<polygon
      points="${points.join(' ')}"
      fill="${color}"
      fill-opacity="0.7"
      stroke="white"
      stroke-width="1"
    />`;
  }

  // Axes
  const xAxisY = height - padding;
  svgContent += `<line x1="${padding}" y1="${xAxisY}" x2="${width - padding}" y2="${xAxisY}" stroke="#666" stroke-width="1"/>`;
  svgContent += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${xAxisY}" stroke="#666" stroke-width="1"/>`;

  // Year labels (every 5 years)
  for (let year = minYear; year <= maxYear; year += 5) {
    svgContent += `
      <text
        x="${getX(year)}"
        y="${height - padding + 20}"
        text-anchor="middle"
        font-size="12"
        fill="#666"
      >${year}</text>
    `;
  }

  // Y-axis labels
  for (let i = 0; i <= 5; i++) {
    const value = Math.round((maxStacked / 5) * i);
    const y = getY(value);
    svgContent += `
      <text
        x="${padding - 10}"
        y="${y + 4}"
        text-anchor="end"
        font-size="12"
        fill="#666"
      >${value}</text>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">
    Topic Evolution Over Time
  </text>
  ${svgContent}
</svg>`;
};

export const TopicEvolutionChart = ({ entities, onClose }: TopicEvolutionChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [visibleTopics, setVisibleTopics] = useState<Set<string>>(new Set());

  const allData = useMemo(() => groupByYearAndTopic(entities), [entities]);
  const allTopics = useMemo(() => getAllTopics(allData), [allData]);
  const topicInfo = useMemo(() => getTopicInfo(allData), [allData]);

  // Initialize visible topics with all topics
  useMemo(() => {
    if (visibleTopics.size === 0) {
      setVisibleTopics(new Set(allTopics));
    }
  }, [allTopics, visibleTopics.size]);

  // Filter by time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return allData;

    const currentYear = new Date().getFullYear();
    const cutoffYear = timeRange === '5years' ? currentYear - 5
      : timeRange === '10years' ? currentYear - 10
      : currentYear - 20;

    return allData.filter(d => d.year >= cutoffYear);
  }, [allData, timeRange]);

  const totalTopics = allTopics.length;
  const totalEntities = entities.length;
  const yearRange = filteredData.length > 0
    ? `${Math.min(...filteredData.map(d => d.year))} - ${Math.max(...filteredData.map(d => d.year))}`
    : 'N/A';

  // Handle topic toggle
  const handleToggleTopic = (topic: string) => {
    setVisibleTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topic)) {
        newSet.delete(topic);
      } else {
        newSet.add(topic);
      }
      return newSet;
    });
  };

  // Handle export
  const handleExportSVG = () => {
    try {
      const svgContent = generateSVG(filteredData, visibleTopics, topicInfo);
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', 'topic-evolution-chart.svg');
      link.style.visibility = 'hidden';

      document.body.append(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      logger.info('charts-topic', 'Chart exported as SVG', {
        topicCount: visibleTopics.size,
      });
    } catch (error) {
      logger.error('charts-topic', 'Failed to export chart', {
        error,
      });
    }
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={3}>Topic Evolution</Title>
          <Text size="sm" c="dimmed">
            Topic distribution over time ({yearRange})
          </Text>
        </div>
        <Tooltip label="Export as SVG">
          <ActionIcon
            variant="light"
            color="blue"
            onClick={handleExportSVG}
            aria-label="Export chart as SVG"
          >
            <IconDownload size={ICON_SIZE.MD} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Info Banner */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={ICON_SIZE.MD} />}>
        <Text size="sm">
          Topic evolution based on {totalEntities} entities across {totalTopics} topics.
          Current implementation uses entity types as topic proxies. Full topic analysis would
          require concept/topic data from OpenAlex API.
        </Text>
      </Alert>

      {/* Metrics Summary */}
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="sm">
        <Group grow>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Topics</Text>
            <Text size="xl" fw={700}>{totalTopics}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Visible Topics</Text>
            <Text size="xl" fw={700}>{visibleTopics.size}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Time Range</Text>
            <Text size="xl" fw={700}>{yearRange}</Text>
          </Stack>
        </Group>
      </Paper>

      {/* Controls */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Group justify="space-between">
          <Select
            label="Time Range"
            description="Filter data by time period"
            value={timeRange}
            onChange={(value) => setTimeRange(value as TimeRange)}
            data={[
              { value: 'all', label: 'All Time' },
              { value: '5years', label: 'Last 5 Years' },
              { value: '10years', label: 'Last 10 Years' },
              { value: '20years', label: 'Last 20 Years' },
            ]}
            w={150}
          />

          <Group>
            <Button size="xs" variant="light" onClick={() => setVisibleTopics(new Set(allTopics))}>
              Select All
            </Button>
            <Button size="xs" variant="light" onClick={() => setVisibleTopics(new Set())}>
              Clear All
            </Button>
          </Group>
        </Group>
      </Card>

      {/* Interactive Legend */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Text fw={500} mb="sm">Topics (click to toggle)</Text>
        <Group gap="xs">
          {topicInfo.map((topic) => (
            <Checkbox
              key={topic.name}
              checked={visibleTopics.has(topic.name)}
              onChange={() => handleToggleTopic(topic.name)}
              label={
                <Group gap="xs">
                  <Box
                    w={12}
                    h={12}
                    bg={topic.color}
                    style={{ borderRadius: '2px' }}
                  />
                  <Text size="sm">{topic.name}</Text>
                  <Badge size="xs" color="gray" variant="light">
                    {topic.total}
                  </Badge>
                </Group>
              }
              styles={{ label: { cursor: 'pointer' } }}
            />
          ))}
        </Group>
      </Card>

      {/* Chart Visualization */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }} h={400}>
        {filteredData.length > 0 && visibleTopics.size > 0 ? (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 400"
            style={{ overflow: 'visible' }}
          >
            {/* Background */}
            <rect width="100%" height="100%" fill="white" />

            {/* Title */}
            <text x="400" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#333">
              Topic Evolution Over Time
            </text>

            {/* Chart Area */}
            <g transform="translate(60, 40)">
              {(() => {
                const width = 680;
                const height = 300;
                const padding = 40;
                const chartWidth = width - padding * 2;
                const chartHeight = height - padding * 2;

                const years = filteredData.map(d => d.year);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                const yearRange = maxYear - minYear || 1;

                // Calculate max stacked value
                let maxStacked = 0;
                for (const { topics } of filteredData) {
                  let sum = 0;
                  for (const [topic, count] of topics.entries()) {
                    if (visibleTopics.has(topic)) {
                      sum += count;
                    }
                  }
                  maxStacked = Math.max(maxStacked, sum);
                }

                const getX = (year: number) => padding + ((year - minYear) / yearRange) * chartWidth;
                const getY = (value: number) => height - padding - (value / maxStacked) * chartHeight;

                const topicColorMap = new Map(topicInfo.map(t => [t.name, t.color]));

                // Generate stacked areas for each visible topic
                const stackedAreas = [...visibleTopics].sort().map(topic => {
                  const color = topicColorMap.get(topic) || '#666';

                  // Build points for stacked area
                  let cumulative = 0;
                  const pointsTop: string[] = [];

                  // Top edge of area
                  for (const { year, topics } of filteredData) {
                    const count = topics.get(topic) || 0;
                    cumulative += count;
                    pointsTop.push(`${getX(year)},${getY(cumulative)}`);
                  }

                  // Bottom edge of area (reverse order)
                  const pointsBottom: string[] = [];
                  for (let i = filteredData.length - 1; i >= 0; i--) {
                    const { year, topics } = filteredData[i];
                    let bottomCumulative = 0;

                    // Calculate cumulative for all topics below this one
                    for (const [t, count] of topics.entries()) {
                      if (visibleTopics.has(t) && t < topic) {
                        bottomCumulative += count;
                      }
                    }

                    pointsBottom.push(`${getX(year)},${getY(bottomCumulative)}`);
                  }

                  const allPoints = [...pointsTop, ...pointsBottom];

                  return (
                    <polygon
                      key={topic}
                      points={allPoints.join(' ')}
                      fill={color}
                      fillOpacity="0.7"
                      stroke="white"
                      strokeWidth="1"
                    />
                  );
                });

                // Axes
                const xAxisY = height - padding;
                const axes = (
                  <g>
                    <line x1={padding} y1={xAxisY} x2={width - padding} y2={xAxisY} stroke="#666" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={padding} y2={xAxisY} stroke="#666" strokeWidth="1" />
                  </g>
                );

                // Grid lines
                const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => (
                  <line
                    key={ratio}
                    x1={padding}
                    y1={getY(maxStacked * ratio)}
                    x2={width - padding}
                    y2={getY(maxStacked * ratio)}
                    stroke="#e5e7eb"
                    strokeDasharray="4"
                  />
                ));

                // Year labels (every few years to avoid crowding)
                const yearStep = Math.max(1, Math.floor(yearRange / 10));
                const yearLabels = Array.from(
                  { length: Math.floor(yearRange / yearStep) + 1 },
                  (_, i) => {
                    const year = minYear + i * yearStep;
                    return (
                      <text
                        key={year}
                        x={getX(year)}
                        y={height - padding + 20}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#666"
                      >
                        {year}
                      </text>
                    );
                  }
                );

                // Y-axis labels
                const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
                  const value = Math.round(maxStacked * ratio);
                  return (
                    <text
                      key={ratio}
                      x={padding - 10}
                      y={getY(value) + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill="#666"
                    >
                      {value}
                    </text>
                  );
                });

                return (
                  <>
                    {gridLines}
                    {axes}
                    {stackedAreas}
                    {yearLabels}
                    {yAxisLabels}
                  </>
                );
              })()}
            </g>
          </svg>
        ) : (
          <Group justify="center" align="center" h="100%">
            <Text c="dimmed">
              {filteredData.length === 0 ? 'No data available for the selected time range' : 'No topics selected'}
            </Text>
          </Group>
        )}
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
