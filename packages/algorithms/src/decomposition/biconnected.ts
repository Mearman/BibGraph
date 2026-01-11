/**
 * Biconnected Component Decomposition using Tarjan's algorithm.
 *
 * Identifies articulation points (cut vertices) and biconnected components in undirected graphs.
 * A biconnected component is a maximal subgraph with no articulation points (remains connected
 * after removing any single node).
 *
 * Algorithm: Tarjan's DFS-based algorithm (1972)
 * - Discovery time tracking: Assign DFS discovery time to each node
 * - Low-link values: Track earliest reachable ancestor via back edges
 * - Articulation point detection: low[child] ≥ disc[v] (child cannot reach ancestors)
 * - Root articulation point: Root with > 1 DFS child
 * - Component extraction: Pop edge stack when backtracking from articulation point
 *
 * Time Complexity: O(V + E) - single DFS traversal
 * Space Complexity: O(V + E) - DFS stack + edge stack
 * @module decomposition/biconnected
 */

import type { Graph } from '../graph/graph';
import type { BiconnectedComponent, BiconnectedResult } from '../types/clustering-types';
import type { Edge,Node } from '../types/graph';
import { Err,Ok } from '../types/result';

/**
 * Edge representation for stack-based component extraction.
 */
interface EdgeRecord {
  source: string;
  target: string;
}

/**
 * DFS state tracking for Tarjan's algorithm.
 */
interface TarjanState {
  /** Discovery time for each node (DFS order) */
  disc: Map<string, number>;

  /** Low-link value (earliest reachable ancestor) */
  low: Map<string, number>;

  /** Parent node in DFS tree */
  parent: Map<string, string>;

  /** Visited nodes */
  visited: Set<string>;

  /** Edge stack for component extraction */
  edgeStack: EdgeRecord[];

  /** Current DFS time counter */
  time: number;

  /** Identified articulation points */
  articulationPoints: Set<string>;

  /** Extracted biconnected components */
  components: BiconnectedComponent<string>[];

  /** Component ID counter */
  nextComponentId: number;
}

/**
 * Initialize Tarjan algorithm state.
 */
const initializeState = (): TarjanState => ({
    disc: new Map(),
    low: new Map(),
    parent: new Map(),
    visited: new Set(),
    edgeStack: [],
    time: 0,
    articulationPoints: new Set(),
    components: [],
    nextComponentId: 0,
  });

/**
 * DFS traversal for Tarjan's articulation point algorithm.
 * @param graph - Undirected graph to analyze
 * @param u - Current node ID
 * @param state - Algorithm state
 * @param isRoot
 */
const tarjanDFS = <N extends Node, E extends Edge>(graph: Graph<N, E>, u: string, state: TarjanState, isRoot: boolean): void => {
  // Initialize discovery time and low-link value
  state.disc.set(u, state.time);
  state.low.set(u, state.time);
  state.time++;
  state.visited.add(u);

  let childCount = 0;

  // Get neighbors
  const neighborsResult = graph.getNeighbors(u);
  if (!neighborsResult.ok) {
    return; // Should not happen for valid nodes
  }

  const neighbors = neighborsResult.value;

  for (const v of neighbors) {
    // Skip if v is not visited
    if (!state.visited.has(v)) {
      // v is a child of u in DFS tree
      childCount++;
      state.parent.set(v, u);

      // Push edge to stack
      state.edgeStack.push({ source: u, target: v });

      // Recursive DFS
      tarjanDFS(graph, v, state, false);

      // Update low-link value
      const lowV = state.low.get(v);
      const lowU = state.low.get(u);
      const discU = state.disc.get(u);

      if (lowV === undefined || lowU === undefined || discU === undefined) {
        continue;
      }

      state.low.set(u, Math.min(lowU, lowV));

      // Case 1: u is root and has > 1 child
      if (isRoot && childCount > 1) {
        state.articulationPoints.add(u);
      }

      // Case 2: u is not root and low[v] >= disc[u]
      // (child v cannot reach ancestors of u via back edges)
      if (!isRoot && lowV >= discU) {
        state.articulationPoints.add(u);
      }

      // Extract component when child cannot reach ancestors (for both root and non-root)
      if (lowV >= discU) {
        // Extract biconnected component
        const component = extractComponent(state, u, v);
        state.components.push(component);
      }
    } else if (v !== state.parent.get(u)) {
      // v is already visited and not parent (back edge)
      const lowU = state.low.get(u);
      const discV = state.disc.get(v);

      if (lowU === undefined || discV === undefined) {
        continue;
      }

      state.low.set(u, Math.min(lowU, discV));

      // Push back edge to stack (only if disc[v] < disc[u] to avoid duplicates)
      const discU = state.disc.get(u);
      if (discU === undefined) {
        continue;
      }

      if (discV < discU) {
        state.edgeStack.push({ source: u, target: v });
      }
    }
  }

};

/**
 * Extract a biconnected component from edge stack.
 *
 * Pops edges from stack until reaching the edge (u, v) that triggered the extraction.
 * @param state - Algorithm state
 * @param u - Articulation point
 * @param v - Child that triggered extraction
 * @returns Extracted biconnected component
 */
const extractComponent = (state: TarjanState, u: string, v: string): BiconnectedComponent<string> => {
  const nodes = new Set<string>();
  const articulationPoints = new Set<string>();
  let edgeCount = 0;

  // Pop edges until we find the edge (u, v) or (v, u)
  while (state.edgeStack.length > 0) {
    const edge = state.edgeStack.pop();
    if (edge === undefined) {
      break;
    }

    nodes.add(edge.source);
    nodes.add(edge.target);
    edgeCount++;

    // Check if this is the edge that triggered the component extraction
    if (
      (edge.source === u && edge.target === v) ||
      (edge.source === v && edge.target === u)
    ) {
      break;
    }
  }

  // Check if u is an articulation point for this component
  if (state.articulationPoints.has(u)) {
    articulationPoints.add(u);
  }

  // A bridge is a component with exactly 2 nodes and 1 edge
  const isBridge = nodes.size === 2 && edgeCount === 1;

  return {
    id: state.nextComponentId++,
    nodes,
    size: nodes.size,
    articulationPoints,
    isBridge,
  };
};

/**
 * Extract remaining edges from stack as a biconnected component.
 * Used for components that don't have articulation points (root components).
 * @param state - Algorithm state
 * @returns Extracted biconnected component
 */
const extractRemainingComponent = (state: TarjanState): BiconnectedComponent<string> => {
  const nodes = new Set<string>();
  const articulationPoints = new Set<string>();
  let edgeCount = 0;

  // Pop all remaining edges
  while (state.edgeStack.length > 0) {
    const edge = state.edgeStack.pop();
    if (edge === undefined) {
      break;
    }

    nodes.add(edge.source);
    nodes.add(edge.target);
    edgeCount++;
  }

  // Check which nodes are articulation points
  nodes.forEach((nodeId) => {
    if (state.articulationPoints.has(nodeId)) {
      articulationPoints.add(nodeId);
    }
  });

  // A bridge is a component with exactly 2 nodes and 1 edge
  const isBridge = nodes.size === 2 && edgeCount === 1;

  return {
    id: state.nextComponentId++,
    nodes,
    size: nodes.size,
    articulationPoints,
    isBridge,
  };
};

/**
 * Find biconnected components using Tarjan's algorithm.
 *
 * A biconnected component is a maximal subgraph where removing any single node
 * still leaves the graph connected. Articulation points (cut vertices) are nodes
 * whose removal increases the number of connected components.
 *
 * Use Case: Identify critical papers (articulation points) that connect research communities
 * in citation networks. Removing these papers would fragment the network.
 *
 * Algorithm Steps:
 * 1. DFS traversal with discovery time tracking
 * 2. Calculate low-link values (earliest ancestor reachable via back edges)
 * 3. Detect articulation points: low[child] ≥ disc[v]
 * 4. Extract components by popping edge stack on backtrack
 * 5. Handle disconnected graphs (DFS from each unvisited node)
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Undirected graph to analyze
 * @returns Result containing biconnected components and articulation points, or error
 * @example
 * ```typescript
 * const graph = new Graph<PaperNode, CitationEdge>(false); // undirected
 * // ... add nodes and edges ...
 *
 * const result = biconnectedComponents(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.articulationPoints.size} articulation points`);
 *   console.log(`Found ${result.value.components.length} biconnected components`);
 *
 *   result.value.components.forEach(component => {
 *     console.log(`Component ${component.id}: ${component.size} nodes`);
 *     if (component.isBridge) {
 *       console.log('  -> Bridge component');
 *     }
 *   });
 * }
 * ```
 */
export const biconnectedComponents = <N extends Node, E extends Edge>(graph: Graph<N, E>): BiconnectedResult<string> => {
  const startTime = performance.now();

  // Validation
  const nodeCount = graph.getNodeCount();

  if (nodeCount === 0) {
    return Err({
      type: 'EmptyGraph',
      message: 'Cannot compute biconnected components for empty graph',
    });
  }

  if (nodeCount < 2) {
    return Err({
      type: 'InsufficientNodes',
      message: 'Biconnected components require at least 2 nodes',
      required: 2,
      actual: nodeCount,
    });
  }

  if (graph.isDirected()) {
    return Err({
      type: 'InvalidInput',
      message: 'Biconnected components are only defined for undirected graphs',
    });
  }

  // Initialize state
  const state = initializeState();

  // Get all nodes
  const nodes = graph.getAllNodes();

  // Run DFS from each unvisited node (handles disconnected graphs)
  for (const node of nodes) {
    if (!state.visited.has(node.id)) {
      tarjanDFS(graph, node.id, state, true);

      // If there are remaining edges on stack after DFS from root, extract them
      if (state.edgeStack.length > 0) {
        const component = extractRemainingComponent(state);
        if (component.nodes.size > 0) {
          state.components.push(component);
        }
      }
    }
  }

  // If graph has no edges, each node is its own trivial component
  if (graph.getEdgeCount() === 0) {
    state.components = nodes.map((node, index) => ({
      id: index,
      nodes: new Set([node.id]),
      size: 1,
      articulationPoints: new Set(),
      isBridge: false,
    }));
  }

  const endTime = performance.now();
  const runtime = endTime - startTime;

  return Ok({
    components: state.components,
    articulationPoints: state.articulationPoints,
    metadata: {
      algorithm: 'biconnected',
      runtime,
    },
  });
};
