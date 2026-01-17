/**
 * Missing paper detection section component
 */

import type { MissingPaperDetectionResults, STARDataset } from "@bibgraph/utils";
import { IconSearch } from "@tabler/icons-react";
import React from "react";

import { ICON_SIZE } from "@/config/style-constants";
import { BORDER_DEFAULT } from "@/constants/styles";

import { MissingPaperDetection } from "./MissingPaperDetection";

interface MissingPaperSectionProps {
  datasets: STARDataset[];
  selectedDatasetId: string | null;
  onDatasetSelect: (datasetId: string | null) => void;
  onDetectionComplete: (datasetId: string, results: MissingPaperDetectionResults) => void;
}

const EmptySelectionState: React.FC = () => (
  <div
    style={{
      textAlign: "center",
      padding: "48px 24px",
      backgroundColor: "var(--mantine-color-gray-1)",
      borderRadius: "8px",
    }}
  >
    <div style={{ marginBottom: "16px", opacity: 0.3 }}>
      <IconSearch size={ICON_SIZE.EMPTY_STATE} />
    </div>
    <h3
      style={{
        fontSize: "18px",
        fontWeight: "600",
        color: "var(--mantine-color-text)",
        marginBottom: "8px",
      }}
    >
      Select a Dataset
    </h3>
    <p style={{ fontSize: "14px", color: "var(--mantine-color-dimmed)", margin: 0 }}>
      Choose a STAR dataset above to begin missing paper detection analysis
    </p>
  </div>
);

export const MissingPaperSection: React.FC<MissingPaperSectionProps> = ({
  datasets,
  selectedDatasetId,
  onDatasetSelect,
  onDetectionComplete,
}) => {
  const selectedDataset = selectedDatasetId
    ? datasets.find((d) => d.id === selectedDatasetId)
    : undefined;

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        border: BORDER_DEFAULT,
        marginTop: "32px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "20px",
          borderBottom: BORDER_DEFAULT,
          backgroundColor: "var(--mantine-color-gray-1)",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "var(--mantine-color-text)",
            marginBottom: "8px",
          }}
        >
          Missing Paper Detection
        </h2>
        <p style={{ fontSize: "14px", color: "var(--mantine-color-dimmed)", margin: 0 }}>
          Identify potentially relevant papers that systematic reviews may have missed
        </p>
      </div>

      <div style={{ padding: "24px" }}>
        {/* Dataset Selection */}
        <div style={{ marginBottom: "24px" }}>
          <label
            htmlFor="dataset-select"
            style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "var(--mantine-color-text)",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Select Dataset for Missing Paper Analysis:
          </label>
          <select
            id="dataset-select"
            value={selectedDatasetId ?? ""}
            onChange={(e) => {
              onDatasetSelect(e.target.value || null);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--mantine-color-default-border)",
              fontSize: "14px",
              backgroundColor: "var(--mantine-color-body)",
              minWidth: "300px",
            }}
          >
            <option value="">Choose a dataset...</option>
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name} ({dataset.originalPaperCount} papers)
              </option>
            ))}
          </select>
        </div>

        {/* Missing Paper Detection Component */}
        {selectedDataset && (
          <MissingPaperDetection
            dataset={selectedDataset}
            onDetectionComplete={(results) => {
              onDetectionComplete(selectedDataset.id, results);
            }}
          />
        )}

        {!selectedDatasetId && <EmptySelectionState />}
      </div>
    </div>
  );
};
