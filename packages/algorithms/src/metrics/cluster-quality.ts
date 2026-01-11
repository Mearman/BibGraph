/**
 * Cluster quality metrics: density and aggregated ClusterMetrics.
 * Provides utilities for evaluating clustering quality.
 * @module metrics/cluster-quality
 */

import type { Graph } from '../graph/graph';
import type { ClusterMetrics,Community } from '../types/clustering-types';
import type { Edge,Node } from '../types/graph';
import { calculateAverageConductance } from './conductance';
import { calculateModularity } from './modularity';

/**
 * Calculate density for a cluster/community.
 *
 * Density formula:
 * density = actual_edges / possible_edges
 *
 * For undirected graphs:
 * - possible_edges = n * (n - 1) / 2
 *
 * For directed graphs:
 * - possible_edges = n * (n - 1)
 *
 * Where n is the number of nodes in the cluster.
 *
 * Range: [0.0, 1.0]
 * - 1.0 = complete graph (all possible edges present)
 * - 0.0 = no internal edges
 * - Higher density indicates tighter community structure
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param clusterNodes - Set of nodes in the cluster
 * @returns Density score in range [0.0, 1.0]
 * @example
 * ```typescript
 * const graph = new Graph<string, Edge>(false);
 * // ... build graph ...
 * const cluster = new Set(['A', 'B', 'C']);
 * const density = calculateDensity(graph, cluster);
 * console.log(`Density: ${density.toFixed(3)}`); // e.g., "Density: 0.667"
 * ```
 */
export const calculateDensity = <N extends Node, E extends Edge>(graph: Graph<N, E>, clusterNodes: Set<N>): number => {
  const n = clusterNodes.size;

  // Handle edge cases
  if (n === 0 || n === 1) {
    return 0; // No density for empty or single-node clusters
  }

  // Calculate possible edges
  const possibleEdges = graph.isDirected()
    ? n * (n - 1) // Directed: all ordered pairs
    : (n * (n - 1)) / 2; // Undirected: combinations

  // Count actual edges within cluster
  let actualEdges = 0;

  const nodesArray = [...clusterNodes];
  for (let i = 0; i < nodesArray.length; i++) {
    for (let j = i + 1; j < nodesArray.length; j++) {
      const nodeI = nodesArray[i];
      const nodeJ = nodesArray[j];

      // Check if edge exists in either direction
      const outgoingFromI = graph.getOutgoingEdges(nodeI.id);
      const outgoingFromJ = graph.getOutgoingEdges(nodeJ.id);

      let hasEdge = false;

      if (outgoingFromI.ok) {
        hasEdge = outgoingFromI.value.some(e => e.target === nodeJ.id);
      }

      if (!hasEdge && outgoingFromJ.ok && !graph.isDirected()) {
        // For undirected graphs, also check the reverse direction
        hasEdge = outgoingFromJ.value.some(e => e.target === nodeI.id);
      }

      if (hasEdge) {
        actualEdges++;
      }
    }
  }

  const density = actualEdges / possibleEdges;

  // Clamp to [0, 1] due to floating point precision
  return Math.max(0, Math.min(1, density));
};

/**
 * Calculate average density across multiple clusters.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param clusters - Array of node sets representing clusters
 * @returns Average density score
 * @example
 * ```typescript
 * const clusters = [
 *   new Set(['A', 'B', 'C']),
 *   new Set(['D', 'E', 'F'])
 * ];
 * const avgDensity = calculateAverageDensity(graph, clusters);
 * ```
 */
export const calculateAverageDensity = <N extends Node, E extends Edge>(graph: Graph<N, E>, clusters: Set<N>[]): number => {
  if (clusters.length === 0) {
    return 0;
  }

  let totalDensity = 0;

  clusters.forEach((cluster) => {
    const density = calculateDensity(graph, cluster);
    totalDensity += density;
  });

  return totalDensity / clusters.length;
};

/**
 * Calculate coverage ratio: fraction of edges within clusters vs. total edges.
 *
 * coverage = (edges within clusters) / (total edges in graph)
 *
 * Range: [0.0, 1.0]
 * - Higher coverage means most edges are within communities
 * - Lower coverage means many inter-community edges
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param clusters - Array of node sets representing clusters
 * @returns Coverage ratio
 * @example
 * ```typescript
 * const coverage = calculateCoverageRatio(graph, clusters);
 * console.log(`${(coverage * 100).toFixed(1)}% of edges are within clusters`);
 * ```
 */
export const calculateCoverageRatio = <N extends Node, E extends Edge>(graph: Graph<N, E>, clusters: Set<N>[]): number => {
  const totalEdges = graph.getEdgeCount();

  if (totalEdges === 0) {
    return 0;
  }

  // Count edges within clusters
  let internalEdges = 0;

  clusters.forEach((cluster) => {
    const nodesArray = [...cluster];

    for (let i = 0; i < nodesArray.length; i++) {
      for (let j = i + 1; j < nodesArray.length; j++) {
        const nodeI = nodesArray[i];
        const nodeJ = nodesArray[j];

        // Check if edge exists in either direction
        const outgoingFromI = graph.getOutgoingEdges(nodeI.id);
        const outgoingFromJ = graph.getOutgoingEdges(nodeJ.id);

        let hasEdge = false;

        if (outgoingFromI.ok) {
          hasEdge = outgoingFromI.value.some(e => e.target === nodeJ.id);
        }

        if (!hasEdge && outgoingFromJ.ok && !graph.isDirected()) {
          // For undirected graphs, also check the reverse direction
          hasEdge = outgoingFromJ.value.some(e => e.target === nodeI.id);
        }

        if (hasEdge) {
          internalEdges++;
        }
      }
    }
  });

  const coverage = internalEdges / totalEdges;

  return Math.max(0, Math.min(1, coverage));
};

/**
 * Calculate aggregated quality metrics for a clustering result.
 *
 * Computes modularity, average conductance, average density, coverage ratio,
 * and cluster count for a complete clustering.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param communities - Array of communities
 * @returns Aggregated ClusterMetrics
 * @example
 * ```typescript
 * const graph = new Graph<string, Edge>(false);
 * const communities: Community<string>[] = [...];
 * const metrics = calculateClusterMetrics(graph, communities);
 *
 * console.log(`Modularity: ${metrics.modularity.toFixed(3)}`);
 * console.log(`Avg Conductance: ${metrics.avgConductance.toFixed(3)}`);
 * console.log(`Avg Density: ${metrics.avgDensity.toFixed(3)}`);
 * console.log(`Coverage: ${(metrics.coverageRatio * 100).toFixed(1)}%`);
 * console.log(`Clusters: ${metrics.numClusters}`);
 * ```
 */
export const calculateClusterMetrics = <N extends Node, E extends Edge>(graph: Graph<N, E>, communities: Community<N>[]): ClusterMetrics => {
  // Extract node sets from communities
  const clusters = communities.map((c) => c.nodes);

  // Calculate metrics
  const modularity = calculateModularity(graph, communities);
  const avgConductance = calculateAverageConductance(graph, clusters);
  const avgDensity = calculateAverageDensity(graph, clusters);
  const coverageRatio = calculateCoverageRatio(graph, clusters);
  const numClusters = communities.length;

  return {
    modularity,
    avgConductance,
    avgDensity,
    numClusters,
    coverageRatio,
    // silhouetteCoefficient is optional, not computed here
  };
};

/**
 * Update ClusterMetrics with per-community density values.
 *
 * Modifies community objects to include their individual density scores.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param communities - Array of communities (modified in place)
 * @example
 * ```typescript
 * const communities: Community<string>[] = [...];
 * updateCommunityDensities(graph, communities);
 * // Now each community has updated 'density' field
 * ```
 */
export const updateCommunityDensities = <N extends Node, E extends Edge>(graph: Graph<N, E>, communities: Community<N>[]): void => {
  communities.forEach((community) => {
    community.density = calculateDensity(graph, community.nodes);
  });
};
