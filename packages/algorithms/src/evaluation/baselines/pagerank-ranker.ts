/**
 * PageRank-based path ranking baseline
 */

import type { Graph } from '../..';
import type { RankedPath } from '../..';
import type { Path } from '../..';
import type { Edge, Node } from '@bibgraph/types';

/**
 * Compute PageRank scores for all nodes in the graph.
 *
 * Uses power iteration method to compute stationary distribution
 * of the random walk with teleportation.
 *
 * @param graph - Graph to analyse
 * @param dampingFactor - Damping factor (default: 0.85)
 * @param maxIterations - Maximum iterations (default: 100)
 * @param tolerance - Convergence tolerance (default: 1e-6)
 * @returns Map of node ID to PageRank score
 */
const computePageRank = <N extends Node, E extends Edge>(graph: Graph<N, E>, dampingFactor: number = 0.85, maxIterations: number = 100, tolerance: number = 1e-6): Map<string, number> => {
  const nodes = graph.getAllNodes();
  const n = nodes.length;

  if (n === 0) {
    return new Map();
  }

  // Initialize PageRank scores uniformly
  const pageRank = new Map<string, number>();
  const nodeIds = nodes.map((node) => node.id);

  for (const nodeId of nodeIds) {
    pageRank.set(nodeId, 1.0 / n);
  }

  // Build adjacency list for efficient iteration
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();

  for (const edge of graph.getAllEdges()) {
    // Outgoing edges from source
    const out = outEdges.get(edge.source) ?? [];
    out.push(edge.target);
    outEdges.set(edge.source, out);

    // Incoming edges to target
    const incoming = inEdges.get(edge.target) ?? [];
    incoming.push(edge.source);
    inEdges.set(edge.target, incoming);
  }

  // Power iteration
  for (let iter = 0; iter < maxIterations; iter++) {
    const newPageRank = new Map<string, number>();
    let maxChange = 0;

    for (const nodeId of nodeIds) {
      // Get incoming neighbors
      const predecessors = inEdges.get(nodeId) ?? [];

      // Sum of PageRank from incoming edges
      let sumPR = 0;
      for (const pred of predecessors) {
        const predOutDegree = (outEdges.get(pred) ?? []).length;
        const predPR = pageRank.get(pred) ?? 0;

        if (predOutDegree > 0) {
          sumPR += predPR / predOutDegree;
        }
      }

      // PageRank formula: (1-d)/n + d * sum(PR_i / out_degree_i)
      const newPR = (1 - dampingFactor) / n + dampingFactor * sumPR;
      newPageRank.set(nodeId, newPR);

      // Track convergence
      const oldPR = pageRank.get(nodeId) ?? 0;
      const change = Math.abs(newPR - oldPR);
      maxChange = Math.max(maxChange, change);
    }

    // Update scores
    for (const [nodeId, score] of newPageRank.entries()) {
      pageRank.set(nodeId, score);
    }

    // Check convergence
    if (maxChange < tolerance) {
      break;
    }
  }

  return pageRank;
};

/**
 * Rank paths by sum of PageRank scores along path.
 * Prefers paths through important nodes.
 *
 * @param graph - Graph to analyse
 * @param paths - Paths to rank
 * @param dampingFactor - PageRank damping (default: 0.85)
 * @returns Paths sorted by total PageRank (descending)
 */
export const pageRankRanker = <N extends Node, E extends Edge>(graph: Graph<N, E>, paths: Path<N, E>[], dampingFactor?: number): RankedPath<N, E>[] => {
  // Compute PageRank for all nodes
  const pageRank = computePageRank(graph, dampingFactor);

  // Calculate total PageRank for each path
  const pathScores = paths.map((path) => {
    let totalPageRank = 0;

    for (const node of path.nodes) {
      const score = pageRank.get(node.id) ?? 0;
      totalPageRank += score;
    }

    // Normalize by path length
    const avgPageRank = path.nodes.length > 0 ? totalPageRank / path.nodes.length : 0;

    return {
      path,
      score: avgPageRank,
      geometricMeanMI: 0, // No MI computation for PageRank baseline
      edgeMIValues: [],
    };
  });

  // Sort by average PageRank descending
  pathScores.sort((a, b) => b.score - a.score);

  return pathScores;
};
