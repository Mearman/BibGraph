/**
 * Path Diversity Metrics
 *
 * Measures how diverse a set of paths are from each other.
 * Higher diversity indicates the paths explore different regions of the graph.
 */

/**
 * Compute Jaccard distance between two sets.
 * Jaccard distance = 1 - Jaccard similarity = 1 - |A ∩ B| / |A ∪ B|
 *
 * @param setA - First set
 * @param setB - Second set
 * @returns Distance in [0, 1] where 0 = identical, 1 = completely disjoint
 */
export function jaccardDistance<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) {
    return 0; // Two empty sets are identical
  }

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  const similarity = intersectionSize / unionSize;
  return 1 - similarity;
}

/**
 * Convert a path (array of node IDs) to a set for Jaccard computation.
 *
 * @param path - Array of node IDs forming a path
 * @returns Set of node IDs
 */
export function pathToNodeSet(path: string[]): Set<string> {
  return new Set(path);
}

/**
 * Compute mean pairwise Jaccard distance between paths.
 *
 * This measures how different the paths are from each other on average.
 * Higher values indicate more diverse path exploration.
 *
 * @param paths - Array of paths, where each path is an array of node IDs
 * @returns Mean pairwise Jaccard distance in [0, 1]
 */
export function meanPairwiseJaccardDistance(paths: string[][]): number {
  if (paths.length < 2) {
    return 0; // No pairs to compare
  }

  const nodeSets = paths.map(pathToNodeSet);
  let totalDistance = 0;
  let pairCount = 0;

  for (let i = 0; i < nodeSets.length; i++) {
    for (let j = i + 1; j < nodeSets.length; j++) {
      totalDistance += jaccardDistance(nodeSets[i], nodeSets[j]);
      pairCount++;
    }
  }

  return pairCount > 0 ? totalDistance / pairCount : 0;
}

/**
 * Compute path diversity using edge overlap.
 *
 * Converts paths to edge sets and computes Jaccard distance.
 * This is more sensitive than node-based diversity because
 * paths can share nodes but use different edges.
 *
 * @param paths - Array of paths, where each path is an array of node IDs
 * @returns Mean pairwise edge-based Jaccard distance in [0, 1]
 */
export function meanPairwiseEdgeJaccardDistance(paths: string[][]): number {
  if (paths.length < 2) {
    return 0;
  }

  // Convert paths to edge sets
  const edgeSets = paths.map((path) => {
    const edges = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      // Normalize edge direction for undirected comparison
      const [a, b] = [path[i], path[i + 1]].sort();
      edges.add(`${a}--${b}`);
    }
    return edges;
  });

  let totalDistance = 0;
  let pairCount = 0;

  for (let i = 0; i < edgeSets.length; i++) {
    for (let j = i + 1; j < edgeSets.length; j++) {
      totalDistance += jaccardDistance(edgeSets[i], edgeSets[j]);
      pairCount++;
    }
  }

  return pairCount > 0 ? totalDistance / pairCount : 0;
}

/**
 * Comprehensive path diversity metrics.
 */
export interface PathDiversityMetrics {
  /** Number of distinct paths */
  pathCount: number;

  /** Mean pairwise node-based Jaccard distance */
  nodeJaccardDistance: number;

  /** Mean pairwise edge-based Jaccard distance */
  edgeJaccardDistance: number;

  /** Total unique nodes across all paths */
  uniqueNodeCount: number;

  /** Total unique edges across all paths */
  uniqueEdgeCount: number;

  /** Average path length */
  meanPathLength: number;

  /** Standard deviation of path lengths */
  stdPathLength: number;
}

/**
 * Compute comprehensive path diversity metrics.
 *
 * @param paths - Array of paths, where each path is an array of node IDs
 * @returns Complete diversity metrics
 */
export function computePathDiversityMetrics(paths: string[][]): PathDiversityMetrics {
  if (paths.length === 0) {
    return {
      pathCount: 0,
      nodeJaccardDistance: 0,
      edgeJaccardDistance: 0,
      uniqueNodeCount: 0,
      uniqueEdgeCount: 0,
      meanPathLength: 0,
      stdPathLength: 0,
    };
  }

  // Collect all unique nodes and edges
  const allNodes = new Set<string>();
  const allEdges = new Set<string>();

  for (const path of paths) {
    for (const node of path) {
      allNodes.add(node);
    }
    for (let i = 0; i < path.length - 1; i++) {
      const [a, b] = [path[i], path[i + 1]].sort();
      allEdges.add(`${a}--${b}`);
    }
  }

  // Compute path length statistics
  const lengths = paths.map((p) => p.length);
  const meanLength = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + (l - meanLength) ** 2, 0) / lengths.length;
  const stdLength = Math.sqrt(variance);

  return {
    pathCount: paths.length,
    nodeJaccardDistance: meanPairwiseJaccardDistance(paths),
    edgeJaccardDistance: meanPairwiseEdgeJaccardDistance(paths),
    uniqueNodeCount: allNodes.size,
    uniqueEdgeCount: allEdges.size,
    meanPathLength: meanLength,
    stdPathLength: stdLength,
  };
}

/**
 * Compute hub coverage: fraction of paths traversing high-degree nodes.
 *
 * @param paths - Array of paths, where each path is an array of node IDs
 * @param hubNodes - Set of node IDs considered "hubs" (high-degree nodes)
 * @returns Fraction of paths that traverse at least one hub
 */
export function computeHubCoverage(paths: string[][], hubNodes: Set<string>): number {
  if (paths.length === 0) {
    return 0;
  }

  let hubTraversingPaths = 0;
  for (const path of paths) {
    const traversesHub = path.some((node) => hubNodes.has(node));
    if (traversesHub) {
      hubTraversingPaths++;
    }
  }

  return hubTraversingPaths / paths.length;
}

/**
 * Identify hub nodes (top percentile by degree).
 *
 * @param nodeDegrees - Map from node ID to degree
 * @param percentile - Top percentile to consider as hubs (e.g., 0.1 for top 10%)
 * @returns Set of hub node IDs
 */
export function identifyHubNodes(
  nodeDegrees: Map<string, number>,
  percentile = 0.1
): Set<string> {
  const entries = [...nodeDegrees.entries()].sort((a, b) => b[1] - a[1]);
  const hubCount = Math.max(1, Math.ceil(entries.length * percentile));
  const hubs = new Set<string>();

  for (let i = 0; i < hubCount && i < entries.length; i++) {
    hubs.add(entries[i][0]);
  }

  return hubs;
}
