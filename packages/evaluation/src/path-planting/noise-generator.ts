/**
 * Noise path generation for evaluation
 */

import { Graph } from '@bibgraph/algorithms';
import type { Path } from '@bibgraph/algorithms';
import type { Edge, Node } from '@bibgraph/types';

/**
 * Add noise paths to make ground truth detection harder.
 *
 * Creates random paths that act as decoys, making it more challenging
 * to identify the true high-MI paths.
 *
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Graph with planted paths
 * @param groundTruth - Ground truth paths to avoid
 * @param numNoisePaths - Number of decoy paths to add
 * @param seed - Random seed
 * @returns Graph with added noise paths
 */
export const addNoisePaths = <N extends Node, E extends Edge>(graph: Graph<N, E>, groundTruth: Path<N, E>[], numNoisePaths: number, seed?: number): Graph<N, E> => {
  if (numNoisePaths <= 0) {
    return graph;
  }

  const rng = new SeededRandom(seed ?? Date.now());

  // Get existing nodes
  const existingNodes = graph.getAllNodes();
  const nodeIds = existingNodes.map(n => n.id);

  if (nodeIds.length < 2) {
    return graph; // Need at least 2 nodes for a path
  }

  // Track existing paths to avoid duplicates
  const existingPathSignatures = new Set<string>();
  for (const path of groundTruth) {
    existingPathSignatures.add(pathSignature(path));
  }

  let nodesAdded = 0;
  let edgesAdded = 0;

  // Add noise paths
  for (let i = 0; i < numNoisePaths; i++) {
    const source = nodeIds[rng.nextInt(0, nodeIds.length - 1)]!;
    const target = nodeIds[rng.nextInt(0, nodeIds.length - 1)]!;

    if (source === target) {
      continue; // Skip self-loops
    }

    // Random path length (1-4 edges)
    const pathLength = rng.nextInt(1, 4);

    // Create simple path (direct or with intermediate nodes)
    const noisePath = createSimplePath(graph, source, target, pathLength, rng, nodesAdded, edgesAdded);

    // Only add if not duplicate
    const signature = pathSignature(noisePath);
    if (!existingPathSignatures.has(signature)) {
      // Add nodes and edges to graph
      for (const node of noisePath.nodes) {
        if (!graph.hasNode(node.id)) {
          graph.addNode(node);
          nodesAdded++;
        }
      }

      for (const edge of noisePath.edges) {
        // Check if edge exists
        const existing = graph.getEdge(edge.id);
        if (!existing.some) {
          graph.addEdge(edge);
          edgesAdded++;
        }
      }

      existingPathSignatures.add(signature);
    }
  }

  return graph;
};

/**
 * Create a simple path between two nodes.
 * @param graph
 * @param source
 * @param target
 * @param length
 * @param rng
 * @param nodeOffset
 * @param edgeOffset
 */
const createSimplePath = <N extends Node, E extends Edge>(graph: Graph<N, E>, source: string, target: string, length: number, rng: SeededRandom, nodeOffset: number, edgeOffset: number): Path<N, E> => {
  const nodes: N[] = [];
  const edges: E[] = [];

  const sourceNode = graph.getNode(source);
  if (!sourceNode.some) {
    // Source node doesn't exist, return empty path
    return {
      nodes: [],
      edges: [],
      totalWeight: 0,
    };
  }
  nodes.push(sourceNode.value);

  let currentSource = source;

  for (let i = 0; i < length - 1; i++) {
    const intermediateId = `noise_node_${nodeOffset + i}`;
    const edgeId = `noise_edge_${edgeOffset + i}`;

    const intermediateNode = { id: intermediateId } as N;
    const edge: E = {
      id: edgeId,
      source: currentSource,
      target: intermediateId,
      weight: rng.nextDouble() * 0.3, // Low MI (noise)
    } as E;

    nodes.push(intermediateNode);
    edges.push(edge);

    currentSource = intermediateId;
  }

  // Final edge to target
  const finalEdgeId = `noise_edge_${edgeOffset + length - 1}`;
  const finalEdge: E = {
    id: finalEdgeId,
    source: currentSource,
    target: target,
    weight: rng.nextDouble() * 0.3, // Low MI (noise)
  } as E;

  edges.push(finalEdge);

  // Get target node
  const targetNode = graph.getNode(target);
  if (targetNode.some) {
    nodes.push(targetNode.value);
  }

  return {
    nodes,
    edges,
    totalWeight: edges.reduce((sum, e) => sum + (e.weight ?? 0), 0),
  };
};

/**
 * Generate path signature for deduplication.
 * @param path
 */
const pathSignature = <N extends Node, E extends Edge>(path: Path<N, E>): string => path.edges.map(e => `${e.source}-${e.target}`).join('|');

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
   * Generate random integer in [min, max].
   * @param min
   * @param max
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextDouble() * (max - min + 1)) + min;
  }
}
