/**
 * Utility functions for STAR comparison results
 */

import type {
  ComparisonRun,
  LegacyResult,
  NormalizedMetrics,
} from "@/types/comparison";

/**
 * Format a decimal value as a percentage string
 * @param value
 */
export const formatPercent = (value: number): string =>
  `${(value * 100).toFixed(1)}%`;

/**
 * Format milliseconds as a seconds string
 * @param ms
 */
export const formatTime = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/**
 * Extract normalized metrics from either ComparisonRun or LegacyResult format
 * @param result
 */
export const getResultMetrics = (
  result: ComparisonRun | LegacyResult,
): NormalizedMetrics | null => {
  if ("comparisonResults" in result && result.comparisonResults) {
    const comp = result.comparisonResults;
    return {
      precision: comp.precision,
      recall: comp.recall,
      f1Score: comp.f1Score,
      truePositives: comp.truePositives.length,
      falsePositives: comp.falsePositives.length,
      falseNegatives: comp.falseNegatives.length,
      totalFound: comp.bibGraphResults.length,
      totalGroundTruth: comp.dataset.includedPapers.length,
      additionalPapersFound: comp.additionalPapersFound.length,
    };
  } else if ("metrics" in result) {
    return result.metrics;
  }
  return null;
};

/**
 * Get execution time from a result, handling both formats
 * @param result
 */
export const getExecutionTime = (result: ComparisonRun | LegacyResult): number => {
  if ("executionTime" in result) {
    return result.executionTime ?? 0;
  }
  return 0;
};
