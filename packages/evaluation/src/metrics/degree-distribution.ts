/**
 * Degree Distribution Metrics
 *
 * Compares degree distributions between sampled subgraphs and ground truth graphs.
 * Used to measure structural representativeness of sampling methods.
 */

/**
 * Compute degree distribution as a normalized histogram.
 *
 * @param degrees - Array of degree values
 * @returns Map from degree to probability (sum = 1)
 */
export function computeDegreeDistribution(degrees: number[]): Map<number, number> {
  if (degrees.length === 0) {
    return new Map();
  }

  const counts = new Map<number, number>();
  for (const d of degrees) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  const total = degrees.length;
  const distribution = new Map<number, number>();
  for (const [degree, count] of counts) {
    distribution.set(degree, count / total);
  }

  return distribution;
}

/**
 * Compute KL divergence between two distributions.
 *
 * KL(P || Q) = Σ P(x) * log(P(x) / Q(x))
 *
 * Uses Laplace smoothing to handle zero probabilities.
 *
 * @param p - True distribution (what we want to approximate)
 * @param q - Approximate distribution (what we sampled)
 * @param smoothing - Laplace smoothing constant (default: 1e-10)
 * @returns KL divergence (non-negative, 0 = identical distributions)
 */
export function klDivergence(
  p: Map<number, number>,
  q: Map<number, number>,
  smoothing = 1e-10
): number {
  // Get all unique degrees from both distributions
  const allDegrees = new Set([...p.keys(), ...q.keys()]);

  let kl = 0;
  for (const degree of allDegrees) {
    const pVal = p.get(degree) ?? 0;
    const qVal = q.get(degree) ?? 0;

    // Apply smoothing
    const pSmoothed = pVal + smoothing;
    const qSmoothed = qVal + smoothing;

    if (pSmoothed > 0) {
      kl += pSmoothed * Math.log(pSmoothed / qSmoothed);
    }
  }

  return Math.max(0, kl); // Ensure non-negative due to floating point
}

/**
 * Compute Jensen-Shannon divergence (symmetric version of KL).
 *
 * JS(P, Q) = 0.5 * KL(P || M) + 0.5 * KL(Q || M)
 * where M = 0.5 * (P + Q)
 *
 * @param p - First distribution
 * @param q - Second distribution
 * @returns JS divergence in [0, log(2)] ≈ [0, 0.693]
 */
export function jsDivergence(p: Map<number, number>, q: Map<number, number>): number {
  // Get all unique degrees
  const allDegrees = new Set([...p.keys(), ...q.keys()]);

  // Compute mixture M = 0.5 * (P + Q)
  const m = new Map<number, number>();
  for (const degree of allDegrees) {
    const pVal = p.get(degree) ?? 0;
    const qVal = q.get(degree) ?? 0;
    m.set(degree, 0.5 * (pVal + qVal));
  }

  // JS = 0.5 * KL(P || M) + 0.5 * KL(Q || M)
  return 0.5 * klDivergence(p, m) + 0.5 * klDivergence(q, m);
}

/**
 * Compute Earth Mover's Distance (Wasserstein-1) for degree distributions.
 *
 * EMD measures the minimum "work" to transform one distribution into another.
 * For 1D distributions, this equals the integral of the absolute difference
 * between cumulative distribution functions.
 *
 * @param p - First distribution
 * @param q - Second distribution
 * @returns EMD (non-negative)
 */
export function earthMoversDistance(p: Map<number, number>, q: Map<number, number>): number {
  // Get all unique degrees and sort them
  const allDegrees = [...new Set([...p.keys(), ...q.keys()])].sort((a, b) => a - b);

  if (allDegrees.length === 0) {
    return 0;
  }

  // Compute CDFs
  let cdfP = 0;
  let cdfQ = 0;
  let emd = 0;

  for (let i = 0; i < allDegrees.length; i++) {
    const degree = allDegrees[i];
    cdfP += p.get(degree) ?? 0;
    cdfQ += q.get(degree) ?? 0;

    // Width to next degree (or 1 for last)
    const width = i < allDegrees.length - 1 ? allDegrees[i + 1] - degree : 1;
    emd += Math.abs(cdfP - cdfQ) * width;
  }

  return emd;
}

/**
 * Degree distribution comparison metrics.
 */
export interface DegreeDistributionMetrics {
  /** KL divergence from ground truth to sampled */
  klDivergence: number;

  /** Jensen-Shannon divergence (symmetric) */
  jsDivergence: number;

  /** Earth Mover's Distance */
  emd: number;

  /** Mean degree of sampled */
  sampledMeanDegree: number;

  /** Mean degree of ground truth */
  groundTruthMeanDegree: number;

  /** Standard deviation of sampled degrees */
  sampledStdDegree: number;

  /** Standard deviation of ground truth degrees */
  groundTruthStdDegree: number;

  /** Max degree in sampled */
  sampledMaxDegree: number;

  /** Max degree in ground truth */
  groundTruthMaxDegree: number;
}

/**
 * Compute comprehensive degree distribution comparison metrics.
 *
 * @param sampledDegrees - Degree values from sampled subgraph
 * @param groundTruthDegrees - Degree values from ground truth graph
 * @returns Complete comparison metrics
 */
export function compareDegreeDistributions(
  sampledDegrees: number[],
  groundTruthDegrees: number[]
): DegreeDistributionMetrics {
  const sampledDist = computeDegreeDistribution(sampledDegrees);
  const gtDist = computeDegreeDistribution(groundTruthDegrees);

  const mean = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const std = (arr: number[], m: number) =>
    arr.length > 0
      ? Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length)
      : 0;

  const sampledMean = mean(sampledDegrees);
  const gtMean = mean(groundTruthDegrees);

  return {
    klDivergence: klDivergence(gtDist, sampledDist),
    jsDivergence: jsDivergence(gtDist, sampledDist),
    emd: earthMoversDistance(gtDist, sampledDist),
    sampledMeanDegree: sampledMean,
    groundTruthMeanDegree: gtMean,
    sampledStdDegree: std(sampledDegrees, sampledMean),
    groundTruthStdDegree: std(groundTruthDegrees, gtMean),
    sampledMaxDegree: sampledDegrees.length > 0 ? Math.max(...sampledDegrees) : 0,
    groundTruthMaxDegree: groundTruthDegrees.length > 0 ? Math.max(...groundTruthDegrees) : 0,
  };
}

/**
 * Compute degree distribution from a graph's node degrees.
 *
 * @param nodeDegrees - Map from node ID to degree
 * @returns Normalized degree distribution
 */
export function degreeDistributionFromMap(nodeDegrees: Map<string, number>): Map<number, number> {
  return computeDegreeDistribution([...nodeDegrees.values()]);
}

/**
 * Compute degree histogram bucket counts (for visualization).
 *
 * @param degrees - Array of degree values
 * @returns Map from bucket label to count
 */
export function computeDegreeHistogram(degrees: number[]): Map<string, number> {
  const histogram = new Map<string, number>();
  const buckets = ['1-5', '6-10', '11-50', '51-100', '101-500', '501-1000', '1000+'];

  // Initialize all buckets
  for (const bucket of buckets) {
    histogram.set(bucket, 0);
  }

  for (const degree of degrees) {
    let bucket: string;
    if (degree <= 5) bucket = '1-5';
    else if (degree <= 10) bucket = '6-10';
    else if (degree <= 50) bucket = '11-50';
    else if (degree <= 100) bucket = '51-100';
    else if (degree <= 500) bucket = '101-500';
    else if (degree <= 1000) bucket = '501-1000';
    else bucket = '1000+';

    histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);
  }

  return histogram;
}
