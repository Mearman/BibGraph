/**
 * Breadth-First Search (BFS) traversal algorithm.
 *
 * Traverses a graph in breadth-first order starting from a given node.
 * Visits all nodes at distance k before visiting nodes at distance k+1.
 * Uses a queue for level-order traversal.
 *
 * **Generic Implementation**: Works with any graph implementing ReadableGraph.
 * Supports in-memory graphs, database-backed graphs, and lazy-loading graphs.
 *
 * Time Complexity: O(V + E) where V = vertices, E = edges
 * Space Complexity: O(V) for visited set and queue
 *
 * @template N - Node type (extends NodeBase with id field)
 * @template E - Edge type (extends EdgeBase with source, target fields)
 * @param graph - The graph to traverse (any ReadableGraph implementation)
 * @param startId - ID of the starting node
 * @returns Traversal result with visit order and parent mapping, or error
 * @example
 * ```typescript
 * // Using algorithms Graph class (via adapter)
 * const graph = new Graph<MyNode, MyEdge>(true);
 * graph.addNode({ id: 'A', type: 'test' });
 * graph.addNode({ id: 'B', type: 'test' });
 * graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'edge' });
 *
 * const adapter = new GraphAdapter(graph);
 * const result = bfs(adapter, 'A');
 * if (result.ok) {
 *   console.log('Visit order (level-by-level):', result.value.visitOrder);
 *   console.log('Parents:', result.value.parents);
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
 * const result = bfs(new MyDatabaseGraph(), 'A');
 * ```
 */
import type { EdgeBase, NodeBase, ReadableGraph } from '../interfaces/readable-graph';

export interface TraversalResult<N> {
  /** Nodes in visitation order (level-by-level for BFS) */
  visitOrder: N[];

  /** Parent mapping for path reconstruction (child → parent) */
  parents: Map<string, string | null>;
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
 * Breadth-First Search traversal.
 * @param graph
 * @param startId
 */
export const bfs = <N extends NodeBase, E extends EdgeBase>(
  graph: ReadableGraph<N, E>,
  startId: string
): Result<TraversalResult<N>, InvalidInputError> => {
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

  // Queue for BFS: simple array with FIFO operations
  const queue: string[] = [startId];
  visited.add(startId);
  parents.set(startId, null); // Root has no parent

  while (queue.length > 0) {
    // Dequeue from front (FIFO)
    const currentId = queue.shift();
    if (currentId === undefined) break;

    // Add current node to visit order
    const currentNode = graph.getNode(currentId);
    if (currentNode) {
      visitOrder.push(currentNode);
    }

    // Get neighbors and enqueue unvisited ones
    const neighbors = graph.getNeighbors(currentId);
    for (const neighborId of neighbors) {
      // Skip if already visited
      if (visited.has(neighborId)) {
        continue;
      }

      // Mark as visited and set parent
      visited.add(neighborId);
      parents.set(neighborId, currentId);

      // Enqueue for later processing
      queue.push(neighborId);
    }
  }

  return {
    ok: true,
    value: {
      visitOrder,
      parents,
    },
  };
};
