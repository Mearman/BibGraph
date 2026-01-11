/**
 * Compressed Sparse Row (CSR) graph representation utilities.
 *
 * CSR is a memory-efficient format for storing sparse graphs using typed arrays.
 * Provides better cache locality and memory access patterns compared to Map-based adjacency lists.
 * @module utils/csr
 */

import { Graph } from '../graph/graph';
import { type Edge,type Node } from '../types/graph';

/**
 * Compressed Sparse Row (CSR) graph representation.
 * @template N - Node type (must extend Node interface)
 * @template E - Edge type (must extend Edge interface)
 * @remarks
 * CSR stores the graph in three typed arrays for optimal memory access:
 *
 * - **offsets**: Start position in edges array for each node's neighbors
 * - **edges**: Packed array of all neighbor indices (sorted by source node)
 * - **weights**: Edge weights corresponding to each edge
 *
 * Example structure for graph with nodes A→B (weight 1.0), A→C (weight 2.0), B→C (weight 3.0):
 * ```
 * nodeIds:   ['A', 'B', 'C']
 * nodeIndex: { 'A' → 0, 'B' → 1, 'C' → 2 }
 * offsets:   [0, 2, 3, 3]  // A's neighbors at [0,2), B's at [2,3), C's at [3,3)
 * edges:     [1, 2, 2]     // A→B, A→C, B→C (using nodeIndex values)
 * weights:   [1.0, 2.0, 3.0]
 * ```
 *
 * To get node A's neighbors:
 * ```typescript
 * const nodeIdx = csr.nodeIndex.get('A')!; // 0
 * const start = csr.offsets[nodeIdx];      // 0
 * const end = csr.offsets[nodeIdx + 1];    // 2
 * const neighborIndices = csr.edges.slice(start, end); // [1, 2] (B, C)
 * const neighborWeights = csr.weights.slice(start, end); // [1.0, 2.0]
 * ```
 */
export interface CSRGraph<N extends Node, E extends Edge> {
  /**
   * Offset array for CSR format.
   * @remarks
   * offsets[i] = start index in edges array for node i's neighbors
   * offsets[i+1] = end index (exclusive) for node i's neighbors
   *
   * Length: nodeIds.length + 1 (extra element for end sentinel)
   */
  offsets: Uint32Array;

  /**
   * Packed array of all neighbor node indices.
   * @remarks
   * Sorted by source node (all of node 0's neighbors, then node 1's neighbors, etc.)
   * Values are indices into nodeIds array, NOT node IDs
   *
   * Length: Total number of edges in graph
   */
  edges: Uint32Array;

  /**
   * Edge weights corresponding to edges array.
   * @remarks
   * weights[i] = weight of edge edges[i]
   * For unweighted graphs, all values are 1.0
   *
   * Length: Same as edges array
   */
  weights: Float64Array;

  /**
   * Ordered array of node IDs.
   * @remarks
   * Maps integer indices to original string node IDs
   * nodeIds[i] = original node ID for index i
   *
   * Length: Number of nodes in graph
   */
  nodeIds: string[];

  /**
   * Reverse mapping from node ID to array index.
   * @remarks
   * nodeIndex.get(id) = index of node id in nodeIds array
   * Inverse of nodeIds array for O(1) lookups
   *
   * Size: Number of nodes in graph
   */
  nodeIndex: Map<string, number>;

  /**
   * Original graph reference for metadata access.
   * @remarks
   * CSR only stores topology and weights. To access node/edge attributes,
   * use this reference: csrGraph.graph.getNode(nodeId)
   */
  graph: Graph<N, E>;
}

/**
 * Convert a Graph to Compressed Sparse Row (CSR) format.
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Input graph to convert
 * @returns CSR representation of the graph
 * @throws {RangeError} If graph is too large for typed arrays (>4 billion nodes or edges)
 * @remarks
 * **Time complexity**: O(V + E) where V = nodes, E = edges
 * **Space complexity**: O(V + E) for typed arrays
 *
 * **Memory savings**:
 * - Map-based adjacency list: ~48 bytes per node + ~96 bytes per edge (object overhead)
 * - CSR: 4 bytes per node (offsets) + 4 bytes per edge (edges) + 8 bytes per edge (weights)
 * - For 1000-node graph with 5000 edges: ~528KB → ~68KB (87% reduction)
 *
 * **Algorithm**:
 * 1. Create nodeIds array and nodeIndex map
 * 2. Count edges per node to compute offsets
 * 3. Allocate typed arrays (offsets, edges, weights)
 * 4. Populate edges and weights arrays by iterating through graph edges
 * @example
 * ```typescript
 * const graph = new Graph<WorkNode, CitationEdge>(true);
 * graph.addNode({ id: 'W1', type: 'work', title: 'Paper A' });
 * graph.addNode({ id: 'W2', type: 'work', title: 'Paper B' });
 * graph.addEdge({ id: 'E1', source: 'W1', target: 'W2', type: 'citation', weight: 1.0 });
 *
 * const csrGraph = convertToCSR(graph);
 * console.log(csrGraph.nodeIds); // ['W1', 'W2']
 * console.log(csrGraph.offsets); // [0, 1, 1]
 * console.log(csrGraph.edges); // [1]
 * console.log(csrGraph.weights); // [1.0]
 * ```
 */
export const convertToCSR = <N extends Node, E extends Edge>(graph: Graph<N, E>): CSRGraph<N, E> => {
  const allNodes = graph.getAllNodes();
  const allEdges = graph.getAllEdges();
  const nodeCount = allNodes.length;
  const edgeCount = allEdges.length;

  // Validate graph size fits in typed arrays (Uint32Array max value is 2^32 - 1)
  if (nodeCount > 0xFF_FF_FF_FF) {
    throw new RangeError(
      `Graph has ${nodeCount} nodes, exceeding Uint32Array limit (4,294,967,295)`
    );
  }
  if (edgeCount > 0xFF_FF_FF_FF) {
    throw new RangeError(
      `Graph has ${edgeCount} edges, exceeding Uint32Array limit (4,294,967,295)`
    );
  }

  // Step 1: Create nodeIds array and nodeIndex map
  const nodeIds: string[] = allNodes.map((node) => node.id);
  const nodeIndex = new Map<string, number>();
  nodeIds.forEach((id, idx) => {
    nodeIndex.set(id, idx);
  });

  // Step 2: Count edges per node to compute offsets
  const edgeCounts = new Uint32Array(nodeCount);
  for (const edge of allEdges) {
    const sourceIdx = nodeIndex.get(edge.source);
    if (sourceIdx !== undefined) {
      edgeCounts[sourceIdx]++;
    }
  }

  // Step 3: Compute cumulative offsets (prefix sum)
  const offsets = new Uint32Array(nodeCount + 1);
  offsets[0] = 0;
  for (let i = 0; i < nodeCount; i++) {
    offsets[i + 1] = offsets[i] + edgeCounts[i];
  }

  // Step 4: Allocate edges and weights arrays
  const edges = new Uint32Array(edgeCount);
  const weights = new Float64Array(edgeCount);

  // Step 5: Populate edges and weights arrays
  // Use temporary counters to track current position for each node
  const currentPos = new Uint32Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    currentPos[i] = offsets[i];
  }

  for (const edge of allEdges) {
    const sourceIdx = nodeIndex.get(edge.source);
    const targetIdx = nodeIndex.get(edge.target);

    if (sourceIdx === undefined || targetIdx === undefined) {
      // Skip edges with invalid nodes (should not happen in valid graphs)
      continue;
    }

    const pos = currentPos[sourceIdx]++;
    edges[pos] = targetIdx;
    // Edge may not have weight property, default to 1.0
    weights[pos] = (edge as { weight?: number }).weight ?? 1;
  }

  return {
    offsets,
    edges,
    weights,
    nodeIds,
    nodeIndex,
    graph,
  };
};
