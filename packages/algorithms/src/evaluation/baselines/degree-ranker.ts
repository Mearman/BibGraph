/**
 * Degree-based path ranking baseline
 */

import type { Graph } from '../..';
import type { RankedPath } from '../..';
import type { Path } from '../..';
import type { Edge, Node } from '@bibgraph/types';

/**
 * Rank paths by sum of node degrees along path.
 * Prefers paths through high-degree hubs.
 *
 * @param graph - Graph to analyse
 * @param paths - Paths to rank
 * @returns Paths sorted by total degree (descending)
 */
export const degreeBasedRanker = <N extends Node, E extends Edge>(graph: Graph<N, E>, paths: Path<N, E>[]): RankedPath<N, E>[] => {
  // Calculate total degree for each path
  const pathScores = paths.map((path) => {
    let totalDegree = 0;

    for (const node of path.nodes) {
      const neighborsResult = graph.getNeighbors(node.id);
      const degree = neighborsResult.ok ? neighborsResult.value.length : 0;
      totalDegree += degree;
    }

    // Normalize by path length to avoid bias toward longer paths
    const avgDegree = path.nodes.length > 0 ? totalDegree / path.nodes.length : 0;

    return {
      path,
      score: avgDegree,
      geometricMeanMI: 0, // No MI computation for degree baseline
      edgeMIValues: [],
    };
  });

  // Sort by average degree descending
  pathScores.sort((a, b) => b.score - a.score);

  return pathScores;
};
