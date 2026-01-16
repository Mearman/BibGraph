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
  pathFollowsTemplate,
  type PlantedPathConfig,
  type PlantedPathResult,
  type HeterogeneousPathConfig,
  type CitationPathConfig,
  type CitationPathType
} from './path-planting';

// Export statistical significance testing
export {
  pairedTTest,
  wilcoxonSignedRank,
  bootstrapCI,
  bootstrapDifferenceTest,
  bonferroniCorrection,
  benjaminiHochberg,
  holmBonferroni,
  storeyQValues,
  cohensD,
  cliffsDelta,
  glassDelta,
  rankBiserialCorrelation,
} from './statistics';

// Export experiment runner
export type {
  GraphSpec,
  MethodConfig,
  ExperimentConfig,
  FullExperimentConfig,
  MetricType,
  StatisticalTestType,
  PathRanker,
} from './runner';

export {
  runExperiment,
  runCrossValidation,
  generateMarkdownReport,
  generateLatexTable,
  generateJSONSummary,
  generateHTMLReport,
} from './runner';

// Export graph loaders
export {
  loadEdgeList,
  loadTriples,
  loadGraph,
  loadGraphFromUrl,
  type LoadedNode,
  type LoadedEdge,
  type EdgeListConfig,
  type TripleConfig,
  type LoadResult,
} from './loaders';

// Export ground truth computation
export {
  computeGroundTruth,
  computeAllGroundTruths,
  createAttributeImportance,
  precomputeImportance,
  enumerateBetweenGraph,
  enumerateMultiSeedBetweenGraph,
  computeEgoNetwork,
  type GroundTruthType,
  type GroundTruthConfig,
  type GroundTruthPath,
  type PrecomputedImportance,
  type BetweenGraphResult,
  type BetweenGraphOptions,
} from './ground-truth';

// Export expansion comparison metrics
export {
  // Path diversity
  jaccardDistance,
  pathToNodeSet,
  meanPairwiseJaccardDistance,
  meanPairwiseEdgeJaccardDistance,
  computePathDiversityMetrics,
  computeHubCoverage,
  identifyHubNodes,
  type PathDiversityMetrics,
  // Degree distribution
  computeDegreeDistribution,
  klDivergence,
  jsDivergence,
  earthMoversDistance,
  compareDegreeDistributions,
  degreeDistributionFromMap,
  computeDegreeHistogram,
  type DegreeDistributionMetrics,
  // Structural representativeness
  computeSetOverlap,
  spearmanRankCorrelation,
  degreeToRanking,
  computeCommunityCoverage,
  computeStructuralRepresentativeness,
  aggregateRepresentativenessResults,
  type StructuralRepresentativenessResult,
} from './metrics';

// Export benchmark dataset fixtures
export {
  // Dataset metadata constants
  CORA,
  CITESEER,
  FACEBOOK,
  KARATE,
  LESMIS,
  DBLP,
  BENCHMARK_DATASETS,
  DATASETS_BY_ID,
  // Types
  type BenchmarkDatasetMeta,
  type LoadedBenchmark,
  // Loaders
  loadBenchmark,
  loadBenchmarkById,
  loadAllBenchmarks,
  resolveBenchmarkPath,
  // Utilities
  getBenchmarkSummary,
  validateBenchmark,
} from './fixtures';
