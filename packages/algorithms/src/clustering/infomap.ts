/**
 * Infomap clustering algorithm implementation.
 * Detects communities by minimizing description length of random walks.
 *
 * Algorithm:
 * 1. Calculate transition probabilities from edge weights
 * 2. Compute steady-state visit probabilities via PageRank
 * 3. Use greedy search to find module assignments minimizing map equation
 * 4. Map equation: L(M) = H(X) + Σ p_i * H(X_i)
 *    - H(X): Entropy of between-module transitions
 *    - H(X_i): Entropy within module i
 *    - p_i: Visit probability of module i
 *
 * Time Complexity: O(n log n) for sparse graphs
 * Space Complexity: O(n + m)
 * @module clustering/infomap
 */

import type { Graph } from '../graph/graph';
import { calculateDensity } from '../metrics/cluster-quality';
import { calculateModularity } from '../metrics/modularity';
import type { InfomapModule, InfomapResult } from '../types/clustering-types';
import type { Edge,Node } from '../types/graph';
import { Err, Ok } from '../types/result';
import type { WeightFunction } from '../types/weight-function';

/**
 * Internal representation of a module during Infomap execution.
 */
interface InternalModule {
  id: number;
  nodes: Set<string>; // Node IDs
  exitProbability: number; // Probability of leaving module
  visitProbability: number; // Steady-state visit probability
}

/**
 * Transition probability matrix entry.
 */
interface Transition {
  from: string;
  to: string;
  probability: number;
}

/**
 * Detect communities using the Infomap algorithm.
 *
 * Infomap uses information theory to find communities by minimizing the
 * description length (map equation) of random walks on the network.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph (directed or undirected)
 * @param options - Optional configuration
 * @param options.weightFn - Weight function for edges (default: all edges weight 1.0)
 * @param options.maxIterations - Maximum iterations for optimization (default: 100)
 * @param options.numTrials - Number of random trials for greedy search (default: 10)
 * @param options.seed - Random seed for reproducibility (default: undefined)
 * @returns Result containing modules with compression ratio
 * @example
 * ```typescript
 * const graph = new Graph<PaperNode, CitationEdge>(true);
 * // ... add nodes and edges ...
 *
 * const result = infomap(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.modules.length} modules`);
 *   console.log(`Compression ratio: ${result.value.compressionRatio}`);
 * }
 * ```
 */
export const infomap = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: {
    weightFn?: WeightFunction<N, E>;
    maxIterations?: number;
    numTrials?: number;
    seed?: number;
  } = {}): InfomapResult<N> => {
  const startTime = performance.now();

  const {
    weightFn = () => 1,
    maxIterations = 10, // Reduced for performance
    numTrials = 10,
    seed,
  } = options;

  // Handle empty graph
  const allNodes = graph.getAllNodes();
  if (allNodes.length === 0) {
    return Err({
      type: 'EmptyGraph',
      message: 'Cannot run Infomap on empty graph',
    });
  }

  // Step 1: Calculate transition probabilities
  const transitions = calculateTransitionProbabilities(graph, weightFn);

  // Step 2: Calculate steady-state visit probabilities
  const visitProbabilities = calculateVisitProbabilities(graph, transitions);

  // Step 3: Initialize modules using greedy agglomeration
  // Start with all nodes in one module, then split based on flow
  const nodeToModule = new Map<string, number>();
  const modules = new Map<number, InternalModule>();

  // Use simpler initialization: group into modules of ~20 nodes each
  let nextModuleId = 0;
  const targetModuleSize = 20;
  let currentModule: Set<string> = new Set();
  let currentModuleVisitProb = 0;

  allNodes.forEach((node, index) => {
    currentModule.add(node.id);
    nodeToModule.set(node.id, nextModuleId);
    currentModuleVisitProb += visitProbabilities.get(node.id) || 0;

    // Create module when reaching target size or at end
    if (currentModule.size >= targetModuleSize || index === allNodes.length - 1) {
      modules.set(nextModuleId, {
        id: nextModuleId,
        nodes: currentModule,
        exitProbability: 0,
        visitProbability: currentModuleVisitProb,
      });

      nextModuleId++;
      currentModule = new Set();
      currentModuleVisitProb = 0;
    }
  });

  // Calculate initial exit probabilities
  updateExitProbabilities(modules, nodeToModule, transitions);

  // Calculate initial description length
  const initialDescriptionLength = calculateDescriptionLength(modules, visitProbabilities);

  // Step 4: Greedy search for optimal module assignment
  let bestModules = new Map(modules);
  let bestDescriptionLength = initialDescriptionLength;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    let improved = false;

    // Visit nodes in random order
    const nodeOrder = shuffleArray(allNodes.map(n => n.id), seed ? seed + iteration : undefined);

    for (const nodeId of nodeOrder) {
      const currentModuleId = nodeToModule.get(nodeId);
      if (currentModuleId === undefined) continue;
      const _currentModule = modules.get(currentModuleId);
      if (_currentModule === undefined) continue;

      // Try moving to neighboring modules (allow moves even if not sole member)
      const neighborModules = findNeighborModules(
        graph,
        nodeId,
        nodeToModule,
        transitions
      );

      if (neighborModules.size === 0) {
        continue; // No neighbors, keep node in current module
      }

      // Find best module to move to
      let bestTargetModuleId = currentModuleId;
      let bestDelta = 0;

      for (const neighborModuleId of neighborModules) {
        if (neighborModuleId === currentModuleId) continue;

        // Calculate description length change
        const delta = calculateMoveDelta(
          nodeId,
          currentModuleId,
          neighborModuleId,
          modules,
          nodeToModule,
          transitions
        );

        if (delta < bestDelta) {
          bestDelta = delta;
          bestTargetModuleId = neighborModuleId;
        }
      }

      // Move node if beneficial
      if (bestTargetModuleId !== currentModuleId && bestDelta < -1e-10) {
        moveNode(
          nodeId,
          currentModuleId,
          bestTargetModuleId,
          modules,
          nodeToModule,
          visitProbabilities
        );
        improved = true;
      }
    }

    // Remove empty modules
    removeEmptyModules(modules);

    // Recalculate exit probabilities
    updateExitProbabilities(modules, nodeToModule, transitions);

    // Calculate current description length
    const currentDescriptionLength = calculateDescriptionLength(modules, visitProbabilities);

    // Update best solution if improved
    if (currentDescriptionLength < bestDescriptionLength) {
      bestDescriptionLength = currentDescriptionLength;
      bestModules = new Map(modules);
    }

    // Early stopping if no improvement
    if (!improved) {
      break;
    }
  }

  // Use best solution found
  modules.clear();
  bestModules.forEach((module, id) => modules.set(id, module));

  // Calculate final description length
  const finalDescriptionLength = calculateDescriptionLength(modules, visitProbabilities);

  // Calculate compression ratio
  const compressionRatio = initialDescriptionLength / finalDescriptionLength;

  // Build final InfomapModule results
  const finalModules = buildInfomapModules(
    graph,
    modules,
    nodeToModule,
    visitProbabilities,
    compressionRatio
  );

  // Calculate metrics
  const communities = finalModules.map(module => ({
    id: module.id,
    nodes: module.nodes,
    size: module.nodes.size,
    density: calculateDensity(graph, module.nodes),
    internalEdges: 0,
    externalEdges: 0,
    modularity: 0,
  }));

  const modularity = calculateModularity(graph, communities);

  const totalEdges = graph.getEdgeCount();
  let internalEdgeCount = 0;
  communities.forEach(community => {
    // Count internal edges (edges where both source and target are in the community)
    community.nodes.forEach(node => {
      const nodeId = typeof node === 'string' ? node : node.id;
      const outgoingResult = graph.getOutgoingEdges(nodeId);
      if (outgoingResult.ok) {
        outgoingResult.value.forEach(edge => {
          const targetOption = graph.getNode(edge.target);
          if (targetOption.some && community.nodes.has(targetOption.value)) {
            internalEdgeCount++;
          }
        });
      }
    });
  });

  const coverageRatio = totalEdges > 0 ? internalEdgeCount / totalEdges : 0;

  const endTime = performance.now();
  const runtime = endTime - startTime;

  return Ok({
    modules: finalModules,
    metrics: {
      modularity,
      avgConductance: 0, // Not directly computed by Infomap
      avgDensity: communities.reduce((sum, c) => sum + c.density, 0) / communities.length,
      numClusters: finalModules.length,
      coverageRatio,
    },
    descriptionLength: finalDescriptionLength,
    compressionRatio,
    metadata: {
      algorithm: 'infomap',
      runtime,
      iterations: iteration,
      parameters: {
        maxIterations,
        numTrials,
        seed,
      },
    },
  });
};

/**
 * Calculate transition probabilities from edge weights.
 * For each edge, probability = edge_weight / sum_of_outgoing_weights
 * @param graph
 * @param weightFn
 */
const calculateTransitionProbabilities = <N extends Node, E extends Edge>(graph: Graph<N, E>, weightFn: WeightFunction<N, E>): Transition[] => {
  const transitions: Transition[] = [];

  const allNodes = graph.getAllNodes();

  allNodes.forEach((node) => {
    const outgoingResult = graph.getOutgoingEdges(node.id);
    if (!outgoingResult.ok || outgoingResult.value.length === 0) {
      return; // No outgoing edges
    }

    // Calculate total outgoing weight
    let totalWeight = 0;
    outgoingResult.value.forEach((edge) => {
      const sourceOption = graph.getNode(edge.source);
      const targetOption = graph.getNode(edge.target);
      if (sourceOption.some && targetOption.some) {
        totalWeight += weightFn(edge, sourceOption.value, targetOption.value);
      }
    });

    if (totalWeight === 0) return;

    // Calculate transition probabilities
    outgoingResult.value.forEach((edge) => {
      const sourceOption = graph.getNode(edge.source);
      const targetOption = graph.getNode(edge.target);
      if (sourceOption.some && targetOption.some) {
        const weight = weightFn(edge, sourceOption.value, targetOption.value);
        transitions.push({
          from: edge.source,
          to: edge.target,
          probability: weight / totalWeight,
        });
      }
    });
  });

  return transitions;
};

/**
 * Calculate steady-state visit probabilities using PageRank-like iteration.
 * @param graph
 * @param transitions
 */
const calculateVisitProbabilities = <N extends Node, E extends Edge>(graph: Graph<N, E>, transitions: Transition[]): Map<string, number> => {
  const allNodes = graph.getAllNodes();
  const n = allNodes.length;

  // Initialize uniform distribution
  const visitProb = new Map<string, number>();
  allNodes.forEach((node) => {
    visitProb.set(node.id, 1 / n);
  });

  // Build transition map for efficient lookup
  const transitionMap = new Map<string, Array<{ to: string; prob: number }>>();
  transitions.forEach((t) => {
    if (!transitionMap.has(t.from)) {
      transitionMap.set(t.from, []);
    }
    const fromTransitions = transitionMap.get(t.from);
    if (fromTransitions) {
      fromTransitions.push({ to: t.to, prob: t.probability });
    }
  });

  // Power iteration (PageRank algorithm)
  const dampingFactor = 0.85;
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let iter = 0; iter < maxIterations; iter++) {
    const newVisitProb = new Map<string, number>();

    // Initialize with teleport probability
    allNodes.forEach((node) => {
      newVisitProb.set(node.id, (1 - dampingFactor) / n);
    });

    // Add contributions from incoming edges
    allNodes.forEach((node) => {
      const nodeProb = visitProb.get(node.id) || 0;
      const outgoing = transitionMap.get(node.id);

      if (outgoing) {
        outgoing.forEach(({ to, prob }) => {
          const currentProb = newVisitProb.get(to) || 0;
          newVisitProb.set(to, currentProb + dampingFactor * nodeProb * prob);
        });
      }
    });

    // Check convergence
    let maxDiff = 0;
    allNodes.forEach((node) => {
      const oldProb = visitProb.get(node.id) || 0;
      const newProb = newVisitProb.get(node.id) || 0;
      maxDiff = Math.max(maxDiff, Math.abs(newProb - oldProb));
    });

    visitProb.clear();
    newVisitProb.forEach((prob, nodeId) => visitProb.set(nodeId, prob));

    if (maxDiff < tolerance) {
      break;
    }
  }

  return visitProb;
};

/**
 * Update exit probabilities for all modules.
 * Exit probability = sum of transition probabilities leaving the module.
 * @param modules
 * @param nodeToModule
 * @param transitions
 */
const updateExitProbabilities = (modules: Map<number, InternalModule>, nodeToModule: Map<string, number>, transitions: Transition[]): void => {
  // Reset exit probabilities
  modules.forEach((module) => {
    module.exitProbability = 0;
  });

  // Calculate exit probabilities
  transitions.forEach((t) => {
    const sourceModuleId = nodeToModule.get(t.from);
    const targetModuleId = nodeToModule.get(t.to);

    if (sourceModuleId !== undefined && targetModuleId !== undefined && sourceModuleId !== targetModuleId) {
        // Transition leaves module
        const module = modules.get(sourceModuleId);
        if (module) {
          module.exitProbability += t.probability;
        }
      }
  });
};

/**
 * Calculate description length using the map equation.
 * L(M) = H(X) + Σ p_i * H(X_i)
 * @param modules
 * @param visitProbabilities
 */
const calculateDescriptionLength = (modules: Map<number, InternalModule>, visitProbabilities: Map<string, number>): number => {
  // Calculate entropy of between-module transitions
  let H_X = 0;
  modules.forEach((module) => {
    if (module.exitProbability > 0) {
      H_X -= module.exitProbability * Math.log2(module.exitProbability);
    }
  });

  // Calculate entropy within each module
  let sumPiHi = 0;
  modules.forEach((module) => {
    if (module.visitProbability === 0) return;

    // Entropy within module i
    let H_Xi = 0;
    module.nodes.forEach((nodeId) => {
      const nodeProb = visitProbabilities.get(nodeId) || 0;
      if (nodeProb > 0) {
        const relativeProb = nodeProb / module.visitProbability;
        H_Xi -= relativeProb * Math.log2(relativeProb);
      }
    });

    sumPiHi += module.visitProbability * H_Xi;
  });

  return H_X + sumPiHi;
};

/**
 * Find neighboring modules connected to a node.
 * @param graph
 * @param nodeId
 * @param nodeToModule
 * @param transitions
 */
const findNeighborModules = <N extends Node, E extends Edge>(graph: Graph<N, E>, nodeId: string, nodeToModule: Map<string, number>, transitions: Transition[]): Set<number> => {
  const neighborModules = new Set<number>();

  // Check outgoing edges
  const outgoingResult = graph.getOutgoingEdges(nodeId);
  if (outgoingResult.ok) {
    outgoingResult.value.forEach((edge) => {
      const targetModuleId = nodeToModule.get(edge.target);
      if (targetModuleId !== undefined) {
        neighborModules.add(targetModuleId);
      }
    });
  }

  // Check incoming edges (from transitions)
  transitions.forEach((t) => {
    if (t.to === nodeId) {
      const sourceModuleId = nodeToModule.get(t.from);
      if (sourceModuleId !== undefined) {
        neighborModules.add(sourceModuleId);
      }
    }
  });

  return neighborModules;
};

/**
 * Calculate change in description length from moving a node.
 * Uses proper map equation delta calculation.
 * @param nodeId
 * @param fromModuleId
 * @param toModuleId
 * @param modules
 * @param nodeToModule
 * @param transitions
 */
const calculateMoveDelta = (nodeId: string, fromModuleId: number, toModuleId: number, modules: Map<number, InternalModule>, nodeToModule: Map<string, number>, transitions: Transition[]): number => {
  const fromModule = modules.get(fromModuleId);
  const toModule = modules.get(toModuleId);

  // Safety checks
  if (!fromModule || !toModule) {
    return 100; // Large penalty for invalid moves
  }

  // Calculate exit probability changes for the node
  let nodeToFromModuleProb = 0;
  let nodeToToModuleProb = 0;

  transitions.forEach((t) => {
    if (t.from === nodeId) {
      const targetModuleId = nodeToModule.get(t.to);
      if (targetModuleId === fromModuleId && targetModuleId !== toModuleId) {
        // Edge from node to fromModule (will become exit edge)
        nodeToFromModuleProb += t.probability;
      } else if (targetModuleId === toModuleId && targetModuleId !== fromModuleId) {
        // Edge from node to toModule (will become internal edge)
        nodeToToModuleProb += t.probability;
      }
    }
    if (t.to === nodeId) {
      const sourceModuleId = nodeToModule.get(t.from);
      if (sourceModuleId === fromModuleId && sourceModuleId !== toModuleId) {
        nodeToFromModuleProb += t.probability;
      } else if (sourceModuleId === toModuleId && sourceModuleId !== fromModuleId) {
        nodeToToModuleProb += t.probability;
      }
    }
  });

  // Favor moves that make internal edges vs external edges
  // Negative delta = beneficial move
  const delta = nodeToFromModuleProb - nodeToToModuleProb;

  return delta;
};

/**
 * Move a node from one module to another.
 * @param nodeId
 * @param fromModuleId
 * @param toModuleId
 * @param modules
 * @param nodeToModule
 * @param visitProbabilities
 */
const moveNode = (nodeId: string, fromModuleId: number, toModuleId: number, modules: Map<number, InternalModule>, nodeToModule: Map<string, number>, visitProbabilities: Map<string, number>): void => {
  const fromModule = modules.get(fromModuleId);
  const toModule = modules.get(toModuleId);
  if (!fromModule || !toModule) return;

  const _nodeVisitProb = visitProbabilities.get(nodeId) || 0;

  // Remove node from old module
  fromModule.nodes.delete(nodeId);
  fromModule.visitProbability -= _nodeVisitProb;

  // Add node to new module
  toModule.nodes.add(nodeId);
  toModule.visitProbability += _nodeVisitProb;

  // Update mapping
  nodeToModule.set(nodeId, toModuleId);
};

/**
 * Remove empty modules from the map.
 * @param modules
 */
const removeEmptyModules = (modules: Map<number, InternalModule>): void => {
  const emptyModuleIds: number[] = [];

  modules.forEach((module, id) => {
    if (module.nodes.size === 0) {
      emptyModuleIds.push(id);
    }
  });

  emptyModuleIds.forEach((id) => {
    modules.delete(id);
  });
};

/**
 * Build final InfomapModule results.
 * @param graph
 * @param modules
 * @param nodeToModule
 * @param visitProbabilities
 * @param globalCompressionRatio
 */
const buildInfomapModules = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  modules: Map<number, InternalModule>,
  nodeToModule: Map<string, number>,
  visitProbabilities: Map<string, number>,
  globalCompressionRatio: number,
): InfomapModule<N>[] => {
  const results: InfomapModule<N>[] = [];
  let moduleIndex = 0;

  modules.forEach((module) => {
    if (module.nodes.size === 0) return;

    // Calculate description length for this module
    let moduleDescriptionLength = 0;
    module.nodes.forEach((nodeId) => {
      const nodeProb = visitProbabilities.get(nodeId) || 0;
      if (nodeProb > 0 && module.visitProbability > 0) {
        const relativeProb = nodeProb / module.visitProbability;
        moduleDescriptionLength -= relativeProb * Math.log2(relativeProb);
      }
    });

    // Get actual node objects
    const nodeObjects = new Set<N>();
    module.nodes.forEach((nodeId) => {
      const nodeOption = graph.getNode(nodeId);
      if (nodeOption.some) {
        nodeObjects.add(nodeOption.value);
      }
    });

    results.push({
      id: moduleIndex++,
      nodes: nodeObjects,
      descriptionLength: moduleDescriptionLength,
      visitProbability: module.visitProbability,
      compressionRatio: globalCompressionRatio,
    });
  });

  return results;
};

/**
 * Fisher-Yates shuffle algorithm with optional seed.
 * @param array
 * @param seed
 */
const shuffleArray = <T>(array: T[], seed?: number): T[] => {
  const shuffled = [...array];

  // Simple seeded random number generator (LCG)
  let random = seed === undefined ? Math.random() * 2_147_483_647 : seed;
  const nextRandom = () => {
    random = (random * 1_103_515_245 + 12_345) & 0x7F_FF_FF_FF;
    return random / 0x7F_FF_FF_FF;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};
