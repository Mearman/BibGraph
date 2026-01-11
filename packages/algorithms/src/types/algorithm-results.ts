import { type Edge,type Node } from './graph';

/**
 * Result from graph traversal algorithms (DFS, BFS).
 * Contains visit order, parent relationships, and timing metadata.
 * @template N - Node type
 * visitOrder - Nodes in the order they were visited
 * parents - Parent relationship map (node ID → parent ID or null for root)
 * discovered - Discovery timestamps (DFS only, undefined for BFS)
 * finished - Finish timestamps (DFS only, undefined for BFS)
 * @example
 * ```typescript
 * const result = dfs(graph, 'start');
 * if (result.ok) {
 *   console.log('Visit order:', result.value.visitOrder);
 *   console.log('Parent of node X:', result.value.parents.get('X'));
 * }
 * ```
 */
export interface TraversalResult<N extends Node> {
  /** Nodes in visit order */
  visitOrder: N[];

  /** Parent relationships (node ID → parent ID, null for root) */
  parents: Map<string, string | null>;

  /** Discovery times (DFS only, undefined for BFS) */
  discovered?: Map<string, number>;

  /** Finish times (DFS only, undefined for BFS) */
  finished?: Map<string, number>;
}

/**
 * Path from source to destination node.
 * Contains ordered nodes, connecting edges, and total weight.
 * @template N - Node type
 * @template E - Edge type
 * nodes - Nodes in path order (source to destination)
 * edges - Edges connecting consecutive nodes
 * totalWeight - Sum of edge weights
 * @invariant nodes.length >= 2 (at least source and destination)
 * @invariant edges.length === nodes.length - 1
 * @invariant edges[i].source === nodes[i].id && edges[i].target === nodes[i+1].id
 * @example
 * ```typescript
 * const result = dijkstra(graph, 'A', 'Z');
 * if (result.ok && result.value.some) {
 *   const path = result.value.value;
 *   console.log('Path length:', path.nodes.length);
 *   console.log('Total weight:', path.totalWeight);
 *   console.log('Path:', path.nodes.map(n => n.id).join(' -> '));
 * }
 * ```
 */
export interface Path<N extends Node, E extends Edge> {
  /** Nodes in path order (source to destination) */
  nodes: N[];

  /** Edges connecting nodes in path */
  edges: E[];

  /** Sum of edge weights */
  totalWeight: number;
}

/**
 * Connected component of nodes.
 * Represents a maximal set of mutually reachable nodes.
 * @template N - Node type
 * id - Component identifier (0-indexed)
 * nodes - Nodes in this component
 * size - Number of nodes in component
 * @invariant size === nodes.length
 * @example
 * ```typescript
 * const result = connectedComponents(graph);
 * if (result.ok) {
 *   console.log(`Found ${result.value.length} components`);
 *   result.value.forEach(comp => {
 *     console.log(`Component ${comp.id}: ${comp.size} nodes`);
 *   });
 * }
 * ```
 */
export interface Component<N extends Node> {
  /** Component identifier (0-indexed) */
  id: number;

  /** Nodes in this component */
  nodes: N[];

  /** Number of nodes in component */
  size: number;
}

/**
 * Information about a detected cycle.
 * Contains the nodes and edges that form the cycle.
 * @template N - Node type
 * @template E - Edge type
 * nodes - Nodes forming the cycle
 * edges - Edges connecting the cycle nodes
 * @invariant nodes.length >= 2 (at least two nodes form a cycle)
 * @invariant edges.length === nodes.length (cycle closes back to start)
 * @example
 * ```typescript
 * const result = detectCycle(graph);
 * if (result.ok && result.value.some) {
 *   const cycle = result.value.value;
 *   console.log('Cycle nodes:', cycle.nodes.map(n => n.id));
 *   console.log('Cycle edges:', cycle.edges.map(e => e.id));
 * }
 * ```
 */
export interface CycleInfo<N extends Node, E extends Edge> {
  /** Nodes forming the cycle */
  nodes: N[];

  /** Edges connecting the cycle nodes */
  edges: E[];
}
