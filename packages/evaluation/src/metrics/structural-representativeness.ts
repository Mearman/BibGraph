/**
 * Structural Representativeness Metrics
 *
 * Compares sampled subgraphs against ground truth between-graphs
 * to measure how well expansion strategies preserve graph structure.
 */

import { klDivergence, jsDivergence, computeDegreeDistribution } from './degree-distribution';

/**
 * Result of structural representativeness comparison.
 */
export interface StructuralRepresentativenessResult {
  /** Coverage: |Sampled ∩ Ground Truth| / |Ground Truth| */
  coverage: number;

  /** Precision: |Sampled ∩ Ground Truth| / |Sampled| */
  precision: number;

  /** F1 score: 2 * (precision * coverage) / (precision + coverage) */
  f1Score: number;

  /** KL divergence of degree distributions */
  degreeKL: number;

  /** Jensen-Shannon divergence (symmetric) */
  degreeJS: number;

  /** Spearman correlation of betweenness centrality rankings */
  betweennessCorrelation: number;

  /** Fraction of ground truth communities with at least one sampled node */
  communityCoverage: number;

  /** Number of nodes in intersection */
  intersectionSize: number;

  /** Number of nodes in sampled but not in ground truth */
  falsePositives: number;

  /** Number of nodes in ground truth but not in sampled */
  falseNegatives: number;
}

/**
 * Compute set overlap metrics between sampled and ground truth node sets.
 *
 * @param sampledNodes - Nodes discovered by expansion method
 * @param groundTruthNodes - Nodes in ground truth between-graph
 * @returns Coverage, precision, and F1 score
 */
export function computeSetOverlap(
  sampledNodes: Set<string>,
  groundTruthNodes: Set<string>
): { coverage: number; precision: number; f1Score: number; intersection: number } {
  if (groundTruthNodes.size === 0) {
    return { coverage: 0, precision: 0, f1Score: 0, intersection: 0 };
  }

  let intersectionSize = 0;
  for (const node of sampledNodes) {
    if (groundTruthNodes.has(node)) {
      intersectionSize++;
    }
  }

  const coverage = intersectionSize / groundTruthNodes.size;
  const precision = sampledNodes.size > 0 ? intersectionSize / sampledNodes.size : 0;
  const f1Score =
    precision + coverage > 0 ? (2 * precision * coverage) / (precision + coverage) : 0;

  return { coverage, precision, f1Score, intersection: intersectionSize };
}

/**
 * Compute Spearman rank correlation between two rankings.
 *
 * @param ranking1 - First ranking (node ID -> rank)
 * @param ranking2 - Second ranking (node ID -> rank)
 * @param commonNodes - Set of nodes to compare (intersection)
 * @returns Spearman correlation coefficient in [-1, 1]
 */
export function spearmanRankCorrelation(
  ranking1: Map<string, number>,
  ranking2: Map<string, number>,
  commonNodes: Set<string>
): number {
  if (commonNodes.size < 2) {
    return 0;
  }

  const nodes = [...commonNodes];
  const n = nodes.length;

  // Get ranks for common nodes
  const ranks1: number[] = [];
  const ranks2: number[] = [];

  for (const node of nodes) {
    ranks1.push(ranking1.get(node) ?? 0);
    ranks2.push(ranking2.get(node) ?? 0);
  }

  // Compute Spearman correlation
  // rho = 1 - (6 * sum(d^2)) / (n * (n^2 - 1))
  // where d = difference in ranks

  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = ranks1[i] - ranks2[i];
    sumD2 += d * d;
  }

  const rho = 1 - (6 * sumD2) / (n * (n * n - 1));
  return rho;
}

/**
 * Convert degree map to betweenness-like ranking.
 *
 * Since computing true betweenness centrality is expensive,
 * we use degree as a proxy (highly correlated in most networks).
 *
 * @param degrees - Map from node ID to degree
 * @returns Map from node ID to rank (1 = highest degree)
 */
export function degreeToRanking(degrees: Map<string, number>): Map<string, number> {
  const entries = [...degrees.entries()].sort((a, b) => b[1] - a[1]);
  const ranking = new Map<string, number>();

  for (let i = 0; i < entries.length; i++) {
    ranking.set(entries[i][0], i + 1);
  }

  return ranking;
}

/**
 * Compute community coverage.
 *
 * @param sampledNodes - Nodes discovered by expansion
 * @param communities - Array of community node sets
 * @returns Fraction of communities with at least one sampled node
 */
export function computeCommunityCoverage(
  sampledNodes: Set<string>,
  communities: Array<Set<string>>
): number {
  if (communities.length === 0) {
    return 0;
  }

  let coveredCommunities = 0;
  for (const community of communities) {
    const hasSampledNode = [...community].some((node) => sampledNodes.has(node));
    if (hasSampledNode) {
      coveredCommunities++;
    }
  }

  return coveredCommunities / communities.length;
}

/**
 * Compute comprehensive structural representativeness metrics.
 *
 * @param sampledNodes - Nodes discovered by expansion method
 * @param groundTruthNodes - Nodes in ground truth between-graph
 * @param sampledDegrees - Degrees of sampled nodes
 * @param groundTruthDegrees - Degrees of ground truth nodes
 * @param communities - Optional community partition for coverage metric
 * @returns Complete representativeness metrics
 */
export function computeStructuralRepresentativeness(
  sampledNodes: Set<string>,
  groundTruthNodes: Set<string>,
  sampledDegrees: Map<string, number>,
  groundTruthDegrees: Map<string, number>,
  communities: Array<Set<string>> = []
): StructuralRepresentativenessResult {
  // Set overlap metrics
  const overlap = computeSetOverlap(sampledNodes, groundTruthNodes);

  // Degree distribution comparison
  const sampledDegreeArray = [...sampledDegrees.values()];
  const gtDegreeArray = [...groundTruthDegrees.values()];

  const sampledDist = computeDegreeDistribution(sampledDegreeArray);
  const gtDist = computeDegreeDistribution(gtDegreeArray);

  const degreeKL = klDivergence(gtDist, sampledDist);
  const degreeJS = jsDivergence(gtDist, sampledDist);

  // Betweenness correlation (using degree as proxy)
  const commonNodes = new Set<string>();
  for (const node of sampledNodes) {
    if (groundTruthNodes.has(node)) {
      commonNodes.add(node);
    }
  }

  const sampledRanking = degreeToRanking(sampledDegrees);
  const gtRanking = degreeToRanking(groundTruthDegrees);
  const betweennessCorrelation = spearmanRankCorrelation(sampledRanking, gtRanking, commonNodes);

  // Community coverage
  const communityCoverage = computeCommunityCoverage(sampledNodes, communities);

  // Count false positives and negatives
  let falsePositives = 0;
  for (const node of sampledNodes) {
    if (!groundTruthNodes.has(node)) {
      falsePositives++;
    }
  }

  let falseNegatives = 0;
  for (const node of groundTruthNodes) {
    if (!sampledNodes.has(node)) {
      falseNegatives++;
    }
  }

  return {
    coverage: overlap.coverage,
    precision: overlap.precision,
    f1Score: overlap.f1Score,
    degreeKL,
    degreeJS,
    betweennessCorrelation,
    communityCoverage,
    intersectionSize: overlap.intersection,
    falsePositives,
    falseNegatives,
  };
}

/**
 * Aggregate representativeness results across multiple seed pairs.
 *
 * @param results - Array of individual representativeness results
 * @returns Averaged metrics
 */
export function aggregateRepresentativenessResults(
  results: StructuralRepresentativenessResult[]
): StructuralRepresentativenessResult {
  if (results.length === 0) {
    return {
      coverage: 0,
      precision: 0,
      f1Score: 0,
      degreeKL: 0,
      degreeJS: 0,
      betweennessCorrelation: 0,
      communityCoverage: 0,
      intersectionSize: 0,
      falsePositives: 0,
      falseNegatives: 0,
    };
  }

  const n = results.length;

  return {
    coverage: results.reduce((s, r) => s + r.coverage, 0) / n,
    precision: results.reduce((s, r) => s + r.precision, 0) / n,
    f1Score: results.reduce((s, r) => s + r.f1Score, 0) / n,
    degreeKL: results.reduce((s, r) => s + r.degreeKL, 0) / n,
    degreeJS: results.reduce((s, r) => s + r.degreeJS, 0) / n,
    betweennessCorrelation: results.reduce((s, r) => s + r.betweennessCorrelation, 0) / n,
    communityCoverage: results.reduce((s, r) => s + r.communityCoverage, 0) / n,
    intersectionSize: results.reduce((s, r) => s + r.intersectionSize, 0) / n,
    falsePositives: results.reduce((s, r) => s + r.falsePositives, 0) / n,
    falseNegatives: results.reduce((s, r) => s + r.falseNegatives, 0) / n,
  };
}
