/**
 * Information Retrieval evaluation metrics
 */

interface ItemWithRelevance {
  id: string;
  relevance: number;
}

/**
 * Calculate Discounted Cumulative Gain at position k.
 *
 * DCG@k = rel₁ + Σ(reli / log₂(i)) for i from 2 to k
 *
 * @param items - Items sorted by rank with relevance scores
 * @param k - Cutoff position
 * @returns DCG@k score
 */
const dcgAtK = (items: ItemWithRelevance[], k: number): number => {
  const discounted = items.slice(0, k);
  let sum = 0;

  for (let i = 0; i < discounted.length; i++) {
    const position = i + 1;
    if (position === 1) {
      sum += discounted[i]!.relevance;
    } else {
      sum += discounted[i]!.relevance / Math.log2(position);
    }
  }

  return sum;
};

/**
 * Normalized Discounted Cumulative Gain.
 * Measures ranking quality with position-based discounting.
 *
 * @param predicted - Predicted ranking with relevance scores
 * @param groundTruth - Ideal ranking (sorted by true relevance)
 * @param k - Cutoff position (default: all items)
 * @returns NDCG@k ∈ [0, 1], where 1 = perfect ranking
 */
export const ndcg = (predicted: Array<{ id: string; relevance: number }>, groundTruth: Array<{ id: string; relevance: number }>, k?: number): number => {
  if (predicted.length === 0 || groundTruth.length === 0) {
    return 0;
  }

  const cutoff = k ?? predicted.length;
  const predictedDCG = dcgAtK(predicted, cutoff);
  const idealDCG = dcgAtK(groundTruth, cutoff);

  if (idealDCG === 0) {
    return 1; // Perfect ranking when no relevant items
  }

  return predictedDCG / idealDCG;
};

/**
 * Mean Average Precision.
 * Average of precision at each relevant item position.
 *
 * @param predicted - Predicted ranking (item IDs)
 * @param relevantItems - Set of relevant item IDs
 * @returns MAP ∈ [0, 1]
 */
export const meanAveragePrecision = (predicted: string[], relevantItems: Set<string>): number => {
  if (predicted.length === 0 || relevantItems.size === 0) {
    return 0;
  }

  let precisionSum = 0;
  let relevantCount = 0;

  for (let i = 0; i < predicted.length; i++) {
    const item = predicted[i]!;
    if (relevantItems.has(item)) {
      relevantCount++;
      const position = i + 1;
      const precisionAtPosition = relevantCount / position;
      precisionSum += precisionAtPosition;
    }
  }

  if (relevantCount === 0) {
    return 0;
  }

  return precisionSum / relevantCount;
};

/**
 * Mean Reciprocal Rank.
 * Reciprocal of rank of first relevant item.
 *
 * @param predicted - Predicted ranking (item IDs)
 * @param relevantItems - Set of relevant item IDs
 * @returns MRR ∈ [0, 1]
 */
export const meanReciprocalRank = (predicted: string[], relevantItems: Set<string>): number => {
  if (predicted.length === 0 || relevantItems.size === 0) {
    return 0;
  }

  for (let i = 0; i < predicted.length; i++) {
    const item = predicted[i]!;
    if (relevantItems.has(item)) {
      const rank = i + 1;
      return 1 / rank;
    }
  }

  return 0; // No relevant items found
};

/**
 * Precision at K.
 * Fraction of top-K items that are relevant.
 *
 * @param predicted - Predicted ranking (item IDs)
 * @param relevantItems - Set of relevant item IDs
 * @param k - Cutoff position
 * @returns P@K ∈ [0, 1]
 */
export const precisionAtK = (predicted: string[], relevantItems: Set<string>, k: number): number => {
  if (predicted.length === 0 || relevantItems.size === 0 || k <= 0) {
    return 0;
  }

  const topK = predicted.slice(0, Math.min(k, predicted.length));
  const relevantInTopK = topK.filter(item => relevantItems.has(item)).length;

  return relevantInTopK / k;
};

/**
 * Recall at K.
 * Fraction of relevant items in top-K.
 *
 * @param predicted - Predicted ranking (item IDs)
 * @param relevantItems - Set of relevant item IDs
 * @param k - Cutoff position
 * @returns R@K ∈ [0, 1]
 */
export const recallAtK = (predicted: string[], relevantItems: Set<string>, k: number): number => {
  if (predicted.length === 0 || relevantItems.size === 0 || k <= 0) {
    return 0;
  }

  const topK = predicted.slice(0, Math.min(k, predicted.length));
  const relevantInTopK = topK.filter(item => relevantItems.has(item)).length;

  return relevantInTopK / relevantItems.size;
};
