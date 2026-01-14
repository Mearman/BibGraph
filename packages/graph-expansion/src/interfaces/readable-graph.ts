/**
 * ReadableGraph - Minimal generic interface for graph traversal algorithms.
 *
 * This interface defines the read-only operations required by graph expansion
 * and traversal algorithms. Any graph implementation (in-memory, database-backed,
 * API-based, lazy-loading) can be used by implementing this interface.
 *
 * Design principles:
 * - Minimal: Only methods actually used by algorithms
 * - Synchronous: No async overhead (dynamic loading handled separately)
 * - Simple return types: No Result/Option monads (null/array for not-found)
 * - String-based IDs: Universal identifier type
 *
 * @template N - Node type (must have id field)
 * @template E - Edge type (must have source, target fields)
 */
export interface ReadableGraph<N extends NodeBase, E extends EdgeBase> {
  /**
   * Check if a node exists in the graph.
   * @param id - Node ID to check
   * @returns true if node exists, false otherwise
   */
  hasNode(id: string): boolean;

  /**
   * Get a node by ID.
   * @param id - Node ID to retrieve
   * @returns Node data or null if not found
   */
  getNode(id: string): N | null;

  /**
   * Get neighbor node IDs for a given node.
   * @param id - Node ID to get neighbors for
   * @returns Array of neighbor IDs (empty array if node not found)
   */
  getNeighbors(id: string): string[];

  /**
   * Get all nodes in the graph.
   * @returns Array of all nodes
   */
  getAllNodes(): N[];

  /**
   * Check if graph is directed.
   * @returns true if directed, false if undirected
   */
  isDirected(): boolean;

  /**
   * Get outgoing edges from a node.
   *
   * For directed graphs: Returns edges where node is the source.
   * For undirected graphs: Returns edges where node is either source or target.
   *
   * Used by ego-network extraction to preserve edge metadata.
   *
   * @param id - Node ID to get outgoing edges from
   * @returns Array of outgoing edges (empty array if node not found)
   */
  getOutgoingEdges?(id: string): E[];
}

/**
 * Base node interface - minimum requirements.
 * All node types must extend this with an id field.
 */
export interface NodeBase {
  id: string;
}

/**
 * Base edge interface - minimum requirements.
 * All edge types must extend this with source and target fields.
 */
export interface EdgeBase {
  source: string;
  target: string;
}
