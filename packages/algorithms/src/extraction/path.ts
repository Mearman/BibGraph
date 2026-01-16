/**
 * Citation path analysis utilities for graph extraction.
 * Provides shortest path finding and reachability subgraph extraction.
 */
import { bfs } from '../traversal/bfs';

import { Graph } from '../graph/graph';
import { GraphAdapter } from '../graph-adapter';
import { dijkstra } from '../pathfinding/dijkstra';
import type { Path } from '../types/algorithm-results';
import type { ExtractionError } from '../types/errors';
import type { Edge,Node } from '../types/graph';
import type { Option } from '../types/option';
import { None,Some } from '../types/option';
import type { Result } from '../types/result';
import { Err,Ok } from '../types/result';
import { extractInducedSubgraph } from './subgraph';

/**
 * Direction for reachability analysis.
 * - 'forward': Follow outgoing edges (what can be reached from source)
 * - 'backward': Follow incoming edges (what can reach the source)
 */
export type ReachabilityDirection = 'forward' | 'backward';

/**
 * Finds the shortest path between two nodes in a graph.
 *
 * Uses BFS for unweighted graphs (all edges have weight 1) and Dijkstra's algorithm
 * for weighted graphs. Automatically selects the appropriate algorithm based on
 * edge weights.
 *
 * Time Complexity:
 * - BFS: O(V + E) for unweighted graphs
 * - Dijkstra: O((V + E) log V) for weighted graphs
 *
 * Space Complexity: O(V)
 * @param graph - The graph to search
 * @param sourceId - Starting node ID
 * @param targetId - Destination node ID
 * @returns Result containing Option<Path> or ExtractionError
 *   - Ok(Some(path)) if path exists
 *   - Ok(None) if no path exists
 *   - Err(error) if inputs are invalid
 * @example
 * ```typescript
 * // Find citation path between papers
 * const result = findShortestPath(graph, 'P123', 'P456');
 * if (result.ok && result.value.some) {
 *   console.log('Path length:', result.value.value.nodes.length);
 *   console.log('Total citations:', result.value.value.edges.length);
 * }
 * ```
 */
export const findShortestPath = <N extends Node, E extends Edge>(graph: Graph<N, E>, sourceId: string, targetId: string): Result<Option<Path<N, E>>, ExtractionError> => {
  // Validate inputs
  if (!graph) {
    return Err({
      type: 'invalid-input',
      message: 'Graph cannot be null or undefined',
    });
  }

  // Check if source node exists
  const sourceNode = graph.getNode(sourceId);
  if (!sourceNode.some) {
    return Err({
      type: 'invalid-input',
      message: `Source node '${sourceId}' not found in graph`,
    });
  }

  // Check if target node exists
  const targetNode = graph.getNode(targetId);
  if (!targetNode.some) {
    return Err({
      type: 'invalid-input',
      message: `Target node '${targetId}' not found in graph`,
    });
  }

  // Handle trivial case: source equals target
  if (sourceId === targetId) {
    return Ok(
      Some({
        nodes: [sourceNode.value],
        edges: [],
        totalWeight: 0,
      })
    );
  }

  // Check if graph has weighted edges
  const hasWeightedEdges = checkIfWeighted(graph);

  if (hasWeightedEdges) {
    // Use Dijkstra's algorithm for weighted graphs
    const dijkstraResult = dijkstra(graph, sourceId, targetId);

    // Convert GraphError to ExtractionError if needed
    if (!dijkstraResult.ok) {
      // Map GraphError to ExtractionError
      const graphError = dijkstraResult.error;
      return Err({
        type: 'invalid-input',
        message: graphError.message,
      });
    }

    return Ok(dijkstraResult.value);
  } else {
    // Use BFS for unweighted graphs (more efficient)
    return findPathWithBFS(graph, sourceId, targetId);
  }
};

/**
 * Extracts a subgraph containing all nodes reachable from a source node.
 *
 * Performs a breadth-first traversal to find all nodes that can be reached
 * from the source within an optional maximum depth. Supports both forward
 * (following outgoing edges) and backward (following incoming edges) traversal.
 *
 * Time Complexity: O(V + E) where V, E are in the reachable subgraph
 * Space Complexity: O(V)
 * @param graph - The graph to extract from
 * @param sourceId - Starting node ID
 * @param direction - 'forward' for outgoing edges, 'backward' for incoming edges
 * @param maxDepth - Optional maximum depth to traverse (undefined = unlimited)
 * @returns Result containing extracted subgraph or ExtractionError
 * @example
 * ```typescript
 * // Extract all papers cited by P123 (forward)
 * const cited = extractReachabilitySubgraph(graph, 'P123', 'forward');
 *
 * // Extract all papers that cite P123 (backward)
 * const citing = extractReachabilitySubgraph(graph, 'P123', 'backward');
 *
 * // Extract citation network within 2 hops
 * const local = extractReachabilitySubgraph(graph, 'P123', 'forward', 2);
 * ```
 */
export const extractReachabilitySubgraph = <N extends Node, E extends Edge>(graph: Graph<N, E>, sourceId: string, direction: ReachabilityDirection, maxDepth?: number): Result<Graph<N, E>, ExtractionError> => {
  // Validate inputs
  if (!graph) {
    return Err({
      type: 'invalid-input',
      message: 'Graph cannot be null or undefined',
    });
  }

  // Check if source node exists
  const sourceNode = graph.getNode(sourceId);
  if (!sourceNode.some) {
    return Err({
      type: 'node-not-found',
      message: `Source node '${sourceId}' not found in graph`,
      nodeId: sourceId,
    });
  }

  // Perform BFS with optional depth limit
  const reachableNodes = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: sourceId, depth: 0 }];
  const visited = new Set<string>();

  visited.add(sourceId);
  reachableNodes.add(sourceId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    // Check depth limit
    if (maxDepth !== undefined && current.depth >= maxDepth) {
      continue;
    }

    // Get neighbors based on direction
    const neighbors = getNeighborsInDirection(graph, current.id, direction);

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        reachableNodes.add(neighborId);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      }
    }
  }

  // Extract induced subgraph containing reachable nodes
  return extractInducedSubgraph(graph, reachableNodes);
};

/**
 * Checks if a graph has any weighted edges (edges with weight !== 1).
 * @param graph
 * @internal
 */
const checkIfWeighted = <N extends Node, E extends Edge>(graph: Graph<N, E>): boolean => {
  const edges = graph.getAllEdges();

  for (const edge of edges) {
    if (edge.weight !== undefined && edge.weight !== 1) {
      return true;
    }
  }

  return false;
};

/**
 * Finds shortest path using BFS for unweighted graphs.
 * More efficient than Dijkstra when all edges have weight 1.
 * @param graph
 * @param sourceId
 * @param targetId
 * @internal
 */
const findPathWithBFS = <N extends Node, E extends Edge>(graph: Graph<N, E>, sourceId: string, targetId: string): Result<Option<Path<N, E>>, ExtractionError> => {
  const adapter = new GraphAdapter(graph);
  const bfsResult = bfs(adapter, sourceId);

  if (!bfsResult.ok) {
    // Convert traversal error to extraction error
    return Err({
      type: 'invalid-input',
      message: bfsResult.error.message,
    });
  }

  const traversalResult = bfsResult.value;

  // Check if target was reached
  if (!traversalResult.parents.has(targetId)) {
    // No path exists
    return Ok(None());
  }

  // Reconstruct path from parents map
  const pathNodes: N[] = [];
  const pathEdges: E[] = [];
  let currentId: string | null = targetId;

  // Build path backwards from target to source
  while (currentId !== null) {
    const nodeResult = graph.getNode(currentId);
    if (nodeResult.some) {
      pathNodes.unshift(nodeResult.value);
    }

    const parentId = traversalResult.parents.get(currentId);
    if (parentId === undefined) break;

    if (parentId !== null) {
      // Find edge from parent to current
      const edgeResult = findEdgeBetween(graph, parentId, currentId);
      if (edgeResult.some) {
        pathEdges.unshift(edgeResult.value);
      }
    }

    currentId = parentId;
  }

  // Calculate total weight (1 per edge for unweighted graphs)
  const totalWeight = pathEdges.length;

  return Ok(
    Some({
      nodes: pathNodes,
      edges: pathEdges,
      totalWeight,
    })
  );
};

/**
 * Finds an edge between two nodes.
 * For directed graphs, finds edge from source to target.
 * For undirected graphs, finds edge in either direction.
 * @param graph
 * @param sourceId
 * @param targetId
 * @internal
 */
const findEdgeBetween = <N extends Node, E extends Edge>(graph: Graph<N, E>, sourceId: string, targetId: string): Option<E> => {
  // Try direct edge first
  const outgoingEdges = graph.getOutgoingEdges(sourceId);
  if (outgoingEdges.ok) {
    for (const edge of outgoingEdges.value) {
      if (edge.target === targetId) {
        return Some(edge);
      }
    }
  }

  // For undirected graphs, getOutgoingEdges returns edges in both directions
  // So we don't need a separate check

  return None();
};

/**
 * Gets neighbors in the specified direction.
 * @param graph
 * @param nodeId
 * @param direction
 * @internal
 */
const getNeighborsInDirection = <N extends Node, E extends Edge>(graph: Graph<N, E>, nodeId: string, direction: ReachabilityDirection): string[] => {
  if (direction === 'forward') {
    // Follow outgoing edges
    const edges = graph.getOutgoingEdges(nodeId);
    if (edges.ok) {
      return edges.value.map(edge => edge.target);
    }
  } else {
    // Follow incoming edges - need to scan all edges
    const allEdges = graph.getAllEdges();
    const neighbors: string[] = [];
    for (const edge of allEdges) {
      if (edge.target === nodeId) {
        neighbors.push(edge.source);
      }
    }
    return neighbors;
  }

  return [];
};
