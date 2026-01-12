/**
 * Path Highlighting Presets
 *
 * Types and utilities for path highlighting presets in graph visualization.
 * Provides different path analysis modes for exploring relationships.
 *
 * @module lib/path-presets
 */

/** Path highlighting preset modes */
export type PathPreset =
  | 'shortest'        // Shortest path between source and target
  | 'outgoing-paths'  // All paths from source node
  | 'incoming-paths'  // All paths to target node
  | 'all-paths';      // All paths between source and target

/**
 * Find all nodes reachable from a source node using BFS
 * @param graph - Adjacency list representation of graph (nodeId -> Set of neighbor nodeIds)
 * @param sourceId - Source node ID
 * @param targetId - Optional target node ID to limit search depth
 * @param maxDepth - Maximum depth to traverse (default: unlimited)
 * @returns Array of reachable node IDs
 */
export const findReachableNodes = (
  graph: Map<string, Set<string>>,
  sourceId: string,
  targetId?: string,
  maxDepth?: number,
): string[] => {
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: sourceId, depth: 0 }];
  const result: string[] = [];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift() as { nodeId: string; depth: number };

    if (visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    result.push(nodeId);

    // Stop if we reached target
    if (targetId && nodeId === targetId) {
      break;
    }

    // Check depth limit
    if (maxDepth !== undefined && depth >= maxDepth) {
      continue;
    }

    // Add neighbors
    const neighbors = graph.get(nodeId);
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({ nodeId: neighborId, depth: depth + 1 });
        }
      }
    }
  }

  return result;
};

/**
 * Find shortest path between two nodes using BFS
 * @param graph - Adjacency list representation of graph
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @returns Array of node IDs representing the path, or empty array if no path exists
 */
export const findShortestPath = (
  graph: Map<string, Set<string>>,
  sourceId: string,
  targetId: string,
): string[] => {
  if (sourceId === targetId) {
    return [sourceId];
  }

  const visited = new Set<string>();
  const parentMap = new Map<string, string | null>();
  const queue: string[] = [sourceId];

  visited.add(sourceId);
  parentMap.set(sourceId, null);

  while (queue.length > 0) {
    const nodeId = queue.shift() as string;

    if (nodeId === targetId) {
      // Reconstruct path
      const path: string[] = [];
      let current: string | null = targetId;

      while (current !== null) {
        path.unshift(current);
        current = parentMap.get(current) ?? null;
      }

      return path;
    }

    const neighbors = graph.get(nodeId);
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          parentMap.set(neighborId, nodeId);
          queue.push(neighborId);
        }
      }
    }
  }

  // No path found
  return [];
};
