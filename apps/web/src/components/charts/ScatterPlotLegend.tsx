/**
 * Scatter Plot Legend Component
 *
 * Displays a legend for scatter plot data points with selection highlighting.
 * Adapts to mobile and desktop viewports.
 */

import type { ScatterPlotPoint } from "./responsive-chart.types";

interface ScatterPlotLegendProps {
  /** Data points to display in legend */
  plotData: ScatterPlotPoint[];
  /** Whether the viewport is mobile-sized */
  isMobile: boolean;
  /** Currently selected point ID, or null if none selected */
  selectedPoint: number | null;
}

/** Maximum height for legend scroll container */
const LEGEND_MAX_HEIGHT = 200;

/**
 * Legend component showing dataset names with selection state
 * @param root0
 * @param root0.plotData
 * @param root0.isMobile
 * @param root0.selectedPoint
 */
export const ScatterPlotLegend = ({
  plotData,
  isMobile,
  selectedPoint,
}: ScatterPlotLegendProps) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxWidth: isMobile ? "150px" : "200px",
      flexShrink: 0,
    }}
  >
    <h4
      style={{
        fontSize: isMobile ? "12px" : "14px",
        fontWeight: "600",
        color: "var(--mantine-color-text)",
        marginBottom: "8px",
      }}
    >
      Datasets
    </h4>
    <div
      style={{
        maxHeight: `${LEGEND_MAX_HEIGHT}px`,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {plotData.map((point) => (
        <LegendItem
          key={point.datasetName || `point-${point.id}`}
          datasetName={point.datasetName}
          isMobile={isMobile}
          isSelected={selectedPoint === point.id}
        />
      ))}
    </div>
  </div>
);

interface LegendItemProps {
  datasetName: string;
  isMobile: boolean;
  isSelected: boolean;
}

const LegendItem = ({ datasetName, isMobile, isSelected }: LegendItemProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: isMobile ? "10px" : "12px",
      color: isSelected
        ? "var(--mantine-color-text)"
        : "var(--mantine-color-gray-6)",
      padding: isMobile ? "4px 0" : "2px 0",
    }}
  >
    <div
      style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: isSelected
          ? "var(--mantine-color-blue-6)"
          : "var(--mantine-color-blue-5)",
        border: "1px solid var(--mantine-color-blue-7)",
        flexShrink: 0,
      }}
    />
    <span
      style={{
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {datasetName}
    </span>
  </div>
);
