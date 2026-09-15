/**
 * Publication Timeline Visualization
 *
 * Shows publication activity over time:
 * - Bar or line chart of works per year
 * - Interactive hover for details
 * - Filter by decade
 * - Citation count overlay option
 */

import { Badge, Box, Group, Paper, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

interface YearData {
  year: number;
  count: number;
  citations?: number;
}

interface PublicationTimelineProperties {
  /**
  Publication year data
   */
  yearData: YearData[];
  /**
  Entity type for color theming
   */
  entityType?: 'works' | 'authors' | 'sources' | 'institutions';
}

type ChartView = 'bar' | 'line';

const DECADES = ['all', '2020s', '2010s', '2000s', '1990s', '1980s', 'earlier'] as const;
type DecadeFilter = (typeof DECADES)[number];

const DECADE_LENGTH_YEARS = 10;
const EARLIEST_NAMED_DECADE_START_YEAR = 1980;
const COUNT_THOUSANDS_THRESHOLD = 1000;
const CHART_PLOT_HEIGHT_PX = 200;
const BAR_HEIGHT_PERCENT_SCALE = 100;
const NON_HOVERED_BAR_OPACITY = 0.3;
const DEFAULT_POINT_RADIUS_PX = 4;
const HOVERED_POINT_RADIUS_PX = 6;
const TOOLTIP_X_OFFSET_PERCENT = 25;
const TOOLTIP_RECT_Y_OFFSET_PX = 50;
const TOOLTIP_YEAR_TEXT_Y_OFFSET_PX = 35;
const TOOLTIP_COUNT_TEXT_Y_OFFSET_PX = 20;
const Y_AXIS_TICK_RATIO_QUARTER = 0.25;
const Y_AXIS_TICK_RATIO_HALF = 0.5;
const Y_AXIS_TICK_RATIO_THREE_QUARTERS = 0.75;
const Y_AXIS_TICK_RATIOS = [
  0,
  Y_AXIS_TICK_RATIO_QUARTER,
  Y_AXIS_TICK_RATIO_HALF,
  Y_AXIS_TICK_RATIO_THREE_QUARTERS,
  1,
] as const;

/**
 * Filter year data by decade. Non-'all'/'earlier' decades are named `NNNNs` (e.g. '2020s'), so their bounds are derived from the label itself rather than a hardcoded range table.
 */
const filterByDecade = (data: readonly YearData[], decade: DecadeFilter): YearData[] => {
  if (decade === 'all') return [...data];
  if (decade === 'earlier') {
    return data.filter((d) => d.year < EARLIEST_NAMED_DECADE_START_YEAR);
  }

  const decadeStart = Number.parseInt(decade, 10);
  const decadeEnd = decadeStart + DECADE_LENGTH_YEARS - 1;
  return data.filter((d) => d.year >= decadeStart && d.year <= decadeEnd);
};

/**
 * Format number with K suffix for thousands
 */
const formatCount = (num: number): string => {
  if (num >= COUNT_THOUSANDS_THRESHOLD) {
    return `${(num / COUNT_THOUSANDS_THRESHOLD).toFixed(1)}k`;
  }
  return num.toString();
};

/**
 * PublicationTimeline Component
 */
export const PublicationTimeline: React.FC<PublicationTimelineProperties> = ({
  yearData,
  entityType: _entityType = 'works',
}) => {
  const [view, setView] = useState<ChartView>('bar');
  const [decadeFilter, setDecadeFilter] = useState<DecadeFilter>('all');
  const [showCitations, setShowCitations] = useState(false);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // Filter and sort data
  const filteredData = useMemo(() => {
    const filtered = filterByDecade(yearData, decadeFilter);
    return filtered.sort((a, b) => a.year - b.year);
  }, [yearData, decadeFilter]);

  // Calculate max values for scaling
  const maxCount = useMemo(() => {
    return Math.max(...filteredData.map((d) => d.count), 1);
  }, [filteredData]);

  const maxCitations = useMemo(() => {
    const citationData = filteredData.filter((d) => d.citations !== undefined);
    return Math.max(...citationData.map((d) => d.citations ?? 0), 1);
  }, [filteredData]);

  if (yearData.length === 0) {
    return null;
  }

  return (
    <Paper p="xl" radius="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconChartBar size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Publication Timeline</Title>
          </Group>
          <Group gap="sm">
            <SegmentedControl
              value={view}
              onChange={(value) => { setView(value); }}
              data={[
                { label: 'Bar', value: 'bar' },
                { label: 'Line', value: 'line' },
              ]}
              size="xs"
            />
          </Group>
        </Group>

        {/* Filters */}
        <Group justify="space-between">
          <SegmentedControl
            value={decadeFilter}
            onChange={(value) => { setDecadeFilter(value); }}
            data={DECADES.map((d) => ({ label: d.charAt(0).toUpperCase() + d.slice(1), value: d }))}
            size="xs"
          />
          {filteredData.some((d) => d.citations !== undefined) && (
            <Badge
              variant={showCitations ? 'filled' : 'outline'}
              color="blue"
              size="sm"
              style={{ cursor: 'pointer' }}
              onClick={() => { setShowCitations(!showCitations); }}
            >
              {showCitations ? 'Showing' : 'Show'} Citations
            </Badge>
          )}
        </Group>

        {/* Chart */}
        <Box
          style={{
            position: 'relative',
            height: '250px',
            padding: '20px 0',
          }}
        >
          {/* Y-axis labels */}
          <Stack gap={0} style={{ position: 'absolute', left: 0, top: 20, height: CHART_PLOT_HEIGHT_PX }}>
            {Y_AXIS_TICK_RATIOS.map((ratio) => (
              <Text
                key={ratio}
                size="xs"
                c="dimmed"
                ta="right"
                style={{
                  position: 'absolute',
                  top: `${String(CHART_PLOT_HEIGHT_PX * (1 - ratio))}px`,
                  left: 0,
                  width: '40px',
                  transform: 'translateY(-50%)',
                }}
              >
                {formatCount(Math.round(showCitations ? maxCitations * ratio : maxCount * ratio))}
              </Text>
            ))}
          </Stack>

          {/* Chart area */}
          <Box
            style={{
              position: 'absolute',
              left: '50px',
              right: '10px',
              top: '20px',
              height: '200px',
              borderBottom: '1px solid var(--mantine-color-gray-3)',
            }}
          >
            {view === 'bar' ? (
              // Bar chart
              <Group gap="xs" wrap="nowrap" style={{ height: '100%' }}>
                {filteredData.map((data) => {
                  const height = showCitations && data.citations !== undefined
                    ? (data.citations / maxCitations) * BAR_HEIGHT_PERCENT_SCALE
                    : (data.count / maxCount) * BAR_HEIGHT_PERCENT_SCALE;

                  return (
                    <Box
                      key={data.year}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%',
                        position: 'relative',
                      }}
                      onMouseEnter={() => { setHoveredYear(data.year); }}
                      onMouseLeave={() => { setHoveredYear(null); }}
                    >
                      {/* Bar */}
                      <Box
                        style={{
                          width: '100%',
                          height: `${String(height)}%`,
                          backgroundColor: 'var(--mantine-color-blue-6)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'all 0.2s',
                          opacity: hoveredYear === null || hoveredYear === data.year ? 1 : NON_HOVERED_BAR_OPACITY,
                          cursor: 'pointer',
                        }}
                      />

                      {/* Year label */}
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{
                          position: 'absolute',
                          bottom: -25,
                          transform: `rotate(-45deg)`,
                          transformOrigin: 'top left',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {data.year}
                      </Text>

                      {/* Tooltip */}
                      {hoveredYear === data.year && (
                        <Paper
                          shadow="sm"
                          p="xs"
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10,
                            minWidth: '100px',
                          }}
                        >
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {data.year}
                            </Text>
                            <Text size="xs">
                              {data.count} {data.count === 1 ? 'work' : 'works'}
                            </Text>
                            {showCitations && data.citations !== undefined && (
                              <Text size="xs" c="blue">
                                {formatCount(data.citations)} citations
                              </Text>
                            )}
                          </Stack>
                        </Paper>
                      )}
                    </Box>
                  );
                })}
              </Group>
            ) : (
              // Line chart using SVG
              <svg
                width="100%"
                height="100%"
                style={{ overflow: 'visible' }}
              >
                {/* Grid lines */}
                {Y_AXIS_TICK_RATIOS.map((ratio) => (
                  <line
                    key={ratio}
                    x1="0"
                    y1={String(CHART_PLOT_HEIGHT_PX * (1 - ratio))}
                    x2="100%"
                    y2={String(CHART_PLOT_HEIGHT_PX * (1 - ratio))}
                    stroke="var(--mantine-color-gray-2)"
                    strokeWidth="1"
                  />
                ))}

                {/* Line */}
                {filteredData.length > 1 && (
                  <polyline
                    points={filteredData.map((data, index) => {
                      const x = (index / (filteredData.length - 1)) * BAR_HEIGHT_PERCENT_SCALE;
                      const y = showCitations && data.citations !== undefined
                        ? CHART_PLOT_HEIGHT_PX - (data.citations / maxCitations) * CHART_PLOT_HEIGHT_PX
                        : CHART_PLOT_HEIGHT_PX - (data.count / maxCount) * CHART_PLOT_HEIGHT_PX;
                      return `${String(x)}% ${String(y)}`;
                    }).join(' ')}
                    fill="none"
                    stroke="var(--mantine-color-blue-6)"
                    strokeWidth="2"
                  />
                )}

                {/* Data points */}
                {filteredData.map((data, index) => {
                  const x = (index / (filteredData.length - 1)) * BAR_HEIGHT_PERCENT_SCALE;
                  const y = showCitations && data.citations !== undefined
                    ? CHART_PLOT_HEIGHT_PX - (data.citations / maxCitations) * CHART_PLOT_HEIGHT_PX
                    : CHART_PLOT_HEIGHT_PX - (data.count / maxCount) * CHART_PLOT_HEIGHT_PX;

                  return (
                    <g key={data.year}>
                      <circle
                        cx={`${String(x)}%`}
                        cy={y}
                        r={hoveredYear === data.year ? HOVERED_POINT_RADIUS_PX : DEFAULT_POINT_RADIUS_PX}
                        fill="var(--mantine-color-blue-6)"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => { setHoveredYear(data.year); }}
                        onMouseLeave={() => { setHoveredYear(null); }}
                      />
                      <text
                        x={`${String(x)}%`}
                        y={215}
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--mantine-color-dimmed)"
                        transform={`rotate(-45, ${String(x)}%, 215)`}
                      >
                        {data.year}
                      </text>
                      {hoveredYear === data.year && (
                        <g>
                          <rect
                            x={`${String(x - TOOLTIP_X_OFFSET_PERCENT)}%`}
                            y={y - TOOLTIP_RECT_Y_OFFSET_PX}
                            width="50%"
                            height="40"
                            fill="white"
                            stroke="var(--mantine-color-gray-3)"
                            rx="4"
                          />
                          <text
                            x={`${String(x)}%`}
                            y={y - TOOLTIP_YEAR_TEXT_Y_OFFSET_PX}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="500"
                          >
                            {data.year}
                          </text>
                          <text
                            x={`${String(x)}%`}
                            y={y - TOOLTIP_COUNT_TEXT_Y_OFFSET_PX}
                            textAnchor="middle"
                            fontSize="10"
                          >
                            {data.count} works
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </Box>
        </Box>

        {/* Summary */}
        <Text size="sm" c="dimmed" ta="center">
          Showing {filteredData.length} {filteredData.length === 1 ? 'year' : 'years'} of data
          {decadeFilter !== 'all' && ` (${decadeFilter})`}
        </Text>
      </Stack>
    </Paper>
  );
};
