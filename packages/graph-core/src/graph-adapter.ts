/**
 * Graph Adapter - Bridges algorithms Graph class to ReadableGraph interface
 *
 * This adapter wraps the algorithms package's Graph class (which uses Option/Result
 * monads) and implements the graph-expansion package's ReadableGraph interface
 * (which uses simpler null/array returns).
 *
 * @module adapters/graph-adapter
 */

import type { ReadableGraph, NodeBase, EdgeBase } from '@bibgraph/graph-expansion';
import { type Graph, type Node, type Edge } from '@bibgraph/algorithms';

/**
 * Adapts the algorithms Graph class to the ReadableGraph interface.
 *
 * The Graph class uses Option/Result monads, while ReadableGraph uses
 * simpler null/array returns. This adapter handles the conversion.
 *
 * @template N - Node type (extends Node from algorithms)
 * @template E - Edge type (extends Edge from algorithms)
 */
export class GraphAdapter<N extends Node, E extends Edge> implements ReadableGraph<N, E> {
  private graph: Graph<N, E>;

  constructor(graph: Graph<N, E>) {
    this.graph = graph;
  }

  /**
   * Check if a node exists in the graph.
   * @param id - Node ID to check
   * @returns true if node exists, false otherwise
   */
  hasNode(id: string): boolean {
    return this.graph.hasNode(id);
  }

  /**
   * Get a node by ID.
   * @param id - Node ID to retrieve
   * @returns Node data or null if not found
   */
  getNode(id: string): N | null {
    const result = this.graph.getNode(id);
    if (result.some) {
      return result.value;
    }
    return null;
  }

  /**
   * Get neighbor node IDs for a given node.
   * @param id - Node ID to get neighbors for
   * @returns Array of neighbor IDs (empty array if node not found)
   */
  getNeighbors(id: string): string[] {
    const result = this.graph.getNeighbors(id);
    if (result.ok) {
      return result.value;
    }
    return [];
  }

  /**
   * Get all nodes in the graph.
   * @returns Array of all nodes
   */
  getAllNodes(): N[] {
    return this.graph.getAllNodes();
  }

  /**
   * Check if graph is directed.
   * @returns true if directed, false if undirected
   */
  isDirected(): boolean {
    return this.graph.isDirected();
  }

  /**
   * Get outgoing edges from a node.
   *
   * For directed graphs: Returns edges where node is the source.
   * For undirected graphs: Returns edges where node is either source or target.
   *
   * @param id - Node ID to get outgoing edges from
   * @returns Array of outgoing edges (empty array if node not found)
   */
  getOutgoingEdges(id: string): E[] {
    const result = this.graph.getOutgoingEdges(id);
    if (result.ok) {
      return result.value;
    }
    return [];
  }
}
