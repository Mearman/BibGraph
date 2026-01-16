/**
 * Graph Expansion, Evaluation Framework, and Neighborhood Traversal
 *
 * Generic system for expanding graphs by loading neighbors, exploring
 * graph neighborhoods, and running evaluation experiments.
 *
 * ## Core Features
 *
 * - **Generic Interfaces**: Works with any graph implementation through ReadableGraph
 * - **Dynamic Expansion**: GraphExpander interface for lazy-loading from APIs/databases
 * - **Traversal Algorithms**: BFS, DFS, bidirectional BFS with degree-based prioritization
 * - **Extraction Methods**: k-hop ego network extraction
 * - **Evaluation Framework**: Metrics, baselines, path planting, statistical tests
 * - **Zero Coupling**: No dependencies on specific graph implementations
 *
 * ## Usage
 *
 * ```typescript
 * import { bfs, dfs, extractEgoNetwork, GraphAdapter } from '@bibgraph/graph-expansion';
 * import { runExperiment, spearmanCorrelation } from '@bibgraph/graph-expansion/evaluation';
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
 * // Ego network extraction
 * const egoNetwork = extractEgoNetwork(adapter, {
 *   radius: 2,
 *   seedNodes: ['nodeId'],
 * });
 *
 * // Run evaluation experiment
 * const report = await runExperiment({
 *   name: 'My Experiment',
 *   graphSpecs: [mySpec],
 *   instancesPerSpec: 10,
 *   pathPlanting: { numPaths: 5, signalStrength: 'medium' },
 *   methods: [
 *     { name: 'MI', ranker: miRanker },
 *     { name: 'Random', ranker: randomRanker },
 *   ],
 *   metrics: ['spearman', 'ndcg'],
 *   statisticalTests: ['paired-t'],
 *   seed: 42,
 * });
 * ```
 */

// Interfaces
export type { GraphExpander, Neighbor } from './interfaces/graph-expander';
// Re-export from @bibgraph/types for backwards compatibility
export type { ReadableGraph, NodeBase, EdgeBase } from '@bibgraph/types';

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
