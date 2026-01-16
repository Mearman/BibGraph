/**
 * Weight-based path ranking baseline
 */

import type { RankedPath } from '@bibgraph/algorithms';
import type { Path } from '@bibgraph/algorithms';
import type { Edge, Node } from '@bibgraph/types';

/**
 * Rank paths by sum of edge weights.
 * For weighted graphs only.
 *
 * @param paths - Paths to rank
 * @param weightFn - Function to extract weight from edge
 * @returns Paths sorted by total weight (descending)
 */
export const weightBasedRanker = <N extends Node, E extends Edge>(paths: Path<N, E>[], weightFn: (edge: E) => number): RankedPath<N, E>[] => {
  // Calculate total weight for each path
  const pathScores = paths.map((path) => {
    let totalWeight = 0;

    for (const edge of path.edges) {
      const weight = weightFn(edge);
      totalWeight += weight;
    }

    // Normalize by path length
    const avgWeight = path.edges.length > 0 ? totalWeight / path.edges.length : 0;

    return {
      path,
      score: avgWeight,
      geometricMeanMI: 0, // No MI computation for weight baseline
      edgeMIValues: [],
    };
  });

  // Sort by average weight descending
  pathScores.sort((a, b) => b.score - a.score);

  return pathScores;
};
