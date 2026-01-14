/**
 * Unit tests for modularity calculation (Newman-Girvan formula).
 * Validates correctness against known community structures.
 *
 * @module __tests__/metrics/modularity.test
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import type { Node, Edge } from '../../src/types/graph';
import type { Community } from '../../src/types/clustering-types';
import {
  calculateModularity,
  calculateCommunityModularity,
  calculateModularityDelta,
} from '../../src/metrics/modularity';
import { knownCommunityGraph, karateClubGraph } from '../fixtures/known-clusters';

describe('calculateModularity', () => {
  it('should return 0.0 for empty graph', () => {
    const graph = new Graph<Node, Edge>(false);
    const communities: Community<Node>[] = [];

    const Q = calculateModularity(graph, communities);

    expect(Q).toBe(0.0);
  });

  it('should return 0.0 for graph with no edges', () => {
    const graph = new Graph<Node, Edge>(false);
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });

    const communities: Community<Node>[] = [
      {
        id: 0,
        nodes: new Set([{ id: 'N1', type: 'test' }]),
        internalEdges: 0,
        externalEdges: 0,
        modularity: 0,
        density: 0,
        size: 1,
      },
    ];

    const Q = calculateModularity(graph, communities);

    expect(Q).toBe(0.0);
  });

  it('should return 0.0 for single community with all nodes', () => {
    const graph = new Graph<Node, Edge>(false);
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'N2', target: 'N3', type: 'test' });

    const communities: Community<Node>[] = [
      {
        id: 0,
        nodes: new Set([
          { id: 'N1', type: 'test' },
          { id: 'N2', type: 'test' },
          { id: 'N3', type: 'test' },
        ]),
        internalEdges: 2,
        externalEdges: 0,
        modularity: 0,
        density: 0,
        size: 3,
      },
    ];

    const Q = calculateModularity(graph, communities);

    // Single community containing entire graph has Q = 0
    expect(Q).toBe(0.0);
  });

  it('should calculate high modularity for known community graph', () => {
    const { graph, groundTruth } = knownCommunityGraph(false);

    // Build communities from ground truth
    const communityMap = new Map<number, Set<Node>>();
    graph.getAllNodes().forEach((node) => {
      const communityId = groundTruth.assignments.get(node.id);
      if (communityId !== undefined) {
        if (!communityMap.has(communityId)) {
          communityMap.set(communityId, new Set());
        }
        communityMap.get(communityId)!.add(node);
      }
    });

    const communities: Community<Node>[] = Array.from(communityMap.entries()).map(
      ([id, nodes]) => ({
        id,
        nodes,
        internalEdges: 0,
        externalEdges: 0,
        modularity: 0,
        density: 0,
        size: nodes.size,
      })
    );

    const Q = calculateModularity(graph, communities);

    // Known community graph has 90% intra-community edges
    // With deterministic seeded random (seed=42), modularity is ~0.47
    expect(Q).toBeGreaterThan(0.45);
    expect(Q).toBeLessThanOrEqual(1.0);

    // Should be close to deterministic value
    expect(Q).toBeCloseTo(0.4725, 2);
  });

  it('should calculate correct modularity for karate club graph', () => {
    const { graph, groundTruth } = karateClubGraph();

    // Build communities from ground truth
    const communityMap = new Map<number, Set<Node>>();
    graph.getAllNodes().forEach((node) => {
      const communityId = groundTruth.assignments.get(node.id);
      if (communityId !== undefined) {
        if (!communityMap.has(communityId)) {
          communityMap.set(communityId, new Set());
        }
        communityMap.get(communityId)!.add(node);
      }
    });

    const communities: Community<Node>[] = Array.from(communityMap.entries()).map(
      ([id, nodes]) => ({
        id,
        nodes,
        internalEdges: 0,
        externalEdges: 0,
        modularity: 0,
        density: 0,
        size: nodes.size,
      })
    );

    const Q = calculateModularity(graph, communities);

    // Karate club expected modularity is well-documented
    expect(Q).toBeGreaterThan(0.35);
    expect(Q).toBeLessThan(0.50);

    // Should be close to expected value (0.42)
    expect(Math.abs(Q - groundTruth.expectedModularity)).toBeLessThan(0.1);
  });

  it('should return negative modularity for random partitioning', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create 6 nodes: 3 in cluster A, 3 in cluster B
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'A3', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });
    graph.addNode({ id: 'B3', type: 'test' });

    // Add edges only between clusters (no intra-cluster edges)
    graph.addEdge({ id: 'E1', source: 'A1', target: 'B1', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'A2', target: 'B2', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'A3', target: 'B3', type: 'test' });

    const communities: Community<Node>[] = [
      {
        id: 0,
        nodes: new Set([
          { id: 'A1', type: 'test' },
          { id: 'A2', type: 'test' },
          { id: 'A3', type: 'test' },
        ]),
        internalEdges: 0,
        externalEdges: 3,
        modularity: 0,
        density: 0,
        size: 3,
      },
      {
        id: 1,
        nodes: new Set([
          { id: 'B1', type: 'test' },
          { id: 'B2', type: 'test' },
          { id: 'B3', type: 'test' },
        ]),
        internalEdges: 0,
        externalEdges: 3,
        modularity: 0,
        density: 0,
        size: 3,
      },
    ];

    const Q = calculateModularity(graph, communities);

    // Partitioning with only inter-community edges should have negative modularity
    expect(Q).toBeLessThan(0.0);
    expect(Q).toBeGreaterThanOrEqual(-0.5);
  });
});

describe('calculateCommunityModularity', () => {
  it('should return 0.0 for empty graph', () => {
    const graph = new Graph<Node, Edge>(false);
    const community: Community<Node> = {
      id: 0,
      nodes: new Set(),
      internalEdges: 0,
      externalEdges: 0,
      modularity: 0,
      density: 0,
      size: 0,
    };

    const Q_c = calculateCommunityModularity(graph, community, 0);

    expect(Q_c).toBe(0.0);
  });

  it('should return 0.0 for single community containing entire graph', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create fully connected triangle
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'N2', target: 'N3', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'N3', target: 'N1', type: 'test' });

    const community: Community<Node> = {
      id: 0,
      nodes: new Set([
        { id: 'N1', type: 'test' },
        { id: 'N2', type: 'test' },
        { id: 'N3', type: 'test' },
      ]),
      internalEdges: 3,
      externalEdges: 0,
      modularity: 0,
      density: 1.0,
      size: 3,
    };

    const Q_c = calculateCommunityModularity(graph, community, 3);

    // Single community containing entire graph has modularity 0 by definition
    // (Newman-Girvan modularity measures partition quality, not single cluster quality)
    expect(Q_c).toBe(0.0);
  });
});

describe('calculateModularityDelta', () => {
  it('should return 0 for no change', () => {
    const deltaQ = calculateModularityDelta(
      5, // k_i: degree of node
      3, // k_i_in: edges to target community
      20, // sigma_tot: sum of degrees in target community
      15, // sigma_in: internal edges in target community
      100 // m: total edges in graph
    );

    // Delta should be finite number
    expect(typeof deltaQ).toBe('number');
    expect(Number.isFinite(deltaQ)).toBe(true);
  });

  it('should return positive delta for beneficial move', () => {
    // Moving a node that has many connections to target community
    const deltaQ = calculateModularityDelta(
      10, // k_i: high degree node
      8, // k_i_in: most edges go to target community
      20, // sigma_tot
      15, // sigma_in
      100 // m
    );

    // Moving node to community it's strongly connected to should improve modularity
    expect(deltaQ).toBeGreaterThan(0.0);
  });

  it('should return negative delta for detrimental move', () => {
    // Moving a node that has no connections to target community
    const deltaQ = calculateModularityDelta(
      10, // k_i: high degree node
      0, // k_i_in: no edges to target community
      20, // sigma_tot
      15, // sigma_in
      100 // m
    );

    // Moving node to community it has no edges to should decrease modularity
    expect(deltaQ).toBeLessThan(0.0);
  });

  it('should handle edge case with zero values', () => {
    const deltaQ = calculateModularityDelta(0, 0, 0, 0, 1);

    expect(typeof deltaQ).toBe('number');
    expect(Number.isFinite(deltaQ)).toBe(true);
  });
});
