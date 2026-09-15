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
  PerformanceMetric,
  ResponsiveChartProps as ResponsiveChartProperties,
} from "./responsive-chart.types";
import {
  CHART_CONSTANTS,
  getBarColor,
  PERFORMANCE_METRICS,
} from "./responsive-chart.types";
import { ScatterPlotLegend } from "./ScatterPlotLegend";
import { ScatterPlotSVG } from "./ScatterPlotSVG";
import { usePerformanceChartData, useScatterPlotData } from "./use-chart-data";
import { useMobileDetection } from "./use-mobile-detection";

// Converts a 0-1 ratio (precision, recall, zoom level, etc.) to a percentage for display.
const PERCENTAGE_MULTIPLIER = 100;
// Vertical space reserved for the header/controls above the scrollable bar-chart area.
const MOBILE_CHART_HEADER_OFFSET = 80;
const DESKTOP_CHART_HEADER_OFFSET = 100;
// CSS font-weight values used for selected/focused metric labels.
const FONT_WEIGHT_NORMAL = 400;
const FONT_WEIGHT_MEDIUM = 500;
const FONT_WEIGHT_SEMIBOLD = 600;

interface MetricBarProperties {
  metric: PerformanceMetric;
  value: number;
  percentage: number;
  isMobile: boolean;
  isFocused: boolean;
  isSelected: boolean;
  datasetName: string;
  onTouchStart: (datasetName: string, metric: PerformanceMetric) => void;
  onKeyDown: (
    event: React.KeyboardEvent,
    datasetName: string,
    metric: PerformanceMetric
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
}: MetricBarProperties) => {
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
          fontWeight: isSelected ? FONT_WEIGHT_MEDIUM : FONT_WEIGHT_NORMAL,
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
            width: `${String(percentage)}%`,
            height: "100%",
            backgroundColor: getBarColor(metric, isFocused),
            borderRadius: isMobile ? "6px" : "8px",
            transition: isMobile ? "none" : "all 0.2s ease",
            cursor: isMobile ? "pointer" : "default",
            transform: isFocused ? "scaleY(1.1)" : "scaleY(1)",
            transformOrigin: "bottom",
          }}
          onTouchStart={() => { onTouchStart(datasetName, metric); }}
          onKeyDown={(e) => { onKeyDown(e, datasetName, metric); }}
          tabIndex={0}
          role="button"
          aria-label={`${datasetName} ${metric}: ${(value * PERCENTAGE_MULTIPLIER).toFixed(1)}%`}
          aria-pressed={isFocused}
        />
      </div>

      <div
        style={{
          width: isMobile ? "40px" : "50px",
          fontSize: isMobile ? "10px" : "12px",
          color: "var(--mantine-color-text)",
          fontWeight: isFocused ? FONT_WEIGHT_SEMIBOLD : FONT_WEIGHT_MEDIUM,
          textAlign: "right",
        }}
      >
        {(value * PERCENTAGE_MULTIPLIER).toFixed(1)}%
      </div>
    </div>
  );
};

interface DatasetBarsProperties {
  dataset: DatasetPerformanceData;
  maxValue: number;
  isMobile: boolean;
  focusedBar: FocusedBarState | null;
  selectedDataset: string | null;
  onTouchStart: (datasetName: string, metric: PerformanceMetric) => void;
  onKeyDown: (
    event: React.KeyboardEvent,
    datasetName: string,
    metric: PerformanceMetric
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
}: DatasetBarsProperties) => {
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
          const percentage = (value / maxValue) * PERCENTAGE_MULTIPLIER;
          const isFocused =
            focusedBar?.dataset === dataset.datasetName &&
            focusedBar.metric === metric;

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

/**
 * Touch-friendly bar chart component with responsive design
 */
export const ResponsivePerformanceChart = ({
  comparisonResults,
  title,
  description,
  height = CHART_CONSTANTS.DEFAULT_HEIGHT,
  mobileHeight = CHART_CONSTANTS.DEFAULT_MOBILE_HEIGHT,
  ariaLabel,
}: ResponsiveChartProperties) => {
  const isMobile = useMobileDetection();
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [focusedBar, setFocusedBar] = useState<FocusedBarState | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { chartData, maxValue } = usePerformanceChartData(comparisonResults);
  const actualHeight = isMobile ? mobileHeight : height;

  const handleTouchStart = useCallback(
    (datasetName: string, metric: PerformanceMetric) => {
      if (!isMobile) {
      	return;
      }

      setSelectedDataset(datasetName);
      setFocusedBar({ dataset: datasetName, metric });
      const dataset = chartData.find((d) => d.datasetName === datasetName);
      const value = ((dataset?.[metric] ?? 0) * PERCENTAGE_MULTIPLIER).toFixed(1);
      announceToScreenReader(`${datasetName} ${metric}: ${value}%`);
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
        if (!isMobile) {
        	return;
        }

        setZoomLevel((previous) =>
          previous === CHART_CONSTANTS.MIN_ZOOM
            ? CHART_CONSTANTS.ZOOM_TOGGLE_TARGET
            : CHART_CONSTANTS.MIN_ZOOM
        );
        announceToScreenReader(
          `Zoom ${zoomLevel === CHART_CONSTANTS.MIN_ZOOM ? "in" : "out"}`
        );
      },
      onPinch: (scale) => {
        if (!isMobile) {
        	return;
        }

        setZoomLevel(
          Math.max(
            CHART_CONSTANTS.MIN_ZOOM,
            Math.min(CHART_CONSTANTS.MAX_ZOOM, scale)
          )
        );
        announceToScreenReader(`Zoom level: ${String(Math.round(scale * PERCENTAGE_MULTIPLIER))}%`);
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
    (event: React.KeyboardEvent, datasetName: string, metric: PerformanceMetric) => {
      if (!(event.key === "Enter" || event.key === " ")) {
      	return;
      }

      event.preventDefault();
      setSelectedDataset(datasetName);
      setFocusedBar({ dataset: datasetName, metric });
      const dataset = chartData.find((d) => d.datasetName === datasetName);
      const value = ((dataset?.[metric] ?? 0) * PERCENTAGE_MULTIPLIER).toFixed(1);
      announceToScreenReader(`${datasetName} ${metric}: ${value}%`);
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
        ariaLabel !== undefined && ariaLabel !== ""
          ? ariaLabel
          : `Performance chart showing ${String(chartData.length)} datasets`
      }
    >
      <ChartHeader title={title} description={description} isMobile={isMobile} />

      <div
        ref={scrollContainerRef}
        style={{
          height: `${String(actualHeight - (isMobile ? MOBILE_CHART_HEADER_OFFSET : DESKTOP_CHART_HEADER_OFFSET))}px`,
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}
        {...touchHandlers.handlers}
      >
        <div
          style={{
            minWidth: isMobile
              ? `${String(CHART_CONSTANTS.MIN_SCROLL_WIDTH * zoomLevel)}px`
              : "auto",
            transform: isMobile ? `scale(${String(zoomLevel)})` : "none",
            transformOrigin: "top left",
            transition: "transform 0.2s ease",
          }}
        >
          {chartData.map((dataset, index) => (
            <DatasetBars
              key={dataset.datasetName || `dataset-${String(index)}`}
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

      {isMobile && selectedDataset !== null && (
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


/**
 * Responsive scatter plot with touch and keyboard support
 */
export const ResponsiveScatterPlot = ({
  comparisonResults,
  title,
  description,
  height: _height = CHART_CONSTANTS.DEFAULT_HEIGHT,
  mobileHeight = CHART_CONSTANTS.DEFAULT_SCATTER_HEIGHT,
  ariaLabel,
}: ResponsiveChartProperties) => {
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
        ariaLabel !== undefined && ariaLabel !== ""
          ? ariaLabel
          : `Precision-Recall scatter plot with ${String(plotData.length)} data points`
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

