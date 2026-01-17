/**
 * Responsive Chart Components
 *
 * Touch-friendly, accessible chart components that adapt to different screen sizes
 * and device capabilities. Supports both desktop and mobile interactions.
 */

import { useCallback, useRef, useState } from "react";

import { useTouchGestures } from "@/hooks/use-touch-gestures";
import { announceToScreenReader } from "@/utils/accessibility";

import { ChartEmptyState } from "./ChartEmptyState";
import { ChartHeader } from "./ChartHeader";
import { ChartInstructions } from "./ChartInstructions";
import {
  PerformanceChartHints,
  ScatterPlotDetails,
} from "./MobileSelectionPanel";
import type {
  DatasetPerformanceData,
  FocusedBarState,
  ResponsiveChartProps,
  ScatterPlotPoint,
} from "./responsive-chart.types";
import {
  CHART_CONSTANTS,
  getBarColor,
  PERFORMANCE_METRICS,
} from "./responsive-chart.types";
import { ScatterPlotLegend } from "./ScatterPlotLegend";
import { usePerformanceChartData, useScatterPlotData } from "./use-chart-data";
import { useMobileDetection } from "./use-mobile-detection";

/**
 * Touch-friendly bar chart component with responsive design
 * @param root0
 * @param root0.comparisonResults
 * @param root0.title
 * @param root0.description
 * @param root0.height
 * @param root0.mobileHeight
 * @param root0.ariaLabel
 */
export const ResponsivePerformanceChart = ({
  comparisonResults,
  title,
  description,
  height = CHART_CONSTANTS.DEFAULT_HEIGHT,
  mobileHeight = CHART_CONSTANTS.DEFAULT_MOBILE_HEIGHT,
  ariaLabel,
}: ResponsiveChartProps) => {
  const isMobile = useMobileDetection();
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [focusedBar, setFocusedBar] = useState<FocusedBarState | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { chartData, maxValue } = usePerformanceChartData(comparisonResults);
  const actualHeight = isMobile ? mobileHeight : height;

  const handleTouchStart = useCallback(
    (datasetName: string, metric: string) => {
      if (isMobile) {
        setSelectedDataset(datasetName);
        setFocusedBar({ dataset: datasetName, metric });
        const value = (
          (chartData.find((d) => d.datasetName === datasetName)?.[
            metric as keyof DatasetPerformanceData
          ] as number) * 100
        ).toFixed(1);
        announceToScreenReader(`${datasetName} ${metric}: ${value}%`);
      }
    },
    [isMobile, chartData]
  );

  const touchHandlers = useTouchGestures(
    {
      onSwipe: (direction, velocity) => {
        if (!isMobile || !scrollContainerRef.current) return;
        const scrollAmount =
          CHART_CONSTANTS.SWIPE_SCROLL_MULTIPLIER * velocity;
        if (direction === "left") {
          scrollContainerRef.current.scrollLeft += scrollAmount;
        } else if (direction === "right") {
          scrollContainerRef.current.scrollLeft -= scrollAmount;
        }
      },
      onDoubleTap: () => {
        if (isMobile) {
          setZoomLevel((prev) =>
            prev === CHART_CONSTANTS.MIN_ZOOM
              ? CHART_CONSTANTS.ZOOM_TOGGLE_TARGET
              : CHART_CONSTANTS.MIN_ZOOM
          );
          announceToScreenReader(
            `Zoom ${zoomLevel === CHART_CONSTANTS.MIN_ZOOM ? "in" : "out"}`
          );
        }
      },
      onPinch: (scale) => {
        if (isMobile) {
          setZoomLevel(
            Math.max(
              CHART_CONSTANTS.MIN_ZOOM,
              Math.min(CHART_CONSTANTS.MAX_ZOOM, scale)
            )
          );
          announceToScreenReader(`Zoom level: ${Math.round(scale * 100)}%`);
        }
      },
    },
    {
      swipeThreshold: 30,
      pinchThreshold: 0.1,
      doubleTapDelay: 300,
      preventDefault: false,
    }
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, datasetName: string, metric: string) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSelectedDataset(datasetName);
        setFocusedBar({ dataset: datasetName, metric });
        const value = (
          (chartData.find((d) => d.datasetName === datasetName)?.[
            metric as keyof DatasetPerformanceData
          ] as number) * 100
        ).toFixed(1);
        announceToScreenReader(`${datasetName} ${metric}: ${value}%`);
      }
    },
    [chartData]
  );

  if (chartData.length === 0) {
    return <ChartEmptyState height={actualHeight} />;
  }

  return (
    <div
      ref={chartRef}
      style={{
        backgroundColor: "var(--mantine-color-body)",
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "12px",
        padding: isMobile ? "16px" : "24px",
        minHeight: actualHeight,
      }}
      role="img"
      aria-label={
        ariaLabel || `Performance chart showing ${chartData.length} datasets`
      }
    >
      <ChartHeader title={title} description={description} isMobile={isMobile} />

      <div
        ref={scrollContainerRef}
        style={{
          height: `${actualHeight - (isMobile ? 80 : 100)}px`,
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}
        {...touchHandlers.handlers}
      >
        <div
          style={{
            minWidth: isMobile
              ? `${CHART_CONSTANTS.MIN_SCROLL_WIDTH * zoomLevel}px`
              : "auto",
            transform: isMobile ? `scale(${zoomLevel})` : "none",
            transformOrigin: "top left",
            transition: "transform 0.2s ease",
          }}
        >
          {chartData.map((dataset, index) => (
            <DatasetBars
              key={dataset.datasetName || `dataset-${index}`}
              dataset={dataset}
              maxValue={maxValue}
              isMobile={isMobile}
              focusedBar={focusedBar}
              selectedDataset={selectedDataset}
              onTouchStart={handleTouchStart}
              onKeyDown={handleKeyDown}
            />
          ))}
        </div>
      </div>

      {isMobile && selectedDataset && (
        <PerformanceChartHints
          datasetName={selectedDataset}
          zoomLevel={zoomLevel}
        />
      )}

      {!isMobile && (
        <ChartInstructions
          isMobile={false}
          mobileText=""
          desktopText="Hover over bars for details. Use Tab + Enter for keyboard navigation"
        />
      )}
    </div>
  );
};

interface DatasetBarsProps {
  dataset: DatasetPerformanceData;
  maxValue: number;
  isMobile: boolean;
  focusedBar: FocusedBarState | null;
  selectedDataset: string | null;
  onTouchStart: (datasetName: string, metric: string) => void;
  onKeyDown: (
    event: React.KeyboardEvent,
    datasetName: string,
    metric: string
  ) => void;
}

const DatasetBars = ({
  dataset,
  maxValue,
  isMobile,
  focusedBar,
  selectedDataset,
  onTouchStart,
  onKeyDown,
}: DatasetBarsProps) => {
  const isSelected = selectedDataset === dataset.datasetName;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "12px" : "16px",
        marginBottom: isMobile ? "20px" : "24px",
        padding: isMobile ? "8px" : "0",
      }}
    >
      <div
        style={{
          width: isMobile ? "120px" : "200px",
          fontSize: isMobile ? "12px" : "14px",
          fontWeight: "500",
          color: "var(--mantine-color-text)",
          textAlign: isMobile ? "left" : "right",
          flexShrink: 0,
        }}
      >
        {dataset.datasetName}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "3px" : "4px",
          minWidth: 0,
        }}
      >
        {PERFORMANCE_METRICS.map((metric) => {
          const value = dataset[metric];
          const percentage = (value / maxValue) * 100;
          const isFocused =
            focusedBar?.dataset === dataset.datasetName &&
            focusedBar?.metric === metric;

          return (
            <MetricBar
              key={metric}
              metric={metric}
              value={value}
              percentage={percentage}
              isMobile={isMobile}
              isFocused={isFocused}
              isSelected={isSelected}
              datasetName={dataset.datasetName}
              onTouchStart={onTouchStart}
              onKeyDown={onKeyDown}
            />
          );
        })}
      </div>
    </div>
  );
};

interface MetricBarProps {
  metric: string;
  value: number;
  percentage: number;
  isMobile: boolean;
  isFocused: boolean;
  isSelected: boolean;
  datasetName: string;
  onTouchStart: (datasetName: string, metric: string) => void;
  onKeyDown: (
    event: React.KeyboardEvent,
    datasetName: string,
    metric: string
  ) => void;
}

const MetricBar = ({
  metric,
  value,
  percentage,
  isMobile,
  isFocused,
  isSelected,
  datasetName,
  onTouchStart,
  onKeyDown,
}: MetricBarProps) => {
  const displayMetric = metric.replace("f1Score", "F1-Score");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "6px" : "8px",
      }}
    >
      <div
        style={{
          width: isMobile ? "50px" : "60px",
          fontSize: isMobile ? "10px" : "12px",
          color: isSelected
            ? "var(--mantine-color-text)"
            : "var(--mantine-color-dimmed)",
          textAlign: "right",
          textTransform: "capitalize",
          fontWeight: isSelected ? 500 : 400,
        }}
      >
        {displayMetric}
      </div>

      <div
        style={{
          flex: 1,
          height: isMobile ? "12px" : "16px",
          backgroundColor: "var(--mantine-color-gray-2)",
          borderRadius: isMobile ? "6px" : "8px",
          position: "relative",
          overflow: "hidden",
          minWidth: "80px",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: getBarColor(metric, isFocused),
            borderRadius: isMobile ? "6px" : "8px",
            transition: isMobile ? "none" : "all 0.2s ease",
            cursor: isMobile ? "pointer" : "default",
            transform: isFocused ? "scaleY(1.1)" : "scaleY(1)",
            transformOrigin: "bottom",
          }}
          onTouchStart={() => onTouchStart(datasetName, metric)}
          onKeyDown={(e) => onKeyDown(e, datasetName, metric)}
          tabIndex={0}
          role="button"
          aria-label={`${datasetName} ${metric}: ${(value * 100).toFixed(1)}%`}
          aria-pressed={isFocused}
        />
      </div>

      <div
        style={{
          width: isMobile ? "40px" : "50px",
          fontSize: isMobile ? "10px" : "12px",
          color: "var(--mantine-color-text)",
          fontWeight: isFocused ? 600 : 500,
          textAlign: "right",
        }}
      >
        {(value * 100).toFixed(1)}%
      </div>
    </div>
  );
};

/**
 * Responsive scatter plot with touch and keyboard support
 * @param root0
 * @param root0.comparisonResults
 * @param root0.title
 * @param root0.description
 * @param root0.height
 * @param root0.mobileHeight
 * @param root0.ariaLabel
 */
export const ResponsiveScatterPlot = ({
  comparisonResults,
  title,
  description,
  height: _height = CHART_CONSTANTS.DEFAULT_HEIGHT,
  mobileHeight = CHART_CONSTANTS.DEFAULT_SCATTER_HEIGHT,
  ariaLabel,
}: ResponsiveChartProps) => {
  const isMobile = useMobileDetection();
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const plotData = useScatterPlotData(comparisonResults);

  if (plotData.length === 0) {
    return (
      <ChartEmptyState
        height={mobileHeight}
        message="No comparison results available for scatter plot"
      />
    );
  }

  const plotSize = isMobile
    ? CHART_CONSTANTS.PLOT_SIZE_MOBILE
    : CHART_CONSTANTS.PLOT_SIZE_DESKTOP;
  const padding = isMobile
    ? CHART_CONSTANTS.PADDING_MOBILE
    : CHART_CONSTANTS.PADDING_DESKTOP;
  const touchRadius = isMobile
    ? CHART_CONSTANTS.TOUCH_RADIUS_MOBILE
    : CHART_CONSTANTS.TOUCH_RADIUS_DESKTOP;

  const selectedPointData = plotData.find((p) => p.id === selectedPoint);

  return (
    <div
      ref={plotRef}
      style={{
        backgroundColor: "var(--mantine-color-body)",
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "12px",
        padding: isMobile ? "16px" : "24px",
      }}
      role="img"
      aria-label={
        ariaLabel ||
        `Precision-Recall scatter plot with ${plotData.length} data points`
      }
    >
      <ChartHeader title={title} description={description} isMobile={isMobile} />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: isMobile ? "16px" : "24px",
        }}
      >
        <ScatterPlotSVG
          plotData={plotData}
          plotSize={plotSize}
          padding={padding}
          touchRadius={touchRadius}
          isMobile={isMobile}
          selectedPoint={selectedPoint}
          onSelectPoint={setSelectedPoint}
        />

        <ScatterPlotLegend
          plotData={plotData}
          isMobile={isMobile}
          selectedPoint={selectedPoint}
        />
      </div>

      {isMobile && selectedPointData && (
        <ScatterPlotDetails
          datasetName={selectedPointData.datasetName}
          precision={selectedPointData.precision}
          recall={selectedPointData.recall}
          f1Score={selectedPointData.f1Score}
        />
      )}

      <ChartInstructions
        isMobile={isMobile}
        mobileText="Tap points to select. Swipe legend to scroll. Use Tab + Enter for keyboard navigation"
        desktopText="Circle size represents dataset size. Hover over points for detailed metrics."
      />
    </div>
  );
};

interface ScatterPlotSVGProps {
  plotData: ScatterPlotPoint[];
  plotSize: number;
  padding: number;
  touchRadius: number;
  isMobile: boolean;
  selectedPoint: number | null;
  onSelectPoint: (id: number | null) => void;
}

const ScatterPlotSVG = ({
  plotData,
  plotSize,
  padding,
  touchRadius,
  isMobile,
  selectedPoint,
  onSelectPoint,
}: ScatterPlotSVGProps) => {
  const POINT_SIZE_DIVISOR = 20;
  const MIN_RADIUS_MOBILE = 8;
  const MIN_RADIUS_DESKTOP = 4;
  const MAX_RADIUS_MOBILE = 16;
  const MAX_RADIUS_DESKTOP = 12;

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <svg
        width={plotSize + padding * 2}
        height={plotSize + padding * 2}
        style={{
          border: "1px solid var(--mantine-color-gray-3)",
          borderRadius: "8px",
          cursor: isMobile ? "pointer" : "default",
        }}
        role="application"
        aria-label="Scatter plot showing precision vs recall trade-off"
      >
        <defs>
          <pattern
            id="grid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="var(--mantine-color-gray-2)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={plotSize + padding}
          stroke="var(--mantine-color-gray-6)"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={plotSize + padding}
          x2={plotSize + padding}
          y2={plotSize + padding}
          stroke="var(--mantine-color-gray-6)"
          strokeWidth="2"
        />

        {isMobile &&
          plotData.map((point) => {
            const x = padding + point.recall * plotSize;
            const y = padding + (plotSize - point.precision * plotSize);
            return (
              <circle
                key={`hit-${point.id}`}
                cx={x}
                cy={y}
                r={touchRadius}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onTouchStart={() => onSelectPoint(point.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectPoint(point.id);
                    announceToScreenReader(
                      `${point.datasetName}: Precision ${(point.precision * 100).toFixed(1)}%, Recall ${(point.recall * 100).toFixed(1)}%, F1 ${(point.f1Score * 100).toFixed(1)}%`
                    );
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${point.datasetName}: Precision ${(point.precision * 100).toFixed(1)}%, Recall ${(point.recall * 100).toFixed(1)}%`}
              />
            );
          })}

        {plotData.map((point) => {
          const x = padding + point.recall * plotSize;
          const y = padding + (plotSize - point.precision * plotSize);
          const minRadius = isMobile ? MIN_RADIUS_MOBILE : MIN_RADIUS_DESKTOP;
          const maxRadius = isMobile ? MAX_RADIUS_MOBILE : MAX_RADIUS_DESKTOP;
          const radius = Math.max(
            minRadius,
            Math.min(maxRadius, point.totalPapers / POINT_SIZE_DIVISOR)
          );
          const isSelected = selectedPoint === point.id;
          const HIGHLIGHT_OFFSET = 4;
          const HIGHLIGHT_STROKE_WIDTH = 2;
          const SELECTED_STROKE_WIDTH = 3;
          const NORMAL_STROKE_WIDTH = 2;

          return (
            <g key={point.id}>
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + HIGHLIGHT_OFFSET}
                  fill="var(--mantine-color-blue-1)"
                  stroke="var(--mantine-color-blue-4)"
                  strokeWidth={HIGHLIGHT_STROKE_WIDTH}
                  style={{ animation: "pulse 2s infinite" }}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={
                  isSelected
                    ? "var(--mantine-color-blue-6)"
                    : "var(--mantine-color-blue-5)"
                }
                fillOpacity={isSelected ? 1 : 0.7}
                stroke="var(--mantine-color-blue-7)"
                strokeWidth={
                  isSelected ? SELECTED_STROKE_WIDTH : NORMAL_STROKE_WIDTH
                }
                style={{
                  cursor: "pointer",
                  transition: isMobile ? "none" : "all 0.2s ease",
                }}
                onMouseEnter={
                  !isMobile ? () => onSelectPoint(point.id) : undefined
                }
                onMouseLeave={!isMobile ? () => onSelectPoint(null) : undefined}
              />
              <title>
                {point.datasetName}: Precision=
                {(point.precision * 100).toFixed(1)}%, Recall=
                {(point.recall * 100).toFixed(1)}%, F1=
                {(point.f1Score * 100).toFixed(1)}%
              </title>
            </g>
          );
        })}

        <text
          x={plotSize / 2 + padding}
          y={plotSize + padding + (isMobile ? 25 : 30)}
          textAnchor="middle"
          style={{
            fontSize: isMobile ? "10px" : "12px",
            fill: "var(--mantine-color-gray-6)",
          }}
        >
          Recall
        </text>
        <text
          x={15}
          y={plotSize / 2 + padding}
          textAnchor="middle"
          transform={`rotate(-90 15 ${String(plotSize / 2 + padding)})`}
          style={{
            fontSize: isMobile ? "10px" : "12px",
            fill: "var(--mantine-color-gray-6)",
          }}
        >
          Precision
        </text>

        <ScaleIndicators plotSize={plotSize} padding={padding} isMobile={isMobile} />
      </svg>
    </div>
  );
};

interface ScaleIndicatorsProps {
  plotSize: number;
  padding: number;
  isMobile: boolean;
}

const SCALE_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;
const TICK_LENGTH = 5;

const ScaleIndicators = ({ plotSize, padding, isMobile }: ScaleIndicatorsProps) => (
  <>
    {SCALE_TICKS.map((tick) => (
        <g key={`scale-${String(tick)}`}>
          <line
            x1={padding + tick * plotSize}
            y1={plotSize + padding}
            x2={padding + tick * plotSize}
            y2={plotSize + padding + TICK_LENGTH}
            stroke="var(--mantine-color-gray-6)"
            strokeWidth="1"
          />
          <text
            x={padding + tick * plotSize}
            y={plotSize + padding + (isMobile ? 15 : 18)}
            textAnchor="middle"
            style={{
              fontSize: isMobile ? "9px" : "10px",
              fill: "var(--mantine-color-gray-6)",
            }}
          >
            {(tick * 100).toFixed(0)}%
          </text>
          <line
            x1={padding - TICK_LENGTH}
            y1={padding + plotSize - tick * plotSize}
            x2={padding}
            y2={padding + plotSize - tick * plotSize}
            stroke="var(--mantine-color-gray-6)"
            strokeWidth="1"
          />
          <text
            x={padding - (isMobile ? 10 : 12)}
            y={padding + plotSize - tick * plotSize + 3}
            textAnchor="end"
            style={{
              fontSize: isMobile ? "9px" : "10px",
              fill: "var(--mantine-color-gray-6)",
            }}
          >
            {(tick * 100).toFixed(0)}%
          </text>
        </g>
      ))}
  </>
);
