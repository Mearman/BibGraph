/**
 * Graph Expansion and Neighborhood Traversal
 *
 * Generic system for expanding graphs by loading neighbors and exploring
 * graph neighborhoods regardless of the underlying graph data structure.
 *
 * ## Core Features
 *
 * - **Generic Interfaces**: Works with any graph implementation through ReadableGraph
 * - **Dynamic Expansion**: GraphExpander interface for lazy-loading from APIs/databases
 * - **Traversal Algorithms**: BFS, DFS, bidirectional BFS with degree-based prioritization
 * - **Extraction Methods**: k-hop ego network extraction
 * - **Zero Coupling**: No dependencies on specific graph implementations
 *
 * ## Usage
 *
 * ```typescript
 * import { bfs, dfs, extractEgoNetwork, GraphAdapter } from '@bibgraph/graph-expansion';
 * import { Graph } from '@bibgraph/algorithms';
 *
 * // Use with algorithms Graph class
 * const graph = new Graph<MyNode, MyEdge>(true);
 * // ... add nodes and edges ...
 * const adapter = new GraphAdapter(graph);
 *
 * // BFS traversal
 * const bfsResult = bfs(adapter, 'startNodeId');
 *
 * // DFS traversal
 * const dfsResult = dfs(adapter, 'startNodeId');
 *
 * // Ego network extraction
 * const egoNetwork = extractEgoNetwork(adapter, {
 *   radius: 2,
 *   seedNodes: ['nodeId'],
 * });
 *
 * // Dynamic expansion with GraphExpander
 * import { BidirectionalBFS } from '@bibgraph/graph-expansion';
 *
 * const bfs = new BidirectionalBFS(
 *   expander,
 *   'nodeA',
 *   'nodeB',
 *   { targetPaths: 5, maxIterations: 10 }
 * );
 *
 * const result = await bfs.search();
 * ```
 *
 * ## Custom Graph Implementations
 *
 * ```typescript
 * import { ReadableGraph, bfs } from '@bibgraph/graph-expansion';
 *
 * class MyDatabaseGraph implements ReadableGraph<MyNode, MyEdge> {
 *   hasNode(id: string): boolean { ... }
 *   getNode(id: string): MyNode | null { ... }
 *   getNeighbors(id: string): string[] { ... }
 *   getAllNodes(): MyNode[] { ... }
 *   isDirected(): boolean { ... }
 *   getOutgoingEdges?(id: string): MyEdge[] { ... }
 * }
 *
 * const result = bfs(new MyDatabaseGraph(), 'startNodeId');
 * ```
 */

// Interfaces
export type { GraphExpander, Neighbor } from './interfaces/graph-expander';
export type { ReadableGraph, NodeBase, EdgeBase } from './interfaces/readable-graph';

// Traversal algorithms
export { bfs } from './traversal/bfs';
export type { TraversalResult } from './traversal/bfs';
export { dfs } from './traversal/dfs';
export type { DFSTraversalResult } from './traversal/dfs';
export { BidirectionalBFS } from './traversal/bidirectional-bfs';
export type { BidirectionalBFSOptions, BidirectionalBFSResult } from './traversal/bidirectional-bfs';
export { PriorityQueue } from './traversal/priority-queue';

// Extraction algorithms
export {
  extractEgoNetwork,
  extractMultiSourceEgoNetwork,
} from './extraction/ego-network';
export type {
  EgoNetworkOptions,
  ExtractionError,
  InducedSubgraph,
} from './extraction/ego-network';
