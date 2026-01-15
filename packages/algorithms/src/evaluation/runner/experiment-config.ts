/**
 * Experiment configuration types
 */

import { Graph } from '../../graph/graph';
import type { Path } from '../../types/algorithm-results';
import type { Edge, Node } from '../../types/graph';
import type { PlantedPathConfig } from '../path-planting/path-generator';

/**
 * Path ranking function type.
 *
 * Takes a list of candidate paths and returns them ranked by relevance.
 */
export type PathRanker<N extends Node, E extends Edge> = (
  graph: Graph<N, E>,
  paths: Path<N, E>[]
) => Array<{ path: Path<N, E>; score: number }>;

/**
 * Available evaluation metrics.
 */
export type MetricType =
  | 'spearman' // Spearman rank correlation
  | 'kendall' // Kendall's tau
  | 'ndcg' // Normalized Discounted Cumulative Gain
  | 'map' // Mean Average Precision
  | 'mrr' // Mean Reciprocal Rank
  | 'precision' // Precision at K
  | 'recall'; // Recall at K

/**
 * Available statistical tests.
 */
export type StatisticalTestType =
  | 'paired-t' // Paired t-test
  | 'wilcoxon' // Wilcoxon signed-rank test
  | 'bootstrap'; // Bootstrap confidence interval

/**
 * Method configuration for comparison experiments.
 */
export interface MethodConfig<N extends Node, E extends Edge> {
  /** Unique name for this method */
  name: string;

  /** Path ranking function */
  ranker: PathRanker<N, E>;

  /** Optional parameters for the ranker */
  params?: Record<string, unknown>;
}

/**
 * Complete experiment configuration.
 */
export interface ExperimentConfig<N extends Node, E extends Edge> {
  /** Experiment name/identifier */
  name: string;

  /** Description of what's being tested */
  description?: string;

  /** Number of experiment repetitions (for statistical robustness) */
  repetitions: number;

  /** Path planting configuration */
  pathPlanting: PlantedPathConfig<N, E>;

  /** Methods to compare */
  methods: MethodConfig<N, E>[];

  /** Metrics to compute */
  metrics: MetricType[];

  /** Statistical tests to run */
  statisticalTests: StatisticalTestType[];

  /** Significance level for statistical tests (default: 0.05) */
  alpha?: number;

  /** Number of bootstrap samples (default: 10000) */
  nBootstrap?: number;

  /** Random seed for reproducibility */
  seed: number;

  /** Optional: Cross-validation folds (default: no cross-validation) */
  crossValidationFolds?: number;
}

/**
 * Graph specification for experiment.
 *
 * Defines what type of graph to use for experiments.
 */
export interface GraphSpec {
  /** Graph type identifier */
  type: string;

  /** Number of nodes */
  nodeCount: number;

  /** Edge probability (for random graphs) */
  edgeProbability?: number;

  /** Number of communities (for community-structured graphs) */
  communities?: number;

  /** Whether graph is directed */
  directed?: boolean;

  /** Whether graph is weighted */
  weighted?: boolean;

  /** Optional seed for deterministic graph generation */
  seed?: number;
}

/**
 * Full experiment configuration with graph specs.
 */
export interface FullExperimentConfig<N extends Node, E extends Edge> {
  /** Base experiment configuration */
  experiment: ExperimentConfig<N, E>;

  /** Graph specifications to test */
  graphSpecs: GraphSpec[];

  /** Number of instances per graph spec (default: 1) */
  instancesPerSpec?: number;
}
