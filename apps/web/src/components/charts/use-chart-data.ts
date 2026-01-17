/**
 * Chart Data Transformation Hooks
 *
 * Hooks for transforming ComparisonResults into chart-ready data structures.
 */

import type { ComparisonResults } from "@bibgraph/utils";
import { useMemo } from "react";

import type { DatasetPerformanceData, ScatterPlotPoint } from "./responsive-chart.types";

/**
 * Hook to transform comparison results into performance chart data
 *
 * @param comparisonResults - Raw comparison results from evaluation
 * @returns Processed data array and computed max value for scaling
 */
export const usePerformanceChartData = (comparisonResults: ComparisonResults[]) => {
  const chartData = useMemo(() => {
    return comparisonResults.map(
      (result): DatasetPerformanceData => ({
        datasetName: result.dataset.name,
        precision: result.precision,
        recall: result.recall,
        f1Score: result.f1Score,
        truePositives: result.truePositives.length,
        falsePositives: result.falsePositives.length,
        falseNegatives: result.falseNegatives.length,
        additionalPapers: result.additionalPapersFound.length,
        totalFound: result.bibGraphResults.length,
        totalGroundTruth: result.dataset.includedPapers.length,
      })
    );
  }, [comparisonResults]);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(
      ...chartData.flatMap((d) => [d.precision, d.recall, d.f1Score])
    );
  }, [chartData]);

  return { chartData, maxValue };
};

/**
 * Hook to transform comparison results into scatter plot data
 *
 * @param comparisonResults - Raw comparison results from evaluation
 * @returns Processed scatter plot point array
 */
export const useScatterPlotData = (comparisonResults: ComparisonResults[]) => {
  const plotData = useMemo(() => {
    return comparisonResults.map((result, index): ScatterPlotPoint => ({
      id: index,
      datasetName: result.dataset.name,
      precision: result.precision,
      recall: result.recall,
      f1Score: result.f1Score,
      totalPapers: result.dataset.includedPapers.length,
    }));
  }, [comparisonResults]);

  return plotData;
};
