/**
 * Conductance calculation for cluster quality measurement.
 * Measures the ratio of boundary edges to cluster volume.
 * @module metrics/conductance
 */

import type { Graph } from '../graph/graph';
import type { Edge,Node } from '../types/graph';

/**
 * Calculate conductance for a cluster/community.
 *
 * Conductance formula:
 * φ(S) = |cut(S)| / min(vol(S), vol(V\S))
 *
 * Where:
 * - cut(S) = number of edges crossing the boundary of S
 * - vol(S) = sum of degrees of nodes in S
 * - V\S = complement of S (nodes not in S)
 *
 * Range: [0.0, 1.0]
 * - Lower values indicate better cluster quality (fewer boundary edges)
 * - φ < 0.1 typically indicates strong cluster cohesion
 * - φ > 0.5 indicates weak cluster structure
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param clusterNodes - Set of nodes in the cluster
 * @returns Conductance score in range [0.0, 1.0]
 * @example
 * ```typescript
 * const graph = new Graph<string, Edge>(false);
 * // ... build graph ...
 * const cluster = new Set(['A', 'B', 'C']);
 * const conductance = calculateConductance(graph, cluster);
 * console.log(`Conductance: ${conductance.toFixed(3)}`); // e.g., "Conductance: 0.125"
 * ```
 */
export const calculateConductance = <N extends Node, E extends Edge>(graph: Graph<N, E>, clusterNodes: Set<N>): number => {
  // Handle edge cases
  if (clusterNodes.size === 0) {
    return 0;
  }

  if (clusterNodes.size === graph.getNodeCount()) {
    // Entire graph is the cluster - no boundary edges
    return 0;
  }

  // Calculate cut(S) - edges crossing cluster boundary
  let cut = 0;
  // Calculate vol(S) - sum of degrees within cluster
  let volS = 0;
  // Calculate vol(V\S) - sum of degrees outside cluster
  let volComplement = 0;

  const allNodes = graph.getAllNodes();

  allNodes.forEach((node) => {
    const nodeId = node.id;
    const neighborsResult = graph.getNeighbors(nodeId);

    if (!neighborsResult.ok) {
      return; // Skip nodes with no neighbors
    }

    const neighbors = neighborsResult.value;
    const degree = neighbors.length;

    // Check if node is in cluster
    const nodeInCluster = [...clusterNodes].some((clusterNode) => {
      return clusterNode.id === nodeId;
    });

    if (nodeInCluster) {
      // Node is in cluster
      volS += degree;

      // Count edges crossing boundary (to nodes outside cluster)
      neighbors.forEach((neighborId) => {
        const neighborInCluster = [...clusterNodes].some((clusterNode) => {
          return clusterNode.id === neighborId;
        });

        if (!neighborInCluster) {
          cut++;
        }
      });
    } else {
      // Node is outside cluster
      volComplement += degree;
    }
  });

  // Note: We only count cut edges from the cluster side (lines 85-94),
  // so there's no double-counting even for undirected graphs.
  // No division needed.

  // Conductance = cut(S) / min(vol(S), vol(V\S))
  const denominator = Math.min(volS, volComplement);

  if (denominator === 0) {
    // Isolated cluster with no edges
    return 0;
  }

  const conductance = cut / denominator;

  // Clamp to [0, 1] range due to floating point precision
  return Math.max(0, Math.min(1, conductance));
};

/**
 * Calculate average conductance across multiple clusters.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param clusters - Array of node sets representing clusters
 * @returns Average conductance score
 * @example
 * ```typescript
 * const clusters = [
 *   new Set(['A', 'B', 'C']),
 *   new Set(['D', 'E', 'F']),
 *   new Set(['G', 'H', 'I'])
 * ];
 * const avgConductance = calculateAverageConductance(graph, clusters);
 * ```
 */
export const calculateAverageConductance = <N extends Node, E extends Edge>(graph: Graph<N, E>, clusters: Set<N>[]): number => {
  if (clusters.length === 0) {
    return 0;
  }

  let totalConductance = 0;

  clusters.forEach((cluster) => {
    const conductance = calculateConductance(graph, cluster);
    totalConductance += conductance;
  });

  return totalConductance / clusters.length;
};

/**
 * Calculate weighted average conductance (weighted by cluster size).
 *
 * Larger clusters have more influence on the average.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param clusters - Array of node sets representing clusters
 * @returns Weighted average conductance score
 * @example
 * ```typescript
 * const clusters = [
 *   new Set(['A', 'B', 'C']),      // size 3
 *   new Set(['D', 'E']),           // size 2
 *   new Set(['F', 'G', 'H', 'I'])  // size 4
 * ];
 * const weightedAvg = calculateWeightedAverageConductance(graph, clusters);
 * ```
 */
export const calculateWeightedAverageConductance = <N extends Node, E extends Edge>(graph: Graph<N, E>, clusters: Set<N>[]): number => {
  if (clusters.length === 0) {
    return 0;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  clusters.forEach((cluster) => {
    const conductance = calculateConductance(graph, cluster);
    const weight = cluster.size;

    weightedSum += conductance * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) {
    return 0;
  }

  return weightedSum / totalWeight;
};
