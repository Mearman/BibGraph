/**
 * Evaluation types for MI experiment framework
 */

/**
 * Result of a single property validation.
 */
export interface PropertyValidationResult {
  /** Property name being validated */
  property: string;
  /** Expected value */
  expected: string;
  /** Actual value */
  actual: string;
  /** Whether validation passed */
  valid: boolean;
  /** Optional error message */
  message?: string;
}

/**
 * Complete evaluation results for a single experiment.
 *
 * Note: The experiment runner uses flexible metric storage (Record<string, number>)
 * to support different metric combinations without rigid schema requirements.
 */
export interface EvaluationResult {
  /** Spearman's ρ correlation */
  spearman: number;

  /** Kendall's τ correlation */
  kendall: number;

  /** NDCG at various cutoffs */
  ndcg: {
    at5: number;
    at10: number;
    at20: number;
    full: number;
  };

  /** Mean Average Precision */
  map: number;

  /** Mean Reciprocal Rank */
  mrr: number;

  /** Precision/Recall at K */
  precision: { at5: number; at10: number; at20: number };
  recall: { at5: number; at10: number; at20: number };
}

/**
 * Flexible metric results storage.
 * Used by experiment runner for dynamic metric collection.
 */
export type MetricResults = Record<string, number>;

/**
 * Comparison between methods.
 */
export interface MethodComparison {
  method: string;
  results: MetricResults;
  runtime: number;
}

/**
 * Statistical test result.
 */
export interface StatisticalTestResult {
  type: string;
  comparison: string;
  pValue: number;
  significant: boolean;
  statistic?: number;
  ci?: { lower: number; upper: number };
}

/**
 * Full experiment report.
 */
export interface ExperimentReport {
  name: string;
  graphSpec: string;
  methods: MethodComparison[];
  statisticalTests: StatisticalTestResult[];
  winner: string;
  timestamp: string;
  duration?: number;
}
