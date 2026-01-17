/**
 * Types for Responsive Chart Components
 *
 * Shared type definitions for touch-friendly, accessible chart components
 * that adapt to different screen sizes and device capabilities.
 */

import type { ComparisonResults } from "@bibgraph/utils";

/**
 * Common props for all responsive chart components
 */
export interface ResponsiveChartProps {
  comparisonResults: ComparisonResults[];
  title: string;
  description?: string;
  height?: number;
  mobileHeight?: number;
  ariaLabel?: string;
}

/**
 * Processed dataset performance data for bar charts
 */
export interface DatasetPerformanceData {
  datasetName: string;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  additionalPapers: number;
  totalFound: number;
  totalGroundTruth: number;
}

/**
 * Processed scatter plot point data
 */
export interface ScatterPlotPoint {
  id: number;
  datasetName: string;
  precision: number;
  recall: number;
  f1Score: number;
  totalPapers: number;
}

/**
 * Focused bar state for performance chart
 */
export interface FocusedBarState {
  dataset: string;
  metric: string;
}

/**
 * Metric types available in performance charts
 */
export type PerformanceMetric = "precision" | "recall" | "f1Score";

/**
 * Metrics array for iteration
 */
export const PERFORMANCE_METRICS: PerformanceMetric[] = [
  "precision",
  "recall",
  "f1Score",
];

/**
 * Chart layout constants
 */
export const CHART_CONSTANTS = {
  /** Default chart height in pixels */
  DEFAULT_HEIGHT: 400,
  /** Default mobile chart height in pixels */
  DEFAULT_MOBILE_HEIGHT: 300,
  /** Default scatter plot height in pixels */
  DEFAULT_SCATTER_HEIGHT: 350,
  /** Desktop plot size in pixels */
  PLOT_SIZE_DESKTOP: 300,
  /** Mobile plot size in pixels */
  PLOT_SIZE_MOBILE: 250,
  /** Desktop padding in pixels */
  PADDING_DESKTOP: 40,
  /** Mobile padding in pixels */
  PADDING_MOBILE: 30,
  /** Touch target radius on mobile */
  TOUCH_RADIUS_MOBILE: 20,
  /** Touch target radius on desktop */
  TOUCH_RADIUS_DESKTOP: 10,
  /** Minimum scroll width for mobile charts */
  MIN_SCROLL_WIDTH: 600,
  /** Scroll amount multiplier for swipe gestures */
  SWIPE_SCROLL_MULTIPLIER: 200,
  /** Maximum zoom level */
  MAX_ZOOM: 3,
  /** Minimum zoom level */
  MIN_ZOOM: 1,
  /** Zoom toggle target */
  ZOOM_TOGGLE_TARGET: 1.5,
} as const;

/**
 * Bar color configuration
 */
export const BAR_COLORS = {
  precision: {
    normal: "var(--mantine-color-blue-5)",
    highlighted: "var(--mantine-color-blue-6)",
  },
  recall: {
    normal: "var(--mantine-color-green-5)",
    highlighted: "var(--mantine-color-green-6)",
  },
  f1Score: {
    normal: "var(--mantine-color-violet-5)",
    highlighted: "var(--mantine-color-violet-6)",
  },
  default: {
    normal: "var(--mantine-color-gray-5)",
    highlighted: "var(--mantine-color-gray-6)",
  },
} as const;

/**
 * Gets the appropriate bar color for a given metric
 * @param metric - The metric name (precision, recall, f1Score)
 * @param isHighlighted - Whether the bar is currently highlighted
 * @returns The CSS color variable for the bar
 */
export const getBarColor = (metric: string, isHighlighted: boolean): string => {
  const colorConfig = BAR_COLORS[metric as keyof typeof BAR_COLORS] ?? BAR_COLORS.default;
  return isHighlighted ? colorConfig.highlighted : colorConfig.normal;
};
