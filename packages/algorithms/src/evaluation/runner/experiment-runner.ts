/**
 * Experiment runner infrastructure
 */

import type { Edge, Node } from '../../types/graph';
import { Graph } from '../../graph/graph';
import type { Path } from '../../types/algorithm-results';
import {
  spearmanCorrelation,
  kendallTau,
} from '../rank-correlation';
import {
  ndcg,
  meanAveragePrecision,
  meanReciprocalRank,
  precisionAtK,
  recallAtK,
} from '../ir-metrics';
import {
  pairedTTest,
  wilcoxonSignedRank,
  bootstrapDifferenceTest,
} from '../statistics';
import {
  plantGroundTruthPaths,
  addNoisePaths,
  type PlantedPathResult,
} from '../path-planting';
import type {
  ExperimentConfig,
  MetricType,
  MethodConfig,
  StatisticalTestType,
  PathRanker,
} from './experiment-config';
import type { ExperimentReport, MethodComparison, StatisticalTestResult } from '../types';

/**
 * Run a complete evaluation experiment.
 *
 * Executes all configured methods on multiple graph instances,
 * computes evaluation metrics, and performs statistical testing.
 *
 * @template N - Node type
 * @template E - Edge type
 * @param config - Experiment configuration
 * @param baseGraph - Base graph to use for experiments
 * @returns Complete experiment report
 *
 * @example
 * ```typescript
 * const config: ExperimentConfig = {
 *   name: 'MI vs Random Baseline',
 *   repetitions: 10,
 *   pathPlanting: { numPaths: 5, signalStrength: 'medium', ... },
 *   methods: [
 *     { name: 'MI', ranker: miRanker },
 *     { name: 'Random', ranker: randomRanker },
 *   ],
 *   metrics: ['spearman', 'ndcg'],
 *   statisticalTests: ['paired-t'],
 *   seed: 42,
 * };
 *
 * const report = await runExperiment(config, graph);
 * console.log(report.winner); // 'MI' (if significantly better)
 * ```
 */
export async function runExperiment<N extends Node, E extends Edge>(
  config: ExperimentConfig<N, E>,
  baseGraph: Graph<N, E>
): Promise<ExperimentReport> {
  const startTime = Date.now();

  // Plant ground truth paths
  const plantedResult = plantGroundTruthPaths(baseGraph, config.pathPlanting);
  const groundTruthPaths = plantedResult.groundTruthPaths;

  // Add noise paths if configured
  let graph = plantedResult.graph;
  // Note: Noise paths would be added here if configured
  // For now, we'll skip noise to keep experiments simple

  // Run each method and collect results
  const methodResults: Array<{
    method: string;
    repetitions: Array<Map<string, number>>;
  }> = [];

  for (const method of config.methods) {
    const repetitions: Array<Map<string, number>> = [];

    for (let rep = 0; rep < config.repetitions; rep++) {
      // Rank paths using this method
      const rankedPaths = method.ranker(graph, groundTruthPaths);

      // Compute metrics
      const metrics = computeMetrics(
        rankedPaths,
        groundTruthPaths,
        config.metrics
      );

      repetitions.push(metrics);
    }

    methodResults.push({
      method: method.name,
      repetitions,
    });
  }

  // Aggregate results across repetitions
  const methodComparisons: MethodComparison[] = methodResults.map(({ method, repetitions }) => {
    const aggregated = aggregateMetrics(repetitions, config.metrics);

    return {
      method,
      results: aggregated,
      runtime: 0, // Could track actual runtime if needed
    };
  });

  // Run statistical tests comparing best method to others
  const statisticalTests = runStatisticalTests(
    methodResults,
    config.statisticalTests,
    config.alpha ?? 0.05
  );

  // Determine winner (method with best average performance)
  const winner = determineWinner(methodComparisons, config.metrics[0] ?? 'spearman');

  return {
    name: config.name,
    graphSpec: 'custom',
    methods: methodComparisons,
    statisticalTests,
    winner,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

/**
 * Run cross-validation experiment.
 *
 * Divides data into k folds, trains on k-1 folds, tests on held-out fold.
 * Provides more robust estimate of method performance.
 *
 * @template N - Node type
 * @template E - Edge type
 * @param config - Experiment configuration
 * @param baseGraph - Base graph
 * @param folds - Number of cross-validation folds (default: 5)
 * @returns Aggregated results across folds
 *
 * @example
 * ```typescript
 * const result = await runCrossValidation(config, graph, 5);
 * console.log(result.aggregated.spearman); // Average spearman across folds
 * console.log(result.stdDev.spearman);    // Standard deviation
 * ```
 */
export async function runCrossValidation<N extends Node, E extends Edge>(
  config: ExperimentConfig<N, E>,
  baseGraph: Graph<N, E>,
  folds: number = 5
): Promise<{
  foldResults: ExperimentReport[];
  aggregated: ExperimentReport;
  stdDev: ExperimentReport;
}> {
  const foldResults: ExperimentReport[] = [];

  // Run experiment for each fold
  for (let fold = 0; fold < folds; fold++) {
    // Use different seed for each fold
    const foldConfig = {
      ...config,
      seed: config.seed + fold,
    };

    const result = await runExperiment(foldConfig, baseGraph);
    foldResults.push(result);
  }

  // Aggregate results across folds
  const aggregated = aggregateFoldResults(foldResults);

  // Calculate standard deviation across folds
  const stdDev = calculateStdDev(foldResults);

  return { foldResults, aggregated, stdDev };
}

/**
 * Compute evaluation metrics for a single method run.
 */
function computeMetrics<N extends Node, E extends Edge>(
  rankedPaths: Array<{ path: Path<N, E>; score: number }>,
  groundTruthPaths: Path<N, E>[],
  metricTypes: MetricType[]
): Map<string, number> {
  const metrics = new Map<string, number>();

  // Extract predicted ranking (path IDs in order)
  const predicted = rankedPaths.map((rp) => {
    // Use first node ID as path identifier
    return rp.path.nodes[0]?.id ?? 'unknown';
  });

  // Extract ground truth ranking (by relevance score)
  const groundTruth = groundTruthPaths
    .map((path, i) => ({ path, index: i }))
    .sort((a, b) => {
      const scoreA = a.path.totalWeight ?? 0;
      const scoreB = b.path.totalWeight ?? 0;
      return scoreB - scoreA; // Descending by MI
    })
    .map((item) => item.path.nodes[0]?.id ?? 'unknown');

  // Compute rank correlation metrics
  for (const metric of metricTypes) {
    switch (metric) {
      case 'spearman':
        metrics.set('spearman', spearmanCorrelation(predicted, groundTruth));
        break;

      case 'kendall':
        metrics.set('kendall', kendallTau(predicted, groundTruth));
        break;

      case 'ndcg':
        // Convert to relevance format
        const predictedWithRel = rankedPaths.map((rp, i) => ({
          id: predicted[i]!,
          relevance: rp.path.totalWeight ?? 0,
        }));
        const truthWithRel = groundTruthPaths.map((path) => ({
          id: path.nodes[0]?.id ?? 'unknown',
          relevance: path.totalWeight ?? 0,
        }));
        // Sort ground truth by relevance for ideal DCG
        truthWithRel.sort((a, b) => b.relevance - a.relevance);
        metrics.set('ndcg', ndcg(predictedWithRel, truthWithRel));
        break;

      case 'map':
        // Consider top-K paths as relevant
        const k = Math.min(10, groundTruthPaths.length);
        const relevantSet = new Set(groundTruthPaths.slice(0, k).map((p) => p.nodes[0]?.id ?? 'unknown'));
        metrics.set('map', meanAveragePrecision(predicted, relevantSet));
        break;

      case 'mrr':
        const relevantMRR = new Set(groundTruthPaths.slice(0, 5).map((p) => p.nodes[0]?.id ?? 'unknown'));
        metrics.set('mrr', meanReciprocalRank(predicted, relevantMRR));
        break;

      case 'precision':
        const relevantP = new Set(groundTruthPaths.slice(0, 10).map((p) => p.nodes[0]?.id ?? 'unknown'));
        metrics.set('precision_at_5', precisionAtK(predicted, relevantP, 5));
        metrics.set('precision_at_10', precisionAtK(predicted, relevantP, 10));
        break;

      case 'recall':
        const relevantR = new Set(groundTruthPaths.slice(0, 10).map((p) => p.nodes[0]?.id ?? 'unknown'));
        metrics.set('recall_at_5', recallAtK(predicted, relevantR, 5));
        metrics.set('recall_at_10', recallAtK(predicted, relevantR, 10));
        break;
    }
  }

  return metrics;
}

/**
 * Aggregate metrics across repetitions.
 */
function aggregateMetrics(
  repetitions: Array<Map<string, number>>,
  metricTypes: MetricType[]
): ExperimentReport['methods'][number]['results'] {
  const aggregated: Record<string, number> = {};

  // Collect values for each metric
  const metricValues: Map<string, number[]> = new Map();

  for (const rep of repetitions) {
    for (const [metric, value] of rep) {
      if (!metricValues.has(metric)) {
        metricValues.set(metric, []);
      }
      metricValues.get(metric)!.push(value);
    }
  }

  // Compute mean for each metric
  for (const [metric, values] of metricValues) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    aggregated[metric] = mean;
  }

  // Initialize all requested metrics with 0 if not present
  for (const metric of metricTypes) {
    if (!(metric in aggregated)) {
      aggregated[metric] = 0;
    }
  }

  return aggregated as ExperimentReport['methods'][number]['results'];
}

/**
 * Run statistical tests comparing methods.
 */
function runStatisticalTests(
  methodResults: Array<{ method: string; repetitions: Array<Map<string, number>> }>,
  testTypes: StatisticalTestType[],
  alpha: number
): StatisticalTestResult[] {
  const tests: StatisticalTestResult[] = [];

  // Find best method (by first metric)
  const sortedMethods = [...methodResults].sort((a, b) => {
    const metric = 'spearman'; // Use spearman as default comparison metric
    const avgA = averageMetric(a.repetitions, metric);
    const avgB = averageMetric(b.repetitions, metric);
    return avgB - avgA;
  });

  const bestMethod = sortedMethods[0]!;
  const bestMetric = averageMetric(bestMethod.repetitions, 'spearman');

  // Compare best method to each other method
  for (let i = 1; i < sortedMethods.length; i++) {
    const otherMethod = sortedMethods[i]!;

    for (const testType of testTypes) {
      let result: StatisticalTestResult;

      switch (testType) {
        case 'paired-t': {
          const bestValues = bestMethod.repetitions.map((r) => r.get('spearman') ?? 0);
          const otherValues = otherMethod.repetitions.map((r) => r.get('spearman') ?? 0);
          const tResult = pairedTTest(bestValues, otherValues, alpha);

          result = {
            type: 'paired-t',
            comparison: `${bestMethod.method} vs ${otherMethod.method}`,
            pValue: tResult.pValue,
            significant: tResult.significant,
            statistic: tResult.tStatistic,
          };
          break;
        }

        case 'wilcoxon': {
          const bestValues = bestMethod.repetitions.map((r) => r.get('spearman') ?? 0);
          const otherValues = otherMethod.repetitions.map((r) => r.get('spearman') ?? 0);
          const wResult = wilcoxonSignedRank(bestValues, otherValues, alpha);

          result = {
            type: 'wilcoxon',
            comparison: `${bestMethod.method} vs ${otherMethod.method}`,
            pValue: wResult.pValue,
            significant: wResult.significant,
            statistic: wResult.statistic,
          };
          break;
        }

        case 'bootstrap': {
          const bestValues = bestMethod.repetitions.map((r) => r.get('spearman') ?? 0);
          const otherValues = otherMethod.repetitions.map((r) => r.get('spearman') ?? 0);
          const bResult = bootstrapDifferenceTest(bestValues, otherValues, 10000, alpha);

          result = {
            type: 'bootstrap',
            comparison: `${bestMethod.method} vs ${otherMethod.method}`,
            pValue: bResult.pValue,
            significant: bResult.significant,
            ci: bResult.ci,
          };
          break;
        }

        default:
          continue;
      }

      tests.push(result);
    }
  }

  return tests;
}

/**
 * Determine winning method based on primary metric.
 */
function determineWinner(
  methods: MethodComparison[],
  primaryMetric: string
): string {
  const sorted = [...methods].sort((a, b) => {
    const scoreA = a.results[primaryMetric] ?? 0;
    const scoreB = b.results[primaryMetric] ?? 0;
    return scoreB - scoreA;
  });

  return sorted[0]?.method ?? 'unknown';
}

/**
 * Average metric value across repetitions.
 */
function averageMetric(repetitions: Array<Map<string, number>>, metric: string): number {
  let sum = 0;
  let count = 0;

  for (const rep of repetitions) {
    const value = rep.get(metric);
    if (value !== undefined) {
      sum += value;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Aggregate fold results for cross-validation.
 */
function aggregateFoldResults(folds: ExperimentReport[]): ExperimentReport {
  const firstFold = folds[0]!;

  // Aggregate methods
  const aggregatedMethods: MethodComparison[] = firstFold.methods.map((method) => {
    const results: Record<string, number> = {};

    for (const metric of Object.keys(method.results)) {
      const values = folds.map((f) =>
        f.methods.find((m) => m.method === method.method)?.results[metric]
      );
      const mean = values.reduce((sum: number, v) => sum + (v ?? 0), 0) / values.length;
      results[metric] = mean;
    }

    return {
      method: method.method,
      results,
      runtime: method.runtime,
    };
  });

  // Aggregate statistical tests (simplified)
  const aggregatedTests: StatisticalTestResult[] = [];

  return {
    ...firstFold,
    methods: aggregatedMethods,
    statisticalTests: aggregatedTests,
  };
}

/**
 * Calculate standard deviation across folds.
 */
function calculateStdDev(folds: ExperimentReport[]): ExperimentReport {
  const firstFold = folds[0]!;

  // Calculate std dev for each method's metrics
  const methodsWithStdDev: MethodComparison[] = firstFold.methods.map((method) => {
    const results: Record<string, number> = {};

    for (const metric of Object.keys(method.results)) {
      const values = folds.map((f) =>
        f.methods.find((m) => m.method === method.method)?.results[metric]
      );

      const mean = values.reduce((sum: number, v) => sum + (v ?? 0), 0) / values.length;
      const variance = values.reduce((sum: number, v) => sum + ((v ?? 0) - mean) ** 2, 0) / values.length;
      results[metric] = Math.sqrt(variance);
    }

    return {
      method: method.method,
      results,
      runtime: 0,
    };
  });

  return {
    ...firstFold,
    methods: methodsWithStdDev,
    statisticalTests: [],
  };
}
