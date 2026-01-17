/**
 * Individual results list component
 */

import React from "react";

import { BORDER_DEFAULT } from "@/constants/styles";
import type { ComparisonRun, LegacyResult } from "@/types/comparison";

import { IndividualResultCard } from "./IndividualResultCard";

interface IndividualResultsListProps {
  results: Array<ComparisonRun | LegacyResult>;
}

export const IndividualResultsList: React.FC<IndividualResultsListProps> = ({
  results,
}) => {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        border: BORDER_DEFAULT,
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
            margin: 0,
          }}
        >
          Individual Comparison Results
        </h2>
      </div>

      <div style={{ overflow: "auto" }}>
        {results.map((result, index) => (
          <IndividualResultCard
            key={result.id}
            result={result}
            isLast={index === results.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
