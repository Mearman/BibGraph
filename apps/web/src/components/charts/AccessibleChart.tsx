/**
 * Accessible Chart Components
 *
 * WCAG 2.1 AA compliant chart components with comprehensive screen reader support,
 * keyboard navigation, and alternative text representations.
 */

import type { ComparisonResults } from "@bibgraph/utils";
import {
  ActionIcon,
  Box,
  Group,
  Kbd,
  Stack,
  Text,
  Title,
  Tooltip} from "@mantine/core";
import {
  IconAccessible,
  IconChartBar,
  IconMinimize,
  IconTable} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { announceToScreenReader, createFocusTrap } from "@/utils/accessibility";

// Converts a 0-1 score ratio to a percentage for display.
const PERCENTAGE_MULTIPLIER = 100;
// Decimal places shown for the raw (non-percentage) performance-range figure.
const PERFORMANCE_RANGE_DECIMAL_PLACES = 3;
// Decimal places shown when announcing a single data point's raw value to screen readers.
const POINT_VALUE_DECIMAL_PLACES = 3;
// Vertical space reserved for the title/toolbar above the chart placeholder area.
const PLACEHOLDER_CHART_HEIGHT_OFFSET = 100;

interface AccessibleChartProperties {
  comparisonResults: ComparisonResults[];
  title: string;
  description?: string;
  chartType: 'bar' | 'scatter' | 'heatmap';
  height?: number;
  provideDataTable?: boolean;
  provideAudioDescription?: boolean;
}

interface DataPoint {
  id: string;
  label: string;
  value: number;
  category?: string;
  description?: string;
}

interface ChartData {
  points: DataPoint[];
  summary: string;
  insights: string[];
}

/**
 * Generates comprehensive data table representation for screen readers
 */
const _generateDataTable = (data: ChartData): string => {
  let table = "Data Table:\n\n";
  table += "Point\tValue\tDescription\n";
  table += "-----\t-----\t-----------\n";

  for (const point of data.points) {
    table += `${point.label}\t${String(point.value)}\t${point.description ?? ''}\n`;
  }

  table += `\nSummary: ${data.summary}\n`;
  table += "\nKey Insights:\n";
  for (const [index, insight] of data.insights.entries()) {
    table += `${String(index + 1)}. ${insight}\n`;
  }

  return table;
};

/**
 * Generates audio description for charts
 */
const generateAudioDescription = (data: ChartData, chartType: string): string => {
  let description = `${chartType} chart titled "${data.summary}". `;

  if (data.points.length === 0) {
    description += "The chart contains no data.";
    return description;
  }

  description += `The chart displays ${String(data.points.length)} data points. `;

  // Range information
  const values = data.points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  description += `Values range from ${min.toFixed(1)} to ${max.toFixed(1)}, with an average of ${avg.toFixed(1)}. `;

  // Highlight key points
  const highestPoint = data.points.reduce((currentHighest, point) =>
    point.value > currentHighest.value ? point : currentHighest, data.points[0]
  );
  const lowestPoint = data.points.reduce((currentLowest, point) =>
    point.value < currentLowest.value ? point : currentLowest, data.points[0]
  );

  description += `The highest value is ${String(highestPoint.value)} for ${highestPoint.label}. `;
  description += `The lowest value is ${String(lowestPoint.value)} for ${lowestPoint.label}. `;

  return description;
};

/**
 * Accessible Data Table View
 */
const DataTableView = ({ data, onClose }: { data: ChartData; onClose: () => void }) => {
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tableRef.current) {
    	return undefined;
    }

    return createFocusTrap(tableRef.current);
  }, []);

  return (
    <Box
      ref={tableRef}
      style={{
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: '8px',
        padding: '16px',
        maxHeight: '400px',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-table-title"
    >
      <Group justify="space-between" mb="md">
        <Title id="data-table-title" order={3}>Data Table View</Title>
        <ActionIcon
          onClick={onClose}
          aria-label="Close data table view"
          variant="subtle"
        >
          <IconMinimize size={16} />
        </ActionIcon>
      </Group>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
        }}
        role="table"
        aria-label="Chart data in table format"
      >
        <thead>
          <tr style={{ borderBottom: '2px solid var(--mantine-color-gray-4)' }}>
            <th
              style={{
                textAlign: 'left',
                padding: '8px',
                fontWeight: '600',
                color: 'var(--mantine-color-text)',
              }}
              scope="col"
            >
              Label
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '8px',
                fontWeight: '600',
                color: 'var(--mantine-color-text)',
              }}
              scope="col"
            >
              Value
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '8px',
                fontWeight: '600',
                color: 'var(--mantine-color-text)',
              }}
              scope="col"
            >
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {data.points.map((point, index) => (
            <tr
              key={point.id}
              style={{
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                backgroundColor: index % 2 === 0 ? 'var(--mantine-color-gray-0)' : 'transparent',
              }}
            >
              <td style={{ padding: '8px', fontWeight: '500' }}>
                {point.label}
              </td>
              <td
                style={{
                  padding: '8px',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontWeight: '600',
                }}
              >
                {point.value.toFixed(2)}
              </td>
              <td style={{ padding: '8px', color: 'var(--mantine-color-dimmed)' }}>
                {point.description ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Box mt="md" p="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)', borderRadius: '4px' }}>
        <Text size="sm" fw={600} mb="xs">Summary</Text>
        <Text size="sm">{data.summary}</Text>

        {data.insights.length > 0 && (
          <>
            <Text size="sm" fw={600} mt="sm" mb="xs">Key Insights</Text>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {data.insights.map((insight, index) => (
                <li key={index}>
                  <Text size="sm">{insight}</Text>
                </li>
              ))}
            </ul>
          </>
        )}
      </Box>
    </Box>
  );
};

/**
 * Keyboard Navigation Instructions
 */
const KeyboardInstructions = ({ chartType }: { chartType: 'bar' | 'scatter' | 'heatmap' }) => {
  const instructions = {
    bar: [
      'Tab: Navigate between bars',
      'Enter/Space: Select bar and hear value',
      'Arrow Up/Down: Move between bars',
      'T: Toggle data table view',
      'H: Hear chart summary',
    ],
    scatter: [
      'Tab: Navigate between data points',
      'Enter/Space: Select point and hear details',
      'Arrow Keys: Navigate between points',
      'T: Toggle data table view',
      'H: Hear chart summary',
    ],
    heatmap: [
      'Tab: Navigate between cells',
      'Enter/Space: Select cell and hear value',
      'Arrow Keys: Move between cells',
      'T: Toggle data table view',
      'H: Hear chart summary',
    ],
  };

  return (
    <Box
      style={{
        backgroundColor: 'var(--mantine-color-gray-0)',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: '4px',
        padding: '12px',
        fontSize: '12px',
      }}
      role="complementary"
      aria-label="Keyboard navigation instructions"
    >
      <Text size="sm" fw={600} mb="xs">
        <Group gap="xs">
          <IconAccessible size={14} />
          Keyboard Navigation
        </Group>
      </Text>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {instructions[chartType].map((instruction, index) => (
          <li key={index} style={{ marginBottom: '2px' }}>
            <Text size="xs">
              <Kbd size="xs">{instruction.split(':', 1)[0]}</Kbd> {instruction.split(':', 2)[1]}
            </Text>
          </li>
        ))}
      </ul>
    </Box>
  );
};

/**
 * Main Accessible Chart Component
 */
export const AccessibleChart = ({
  comparisonResults,
  title,
  description,
  chartType,
  height = 400,
  provideDataTable = true,
  provideAudioDescription: _provideAudioDescription = true,
}: AccessibleChartProperties) => {
  const [showDataTable, setShowDataTable] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Process data for accessibility
  const chartData: ChartData = useMemo(() => {
    const points: DataPoint[] = comparisonResults.map((result, index) => ({
      id: `point-${String(index)}`,
      label: result.dataset.name,
      value: result.f1Score, // Use F1 score as primary metric
      category: 'dataset',
      description: `Precision: ${(result.precision * PERCENTAGE_MULTIPLIER).toFixed(1)}%, Recall: ${(result.recall * PERCENTAGE_MULTIPLIER).toFixed(1)}%, F1-Score: ${(result.f1Score * PERCENTAGE_MULTIPLIER).toFixed(1)}%`,
    }));

    const values = points.map(p => p.value);
    const insights = [
      `Highest performing dataset: ${points.reduce((max, p) => p.value > max.value ? p : max, points[0]).label}`,
      `Average F1-score: ${(values.reduce((a, b) => a + b, 0) / values.length * PERCENTAGE_MULTIPLIER).toFixed(1)}%`,
      `Performance range: ${(Math.max(...values) - Math.min(...values)).toFixed(PERFORMANCE_RANGE_DECIMAL_PLACES)}`,
    ];

    return {
      points,
      summary: `${String(comparisonResults.length)} datasets compared on F1-score performance`,
      insights,
    };
  }, [comparisonResults]);

  // Generate comprehensive description
  const comprehensiveDescription = useMemo(() => {
    return generateAudioDescription(chartData, `${chartType} chart`);
  }, [chartData, chartType]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    setIsKeyboardMode(true);

    switch (event.key) {
      case 'Tab':
        // Let default tab behavior work
        break;

      case 't':
      case 'T':
        if (provideDataTable) {
          event.preventDefault();
          setShowDataTable(!showDataTable);
          announceToScreenReader(showDataTable ? 'Data table closed' : 'Data table opened');
        }
        break;

      case 'h':
      case 'H':
        event.preventDefault();
        announceToScreenReader(comprehensiveDescription);
        break;

      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight': {
        event.preventDefault();
        const currentIndex = selectedPoint ?? 0;
        let newIndex: number;

        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          newIndex = Math.min(currentIndex + 1, chartData.points.length - 1);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }

        setSelectedPoint(newIndex);
        const point = chartData.points[newIndex];
        announceToScreenReader(`${point.label}: ${point.value.toFixed(POINT_VALUE_DECIMAL_PLACES)}. ${point.description ?? ""}`);
        break;
      }

      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (selectedPoint !== null) {
          const point = chartData.points[selectedPoint];
          announceToScreenReader(`Selected: ${point.label}. ${point.description ?? ""}`);
        }
        break;
      }

      default:
        break;
    }
  }, [selectedPoint, chartData, showDataTable, provideDataTable, comprehensiveDescription]);

  
  return (
    <Box
      ref={chartRef}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        minHeight: height,
      }}
      role="application"
      aria-label={`Accessible ${chartType} chart: ${title}`}
      tabIndex={0}
    >
      {/* Chart title and description */}
      <Stack mb="md">
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Title order={3} mb="xs">{title}</Title>
            {description !== undefined && description !== "" && (
              <Text size="sm" c="dimmed">{description}</Text>
            )}
          </Box>

          <Group gap="xs">
            {provideDataTable && (
              <Tooltip label="Toggle data table view (T)">
                <ActionIcon
                  onClick={() => {
                    setShowDataTable(!showDataTable);
                    announceToScreenReader(showDataTable ? 'Data table closed' : 'Data table opened');
                  }}
                  aria-label="Toggle data table view"
                  aria-pressed={showDataTable}
                  variant={showDataTable ? 'filled' : 'subtle'}
                >
                  <IconTable size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            <Tooltip label="Hear chart summary (H)">
              <ActionIcon
                onClick={() => { announceToScreenReader(comprehensiveDescription); }}
                aria-label="Hear chart summary"
                variant="subtle"
              >
                <IconAccessible size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Stack>

      {/* Visual chart placeholder (would be replaced with actual chart component) */}
      <Box
        style={{
          height: height - PLACEHOLDER_CHART_HEIGHT_OFFSET,
          border: '2px dashed var(--mantine-color-gray-4)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--mantine-color-gray-0)',
        }}
        role="img"
        aria-label={`${chartType} chart visualization`}
      >
        <Stack align="center" gap="md">
          <IconChartBar size={48} style={{ color: 'var(--mantine-color-gray-4)' }} />
          <Text size="lg" c="dimmed">Chart Visualization</Text>
          <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>
            {chartData.points.length} data points displayed<br />
            {isKeyboardMode && 'Keyboard navigation active'}
          </Text>
        </Stack>
      </Box>

      {/* Data Table Modal */}
      {showDataTable && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => { setShowDataTable(false); }}
        >
          <Box onClick={(e) => { e.stopPropagation(); }} style={{ maxWidth: '600px', width: '100%' }}>
            <DataTableView data={chartData} onClose={() => { setShowDataTable(false); }} />
          </Box>
        </Box>
      )}

      {/* Keyboard Instructions */}
      <KeyboardInstructions chartType={chartType} />

      {/* Screen reader-only comprehensive description */}
      <Box
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        role="complementary"
        aria-live="polite"
      >
        <Text>{comprehensiveDescription}</Text>
      </Box>
    </Box>
  );
};

/**
 * Chart with Alt Text Generator
 */
export const ChartWithAltText = ({
  children,
  title,
  data,
  generateAltText = true
}: {
  children: React.ReactNode;
  title: string;
  data: unknown[];
  generateAltText?: boolean;
}) => {
  const altText = useMemo(() => {
    if (!generateAltText || data.length === 0) return '';

    const values = data.map((d: unknown) => (typeof d === 'object' && d !== null && 'value' in d) ? Number((d).value) || 0 : 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return `Chart showing ${String(data.length)} items. Average value: ${avg.toFixed(1)}. Range: ${min.toFixed(1)} to ${max.toFixed(1)}. ${title}`;
  }, [data, generateAltText, title]);

  return (
    <Box role="img" aria-label={altText} title={altText}>
      {children}
    </Box>
  );
};