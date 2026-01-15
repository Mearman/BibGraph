/**
 * Effect size measures for statistical significance
 */

/**
 * Cohen's d effect size.
 *
 * Standardized mean difference measures the magnitude of difference
 * between two groups in units of standard deviation.
 *
 * Interpretation (Cohen's conventions):
 * - |d| < 0.2: Small effect
 * - 0.2 ≤ |d| < 0.5: Medium effect
 * - 0.5 ≤ |d| < 0.8: Large effect
 * - |d| ≥ 0.8: Very large effect
 *
 * @param group1 - Samples from group 1
 * @param group2 - Samples from group 2
 * @returns Effect size and interpretation category
 *
 * @example
 * ```typescript
 * const treatment = [8, 9, 7, 8, 10];
 * const control = [5, 6, 5, 6, 7];
 * const result = cohensD(treatment, control);
 * console.log(result.effectSize); // e.g., 1.8 (very large effect)
 * console.log(result.interpretation); // 'very-large'
 * ```
 */
export function cohensD(group1: number[], group2: number[]): {
  effectSize: number;
  interpretation: 'negligible' | 'small' | 'medium' | 'large' | 'very-large';
  magnitude: number;
} {
  if (group1.length < 2 || group2.length < 2) {
    throw new Error('Cohen\'s d requires at least 2 samples per group');
  }

  // Calculate means
  const mean1 = group1.reduce((sum, x) => sum + x, 0) / group1.length;
  const mean2 = group2.reduce((sum, x) => sum + x, 0) / group2.length;

  // Calculate pooled standard deviation
  const variance1 = group1.reduce((sum, x) => sum + (x - mean1) ** 2, 0) / (group1.length - 1);
  const variance2 = group2.reduce((sum, x) => sum + (x - mean2) ** 2, 0) / (group2.length - 1);

  const pooledVariance =
    ((group1.length - 1) * variance1 + (group2.length - 1) * variance2) /
    (group1.length + group2.length - 2);

  const pooledStdDev = Math.sqrt(pooledVariance);

  // Calculate Cohen's d
  const effectSize = pooledStdDev === 0 ? 0 : (mean1 - mean2) / pooledStdDev;

  // Interpret effect size magnitude (Cohen's conventions)
  const absD = Math.abs(effectSize);
  let interpretation: 'negligible' | 'small' | 'medium' | 'large' | 'very-large';

  if (absD < 0.2) {
    interpretation = 'negligible';
  } else if (absD < 0.5) {
    interpretation = 'small';
  } else if (absD < 0.8) {
    interpretation = 'medium';
  } else {
    interpretation = 'very-large';
  }

  return {
    effectSize,
    interpretation,
    magnitude: absD,
  };
}

/**
 * Cliff's delta (non-parametric effect size).
 *
 * Measures dominance between two groups without assuming normal distribution.
 * Based on probability that a randomly selected value from group1 exceeds
 * a randomly selected value from group2.
 *
 * Interpretation:
 * - |δ| < 0.147: Negligible
 * - 0.147 ≤ |δ| < 0.33: Small
 * - 0.33 ≤ |δ| < 0.474: Medium
 * - |δ| ≥ 0.474: Large
 *
 * @param group1 - Samples from group 1
 * @param group2 - Samples from group 2
 * @returns Effect size and interpretation
 *
 * @example
 * ```typescript
 * const treatment = [8, 9, 7, 8, 10];
 * const control = [5, 6, 5, 6, 7];
 * const result = cliffsDelta(treatment, control);
 * console.log(result.effectSize); // e.g., 0.92 (large effect)
 * console.log(result.interpretation); // 'large'
 * console.log(result.probability);  // e.g., 0.96 (96% chance treatment > control)
 * ```
 */
export function cliffsDelta(group1: number[], group2: number[]): {
  effectSize: number;
  interpretation: 'negligible' | 'small' | 'medium' | 'large';
  probability: number;
  magnitude: number;
} {
  if (group1.length === 0 || group2.length === 0) {
    throw new Error('Cliff\'s delta requires at least 1 sample per group');
  }

  // Count comparisons where group1 > group2
  let greater = 0;
  let less = 0;

  for (const x of group1) {
    for (const y of group2) {
      if (x > y) {
        greater++;
      } else if (x < y) {
        less++;
      }
    }
  }

  // Calculate Cliff's delta
  const total = group1.length * group2.length;
  const effectSize = total === 0 ? 0 : (greater - less) / total;

  // Probability that group1 > group2
  const probability = total === 0 ? 0.5 : greater / total;

  // Interpret effect size (Romano's conventions)
  const absDelta = Math.abs(effectSize);
  let interpretation: 'negligible' | 'small' | 'medium' | 'large';

  if (absDelta < 0.147) {
    interpretation = 'negligible';
  } else if (absDelta < 0.33) {
    interpretation = 'small';
  } else if (absDelta < 0.474) {
    interpretation = 'medium';
  } else {
    interpretation = 'large';
  }

  return {
    effectSize,
    interpretation,
    probability,
    magnitude: absDelta,
  };
}

/**
 * Glass's delta (alternative to Cohen's d).
 *
 * Uses standard deviation of control group only instead of pooled SD.
 * Useful when treatment group variance is expected to differ from control.
 *
 * @param treatment - Samples from treatment group
 * @param control - Samples from control group (used for SD normalization)
 * @returns Effect size and interpretation
 *
 * @example
 * ```typescript
 * const treatment = [8, 9, 7, 8, 10];
 * const control = [5, 6, 5, 6, 7];
 * const result = glassDelta(treatment, control);
 * console.log(result.effectSize); // e.g., 1.8
 * ```
 */
export function glassDelta(treatment: number[], control: number[]): {
  effectSize: number;
  interpretation: 'negligible' | 'small' | 'medium' | 'large' | 'very-large';
} {
  if (treatment.length < 2 || control.length < 2) {
    throw new Error('Glass\'s delta requires at least 2 samples per group');
  }

  // Calculate means
  const meanTreatment = treatment.reduce((sum, x) => sum + x, 0) / treatment.length;
  const meanControl = control.reduce((sum, x) => sum + x, 0) / control.length;

  // Calculate control group standard deviation
  const variance = control.reduce((sum, x) => sum + (x - meanControl) ** 2, 0) / (control.length - 1);
  const controlStdDev = Math.sqrt(variance);

  // Calculate Glass's delta
  const effectSize = controlStdDev === 0 ? 0 : (meanTreatment - meanControl) / controlStdDev;

  // Interpret effect size magnitude
  const absD = Math.abs(effectSize);
  let interpretation: 'negligible' | 'small' | 'medium' | 'large' | 'very-large';

  if (absD < 0.2) {
    interpretation = 'negligible';
  } else if (absD < 0.5) {
    interpretation = 'small';
  } else if (absD < 0.8) {
    interpretation = 'medium';
  } else {
    interpretation = 'very-large';
  }

  return { effectSize, interpretation };
}

/**
 * Rank-biserial correlation (non-parametric effect size).
 *
 * Based on Mann-Whitney U test. Measures relationship between group
 * membership and rank ordering.
 *
 * Interpretation similar to Cliff's delta.
 *
 * @param group1 - Samples from group 1
 * @param group2 - Samples from group 2
 * @returns Effect size, correlation coefficient, and interpretation
 *
 * @example
 * ```typescript
 * const group1 = [8, 9, 7, 8, 10];
 * const group2 = [5, 6, 5, 6, 7];
 * const result = rankBiserialCorrelation(group1, group2);
 * console.log(result.correlation); // e.g., 0.85 (strong positive correlation)
 * console.log(result.effectSize);  // e.g., 0.70 (large effect)
 * ```
 */
export function rankBiserialCorrelation(group1: number[], group2: number[]): {
  effectSize: number;
  correlation: number;
  interpretation: 'negligible' | 'small' | 'medium' | 'large';
} {
  if (group1.length === 0 || group2.length === 0) {
    throw new Error('Rank-biserial correlation requires at least 1 sample per group');
  }

  // Combine and rank all values
  const combined = [
    ...group1.map(x => ({ value: x, group: 1 })),
    ...group2.map(x => ({ value: x, group: 2 })),
  ];

  // Sort by value
  combined.sort((a, b) => a.value - b.value);

  // Assign ranks (handle ties by average rank)
  const ranks: number[] = [];
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j]!.value === combined[i]!.value) {
      j++;
    }

    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks.push(avgRank);
    }

    i = j;
  }

  // Calculate sum of ranks for group 1
  let r1 = 0;
  let idx = 0;
  for (const item of combined) {
    if (item.group === 1) {
      r1 += ranks[idx]!;
    }
    idx++;
  }

  const n1 = group1.length;
  const n2 = group2.length;
  const n = n1 + n2;

  // Expected rank sum under null hypothesis
  const expectedR1 = n1 * (n + 1) / 2;

  // Maximum possible rank sum
  const maxR1 = n1 * (2 * n - n1 + 1) / 2;

  // Rank-biserial correlation
  const numerator = 2 * (r1 - expectedR1);
  const denominator = n1 * n2;

  const correlation = denominator === 0 ? 0 : numerator / denominator;

  // Effect size (absolute correlation)
  const effectSize = Math.abs(correlation);

  // Interpret
  let interpretation: 'negligible' | 'small' | 'medium' | 'large';
  if (effectSize < 0.147) {
    interpretation = 'negligible';
  } else if (effectSize < 0.33) {
    interpretation = 'small';
  } else if (effectSize < 0.474) {
    interpretation = 'medium';
  } else {
    interpretation = 'large';
  }

  return {
    effectSize,
    correlation,
    interpretation,
  };
}
