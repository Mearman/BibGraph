/**
 * Thesis integration notes component
 */

import { IconBulb } from "@tabler/icons-react";
import React from "react";

import { ICON_SIZE } from "@/config/style-constants";

export const ThesisIntegrationNotes: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: "rgba(var(--mantine-color-yellow-6-rgb), 0.1)",
        borderRadius: "8px",
        border: "1px solid rgba(var(--mantine-color-yellow-6-rgb), 0.3)",
        padding: "16px",
        marginTop: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "16px",
          fontWeight: "600",
          color: "var(--mantine-color-yellow-7)",
          marginBottom: "8px",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <IconBulb size={ICON_SIZE.MD} />
          Thesis Integration Notes
        </span>
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "var(--mantine-color-yellow-7)",
          lineHeight: "1.5",
          margin: 0,
        }}
      >
        These results demonstrate BibGraph&apos;s quantitative performance improvements
        over traditional systematic review methodologies. The precision/recall metrics
        and additional papers discovered provide statistical evidence for Chapter 6
        evaluation. Export individual results for detailed statistical analysis and
        inclusion in thesis appendices.
      </p>
    </div>
  );
};
