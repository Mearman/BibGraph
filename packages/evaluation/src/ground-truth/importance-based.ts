/**
 * Importance-based ground truth computation for path ranking evaluation
 *
 * Provides multiple ground truth definitions based on node importance metrics.
 * Used to evaluate whether MI ranking correlates with meaningful path quality
 * across different operationalisations of "quality".
 */

import type { Graph } from '@bibgraph/algorithms';
import type { Path } from '@bibgraph/algorithms';
import type { Edge, Node } from '@bibgraph/types';

/**
 * Ground truth type identifier
 */
export type GroundTruthType = 'degree' | 'pagerank' | 'combined' | 'domain-specific';

/**
 * Configuration for ground truth computation
 */
export interface GroundTruthConfig {
  /** Type of ground truth to compute */
  type: GroundTruthType;
  /** For combined: weight for degree component (default: 0.5) */
  degreeWeight?: number;
  /** For domain-specific: custom importance function per node */
  customImportance?: (nodeId: string) => number;
  /** PageRank damping factor (default: 0.85) */
  dampingFactor?: number;
  /** Aggregation method: 'mean' or 'sum' (default: 'mean') */
  aggregation?: 'mean' | 'sum' | 'geometric-mean';
  /** Pre-computed importance values (avoids re-computing for same graph) */
  precomputedImportance?: Map<string, number>;
}

/**
 * Pre-computed importance values for a graph
 */
export interface PrecomputedImportance {
  degree: Map<string, number>;
  pagerank: Map<string, number>;
  combined: Map<string, number>;
}

/**
 * Result of ground truth computation for a single path
 */
export interface GroundTruthPath<N extends Node, E extends Edge> {
  path: Path<N, E>;
  score: number;
  nodeScores: number[];
}

/**
 * Compute degree centrality for all nodes
 */
function computeDegreeCentrality<N extends Node, E extends Edge>(
  graph: Graph<N, E>
): Map<string, number> {
  const degrees = new Map<string, number>();

  for (const node of graph.getAllNodes()) {
    const neighborsResult = graph.getNeighbors(node.id);
    const degree = neighborsResult.ok ? neighborsResult.value.length : 0;
    degrees.set(node.id, degree);
  }

  // Normalise by max degree
  const maxDegree = Math.max(...degrees.values(), 1);
  for (const [nodeId, degree] of degrees) {
    degrees.set(nodeId, degree / maxDegree);
  }

  return degrees;
}

/**
 * Compute PageRank scores for all nodes
 */
function computePageRank<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  dampingFactor: number = 0.85,
  maxIterations: number = 100,
  tolerance: number = 1e-6
): Map<string, number> {
  const nodes = graph.getAllNodes();
  const n = nodes.length;

  if (n === 0) {
    return new Map();
  }

  // Initialize uniformly
  const pageRank = new Map<string, number>();
  const nodeIds = nodes.map((node) => node.id);

  for (const nodeId of nodeIds) {
    pageRank.set(nodeId, 1.0 / n);
  }

  // Build adjacency lists
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();

  for (const edge of graph.getAllEdges()) {
    const out = outEdges.get(edge.source) ?? [];
    out.push(edge.target);
    outEdges.set(edge.source, out);

    const incoming = inEdges.get(edge.target) ?? [];
    incoming.push(edge.source);
    inEdges.set(edge.target, incoming);
  }

  // Power iteration
  for (let iter = 0; iter < maxIterations; iter++) {
    const newPageRank = new Map<string, number>();
    let maxChange = 0;

    for (const nodeId of nodeIds) {
      const predecessors = inEdges.get(nodeId) ?? [];

      let sumPR = 0;
      for (const pred of predecessors) {
        const predOutDegree = (outEdges.get(pred) ?? []).length;
        const predPR = pageRank.get(pred) ?? 0;

        if (predOutDegree > 0) {
          sumPR += predPR / predOutDegree;
        }
      }

      const newPR = (1 - dampingFactor) / n + dampingFactor * sumPR;
      newPageRank.set(nodeId, newPR);

      const oldPR = pageRank.get(nodeId) ?? 0;
      maxChange = Math.max(maxChange, Math.abs(newPR - oldPR));
    }

    for (const [nodeId, score] of newPageRank.entries()) {
      pageRank.set(nodeId, score);
    }

    if (maxChange < tolerance) {
      break;
    }
  }

  // Normalise to [0, 1]
  const maxPR = Math.max(...pageRank.values(), 1e-10);
  for (const [nodeId, score] of pageRank) {
    pageRank.set(nodeId, score / maxPR);
  }

  return pageRank;
}

/**
 * Pre-compute all importance values for a graph
 *
 * Call this once per graph, then pass the result to computeGroundTruth
 * via the precomputedImportance config option for efficiency.
 *
 * @param graph - Graph to compute importance for
 * @param dampingFactor - PageRank damping factor (default: 0.85)
 * @param degreeWeight - Weight for degree in combined score (default: 0.5)
 * @returns Pre-computed importance values for all types
 */
export function precomputeImportance<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  dampingFactor: number = 0.85,
  degreeWeight: number = 0.5
): PrecomputedImportance {
  const degree = computeDegreeCentrality(graph);
  const pagerank = computePageRank(graph, dampingFactor);

  const combined = new Map<string, number>();
  for (const node of graph.getAllNodes()) {
    const deg = degree.get(node.id) ?? 0;
    const pr = pagerank.get(node.id) ?? 0;
    combined.set(node.id, degreeWeight * deg + (1 - degreeWeight) * pr);
  }

  return { degree, pagerank, combined };
}

/**
 * Aggregate node scores along a path
 */
function aggregateScores(scores: number[], method: 'mean' | 'sum' | 'geometric-mean'): number {
  if (scores.length === 0) return 0;

  switch (method) {
    case 'sum':
      return scores.reduce((a, b) => a + b, 0);
    case 'geometric-mean': {
      // Add small epsilon to avoid log(0)
      const logSum = scores.reduce((sum, s) => sum + Math.log(s + 1e-10), 0);
      return Math.exp(logSum / scores.length);
    }
    case 'mean':
    default:
      return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
}

/**
 * Compute importance-based ground truth ranking for paths
 *
 * @param graph - Graph containing the paths
 * @param paths - Paths to rank
 * @param config - Ground truth configuration
 * @returns Paths sorted by ground truth score (descending)
 */
export function computeGroundTruth<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  paths: Path<N, E>[],
  config: GroundTruthConfig
): GroundTruthPath<N, E>[] {
  const {
    type,
    degreeWeight = 0.5,
    customImportance,
    dampingFactor = 0.85,
    aggregation = 'mean',
    precomputedImportance,
  } = config;

  // Use pre-computed importance if provided (much faster for repeated calls)
  let nodeImportance: Map<string, number>;

  if (precomputedImportance) {
    nodeImportance = precomputedImportance;
  } else {
    // Compute node importance based on type
    switch (type) {
      case 'degree':
        nodeImportance = computeDegreeCentrality(graph);
        break;

      case 'pagerank':
        nodeImportance = computePageRank(graph, dampingFactor);
        break;

      case 'combined': {
        const degrees = computeDegreeCentrality(graph);
        const pageRanks = computePageRank(graph, dampingFactor);

        nodeImportance = new Map();
        for (const node of graph.getAllNodes()) {
          const deg = degrees.get(node.id) ?? 0;
          const pr = pageRanks.get(node.id) ?? 0;
          nodeImportance.set(node.id, degreeWeight * deg + (1 - degreeWeight) * pr);
        }
        break;
      }

      case 'domain-specific':
        if (!customImportance) {
          throw new Error('domain-specific ground truth requires customImportance function');
        }
        nodeImportance = new Map();
        for (const node of graph.getAllNodes()) {
          nodeImportance.set(node.id, customImportance(node.id));
        }
        break;

      default:
        throw new Error(`Unknown ground truth type: ${type}`);
    }
  }

  // Score each path
  const scoredPaths = paths.map((path) => {
    const nodeScores = path.nodes.map((node) => nodeImportance.get(node.id) ?? 0);
    const score = aggregateScores(nodeScores, aggregation);

    return {
      path,
      score,
      nodeScores,
    };
  });

  // Sort by score descending
  scoredPaths.sort((a, b) => b.score - a.score);

  return scoredPaths;
}

/**
 * Create a domain-specific importance function from node attributes
 *
 * @param attributeKey - Key to extract from node attributes
 * @param defaultValue - Default value if attribute is missing
 * @returns Importance function for use with domain-specific ground truth
 */
export function createAttributeImportance<N extends Node>(
  nodes: N[],
  attributeKey: string,
  defaultValue: number = 0
): (nodeId: string) => number {
  const nodeMap = new Map<string, N>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  return (nodeId: string): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return defaultValue;

    const value = (node as Record<string, unknown>)[attributeKey];
    if (typeof value === 'number') return value;

    return defaultValue;
  };
}

/**
 * Convenience function to compute all ground truth types for a set of paths
 *
 * @param graph - Graph containing the paths
 * @param paths - Paths to rank
 * @param customImportance - Optional custom importance for domain-specific
 * @returns Object with rankings for each ground truth type
 */
export function computeAllGroundTruths<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  paths: Path<N, E>[],
  customImportance?: (nodeId: string) => number
): Record<GroundTruthType, GroundTruthPath<N, E>[]> {
  const result: Record<GroundTruthType, GroundTruthPath<N, E>[]> = {
    degree: computeGroundTruth(graph, paths, { type: 'degree' }),
    pagerank: computeGroundTruth(graph, paths, { type: 'pagerank' }),
    combined: computeGroundTruth(graph, paths, { type: 'combined' }),
    'domain-specific': customImportance
      ? computeGroundTruth(graph, paths, { type: 'domain-specific', customImportance })
      : [],
  };

  return result;
}
