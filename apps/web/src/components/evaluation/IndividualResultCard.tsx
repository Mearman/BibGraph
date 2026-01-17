/**
 * Individual result card component for STAR comparison results
 */

import { logger } from "@bibgraph/utils/logger";
import React from "react";

import type { ComparisonRun, LegacyResult, NormalizedMetrics } from "@/types/comparison";

import { formatPercent, formatTime, getExecutionTime,getResultMetrics } from "./comparison-utils";

interface IndividualResultCardProps {
  result: ComparisonRun | LegacyResult;
  isLast: boolean;
}

interface MetricDisplayProps {
  value: string | number;
  label: string;
  color: string;
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({ value, label, color }) => (
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        fontSize: "20px",
        fontWeight: "bold",
        color,
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
      {label}
    </div>
  </div>
);

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "success";
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  variant = "default",
}) => {
  const getBackground = (): string => {
    switch (variant) {
      case "primary":
        return "var(--mantine-primary-color-filled)";
      case "success":
        return "var(--mantine-color-green-6)";
      default:
        return "var(--mantine-color-gray-2)";
    }
  };

  const getColor = (): string => {
    switch (variant) {
      case "primary":
      case "success":
        return "var(--mantine-primary-color-contrast)";
      default:
        return "var(--mantine-color-gray-7)";
    }
  };

  return (
    <button
      style={{
        backgroundColor: getBackground(),
        color: getColor(),
        padding: "8px 12px",
        borderRadius: "6px",
        border: "none",
        fontSize: "13px",
        fontWeight: "500",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

const MetricsGrid: React.FC<{ metrics: NormalizedMetrics }> = ({ metrics }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "16px",
      marginBottom: "16px",
    }}
  >
    <MetricDisplay
      value={formatPercent(metrics.precision)}
      label="Precision"
      color="var(--mantine-primary-color-filled)"
    />
    <MetricDisplay
      value={formatPercent(metrics.recall)}
      label="Recall"
      color="var(--mantine-color-green-6)"
    />
    <MetricDisplay
      value={formatPercent(metrics.f1Score)}
      label="F1-Score"
      color="var(--mantine-color-violet-5)"
    />
    <MetricDisplay
      value={metrics.truePositives}
      label="True Positives"
      color="var(--mantine-color-green-6)"
    />
    <MetricDisplay
      value={metrics.falsePositives}
      label="False Positives"
      color="var(--mantine-color-red-6)"
    />
    <MetricDisplay
      value={metrics.falseNegatives}
      label="False Negatives"
      color="var(--mantine-color-yellow-7)"
    />
    <MetricDisplay
      value={`+${metrics.additionalPapersFound}`}
      label="Additional Found"
      color="var(--mantine-color-yellow-6)"
    />
  </div>
);

export const IndividualResultCard: React.FC<IndividualResultCardProps> = ({
  result,
  isLast,
}) => {
  const metrics = getResultMetrics(result);
  if (!metrics) return null;

  const executionTime = getExecutionTime(result);

  const handleViewBreakdown = () => {
    logger.debug(
      "ui",
      "View detailed breakdown clicked",
      { resultId: result.id },
      "ComparisonResults",
    );
  };

  const handleExportResults = () => {
    logger.debug(
      "ui",
      "Export results clicked",
      { resultId: result.id },
      "ComparisonResults",
    );
  };

  const handleViewAdditionalPapers = () => {
    logger.debug(
      "ui",
      "View additional papers clicked",
      { resultId: result.id },
      "ComparisonResults",
    );
  };

  return (
    <div
      style={{
        padding: "20px",
        borderBottom: isLast ? "none" : "1px solid var(--mantine-color-default-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "var(--mantine-color-text)",
              marginBottom: "4px",
            }}
          >
            {result.datasetName}
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--mantine-color-dimmed)",
              marginBottom: "8px",
            }}
          >
            Query: &quot;{result.searchCriteria.query}&quot;
          </p>
          <p style={{ fontSize: "12px", color: "var(--mantine-color-gray-4)" }}>
            Completed on {result.runDate.toLocaleDateString()} •{" "}
            {formatTime(executionTime)} •{" "}
            {"apiCalls" in result && typeof result.apiCalls === "number"
              ? result.apiCalls
              : "N/A"}{" "}
            API calls
          </p>
        </div>

        <div
          style={{
            backgroundColor:
              result.status === "completed"
                ? "rgba(var(--mantine-color-green-6-rgb), 0.1)"
                : "rgba(var(--mantine-color-yellow-6-rgb), 0.1)",
            color:
              result.status === "completed"
                ? "var(--mantine-color-green-7)"
                : "var(--mantine-color-yellow-7)",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "capitalize",
          }}
        >
          {result.status}
        </div>
      </div>

      <MetricsGrid metrics={metrics} />

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <ActionButton
          label="View Breakdown"
          onClick={handleViewBreakdown}
          variant="default"
        />
        <ActionButton
          label="Export Results"
          onClick={handleExportResults}
          variant="primary"
        />
        <ActionButton
          label={`View Additional Papers (${metrics.additionalPapersFound})`}
          onClick={handleViewAdditionalPapers}
          variant="success"
        />
      </div>
    </div>
  );
};
