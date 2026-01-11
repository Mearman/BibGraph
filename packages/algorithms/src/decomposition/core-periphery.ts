/**
 * Core-periphery decomposition using Borgatti-Everett model.
 * Identifies densely connected core nodes and sparsely connected periphery nodes.
 *
 * Algorithm overview:
 * 1. Initialize coreness scores based on node degree (high degree → high initial coreness)
 * 2. Iteratively update coreness scores based on neighbor coreness (core nodes connected to core)
 * 3. Converge when coreness changes fall below epsilon threshold
 * 4. Apply threshold to separate core (coreness > threshold) from periphery
 * 5. Calculate fit quality (correlation between observed and ideal structure)
 *
 * Time complexity: O(k * E) where k = iterations (typically < 100), E = edges
 * Space complexity: O(V) for coreness scores
 * @module decomposition/core-periphery
 */

import type { Graph } from '../graph/graph';
import type {
  CorePeripheryResult,
  CorePeripheryStructure,
} from '../types/clustering-types';
import type { Edge,Node } from '../types/graph';
import { Err,Ok } from '../types/result';

/**
 * Default parameters for core-periphery decomposition.
 */
const DEFAULT_CORE_THRESHOLD = 0.7; // Coreness > 0.7 → core
const DEFAULT_MAX_ITERATIONS = 100; // Maximum iterations for convergence
const DEFAULT_EPSILON = 0.001; // Convergence threshold

/**
 * Options for core-periphery decomposition.
 */
export interface CorePeripheryOptions {
  /** Threshold for core membership (default: 0.7) */
  coreThreshold?: number;

  /** Maximum iterations for convergence (default: 100) */
  maxIterations?: number;

  /** Convergence epsilon (default: 0.001) */
  epsilon?: number;
}

/**
 * Perform core-periphery decomposition on a graph using Borgatti-Everett model.
 *
 * Identifies a dense core of highly connected nodes and a sparse periphery.
 * Core nodes have high coreness scores (> threshold) and are densely connected to each other.
 * Periphery nodes have low coreness scores and are sparsely connected.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph (directed or undirected)
 * @param options - Optional parameters (threshold, iterations, epsilon)
 * @returns Result with core-periphery structure or error
 * @example
 * ```typescript
 * const result = corePeripheryDecomposition(citationGraph, { coreThreshold: 0.7 });
 * if (result.ok) {
 *   console.log(`Core: ${result.value.structure.coreNodes.size} nodes`);
 *   console.log(`Periphery: ${result.value.structure.peripheryNodes.size} nodes`);
 *   console.log(`Fit quality: ${result.value.structure.fitQuality}`);
 * }
 * ```
 */
export const corePeripheryDecomposition = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: CorePeripheryOptions = {}): CorePeripheryResult<string> => {
  const startTime = performance.now();

  // Validate input
  const nodeCount = graph.getNodeCount();
  if (nodeCount === 0) {
    return Err({
      type: 'EmptyGraph',
      message: 'Cannot decompose empty graph',
    });
  }

  if (nodeCount < 3) {
    return Err({
      type: 'InsufficientNodes',
      message: 'Core-periphery decomposition requires at least 3 nodes',
      required: 3,
      actual: nodeCount,
    });
  }

  // Extract options with defaults
  const coreThreshold = options.coreThreshold ?? DEFAULT_CORE_THRESHOLD;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const epsilon = options.epsilon ?? DEFAULT_EPSILON;

  // Validate parameters
  if (coreThreshold < 0 || coreThreshold > 1) {
    return Err({
      type: 'InvalidInput',
      message: `Core threshold must be in range [0, 1], got ${coreThreshold}`,
    });
  }

  if (maxIterations < 1) {
    return Err({
      type: 'InvalidInput',
      message: `Max iterations must be positive, got ${maxIterations}`,
    });
  }

  if (epsilon <= 0) {
    return Err({
      type: 'InvalidInput',
      message: `Epsilon must be positive, got ${epsilon}`,
    });
  }

  const nodes = graph.getAllNodes();
  const nodeIds = nodes.map((n) => n.id);

  // Build adjacency map for efficient neighbor lookup
  // For directed graphs (citations), use BOTH in-degree and out-degree
  // This ensures core nodes are both highly cited AND cite each other
  const adjacency = new Map<string, Set<string>>();
  const inDegree = new Map<string, Set<string>>(); // Incoming edges (who cites this node)

  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, new Set());
    inDegree.set(nodeId, new Set());
  }

  // Build both outgoing and incoming adjacency lists
  const edges = graph.getAllEdges();
  for (const edge of edges) {
    // Outgoing: source → target
    adjacency.get(edge.source)?.add(edge.target);
    // Incoming: target ← source
    inDegree.get(edge.target)?.add(edge.source);
  }

  // For undirected graphs or to treat citations bidirectionally,
  // combine both directions for degree calculation
  const isDirected = graph.isDirected();
  if (isDirected) {
    // For directed graphs (citations), use in-degree as primary signal
    // Highly cited papers (high in-degree) are core members
    for (const nodeId of nodeIds) {
      const incoming = inDegree.get(nodeId) || new Set();
      const outgoing = adjacency.get(nodeId) || new Set();
      // Combine both: highly cited papers that also cite others
      const combined = new Set([...incoming, ...outgoing]);
      adjacency.set(nodeId, combined);
    }
  }

  // Step 1: Initialize coreness scores based on degree
  // High-degree nodes start with high coreness (potential core members)
  const corenessScores = initializeCorenessScores(nodeIds, adjacency);

  // Step 2: Iterative coreness optimization using matrix approach
  // Borgatti-Everett: maximize correlation between observed edges and coreness product
  let converged = false;
  let previousFit = -Infinity;
  let iterations: number;

  for (iterations = 0; iterations < maxIterations; iterations++) {
    // Update coreness scores to maximize fit with ideal core-periphery pattern
    updateCorenessScoresOptimized(nodeIds, edges, corenessScores);

    // Calculate current fit quality
    const currentFit = calculateCorrelationFit(edges, corenessScores, nodeIds.length);

    // Step 3: Convergence detection (fit improvement < epsilon)
    const fitImprovement = currentFit - previousFit;
    if (Math.abs(fitImprovement) < epsilon) {
      converged = true;
      break;
    }

    previousFit = currentFit;
  }

  // Step 4: Apply core threshold
  const { coreNodes, peripheryNodes } = applyCoreThreshold(
    nodeIds,
    corenessScores,
    coreThreshold
  );

  // Step 5: Calculate fit quality
  const fitQuality = calculateFitQuality(
    graph,
    coreNodes,
    peripheryNodes
  );

  const structure: CorePeripheryStructure<string> = {
    coreNodes,
    peripheryNodes,
    corenessScores,
    coreThreshold,
    fitQuality,
  };

  const endTime = performance.now();
  const runtime = endTime - startTime;

  return Ok({
    structure,
    metadata: {
      algorithm: 'core-periphery',
      runtime,
      iterations,
      converged,
      parameters: {
        coreThreshold,
        maxIterations,
        epsilon,
      },
    },
  });
};

/**
 * Initialize coreness scores based on node degree.
 * High-degree nodes get high initial coreness (potential core members).
 *
 * Formula: coreness[v] = degree[v] / max_degree
 * Normalized to [0, 1] range.
 * @param nodeIds
 * @param adjacency
 */
const initializeCorenessScores = (nodeIds: string[], adjacency: Map<string, Set<string>>): Map<string, number> => {
  const corenessScores = new Map<string, number>();

  // Find max degree for normalization
  let maxDegree = 0;
  for (const nodeId of nodeIds) {
    const degree = adjacency.get(nodeId)?.size ?? 0;
    maxDegree = Math.max(maxDegree, degree);
  }

  // Avoid division by zero for isolated graphs
  if (maxDegree === 0) {
    maxDegree = 1;
  }

  // Initialize coreness = normalized degree
  for (const nodeId of nodeIds) {
    const degree = adjacency.get(nodeId)?.size ?? 0;
    const coreness = degree / maxDegree;
    corenessScores.set(nodeId, coreness);
  }

  return corenessScores;
};

/**
 * Update coreness scores using Borgatti-Everett optimization.
 * Maximizes correlation between observed adjacency and coreness products.
 *
 * Formula: coreness[i] = Σ(adj[i,j] * coreness[j]) / degree[i]
 * This is essentially computing eigenvector centrality weighted by current coreness.
 * @param nodeIds
 * @param edges
 * @param corenessScores
 */
const updateCorenessScoresOptimized = <E extends Edge>(nodeIds: string[], edges: E[], corenessScores: Map<string, number>): void => {
  const newScores = new Map<string, number>();

  // Build index map for fast lookup
  const nodeIndex = new Map<string, number>();
  nodeIds.forEach((id, idx) => nodeIndex.set(id, idx));

  // For each node, calculate sum of neighbor coreness (Borgatti-Everett formula)
  // C_i = Σ_j (a_ij * C_j) where a_ij is adjacency
  for (const nodeId of nodeIds) {
    let weightedSum = 0;

    // Sum coreness of all neighbors (both incoming and outgoing edges)
    for (const edge of edges) {
      if (edge.source === nodeId) {
        // Outgoing edge: add target's coreness
        weightedSum += corenessScores.get(edge.target) ?? 0;
      } else if (edge.target === nodeId) {
        // Incoming edge: add source's coreness
        weightedSum += corenessScores.get(edge.source) ?? 0;
      }
    }

    // Store sum (not average) - this creates score separation
    newScores.set(nodeId, weightedSum);
  }

  // Only normalize if scores exceed valid [0, 1] range
  // This prevents artificial inflation when max score < 1.0
  const maxScore = Math.max(...newScores.values(), 0);
  if (maxScore > 1) {
    // Scores exceed range, normalize to prevent overflow
    for (const [nodeId, score] of newScores) {
      corenessScores.set(nodeId, score / maxScore);
    }
  } else {
    // Scores already in valid range, update without normalization
    for (const [nodeId, score] of newScores) {
      corenessScores.set(nodeId, score);
    }
  }
};

/**
 * Calculate correlation fit between observed edges and coreness products.
 * Higher correlation = better core-periphery structure.
 *
 * Returns: Pearson correlation coefficient between adj[i,j] and coreness[i]*coreness[j]
 * @param edges
 * @param corenessScores
 * @param nodeCount
 */
const calculateCorrelationFit = <E extends Edge>(edges: E[], corenessScores: Map<string, number>, nodeCount: number): number => {
  // Calculate mean edge presence and mean coreness product
  const edgeCount = edges.length;
  const possibleEdges = nodeCount * (nodeCount - 1); // Directed graph

  const meanEdgePresence = edgeCount / possibleEdges;

  // Calculate mean coreness product
  let sumCorenessProduct = 0;
  let count = 0;

  // Sample coreness products for efficiency (use all edges + some non-edges)
  for (const edge of edges) {
    const c_i = corenessScores.get(edge.source) ?? 0;
    const c_j = corenessScores.get(edge.target) ?? 0;
    sumCorenessProduct += c_i * c_j;
    count++;
  }

  const meanCorenessProduct = count > 0 ? sumCorenessProduct / count : 0;

  // Calculate correlation components
  let numerator = 0;
  let sumSqEdge = 0;
  let sumSqCoreness = 0;

  for (const edge of edges) {
    const c_i = corenessScores.get(edge.source) ?? 0;
    const c_j = corenessScores.get(edge.target) ?? 0;
    const corenessProduct = c_i * c_j;

    // Edge present: value = 1
    const edgePresence = 1;

    numerator += (edgePresence - meanEdgePresence) * (corenessProduct - meanCorenessProduct);
    sumSqEdge += (edgePresence - meanEdgePresence) ** 2;
    sumSqCoreness += (corenessProduct - meanCorenessProduct) ** 2;
  }

  // Avoid division by zero
  if (sumSqEdge === 0 || sumSqCoreness === 0) {
    return 0;
  }

  const correlation = numerator / Math.sqrt(sumSqEdge * sumSqCoreness);
  return correlation;
};

/**
 * Apply core threshold to separate core from periphery.
 * Nodes with coreness > threshold → core
 * Nodes with coreness ≤ threshold → periphery
 * @param nodeIds
 * @param corenessScores
 * @param threshold
 */
const applyCoreThreshold = (nodeIds: string[], corenessScores: Map<string, number>, threshold: number): { coreNodes: Set<string>; peripheryNodes: Set<string> } => {
  const coreNodes = new Set<string>();
  const peripheryNodes = new Set<string>();

  for (const nodeId of nodeIds) {
    const coreness = corenessScores.get(nodeId) ?? 0;

    if (coreness > threshold) {
      coreNodes.add(nodeId);
    } else {
      peripheryNodes.add(nodeId);
    }
  }

  return { coreNodes, peripheryNodes };
};

/**
 * Calculate fit quality (correlation between observed and ideal structure).
 * Ideal core-periphery structure:
 * - Core-core edges: All possible edges present (density = 1.0)
 * - Core-periphery edges: Some edges (density = 0.5)
 * - Periphery-periphery edges: No edges (density = 0.0)
 *
 * Fit quality = correlation coefficient between observed and ideal
 * Range: [-1, 1], higher is better
 * @param graph
 * @param coreNodes
 * @param peripheryNodes
 */
const calculateFitQuality = <N extends Node, E extends Edge>(graph: Graph<N, E>, coreNodes: Set<string>, peripheryNodes: Set<string>): number => {
  const edges = graph.getAllEdges();

  // Count observed edges by type
  let coreCoreEdges = 0;
  let corePeripheryEdges = 0;
  let peripheryPeripheryEdges = 0;

  for (const edge of edges) {
    const sourceInCore = coreNodes.has(edge.source);
    const targetInCore = coreNodes.has(edge.target);

    if (sourceInCore && targetInCore) {
      coreCoreEdges++;
    } else if (sourceInCore || targetInCore) {
      corePeripheryEdges++;
    } else {
      peripheryPeripheryEdges++;
    }
  }

  // Calculate observed densities
  const coreSize = coreNodes.size;
  const peripherySize = peripheryNodes.size;

  const possibleCoreCoreEdges = coreSize * (coreSize - 1);
  const possibleCorePeripheryEdges = coreSize * peripherySize;
  const possiblePeripheryPeripheryEdges = peripherySize * (peripherySize - 1);

  const observedCoreDensity =
    possibleCoreCoreEdges > 0 ? coreCoreEdges / possibleCoreCoreEdges : 0;
  const observedCPDensity =
    possibleCorePeripheryEdges > 0
      ? corePeripheryEdges / possibleCorePeripheryEdges
      : 0;
  const observedPeripheryDensity =
    possiblePeripheryPeripheryEdges > 0
      ? peripheryPeripheryEdges / possiblePeripheryPeripheryEdges
      : 0;

  // Ideal densities (Borgatti-Everett model)
  const idealCoreDensity = 1; // All core-core edges present
  const idealCPDensity = 0.5; // Some core-periphery edges
  const idealPeripheryDensity = 0; // No periphery-periphery edges

  // Calculate correlation coefficient (Pearson's r)
  const observed = [observedCoreDensity, observedCPDensity, observedPeripheryDensity];
  const ideal = [idealCoreDensity, idealCPDensity, idealPeripheryDensity];

  // Pearson correlation: r = Σ((x - x̄)(y - ȳ)) / sqrt(Σ(x - x̄)² * Σ(y - ȳ)²)
  const meanObserved = observed.reduce((sum, v) => sum + v, 0) / observed.length;
  const meanIdeal = ideal.reduce((sum, v) => sum + v, 0) / ideal.length;

  let numerator = 0;
  let sumSquaredObserved = 0;
  let sumSquaredIdeal = 0;

  for (const [i, element] of observed.entries()) {
    const diffObserved = element - meanObserved;
    const diffIdeal = ideal[i] - meanIdeal;

    numerator += diffObserved * diffIdeal;
    sumSquaredObserved += diffObserved * diffObserved;
    sumSquaredIdeal += diffIdeal * diffIdeal;
  }

  // Avoid division by zero
  if (sumSquaredObserved === 0 || sumSquaredIdeal === 0) {
    return 0;
  }

  const denominator = Math.sqrt(sumSquaredObserved * sumSquaredIdeal);
  const correlation = numerator / denominator;

  // Clamp to valid range [-1, 1] (handle floating point errors)
  return Math.max(-1, Math.min(1, correlation));
};
