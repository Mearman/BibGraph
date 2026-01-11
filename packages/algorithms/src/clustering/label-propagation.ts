/**
 * Label Propagation clustering algorithm implementation.
 * Fast clustering via asynchronous label propagation with majority voting.
 *
 * Algorithm:
 * 1. Initialize: Assign unique label to each node
 * 2. Iterate: Each node adopts most frequent label among neighbors
 * 3. Random ordering: Process nodes in random order each iteration
 * 4. Convergence: Stop when no labels change or max iterations reached
 *
 * Time Complexity: O(m) per iteration, typically 3-5 iterations → O(m)
 * Space Complexity: O(n)
 * @module clustering/label-propagation
 */

import type { Graph } from '../graph/graph';
import type {
  ClusterId,
  ClusteringError,
  LabelCluster,
  LabelPropagationResult,
} from '../types/clustering-types';
import type { Edge,Node } from '../types/graph';
import { Err,Ok } from '../types/result';
import type { WeightFunction } from '../types/weight-function';

/**
 * Label Propagation clustering algorithm.
 *
 * Fast semi-supervised clustering algorithm that propagates labels through
 * the network based on neighbor voting. Nodes iteratively adopt the most
 * frequent label among their neighbors.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph (directed or undirected)
 * @param options - Optional configuration
 * @param options.weightFn - Weight function for edges (default: all edges weight 1.0)
 * @param options.maxIterations - Maximum iterations (default: 100)
 * @param options.seed - Random seed for reproducibility (default: Date.now())
 * @returns Result containing clusters or error
 * @example
 * ```typescript
 * const graph = new Graph<PaperNode, CitationEdge>(true);
 * // ... add nodes and edges ...
 *
 * const result = labelPropagation(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.clusters.length} clusters`);
 *   console.log(`Converged: ${result.value.metadata.converged}`);
 *   console.log(`Iterations: ${result.value.metadata.iterations}`);
 * }
 * ```
 */
export const labelPropagation = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: {
    weightFn?: WeightFunction<N, E>;
    maxIterations?: number;
    seed?: number;
  } = {}): LabelPropagationResult<N> => {
  const startTime = performance.now();

  const {
    maxIterations = 10, // Label propagation typically converges in 3-5 iterations
    seed = Date.now(),
  } = options;

  // Validate input
  const allNodes = graph.getAllNodes();
  if (allNodes.length === 0) {
    return Err<ClusteringError>({
      type: 'EmptyGraph',
      message: 'Cannot perform label propagation on empty graph',
    });
  }

  // Initialize: Each node gets unique label (use node index as label)
  const nodeToLabel = new Map<string, ClusterId>();
  const nodeIds: string[] = [];

  allNodes.forEach((node, index) => {
    nodeIds.push(node.id);
    nodeToLabel.set(node.id, index); // Node index as initial label
  });

  // Pre-compute adjacency lists for fast neighbor lookup (critical optimization)
  const outgoingNeighbors = new Map<string, string[]>();
  const incomingNeighbors = new Map<string, string[]>();

  for (let nodeIndex = 0; nodeIndex < allNodes.length; nodeIndex++) {
    const node = allNodes[nodeIndex];
    const outgoing: string[] = [];
    const outgoingResult = graph.getOutgoingEdges(node.id);
    if (outgoingResult.ok) {
      const edges = outgoingResult.value;
      for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
        const edge = edges[edgeIndex];
        outgoing.push(edge.target);
        // Build incoming map simultaneously - optimize get/set pattern
        let targetNeighbors = incomingNeighbors.get(edge.target);
        if (!targetNeighbors) {
          targetNeighbors = [];
          incomingNeighbors.set(edge.target, targetNeighbors);
        }
        targetNeighbors.push(edge.source);
      }
    }
    outgoingNeighbors.set(node.id, outgoing);
  }

  // Seed random number generator for reproducibility
  let rngState = seed;
  const seededRandom = (): number => {
    // Linear congruential generator (simple PRNG)
    rngState = (rngState * 1_103_515_245 + 12_345) & 0x7F_FF_FF_FF;
    return rngState / 0x7F_FF_FF_FF;
  };

  // Fisher-Yates shuffle with seeded RNG
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Iterate: Asynchronous label propagation
  let iteration = 0;
  let converged = false;

  // Pre-allocate reusable objects to minimize allocations in hot path
  const labelCounts = new Map<ClusterId, number>();
  const tiedLabels: ClusterId[] = [];
  const shuffledNodeIds = new Array<string>(nodeIds.length);

  while (!converged && iteration < maxIterations) {
    iteration++;
    let changedCount = 0;

    // Process nodes in random order (asynchronous updates) - reuse array
    const randomOrder = shuffleArray(nodeIds);

    // Copy to reusable array to avoid allocation
    for (let i = 0; i < randomOrder.length; i++) {
      shuffledNodeIds[i] = randomOrder[i];
    }

    for (let nodeIndex = 0; nodeIndex < shuffledNodeIds.length; nodeIndex++) {
      const nodeId = shuffledNodeIds[nodeIndex];
      const currentLabel = nodeToLabel.get(nodeId);
      if (currentLabel === undefined) continue;

      // Clear and reuse labelCounts Map instead of creating new one
      labelCounts.clear();

      // Collect neighbor labels from outgoing edges (using cached adjacency list)
      const outgoing = outgoingNeighbors.get(nodeId);
      if (outgoing) {
        for (let neighborIndex = 0; neighborIndex < outgoing.length; neighborIndex++) {
          const neighborId = outgoing[neighborIndex];
          const neighborLabel = nodeToLabel.get(neighborId);
          if (neighborLabel !== undefined) {
            const currentCount = labelCounts.get(neighborLabel);
            labelCounts.set(neighborLabel, currentCount ? currentCount + 1 : 1);
          }
        }
      }

      // Collect neighbor labels from incoming edges (for directed graphs)
      if (graph.isDirected()) {
        const incoming = incomingNeighbors.get(nodeId);
        if (incoming) {
          for (let neighborIndex = 0; neighborIndex < incoming.length; neighborIndex++) {
            const neighborId = incoming[neighborIndex];
            const neighborLabel = nodeToLabel.get(neighborId);
            if (neighborLabel !== undefined) {
              const currentCount = labelCounts.get(neighborLabel);
              labelCounts.set(neighborLabel, currentCount ? currentCount + 1 : 1);
            }
          }
        }
      }

      // Find most frequent label (majority voting) - optimize iteration
      if (labelCounts.size > 0) {
        let maxWeight = 0;
        let bestLabel = currentLabel;
        tiedLabels.length = 0; // Clear and reuse array

        // Use for...of loop which is more efficient than forEach with callback
        for (const [label, weight] of labelCounts.entries()) {
          if (weight > maxWeight) {
            maxWeight = weight;
            bestLabel = label;
            tiedLabels.length = 0; // Clear ties
            tiedLabels.push(label);
          } else if (weight === maxWeight) {
            tiedLabels.push(label);
          }
        }

        // Tie-breaking: Choose randomly among tied labels
        if (tiedLabels.length > 1) {
          const randomIndex = Math.floor(seededRandom() * tiedLabels.length);
          bestLabel = tiedLabels[randomIndex];
        }

        // Update label if changed
        if (bestLabel !== currentLabel) {
          nodeToLabel.set(nodeId, bestLabel);
          changedCount++;
        }
      }
    }

    // Convergence check: No labels changed
    if (changedCount === 0) {
      converged = true;
    }
  }

  // Build clusters from final label assignments - optimize with for loops
  const labelToNodes = new Map<ClusterId, Set<N>>();

  for (let nodeIndex = 0; nodeIndex < allNodes.length; nodeIndex++) {
    const node = allNodes[nodeIndex];
    const label = nodeToLabel.get(node.id);
    if (label === undefined) continue;

    let labelNodes = labelToNodes.get(label);
    if (!labelNodes) {
      labelNodes = new Set<N>();
      labelToNodes.set(label, labelNodes);
    }
    labelNodes.add(node);
  }

  // Convert to LabelCluster array - optimize iteration
  const clusters: LabelCluster<N>[] = [];
  const labels = [...labelToNodes.keys()];

  for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
    const label = labels[labelIndex];
    const nodes = labelToNodes.get(label);
    if (nodes) {
      clusters.push({
        label,
        nodes,
        size: nodes.size,
        iterations: iteration,
        stable: converged,
      });
    }
  }

  const endTime = performance.now();
  const runtime = endTime - startTime;

  return Ok({
    clusters,
    metadata: {
      algorithm: 'label-propagation',
      runtime,
      converged,
      iterations: iteration,
      parameters: {
        maxIterations,
        seed,
      },
    },
  });
};
