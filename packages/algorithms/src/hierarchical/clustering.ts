/**
 * Hierarchical clustering algorithm implementation.
 * Builds dendrogram using agglomerative clustering with various linkage methods.
 *
 * Algorithm:
 * 1. Start with each node as a singleton cluster
 * 2. Compute pairwise distance matrix from graph adjacency
 * 3. Repeatedly merge the two closest clusters
 * 4. Update distance matrix using linkage method
 * 5. Repeat until all clusters merged into one
 *
 * Time Complexity: O(n³) for naive implementation, O(n² log n) with optimizations
 * Space Complexity: O(n²) for distance matrix
 * @module hierarchical/clustering
 */

import type { Graph } from '../graph/graph';
import type {
  Dendrogram,
  HierarchicalResult,
  MergeStep,
} from '../types/clustering-types';
import type { Edge,Node } from '../types/graph';
import { Err,Ok } from '../types/result';

/**
 * Linkage method for computing cluster-to-cluster distances.
 */
type LinkageMethod = 'single' | 'complete' | 'average';

/**
 * Distance matrix for efficient lookup.
 * Stored as upper triangular matrix (i < j).
 */
class DistanceMatrix {
  private distances: Map<string, number>;
  private n: number;

  constructor(n: number) {
    this.distances = new Map();
    this.n = n;
  }

  /**
   * Get distance between clusters i and j.
   * @param i
   * @param j
   */
  get(i: number, j: number): number {
    if (i === j) return 0;
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    return this.distances.get(key) ?? Infinity;
  }

  /**
   * Set distance between clusters i and j.
   * @param i
   * @param j
   * @param distance
   */
  set(i: number, j: number, distance: number): void {
    if (i === j) return;
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    this.distances.set(key, distance);
  }

  /**
   * Find the pair of clusters with minimum distance.
   * Returns [i, j, distance] where i < j.
   * @param activeClusters
   */
  findMinimum(activeClusters: Set<number>): [number, number, number] | undefined {
    let minI = -1;
    let minJ = -1;
    let minDist = Infinity;

    const clusters = [...activeClusters];
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = this.get(clusters[i], clusters[j]);
        if (dist < minDist) {
          minDist = dist;
          minI = clusters[i];
          minJ = clusters[j];
        }
      }
    }

    return minI >= 0 && minJ >= 0 ? [minI, minJ, minDist] : undefined;
  }
}

/**
 * Build adjacency matrix from graph (1.0 if edge exists, 0.0 otherwise).
 * For undirected graphs, matrix is symmetric.
 * For directed graphs, treats as undirected (combines both directions).
 * @param graph
 * @param nodeIndexMap
 */
const buildAdjacencyMatrix = <N extends Node, E extends Edge>(graph: Graph<N, E>, nodeIndexMap: Map<string, number>): number[][] => {
  const n = nodeIndexMap.size;
  const adjMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  // Set diagonal to 1 (node is adjacent to itself)
  for (let i = 0; i < n; i++) {
    adjMatrix[i][i] = 1;
  }

  // Fill adjacency from edges
  const edges = graph.getAllEdges();
  edges.forEach((edge) => {
    const sourceIdx = nodeIndexMap.get(edge.source);
    const targetIdx = nodeIndexMap.get(edge.target);

    if (sourceIdx !== undefined && targetIdx !== undefined) {
      adjMatrix[sourceIdx][targetIdx] = 1;

      // For undirected graphs or treating directed as undirected
      if (!graph.isDirected()) {
        adjMatrix[targetIdx][sourceIdx] = 1;
      }
    }
  });

  return adjMatrix;
};

/**
 * Compute initial distance matrix from adjacency matrix.
 * Distance = 1.0 - adjacency (0 if connected, 1 if not connected).
 * @param adjMatrix
 */
const computeDistanceMatrix = (adjMatrix: number[][]): DistanceMatrix => {
  const n = adjMatrix.length;
  const distMatrix = new DistanceMatrix(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Distance = 1 - adjacency (0 if edge exists, 1 if no edge)
      const distance = 1 - adjMatrix[i][j];
      distMatrix.set(i, j, distance);
    }
  }

  return distMatrix;
};

/**
 * Update distance matrix after merging two clusters.
 * Uses linkage method to compute new distances.
 * @param distMatrix
 * @param merged
 * @param cluster1
 * @param cluster2
 * @param activeClusters
 * @param linkage
 * @param clusterSizes
 */
const updateDistances = (distMatrix: DistanceMatrix, merged: number, cluster1: number, cluster2: number, activeClusters: Set<number>, linkage: LinkageMethod, clusterSizes: Map<number, number>): void => {
  const size1 = clusterSizes.get(cluster1) ?? 1;
  const size2 = clusterSizes.get(cluster2) ?? 1;

  activeClusters.forEach((k) => {
    if (k === merged) return;

    const dist1 = distMatrix.get(cluster1, k);
    const dist2 = distMatrix.get(cluster2, k);

    let newDist: number;

    switch (linkage) {
      case 'single':
        // Single linkage: minimum distance
        newDist = Math.min(dist1, dist2);
        break;

      case 'complete':
        // Complete linkage: maximum distance
        newDist = Math.max(dist1, dist2);
        break;

      case 'average':
        // Average linkage: weighted average by cluster sizes
        newDist = (dist1 * size1 + dist2 * size2) / (size1 + size2);
        break;

      default:
        newDist = Math.min(dist1, dist2);
    }

    distMatrix.set(merged, k, newDist);
  });
};

/**
 * Build dendrogram from merge history.
 * @param nodes
 * @param merges
 * @param heights
 */
const buildDendrogram = <N extends Node>(nodes: N[], merges: MergeStep[], heights: number[]): Dendrogram<string> => {
  const leafNodes = nodes.map((node) => node.id);
  const clusterSizes = merges.map((merge) => merge.size);

  return {
    merges,
    heights,
    leafNodes,
    clusterSizes,

    /**
     * Cut dendrogram at specified height to produce flat clusters.
     * @param height
     */
    cutAtHeight: (height: number): Set<string>[] => {
      // Start with all nodes in singleton clusters (indices 0 to n-1)
      const clusters = new Map<number, Set<string>>();
      leafNodes.forEach((nodeId, idx) => {
        clusters.set(idx, new Set([nodeId]));
      });

      // Apply merges up to the specified height
      for (const [i, merge] of merges.entries()) {
        if (heights[i] > height) break;

        const cluster1 = clusters.get(merge.cluster1);
        const cluster2 = clusters.get(merge.cluster2);

        if (!cluster1 || !cluster2) continue;

        // Merge cluster2 into cluster1
        const newCluster = new Set([...cluster1, ...cluster2]);

        // Remove old clusters
        clusters.delete(merge.cluster1);
        clusters.delete(merge.cluster2);

        // Add new merged cluster with index (n + i)
        const n = leafNodes.length;
        clusters.set(n + i, newCluster);
      }

      return [...clusters.values()];
    },

    /**
     * Get exactly k clusters by cutting dendrogram.
     * @param numClusters
     */
    getClusters: (numClusters: number): Set<string>[] => {
      if (numClusters <= 0) return [];
      if (numClusters >= leafNodes.length) {
        // Return singleton clusters
        return leafNodes.map((nodeId) => new Set([nodeId]));
      }

      // Find the merge index that produces k clusters
      // After merge i, we have (n - i - 1) clusters
      const n = leafNodes.length;
      const mergeIndex = n - numClusters;

      if (mergeIndex < 0 || mergeIndex >= merges.length) {
        return leafNodes.map((nodeId) => new Set([nodeId]));
      }

      // Apply first mergeIndex merges
      const clusters = new Map<number, Set<string>>();
      leafNodes.forEach((nodeId, idx) => {
        clusters.set(idx, new Set([nodeId]));
      });

      for (let i = 0; i < mergeIndex; i++) {
        const merge = merges[i];
        const cluster1 = clusters.get(merge.cluster1);
        const cluster2 = clusters.get(merge.cluster2);

        if (!cluster1 || !cluster2) continue;

        // Merge cluster2 into cluster1
        const newCluster = new Set([...cluster1, ...cluster2]);

        // Remove old clusters
        clusters.delete(merge.cluster1);
        clusters.delete(merge.cluster2);

        // Add new merged cluster with index (n + i)
        clusters.set(n + i, newCluster);
      }

      return [...clusters.values()];
    },
  };
};

/**
 * Perform hierarchical clustering on a graph.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph (directed or undirected)
 * @param options - Configuration options
 * @param options.linkage - Linkage method: 'single', 'complete', or 'average' (default: 'average')
 * @returns Result containing dendrogram or error
 * @example
 * ```typescript
 * const graph = new Graph<TopicNode, TopicEdge>(false);
 * // ... add nodes and edges ...
 *
 * const result = hierarchicalClustering(graph, { linkage: 'average' });
 * if (result.ok) {
 *   const { dendrogram } = result.value;
 *   const clusters = dendrogram.getClusters(5);
 *   console.log(`Extracted ${clusters.length} clusters`);
 * }
 * ```
 */
export const hierarchicalClustering = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: {
    linkage?: LinkageMethod;
  } = {}): HierarchicalResult<string> => {
  const startTime = performance.now();
  const linkage = options.linkage ?? 'average';

  // Validate input
  const allNodes = graph.getAllNodes();
  const n = allNodes.length;

  if (n === 0) {
    return Err({
      type: 'EmptyGraph',
      message: 'Cannot perform hierarchical clustering on empty graph',
    });
  }

  if (n === 1) {
    // Single node: return trivial dendrogram
    const dendrogram: Dendrogram<string> = {
      merges: [],
      heights: [],
      leafNodes: [allNodes[0].id],
      clusterSizes: [],
      cutAtHeight: () => [new Set([allNodes[0].id])],
      getClusters: () => [new Set([allNodes[0].id])],
    };

    return Ok({
      dendrogram,
      metadata: {
        algorithm: 'hierarchical',
        runtime: performance.now() - startTime,
        parameters: { linkage },
      },
    });
  }

  // Build node index map (node ID → index)
  const nodeIndexMap = new Map<string, number>();
  allNodes.forEach((node, idx) => {
    nodeIndexMap.set(node.id, idx);
  });

  // Build adjacency matrix
  const adjMatrix = buildAdjacencyMatrix(graph, nodeIndexMap);

  // Compute initial distance matrix
  const distMatrix = computeDistanceMatrix(adjMatrix);

  // Initialize clusters (use positive indices 0 to n-1 for leaves)
  const activeClusters = new Set<number>();
  for (let i = 0; i < n; i++) {
    activeClusters.add(i);
  }

  // Track cluster contents and sizes
  const clusterNodes = new Map<number, Set<string>>();
  const clusterSizes = new Map<number, number>();

  allNodes.forEach((node, idx) => {
    clusterNodes.set(idx, new Set([node.id]));
    clusterSizes.set(idx, 1);
  });

  // Merge history
  const merges: MergeStep[] = [];
  const heights: number[] = [];

  let nextClusterId = n; // Start from n (after leaf nodes 0 to n-1)

  // Agglomerative clustering: merge n-1 times
  for (let step = 0; step < n - 1; step++) {
    // Find closest pair of clusters
    const minPair = distMatrix.findMinimum(activeClusters);

    if (!minPair) {
      // Should not happen if graph is connected
      break;
    }

    const [cluster1, cluster2, distance] = minPair;

    // Record merge
    const size1 = clusterSizes.get(cluster1) ?? 1;
    const size2 = clusterSizes.get(cluster2) ?? 1;
    const mergedSize = size1 + size2;

    merges.push({
      cluster1,
      cluster2,
      distance,
      size: mergedSize,
    });
    heights.push(distance);

    // Create new merged cluster
    const newClusterId = nextClusterId++;
    const nodes1 = clusterNodes.get(cluster1) ?? new Set();
    const nodes2 = clusterNodes.get(cluster2) ?? new Set();
    const mergedNodes = new Set([...nodes1, ...nodes2]);

    clusterNodes.set(newClusterId, mergedNodes);
    clusterSizes.set(newClusterId, mergedSize);

    // Update distance matrix
    updateDistances(distMatrix, newClusterId, cluster1, cluster2, activeClusters, linkage, clusterSizes);

    // Remove merged clusters and add new cluster
    activeClusters.delete(cluster1);
    activeClusters.delete(cluster2);
    activeClusters.add(newClusterId);
  }

  // Build final dendrogram
  const dendrogram = buildDendrogram(allNodes, merges, heights);

  const endTime = performance.now();

  return Ok({
    dendrogram,
    metadata: {
      algorithm: 'hierarchical',
      runtime: endTime - startTime,
      parameters: { linkage },
    },
  });
};
