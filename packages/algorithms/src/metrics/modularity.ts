/**
 * Modularity calculation for community detection algorithms.
 * Implements the Newman-Girvan modularity formula.
 * @module metrics/modularity
 */

import type { Graph } from '../graph/graph';
import type { Community } from '../types/clustering-types';
import type { Edge,Node } from '../types/graph';

/**
 * Calculate modularity (Q) for a graph partitioned into communities.
 *
 * Newman-Girvan formula:
 * Q = 1/(2m) * Σ[A_ij - (k_i * k_j)/(2m)] * δ(c_i, c_j)
 *
 * Where:
 * - m = total number of edges
 * - A_ij = 1 if edge exists between i and j, 0 otherwise
 * - k_i = degree of node i
 * - k_j = degree of node j
 * - δ(c_i, c_j) = 1 if nodes i and j are in the same community, 0 otherwise
 *
 * Range: [-0.5, 1.0]
 * - Higher values indicate stronger community structure
 * - Q > 0.3 typically indicates significant community structure
 * - Q < 0 indicates worse than random partitioning
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param communities - Community assignments
 * @returns Modularity score in range [-0.5, 1.0]
 * @example
 * ```typescript
 * const graph = new Graph<string, Edge>(false);
 * // ... build graph ...
 * const communities: Community<string>[] = [...];
 * const Q = calculateModularity(graph, communities);
 * console.log(`Modularity: ${Q.toFixed(3)}`); // e.g., "Modularity: 0.427"
 * ```
 */
export const calculateModularity = <N extends Node, E extends Edge>(graph: Graph<N, E>, communities: Community<N>[]): number => {
  const m = graph.getEdgeCount();

  // Handle edge case: empty graph or no edges
  if (m === 0) {
    return 0;
  }

  // Build community membership map: nodeId -> communityId
  const nodeToCommunity = new Map<string, number>();
  communities.forEach((community) => {
    community.nodes.forEach((node) => {
      // Extract node ID from node object
      nodeToCommunity.set(node.id, community.id);
    });
  });

  // Calculate degree for each node
  const degrees = new Map<string, number>();
  const allNodes = graph.getAllNodes();
  allNodes.forEach((node) => {
    const neighborsResult = graph.getNeighbors(node.id);
    if (neighborsResult.ok) {
      degrees.set(node.id, neighborsResult.value.length);
    } else {
      degrees.set(node.id, 0);
    }
  });

  // Calculate modularity using Newman-Girvan formula
  let Q = 0;
  const twoM = 2 * m;

  // For directed graphs: iterate over all pairs
  // For undirected graphs: iterate over unique pairs (i, j) where i <= j
  if (graph.isDirected()) {
    allNodes.forEach((nodeI) => {
      allNodes.forEach((nodeJ) => {
        // Check if nodes are in the same community
        const communityI = nodeToCommunity.get(nodeI.id);
        const communityJ = nodeToCommunity.get(nodeJ.id);

        // δ(c_i, c_j) - Kronecker delta (1 if same community, 0 otherwise)
        if (communityI === undefined || communityJ === undefined) {
          return; // Skip nodes not assigned to any community
        }

        if (communityI !== communityJ) {
          return; // Different communities, contribution is 0
        }

        // A_ij - adjacency matrix value (1 if edge exists, 0 otherwise)
        const neighborsResult = graph.getNeighbors(nodeI.id);
        const A_ij = neighborsResult.ok &&
                     neighborsResult.value.includes(nodeJ.id) ? 1 : 0;

        // k_i and k_j - degrees
        const k_i = degrees.get(nodeI.id) || 0;
        const k_j = degrees.get(nodeJ.id) || 0;

        // Expected number of edges under null model
        const expected = (k_i * k_j) / twoM;

        // Contribution to modularity
        Q += A_ij - expected;
      });
    });
  } else {
    // Undirected graph: iterate over unique pairs and count self-loops once
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i; j < allNodes.length; j++) {
        const nodeI = allNodes[i];
        const nodeJ = allNodes[j];

        // Check if nodes are in the same community
        const communityI = nodeToCommunity.get(nodeI.id);
        const communityJ = nodeToCommunity.get(nodeJ.id);

        // δ(c_i, c_j) - Kronecker delta (1 if same community, 0 otherwise)
        if (communityI === undefined || communityJ === undefined) {
          continue; // Skip nodes not assigned to any community
        }

        if (communityI !== communityJ) {
          continue; // Different communities, contribution is 0
        }

        // A_ij - adjacency matrix value (1 if edge exists, 0 otherwise)
        const neighborsResult = graph.getNeighbors(nodeI.id);
        const A_ij = neighborsResult.ok &&
                     neighborsResult.value.includes(nodeJ.id) ? 1 : 0;

        // k_i and k_j - degrees
        const k_i = degrees.get(nodeI.id) || 0;
        const k_j = degrees.get(nodeJ.id) || 0;

        // Expected number of edges under null model
        const expected = (k_i * k_j) / twoM;

        // Contribution to modularity (multiply by 2 for non-diagonal elements)
        const weight = (i === j) ? 1 : 2;
        Q += weight * (A_ij - expected);
      }
    }
  }

  // Normalize by 2m
  Q /= twoM;

  return Q;
};

/**
 * Calculate modularity contribution for a single community.
 *
 * Used for incremental modularity updates during optimization.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph
 * @param community - Community to evaluate
 * @param totalEdges - Total number of edges in graph
 * @returns Modularity contribution of this community
 * @example
 * ```typescript
 * const m = graph.getEdgeCount();
 * const contribution = calculateCommunityModularity(graph, community, m);
 * ```
 */
export const calculateCommunityModularity = <N extends Node, E extends Edge>(graph: Graph<N, E>, community: Community<N>, totalEdges: number): number => {
  if (totalEdges === 0) {
    return 0;
  }

  const twoM = 2 * totalEdges;
  let Q_c = 0;

  // Calculate degrees for nodes in this community
  const degrees = new Map<N, number>();
  community.nodes.forEach((nodeId) => {
    const nodeIdStr = typeof nodeId === 'string' ? nodeId : String(nodeId);
    const neighborsResult = graph.getNeighbors(nodeIdStr);
    if (neighborsResult.ok) {
      degrees.set(nodeId, neighborsResult.value.length);
    } else {
      degrees.set(nodeId, 0);
    }
  });

  // Iterate over pairs within the community
  const nodesArray = [...community.nodes];

  if (graph.isDirected()) {
    // Directed: iterate over all pairs
    nodesArray.forEach((nodeI) => {
      nodesArray.forEach((nodeJ) => {
        const nodeIStr = typeof nodeI === 'string' ? nodeI : String(nodeI);
        const nodeJStr = typeof nodeJ === 'string' ? nodeJ : String(nodeJ);

        // A_ij - check if nodes are neighbors
        const neighborsResult = graph.getNeighbors(nodeIStr);
        const A_ij = neighborsResult.ok &&
                     neighborsResult.value.includes(nodeJStr) ? 1 : 0;

        // k_i and k_j
        const k_i = degrees.get(nodeI) || 0;
        const k_j = degrees.get(nodeJ) || 0;

        // Expected edges under null model
        const expected = (k_i * k_j) / twoM;

        // Contribution
        Q_c += A_ij - expected;
      });
    });
  } else {
    // Undirected: iterate over unique pairs
    for (let i = 0; i < nodesArray.length; i++) {
      for (let j = i; j < nodesArray.length; j++) {
        const nodeI = nodesArray[i];
        const nodeJ = nodesArray[j];
        const nodeIStr = typeof nodeI === 'string' ? nodeI : String(nodeI);
        const nodeJStr = typeof nodeJ === 'string' ? nodeJ : String(nodeJ);

        // A_ij - check if nodes are neighbors
        const neighborsResult = graph.getNeighbors(nodeIStr);
        const A_ij = neighborsResult.ok &&
                     neighborsResult.value.includes(nodeJStr) ? 1 : 0;

        // k_i and k_j
        const k_i = degrees.get(nodeI) || 0;
        const k_j = degrees.get(nodeJ) || 0;

        // Expected edges under null model
        const expected = (k_i * k_j) / twoM;

        // Contribution (multiply by 2 for non-diagonal elements)
        const weight = (i === j) ? 1 : 2;
        Q_c += weight * (A_ij - expected);
      }
    }
  }

  // Normalize
  Q_c /= twoM;

  return Q_c;
};

/**
 * Calculate modularity delta for moving a node between communities.
 *
 * Used by Louvain and Leiden algorithms for greedy optimization.
 *
 * ΔQ = [Σin + k_i_in] / (2m) - [(Σtot + k_i)² / (2m)²] - [Σin / (2m) - (Σtot / (2m))² - (k_i / (2m))²]
 * @param k_i - Degree of node being moved
 * @param k_i_in - Sum of edge weights from node to nodes in target community
 * @param sigma_tot - Sum of degrees of nodes in target community
 * @param sigma_in - Sum of edge weights between nodes in target community
 * @param m - Total number of edges in graph
 * @returns Change in modularity (positive means improvement)
 * @example
 * ```typescript
 * const deltaQ = calculateModularityDelta(5, 3, 20, 15, 100);
 * if (deltaQ > 0) {
 *   // Moving node improves modularity
 * }
 * ```
 */
export const calculateModularityDelta = (k_i: number, k_i_in: number, sigma_tot: number, sigma_in: number, m: number): number => {
  const twoM = 2 * m;

  // Modularity after move
  const Q_after =
    (sigma_in + k_i_in) / twoM -
    Math.pow((sigma_tot + k_i) / twoM, 2);

  // Modularity before move
  const Q_before =
    sigma_in / twoM -
    Math.pow(sigma_tot / twoM, 2) -
    Math.pow(k_i / twoM, 2);

  return Q_after - Q_before;
};
