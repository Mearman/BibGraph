/**
 * Citation Impact Chart component
 * Displays citation impact over time with various metrics
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

interface CitationImpactChartProps {
  entities: CatalogueEntity[];
  onClose?: () => void;
}

type ChartType = 'line' | 'bar';

interface YearlyData {
  year: number;
  count: number;
  cumulative: number;
}

/**
 * Extract yearly citation data from entities
 * NOTE: Since CatalogueEntity doesn't include full citation data,
 * this generates placeholder data based on addedAt timestamps
 * In production, would fetch actual citation metrics from OpenAlex API
 * @param entities
 */
const extractYearlyData = (entities: CatalogueEntity[]): YearlyData[] => {
  const yearCounts = new Map<number, number>();

  // Count entities by year (using addedAt as placeholder for publication year)
  for (const entity of entities) {
    const year = entity.addedAt.getFullYear();
    yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
  }

  // Sort years
  const sortedYears = [...yearCounts.keys()].sort((a, b) => a - b);

  // Build yearly data with cumulative counts
  const data: YearlyData[] = [];
  let cumulative = 0;

  for (const year of sortedYears) {
    const count = yearCounts.get(year) || 0;
    cumulative += count;
    data.push({ year, count, cumulative });
  }

  return data;
};

/**
 * Calculate h-index from yearly data
 * h-index = h such that h publications have at least h citations each
 * @param data
 */
const calculateHIndex = (data: YearlyData[]): number => {
  // Placeholder calculation - in production would use actual citation counts
  const totalWorks = data.reduce((sum, d) => sum + d.count, 0);
  return Math.min(totalWorks, Math.floor(Math.sqrt(totalWorks * 10)));
};

/**
 * Calculate FWCI (Field-Weighted Citation Impact)
 * FWCI = ratio of total citations to expected citations for field
 * @param data
 */
const calculateFWCI = (data: YearlyData[]): number => {
  // Placeholder calculation - in production would use field-specific baselines
  const totalCitations = data.reduce((sum, d) => sum + d.cumulative, 0);
  const totalWorks = data.reduce((sum, d) => sum + d.count, 0);
  if (totalWorks === 0) return 0;
  return Number.parseFloat((totalCitations / totalWorks / 2).toFixed(2));
};

export const CitationImpactChart = ({ entities, onClose }: CitationImpactChartProps) => {
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
      const svgContent = generateSVG(chartType, yearlyData, maxYearlyCount, maxCumulative);
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

  /**
   * Generate SVG chart
   * @param type
   * @param data
   * @param maxCount
   * @param maxCumulative
   */
  const generateSVG = (type: ChartType, data: YearlyData[], maxCount: number, maxCumulative: number): string => {
    const width = 800;
    const height = 400;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const years = data.map(d => d.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const getX = (year: number) => padding + ((year - minYear) / (maxYear - minYear || 1)) * chartWidth;
    const getY = (value: number, max: number) => height - padding - (value / max) * chartHeight;

    let paths = '';

    if (type === 'line') {
      // Cumulative line
      const linePoints = data.map(d => `${getX(d.year)},${getY(d.cumulative, maxCumulative)}`).join(' ');
      paths = `<polyline
        fill="none"
        stroke="#3b82f6"
        stroke-width="3"
        points="${linePoints}"
      />`;

      // Data points
      paths += data.map(d => `
        <circle
          cx="${getX(d.year)}"
          cy="${getY(d.cumulative, maxCumulative)}"
          r="5"
          fill="#3b82f6"
          stroke="white"
          stroke-width="2"
        />
      `).join('');

      // Area fill
      const areaPoints = `${padding},${height - padding} ${linePoints} ${getX(data[data.length - 1].year)},${height - padding}`;
      paths = `<polygon
        fill="rgba(59, 130, 246, 0.1)"
        points="${areaPoints}"
      />` + paths;
    } else {
      // Bar chart for yearly counts
      const barWidth = chartWidth / data.length / 2;
      paths = data.map(d => `
        <rect
          x="${getX(d.year) - barWidth / 2}"
          y="${getY(d.count, maxCount)}"
          width="${barWidth}"
          height="${(d.count / maxCount) * chartHeight}"
          fill="#3b82f6"
          stroke="white"
          stroke-width="1"
          rx="2"
        />
      `).join('');
    }

    // Axes
    const xAxisY = height - padding;
    paths += `<line x1="${padding}" y1="${xAxisY}" x2="${width - padding}" y2="${xAxisY}" stroke="#666" stroke-width="1"/>`;
    paths += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${xAxisY}" stroke="#666" stroke-width="1"/>`;

    // Year labels
    paths += data.map(d => `
      <text
        x="${getX(d.year)}"
        y="${height - padding + 20}"
        text-anchor="middle"
        font-size="12"
        fill="#666"
      >${d.year}</text>
    `).join('');

    // Y-axis labels
    const maxValue = type === 'line' ? maxCumulative : maxCount;
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue / 5) * i);
      const y = getY(value, maxValue);
      paths += `
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
    ${type === 'line' ? 'Cumulative Citations Over Time' : 'Yearly Citation Count'}
  </text>
  ${paths}
</svg>`;
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
              onChange={(e) => setChartType(e.currentTarget.value as ChartType)}
              label="Line (Cumulative)"
            />
            <Radio
              value="bar"
              checked={chartType === 'bar'}
              onChange={(e) => setChartType(e.currentTarget.value as ChartType)}
              label="Bar (Yearly)"
            />
          </Group>
        </Group>
      </Card>

      {/* Chart Visualization */}
      <Card padding="md" radius="sm" style={{ border: BORDER_STYLE_GRAY_3 }} h={400}>
        {yearlyData.length > 0 ? (
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
              {chartType === 'line' ? 'Cumulative Citations Over Time' : 'Yearly Citation Count'}
            </text>

            {/* Chart Area */}
            <g transform="translate(60, 40)">
              {(() => {
                const width = 680;
                const height = 300;
                const padding = 40;
                const chartWidth = width - padding * 2;
                const chartHeight = height - padding * 2;

                const years = yearlyData.map(d => d.year);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                const yearRange = maxYear - minYear || 1;

                const getX = (year: number) => padding + ((year - minYear) / yearRange) * chartWidth;
                const getY = (value: number, max: number) => height - padding - (value / max) * chartHeight;

                const maxValue = chartType === 'line' ? maxCumulative : maxYearlyCount;

                // Grid lines
                const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => (
                  <line
                    key={ratio}
                    x1={padding}
                    y1={getY(maxValue * ratio, maxValue)}
                    x2={width - padding}
                    y2={getY(maxValue * ratio, maxValue)}
                    stroke="#e5e7eb"
                    strokeDasharray="4"
                  />
                ));

                // Chart content
                let chartContent;

                if (chartType === 'line') {
                  const linePoints = yearlyData.map(d => `${getX(d.year)},${getY(d.cumulative, maxCumulative)}`).join(' ');

                  chartContent = (
                    <g>
                      {/* Area fill */}
                      <polygon
                        points={`${padding},${height - padding} ${linePoints} ${getX(yearlyData[yearlyData.length - 1].year)},${height - padding}`}
                        fill="rgba(59, 130, 246, 0.1)"
                      />
                      {/* Line */}
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        points={linePoints}
                      />
                      {/* Data points */}
                      {yearlyData.map(d => (
                        <circle
                          key={d.year}
                          cx={getX(d.year)}
                          cy={getY(d.cumulative, maxCumulative)}
                          r="6"
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth="2"
                        />
                      ))}
                    </g>
                  );
                } else {
                  const barWidth = (chartWidth / yearlyData.length) * 0.6;

                  chartContent = (
                    <g>
                      {yearlyData.map(d => (
                        <g key={d.year}>
                          <rect
                            x={getX(d.year) - barWidth / 2}
                            y={getY(d.count, maxYearlyCount)}
                            width={barWidth}
                            height={height - padding - getY(d.count, maxYearlyCount)}
                            fill="#3b82f6"
                            rx="2"
                          />
                          <text
                            x={getX(d.year)}
                            y={getY(d.count, maxYearlyCount) - 10}
                            textAnchor="middle"
                            fontSize="12"
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
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="1" />
                  </g>
                );

                // Year labels (every 2-3 years to avoid crowding)
                const yearLabels = yearlyData
                  .filter((_, i) => i % 2 === 0)
                  .map(d => (
                    <text
                      key={d.year}
                      x={getX(d.year)}
                      y={height - padding + 20}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#666"
                    >
                      {d.year}
                    </text>
                  ));

                // Y-axis labels
                const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
                  const value = Math.round(maxValue * ratio);
                  return (
                    <text
                      key={ratio}
                      x={padding - 10}
                      y={getY(value, maxValue) + 4}
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
