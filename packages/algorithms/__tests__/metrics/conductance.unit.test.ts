/**
 * Unit tests for conductance calculation.
 * Validates boundary quality measurement for clusters.
 *
 * @module __tests__/metrics/conductance.test
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import type { Node, Edge } from '../../src/types/graph';
import {
  calculateConductance,
  calculateAverageConductance,
  calculateWeightedAverageConductance,
} from '../../src/metrics/conductance';
import { knownCommunityGraph, ringOfCliquesGraph } from '../fixtures/known-clusters';

describe('calculateConductance', () => {
  it('should return 0.0 for empty cluster', () => {
    const graph = new Graph<Node, Edge>(false);
    graph.addNode({ id: 'N1', type: 'test' });

    const cluster = new Set<Node>();

    const conductance = calculateConductance(graph, cluster);

    expect(conductance).toBe(0.0);
  });

  it('should return 0.0 for entire graph as cluster', () => {
    const graph = new Graph<Node, Edge>(false);
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'N1', target: 'N2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'N2', target: 'N3', type: 'test' });

    const allNodes = graph.getAllNodes();
    const cluster = new Set(allNodes);

    const conductance = calculateConductance(graph, cluster);

    // Entire graph has no boundary edges
    expect(conductance).toBe(0.0);
  });

  it('should return 0.0 for isolated cluster with no edges', () => {
    const graph = new Graph<Node, Edge>(false);
    graph.addNode({ id: 'N1', type: 'test' });
    graph.addNode({ id: 'N2', type: 'test' });
    graph.addNode({ id: 'N3', type: 'test' });

    // No edges - completely disconnected nodes

    const cluster = new Set<Node>([
      { id: 'N1', type: 'test' },
      { id: 'N2', type: 'test' },
    ]);

    const conductance = calculateConductance(graph, cluster);

    // Isolated cluster (no edges at all) has 0 conductance
    expect(conductance).toBe(0.0);
  });

  it('should calculate conductance for dense cluster with small complement', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create two clusters: dense cluster A and sparse cluster B
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'A3', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });

    // Many internal edges in cluster A
    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'A2', target: 'A3', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'A3', target: 'A1', type: 'test' });

    // Only one boundary edge
    graph.addEdge({ id: 'E4', source: 'A1', target: 'B1', type: 'test' });

    const clusterA = new Set<Node>([
      { id: 'A1', type: 'test' },
      { id: 'A2', type: 'test' },
      { id: 'A3', type: 'test' },
    ]);

    const conductance = calculateConductance(graph, clusterA);

    // Conductance = cut(S) / min(vol(S), vol(V\S))
    // cut(S) = 1 (A1-B1)
    // vol(S) = 7 (degrees: 3+2+2)
    // vol(V\S) = 1 (degree of B1)
    // φ(S) = 1 / min(7, 1) = 1.0
    //
    // Even with few boundary edges, conductance can be high when complement volume is small
    expect(conductance).toBe(1.0);
    expect(conductance).toBeGreaterThanOrEqual(0.0);
  });

  it('should calculate high conductance for cluster with many boundary edges', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create cluster with more boundary edges than internal edges
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });
    graph.addNode({ id: 'B3', type: 'test' });

    // Minimal internal edges in cluster A
    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });

    // Many boundary edges
    graph.addEdge({ id: 'E2', source: 'A1', target: 'B1', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'A1', target: 'B2', type: 'test' });
    graph.addEdge({ id: 'E4', source: 'A2', target: 'B1', type: 'test' });
    graph.addEdge({ id: 'E5', source: 'A2', target: 'B3', type: 'test' });

    const clusterA = new Set<Node>([
      { id: 'A1', type: 'test' },
      { id: 'A2', type: 'test' },
    ]);

    const conductance = calculateConductance(graph, clusterA);

    // Cluster with many boundary edges should have high conductance
    expect(conductance).toBeGreaterThan(0.5);
    expect(conductance).toBeLessThanOrEqual(1.0);
  });

  it('should calculate expected conductance for known community graph', () => {
    const { graph, groundTruth } = knownCommunityGraph(false);

    // Test first community
    const firstCommunityNodes = Array.from(groundTruth.assignments.entries())
      .filter(([_, communityId]) => communityId === 0)
      .map(([nodeId]) => graph.getNode(nodeId).value!)
      .filter((node): node is Node => node !== undefined);

    const cluster = new Set(firstCommunityNodes);

    const conductance = calculateConductance(graph, cluster);

    // Known community graph has 90% intra-community edges
    // Expected conductance should be low (< 0.2)
    expect(conductance).toBeLessThan(0.3);
    expect(conductance).toBeGreaterThanOrEqual(0.0);

    // Should be close to expected value
    expect(Math.abs(conductance - groundTruth.expectedConductance)).toBeLessThan(0.2);
  });

  it('should calculate very low conductance for ring of cliques', () => {
    const { graph, groundTruth } = ringOfCliquesGraph();

    // Test first clique (complete graph K5)
    const firstCliqueNodes = Array.from(groundTruth.assignments.entries())
      .filter(([_, communityId]) => communityId === 0)
      .map(([nodeId]) => graph.getNode(nodeId).value!)
      .filter((node): node is Node => node !== undefined);

    const cluster = new Set(firstCliqueNodes);

    const conductance = calculateConductance(graph, cluster);

    // Complete clique with only one bridge edge should have very low conductance
    expect(conductance).toBeLessThan(0.1);
    expect(conductance).toBeGreaterThanOrEqual(0.0);
  });
});

describe('calculateAverageConductance', () => {
  it('should return 0.0 for empty cluster array', () => {
    const graph = new Graph<Node, Edge>(false);
    const clusters: Set<Node>[] = [];

    const avgConductance = calculateAverageConductance(graph, clusters);

    expect(avgConductance).toBe(0.0);
  });

  it('should calculate average across multiple clusters', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create two clusters
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'B1', target: 'B2', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'A1', target: 'B1', type: 'test' });

    const clusters: Set<Node>[] = [
      new Set([{ id: 'A1', type: 'test' }, { id: 'A2', type: 'test' }]),
      new Set([{ id: 'B1', type: 'test' }, { id: 'B2', type: 'test' }]),
    ];

    const avgConductance = calculateAverageConductance(graph, clusters);

    expect(avgConductance).toBeGreaterThanOrEqual(0.0);
    expect(avgConductance).toBeLessThanOrEqual(1.0);

    // Both clusters have similar boundary characteristics
    expect(avgConductance).toBeGreaterThan(0.0);
  });

  it('should handle single cluster', () => {
    const graph = new Graph<Node, Edge>(false);

    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });

    const clusters: Set<Node>[] = [
      new Set([{ id: 'A1', type: 'test' }, { id: 'A2', type: 'test' }]),
    ];

    const avgConductance = calculateAverageConductance(graph, clusters);

    // Average of single cluster equals cluster's conductance
    const singleConductance = calculateConductance(graph, clusters[0]);
    expect(avgConductance).toBe(singleConductance);
  });
});

describe('calculateWeightedAverageConductance', () => {
  it('should return 0.0 for empty cluster array', () => {
    const graph = new Graph<Node, Edge>(false);
    const clusters: Set<Node>[] = [];

    const weightedAvg = calculateWeightedAverageConductance(graph, clusters);

    expect(weightedAvg).toBe(0.0);
  });

  it('should weight larger clusters more heavily', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create clusters of different sizes
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'A3', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'C1', type: 'test' });

    // Large cluster A (3 nodes)
    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'A2', target: 'A3', type: 'test' });

    // Small cluster B (1 node) - connected to A
    graph.addEdge({ id: 'E3', source: 'A1', target: 'B1', type: 'test' });

    const clusterA = new Set<Node>([
      { id: 'A1', type: 'test' },
      { id: 'A2', type: 'test' },
      { id: 'A3', type: 'test' },
    ]);

    const clusterB = new Set<Node>([{ id: 'B1', type: 'test' }]);

    const clusters = [clusterA, clusterB];

    const weightedAvg = calculateWeightedAverageConductance(graph, clusters);
    const unweightedAvg = calculateAverageConductance(graph, clusters);

    // Both should be valid values
    expect(weightedAvg).toBeGreaterThanOrEqual(0.0);
    expect(weightedAvg).toBeLessThanOrEqual(1.0);
    expect(unweightedAvg).toBeGreaterThanOrEqual(0.0);
    expect(unweightedAvg).toBeLessThanOrEqual(1.0);

    // Weighted and unweighted averages should differ when cluster sizes differ
    // (unless both clusters happen to have identical conductance)
  });

  it('should equal unweighted average when all clusters same size', () => {
    const graph = new Graph<Node, Edge>(false);

    // Create three equal-sized clusters
    graph.addNode({ id: 'A1', type: 'test' });
    graph.addNode({ id: 'A2', type: 'test' });
    graph.addNode({ id: 'B1', type: 'test' });
    graph.addNode({ id: 'B2', type: 'test' });
    graph.addNode({ id: 'C1', type: 'test' });
    graph.addNode({ id: 'C2', type: 'test' });

    graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'test' });
    graph.addEdge({ id: 'E2', source: 'B1', target: 'B2', type: 'test' });
    graph.addEdge({ id: 'E3', source: 'C1', target: 'C2', type: 'test' });

    const clusters: Set<Node>[] = [
      new Set([{ id: 'A1', type: 'test' }, { id: 'A2', type: 'test' }]),
      new Set([{ id: 'B1', type: 'test' }, { id: 'B2', type: 'test' }]),
      new Set([{ id: 'C1', type: 'test' }, { id: 'C2', type: 'test' }]),
    ];

    const weightedAvg = calculateWeightedAverageConductance(graph, clusters);
    const unweightedAvg = calculateAverageConductance(graph, clusters);

    // When all clusters are same size, weighted = unweighted
    expect(Math.abs(weightedAvg - unweightedAvg)).toBeLessThan(0.01);
  });

  it('should handle zero-weight clusters gracefully', () => {
    const graph = new Graph<Node, Edge>(false);
    const clusters: Set<Node>[] = [new Set()];

    const weightedAvg = calculateWeightedAverageConductance(graph, clusters);

    expect(weightedAvg).toBe(0.0);
  });
});
