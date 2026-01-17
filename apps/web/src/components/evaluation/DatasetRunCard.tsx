/**
 * Dataset run card component for STAR comparison controls
 */

import type { STARDataset } from "@bibgraph/utils";
import React from "react";

import { BORDER_DEFAULT } from "@/constants/styles";
import type { ComparisonRun } from "@/types/comparison";

interface DatasetRunCardProps {
  dataset: STARDataset;
  run: ComparisonRun | undefined;
  isRunningComparison: boolean;
  onRunComparison: (datasetId: string) => void;
}

export const DatasetRunCard: React.FC<DatasetRunCardProps> = ({
  dataset,
  run,
  isRunningComparison,
  onRunComparison,
}) => {
  const isRunning = run?.status === "running";
  const isCompleted = run?.status === "completed";

  const getButtonBackground = (): string => {
    if (isCompleted) return "var(--mantine-color-green-6)";
    if (isRunning) return "var(--mantine-color-yellow-6)";
    return "var(--mantine-primary-color-filled)";
  };

  const getButtonText = (): string => {
    if (isCompleted) return "Re-run";
    if (isRunning) return "Running...";
    return "Run Comparison";
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        backgroundColor: "var(--mantine-color-gray-1)",
        borderRadius: "8px",
        border: BORDER_DEFAULT,
      }}
    >
      <div>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "500",
            color: "var(--mantine-color-text)",
            marginBottom: "4px",
          }}
        >
          {dataset.name}
        </h3>
        <p style={{ fontSize: "14px", color: "var(--mantine-color-dimmed)" }}>
          {dataset.originalPaperCount} papers • {dataset.reviewTopic}
        </p>
        {run?.progress && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--mantine-primary-color-filled)",
              marginTop: "4px",
            }}
          >
            {run.progress.message ?? "Processing..."} ({run.progress.progress ?? 0}%)
          </div>
        )}
      </div>
      <button
        onClick={() => {
          onRunComparison(dataset.id);
        }}
        disabled={isRunningComparison || isRunning}
        style={{
          padding: "8px 16px",
          backgroundColor: getButtonBackground(),
          color: "var(--mantine-primary-color-contrast)",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: isRunningComparison || isRunning ? "not-allowed" : "pointer",
          opacity: isRunningComparison || isRunning ? 0.6 : 1,
        }}
      >
        {getButtonText()}
      </button>
    </div>
  );
};
