/**
 * Dataset run controls section component
 */

import type { STARDataset } from "@bibgraph/utils";
import React from "react";

import { BORDER_DEFAULT } from "@/constants/styles";
import type { ComparisonRun } from "@/types/comparison";

import { DatasetRunCard } from "./DatasetRunCard";

interface DatasetRunControlsProps {
  datasets: STARDataset[];
  comparisonRuns: ComparisonRun[];
  isRunningComparison: boolean;
  onRunComparison: (datasetId: string) => void;
}

export const DatasetRunControls: React.FC<DatasetRunControlsProps> = ({
  datasets,
  comparisonRuns,
  isRunningComparison,
  onRunComparison,
}) => {
  if (datasets.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        border: BORDER_DEFAULT,
        padding: "24px",
        marginBottom: "32px",
      }}
    >
      <h2
        style={{
          fontSize: "20px",
          fontWeight: "600",
          color: "var(--mantine-color-text)",
          marginBottom: "16px",
        }}
      >
        Available STAR Datasets
      </h2>
      <div style={{ display: "grid", gap: "12px" }}>
        {datasets.map((dataset) => {
          const run = comparisonRuns.find((r) => r.id === `run_${dataset.id}`);
          return (
            <DatasetRunCard
              key={dataset.id}
              dataset={dataset}
              run={run}
              isRunningComparison={isRunningComparison}
              onRunComparison={onRunComparison}
            />
          );
        })}
      </div>
    </div>
  );
};
