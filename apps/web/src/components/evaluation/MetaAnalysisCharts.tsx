/**
 * Meta-Analysis Visualization Components for STAR Evaluation
 * Advanced charts and visualizations for thesis-ready presentation
 * Enhanced with responsive design and accessibility features
 */

import type { ComparisonResults } from "@bibgraph/utils";
import { useMemo } from "react";

import { ResponsivePerformanceChart, ResponsiveScatterPlot } from "@/components/charts/ResponsiveChart";

// Common color constants - using Mantine CSS custom properties for theme-agnostic colors
const COLOR_GRAY_500 = "var(--mantine-color-dimmed)";
const COLOR_GRAY_100 = "var(--mantine-color-gray-1)";
const COLOR_WHITE = "var(--mantine-color-body)";
const COLOR_BLUE_500 = "var(--mantine-primary-color-filled)";
const COLOR_GREEN_500 = "var(--mantine-color-green-6)";
const COLOR_RED_500 = "var(--mantine-color-red-6)";
const COLOR_AMBER_500 = "var(--mantine-color-yellow-6)";
const COLOR_VIOLET_500 = "var(--mantine-color-violet-5)";

// Converts a 0-1 ratio to a percentage value for display.
const PERCENTAGE_MULTIPLIER = 100;

interface MetaAnalysisChartsProperties {
  comparisonResults: ComparisonResults[];
}

/**
 * Performance Comparison Bar Chart
 * Enhanced responsive version with touch interactions and accessibility
 */
export const PerformanceComparisonChart = ({
  comparisonResults,
}: MetaAnalysisChartsProperties) => {
  return (
    <ResponsivePerformanceChart
      comparisonResults={comparisonResults}
      title="Performance Comparison Across Datasets"
      description="Precision, recall, and F1-score comparison across all datasets"
      ariaLabel="Performance chart showing precision, recall, and F1-score for each dataset"
    />
  );
};

/**
 * Precision-Recall Scatter Plot
 * Enhanced responsive version with touch interactions and accessibility
 */
export const PrecisionRecallScatterPlot = ({
  comparisonResults,
}: MetaAnalysisChartsProperties) => {
  return (
    <ResponsiveScatterPlot
      comparisonResults={comparisonResults}
      title="Precision-Recall Trade-off Analysis"
      description="Shows the precision-recall trade-off across datasets with dataset size indicated by circle size"
      ariaLabel="Scatter plot showing precision vs recall trade-off analysis"
    />
  );
};

/**
 * Confusion Matrix Heatmap
 * Visual representation of true/false positives/negatives
 */
export const ConfusionMatrixHeatmap = ({
  comparisonResults,
}: MetaAnalysisChartsProperties) => {
  const aggregatedData = useMemo(() => {
    if (comparisonResults.length === 0) return null;

    const totals = comparisonResults.reduce(
      (accumulator, result) => ({
        truePositives: accumulator.truePositives + result.truePositives.length,
        falsePositives: accumulator.falsePositives + result.falsePositives.length,
        falseNegatives: accumulator.falseNegatives + result.falseNegatives.length,
        trueNegatives: accumulator.trueNegatives, // This would need more sophisticated calculation
      }),
      {
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        trueNegatives: 0,
      },
    );

    const total =
      totals.truePositives + totals.falsePositives + totals.falseNegatives;

    return {
      ...totals,
      total,
      tpRate: total > 0 ? totals.truePositives / total : 0,
      fpRate: total > 0 ? totals.falsePositives / total : 0,
      fnRate: total > 0 ? totals.falseNegatives / total : 0,
    };
  }, [comparisonResults]);

  if (!aggregatedData) {
    return (
      <div
        style={{
          backgroundColor: "var(--mantine-color-gray-1)",
          border: "1px solid var(--mantine-color-gray-3)",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: COLOR_GRAY_500 }}>
          No comparison results available for confusion matrix
        </p>
      </div>
    );
  }

  const cellSize = 80;

  return (
    <div
      style={{
        backgroundColor: "var(--mantine-color-body)",
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "var(--mantine-color-text)",
          marginBottom: "16px",
        }}
      >
        Aggregated Confusion Matrix
      </h3>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px",
        }}
      >
        {/* Matrix */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Column headers */}
          <div style={{ display: "flex", marginBottom: "8px" }}>
            <div style={{ width: cellSize }} />
            <div
              style={{
                width: cellSize,
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--mantine-color-text)",
              }}
            >
              Relevant
            </div>
            <div
              style={{
                width: cellSize,
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--mantine-color-text)",
              }}
            >
              Not Relevant
            </div>
          </div>

          {/* Retrieved row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: cellSize,
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--mantine-color-text)",
                transform: "rotate(-90deg)",
              }}
            >
              Retrieved
            </div>
            {/* True Positives */}
            <div
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: COLOR_GREEN_500,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--mantine-color-green-7)",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <div>TP</div>
              <div>{aggregatedData.truePositives}</div>
            </div>
            {/* False Positives */}
            <div
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: COLOR_RED_500,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--mantine-color-red-7)",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <div>FP</div>
              <div>{aggregatedData.falsePositives}</div>
            </div>
          </div>

          {/* Not Retrieved row */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: cellSize,
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--mantine-color-text)",
                transform: "rotate(-90deg)",
              }}
            >
              Not Retrieved
            </div>
            {/* False Negatives */}
            <div
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: COLOR_AMBER_500,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--mantine-color-yellow-7)",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <div>FN</div>
              <div>{aggregatedData.falseNegatives}</div>
            </div>
            {/* True Negatives (not applicable for our use case) */}
            <div
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: COLOR_GRAY_500,
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--mantine-color-dimmed)",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <div>TN</div>
              <div>N/A</div>
            </div>
          </div>
        </div>

        {/* Legend and metrics */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "200px",
          }}
        >
          <div>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--mantine-color-text)",
                marginBottom: "8px",
              }}
            >
              Legend
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12px",
              }}
            >
              <div style={{ color: COLOR_GREEN_500 }}>
                TP: Correctly retrieved papers
              </div>
              <div style={{ color: COLOR_RED_500 }}>
                FP: Incorrectly retrieved papers
              </div>
              <div style={{ color: COLOR_AMBER_500 }}>
                FN: Missed relevant papers
              </div>
              <div style={{ color: COLOR_GRAY_500 }}>
                TN: Not applicable in IR context
              </div>
            </div>
          </div>

          <div>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--mantine-color-text)",
                marginBottom: "8px",
              }}
            >
              Summary
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12px",
              }}
            >
              <div>Total Papers: {aggregatedData.total}</div>
              <div>
                Precision:{" "}
                {(
                  (aggregatedData.truePositives /
                    (aggregatedData.truePositives +
                      aggregatedData.falsePositives)) *
                  PERCENTAGE_MULTIPLIER
                ).toFixed(1)}
                %
              </div>
              <div>
                Recall:{" "}
                {(
                  (aggregatedData.truePositives /
                    (aggregatedData.truePositives +
                      aggregatedData.falseNegatives)) *
                  PERCENTAGE_MULTIPLIER
                ).toFixed(1)}
                %
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dataset Statistics Overview
 * Shows key statistics about the datasets being compared
 */
export const DatasetStatisticsOverview = ({
  comparisonResults,
}: MetaAnalysisChartsProperties) => {
  const statisticsData = useMemo(() => {
    if (comparisonResults.length === 0) return null;

    return comparisonResults.map((result) => ({
      name: result.dataset.name,
      originalPapers: result.dataset.originalPaperCount,
      includedPapers: result.dataset.includedPapers.length,
      excludedPapers: result.dataset.excludedPapers.length,
      academicExplorerFound: result.bibGraphResults.length,
      coverage:
        result.bibGraphResults.length /
        result.dataset.originalPaperCount,
      precision: result.precision,
      recall: result.recall,
      f1Score: result.f1Score,
      additionalPapers: result.additionalPapersFound.length,
    }));
  }, [comparisonResults]);

  if (!statisticsData) {
    return (
      <div
        style={{
          backgroundColor: "var(--mantine-color-gray-1)",
          border: "1px solid var(--mantine-color-gray-3)",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: COLOR_GRAY_500 }}>
          No comparison results available for statistics overview
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--mantine-color-body)",
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "var(--mantine-color-text)",
          marginBottom: "16px",
        }}
      >
        Dataset Statistics Overview
      </h3>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                Dataset
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                Original
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                Included
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                AE Found
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                Coverage
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                Precision
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                Recall
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                F1-Score
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--mantine-color-gray-3)",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--mantine-color-text)",
                }}
              >
                Additional
              </th>
            </tr>
          </thead>
          <tbody>
            {statisticsData.map((row, index) => (
              <tr
                key={row.name || `row-${String(index)}`}
                style={{
                  backgroundColor:
                    index % 2 === 0 ? COLOR_WHITE : COLOR_GRAY_100,
                }}
              >
                <td
                  style={{
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: "var(--mantine-color-text)",
                    maxWidth: "150px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.name}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_GRAY_500,
                  }}
                >
                  {row.originalPapers.toLocaleString()}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_GRAY_500,
                  }}
                >
                  {row.includedPapers.toLocaleString()}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: "var(--mantine-color-text)",
                    fontWeight: "600",
                  }}
                >
                  {row.academicExplorerFound.toLocaleString()}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: row.coverage > 1 ? COLOR_AMBER_500 : COLOR_GRAY_500,
                  }}
                >
                  {(row.coverage * PERCENTAGE_MULTIPLIER).toFixed(1)}%
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_BLUE_500,
                    fontWeight: "600",
                  }}
                >
                  {(row.precision * PERCENTAGE_MULTIPLIER).toFixed(1)}%
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_GREEN_500,
                    fontWeight: "600",
                  }}
                >
                  {(row.recall * PERCENTAGE_MULTIPLIER).toFixed(1)}%
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_VIOLET_500,
                    fontWeight: "600",
                  }}
                >
                  {(row.f1Score * PERCENTAGE_MULTIPLIER).toFixed(1)}%
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 8px",
                    fontSize: "14px",
                    color: COLOR_AMBER_500,
                    fontWeight: "600",
                  }}
                >
                  +{row.additionalPapers}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "16px",
          fontSize: "12px",
          color: COLOR_GRAY_500,
          fontStyle: "italic",
        }}
      >
        AE Found = BibGraph Found, Coverage = (AE Found / Original) ×
        100%
      </div>
    </div>
  );
};
