import type { GraphExpander, Neighbor } from '@bibgraph/graph-expansion';
import type { TestGraph, TestNode, TestEdge } from './graph-generator';

/**
 * Mock implementation of GraphExpander for testing bidirectional BFS.
 * Loads graph structure from TestGraph fixture.
 */
export class MockGraphExpander implements GraphExpander<TestNode> {
  private adjacency: Map<string, Neighbor[]> = new Map();
  private degrees: Map<string, number> = new Map();
  private nodes: Map<string, TestNode> = new Map();
  private discoveredEdges: Array<{ source: string; target: string; relationshipType: string }> = [];

  constructor(graph: TestGraph) {
    // Build node lookup
    for (const node of graph.nodes) {
      this.nodes.set(node.id, node);
    }

    // Build adjacency list from edges
    this.buildAdjacency(graph.edges, graph.spec.directionality.kind === 'directed');
  }

  private buildAdjacency(edges: TestEdge[], directed: boolean): void {
    // Initialize adjacency lists
    for (const [nodeId] of this.nodes) {
      this.adjacency.set(nodeId, []);
    }

    // Add edges
    for (const edge of edges) {
      const relationshipType = edge.type ?? 'edge';

      // Add forward edge
      const forwardNeighbors = this.adjacency.get(edge.source) ?? [];
      forwardNeighbors.push({ targetId: edge.target, relationshipType });
      this.adjacency.set(edge.source, forwardNeighbors);

      // For undirected graphs, add reverse edge
      if (!directed) {
        const reverseNeighbors = this.adjacency.get(edge.target) ?? [];
        reverseNeighbors.push({ targetId: edge.source, relationshipType });
        this.adjacency.set(edge.target, reverseNeighbors);
      }
    }

    // Compute degrees
    for (const [nodeId, neighbors] of this.adjacency) {
      this.degrees.set(nodeId, neighbors.length);
    }
  }

  async getNeighbors(nodeId: string): Promise<Neighbor[]> {
    return this.adjacency.get(nodeId) ?? [];
  }

  getDegree(nodeId: string): number {
    return this.degrees.get(nodeId) ?? 0;
  }

  async getNode(nodeId: string): Promise<TestNode | null> {
    return this.nodes.get(nodeId) ?? null;
  }

  addEdge(source: string, target: string, relationshipType: string): void {
    this.discoveredEdges.push({ source, target, relationshipType });
  }

  /**
   * Get all edges discovered during BFS traversal.
   */
  getDiscoveredEdges(): Array<{ source: string; target: string; relationshipType: string }> {
    return this.discoveredEdges;
  }

  /**
   * Clear discovered edges (for reusing expander in multiple tests).
   */
  clearDiscoveredEdges(): void {
    this.discoveredEdges = [];
  }
}
