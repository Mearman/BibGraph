/**
 * Mobile Selection Panel Component
 *
 * Displays selection details and interaction hints on mobile devices.
 * Used by chart components to show selected data point information.
 */

import type { ReactNode } from "react";

// Converts a 0-1 ratio (zoom level, precision, recall, F1 score) to a percentage for display.
const PERCENTAGE_MULTIPLIER = 100;

interface MobileSelectionPanelProperties {
  /**
  Content to display in the panel
   */
  children: ReactNode;
}

/**
 * Panel component for displaying selection details on mobile
 */
export const MobileSelectionPanel = ({ children }: MobileSelectionPanelProperties) => (
  <div
    style={{
      marginTop: "16px",
      padding: "12px",
      backgroundColor: "var(--mantine-color-blue-0)",
      border: "1px solid var(--mantine-color-blue-3)",
      borderRadius: "8px",
      fontSize: "14px",
    }}
    role="status"
    aria-live="polite"
  >
    {children}
  </div>
);

interface PerformanceChartHintsProperties {
  /**
  Selected dataset name
   */
  datasetName: string;
  /**
  Current zoom level
   */
  zoomLevel: number;
}

/**
 * Mobile interaction hints for performance bar chart
 */
export const PerformanceChartHints = ({
  datasetName,
  zoomLevel,
}: PerformanceChartHintsProperties) => (
  <MobileSelectionPanel>
    <strong>Selected:</strong> {datasetName}
    <br />
    <div
      style={{
        fontSize: "12px",
        color: "var(--mantine-color-dimmed)",
        marginTop: "8px",
      }}
    >
      <div>Tap bars to hear values</div>
      <div>Swipe to scroll horizontally</div>
      <div>Double-tap to zoom in/out</div>
      <div>Pinch to zoom (scale: {Math.round(zoomLevel * PERCENTAGE_MULTIPLIER)}%)</div>
    </div>
  </MobileSelectionPanel>
);

interface ScatterPlotDetailsProperties {
  /**
  Dataset name
   */
  datasetName: string;
  /**
  Precision value (0-1)
   */
  precision: number;
  /**
  Recall value (0-1)
   */
  recall: number;
  /**
  F1 score value (0-1)
   */
  f1Score: number;
}

/**
 * Mobile selection details for scatter plot
 */
export const ScatterPlotDetails = ({
  datasetName,
  precision,
  recall,
  f1Score,
}: ScatterPlotDetailsProperties) => (
  <MobileSelectionPanel>
    <strong>{datasetName}</strong>
    <br />
    Precision: {(precision * PERCENTAGE_MULTIPLIER).toFixed(1)}%
    <br />
    Recall: {(recall * PERCENTAGE_MULTIPLIER).toFixed(1)}%
    <br />
    F1-Score: {(f1Score * PERCENTAGE_MULTIPLIER).toFixed(1)}%
  </MobileSelectionPanel>
);
