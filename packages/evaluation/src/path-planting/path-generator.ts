/**
 * Ground truth path planting for evaluation
 */

import { Graph } from '@bibgraph/algorithms';
import type { RankedPath } from '@bibgraph/algorithms';
import type { Path } from '@bibgraph/algorithms';
import type { Edge, Node } from '@bibgraph/types';

/**
 * Configuration for planted path generation.
 */
export interface PlantedPathConfig<N extends Node, E extends Edge> {
  /** Number of ground truth paths to plant */
  numPaths: number;

  /** Path length range (number of edges) */
  pathLength: { min: number; max: number };

  /** MI signal strength (higher = more distinguishable) */
  signalStrength: 'weak' | 'medium' | 'strong';

  /** Whether planted paths should share nodes */
  allowOverlap: boolean;

  /** Random seed for reproducibility */
  seed?: number;

  /** Source node IDs to start paths from (optional) */
  sourceNodes?: string[];

  /** Target node IDs to end paths at (optional) */
  targetNodes?: string[];
}

/**
 * Result of path planting.
 */
export interface PlantedPathResult<N extends Node, E extends Edge> {
  /** Modified graph with planted paths */
  graph: Graph<N, E>;

  /** Ground truth paths (in order of "true" relevance) */
  groundTruthPaths: Path<N, E>[];

  /** Relevance scores for each path */
  relevanceScores: Map<string, number>;

  /** Metadata about planting */
  metadata: {
    nodesAdded: number;
    edgesAdded: number;
    avgPathMI: number;
  };
}

/**
 * Seeded random number generator.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Generate random number in [0, 1).
   */
  nextDouble(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Generate random number in [0, 1).
   * Alias for nextDouble() for compatibility.
   */
  next(): number {
    return this.nextDouble();
  }

  /**
   * Generate random integer in [min, max].
   * @param min
   * @param max
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffle array in place.
   * @param array
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextDouble() * (i + 1));
      [result[i]!, result[j]!] = [result[j]!, result[i]!];
    }
    return result;
  }
}

/**
 * Convert signal strength to MI value range.
 * @param signalStrength
 */
const signalStrengthToMI = (signalStrength: 'weak' | 'medium' | 'strong'): { min: number; max: number } => {
  switch (signalStrength) {
    case 'weak':
      return { min: 0.1, max: 0.3 }; // Low MI, hard to distinguish
    case 'medium':
      return { min: 0.4, max: 0.7 }; // Moderate MI
    case 'strong':
      return { min: 0.8, max: 1.0 }; // High MI, easy to distinguish
  }
};

/**
 * Plant ground truth paths in a graph for evaluation.
 *
 * Creates paths with controlled MI characteristics:
 * - Strong signal: High MI edges, clear separation from noise
 * - Medium signal: Moderate MI, some ambiguity
 * - Weak signal: Low MI delta, challenging to detect
 *
 * @template N - Node type
 * @template E - Edge type
 * @param baseGraph - Graph to modify
 * @param config - Planting configuration
 * @returns Graph with planted paths and ground truth
 */
export const plantGroundTruthPaths = <N extends Node, E extends Edge>(baseGraph: Graph<N, E>, config: PlantedPathConfig<N, E>): PlantedPathResult<N, E> => {
  const rng = new SeededRandom(config.seed);
  const miRange = signalStrengthToMI(config.signalStrength);

  // Get existing nodes
  const existingNodes = baseGraph.getAllNodes();
  const nodeIds = existingNodes.map(n => n.id);

  if (nodeIds.length === 0) {
    throw new Error('Cannot plant paths in empty graph');
  }

  // Select source and target nodes
  const sources = config.sourceNodes ?? rng.shuffle(nodeIds).slice(0, Math.min(config.numPaths, nodeIds.length));
  const targets = config.targetNodes ?? rng.shuffle(nodeIds).slice(0, Math.min(config.numPaths, nodeIds.length));

  const plantedPaths: Path<N, E>[] = [];
  const relevanceScores = new Map<string, number>();
  let nodesAdded = 0;
  let edgesAdded = 0;
  let totalMI = 0;

  // Plant each path
  for (let i = 0; i < config.numPaths; i++) {
    const source = sources[i % sources.length]!;
    const target = targets[i % targets.length]!;

    // Validate source and target exist
    const sourceNode = baseGraph.getNode(source);
    const targetNode = baseGraph.getNode(target);

    if (!sourceNode.some) {
      throw new Error(`Source node '${source}' not found in graph`);
    }

    if (!targetNode.some) {
      throw new Error(`Target node '${target}' not found in graph`);
    }

    // Generate path with random length
    const pathLength = rng.nextInt(config.pathLength.min, config.pathLength.max);
    const pathNodes: N[] = [];
    const pathEdges: E[] = [];

    // Create path nodes and edges
    let currentNodeId = source;
    let currentMI = rng.nextDouble() * (miRange.max - miRange.min) + miRange.min;

    // Start with source node
    pathNodes.push(sourceNode.value);

    for (let j = 0; j < pathLength; j++) {
      // Generate intermediate node ID
      const intermediateId = `planted_node_${nodesAdded++}`;
      const intermediateNode = { id: intermediateId, type: 'planted' } as N;

      baseGraph.addNode(intermediateNode);
      pathNodes.push(intermediateNode);

      // Generate edge with MI-based weight
      const edgeId = `planted_edge_${edgesAdded++}`;
      const edge: E = {
        id: edgeId,
        source: currentNodeId,
        target: intermediateId,
        weight: currentMI,
      } as E;

      baseGraph.addEdge(edge);
      pathEdges.push(edge);

      totalMI += currentMI;
      currentNodeId = intermediateId;

      // Vary MI slightly along path
      currentMI = Math.max(0, Math.min(1, currentMI + (rng.nextDouble() - 0.5) * 0.2));
    }

    // Connect to target
    const finalEdgeId = `planted_edge_${edgesAdded++}`;
    const finalEdge: E = {
      id: finalEdgeId,
      source: currentNodeId,
      target: target,
      weight: currentMI,
    } as E;

    baseGraph.addEdge(finalEdge);
    pathEdges.push(finalEdge);
    totalMI += currentMI;

    // End with target node
    pathNodes.push(targetNode.value);

    // Create path object
    const path: Path<N, E> = {
      nodes: pathNodes,
      edges: pathEdges,
      totalWeight: pathEdges.reduce((sum, e) => sum + (e.weight ?? 0), 0),
    };

    plantedPaths.push(path);

    // Calculate relevance score based on average MI
    const avgMI = totalMI / pathEdges.length;
    relevanceScores.set(pathId(path), avgMI);
  }

  // Sort paths by relevance (descending)
  plantedPaths.sort((a, b) => {
    const scoreA = relevanceScores.get(pathId(a)) ?? 0;
    const scoreB = relevanceScores.get(pathId(b)) ?? 0;
    return scoreB - scoreA;
  });

  return {
    graph: baseGraph,
    groundTruthPaths: plantedPaths,
    relevanceScores,
    metadata: {
      nodesAdded,
      edgesAdded,
      avgPathMI: totalMI / plantedPaths.length,
    },
  };
};

/**
 * Generate stable path ID for relevance scoring.
 * @param path
 */
const pathId = <N extends Node, E extends Edge>(path: Path<N, E>): string => path.nodes.map(n => n.id).join('→');
