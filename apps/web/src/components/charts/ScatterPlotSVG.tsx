/**
 * SVG rendering for the responsive scatter plot: axis ticks/labels and plotted points. Split out of ResponsiveChart.tsx to keep that file within the project's file-length limit.
 */

import { type CSSProperties } from "react";

import { announceToScreenReader } from "@/utils/accessibility";

import type { ScatterPlotPoint } from "./responsive-chart.types";

// Converts a 0-1 ratio (precision, recall) to a percentage for display.
const PERCENTAGE_MULTIPLIER = 100;
// Scatter-plot axis tick label offsets (px), mobile vs desktop.
const MOBILE_AXIS_LABEL_OFFSET = 15;
const DESKTOP_AXIS_LABEL_OFFSET = 18;
const MOBILE_Y_AXIS_LABEL_OFFSET = 10;
const DESKTOP_Y_AXIS_LABEL_OFFSET = 12;
const Y_AXIS_LABEL_NUDGE = 3;
// Space (px) between the plot area and its axis title, mobile vs desktop.
const MOBILE_AXIS_TITLE_OFFSET = 25;
const DESKTOP_AXIS_TITLE_OFFSET = 30;
// Fill opacity for a scatter-plot point that is not the selected one.
const UNSELECTED_POINT_FILL_OPACITY = 0.7;
// Distance (px) of the rotated "Precision" axis title from the plot's left edge.
const Y_AXIS_TITLE_OFFSET = 15;
// Multiplier converting a single-sided padding value into the total border padding (both sides).
const PADDING_SIDES = 2;
// Grid pattern cell size (px).
const GRID_CELL_SIZE = 30;

interface ScaleIndicatorsProperties {
  plotSize: number;
  padding: number;
  isMobile: boolean;
}

// Axis scale ticks at every quarter from 0 to 1 (0%, 25%, 50%, 75%, 100%).
const SCALE_TICK_COUNT = 5;
const SCALE_TICKS: readonly number[] = Array.from({ length: SCALE_TICK_COUNT }, (_, index) => index / (SCALE_TICK_COUNT - 1));
const axisTickStyle = (isMobile: boolean): CSSProperties => ({
	fontSize: isMobile ? "9px" : "10px",
	fill: "var(--mantine-color-gray-6)",
});

const TICK_LENGTH = 5;

const ScaleIndicators = ({ plotSize, padding, isMobile }: ScaleIndicatorsProperties) => (
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
            y={plotSize + padding + (isMobile ? MOBILE_AXIS_LABEL_OFFSET : DESKTOP_AXIS_LABEL_OFFSET)}
            textAnchor="middle"
            style={axisTickStyle(isMobile)}
          >
            {(tick * PERCENTAGE_MULTIPLIER).toFixed(0)}%
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
            x={padding - (isMobile ? MOBILE_Y_AXIS_LABEL_OFFSET : DESKTOP_Y_AXIS_LABEL_OFFSET)}
            y={padding + plotSize - tick * plotSize + Y_AXIS_LABEL_NUDGE}
            textAnchor="end"
            style={axisTickStyle(isMobile)}
          >
            {(tick * PERCENTAGE_MULTIPLIER).toFixed(0)}%
          </text>
        </g>
      ))}
  </>
);

export interface ScatterPlotSVGProperties {
  plotData: ScatterPlotPoint[];
  plotSize: number;
  padding: number;
  touchRadius: number;
  isMobile: boolean;
  selectedPoint: number | null;
  onSelectPoint: (id: number | null) => void;
}

export const ScatterPlotSVG = ({
  plotData,
  plotSize,
  padding,
  touchRadius,
  isMobile,
  selectedPoint,
  onSelectPoint,
}: ScatterPlotSVGProperties) => {
  const POINT_SIZE_DIVISOR = 20;
  const MIN_RADIUS_MOBILE = 8;
  const MIN_RADIUS_DESKTOP = 4;
  const MAX_RADIUS_MOBILE = 16;
  const MAX_RADIUS_DESKTOP = 12;

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <svg
        width={plotSize + padding * PADDING_SIDES}
        height={plotSize + padding * PADDING_SIDES}
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
            width={GRID_CELL_SIZE}
            height={GRID_CELL_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${String(GRID_CELL_SIZE)} 0 L 0 0 0 ${String(GRID_CELL_SIZE)}`}
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
                key={`hit-${String(point.id)}`}
                cx={x}
                cy={y}
                r={touchRadius}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onTouchStart={() => { onSelectPoint(point.id); }}
                onKeyDown={(e) => {
                  if (!(e.key === "Enter" || e.key === " ")) {
                  	return;
                  }

                  e.preventDefault();
                  onSelectPoint(point.id);
                  announceToScreenReader(
                    `${point.datasetName}: Precision ${(point.precision * PERCENTAGE_MULTIPLIER).toFixed(1)}%, Recall ${(point.recall * PERCENTAGE_MULTIPLIER).toFixed(1)}%, F1 ${(point.f1Score * PERCENTAGE_MULTIPLIER).toFixed(1)}%`
                  );
                }}
                tabIndex={0}
                role="button"
                aria-label={`${point.datasetName}: Precision ${(point.precision * PERCENTAGE_MULTIPLIER).toFixed(1)}%, Recall ${(point.recall * PERCENTAGE_MULTIPLIER).toFixed(1)}%`}
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
                fillOpacity={isSelected ? 1 : UNSELECTED_POINT_FILL_OPACITY}
                stroke="var(--mantine-color-blue-7)"
                strokeWidth={
                  isSelected ? SELECTED_STROKE_WIDTH : NORMAL_STROKE_WIDTH
                }
                style={{
                  cursor: "pointer",
                  transition: isMobile ? "none" : "all 0.2s ease",
                }}
                onMouseEnter={
                  !isMobile ? () => { onSelectPoint(point.id); } : undefined
                }
                onMouseLeave={!isMobile ? () => { onSelectPoint(null); } : undefined}
              />
              <title>
                {point.datasetName}: Precision=
                {(point.precision * PERCENTAGE_MULTIPLIER).toFixed(1)}%, Recall=
                {(point.recall * PERCENTAGE_MULTIPLIER).toFixed(1)}%, F1=
                {(point.f1Score * PERCENTAGE_MULTIPLIER).toFixed(1)}%
              </title>
            </g>
          );
        })}

        <text
          x={plotSize / PADDING_SIDES + padding}
          y={plotSize + padding + (isMobile ? MOBILE_AXIS_TITLE_OFFSET : DESKTOP_AXIS_TITLE_OFFSET)}
          textAnchor="middle"
          style={axisTickStyle(isMobile)}
        >
          Recall
        </text>
        <text
          x={Y_AXIS_TITLE_OFFSET}
          y={plotSize / PADDING_SIDES + padding}
          textAnchor="middle"
          transform={`rotate(-90 ${String(Y_AXIS_TITLE_OFFSET)} ${String(plotSize / PADDING_SIDES + padding)})`}
          style={axisTickStyle(isMobile)}
        >
          Precision
        </text>

        <ScaleIndicators plotSize={plotSize} padding={padding} isMobile={isMobile} />
      </svg>
    </div>
  );
};
