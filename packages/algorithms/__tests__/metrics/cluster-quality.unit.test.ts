/**
 * Unit tests for cluster quality metrics (density, coverage, aggregation).
 * Validates quality measurement utilities for clustering evaluation.
 *
 * @module __tests__/metrics/cluster-quality.test
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import type { Node, Edge } from '../../src/types/graph';
import type { Community } from '../../src/types/clustering-types';
import {
  calculateDensity,
  calculateAverageDensity,
  calculateCoverageRatio,
  calculateClusterMetrics,
  updateCommunityDensities,
} from '../../src/metrics/cluster-quality';
import { knownCommunityGraph, ringOfCliquesGraph } from '../fixtures/known-clusters';

describe('calculateDensity', () => {
  it('should return 0.0 for empty cluster', () => {
    const graph = new Graph<Node, Edge>(false);
    const cluster = new Set<Node>();

    const density = calculateDensity(graph, cluster);

    expect(density).toBe(0.0);
  });

  it('should return 0.0 for single-node cluster', () => {
    const graph = new Graph<Node, Edge>(false);
    graph.addNode({ id: 'N1', type: 'test' });

    const cluster = new Set<Node>([{ id: 'N1', type: 'test' }]);

    const density = calculateDensity(graph, cluster);

    // Single node has no possible edges
    expect(density).toBe(0.0);
  });

  it('should return 1.0 for complete graph (undirected)', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create complete graph K3
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'N2', target: 'N3', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'N3', target: 'N1', type: 'test' });

    const cluster = new Set<Node>([
      { id: 'N1', type: 'test' },
      { id: 'N2', type: 'test' },
      { id: 'N3', type: 'test' },
    ]);

    const density = calculateDensity(graph, cluster);

    // Complete graph has all possible edges
    expect(density).toBe(1.0);
  });

  it('should calculate correct density for partial graph (undirected)', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create graph with 4 nodes and 3 edges
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });
    graph.addNode({ id: 'N4', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'N2', target: 'N3', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'N3', target: 'N4', type: 'test' });

    const cluster = new Set<Node>([
      { id: 'N1', type: 'test' },
      { id: 'N2', type: 'test' },
      { id: 'N3', type: 'test' },
      { id: 'N4', type: 'test' },
    ]);

    const density = calculateDensity(graph, cluster);

    // 4 nodes: possible edges = 4 * 3 / 2 = 6
    // Actual edges = 3
    // Density = 3 / 6 = 0.5
    expect(density).toBeCloseTo(0.5, 2);
  });

  it('should calculate correct density for directed graph', () => {
    const graph = new Graph<Node, Edge>(true); // Directed

    // Create directed graph
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'N2', target: 'N3', type: 'test' });

    const cluster = new Set<Node>([
      { id: 'N1', type: 'test' },
      { id: 'N2', type: 'test' },
      { id: 'N3', type: 'test' },
    ]);

    const density = calculateDensity(graph, cluster);

    // 3 nodes: possible directed edges = 3 * 2 = 6
    // Actual edges = 2
    // Density = 2 / 6 ≈ 0.333
    expect(density).toBeCloseTo(0.333, 2);
  });

  it('should return 0.0 for cluster with no internal edges', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create nodes but no edges between them
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });

    const cluster = new Set<Node>([
      { id: 'N1', type: 'test' },
      { id: 'N2', type: 'test' },
      { id: 'N3', type: 'test' },
    ]);

    const density = calculateDensity(graph, cluster);

    // No edges means 0 density
    expect(density).toBe(0.0);
  });

  it('should calculate high density for clique in ring of cliques', () => {
    const { graph, groundTruth } = ringOfCliquesGraph();

    // Get first clique (complete graph K5)
    const firstCliqueNodes = Array.from(groundTruth.assignments.entries())
      .filter(([_, communityId]) => communityId === 0)
      .map(([nodeId]) => graph.getNode(nodeId).value!)
      .filter((node): node is Node => node !== undefined);

    const cluster = new Set(firstCliqueNodes);

    const density = calculateDensity(graph, cluster);

    // Complete clique (K5) should have density close to 1.0
    expect(density).toBeGreaterThan(0.95);
    expect(density).toBeLessThanOrEqual(1.0);
  });
});

describe('calculateAverageDensity', () => {
  it('should return 0.0 for empty cluster array', () => {
    const graph = new Graph<Node, Edge>(false);
    const clusters: Set<Node>[] = [];

    const avgDensity = calculateAverageDensity(graph, clusters);

    expect(avgDensity).toBe(0.0);
  });

  it('should calculate average across multiple clusters', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create two clusters with different densities
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });
    graph.addNode({ id: 'B3', type: 'test' });

    // Dense cluster A (complete)
    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });

    // Sparse cluster B (partial)
    graph.addEdge({ id: 'E2', source: 'B1', target: 'B2', type: 'test' });

    const clusters: Set<Node>[] = [
      new Set([{ id: 'A1', type: 'test' }, { id: 'A2', type: 'test' }]),
      new Set([
        { id: 'B1', type: 'test' },
        { id: 'B2', type: 'test' },
        { id: 'B3', type: 'test' },
      ]),
    ];

    const avgDensity = calculateAverageDensity(graph, clusters);

    expect(avgDensity).toBeGreaterThan(0.0);
    expect(avgDensity).toBeLessThanOrEqual(1.0);

    // Cluster A: 1 edge / 1 possible = 1.0
    // Cluster B: 1 edge / 3 possible = 0.333
    // Average: (1.0 + 0.333) / 2 ≈ 0.67
    expect(avgDensity).toBeCloseTo(0.67, 1);
  });
});

describe('calculateCoverageRatio', () => {
  it('should return 0.0 for graph with no edges', () => {
    const graph = new Graph<Node, Edge>(false);
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });

    const clusters: Set<Node>[] = [new Set([{ id: 'N1', type: 'test' }])];

    const coverage = calculateCoverageRatio(graph, clusters);

    expect(coverage).toBe(0.0);
  });

  it('should return 1.0 when all edges are within clusters', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create two clusters with only internal edges
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'B1', target: 'B2', type: 'test' });

    const clusters: Set<Node>[] = [
      new Set([{ id: 'A1', type: 'test' }, { id: 'A2', type: 'test' }]),
      new Set([{ id: 'B1', type: 'test' }, { id: 'B2', type: 'test' }]),
    ];

    const coverage = calculateCoverageRatio(graph, clusters);

    // All edges are within clusters
    expect(coverage).toBe(1.0);
  });

  it('should calculate partial coverage with inter-cluster edges', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create clusters with mixed internal/external edges
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });

    // Internal edges
    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'B1', target: 'B2', type: 'test' });

    // Inter-cluster edge
    graph.addEdge({ id: 'E3', source: 'A1', target: 'B1', type: 'test' });

    const clusters: Set<Node>[] = [
      new Set([{ id: 'A1', type: 'test' }, { id: 'A2', type: 'test' }]),
      new Set([{ id: 'B1', type: 'test' }, { id: 'B2', type: 'test' }]),
    ];

    const coverage = calculateCoverageRatio(graph, clusters);

    // 2 internal edges / 3 total edges ≈ 0.67
    expect(coverage).toBeCloseTo(0.67, 2);
  });

  it('should calculate high coverage for known community graph', () => {
    const { graph, groundTruth } = knownCommunityGraph(false);

    // Build clusters from ground truth
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

    const clusters = Array.from(communityMap.values());

    const coverage = calculateCoverageRatio(graph, clusters);

    // Known community graph has 90% intra-community edges
    // With deterministic seeded random (seed=42), coverage is ~0.72
    expect(coverage).toBeGreaterThan(0.70);
    expect(coverage).toBeLessThanOrEqual(1.0);

    // Should be close to deterministic value
    expect(coverage).toBeCloseTo(0.7229, 2);
  });
});

describe('calculateClusterMetrics', () => {
  it('should calculate all metrics for simple community', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create simple graph
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

    const metrics = calculateClusterMetrics(graph, communities);

    // Verify all metrics present
    expect(typeof metrics.modularity).toBe('number');
    expect(typeof metrics.avgConductance).toBe('number');
    expect(typeof metrics.avgDensity).toBe('number');
    expect(typeof metrics.numClusters).toBe('number');
    expect(typeof metrics.coverageRatio).toBe('number');

    // Verify ranges
    expect(metrics.modularity).toBeGreaterThanOrEqual(-0.5);
    expect(metrics.modularity).toBeLessThanOrEqual(1.0);
    expect(metrics.avgConductance).toBeGreaterThanOrEqual(0.0);
    expect(metrics.avgConductance).toBeLessThanOrEqual(1.0);
    expect(metrics.avgDensity).toBeGreaterThanOrEqual(0.0);
    expect(metrics.avgDensity).toBeLessThanOrEqual(1.0);
    expect(metrics.coverageRatio).toBeGreaterThanOrEqual(0.0);
    expect(metrics.coverageRatio).toBeLessThanOrEqual(1.0);
    expect(metrics.numClusters).toBe(1);
  });

  it('should calculate high-quality metrics for known community graph', () => {
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

    const metrics = calculateClusterMetrics(graph, communities);

    // Known community graph should have high-quality metrics
    // With deterministic seeded random (seed=42), values are consistent
    expect(metrics.modularity).toBeGreaterThan(0.45);
    expect(metrics.modularity).toBeCloseTo(0.4725, 2);
    expect(metrics.avgConductance).toBeLessThan(0.3);
    expect(metrics.avgDensity).toBeGreaterThan(0.7);
    expect(metrics.coverageRatio).toBeGreaterThan(0.70);
    expect(metrics.coverageRatio).toBeCloseTo(0.7229, 2);
    expect(metrics.numClusters).toBe(groundTruth.numCommunities);
  });
});

describe('updateCommunityDensities', () => {
  it('should update density field for each community', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create complete triangle
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'N2', target: 'N3', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'N3', target: 'N1', type: 'test' });

    const communities: Community<Node>[] = [
      {
        id: 0,
        nodes: new Set([
          { id: 'N1', type: 'test' },
          { id: 'N2', type: 'test' },
          { id: 'N3', type: 'test' },
        ]),
        internalEdges: 3,
        externalEdges: 0,
        modularity: 0,
        density: 0, // Will be updated
        size: 3,
      },
    ];

    updateCommunityDensities(graph, communities);

    // Density should now be 1.0 (complete triangle)
    expect(communities[0].density).toBe(1.0);
  });

  it('should update densities for multiple communities', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create two clusters with different densities
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });
    graph.addNode({ id: 'B3', type: 'test' });

    // Complete cluster A
    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });

    // Partial cluster B
    graph.addEdge({ id: 'E2', source: 'B1', target: 'B2', type: 'test' });

    const communities: Community<Node>[] = [
      {
        id: 0,
        nodes: new Set([{ id: 'A1', type: 'test' }, { id: 'A2', type: 'test' }]),
        internalEdges: 1,
        externalEdges: 0,
        modularity: 0,
        density: 0,
        size: 2,
      },
      {
        id: 1,
        nodes: new Set([
          { id: 'B1', type: 'test' },
          { id: 'B2', type: 'test' },
          { id: 'B3', type: 'test' },
        ]),
        internalEdges: 1,
        externalEdges: 0,
        modularity: 0,
        density: 0,
        size: 3,
      },
    ];

    updateCommunityDensities(graph, communities);

    // Cluster A: 1 edge / 1 possible = 1.0
    expect(communities[0].density).toBe(1.0);

    // Cluster B: 1 edge / 3 possible ≈ 0.333
    expect(communities[1].density).toBeCloseTo(0.333, 2);
  });

  it('should not throw for empty communities array', () => {
    const graph = new Graph<Node, Edge>(false);
    const communities: Community<Node>[] = [];

    expect(() => updateCommunityDensities(graph, communities)).not.toThrow();
  });
});
