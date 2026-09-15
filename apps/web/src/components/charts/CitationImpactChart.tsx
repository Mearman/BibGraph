/**
 * Citation Impact Chart component Displays citation impact over time with various metrics
 *
 * Shows:
 * - Line chart: citations over time (yearly cumulative)
 * - Bar chart: yearly citation count
 * - Cumulative citations trend
 * - Hover for detailed information
 * - Export as PNG
 */

import type { CatalogueEntity } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Paper,
  Radio,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useMemo,useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';

interface CitationImpactChartProperties {
  entities: CatalogueEntity[];
  onClose?: () => void;
}

type ChartType = 'line' | 'bar';

const CHART_TYPES: ReadonlySet<string> = new Set<ChartType>(["line", "bar"]);
const isChartType = (value: string): value is ChartType => CHART_TYPES.has(value);

interface YearlyData {
  year: number;
  count: number;
  cumulative: number;
}

// h-index placeholder formula: scales with the square root of total works.
const H_INDEX_ESTIMATE_MULTIPLIER = 10;

// FWCI placeholder formula: citations-per-work halved as a rough field-baseline adjustment.
const FWCI_BASELINE_DIVISOR = 2;
const FWCI_DECIMAL_PLACES = 2;

// Multiplier converting a single-sided padding/dimension value into the total for both sides.
const PADDING_SIDES = 2;

// Exported SVG dimensions and layout.
const EXPORT_WIDTH = 800;
const EXPORT_HEIGHT = 400;
const EXPORT_PADDING = 60;
const EXPORT_TITLE_Y = 30;
const EXPORT_TITLE_FONT_SIZE = 18;
const EXPORT_LABEL_FONT_SIZE = 12;
const EXPORT_LINE_STROKE_WIDTH = 3;
const EXPORT_POINT_RADIUS = 5;
const EXPORT_POINT_STROKE_WIDTH = 2;
const EXPORT_BAR_STROKE_WIDTH = 1;
const EXPORT_BAR_RADIUS = 2;
const EXPORT_AXIS_STROKE_WIDTH = 1;
const EXPORT_YEAR_LABEL_Y_OFFSET = 20;
const EXPORT_Y_AXIS_LABEL_X_OFFSET = 10;
const EXPORT_Y_AXIS_LABEL_Y_NUDGE = 4;
// The Y-axis is labeled at this many equal divisions between 0 and the max value.
const EXPORT_Y_AXIS_TICK_DIVISIONS = 5;

/**
 * Extract yearly citation data from entities NOTE: Since CatalogueEntity doesn't include full citation data, this generates placeholder data based on addedAt timestamps In production, would fetch actual citation metrics from OpenAlex API
 */
const extractYearlyData = (entities: readonly CatalogueEntity[]): YearlyData[] => {
  const yearCounts = new Map<number, number>();

  // Count entities by year (using addedAt as placeholder for publication year)
  for (const entity of entities) {
    const year = entity.addedAt.getFullYear();
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
  }

  // Sort years
  const sortedYears = [...yearCounts.keys()].sort((a, b) => a - b);

  // Build yearly data with cumulative counts
  const data: YearlyData[] = [];
  let cumulative = 0;

  for (const year of sortedYears) {
    const count = yearCounts.get(year) ?? 0;
    cumulative += count;
    data.push({ year, count, cumulative });
  }

  return data;
};

/**
 * Calculate h-index from yearly data h-index = h such that h publications have at least h citations each
 */
const calculateHIndex = (data: readonly YearlyData[]): number => {
  // Placeholder calculation - in production would use actual citation counts
  const totalWorks = data.reduce((sum, d) => sum + d.count, 0);
  return Math.min(totalWorks, Math.floor(Math.sqrt(totalWorks * H_INDEX_ESTIMATE_MULTIPLIER)));
};

/**
 * Calculate FWCI (Field-Weighted Citation Impact) FWCI = ratio of total citations to expected citations for field
 */
const calculateFWCI = (data: readonly YearlyData[]): number => {
  // Placeholder calculation - in production would use field-specific baselines
  const totalCitations = data.reduce((sum, d) => sum + d.cumulative, 0);
  const totalWorks = data.reduce((sum, d) => sum + d.count, 0);
  if (totalWorks === 0) return 0;
  return Number.parseFloat((totalCitations / totalWorks / FWCI_BASELINE_DIVISOR).toFixed(FWCI_DECIMAL_PLACES));
};

/**
 * Generate an SVG string for exporting the citation impact chart (line or bar) as a downloadable file.
 */
const generateCitationChartSVG = (
  type: ChartType,
  data: readonly YearlyData[],
  maxCount: number,
  maxCumulative: number
): string => {
  const chartWidth = EXPORT_WIDTH - EXPORT_PADDING * PADDING_SIDES;
  const chartHeight = EXPORT_HEIGHT - EXPORT_PADDING * PADDING_SIDES;

  const years = data.map((d) => d.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const getX = (year: number) => EXPORT_PADDING + ((year - minYear) / (maxYear - minYear || 1)) * chartWidth;
  const getY = (value: number, max: number) => EXPORT_HEIGHT - EXPORT_PADDING - (value / max) * chartHeight;

  let paths = '';

  if (type === 'line') {
    // Cumulative line
    const linePoints = data.map(d => `${String(getX(d.year))},${String(getY(d.cumulative, maxCumulative))}`).join(' ');
    paths = `<polyline
      fill="none"
      stroke="#3b82f6"
      stroke-width="${String(EXPORT_LINE_STROKE_WIDTH)}"
      points="${linePoints}"
    />`;

    // Data points
    paths += data.map(d => `
      <circle
        cx="${String(getX(d.year))}"
        cy="${String(getY(d.cumulative, maxCumulative))}"
        r="${String(EXPORT_POINT_RADIUS)}"
        fill="#3b82f6"
        stroke="white"
        stroke-width="${String(EXPORT_POINT_STROKE_WIDTH)}"
      />
    `).join('');

    // Area fill
    const lastPoint = data[data.length - 1];
    const areaPoints = `${String(EXPORT_PADDING)},${String(EXPORT_HEIGHT - EXPORT_PADDING)} ${linePoints} ${String(getX(lastPoint.year))},${String(EXPORT_HEIGHT - EXPORT_PADDING)}`;
    paths = `<polygon
      fill="rgba(59, 130, 246, 0.1)"
      points="${areaPoints}"
    />` + paths;
  } else {
    // Bar chart for yearly counts
    const barWidth = chartWidth / data.length / PADDING_SIDES;
    paths = data.map(d => `
      <rect
        x="${String(getX(d.year) - barWidth / PADDING_SIDES)}"
        y="${String(getY(d.count, maxCount))}"
        width="${String(barWidth)}"
        height="${String((d.count / maxCount) * chartHeight)}"
        fill="#3b82f6"
        stroke="white"
        stroke-width="${String(EXPORT_BAR_STROKE_WIDTH)}"
        rx="${String(EXPORT_BAR_RADIUS)}"
      />
    `).join('');
  }

  // Axes
  const xAxisY = EXPORT_HEIGHT - EXPORT_PADDING;
  paths += `<line x1="${String(EXPORT_PADDING)}" y1="${String(xAxisY)}" x2="${String(EXPORT_WIDTH - EXPORT_PADDING)}" y2="${String(xAxisY)}" stroke="#666" stroke-width="${String(EXPORT_AXIS_STROKE_WIDTH)}"/>`;
  paths += `<line x1="${String(EXPORT_PADDING)}" y1="${String(EXPORT_PADDING)}" x2="${String(EXPORT_PADDING)}" y2="${String(xAxisY)}" stroke="#666" stroke-width="${String(EXPORT_AXIS_STROKE_WIDTH)}"/>`;

  // Year labels
  paths += data.map(d => `
    <text
      x="${String(getX(d.year))}"
      y="${String(EXPORT_HEIGHT - EXPORT_PADDING + EXPORT_YEAR_LABEL_Y_OFFSET)}"
      text-anchor="middle"
      font-size="${String(EXPORT_LABEL_FONT_SIZE)}"
      fill="#666"
    >${String(d.year)}</text>
  `).join('');

  // Y-axis labels
  const maxValue = type === 'line' ? maxCumulative : maxCount;
  for (let index = 0; index <= EXPORT_Y_AXIS_TICK_DIVISIONS; index++) {
    const value = Math.round((maxValue / EXPORT_Y_AXIS_TICK_DIVISIONS) * index);
    const y = getY(value, maxValue);
    paths += `
      <text
        x="${String(EXPORT_PADDING - EXPORT_Y_AXIS_LABEL_X_OFFSET)}"
        y="${String(y + EXPORT_Y_AXIS_LABEL_Y_NUDGE)}"
        text-anchor="end"
        font-size="${String(EXPORT_LABEL_FONT_SIZE)}"
        fill="#666"
      >${String(value)}</text>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${String(EXPORT_WIDTH)}" height="${String(EXPORT_HEIGHT)}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${String(EXPORT_WIDTH / PADDING_SIDES)}" y="${String(EXPORT_TITLE_Y)}" text-anchor="middle" font-size="${String(EXPORT_TITLE_FONT_SIZE)}" font-weight="bold" fill="#333">
    ${type === 'line' ? 'Cumulative Citations Over Time' : 'Yearly Citation Count'}
  </text>
  ${paths}
</svg>`;
};

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
const DATA_POINT_RADIUS = 6;
const DATA_POINT_STROKE_WIDTH = 2;
const LINE_STROKE_WIDTH = 3;
// Bars occupy this fraction of the space between year ticks.
const BAR_WIDTH_RATIO = 0.6;
const BAR_RADIUS = 2;
const BAR_LABEL_FONT_SIZE = 12;
const BAR_LABEL_OFFSET = 10;
const AXIS_STROKE_WIDTH = 1;
const YEAR_LABEL_FONT_SIZE = 12;
const YEAR_LABEL_Y_OFFSET = 20;
// Show every Nth year label to avoid crowding the axis.
const YEAR_LABEL_SAMPLE_STRIDE = 2;
const Y_AXIS_LABEL_FONT_SIZE = 12;
const Y_AXIS_LABEL_X_OFFSET = 10;
const Y_AXIS_LABEL_Y_NUDGE = 4;

export const CitationImpactChart = ({ entities, onClose }: CitationImpactChartProperties) => {
  const [chartType, setChartType] = useState<ChartType>('line');

  const yearlyData = useMemo(() => extractYearlyData(entities), [entities]);
  const hIndex = useMemo(() => calculateHIndex(yearlyData), [yearlyData]);
  const fwci = useMemo(() => calculateFWCI(yearlyData), [yearlyData]);

  const totalWorks = entities.length;
  const totalCitations = yearlyData.reduce((sum, d) => sum + d.count, 0);
  const maxYearlyCount = Math.max(...yearlyData.map(d => d.count), 0);
  const maxCumulative = Math.max(...yearlyData.map(d => d.cumulative), 0);

  // Handle export as PNG
  const handleExportPNG = () => {
    try {
      // Create SVG string for chart
      const svgContent = generateCitationChartSVG(chartType, yearlyData, maxYearlyCount, maxCumulative);
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', 'citation-impact-chart.svg');
      link.style.visibility = 'hidden';

      document.body.append(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      logger.info('charts-citation', 'Chart exported as SVG', { chartType, entityCount: entities.length });
    } catch (error) {
      logger.error('charts-citation', 'Failed to export chart', { error });
    }
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={3}>Citation Impact Analysis</Title>
          <Text size="sm" c="dimmed">
            Citation metrics and trends for {entities.length} entities
          </Text>
        </div>
        {onClose && (
          <Tooltip label="Export as PNG">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={handleExportPNG}
              aria-label="Export chart as PNG"
            >
              <IconDownload size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* Info Banner */}
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="sm" bg="blue.0">
        <Text size="sm">
          Citation impact metrics based on {entities.length} entities. Full citation analysis
          would require fetching detailed citation data from OpenAlex API.
        </Text>
      </Paper>

      {/* Metrics Summary */}
      <Paper style={{ border: BORDER_STYLE_GRAY_3 }} p="md" radius="sm">
        <Text fw={500} mb="sm">Impact Metrics</Text>
        <Group grow>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Works</Text>
            <Text size="xl" fw={700}>{totalWorks}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total Citations</Text>
            <Text size="xl" fw={700}>{totalCitations}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">h-index</Text>
            <Text size="xl" fw={700}>{hIndex}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">FWCI</Text>
            <Text size="xl" fw={700}>{fwci}</Text>
          </Stack>
        </Group>
      </Paper>

      {/* Chart Type Selector */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }}>
        <Group justify="space-between" mb="md">
          <Text fw={500}>Chart Type</Text>
          <Group gap="xs">
            <Radio
              value="line"
              checked={chartType === 'line'}
              onChange={(e) => {
                const { value } = e.currentTarget;
                if (isChartType(value)) setChartType(value);
              }}
              label="Line (Cumulative)"
            />
            <Radio
              value="bar"
              checked={chartType === 'bar'}
              onChange={(e) => {
                const { value } = e.currentTarget;
                if (isChartType(value)) setChartType(value);
              }}
              label="Bar (Yearly)"
            />
          </Group>
        </Group>
      </Card>

      {/* Chart Visualization */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }} h={EXPORT_HEIGHT}>
        {yearlyData.length > 0 ? (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${String(EXPORT_WIDTH)} ${String(EXPORT_HEIGHT)}`}
            style={{ overflow: 'visible' }}
          >
            {/* Background */}
            <rect width="100%" height="100%" fill="white" />

            {/* Title */}
            <text x={String(EXPORT_WIDTH / PADDING_SIDES)} y={String(EXPORT_TITLE_Y)} textAnchor="middle" fontSize={String(CHART_TITLE_FONT_SIZE)} fontWeight="bold" fill="#333">
              {chartType === 'line' ? 'Cumulative Citations Over Time' : 'Yearly Citation Count'}
            </text>

            {/* Chart Area */}
            <g transform={`translate(${String(CHART_GROUP_TRANSLATE_X)}, ${String(CHART_GROUP_TRANSLATE_Y)})`}>
              {(() => {
                const chartWidth = CHART_AREA_WIDTH - CHART_AREA_PADDING * PADDING_SIDES;
                const chartHeight = CHART_AREA_HEIGHT - CHART_AREA_PADDING * PADDING_SIDES;

                const years = yearlyData.map(d => d.year);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                const yearRange = maxYear - minYear || 1;

                const getX = (year: number) => CHART_AREA_PADDING + ((year - minYear) / yearRange) * chartWidth;
                const getY = (value: number, max: number) => CHART_AREA_HEIGHT - CHART_AREA_PADDING - (value / max) * chartHeight;

                const maxValue = chartType === 'line' ? maxCumulative : maxYearlyCount;

                // Grid lines
                const gridLines = GRID_TICKS.map(tick => (
                  <line
                    key={`grid-${String(tick)}`}
                    x1={CHART_AREA_PADDING}
                    y1={getY(maxValue * tick, maxValue)}
                    x2={CHART_AREA_WIDTH - CHART_AREA_PADDING}
                    y2={getY(maxValue * tick, maxValue)}
                    stroke="#e5e7eb"
                    strokeDasharray={GRID_STROKE_DASH}
                  />
                ));

                // Chart content
                let chartContent;

                if (chartType === 'line') {
                  const linePoints = yearlyData.map(d => `${String(getX(d.year))},${String(getY(d.cumulative, maxCumulative))}`).join(' ');
                  const lastDatum = yearlyData[yearlyData.length - 1];

                  chartContent = (
                    <g>
                      {/* Area fill */}
                      <polygon
                        points={`${String(CHART_AREA_PADDING)},${String(CHART_AREA_HEIGHT - CHART_AREA_PADDING)} ${linePoints} ${String(getX(lastDatum.year))},${String(CHART_AREA_HEIGHT - CHART_AREA_PADDING)}`}
                        fill="rgba(59, 130, 246, 0.1)"
                      />
                      {/* Line */}
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={LINE_STROKE_WIDTH}
                        points={linePoints}
                      />
                      {/* Data points */}
                      {yearlyData.map(d => (
                        <circle
                          key={d.year}
                          cx={getX(d.year)}
                          cy={getY(d.cumulative, maxCumulative)}
                          r={DATA_POINT_RADIUS}
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth={DATA_POINT_STROKE_WIDTH}
                        />
                      ))}
                    </g>
                  );
                } else {
                  const barWidth = (chartWidth / yearlyData.length) * BAR_WIDTH_RATIO;

                  chartContent = (
                    <g>
                      {yearlyData.map(d => (
                        <g key={d.year}>
                          <rect
                            x={getX(d.year) - barWidth / PADDING_SIDES}
                            y={getY(d.count, maxYearlyCount)}
                            width={barWidth}
                            height={CHART_AREA_HEIGHT - CHART_AREA_PADDING - getY(d.count, maxYearlyCount)}
                            fill="#3b82f6"
                            rx={BAR_RADIUS}
                          />
                          <text
                            x={getX(d.year)}
                            y={getY(d.count, maxYearlyCount) - BAR_LABEL_OFFSET}
                            textAnchor="middle"
                            fontSize={BAR_LABEL_FONT_SIZE}
                            fill="#666"
                          >
                            {d.count}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                }

                // Axes
                const axes = (
                  <g>
                    <line x1={CHART_AREA_PADDING} y1={CHART_AREA_HEIGHT - CHART_AREA_PADDING} x2={CHART_AREA_WIDTH - CHART_AREA_PADDING} y2={CHART_AREA_HEIGHT - CHART_AREA_PADDING} stroke="#666" strokeWidth={AXIS_STROKE_WIDTH} />
                    <line x1={CHART_AREA_PADDING} y1={CHART_AREA_PADDING} x2={CHART_AREA_PADDING} y2={CHART_AREA_HEIGHT - CHART_AREA_PADDING} stroke="#666" strokeWidth={AXIS_STROKE_WIDTH} />
                  </g>
                );

                // Year labels (every 2-3 years to avoid crowding)
                const yearLabels = yearlyData
                  .filter((_, index) => index % YEAR_LABEL_SAMPLE_STRIDE === 0)
                  .map(d => (
                    <text
                      key={d.year}
                      x={getX(d.year)}
                      y={CHART_AREA_HEIGHT - CHART_AREA_PADDING + YEAR_LABEL_Y_OFFSET}
                      textAnchor="middle"
                      fontSize={YEAR_LABEL_FONT_SIZE}
                      fill="#666"
                    >
                      {d.year}
                    </text>
                  ));

                // Y-axis labels
                const yAxisLabels = GRID_TICKS.map(tick => {
                  const value = Math.round(maxValue * tick);
                  return (
                    <text
                      key={`y-axis-${String(tick)}`}
                      x={CHART_AREA_PADDING - Y_AXIS_LABEL_X_OFFSET}
                      y={getY(value, maxValue) + Y_AXIS_LABEL_Y_NUDGE}
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
                    {yearLabels}
                    {yAxisLabels}
                    {chartContent}
                  </>
                );
              })()}
            </g>
          </svg>
        ) : (
          <Group justify="center" align="center" h="100%">
            <Text c="dimmed">No data available for the selected time range</Text>
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
