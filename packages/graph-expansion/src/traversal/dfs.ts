/**
 * Depth-First Search (DFS) traversal algorithm.
 *
 * Traverses a graph in depth-first order starting from a given node.
 * Uses an iterative approach with explicit stack to avoid stack overflow.
 *
 * **Generic Implementation**: Works with any graph implementing ReadableGraph.
 * Supports in-memory graphs, database-backed graphs, and lazy-loading graphs.
 *
 * Time Complexity: O(V + E) where V = vertices, E = edges
 * Space Complexity: O(V) for visited set and parent tracking
 *
 * @template N - Node type (extends NodeBase with id field)
 * @template E - Edge type (extends EdgeBase with source, target fields)
 * @param graph - The graph to traverse (any ReadableGraph implementation)
 * @param startId - ID of the starting node
 * @returns Traversal result with visit order, parents, and timestamps
 * @example
 * ```typescript
 * // Using algorithms Graph class (via adapter)
 * const graph = new Graph<MyNode, MyEdge>(true);
 * graph.addNode({ id: 'A', type: 'test' });
 * graph.addNode({ id: 'B', type: 'test' });
 * graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'edge' });
 *
 * const adapter = new GraphAdapter(graph);
 * const result = dfs(adapter, 'A');
 * if (result.ok) {
 *   console.log('Visit order:', result.value.visitOrder);
 *   console.log('Discovery times:', result.value.discovered);
 *   console.log('Finish times:', result.value.finished);
 * }
 *
 * // Using custom graph implementation
 * class MyDatabaseGraph implements ReadableGraph<MyNode, MyEdge> {
 *   async getNode(id: string): Promise<MyNode | null> {
 *     return await db.query('SELECT * FROM nodes WHERE id = ?', [id]);
 *   }
 *   // ... other methods
 * }
 *
 * const result = dfs(new MyDatabaseGraph(), 'A');
 * ```
 */
import type { EdgeBase, NodeBase, ReadableGraph } from '../interfaces/readable-graph';

export interface DFSTraversalResult<N> {
  /** Nodes in visitation order (depth-first) */
  visitOrder: N[];

  /** Parent mapping for path reconstruction (child → parent) */
  parents: Map<string, string | null>;

  /** Discovery timestamps for each node (when first visited) */
  discovered: Map<string, number>;

  /** Finish timestamps for each node (when all descendants visited) */
  finished: Map<string, number>;
}

export interface InvalidInputError {
  type: 'invalid-input';
  message: string;
}

export interface Ok<T> {
  ok: true;
  value: T;
}

export interface Err<E> {
  ok: false;
  error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Depth-First Search traversal.
 * @param graph
 * @param startId
 */
export const dfs = <N extends NodeBase, E extends EdgeBase>(
  graph: ReadableGraph<N, E>,
  startId: string
): Result<DFSTraversalResult<N>, InvalidInputError> => {
  // Validate inputs
  if (!graph) {
    return {
      ok: false,
      error: {
        type: 'invalid-input',
        message: 'Graph cannot be null or undefined',
      },
    };
  }

  const startNode = graph.getNode(startId);
  if (!startNode) {
    return {
      ok: false,
      error: {
        type: 'invalid-input',
        message: `Start node '${startId}' not found in graph`,
      },
    };
  }

  // Initialize tracking structures
  const visited = new Set<string>();
  const visitOrder: N[] = [];
  const parents = new Map<string, string | null>();
  const discovered = new Map<string, number>();
  const finished = new Map<string, number>();
  let time = 0;

  // Stack for iterative DFS: [nodeId, isReturning]
  // isReturning=false means we're discovering the node
  // isReturning=true means we're finishing the node (all children visited)
  const stack: Array<[string, boolean]> = [[startId, false]];
  parents.set(startId, null); // Root has no parent

  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry === undefined) break;
    const [currentId, isReturning] = entry;

    if (isReturning) {
      // Finishing the node - record finish time
      time++;
      finished.set(currentId, time);
      continue;
    }

    // Skip if already visited
    if (visited.has(currentId)) {
      continue;
    }

    // Mark as visited and record discovery time
    visited.add(currentId);
    time++;
    discovered.set(currentId, time);

    const currentNode = graph.getNode(currentId);
    if (currentNode) {
      visitOrder.push(currentNode);
    }

    // Push finishing marker for current node
    stack.push([currentId, true]);

    // Get neighbors and push to stack (in reverse order for left-to-right traversal)
    const neighbors = graph.getNeighbors(currentId);

    // Push in reverse order so first neighbor is processed first (LIFO)
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighborId = neighbors[i];

      // Skip if already visited
      if (visited.has(neighborId)) {
        continue;
      }

      // Set parent if not already set
      if (!parents.has(neighborId)) {
        parents.set(neighborId, currentId);
      }

      // Push for discovery
      stack.push([neighborId, false]);
    }
  }

  return {
    ok: true,
    value: {
      visitOrder,
      parents,
      discovered,
      finished,
    },
  };
};
