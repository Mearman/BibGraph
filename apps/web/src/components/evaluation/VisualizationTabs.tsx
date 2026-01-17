/**
 * Visualization tabs component for meta-analysis charts
 */

import type { ComparisonResults as ComparisonResultsType } from "@bibgraph/utils";
import React from "react";

import { BORDER_DEFAULT } from "@/constants/styles";
import type { VisualizationTabKey } from "@/types/comparison";

import {
  ConfusionMatrixHeatmap,
  DatasetStatisticsOverview,
  PerformanceComparisonChart,
  PrecisionRecallScatterPlot,
} from "./MetaAnalysisCharts";

interface VisualizationTabsProps {
  comparisonResults: ComparisonResultsType[];
  activeTab: VisualizationTabKey;
  onTabChange: (tab: VisualizationTabKey) => void;
}

interface TabDefinition {
  key: VisualizationTabKey;
  label: string;
}

const TABS: TabDefinition[] = [
  { key: "performance", label: "Performance Comparison" },
  { key: "scatter", label: "Precision-Recall Plot" },
  { key: "heatmap", label: "Confusion Matrix" },
  { key: "overview", label: "Statistical Overview" },
];

interface TabButtonProps {
  tab: TabDefinition;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, isActive, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 20px",
        border: "none",
        backgroundColor: isActive
          ? "var(--mantine-color-body)"
          : isHovered
            ? "var(--mantine-color-gray-1)"
            : "transparent",
        color: isActive
          ? "var(--mantine-primary-color-filled)"
          : "var(--mantine-color-dimmed)",
        fontWeight: isActive ? "600" : "400",
        fontSize: "14px",
        cursor: "pointer",
        borderBottom: isActive
          ? "2px solid var(--mantine-primary-color-filled)"
          : "none",
        transition: "all 0.2s",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {tab.label}
    </button>
  );
};

export const VisualizationTabs: React.FC<VisualizationTabsProps> = ({
  comparisonResults,
  activeTab,
  onTabChange,
}) => {
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
          Meta-Analysis Visualizations
        </h2>
        <p style={{ fontSize: "14px", color: "var(--mantine-color-dimmed)", margin: 0 }}>
          Advanced charts and statistical visualizations for thesis presentation
        </p>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: BORDER_DEFAULT,
          backgroundColor: "var(--mantine-color-gray-1)",
        }}
      >
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "24px" }}>
        {activeTab === "performance" && (
          <PerformanceComparisonChart comparisonResults={comparisonResults} />
        )}
        {activeTab === "scatter" && (
          <PrecisionRecallScatterPlot comparisonResults={comparisonResults} />
        )}
        {activeTab === "heatmap" && (
          <ConfusionMatrixHeatmap comparisonResults={comparisonResults} />
        )}
        {activeTab === "overview" && (
          <DatasetStatisticsOverview comparisonResults={comparisonResults} />
        )}
      </div>
    </div>
  );
};
