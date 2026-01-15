/**
 * Bootstrap confidence intervals and significance testing
 */

/**
 * Bootstrap confidence interval for a metric.
 *
 * Uses resampling with replacement to estimate the sampling distribution
 * of a statistic and calculate confidence intervals.
 *
 * @param samples - Observed metric values
 * @param confidence - Confidence level (default: 0.95 for 95% CI)
 * @param nBootstrap - Number of bootstrap samples (default: 10000)
 * @param seed - Random seed for reproducibility (optional)
 * @returns Lower and upper bounds of CI and mean estimate
 *
 * @example
 * ```typescript
 * const scores = [0.82, 0.85, 0.78, 0.90, 0.87, 0.83, 0.86, 0.89, 0.84, 0.88];
 * const ci = bootstrapCI(scores, 0.95, 10000, 42);
 * console.log(ci.lower); // e.g., 0.82
 * console.log(ci.upper); // e.g., 0.88
 * console.log(ci.mean);  // e.g., 0.85
 * ```
 */
export const bootstrapCI = (samples: number[], confidence: number = 0.95, nBootstrap: number = 10000, seed?: number): { lower: number; upper: number; mean: number } => {
  if (samples.length < 2) {
    throw new Error('Bootstrap requires at least 2 samples');
  }

  if (confidence <= 0 || confidence >= 1) {
    throw new Error('Confidence level must be between 0 and 1');
  }

  const rng = new SeededRandom(seed ?? Date.now());

  // Calculate observed mean
  const observedMean = samples.reduce((sum, x) => sum + x, 0) / samples.length;

  // Resample with replacement and calculate statistic
  const bootstrapMeans: number[] = [];
  for (let i = 0; i < nBootstrap; i++) {
    const resample: number[] = [];
    for (let j = 0; j < samples.length; j++) {
      const idx = Math.floor(rng.nextDouble() * samples.length);
      resample.push(samples[idx]!);
    }

    const mean = resample.reduce((sum, x) => sum + x, 0) / resample.length;
    bootstrapMeans.push(mean);
  }

  // Sort bootstrap means for percentile calculation
  bootstrapMeans.sort((a, b) => a - b);

  // Calculate percentile indices
  const alpha = 1 - confidence;
  const lowerIndex = Math.floor((alpha / 2) * nBootstrap);
  const upperIndex = Math.ceil((1 - alpha / 2) * nBootstrap) - 1;

  const lower = bootstrapMeans[lowerIndex]!;
  const upper = bootstrapMeans[upperIndex]!;

  return { lower, upper, mean: observedMean };
};

/**
 * Bootstrap test for significant difference between methods.
 *
 * Tests whether the difference between two methods is statistically
 * significant by bootstrapping the distribution of differences.
 *
 * @param method1Samples - Samples from method 1
 * @param method2Samples - Samples from method 2
 * @param nBootstrap - Number of bootstrap samples (default: 10000)
 * @param alpha - Significance level (default: 0.05)
 * @param seed - Random seed for reproducibility (optional)
 * @returns p-value, mean difference, and confidence interval for difference
 *
 * @example
 * ```typescript
 * const miScores = [0.85, 0.82, 0.88, 0.90, 0.87];
 * const baselineScores = [0.65, 0.70, 0.68, 0.72, 0.69];
 * const result = bootstrapDifferenceTest(miScores, baselineScores, 10000, 0.05, 42);
 * console.log(result.pValue);        // e.g., 0.002 (significant)
 * console.log(result.meanDifference); // e.g., 0.17
 * console.log(result.ci.lower);       // e.g., 0.12
 * console.log(result.ci.upper);       // e.g., 0.22
 * ```
 */
export const bootstrapDifferenceTest = (method1Samples: number[], method2Samples: number[], nBootstrap: number = 10000, alpha: number = 0.05, seed?: number): {
  pValue: number;
  meanDifference: number;
  ci: { lower: number; upper: number };
  significant: boolean;
} => {
  if (method1Samples.length < 2 || method2Samples.length < 2) {
    throw new Error('Both methods require at least 2 samples');
  }

  const rng = new SeededRandom(seed ?? Date.now());

  // Calculate observed mean difference
  const mean1 = method1Samples.reduce((sum, x) => sum + x, 0) / method1Samples.length;
  const mean2 = method2Samples.reduce((sum, x) => sum + x, 0) / method2Samples.length;
  const observedDifference = mean1 - mean2;

  // Bootstrap the difference
  const bootstrapDifferences: number[] = [];
  for (let i = 0; i < nBootstrap; i++) {
    // Resample from method 1
    const resample1: number[] = [];
    for (let j = 0; j < method1Samples.length; j++) {
      const idx = Math.floor(rng.nextDouble() * method1Samples.length);
      resample1.push(method1Samples[idx]!);
    }

    // Resample from method 2
    const resample2: number[] = [];
    for (let j = 0; j < method2Samples.length; j++) {
      const idx = Math.floor(rng.nextDouble() * method2Samples.length);
      resample2.push(method2Samples[idx]!);
    }

    // Calculate difference of means
    const bootMean1 = resample1.reduce((sum, x) => sum + x, 0) / resample1.length;
    const bootMean2 = resample2.reduce((sum, x) => sum + x, 0) / resample2.length;
    bootstrapDifferences.push(bootMean1 - bootMean2);
  }

  // Sort for percentile calculation
  bootstrapDifferences.sort((a, b) => a - b);

  // Calculate confidence interval for difference
  const lowerIndex = Math.floor((alpha / 2) * nBootstrap);
  const upperIndex = Math.ceil((1 - alpha / 2) * nBootstrap) - 1;

  const ci = {
    lower: bootstrapDifferences[lowerIndex]!,
    upper: bootstrapDifferences[upperIndex]!,
  };

  // Calculate p-value (proportion of bootstrap differences <= 0 or >= 2*observed)
  // Simplified two-tailed test
  const countZeroOrLess = bootstrapDifferences.filter(d => d <= 0).length;
  const countTwiceObservedOrMore = bootstrapDifferences.filter(d => d >= 2 * observedDifference).length;

  // Two-tailed p-value
  const pValue = Math.min(
    2 * countZeroOrLess / nBootstrap,
    2 * countTwiceObservedOrMore / nBootstrap
  );

  // Significant if CI doesn't include 0
  const significant = ci.lower > 0 || ci.upper < 0;

  return {
    pValue,
    meanDifference: observedDifference,
    ci,
    significant,
  };
};

/**
 * Seeded random number generator for reproducible bootstrapping.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Generate random number in [0, 1).
   */
  nextDouble(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}
