/**
 * Expected results fixtures for MI evaluation experiments
 *
 * Defines expected performance thresholds for validating
 * the MI path ranking methodology against baselines
 */

/**
 * Expected result ranges for specific experiments
 */
export const EXPECTED_RESULTS = {
  /**
   * MI should significantly outperform random ranking
   */
  miVsRandomSmallCitation: {
    miSpearman: { min: 0.6, max: 1.0 },
    randomSpearman: { min: -0.2, max: 0.2 },
    pValue: { max: 0.05 },
    effectSize: { min: 0.8 }, // Large effect
  },

  /**
   * MI should outperform degree-based ranking on heterogeneous graphs
   * (MI captures more than just degree centrality)
   */
  miVsDegreeHeterogeneous: {
    miNDCG: { min: 0.7 },
    degreeNDCG: { max: 0.6 },
    miSpearman: { min: 0.5 },
    degreeSpearman: { max: 0.4 },
  },

  /**
   * MI should be competitive with PageRank on citation networks
   * (Both capture centrality, but MI uses edge weights)
   */
  miVsPageRankCitation: {
    miNDCG: { min: 0.7 },
    pagerankNDCG: { min: 0.65 },
    bothWithin: 0.15, // Difference should be < 0.15
  },

  /**
   * MI should detect strong signal paths with high accuracy
   */
  strongSignalDetection: {
    spearman: { min: 0.85 },
    ndcg: { min: 0.9 },
    map: { min: 0.8 },
    mrr: { min: 0.85 },
  },

  /**
   * MI should detect medium signal paths with moderate accuracy
   */
  mediumSignalDetection: {
    spearman: { min: 0.5 },
    ndcg: { min: 0.6 },
    map: { min: 0.5 },
    mrr: { min: 0.55 },
  },

  /**
   * MI should struggle with weak signal (but still better than random)
   */
  weakSignalDetection: {
    spearman: { min: 0.2, max: 0.5 },
    ndcg: { min: 0.3, max: 0.6 },
    betterThanRandom: true, // Should still beat random baseline
  },

  /**
   * Cross-validation should show low variance (reproducible results)
   */
  crossValidationStability: {
    spearmanStdDev: { max: 0.15 },
    ndcgStdDev: { max: 0.1 },
    allMethodsStable: true,
  },

  /**
   * Statistical tests should be significant for clear differences
   */
  statisticalSignificance: {
    miVsRandom: { pValue: { max: 0.01 }, significant: true },
    miVsDegree: { pValue: { max: 0.05 }, significant: true },
  },
} as const;

/**
 * Validate experiment results against expected thresholds
 */
export function validateResults(
  experimentName: keyof typeof EXPECTED_RESULTS,
  actualResults: Record<string, number>
): { valid: boolean; violations: string[] } {
  const expected = EXPECTED_RESULTS[experimentName];
  const violations: string[] = [];

  for (const [metric, threshold] of Object.entries(expected)) {
    const actualValue = actualResults[metric];

    if (actualValue === undefined) {
      violations.push(`Missing metric: ${metric}`);
      continue;
    }

    if (typeof threshold === 'object' && 'min' in threshold) {
      if ('min' in threshold && actualValue < threshold.min) {
        violations.push(`${metric}: ${actualValue} < ${threshold.min}`);
      }
      if ('max' in threshold && actualValue > threshold.max) {
        violations.push(`${metric}: ${actualValue} > ${threshold.max}`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Performance categories for interpreting effect sizes
 */
export const EFFECT_SIZE_CATEGORIES = {
  negligible: 0.01,
  small: 0.2,
  medium: 0.5,
  large: 0.8,
  veryLarge: 1.2,
} as const;

/**
 * Get effect size category
 */
export function getEffectSizeCategory(effectSize: number): string {
  if (effectSize < EFFECT_SIZE_CATEGORIES.small) return 'negligible';
  if (effectSize < EFFECT_SIZE_CATEGORIES.medium) return 'small';
  if (effectSize < EFFECT_SIZE_CATEGORIES.large) return 'medium';
  if (effectSize < EFFECT_SIZE_CATEGORIES.veryLarge) return 'large';
  return 'very-large';
}

/**
 * Performance benchmarks for different graph types
 */
export const GRAPH_TYPE_BENCHMARKS = {
  smallCitation: {
    minSpearman: 0.6,
    minNDCG: 0.7,
    expectedRuntime: { max: 1000 }, // ms
  },
  mediumCitation: {
    minSpearman: 0.5,
    minNDCG: 0.65,
    expectedRuntime: { max: 5000 }, // ms
  },
  heterogeneous: {
    minSpearman: 0.55,
    minNDCG: 0.68,
    expectedRuntime: { max: 2000 }, // ms
  },
  denseCommunity: {
    minSpearman: 0.7, // Should work well on community structure
    minNDCG: 0.75,
    expectedRuntime: { max: 3000 }, // ms
  },
  sparseRandom: {
    minSpearman: 0.4, // Harder on sparse graphs
    minNDCG: 0.5,
    expectedRuntime: { max: 1000 }, // ms
  },
} as const;

/**
 * Validate performance for specific graph type
 */
export function validateGraphTypePerformance(
  graphType: keyof typeof GRAPH_TYPE_BENCHMARKS,
  actualResults: { spearman: number; ndcg: number; runtime: number }
): { valid: boolean; violations: string[] } {
  const benchmark = GRAPH_TYPE_BENCHMARKS[graphType];
  const violations: string[] = [];

  if (actualResults.spearman < benchmark.minSpearman) {
    violations.push(
      `Spearman ${actualResults.spearman} < ${benchmark.minSpearman} (expected for ${graphType})`
    );
  }

  if (actualResults.ndcg < benchmark.minNDCG) {
    violations.push(`NDCG ${actualResults.ndcg} < ${benchmark.minNDCG} (expected for ${graphType})`);
  }

  if (actualResults.runtime > benchmark.expectedRuntime.max) {
    violations.push(
      `Runtime ${actualResults.runtime}ms > ${benchmark.expectedRuntime.max}ms (expected for ${graphType})`
    );
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
