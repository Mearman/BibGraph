/**
 * Shortest path ranking baseline
 */

import type { RankedPath } from '@bibgraph/algorithms';
import type { Path } from '@bibgraph/algorithms';
import type { Edge, Node } from '@bibgraph/types';

/**
 * Rank paths by length (shortest first).
 * Standard baseline for path finding.
 *
 * @param paths - Paths to rank
 * @returns Paths sorted by length (ascending)
 */
export const shortestPathRanker = <N extends Node, E extends Edge>(paths: Path<N, E>[]): RankedPath<N, E>[] => {
  // Calculate scores (inverse of length so shorter paths have higher scores)
  const pathScores = paths.map((path) => {
    const length = path.edges.length;

    // Score = 1 / (length + 1) to avoid division by zero
    // Shorter paths get higher scores
    const score = 1.0 / (length + 1);

    return {
      path,
      score,
      geometricMeanMI: 0, // No MI computation for shortest path baseline
      edgeMIValues: [],
    };
  });

  // Sort by score descending (shortest paths first)
  pathScores.sort((a, b) => b.score - a.score);

  return pathScores;
};
