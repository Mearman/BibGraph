import {
  type DuplicateNodeError,
  type InvalidInputError,
} from '../types/errors';
import { type Edge,type Node } from '../types/graph';
import { None,type Option, Some } from '../types/option';
import { Err,Ok, type Result } from '../types/result';

/**
 * Generic graph data structure supporting both directed and undirected graphs.
 * Uses adjacency list representation for efficient neighbor lookup (O(1) average case).
 * @template N - Node type (must extend Node interface with id and type fields)
 * @template E - Edge type (must extend Edge interface with source, target fields)
 * @example
 * ```typescript
 * type WorkNode = { id: string; type: 'work'; title: string };
 * type CitationEdge = { id: string; source: string; target: string; type: 'citation' };
 *
 * const graph = new Graph<WorkNode, CitationEdge>(true); // directed graph
 * graph.addNode({ id: 'W1', type: 'work', title: 'Paper A' });
 * graph.addNode({ id: 'W2', type: 'work', title: 'Paper B' });
 * graph.addEdge({ id: 'E1', source: 'W1', target: 'W2', type: 'citation' });
 * ```
 */
export class Graph<N extends Node, E extends Edge> {
  /** Node storage (ID → Node) */
  private nodes: Map<string, N>;

  /** Edge storage (ID → Edge) */
  private edges: Map<string, E>;

  /** Adjacency list (Node ID → Set of neighbor IDs) */
  private adjacencyList: Map<string, Set<string>>;

  /** Graph directionality */
  private directed: boolean;

  /**
   * Create a new graph.
   * @param directed - Whether the graph is directed (true) or undirected (false)
   */
  constructor(directed: boolean) {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacencyList = new Map();
    this.directed = directed;
  }

  /**
   * Add a node to the graph.
   * @param node - Node to add
   * @returns Ok(void) if successful, Err(DuplicateNodeError) if node ID already exists
   * @example
   * ```typescript
   * const result = graph.addNode({ id: 'N1', type: 'test', label: 'Node 1' });
   * if (!result.ok) {
   *   console.error('Failed to add node:', result.error.message);
   * }
   * ```
   */
  addNode(node: N): Result<void, DuplicateNodeError> {
    if (this.nodes.has(node.id)) {
      return Err({
        type: 'duplicate-node',
        message: `Node '${node.id}' already exists in graph`,
        nodeId: node.id,
      });
    }

    this.nodes.set(node.id, node);
    this.adjacencyList.set(node.id, new Set());

    return Ok(void 0);
  }

  /**
   * Remove a node from the graph (and all incident edges).
   * @param id - Node ID to remove
   * @returns Ok(void) if successful, Err(InvalidInputError) if node not found
   */
  removeNode(id: string): Result<void, InvalidInputError> {
    if (!this.nodes.has(id)) {
      return Err({
        type: 'invalid-input',
        message: `Node '${id}' not found in graph`,
        input: id,
      });
    }

    // Remove all edges incident to this node
    const edgesToRemove: string[] = [];
    this.edges.forEach((edge, edgeId) => {
      if (edge.source === id || edge.target === id) {
        edgesToRemove.push(edgeId);
      }
    });

    edgesToRemove.forEach((edgeId) => {
      this.removeEdge(edgeId);
    });

    // Remove node
    this.nodes.delete(id);
    this.adjacencyList.delete(id);

    return Ok(void 0);
  }

  /**
   * Check if node exists in graph.
   * @param id - Node ID to check
   * @returns true if node exists, false otherwise
   */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /**
   * Get node by ID.
   * @param id - Node ID to retrieve
   * @returns Some(node) if found, None if not found
   * @example
   * ```typescript
   * const nodeOption = graph.getNode('N1');
   * if (nodeOption.some) {
   *   console.log('Found:', nodeOption.value);
   * }
   * ```
   */
  getNode(id: string): Option<N> {
    const node = this.nodes.get(id);
    return node === undefined ? None() : Some(node);
  }

  /**
   * Add an edge to the graph.
   * @param edge - Edge to add
   * @returns Ok(void) if successful, Err(InvalidInputError) if source/target nodes don't exist
   * @example
   * ```typescript
   * const result = graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'link' });
   * if (!result.ok) {
   *   console.error('Failed to add edge:', result.error.message);
   * }
   * ```
   */
  addEdge(edge: E): Result<void, InvalidInputError> {
    if (!this.nodes.has(edge.source)) {
      return Err({
        type: 'invalid-input',
        message: `Source node '${edge.source}' not found in graph`,
        input: edge.source,
      });
    }

    if (!this.nodes.has(edge.target)) {
      return Err({
        type: 'invalid-input',
        message: `Target node '${edge.target}' not found in graph`,
        input: edge.target,
      });
    }

    this.edges.set(edge.id, edge);

    // Add to adjacency list
    const sourceAdj = this.adjacencyList.get(edge.source);
    if (sourceAdj) {
      sourceAdj.add(edge.target);
    }

    // For undirected graphs, add reverse edge to adjacency list
    if (!this.directed) {
      const targetAdj = this.adjacencyList.get(edge.target);
      if (targetAdj) {
        targetAdj.add(edge.source);
      }
    }

    return Ok(void 0);
  }

  /**
   * Remove an edge from the graph.
   * @param id - Edge ID to remove
   * @returns Ok(void) if successful, Err(InvalidInputError) if edge not found
   */
  removeEdge(id: string): Result<void, InvalidInputError> {
    const edge = this.edges.get(id);

    if (!edge) {
      return Err({
        type: 'invalid-input',
        message: `Edge '${id}' not found in graph`,
        input: id,
      });
    }

    // Remove from adjacency list
    this.adjacencyList.get(edge.source)?.delete(edge.target);

    // For undirected graphs, remove reverse edge
    if (!this.directed) {
      this.adjacencyList.get(edge.target)?.delete(edge.source);
    }

    this.edges.delete(id);

    return Ok(void 0);
  }

  /**
   * Get neighbor node IDs for a given node.
   * @param id - Node ID to get neighbors for
   * @returns Ok(neighbor IDs) if successful, Err(InvalidInputError) if node not found
   * @example
   * ```typescript
   * const result = graph.getNeighbors('N1');
   * if (result.ok) {
   *   console.log('Neighbors:', result.value);
   * }
   * ```
   */
  getNeighbors(id: string): Result<string[], InvalidInputError> {
    if (!this.nodes.has(id)) {
      return Err({
        type: 'invalid-input',
        message: `Node '${id}' not found in graph`,
        input: id,
      });
    }

    const neighbors = this.adjacencyList.get(id);
    return Ok([...neighbors || []]);
  }

  /**
   * Get total number of nodes in graph.
   * @returns Node count
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get total number of edges in graph.
   * @returns Edge count
   */
  getEdgeCount(): number {
    return this.edges.size;
  }

  /**
   * Check if graph is directed.
   * @returns true if directed, false if undirected
   */
  isDirected(): boolean {
    return this.directed;
  }

  /**
   * Get all nodes in the graph.
   * @returns Array of all nodes
   * @example
   * ```typescript
   * const nodes = graph.getAllNodes();
   * console.log('Total nodes:', nodes.length);
   * ```
   */
  getAllNodes(): N[] {
    return [...this.nodes.values()];
  }

  /**
   * Get all edges in the graph.
   * @returns Array of all edges
   * @example
   * ```typescript
   * const edges = graph.getAllEdges();
   * console.log('Total edges:', edges.length);
   * ```
   */
  getAllEdges(): E[] {
    return [...this.edges.values()];
  }

  /**
   * Get an edge by its ID.
   * @param id - Edge ID to look up
   * @returns Option containing the edge, or None if not found
   * @example
   * ```typescript
   * const edge = graph.getEdge('E1');
   * if (edge.some) {
   *   console.log('Edge found:', edge.value);
   * }
   * ```
   */
  getEdge(id: string): Option<E> {
    const edge = this.edges.get(id);
    return edge ? Some(edge) : None();
  }

  /**
   * Get all outgoing edges from a node.
   *
   * For directed graphs: Returns edges where node is the source.
   * For undirected graphs: Returns edges where node is either source or target.
   * @param id - Node ID to get outgoing edges from
   * @returns Result containing array of outgoing edges, or error if node not found
   * @example
   * ```typescript
   * const result = graph.getOutgoingEdges('N1');
   * if (result.ok) {
   *   console.log('Outgoing edges:', result.value);
   * }
   * ```
   */
  getOutgoingEdges(id: string): Result<E[], InvalidInputError> {
    if (!this.nodes.has(id)) {
      return Err({
        type: 'invalid-input',
        message: `Node '${id}' not found in graph`,
        input: id,
      });
    }

    const outgoing: E[] = [];

    for (const edge of this.edges.values()) {
      // For directed graphs: only edges where node is source
      // For undirected graphs: edges where node is either source or target
      if (edge.source === id || (!this.directed && edge.target === id)) {
        outgoing.push(edge);
      }
    }

    return Ok(outgoing);
  }
}
