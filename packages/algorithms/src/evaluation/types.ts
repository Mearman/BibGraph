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
 * Comparison between methods.
 */
export interface MethodComparison {
  method: string;
  results: EvaluationResult;
  runtime: number;
}

/**
 * Statistical test result.
 */
export interface StatisticalTestResult {
  test: string;
  method1: string;
  method2: string;
  pValue: number;
  significant: boolean;
  effectSize?: number;
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
}
