/**
 * Empty results state component for when no comparison results exist
 */

import { IconChartBar } from "@tabler/icons-react";
import React from "react";

import { ICON_SIZE } from "@/config/style-constants";
import { BORDER_DEFAULT } from "@/constants/styles";

interface EmptyResultsStateProps {
  hasDatasets: boolean;
}

export const EmptyResultsState: React.FC<EmptyResultsStateProps> = ({
  hasDatasets,
}) => {
  const message = hasDatasets
    ? "Run comparisons against uploaded STAR datasets to see detailed performance metrics here"
    : "Upload STAR datasets first, then run comparisons to see detailed performance metrics here";

  return (
    <div
      style={{
        backgroundColor: "var(--mantine-color-gray-1)",
        borderRadius: "12px",
        border: BORDER_DEFAULT,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: "16px", opacity: 0.3 }}>
        <IconChartBar size={ICON_SIZE.EMPTY_STATE} />
      </div>
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "var(--mantine-color-text)",
          marginBottom: "8px",
        }}
      >
        No comparison results available
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "var(--mantine-color-dimmed)",
          marginBottom: "24px",
        }}
      >
        {message}
      </p>
    </div>
  );
};
