/**
 * STAR comparison results dashboard
 * Display precision/recall metrics and thesis-ready statistics
 */

import type {
  ComparisonProgress,
  MissingPaperDetectionResults,
  STARDataset,
  WorkReference,
} from "@bibgraph/utils";
import {
  calculateSearchCoverage,
  compareBibGraphResults,
  DEFAULT_MATCHING_CONFIG,
  searchBasedOnSTARDataset,
} from "@bibgraph/utils";
import { logError, logger } from "@bibgraph/utils/logger";
import { createFileRoute } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { getExecutionTime, getResultMetrics } from "@/components/evaluation/comparison-utils";
import { DatasetRunControls } from "@/components/evaluation/DatasetRunControls";
import { EmptyResultsState } from "@/components/evaluation/EmptyResultsState";
import { IndividualResultsList } from "@/components/evaluation/IndividualResultsList";
import { MissingPaperSection } from "@/components/evaluation/MissingPaperSection";
import { SummaryMetricsGrid } from "@/components/evaluation/SummaryMetricsGrid";
import { ThesisIntegrationNotes } from "@/components/evaluation/ThesisIntegrationNotes";
import { VisualizationTabs } from "@/components/evaluation/VisualizationTabs";
import type {
  AverageMetrics,
  ComparisonRun,
  LegacyResult,
  VisualizationTabKey,
} from "@/types/comparison";
import { isSTARDatasetArray } from "@/types/comparison";

/** Mock data for demonstration when no real datasets exist */
const MOCK_RESULTS: LegacyResult[] = [
  {
    id: "mock_comparison_1",
    datasetName: "Machine Learning Systematic Review",
    runDate: new Date("2025-01-10"),
    status: "completed",
    metrics: {
      precision: 0.87,
      recall: 0.92,
      f1Score: 0.895,
      truePositives: 156,
      falsePositives: 23,
      falseNegatives: 14,
      totalFound: 179,
      totalGroundTruth: 170,
      additionalPapersFound: 12,
    },
    searchCriteria: {
      query: "machine learning systematic review",
      entityTypes: ["works", "authors"],
    },
    executionTime: 45_000,
  },
];

/**
 * Calculate average metrics across completed comparison runs
 * @param results
 */
const calculateAverageMetrics = (
  results: Array<ComparisonRun | LegacyResult>,
): AverageMetrics | null => {
  if (results.length === 0) return null;

  const completed = results.filter((r) => r.status === "completed");
  const totalResults = completed.length;

  if (totalResults === 0) return null;

  const metricsArray = completed
    .map((r) => getResultMetrics(r))
    .filter((m) => m !== null);

  if (metricsArray.length === 0) return null;

  return {
    avgPrecision:
      metricsArray.reduce((sum, m) => sum + m.precision, 0) / metricsArray.length,
    avgRecall:
      metricsArray.reduce((sum, m) => sum + m.recall, 0) / metricsArray.length,
    avgF1Score:
      metricsArray.reduce((sum, m) => sum + m.f1Score, 0) / metricsArray.length,
    totalAdditionalPapers: metricsArray.reduce(
      (sum, m) => sum + m.additionalPapersFound,
      0,
    ),
    avgExecutionTime:
      completed.reduce((sum, r) => sum + getExecutionTime(r), 0) / totalResults,
  };
};

/**
 * Perform BibGraph search using OpenAlex API
 * @param dataset
 */
const performBibGraphSearch = (dataset: STARDataset): WorkReference[] => {
  try {
    const results = searchBasedOnSTARDataset(dataset);

    const coverage = calculateSearchCoverage({
      searchResults: results,
      dataset,
    });
    logger.debug(
      "api",
      "Search coverage analysis",
      { coverage },
      "ComparisonResults",
    );

    return results;
  } catch (error) {
    logError(
      logger,
      "BibGraph search failed:",
      error,
      "ComparisonResults",
      "routing",
    );
    throw error;
  }
};

const ComparisonResults: React.FC = () => {
  const [starDatasets, setStarDatasets] = useState<STARDataset[]>([]);
  const [comparisonRuns, setComparisonRuns] = useState<ComparisonRun[]>([]);
  const [isRunningComparison, setIsRunningComparison] = useState(false);
  const [activeVisualizationTab, setActiveVisualizationTab] =
    useState<VisualizationTabKey>("performance");
  const [, setMissingPaperResults] = useState<{
    [datasetId: string]: MissingPaperDetectionResults;
  }>({});
  const [selectedDatasetForMissingPapers, setSelectedDatasetForMissingPapers] =
    useState<string | null>(null);

  const updateComparisonProgress = useCallback(
    (datasetId: string, progressData: ComparisonProgress) => {
      setComparisonRuns((prev) =>
        prev.map((run) =>
          run.id === `run_${datasetId}` ? { ...run, progress: progressData } : run,
        ),
      );
    },
    [],
  );

  // Load STAR datasets from localStorage on component mount
  useEffect(() => {
    try {
      const savedDatasets = localStorage.getItem("star-datasets");
      if (savedDatasets) {
        const parsedDatasets: unknown = JSON.parse(savedDatasets);
        if (isSTARDatasetArray(parsedDatasets)) {
          setStarDatasets(parsedDatasets);

          // Initialize comparison runs for each dataset
          const runs: ComparisonRun[] = parsedDatasets.map((dataset) => ({
            id: `run_${dataset.id}`,
            datasetName: dataset.name,
            runDate: new Date(),
            status: "ready",
            searchCriteria: {
              query: dataset.reviewTopic,
              entityTypes: ["works"],
            },
          }));
          setComparisonRuns(runs);
        }
      }
    } catch (error) {
      logError(
        logger,
        "Failed to load STAR datasets:",
        error,
        "ComparisonResults",
        "routing",
      );
    }
  }, []);

  // Run comparison for a specific dataset
  const runComparison = useCallback(
    (datasetId: string) => {
      const dataset = starDatasets.find((d) => d.id === datasetId);
      if (!dataset) return;

      setIsRunningComparison(true);

      // Update run status
      setComparisonRuns((prev) =>
        prev.map((run) =>
          run.id === `run_${datasetId}`
            ? { ...run, status: "running" as const, runDate: new Date() }
            : run,
        ),
      );

      try {
        const startTime = performance.now();

        // Step 1: Perform BibGraph search
        const academicExplorerResults = performBibGraphSearch(dataset);

        // Step 2: Run comparison with progress tracking
        const comparisonResults = compareBibGraphResults(
          academicExplorerResults,
          dataset,
          DEFAULT_MATCHING_CONFIG,
          (progress) => updateComparisonProgress(datasetId, progress),
        );

        const executionTime = performance.now() - startTime;

        // Update with completed results
        setComparisonRuns((prev) =>
          prev.map((run) =>
            run.id === `run_${datasetId}`
              ? {
                  ...run,
                  status: "completed" as const,
                  comparisonResults,
                  executionTime,
                }
              : run,
          ),
        );
      } catch (error) {
        logError(
          logger,
          "Comparison failed:",
          error,
          "ComparisonResults",
          "routing",
        );
        setComparisonRuns((prev) =>
          prev.map((run) =>
            run.id === `run_${datasetId}`
              ? {
                  ...run,
                  status: "failed" as const,
                  error: error instanceof Error ? error.message : "Unknown error",
                }
              : run,
          ),
        );
      } finally {
        setIsRunningComparison(false);
      }
    },
    [starDatasets, updateComparisonProgress],
  );

  // Use real comparison runs if available, otherwise show mock data
  const displayResults = useMemo(() => {
    return comparisonRuns.length > 0 ? comparisonRuns : MOCK_RESULTS;
  }, [comparisonRuns]);

  const averageMetrics = useMemo(
    () => calculateAverageMetrics(displayResults),
    [displayResults],
  );

  // Extract completed comparison results for visualizations
  const completedComparisonResults = useMemo(() => {
    return comparisonRuns
      .filter((run) => run.status === "completed" && run.comparisonResults)
      .map((run) => {
        if (!run.comparisonResults) {
          throw new Error("Comparison results missing for completed run");
        }
        return run.comparisonResults;
      });
  }, [comparisonRuns]);

  const handleMissingPaperDetectionComplete = useCallback(
    (datasetId: string, results: MissingPaperDetectionResults) => {
      setMissingPaperResults((prev) => ({
        ...prev,
        [datasetId]: results,
      }));
    },
    [],
  );

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            color: "var(--mantine-color-text)",
            marginBottom: "8px",
          }}
        >
          STAR Comparison Results
        </h1>
        <p style={{ fontSize: "16px", color: "var(--mantine-color-dimmed)" }}>
          Detailed analysis of BibGraph performance against systematic literature
          review ground truth
        </p>
      </div>

      {/* Run Comparison Controls */}
      <DatasetRunControls
        datasets={starDatasets}
        comparisonRuns={comparisonRuns}
        isRunningComparison={isRunningComparison}
        onRunComparison={runComparison}
      />

      {displayResults.length === 0 ? (
        <EmptyResultsState hasDatasets={starDatasets.length > 0} />
      ) : (
        <>
          {/* Summary Metrics */}
          {averageMetrics && <SummaryMetricsGrid metrics={averageMetrics} />}

          {/* Individual Results */}
          <IndividualResultsList results={displayResults} />

          {/* Meta-Analysis Visualizations */}
          {completedComparisonResults.length > 0 && (
            <VisualizationTabs
              comparisonResults={completedComparisonResults}
              activeTab={activeVisualizationTab}
              onTabChange={setActiveVisualizationTab}
            />
          )}

          {/* Missing Paper Detection */}
          {starDatasets.length > 0 && (
            <MissingPaperSection
              datasets={starDatasets}
              selectedDatasetId={selectedDatasetForMissingPapers}
              onDatasetSelect={setSelectedDatasetForMissingPapers}
              onDetectionComplete={handleMissingPaperDetectionComplete}
            />
          )}

          {/* Thesis Integration Notes */}
          <ThesisIntegrationNotes />
        </>
      )}
    </div>
  );
};

export const Route = createFileRoute("/evaluation/results")({
  component: ComparisonResults,
});
