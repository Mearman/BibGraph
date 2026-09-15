/**
 * Utility functions for STAR comparison results
 */

import type {
  ComparisonRun,
  LegacyResult,
  NormalizedMetrics,
} from "@/types/comparison";

// Converts a 0-1 ratio to a percentage value for display.
const PERCENTAGE_MULTIPLIER = 100;
// Converts a millisecond duration into seconds for display.
const MILLISECONDS_PER_SECOND = 1000;

/**
 * Format a decimal value as a percentage string
 */
export const formatPercent = (value: number): string =>
  `${(value * PERCENTAGE_MULTIPLIER).toFixed(1)}%`;

/**
 * Format milliseconds as a seconds string
 */
export const formatTime = (ms: number): string => `${(ms / MILLISECONDS_PER_SECOND).toFixed(1)}s`;

/**
 * Extract normalized metrics from either ComparisonRun or LegacyResult format
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
  }
  if ("metrics" in result) {
    return result.metrics;
  }
  return null;
};

/**
 * Get execution time from a result, handling both formats
 */
export const getExecutionTime = (result: ComparisonRun | LegacyResult): number => {
  if ("executionTime" in result) {
    return result.executionTime ?? 0;
  }
  return 0;
};
