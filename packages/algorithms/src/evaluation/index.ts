/**
 * MI Experiment Evaluation Framework
 *
 * Provides metrics, baselines, and infrastructure for evaluating
 * mutual information path ranking methodology.
 */

// Export types
export type {
  PropertyValidationResult,
  EvaluationResult,
  MethodComparison,
  StatisticalTestResult,
  ExperimentReport
} from './types';

// Export rank correlation metrics
export {
  spearmanCorrelation,
  kendallTau
} from './rank-correlation';

// Export IR metrics
export {
  ndcg,
  meanAveragePrecision,
  meanReciprocalRank,
  precisionAtK,
  recallAtK
} from './ir-metrics';

// Export baseline rankers
export {
  randomRanker,
  degreeBasedRanker,
  pageRankRanker,
  shortestPathRanker,
  weightBasedRanker
} from './baselines';

// Export path planting infrastructure
export {
  plantGroundTruthPaths,
  addNoisePaths,
  plantHeterogeneousPaths,
  plantCitationPaths,
  type PlantedPathConfig,
  type PlantedPathResult,
  type HeterogeneousPathConfig,
  type CitationPathConfig,
  type CitationPathType
} from './path-planting';
