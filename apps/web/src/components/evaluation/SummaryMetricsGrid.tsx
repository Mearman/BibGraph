/**
 * Summary metrics grid component for STAR comparison results
 */

import React from "react";

import { BORDER_DEFAULT } from "@/constants/styles";
import type { AverageMetrics } from "@/types/comparison";

import { formatPercent, formatTime } from "./comparison-utils";

interface SummaryMetricsGridProps {
  metrics: AverageMetrics;
}

interface MetricCardProps {
  value: string;
  label: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ value, label, color }) => (
  <div
    style={{
      backgroundColor: "white",
      borderRadius: "8px",
      border: BORDER_DEFAULT,
      padding: "20px",
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontSize: "32px",
        fontWeight: "bold",
        color,
        marginBottom: "8px",
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: "14px",
        color: "var(--mantine-color-dimmed)",
        fontWeight: "500",
      }}
    >
      {label}
    </div>
  </div>
);

export const SummaryMetricsGrid: React.FC<SummaryMetricsGridProps> = ({
  metrics,
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
      }}
    >
      <MetricCard
        value={formatPercent(metrics.avgPrecision)}
        label="Average Precision"
        color="var(--mantine-primary-color-filled)"
      />
      <MetricCard
        value={formatPercent(metrics.avgRecall)}
        label="Average Recall"
        color="var(--mantine-color-green-6)"
      />
      <MetricCard
        value={formatPercent(metrics.avgF1Score)}
        label="Average F1-Score"
        color="var(--mantine-color-violet-5)"
      />
      <MetricCard
        value={`+${metrics.totalAdditionalPapers}`}
        label="Additional Papers Found"
        color="var(--mantine-color-yellow-6)"
      />
      <MetricCard
        value={formatTime(metrics.avgExecutionTime)}
        label="Average Execution Time"
        color="var(--mantine-color-dimmed)"
      />
    </div>
  );
};
