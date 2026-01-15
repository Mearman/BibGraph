/**
 * Rank correlation metrics for evaluation
 */

/**
 * Spearman's rank correlation coefficient.
 * Measures monotonic relationship between predicted and ground truth rankings.
 *
 * @param predicted - Predicted ranking (array of item IDs in rank order)
 * @param groundTruth - Ground truth ranking (array of item IDs in rank order)
 * @returns ρ ∈ [-1, 1], where 1 = perfect agreement, -1 = perfect disagreement
 */
export function spearmanCorrelation(
  predicted: string[],
  groundTruth: string[]
): number {
  if (predicted.length === 0 || groundTruth.length === 0) {
    return 0;
  }

  // Create rank mappings
  const predictedRanks = new Map(predicted.map((id, index) => [id, index]));
  const groundTruthRanks = new Map(groundTruth.map((id, index) => [id, index]));

  // Get common items
  const commonItems = predicted.filter(id => groundTruthRanks.has(id));

  if (commonItems.length === 0) {
    return 0;
  }

  const n = commonItems.length;

  // Calculate rank differences
  let sumSquaredDifferences = 0;
  for (const item of commonItems) {
    const predictedRank = predictedRanks.get(item)!;
    const groundTruthRank = groundTruthRanks.get(item)!;
    const difference = predictedRank - groundTruthRank;
    sumSquaredDifferences += difference * difference;
  }

  // Spearman's ρ = 1 - (6Σd²) / (n(n² - 1))
  const denominator = n * (n * n - 1);
  if (denominator === 0) {
    return 1; // Perfect correlation when n=1
  }

  return 1 - (6 * sumSquaredDifferences) / denominator;
}

/**
 * Kendall's tau rank correlation.
 * Counts concordant vs discordant pairs.
 *
 * @param predicted - Predicted ranking
 * @param groundTruth - Ground truth ranking
 * @returns τ ∈ [-1, 1]
 */
export function kendallTau(
  predicted: string[],
  groundTruth: string[]
): number {
  // Empty rankings are trivially perfectly correlated
  if ((predicted.length === 0 && groundTruth.length === 0)) {
    return 1;
  }

  if (predicted.length === 0 || groundTruth.length === 0) {
    return 0;
  }

  // Create rank mappings
  const predictedRanks = new Map(predicted.map((id, index) => [id, index]));
  const groundTruthRanks = new Map(groundTruth.map((id, index) => [id, index]));

  // Get common items
  const commonItems = predicted.filter(id => groundTruthRanks.has(id));

  if (commonItems.length < 2) {
    return 1; // Perfect correlation when 0 or 1 items
  }

  let concordant = 0;
  let discordant = 0;

  // Compare all pairs
  for (let i = 0; i < commonItems.length; i++) {
    for (let j = i + 1; j < commonItems.length; j++) {
      const item1 = commonItems[i];
      const item2 = commonItems[j];

      const predictedRank1 = predictedRanks.get(item1)!;
      const predictedRank2 = predictedRanks.get(item2)!;
      const groundTruthRank1 = groundTruthRanks.get(item1)!;
      const groundTruthRank2 = groundTruthRanks.get(item2)!;

      const predictedOrder = predictedRank1 < predictedRank2 ? -1 : 1;
      const groundTruthOrder = groundTruthRank1 < groundTruthRank2 ? -1 : 1;

      if (predictedOrder === groundTruthOrder) {
        concordant++;
      } else {
        discordant++;
      }
    }
  }

  const total = concordant + discordant;
  if (total === 0) {
    return 1; // Perfect correlation when no discordant pairs
  }

  // Kendall's τ = (concordant - discordant) / total
  return (concordant - discordant) / total;
}
