/**
 * Leiden community detection algorithm implementation.
 * Improves upon Louvain by guaranteeing connected communities through refinement phase.
 *
 * Algorithm:
 * 1. Phase 1 (Local Moving): Same as Louvain - move nodes to maximize modularity
 * 2. Phase 2 (Refinement): Split disconnected communities using BFS connectivity check
 * 3. Phase 3 (Aggregation): Merge communities into super-nodes
 * 4. Repeat until convergence
 *
 * Key improvement over Louvain: Refinement phase ensures all communities are connected.
 *
 * Time Complexity: O(n log n) for sparse graphs (similar to Louvain)
 * Space Complexity: O(n + m)
 * @module clustering/leiden
 */

import type { Graph } from '../graph/graph';
import { calculateClusterMetrics } from '../metrics/cluster-quality';
import { calculateConductance } from '../metrics/conductance';
import { calculateModularityDelta } from '../metrics/modularity';
import type { ClusteringError,ClusterMetrics, Community, LeidenCommunity } from '../types/clustering-types';
import type { Edge,Node } from '../types/graph';
import type { Result } from '../types/result';
import { Err,Ok } from '../types/result';
import type { WeightFunction } from '../types/weight-function';

/**
 * Internal representation of a community during Leiden execution.
 */
interface InternalCommunity {
  id: number;
  nodes: Set<string>; // Node IDs
  sigmaTot: number; // Sum of degrees of nodes in community
  sigmaIn: number; // Sum of edge weights within community
}

/**
 * Detect communities using the Leiden algorithm.
 *
 * The Leiden algorithm improves upon Louvain by adding a refinement phase that
 * guarantees all detected communities are connected subgraphs.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph (directed or undirected)
 * @param options - Optional configuration
 * @param options.weightFn - Weight function for edges (default: all edges weight 1.0)
 * @param options.resolution - Resolution parameter (default: 1.0, higher values favor more communities)
 * @param options.maxIterations - Maximum iterations per phase (default: 100)
 * @returns Result with array of detected Leiden communities
 * @example
 * ```typescript
 * const graph = new Graph<PaperNode, CitationEdge>(true);
 * // ... add nodes and edges ...
 *
 * const result = leiden(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.communities.length} communities`);
 *   result.value.communities.forEach((community) => {
 *     console.log(`Community ${community.id}: ${community.nodes.size} nodes, connected: ${community.isConnected}`);
 *   });
 * }
 * ```
 */
export const leiden = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: {
    weightFn?: WeightFunction<N, E>;
    resolution?: number;
    maxIterations?: number;
  } = {}): Result<
  {
    communities: LeidenCommunity<N>[];
    metrics: ClusterMetrics;
    metadata: {
      algorithm: 'leiden';
      runtime: number;
      iterations: number;
      parameters: {
        resolution?: number;
        maxIterations?: number;
      };
    };
  },
  ClusteringError
> => {
  const startTime = performance.now();
  const {
    weightFn = () => 1,
    resolution = 1,
    maxIterations = 100,
  } = options;

  // Handle empty graph
  const allNodes = graph.getAllNodes();
  if (allNodes.length === 0) {
    return Err({
      type: 'EmptyGraph',
      message: 'Cannot detect communities in empty graph',
    });
  }

  // Pre-compute incoming edges for directed graphs
  const incomingEdges = new Map<string, E[]>();
  if (graph.isDirected()) {
    allNodes.forEach((node) => {
      const outgoingResult = graph.getOutgoingEdges(node.id);
      if (outgoingResult.ok) {
        outgoingResult.value.forEach((edge) => {
          if (!incomingEdges.has(edge.target)) {
            incomingEdges.set(edge.target, []);
          }
          const targetEdges = incomingEdges.get(edge.target);
          if (targetEdges !== undefined) {
            targetEdges.push(edge);
          }
        });
      }
    });
  }

  // Pre-calculate node degrees
  const nodeDegrees = new Map<string, number>();
  allNodes.forEach((node) => {
    nodeDegrees.set(node.id, calculateNodeDegree(graph, node.id, weightFn, incomingEdges));
  });

  // Initialize: Each node in its own community
  const nodeToCommunity = new Map<string, number>();
  const communities = new Map<number, InternalCommunity>();
  let nextCommunityId = 0;

  allNodes.forEach((node) => {
    const communityId = nextCommunityId++;
    nodeToCommunity.set(node.id, communityId);

    const degree = nodeDegrees.get(node.id) || 0;
    communities.set(communityId, {
      id: communityId,
      nodes: new Set([node.id]),
      sigmaTot: degree,
      sigmaIn: 0,
    });
  });

  // Calculate total edge weight
  const m = calculateTotalEdgeWeight(graph, weightFn);
  if (m === 0) {
    // No edges - return each node as separate community
    const endTime = performance.now();
    const finalCommunities = buildLeidenResults(graph, nodeToCommunity, incomingEdges);
    const communitiesForMetrics = finalCommunities.map(leidenToCommunity);
    const metrics = calculateClusterMetrics(graph, communitiesForMetrics);
    return Ok({
      communities: finalCommunities,
      metrics,
      metadata: {
        algorithm: 'leiden',
        runtime: endTime - startTime,
        iterations: 0,
        parameters: { resolution, maxIterations },
      },
    });
  }

  // Track hierarchy: superNodeId -> set of original node IDs
  let superNodes = new Map<string, Set<string>>();
  allNodes.forEach((node) => {
    superNodes.set(node.id, new Set([node.id]));
  });

  const nodeCount = allNodes.length;
  const useHierarchicalOptimization = nodeCount > 50;
  const adaptiveMinModularityIncrease = nodeCount > 500 ? 1e-5 : 1e-6;

  // Multi-level optimization
  let hierarchyLevel = 0;
  const MAX_HIERARCHY_LEVELS = useHierarchicalOptimization ? 3 : 1;
  let totalIterations = 0;

  while (hierarchyLevel < MAX_HIERARCHY_LEVELS) {
    hierarchyLevel++;

    // Rebuild nodeToCommunity and communities for current super-nodes
    nodeToCommunity.clear();
    communities.clear();
    let nextCommunityId = 0;

    superNodes.forEach((memberNodes, superNodeId) => {
      const communityId = nextCommunityId++;
      nodeToCommunity.set(superNodeId, communityId);

      let totalDegree = 0;
      memberNodes.forEach((nodeId) => {
        totalDegree += nodeDegrees.get(nodeId) || 0;
      });

      communities.set(communityId, {
        id: communityId,
        nodes: new Set([superNodeId]),
        sigmaTot: totalDegree,
        sigmaIn: 0,
      });
    });

    // PHASE 1: Local Moving (same as Louvain)
    let improved = true;
    let iteration = 0;

    let MAX_ITERATIONS: number;
    if (hierarchyLevel === 1) {
      MAX_ITERATIONS = nodeCount < 200 ? 40 : 50;
    } else {
      MAX_ITERATIONS = 12;
    }

    const nodeToSuperNode = new Map<string, string>();
    superNodes.forEach((members, superNodeId) => {
      members.forEach((originalNodeId) => {
        nodeToSuperNode.set(originalNodeId, superNodeId);
      });
    });

    let consecutiveNoImprovementRounds = 0;
    const MAX_NO_IMPROVEMENT_ROUNDS = nodeCount > 500 ? 2 : 3;

    while (improved && iteration < MAX_ITERATIONS) {
      improved = false;
      iteration++;
      totalIterations++;
      let movesThisRound = 0;

      const superNodeOrder = shuffleArray([...superNodes.keys()]);

      for (const superNodeId of superNodeOrder) {
        const currentCommunityId = nodeToCommunity.get(superNodeId);
        if (currentCommunityId === undefined) continue;

        const _currentCommunity = communities.get(currentCommunityId);
        if (_currentCommunity === undefined) continue;

        const memberNodes = superNodes.get(superNodeId);
        if (memberNodes === undefined) continue;
        const neighborCommunities = findNeighborCommunitiesForSuperNode(
          graph,
          memberNodes,
          nodeToSuperNode,
          nodeToCommunity,
          weightFn,
          incomingEdges
        );

        let bestCommunityId = currentCommunityId;
        let bestDeltaQ = 0;

        let superNodeDegree = 0;
        memberNodes.forEach((nodeId) => {
          superNodeDegree += nodeDegrees.get(nodeId) || 0;
        });

        for (const [neighborCommunityId, kIn] of neighborCommunities.entries()) {
          if (neighborCommunityId === currentCommunityId) continue;

          const neighborCommunity = communities.get(neighborCommunityId);
          if (neighborCommunity === undefined) continue;

          const deltaQ = calculateModularityDelta(
            superNodeDegree,
            kIn,
            neighborCommunity.sigmaTot,
            neighborCommunity.sigmaIn,
            m
          ) * resolution;

          if (deltaQ > bestDeltaQ) {
            bestDeltaQ = deltaQ;
            bestCommunityId = neighborCommunityId;
          }
        }

        if (bestCommunityId !== currentCommunityId && bestDeltaQ > adaptiveMinModularityIncrease) {
          moveSuperNode(
            superNodeId,
            currentCommunityId,
            bestCommunityId,
            communities,
            nodeToCommunity,
            superNodes,
            nodeDegrees
          );
          improved = true;
          movesThisRound++;
        }
      }

      removeEmptyCommunities(communities);

      if (movesThisRound === 0) {
        consecutiveNoImprovementRounds++;
        if (consecutiveNoImprovementRounds >= MAX_NO_IMPROVEMENT_ROUNDS) {
          break;
        }
      } else {
        consecutiveNoImprovementRounds = 0;
      }
    }

    // PHASE 2: Refinement - Split disconnected communities
    refineCommunities(
      graph,
      communities,
      nodeToCommunity,
      superNodes,
      nodeToSuperNode,
      incomingEdges
    );

    // PHASE 3: Aggregation
    const numCommunities = communities.size;
    if (numCommunities <= 1 || numCommunities >= superNodes.size) {
      break;
    }

    const newSuperNodes = new Map<string, Set<string>>();
    let nextSuperNodeId = 0;

    communities.forEach((community) => {
      const newSuperNodeId = `L${hierarchyLevel}_${nextSuperNodeId++}`;
      const allMemberNodes = new Set<string>();

      community.nodes.forEach((superNodeId) => {
        const members = superNodes.get(superNodeId);
        if (members) {
          members.forEach((originalNodeId) => {
            allMemberNodes.add(originalNodeId);
          });
        }
      });

      newSuperNodes.set(newSuperNodeId, allMemberNodes);
    });

    superNodes = newSuperNodes;
  }

  // Build final Leiden community results
  const finalNodeToCommunity = new Map<string, number>();
  superNodes.forEach((memberNodes, superNodeId) => {
    const communityId = nodeToCommunity.get(superNodeId);
    if (communityId !== undefined) {
      memberNodes.forEach((originalNodeId) => {
        finalNodeToCommunity.set(originalNodeId, communityId);
      });
    }
  });

  const finalCommunities = buildLeidenResults(graph, finalNodeToCommunity, incomingEdges);
  const communitiesForMetrics = finalCommunities.map(leidenToCommunity);
  const metrics = calculateClusterMetrics(graph, communitiesForMetrics);
  const endTime = performance.now();

  return Ok({
    communities: finalCommunities,
    metrics,
    metadata: {
      algorithm: 'leiden',
      runtime: endTime - startTime,
      iterations: totalIterations,
      parameters: { resolution, maxIterations },
    },
  });
};

/**
 * Helper to process neighbors of a super-node during BFS connectivity check.
 * @param nodeId - The node to process
 * @param graph - The graph
 * @param nodeToSuperNode - Map from node ID to super-node ID
 * @param community - The community being checked
 * @param visited - Set of visited super-nodes
 * @param queue - BFS queue
 * @param incomingEdges - Pre-computed incoming edges map
 */
const processNeighborsForConnectivity = <N extends Node, E extends Edge>(
  nodeId: string,
  graph: Graph<N, E>,
  nodeToSuperNode: Map<string, string>,
  community: InternalCommunity,
  visited: Set<string>,
  queue: string[],
  incomingEdges: Map<string, E[]>
): void => {
  const outgoingResult = graph.getOutgoingEdges(nodeId);
  if (outgoingResult.ok) {
    outgoingResult.value.forEach((edge) => {
      const targetSuperNodeId = nodeToSuperNode.get(edge.target);
      if (
        targetSuperNodeId &&
        community.nodes.has(targetSuperNodeId) &&
        !visited.has(targetSuperNodeId)
      ) {
        visited.add(targetSuperNodeId);
        queue.push(targetSuperNodeId);
      }
    });
  }

  // Check incoming edges for directed graphs (use pre-computed map for efficiency)
  if (graph.isDirected()) {
    const incoming = incomingEdges.get(nodeId) || [];
    for (const edge of incoming) {
      const sourceSuperNodeId = nodeToSuperNode.get(edge.source);
      if (
        sourceSuperNodeId &&
        community.nodes.has(sourceSuperNodeId) &&
        !visited.has(sourceSuperNodeId)
      ) {
        visited.add(sourceSuperNodeId);
        queue.push(sourceSuperNodeId);
      }
    }
  }
};

/**
 * Phase 2: Refinement - Split disconnected communities using BFS.
 *
 * This is the key innovation of Leiden over Louvain. Any community that is
 * disconnected gets split into connected components.
 * @param graph
 * @param communities
 * @param nodeToCommunity
 * @param superNodes
 * @param nodeToSuperNode
 * @param incomingEdges
 */
const refineCommunities = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  communities: Map<number, InternalCommunity>,
  nodeToCommunity: Map<string, number>,
  superNodes: Map<string, Set<string>>,
  nodeToSuperNode: Map<string, string>,
  incomingEdges: Map<string, E[]>,
): void => {
  const communitiesToSplit: number[] = [];

  // Identify disconnected communities
  communities.forEach((community, communityId) => {
    const superNodeIds = [...community.nodes];
    if (superNodeIds.length <= 1) return; // Single super-node is always connected

    // Check connectivity using BFS on super-nodes
    const visited = new Set<string>();
    const queue: string[] = [superNodeIds[0]];
    visited.add(superNodeIds[0]);

    while (queue.length > 0) {
      const currentSuperNodeId = queue.shift();
      if (currentSuperNodeId === undefined) continue;

      const currentMemberNodes = superNodes.get(currentSuperNodeId);
      if (currentMemberNodes === undefined) continue;

      // Find all super-nodes connected to this one
      currentMemberNodes.forEach((nodeId) => {
        processNeighborsForConnectivity(
          nodeId,
          graph,
          nodeToSuperNode,
          community,
          visited,
          queue,
          incomingEdges,
        );
      });
    }

    // If not all super-nodes are reachable, community is disconnected
    if (visited.size < superNodeIds.length) {
      communitiesToSplit.push(communityId);
    }
  });

  // Split disconnected communities
  let maxCommunityId = Math.max(...communities.keys());

  communitiesToSplit.forEach((communityId) => {
    const community = communities.get(communityId);
    if (community === undefined) return;

    const superNodeIds = [...community.nodes];

    // Find connected components within this community
    const componentAssignment = new Map<string, number>();
    const visited = new Set<string>();
    let componentId = 0;

    superNodeIds.forEach((startSuperNodeId) => {
      if (visited.has(startSuperNodeId)) return;

      // BFS to find connected component
      const queue: string[] = [startSuperNodeId];
      visited.add(startSuperNodeId);
      const component: string[] = [];

      while (queue.length > 0) {
        const currentSuperNodeId = queue.shift();
        if (currentSuperNodeId === undefined) continue;

        component.push(currentSuperNodeId);
        const currentMemberNodes = superNodes.get(currentSuperNodeId);
        if (currentMemberNodes === undefined) continue;

        currentMemberNodes.forEach((nodeId) => {
          processNeighborsForConnectivity(
            nodeId,
            graph,
            nodeToSuperNode,
            community,
            visited,
            queue,
            incomingEdges,
          );
        });
      }

      // Assign component ID to all super-nodes in this component
      component.forEach((superNodeId) => {
        componentAssignment.set(superNodeId, componentId);
      });
      componentId++;
    });

    // Create new communities for each connected component
    if (componentId > 1) {
      // First component keeps the original community ID
      const newCommunities = new Map<number, InternalCommunity>();
      for (let i = 0; i < componentId; i++) {
        const newCommunityId = i === 0 ? communityId : ++maxCommunityId;
        newCommunities.set(newCommunityId, {
          id: newCommunityId,
          nodes: new Set(),
          sigmaTot: 0,
          sigmaIn: 0,
        });
      }

      // Reassign super-nodes to new communities
      superNodeIds.forEach((superNodeId) => {
        const componentIdx = componentAssignment.get(superNodeId);
        if (componentIdx === undefined) return;

        const newCommunityId = componentIdx === 0
          ? communityId
          : maxCommunityId - (componentId - 1 - componentIdx);

        const newCommunity = newCommunities.get(newCommunityId);
        if (newCommunity !== undefined) {
          newCommunity.nodes.add(superNodeId);
        }
        nodeToCommunity.set(superNodeId, newCommunityId);
      });

      // Replace old community with new ones
      communities.delete(communityId);
      newCommunities.forEach((newCommunity, newId) => {
        if (newCommunity.nodes.size > 0) {
          communities.set(newId, newCommunity);
        }
      });
    }
  });
};

/**
 * Calculate total degree for a node.
 * @param graph
 * @param nodeId
 * @param weightFn
 * @param incomingEdges
 */
const calculateNodeDegree = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeId: string,
  weightFn: WeightFunction<N, E>,
  incomingEdges: Map<string, E[]>,
): number => {
  let degree = 0;

  const outgoingResult = graph.getOutgoingEdges(nodeId);
  if (outgoingResult.ok) {
    outgoingResult.value.forEach((edge) => {
      const sourceOption = graph.getNode(edge.source);
      const targetOption = graph.getNode(edge.target);
      if (sourceOption.some && targetOption.some) {
        degree += weightFn(edge, sourceOption.value, targetOption.value);
      }
    });
  }

  if (graph.isDirected()) {
    const incoming = incomingEdges.get(nodeId) || [];
    incoming.forEach((edge) => {
      const sourceOption = graph.getNode(edge.source);
      const targetOption = graph.getNode(edge.target);
      if (sourceOption.some && targetOption.some) {
        degree += weightFn(edge, sourceOption.value, targetOption.value);
      }
    });
  }

  return degree;
};

/**
 * Calculate total edge weight in graph.
 * @param graph
 * @param weightFn
 */
const calculateTotalEdgeWeight = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  weightFn: WeightFunction<N, E>,
): number => {
  let totalWeight = 0;

  const allNodes = graph.getAllNodes();
  allNodes.forEach((node) => {
    const outgoingResult = graph.getOutgoingEdges(node.id);
    if (outgoingResult.ok) {
      outgoingResult.value.forEach((edge) => {
        const sourceOption = graph.getNode(edge.source);
        const targetOption = graph.getNode(edge.target);
        if (sourceOption.some && targetOption.some) {
          totalWeight += weightFn(edge, sourceOption.value, targetOption.value);
        }
      });
    }
  });

  if (!graph.isDirected()) {
    totalWeight /= 2;
  }

  return totalWeight;
};

/**
 * Find neighboring communities for super-node.
 * @param graph
 * @param memberNodes
 * @param nodeToSuperNode
 * @param nodeToCommunity
 * @param weightFn
 * @param incomingEdges
 */
const findNeighborCommunitiesForSuperNode = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  memberNodes: Set<string>,
  nodeToSuperNode: Map<string, string>,
  nodeToCommunity: Map<string, number>,
  weightFn: WeightFunction<N, E>,
  incomingEdges: Map<string, E[]>,
): Map<number, number> => {
  const neighborCommunities = new Map<number, number>();

  memberNodes.forEach((nodeId) => {
    const outgoingResult = graph.getOutgoingEdges(nodeId);
    if (outgoingResult.ok) {
      outgoingResult.value.forEach((edge) => {
        const targetNodeId = edge.target;
        const targetSuperNodeId = nodeToSuperNode.get(targetNodeId);
        if (targetSuperNodeId) {
          const targetCommunityId = nodeToCommunity.get(targetSuperNodeId);
          if (targetCommunityId !== undefined) {
            const sourceOption = graph.getNode(edge.source);
            const targetOption = graph.getNode(edge.target);
            if (sourceOption.some && targetOption.some) {
              const weight = weightFn(edge, sourceOption.value, targetOption.value);
              neighborCommunities.set(
                targetCommunityId,
                (neighborCommunities.get(targetCommunityId) || 0) + weight
              );
            }
          }
        }
      });
    }

    if (graph.isDirected()) {
      const incoming = incomingEdges.get(nodeId) || [];
      incoming.forEach((edge) => {
        const sourceNodeId = edge.source;
        const sourceSuperNodeId = nodeToSuperNode.get(sourceNodeId);
        if (sourceSuperNodeId) {
          const sourceCommunityId = nodeToCommunity.get(sourceSuperNodeId);
          if (sourceCommunityId !== undefined) {
            const sourceOption = graph.getNode(edge.source);
            const targetOption = graph.getNode(edge.target);
            if (sourceOption.some && targetOption.some) {
              const weight = weightFn(edge, sourceOption.value, targetOption.value);
              neighborCommunities.set(
                sourceCommunityId,
                (neighborCommunities.get(sourceCommunityId) || 0) + weight
              );
            }
          }
        }
      });
    }
  });

  return neighborCommunities;
};

/**
 * Move a super-node from one community to another.
 * @param superNodeId
 * @param fromCommunityId
 * @param toCommunityId
 * @param communities
 * @param nodeToCommunity
 * @param superNodes
 * @param nodeDegrees
 */
const moveSuperNode = (
  superNodeId: string,
  fromCommunityId: number,
  toCommunityId: number,
  communities: Map<number, InternalCommunity>,
  nodeToCommunity: Map<string, number>,
  superNodes: Map<string, Set<string>>,
  nodeDegrees: Map<string, number>,
): void => {
  const fromCommunity = communities.get(fromCommunityId);
  if (fromCommunity === undefined) return;

  const toCommunity = communities.get(toCommunityId);
  if (toCommunity === undefined) return;

  const memberNodes = superNodes.get(superNodeId);
  if (memberNodes === undefined) return;

  let superNodeDegree = 0;
  memberNodes.forEach((nodeId) => {
    superNodeDegree += nodeDegrees.get(nodeId) || 0;
  });

  fromCommunity.nodes.delete(superNodeId);
  fromCommunity.sigmaTot -= superNodeDegree;

  toCommunity.nodes.add(superNodeId);
  toCommunity.sigmaTot += superNodeDegree;

  nodeToCommunity.set(superNodeId, toCommunityId);
};

/**
 * Remove empty communities.
 * @param communities
 */
const removeEmptyCommunities = (communities: Map<number, InternalCommunity>): void => {
  const emptyCommunityIds: number[] = [];

  communities.forEach((community, id) => {
    if (community.nodes.size === 0) {
      emptyCommunityIds.push(id);
    }
  });

  emptyCommunityIds.forEach((id) => {
    communities.delete(id);
  });
};

/**
 * Build final LeidenCommunity results with connectivity validation.
 * @param graph
 * @param nodeToCommunity
 * @param incomingEdges
 */
const buildLeidenResults = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodeToCommunity: Map<string, number>,
  incomingEdges: Map<string, E[]>,
): LeidenCommunity<N>[] => {
  const communityMap = new Map<number, Set<N>>();

  nodeToCommunity.forEach((communityId, nodeId) => {
    if (!communityMap.has(communityId)) {
      communityMap.set(communityId, new Set());
    }

    const nodeOption = graph.getNode(nodeId);
    if (nodeOption.some) {
      const communityNodes = communityMap.get(communityId);
      if (communityNodes !== undefined) {
        communityNodes.add(nodeOption.value);
      }
    }
  });

  const communities: LeidenCommunity<N>[] = [];
  let communityIndex = 0;

  communityMap.forEach((nodes) => {
    // Validate connectivity
    const isConnected = validateConnectivity(graph, nodes, incomingEdges);

    // Calculate conductance
    const conductance = calculateConductance(graph, nodes);

    // Count internal and external edges
    let internalEdges = 0;
    nodes.forEach((node) => {
      const outgoingResult = graph.getOutgoingEdges(node.id);
      if (outgoingResult.ok) {
        outgoingResult.value.forEach((edge) => {
          const targetOption = graph.getNode(edge.target);
          if (targetOption.some && nodes.has(targetOption.value)) {
              internalEdges++;
            }
        });
      }
    });

    const community: LeidenCommunity<N> = {
      id: communityIndex++,
      nodes,
      modularity: 0, // Calculated separately
      isConnected,
      internalEdges,
      conductance,
    };

    communities.push(community);
  });

  return communities;
};

/**
 * Convert LeidenCommunity to Community for metrics calculation.
 * @param leidenCommunity
 */
const leidenToCommunity = <N extends Node>(leidenCommunity: LeidenCommunity<N>): Community<N> => {
  const size = leidenCommunity.nodes.size;
  const maxPossibleEdges = size * (size - 1);
  const density = maxPossibleEdges > 0 ? leidenCommunity.internalEdges / maxPossibleEdges : 0;

  // Calculate external edges
  const _externalEdges = 0;
  // Note: This is a simplification - external edges should be counted during community building
  // For now, we estimate based on conductance if available

  return {
    id: leidenCommunity.id,
    nodes: leidenCommunity.nodes,
    internalEdges: leidenCommunity.internalEdges,
    externalEdges: _externalEdges,
    modularity: leidenCommunity.modularity,
    density: density,
    size: size,
  };
};

/**
 * Validate that a community is a connected subgraph using BFS.
 * @param graph
 * @param community
 * @param incomingEdges
 */
const validateConnectivity = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  community: Set<N>,
  incomingEdges: Map<string, E[]>,
): boolean => {
  if (community.size === 0) return true;
  if (community.size === 1) return true;

  const nodes = [...community];
  const startNode = nodes[0];
  const visited = new Set<string>();
  const queue: N[] = [startNode];
  visited.add(startNode.id);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;

    const outgoingResult = graph.getOutgoingEdges(current.id);
    if (outgoingResult.ok) {
      for (const edge of outgoingResult.value) {
        const targetOption = graph.getNode(edge.target);
        if (targetOption.some && community.has(targetOption.value) && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(targetOption.value);
        }
      }
    }

    if (graph.isDirected()) {
      const incoming = incomingEdges.get(current.id) || [];
      for (const edge of incoming) {
        const sourceOption = graph.getNode(edge.source);
        if (sourceOption.some && community.has(sourceOption.value) && !visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push(sourceOption.value);
        }
      }
    }
  }

  return visited.size === community.size;
};

/**
 * Fisher-Yates shuffle algorithm.
 * @param array
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
