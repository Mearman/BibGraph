/**
 * Types for STAR comparison results
 */

import type {
  ComparisonProgress,
  ComparisonResults as ComparisonResultsType,
  STARDataset,
} from "@bibgraph/utils";

/**
 * Represents a comparison run for a STAR dataset
 */
export interface ComparisonRun {
  id: string;
  datasetName: string;
  runDate: Date;
  status: "completed" | "running" | "failed" | "ready";
  comparisonResults?: ComparisonResultsType;
  searchCriteria: {
    query: string;
    entityTypes: string[];
    dateRange?: {
      start: number;
      end: number;
    };
  };
  executionTime?: number; // milliseconds
  progress?: ComparisonProgress;
  error?: string;
}

/**
 * Legacy result format for backward compatibility with mock data
 */
export interface LegacyResult {
  id: string;
  datasetName: string;
  runDate: Date;
  status: string;
  metrics: {
    precision: number;
    recall: number;
    f1Score: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    totalFound: number;
    totalGroundTruth: number;
    additionalPapersFound: number;
  };
  searchCriteria: {
    query: string;
    entityTypes: string[];
  };
  executionTime: number;
}

/**
 * Normalized metrics structure used across components
 */
export interface NormalizedMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  totalFound: number;
  totalGroundTruth: number;
  additionalPapersFound: number;
}

/**
 * Average metrics calculated across multiple comparison runs
 */
export interface AverageMetrics {
  avgPrecision: number;
  avgRecall: number;
  avgF1Score: number;
  totalAdditionalPapers: number;
  avgExecutionTime: number;
}

/**
 * Visualization tab options
 */
export type VisualizationTabKey = "performance" | "scatter" | "heatmap" | "overview";

/**
 * Type guard to verify data is a valid STARDataset array
 * @param data
 */
export const isSTARDatasetArray = (data: unknown): data is STARDataset[] =>
  Array.isArray(data) &&
  data.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "name" in item &&
      "reviewTopic" in item &&
      "originalPaperCount" in item &&
      "includedPapers" in item,
  );
