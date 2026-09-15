/**
 * Topic Evolution Chart component Displays topic/concept prevalence and evolution over time
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

interface TopicEvolutionChartProperties {
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

const TIME_RANGES: ReadonlySet<string> = new Set<TimeRange>(["all", "5years", "10years", "20years"]);
const isTimeRange = (value: string): value is TimeRange => TIME_RANGES.has(value);

// Time-range filter cutoffs, in years back from the current year.
const RECENT_YEARS_SHORT = 5;
const RECENT_YEARS_MEDIUM = 10;
const RECENT_YEARS_LONG = 20;

const DEFAULT_AREA_COLOR = '#666';
const AREA_FILL_OPACITY = '0.7';

// Exported SVG dimensions and layout.
const EXPORT_WIDTH = 800;
const EXPORT_HEIGHT = 400;
const EXPORT_PADDING = 60;
const PADDING_SIDES = 2;
const EXPORT_TITLE_Y = 30;
const EXPORT_TITLE_FONT_SIZE = 18;
const EXPORT_AXIS_STROKE_WIDTH = 1;
// Sample a year-axis label every N years.
const EXPORT_YEAR_LABEL_STEP = 5;
const EXPORT_YEAR_LABEL_FONT_SIZE = 12;
const EXPORT_YEAR_LABEL_Y_OFFSET = 20;
// The Y-axis is labeled at this many equal divisions between 0 and the max value.
const EXPORT_Y_AXIS_TICK_DIVISIONS = 5;
const EXPORT_Y_AXIS_LABEL_X_OFFSET = 10;
const EXPORT_Y_AXIS_LABEL_Y_NUDGE = 4;

// Inline (on-screen) chart layout constants.
const CHART_GROUP_TRANSLATE_X = 60;
const CHART_GROUP_TRANSLATE_Y = 40;
const CHART_AREA_WIDTH = 680;
const CHART_AREA_HEIGHT = 300;
const CHART_AREA_PADDING = 40;
const CHART_TITLE_FONT_SIZE = 16;
const GRID_TICK_COUNT = 5;
const GRID_TICKS: readonly number[] = Array.from({ length: GRID_TICK_COUNT }, (_, index) => index / (GRID_TICK_COUNT - 1));
const GRID_STROKE_DASH = "4";
const AXIS_STROKE_WIDTH = 1;
const YEAR_LABEL_FONT_SIZE = 12;
const YEAR_LABEL_Y_OFFSET = 20;
// Aim for roughly this many year labels along the axis, spaced evenly.
const YEAR_LABEL_TARGET_COUNT = 10;
const Y_AXIS_LABEL_FONT_SIZE = 12;
const Y_AXIS_LABEL_X_OFFSET = 10;
const Y_AXIS_LABEL_Y_NUDGE = 4;

/**
 * Group entities by year and topic (entityType as proxy) NOTE: Since CatalogueEntity doesn't include full topic/concept data, this uses entityType as a proxy for topics and addedAt for publication year In production, would fetch actual topic data from OpenAlex API
 * @param entities - The catalogue entities to analyze
 */
const groupByYearAndTopic = (entities: readonly CatalogueEntity[]): TopicData[] => {
  const yearMap = new Map<number, Map<string, number>>();

  for (const entity of entities) {
    const year = entity.addedAt.getFullYear();
    const topic = entity.entityType;

    if (!yearMap.has(year)) {
      yearMap.set(year, new Map());
    }

    const topicMap = yearMap.get(year);
    if (topicMap) {
      topicMap.set(topic, (topicMap.get(topic) ?? 0) + 1);
    }
  }

  // Convert to array and sort by year
  const data: TopicData[] = Array.from(yearMap, ([year, topics]) => ({ year, topics }));

  return data.sort((a, b) => a.year - b.year);
};

/**
 * Get all unique topics from data
 * @param data - Topic data array
 */
const getAllTopics = (data: readonly TopicData[]): string[] => {
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
const getTopicInfo = (data: readonly TopicData[]): TopicInfo[] => {
  const topicCounts = new Map<string, number>();

  for (const { topics } of data) {
    for (const [topic, count] of topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + count);
    }
  }

  const info: TopicInfo[] = Array.from(topicCounts, ([topic, total]) => ({
      name: topic,
      color: getHashColor(topic),
      total,
    }));

  return info.sort((a, b) => b.total - a.total);
};

/**
 * Generate SVG export of topic evolution chart
 * @param data - Topic data
 * @param visibleTopics - Set of visible topics
 * @param topicInfo - Topic information with colors
 */
const generateSVG = (
  data: readonly TopicData[],
  visibleTopics: Set<string>,
  topicInfo: readonly TopicInfo[]
): string => {
  const chartWidth = EXPORT_WIDTH - EXPORT_PADDING * PADDING_SIDES;
  const chartHeight = EXPORT_HEIGHT - EXPORT_PADDING * PADDING_SIDES;

  if (data.length === 0) return '';

  const years = data.map(d => d.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearSpan = maxYear - minYear || 1;

  // Calculate max stacked value
  let maxStacked = 0;
  for (const { topics } of data) {
    let sum = 0;
    for (const [topic, count] of topics) {
      if (visibleTopics.has(topic)) {
        sum += count;
      }
    }
    maxStacked = Math.max(maxStacked, sum);
  }

  const getX = (year: number) => EXPORT_PADDING + ((year - minYear) / yearSpan) * chartWidth;
  const getY = (value: number) => EXPORT_HEIGHT - EXPORT_PADDING - (value / maxStacked) * chartHeight;

  let svgContent = '';

  // Generate stacked areas for each topic
  const topicColorMap = new Map(topicInfo.map(t => [t.name, t.color]));

  for (const topic of visibleTopics) {
    const color = topicColorMap.get(topic) ?? DEFAULT_AREA_COLOR;

    // Build points for stacked area
    let cumulative = 0;
    const points: string[] = [];

    // Top edge of area
    for (const { year, topics } of data) {
      const count = topics.get(topic) ?? 0;
      cumulative += count;
      points.push(`${String(getX(year))},${String(getY(cumulative))}`);
    }

    // Bottom edge of area (reverse order)
    for (let index = data.length - 1; index >= 0; index--) {
      const { year, topics } = data[index];
      let bottomCumulative = 0;

      // Calculate cumulative for all topics below this one
      for (const [t, count] of topics) {
        if (visibleTopics.has(t) && t < topic) {
          bottomCumulative += count;
        }
      }

      points.push(`${String(getX(year))},${String(getY(bottomCumulative))}`);
    }

    svgContent += `<polygon
      points="${points.join(' ')}"
      fill="${color}"
      fill-opacity="${AREA_FILL_OPACITY}"
      stroke="white"
      stroke-width="1"
    />`;
  }

  // Axes
  const xAxisY = EXPORT_HEIGHT - EXPORT_PADDING;
  svgContent += `<line x1="${String(EXPORT_PADDING)}" y1="${String(xAxisY)}" x2="${String(EXPORT_WIDTH - EXPORT_PADDING)}" y2="${String(xAxisY)}" stroke="#666" stroke-width="${String(EXPORT_AXIS_STROKE_WIDTH)}"/>`;
  svgContent += `<line x1="${String(EXPORT_PADDING)}" y1="${String(EXPORT_PADDING)}" x2="${String(EXPORT_PADDING)}" y2="${String(xAxisY)}" stroke="#666" stroke-width="${String(EXPORT_AXIS_STROKE_WIDTH)}"/>`;

  // Year labels (every EXPORT_YEAR_LABEL_STEP years)
  for (let year = minYear; year <= maxYear; year += EXPORT_YEAR_LABEL_STEP) {
    svgContent += `
      <text
        x="${String(getX(year))}"
        y="${String(EXPORT_HEIGHT - EXPORT_PADDING + EXPORT_YEAR_LABEL_Y_OFFSET)}"
        text-anchor="middle"
        font-size="${String(EXPORT_YEAR_LABEL_FONT_SIZE)}"
        fill="#666"
      >${String(year)}</text>
    `;
  }

  // Y-axis labels
  for (let index = 0; index <= EXPORT_Y_AXIS_TICK_DIVISIONS; index++) {
    const value = Math.round((maxStacked / EXPORT_Y_AXIS_TICK_DIVISIONS) * index);
    const y = getY(value);
    svgContent += `
      <text
        x="${String(EXPORT_PADDING - EXPORT_Y_AXIS_LABEL_X_OFFSET)}"
        y="${String(y + EXPORT_Y_AXIS_LABEL_Y_NUDGE)}"
        text-anchor="end"
        font-size="${String(EXPORT_YEAR_LABEL_FONT_SIZE)}"
        fill="#666"
      >${String(value)}</text>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${String(EXPORT_WIDTH)}" height="${String(EXPORT_HEIGHT)}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${String(EXPORT_WIDTH / PADDING_SIDES)}" y="${String(EXPORT_TITLE_Y)}" text-anchor="middle" font-size="${String(EXPORT_TITLE_FONT_SIZE)}" font-weight="bold" fill="#333">
    Topic Evolution Over Time
  </text>
  ${svgContent}
</svg>`;
};

export const TopicEvolutionChart = ({ entities, onClose }: TopicEvolutionChartProperties) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [visibleTopics, setVisibleTopics] = useState<Set<string>>(() => new Set());

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
    const cutoffYear = timeRange === '5years' ? currentYear - RECENT_YEARS_SHORT
      : timeRange === '10years' ? currentYear - RECENT_YEARS_MEDIUM
      : currentYear - RECENT_YEARS_LONG;

    return allData.filter(d => d.year >= cutoffYear);
  }, [allData, timeRange]);

  const totalTopics = allTopics.length;
  const totalEntities = entities.length;
  const yearRangeLabel = filteredData.length > 0
    ? `${String(Math.min(...filteredData.map(d => d.year)))} - ${String(Math.max(...filteredData.map(d => d.year)))}`
    : 'N/A';

  // Handle topic toggle
  const handleToggleTopic = (topic: string) => {
    setVisibleTopics(previous => {
      const newSet = new Set(previous);
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
            Topic distribution over time ({yearRangeLabel})
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
            <Text size="xl" fw={700}>{yearRangeLabel}</Text>
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
            onChange={(value) => {
              if (value !== null && isTimeRange(value)) setTimeRange(value);
            }}
            data={[
              { value: 'all', label: 'All Time' },
              { value: '5years', label: 'Last 5 Years' },
              { value: '10years', label: 'Last 10 Years' },
              { value: '20years', label: 'Last 20 Years' },
            ]}
            w={150}
          />

          <Group>
            <Button size="xs" variant="light" onClick={() => { setVisibleTopics(new Set(allTopics)); }}>
              Select All
            </Button>
            <Button size="xs" variant="light" onClick={() => { setVisibleTopics(new Set()); }}>
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
              onChange={() => { handleToggleTopic(topic.name); }}
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
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }} h={EXPORT_HEIGHT}>
        {filteredData.length > 0 && visibleTopics.size > 0 ? (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${String(EXPORT_WIDTH)} ${String(EXPORT_HEIGHT)}`}
            style={{ overflow: 'visible' }}
          >
            {/* Background */}
            <rect width="100%" height="100%" fill="white" />

            {/* Title */}
            <text x={EXPORT_WIDTH / PADDING_SIDES} y={EXPORT_TITLE_Y} textAnchor="middle" fontSize={CHART_TITLE_FONT_SIZE} fontWeight="bold" fill="#333">
              Topic Evolution Over Time
            </text>

            {/* Chart Area */}
            <g transform={`translate(${String(CHART_GROUP_TRANSLATE_X)}, ${String(CHART_GROUP_TRANSLATE_Y)})`}>
              {(() => {
                const chartWidth = CHART_AREA_WIDTH - CHART_AREA_PADDING * PADDING_SIDES;
                const chartHeight = CHART_AREA_HEIGHT - CHART_AREA_PADDING * PADDING_SIDES;

                const years = filteredData.map(d => d.year);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                const yearSpan = maxYear - minYear || 1;

                // Calculate max stacked value
                let maxStacked = 0;
                for (const { topics } of filteredData) {
                  let sum = 0;
                  for (const [topic, count] of topics) {
                    if (visibleTopics.has(topic)) {
                      sum += count;
                    }
                  }
                  maxStacked = Math.max(maxStacked, sum);
                }

                const getX = (year: number) => CHART_AREA_PADDING + ((year - minYear) / yearSpan) * chartWidth;
                const getY = (value: number) => CHART_AREA_HEIGHT - CHART_AREA_PADDING - (value / maxStacked) * chartHeight;

                const topicColorMap = new Map(topicInfo.map(t => [t.name, t.color]));

                // Generate stacked areas for each visible topic
                const stackedAreas = [...visibleTopics].sort().map(topic => {
                  const color = topicColorMap.get(topic) ?? DEFAULT_AREA_COLOR;

                  // Build points for stacked area
                  let cumulative = 0;
                  const pointsTop: string[] = [];

                  // Top edge of area
                  for (const { year, topics } of filteredData) {
                    const count = topics.get(topic) ?? 0;
                    cumulative += count;
                    pointsTop.push(`${String(getX(year))},${String(getY(cumulative))}`);
                  }

                  // Bottom edge of area (reverse order)
                  const pointsBottom: string[] = [];
                  for (let index = filteredData.length - 1; index >= 0; index--) {
                    const { year, topics } = filteredData[index];
                    let bottomCumulative = 0;

                    // Calculate cumulative for all topics below this one
                    for (const [t, count] of topics) {
                      if (visibleTopics.has(t) && t < topic) {
                        bottomCumulative += count;
                      }
                    }

                    pointsBottom.push(`${String(getX(year))},${String(getY(bottomCumulative))}`);
                  }

                  const allPoints = [...pointsTop, ...pointsBottom];

                  return (
                    <polygon
                      key={topic}
                      points={allPoints.join(' ')}
                      fill={color}
                      fillOpacity={AREA_FILL_OPACITY}
                      stroke="white"
                      strokeWidth="1"
                    />
                  );
                });

                // Axes
                const xAxisY = CHART_AREA_HEIGHT - CHART_AREA_PADDING;
                const axes = (
                  <g>
                    <line x1={CHART_AREA_PADDING} y1={xAxisY} x2={CHART_AREA_WIDTH - CHART_AREA_PADDING} y2={xAxisY} stroke="#666" strokeWidth={AXIS_STROKE_WIDTH} />
                    <line x1={CHART_AREA_PADDING} y1={CHART_AREA_PADDING} x2={CHART_AREA_PADDING} y2={xAxisY} stroke="#666" strokeWidth={AXIS_STROKE_WIDTH} />
                  </g>
                );

                // Grid lines
                const gridLines = GRID_TICKS.map(ratio => (
                  <line
                    key={`grid-${String(ratio)}`}
                    x1={CHART_AREA_PADDING}
                    y1={getY(maxStacked * ratio)}
                    x2={CHART_AREA_WIDTH - CHART_AREA_PADDING}
                    y2={getY(maxStacked * ratio)}
                    stroke="#e5e7eb"
                    strokeDasharray={GRID_STROKE_DASH}
                  />
                ));

                // Year labels (every few years to avoid crowding)
                const yearStep = Math.max(1, Math.floor(yearSpan / YEAR_LABEL_TARGET_COUNT));
                const yearLabels = Array.from(
                  { length: Math.floor(yearSpan / yearStep) + 1 },
                  (_, index) => {
                    const year = minYear + index * yearStep;
                    return (
                      <text
                        key={year}
                        x={getX(year)}
                        y={CHART_AREA_HEIGHT - CHART_AREA_PADDING + YEAR_LABEL_Y_OFFSET}
                        textAnchor="middle"
                        fontSize={YEAR_LABEL_FONT_SIZE}
                        fill="#666"
                      >
                        {year}
                      </text>
                    );
                  }
                );

                // Y-axis labels
                const yAxisLabels = GRID_TICKS.map(ratio => {
                  const value = Math.round(maxStacked * ratio);
                  return (
                    <text
                      key={`y-axis-${String(ratio)}`}
                      x={CHART_AREA_PADDING - Y_AXIS_LABEL_X_OFFSET}
                      y={getY(value) + Y_AXIS_LABEL_Y_NUDGE}
                      textAnchor="end"
                      fontSize={Y_AXIS_LABEL_FONT_SIZE}
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
