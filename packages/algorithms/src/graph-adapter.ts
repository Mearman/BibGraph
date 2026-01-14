/**
 * Adapter - Convert algorithms Graph class to ReadableGraph interface.
 *
 * This adapter allows the Graph class from @bibgraph/algorithms to work
 * with graph-expansion algorithms without modifying the original class.
 *
 * The adapter handles:
 * - Result<Option<T>> monad conversion to simple null/array returns
 * - Error handling (returns empty arrays instead of throwing)
 * - Method name mapping if needed
 */

import type { Edge, Node } from '@bibgraph/algorithms';
import { Graph } from '@bibgraph/algorithms';
import type { ReadableGraph } from '@bibgraph/graph-expansion';

/**
 * Adapter for algorithms Graph<N, E> class to ReadableGraph interface.
 *
 * @template N - Node type extending Node from algorithms
 * @template E - Edge type extending Edge from algorithms
 */
export class GraphAdapter<N extends Node, E extends Edge> implements ReadableGraph<N, E> {
  constructor(private graph: Graph<N, E>) {}

  hasNode(id: string): boolean {
    return this.graph.hasNode(id);
  }

  getNode(id: string): N | null {
    const opt = this.graph.getNode(id);
    return opt.some ? opt.value : null;
  }

  getNeighbors(id: string): string[] {
    const res = this.graph.getNeighbors(id);
    return res.ok ? res.value : [];
  }

  getAllNodes(): N[] {
    return this.graph.getAllNodes();
  }

  isDirected(): boolean {
    return this.graph.isDirected();
  }

  getOutgoingEdges(id: string): E[] {
    const res = this.graph.getOutgoingEdges(id);
    return res.ok ? res.value : [];
  }
}
