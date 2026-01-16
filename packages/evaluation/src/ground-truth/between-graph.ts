/**
 * Between-Graph Ground Truth Computation
 *
 * Computes the ground truth "between-graph" for comparing expansion strategies.
 * The between-graph is defined as all nodes that lie on any path ≤ k hops
 * between seed nodes.
 */

import type { Graph, Node, Edge } from '@bibgraph/algorithms';

/**
 * Result of between-graph enumeration.
 */
export interface BetweenGraphResult {
  /** All nodes on any path between seeds */
  nodes: Set<string>;

  /** All edges on any path between seeds */
  edges: Set<string>;

  /** All discovered paths (as node ID arrays) */
  paths: string[][];

  /** Node degrees within the between-graph */
  degrees: Map<string, number>;

  /** Statistics about the enumeration */
  stats: {
    /** Total paths found */
    pathCount: number;
    /** Maximum path length found */
    maxPathLength: number;
    /** Minimum path length found */
    minPathLength: number;
    /** Mean path length */
    meanPathLength: number;
  };
}

/**
 * Options for between-graph enumeration.
 */
export interface BetweenGraphOptions {
  /** Maximum path length to enumerate (default: 6) */
  maxPathLength?: number;

  /** Maximum number of paths to enumerate (default: 10000) */
  maxPaths?: number;

  /** Whether to treat graph as directed (default: false) */
  directed?: boolean;
}

const DEFAULT_MAX_PATH_LENGTH = 6;
const DEFAULT_MAX_PATHS = 10000;

/**
 * Enumerate all paths between two seed nodes up to a maximum length.
 *
 * Uses DFS with backtracking to find all simple paths (no repeated nodes).
 * This is exponential in the worst case but tractable for small graphs
 * and limited path lengths.
 *
 * @param graph - The graph to search
 * @param seedA - First seed node ID
 * @param seedB - Second seed node ID
 * @param options - Enumeration options
 * @returns Between-graph result with all nodes, edges, and paths
 */
export function enumerateBetweenGraph<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  seedA: string,
  seedB: string,
  options: BetweenGraphOptions = {}
): BetweenGraphResult {
  const maxPathLength = options.maxPathLength ?? DEFAULT_MAX_PATH_LENGTH;
  const maxPaths = options.maxPaths ?? DEFAULT_MAX_PATHS;
  const directed = options.directed ?? false;

  const betweenNodes = new Set<string>();
  const betweenEdges = new Set<string>();
  const allPaths: string[][] = [];

  // DFS with backtracking
  const visited = new Set<string>();
  const currentPath: string[] = [];

  function dfs(current: string, target: string, depth: number): void {
    if (allPaths.length >= maxPaths) return;
    if (depth > maxPathLength) return;

    visited.add(current);
    currentPath.push(current);

    if (current === target && currentPath.length > 1) {
      // Found a path - record it
      const path = [...currentPath];
      allPaths.push(path);

      // Add all nodes and edges to between-graph
      for (const node of path) {
        betweenNodes.add(node);
      }
      for (let i = 0; i < path.length - 1; i++) {
        const [a, b] = [path[i], path[i + 1]].sort();
        betweenEdges.add(`${a}--${b}`);
      }
    } else {
      // Continue exploring
      const neighborsResult = graph.getNeighbors(current);
      const neighbors = neighborsResult.ok ? neighborsResult.value : [];

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          dfs(neighborId, target, depth + 1);
        }
      }

      // For undirected graphs, also check incoming edges
      if (!directed) {
        // getNeighbors already handles undirected in the Graph class
        // No additional handling needed
      }
    }

    // Backtrack
    currentPath.pop();
    visited.delete(current);
  }

  // Start DFS from seedA to seedB
  dfs(seedA, seedB, 0);

  // Compute degrees within the between-graph
  const degrees = new Map<string, number>();
  for (const nodeId of betweenNodes) {
    let degree = 0;
    const neighborsResult = graph.getNeighbors(nodeId);
    const neighbors = neighborsResult.ok ? neighborsResult.value : [];

    for (const neighborId of neighbors) {
      if (betweenNodes.has(neighborId)) {
        degree++;
      }
    }
    degrees.set(nodeId, degree);
  }

  // Compute statistics
  const pathLengths = allPaths.map((p) => p.length);
  const stats = {
    pathCount: allPaths.length,
    maxPathLength: pathLengths.length > 0 ? Math.max(...pathLengths) : 0,
    minPathLength: pathLengths.length > 0 ? Math.min(...pathLengths) : 0,
    meanPathLength:
      pathLengths.length > 0 ? pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length : 0,
  };

  return {
    nodes: betweenNodes,
    edges: betweenEdges,
    paths: allPaths,
    degrees,
    stats,
  };
}

/**
 * Enumerate between-graph for multiple seed pairs.
 *
 * The result is the union of all individual between-graphs.
 *
 * @param graph - The graph to search
 * @param seedPairs - Array of seed pairs [[A1, B1], [A2, B2], ...]
 * @param options - Enumeration options
 * @returns Combined between-graph result
 */
export function enumerateMultiSeedBetweenGraph<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  seedPairs: Array<[string, string]>,
  options: BetweenGraphOptions = {}
): BetweenGraphResult {
  const combinedNodes = new Set<string>();
  const combinedEdges = new Set<string>();
  const allPaths: string[][] = [];

  for (const [seedA, seedB] of seedPairs) {
    const result = enumerateBetweenGraph(graph, seedA, seedB, options);

    for (const node of result.nodes) {
      combinedNodes.add(node);
    }
    for (const edge of result.edges) {
      combinedEdges.add(edge);
    }
    allPaths.push(...result.paths);
  }

  // Compute combined degrees
  const degrees = new Map<string, number>();
  for (const nodeId of combinedNodes) {
    let degree = 0;
    const neighborsResult = graph.getNeighbors(nodeId);
    const neighbors = neighborsResult.ok ? neighborsResult.value : [];

    for (const neighborId of neighbors) {
      if (combinedNodes.has(neighborId)) {
        degree++;
      }
    }
    degrees.set(nodeId, degree);
  }

  // Compute statistics
  const pathLengths = allPaths.map((p) => p.length);
  const stats = {
    pathCount: allPaths.length,
    maxPathLength: pathLengths.length > 0 ? Math.max(...pathLengths) : 0,
    minPathLength: pathLengths.length > 0 ? Math.min(...pathLengths) : 0,
    meanPathLength:
      pathLengths.length > 0 ? pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length : 0,
  };

  return {
    nodes: combinedNodes,
    edges: combinedEdges,
    paths: allPaths,
    degrees,
    stats,
  };
}

/**
 * Compute k-hop ego network from a single seed node.
 *
 * This is the ground truth for N=1 seed case.
 *
 * @param graph - The graph to search
 * @param seed - Seed node ID
 * @param k - Maximum hops from seed (default: 3)
 * @returns Ego network result
 */
export function computeEgoNetwork<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  seed: string,
  k = 3
): BetweenGraphResult {
  const egoNodes = new Set<string>();
  const egoEdges = new Set<string>();

  // BFS to find all nodes within k hops
  const visited = new Set<string>();
  const queue: Array<{ node: string; depth: number }> = [{ node: seed, depth: 0 }];
  visited.add(seed);

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    egoNodes.add(node);

    if (depth < k) {
      const neighborsResult = graph.getNeighbors(node);
      const neighbors = neighborsResult.ok ? neighborsResult.value : [];

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ node: neighborId, depth: depth + 1 });

          // Add edge
          const [a, b] = [node, neighborId].sort();
          egoEdges.add(`${a}--${b}`);
        }
      }
    }
  }

  // Compute degrees within ego network
  const degrees = new Map<string, number>();
  for (const nodeId of egoNodes) {
    let degree = 0;
    const neighborsResult = graph.getNeighbors(nodeId);
    const neighbors = neighborsResult.ok ? neighborsResult.value : [];

    for (const neighborId of neighbors) {
      if (egoNodes.has(neighborId)) {
        degree++;
      }
    }
    degrees.set(nodeId, degree);
  }

  return {
    nodes: egoNodes,
    edges: egoEdges,
    paths: [], // No paths for single-seed case
    degrees,
    stats: {
      pathCount: 0,
      maxPathLength: 0,
      minPathLength: 0,
      meanPathLength: 0,
    },
  };
}
