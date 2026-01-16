/**
 * Evaluation Fixtures
 *
 * Provides benchmark datasets and test fixtures for evaluation experiments.
 */

export {
  // Dataset metadata
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
} from './benchmark-datasets';
