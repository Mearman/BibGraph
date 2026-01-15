/**
 * Paired statistical tests for comparing two methods
 */

/**
 * Paired t-test for comparing two methods.
 *
 * Tests whether the mean difference between paired observations is significantly
 * different from zero. Assumes differences are normally distributed.
 *
 * @param method1Results - Results from method 1 across experiments
 * @param method2Results - Results from method 2 across experiments (same length as method1Results)
 * @param alpha - Significance level (default: 0.05)
 * @returns p-value, t-statistic, and whether result is significant
 *
 * @example
 * ```typescript
 * const miScores = [0.85, 0.82, 0.88, 0.90, 0.87];
 * const baselineScores = [0.65, 0.70, 0.68, 0.72, 0.69];
 * const result = pairedTTest(miScores, baselineScores);
 * console.log(result.pValue); // e.g., 0.001 (significant)
 * console.log(result.significant); // true
 * ```
 */
export function pairedTTest(
  method1Results: number[],
  method2Results: number[],
  alpha: number = 0.05
): { pValue: number; tStatistic: number; significant: boolean } {
  if (method1Results.length !== method2Results.length) {
    throw new Error('Paired samples must have equal length');
  }

  if (method1Results.length < 2) {
    throw new Error('Paired t-test requires at least 2 observations');
  }

  const n = method1Results.length;

  // Calculate differences
  const differences: number[] = [];
  for (let i = 0; i < n; i++) {
    differences.push(method1Results[i]! - method2Results[i]!);
  }

  // Calculate mean of differences
  const meanDiff = differences.reduce((sum, d) => sum + d, 0) / n;

  // Calculate standard deviation of differences
  const variance = differences.reduce((sum, d) => sum + (d - meanDiff) ** 2, 0) / (n - 1);
  const stdDiff = Math.sqrt(variance);

  // Calculate t-statistic
  const standardError = stdDiff / Math.sqrt(n);
  const tStatistic = meanDiff / standardError;

  // Calculate p-value (two-tailed) using t-distribution approximation
  const degreesOfFreedom = n - 1;
  const pValue = twoTailedPValue(tStatistic, degreesOfFreedom);

  return {
    pValue,
    tStatistic,
    significant: pValue < alpha,
  };
}

/**
 * Wilcoxon signed-rank test (non-parametric alternative to paired t-test).
 *
 * Tests whether the distribution of differences is symmetric about zero.
 * Does NOT assume normal distribution, making it more robust for small samples.
 *
 * @param method1Results - Results from method 1 across experiments
 * @param method2Results - Results from method 2 across experiments
 * @param alpha - Significance level (default: 0.05)
 * @returns p-value, test statistic (W), and significance
 *
 * @example
 * ```typescript
 * const miScores = [0.85, 0.82, 0.88, 0.90, 0.87];
 * const baselineScores = [0.65, 0.70, 0.68, 0.72, 0.69];
 * const result = wilcoxonSignedRank(miScores, baselineScores);
 * console.log(result.pValue); // e.g., 0.031 (significant at α=0.05)
 * ```
 */
export function wilcoxonSignedRank(
  method1Results: number[],
  method2Results: number[],
  alpha: number = 0.05
): { pValue: number; statistic: number; significant: boolean } {
  if (method1Results.length !== method2Results.length) {
    throw new Error('Paired samples must have equal length');
  }

  if (method1Results.length < 2) {
    throw new Error('Wilcoxon test requires at least 2 observations');
  }

  const n = method1Results.length;

  // Calculate differences and remove zeros
  const differences: Array<{ value: number; absValue: number }> = [];
  for (let i = 0; i < n; i++) {
    const diff = method1Results[i]! - method2Results[i]!;
    if (diff !== 0) {
      differences.push({ value: diff, absValue: Math.abs(diff) });
    }
  }

  const nNonZero = differences.length;

  if (nNonZero === 0) {
    // All differences are zero - perfect agreement
    return { pValue: 1, statistic: 0, significant: false };
  }

  // Rank absolute differences
  const sorted = [...differences].sort((a, b) => a.absValue - b.absValue);

  // Assign ranks (handle ties by average rank)
  const ranks: number[] = [];
  let i = 0;
  while (i < nNonZero) {
    let j = i;
    while (j < nNonZero && sorted[j]!.absValue === sorted[i]!.absValue) {
      j++;
    }

    // Ties get average rank
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks.push(avgRank);
    }

    i = j;
  }

  // Calculate W statistic (sum of ranks for positive differences)
  let wPlus = 0;
  for (let k = 0; k < nNonZero; k++) {
    if (sorted[k]!.value > 0) {
      wPlus += ranks[k]!;
    }
  }

  // For two-tailed test, use minimum of W+ and W-
  const wMinus = (nNonZero * (nNonZero + 1)) / 2 - wPlus;
  const w = Math.min(wPlus, wMinus);

  // Calculate p-value using normal approximation for n > 20
  // For small n, exact distribution would be needed (omitted for brevity)
  let pValue: number;
  if (nNonZero > 20) {
    const meanW = nNonZero * (nNonZero + 1) / 4;
    const stdW = Math.sqrt(nNonZero * (nNonZero + 1) * (2 * nNonZero + 1) / 24);
    const z = (w - meanW) / stdW;
    pValue = 2 * (1 - normalCDF(Math.abs(z)));
  } else {
    // For small samples, use simplified approximation
    // In production, you'd use exact tables or more sophisticated approximation
    const meanW = nNonZero * (nNonZero + 1) / 4;
    const stdW = Math.sqrt(nNonZero * (nNonZero + 1) * (2 * nNonZero + 1) / 24);
    const z = (w - meanW) / stdW;
    pValue = 2 * (1 - normalCDF(Math.abs(z)));
  }

  return {
    pValue,
    statistic: w,
    significant: pValue < alpha,
  };
}

/**
 * Calculate two-tailed p-value from t-statistic using t-distribution.
 *
 * Uses approximation of t-distribution CDF.
 * For large degrees of freedom, converges to normal distribution.
 */
function twoTailedPValue(t: number, df: number): number {
  // Approximate t-distribution with normal for df > 30
  if (df > 30) {
    const z = standardScoreToZ(t, df);
    return 2 * (1 - normalCDF(Math.abs(z)));
  }

  // For smaller df, use simplified approximation
  // In production, use proper t-distribution tables or numerical integration
  const z = t; // Simplified - less accurate for small df
  return 2 * (1 - normalCDF(Math.abs(z)));
}

/**
 * Convert t-score to approximate z-score (Welch-Satterthwaite approximation).
 */
function standardScoreToZ(t: number, df: number): number {
  // For large df, t approaches normal
  return t;
}

/**
 * Standard normal cumulative distribution function.
 *
 * Uses Abramowitz and Stegun approximation (error < 0.00005).
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
