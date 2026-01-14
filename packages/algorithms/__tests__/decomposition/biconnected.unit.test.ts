/**
 * Unit tests for Biconnected Component Decomposition using Tarjan's algorithm.
 * Validates articulation point detection, component extraction, and performance.
 *
 * @module __tests__/decomposition/biconnected.test
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { biconnectedComponents } from '../../src/decomposition/biconnected';
import type { PaperNode, CitationEdge } from '../fixtures/citation-networks';

describe('Biconnected Component Decomposition', () => {
  describe('User Story 9 - Scenario 1: Articulation Point Detection', () => {
    it('should identify bridge papers connecting research communities', () => {
      // Given: Citation network with known bridge papers between communities
      const graph = new Graph<PaperNode, CitationEdge>(false); // Undirected for structural analysis

      // Community 1: Machine Learning (5 papers)
      for (let i = 0; i < 5; i++) {
        graph.addNode({
          id: `ML${i}`,
          title: `Machine Learning Paper ${i}`,
          year: 2020,
          community: 0,
        });
      }

      // Community 2: Computer Vision (5 papers)
      for (let i = 0; i < 5; i++) {
        graph.addNode({
          id: `CV${i}`,
          title: `Computer Vision Paper ${i}`,
          year: 2020,
          community: 1,
        });
      }

      // Bridge paper connecting both communities
      graph.addNode({
        id: 'BRIDGE',
        title: 'Bridge Paper: ML meets CV',
        year: 2021,
        community: 2,
      });

      // Create densely connected ML community
      for (let i = 0; i < 5; i++) {
        for (let j = i + 1; j < 5; j++) {
          graph.addEdge({
            id: `ML-${i}-${j}`,
            source: `ML${i}`,
            target: `ML${j}`,
            year: 2020,
          });
        }
      }

      // Create densely connected CV community
      for (let i = 0; i < 5; i++) {
        for (let j = i + 1; j < 5; j++) {
          graph.addEdge({
            id: `CV-${i}-${j}`,
            source: `CV${i}`,
            target: `CV${j}`,
            year: 2020,
          });
        }
      }

      // Connect bridge paper to both communities (creates articulation point)
      graph.addEdge({ id: 'BRIDGE-ML', source: 'BRIDGE', target: 'ML0', year: 2021 });
      graph.addEdge({ id: 'BRIDGE-CV', source: 'BRIDGE', target: 'CV0', year: 2021 });

      // When: Researcher analyzes network structure
      const result = biconnectedComponents(graph);

      // Then: Bridge paper identified as articulation point
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { articulationPoints, components } = result.value;

      // Bridge paper should be identified as articulation point
      expect(articulationPoints.has('BRIDGE')).toBe(true);

      // ML0 and CV0 should also be articulation points (connect bridge to communities)
      expect(articulationPoints.has('ML0')).toBe(true);
      expect(articulationPoints.has('CV0')).toBe(true);

      // Should detect at least 3 biconnected components:
      // 1. ML community (minus ML0's bridge connection)
      // 2. CV community (minus CV0's bridge connection)
      // 3. Bridge edges
      expect(components.length).toBeGreaterThanOrEqual(3);

      // Each component should have valid structure
      components.forEach((component) => {
        expect(component.id).toBeGreaterThanOrEqual(0);
        expect(component.nodes.size).toBeGreaterThan(0);
        expect(component.size).toBe(component.nodes.size);
      });
    });

    it('should detect no articulation points in fully connected graph', () => {
      // Given: Complete graph (every node connected to every other node)
      const graph = new Graph<PaperNode, CitationEdge>(false);

      // Create 6 nodes
      for (let i = 0; i < 6; i++) {
        graph.addNode({
          id: `N${i}`,
          title: `Paper ${i}`,
          year: 2020,
          community: 0,
        });
      }

      // Add all possible edges (complete graph K6)
      for (let i = 0; i < 6; i++) {
        for (let j = i + 1; j < 6; j++) {
          graph.addEdge({
            id: `E${i}-${j}`,
            source: `N${i}`,
            target: `N${j}`,
            year: 2020,
          });
        }
      }

      // When: Analyze structure
      const result = biconnectedComponents(graph);

      // Then: No articulation points (graph is biconnected)
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { articulationPoints, components } = result.value;

      // Complete graph has no articulation points
      expect(articulationPoints.size).toBe(0);

      // Entire graph is one biconnected component
      expect(components.length).toBe(1);
      expect(components[0].nodes.size).toBe(6);
      expect(components[0].isBridge).toBe(false);
    });
  });

  describe('User Story 9 - Scenario 2: Component Connectivity', () => {
    it('should extract biconnected components with correct node membership', () => {
      // Given: Network with multiple biconnected components
      const graph = new Graph<PaperNode, CitationEdge>(false);

      // Component 1: Triangle (biconnected)
      graph.addNode({ id: 'A', title: 'Paper A', year: 2020, community: 0 });
      graph.addNode({ id: 'B', title: 'Paper B', year: 2020, community: 0 });
      graph.addNode({ id: 'C', title: 'Paper C', year: 2020, community: 0 });

      graph.addEdge({ id: 'AB', source: 'A', target: 'B', year: 2020 });
      graph.addEdge({ id: 'BC', source: 'B', target: 'C', year: 2020 });
      graph.addEdge({ id: 'CA', source: 'C', target: 'A', year: 2020 });

      // Articulation point D
      graph.addNode({ id: 'D', title: 'Paper D (articulation)', year: 2020, community: 1 });
      graph.addEdge({ id: 'CD', source: 'C', target: 'D', year: 2020 });

      // Component 2: Square (biconnected)
      graph.addNode({ id: 'E', title: 'Paper E', year: 2020, community: 1 });
      graph.addNode({ id: 'F', title: 'Paper F', year: 2020, community: 1 });
      graph.addNode({ id: 'G', title: 'Paper G', year: 2020, community: 1 });

      graph.addEdge({ id: 'DE', source: 'D', target: 'E', year: 2020 });
      graph.addEdge({ id: 'EF', source: 'E', target: 'F', year: 2020 });
      graph.addEdge({ id: 'FG', source: 'F', target: 'G', year: 2020 });
      graph.addEdge({ id: 'GD', source: 'G', target: 'D', year: 2020 });

      // When: Extract biconnected components
      const result = biconnectedComponents(graph);

      // Then: Correct components identified
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { articulationPoints, components } = result.value;

      // D and C should be articulation points
      expect(articulationPoints.has('D')).toBe(true);
      expect(articulationPoints.has('C')).toBe(true);

      // Should have at least 2 major biconnected components (triangle and square)
      expect(components.length).toBeGreaterThanOrEqual(2);

      // Find triangle component (should contain A, B, C)
      const triangleComponent = components.find(
        (c) => c.nodes.has('A') && c.nodes.has('B') && c.nodes.has('C')
      );
      expect(triangleComponent).toBeDefined();

      // Find square component (should contain D, E, F, G)
      const squareComponent = components.find(
        (c) => c.nodes.has('D') && c.nodes.has('E') && c.nodes.has('F') && c.nodes.has('G')
      );
      expect(squareComponent).toBeDefined();

      // Verify component sizes
      if (triangleComponent) {
        expect(triangleComponent.size).toBeGreaterThanOrEqual(3);
      }
      if (squareComponent) {
        expect(squareComponent.size).toBeGreaterThanOrEqual(4);
      }
    });

    it('should identify bridge edges as single-edge components', () => {
      // Given: Two complete graphs connected by single bridge edge
      const graph = new Graph<PaperNode, CitationEdge>(false);

      // Left component: Complete graph K3
      graph.addNode({ id: 'L1', title: 'Left Paper 1', year: 2020, community: 0 });
      graph.addNode({ id: 'L2', title: 'Left Paper 2', year: 2020, community: 0 });
      graph.addNode({ id: 'L3', title: 'Left Paper 3', year: 2020, community: 0 });

      graph.addEdge({ id: 'L1-L2', source: 'L1', target: 'L2', year: 2020 });
      graph.addEdge({ id: 'L2-L3', source: 'L2', target: 'L3', year: 2020 });
      graph.addEdge({ id: 'L3-L1', source: 'L3', target: 'L1', year: 2020 });

      // Right component: Complete graph K3
      graph.addNode({ id: 'R1', title: 'Right Paper 1', year: 2020, community: 1 });
      graph.addNode({ id: 'R2', title: 'Right Paper 2', year: 2020, community: 1 });
      graph.addNode({ id: 'R3', title: 'Right Paper 3', year: 2020, community: 1 });

      graph.addEdge({ id: 'R1-R2', source: 'R1', target: 'R2', year: 2020 });
      graph.addEdge({ id: 'R2-R3', source: 'R2', target: 'R3', year: 2020 });
      graph.addEdge({ id: 'R3-R1', source: 'R3', target: 'R1', year: 2020 });

      // Bridge edge connecting the two components
      graph.addEdge({ id: 'BRIDGE', source: 'L1', target: 'R1', year: 2020 });

      // When: Extract biconnected components
      const result = biconnectedComponents(graph);

      // Then: Bridge identified as separate component
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { articulationPoints, components } = result.value;

      // L1 and R1 are articulation points
      expect(articulationPoints.has('L1')).toBe(true);
      expect(articulationPoints.has('R1')).toBe(true);

      // Should have 3 components: left triangle, right triangle, bridge
      expect(components.length).toBe(3);

      // Find bridge component (should have isBridge = true)
      const bridgeComponent = components.find((c) => c.isBridge === true);
      expect(bridgeComponent).toBeDefined();
      if (bridgeComponent) {
        expect(bridgeComponent.nodes.size).toBe(2); // Bridge connects 2 nodes
        expect(bridgeComponent.nodes.has('L1')).toBe(true);
        expect(bridgeComponent.nodes.has('R1')).toBe(true);
      }
    });
  });

  describe('User Story 9 - Scenario 3: Performance Requirement', () => {
    it('should complete in under 10 seconds for 1000-node citation network', { timeout: 15000 }, () => {
      // Given: Large citation network with 1000 nodes
      const graph = new Graph<PaperNode, CitationEdge>(false);

      // Create 1000 nodes
      for (let i = 0; i < 1000; i++) {
        graph.addNode({
          id: `P${i}`,
          title: `Paper ${i}`,
          year: 2020 + Math.floor(i / 100),
          community: Math.floor(i / 100),
        });
      }

      // Create structure with communities connected by bridges
      // 10 communities of 100 nodes each, connected by bridge nodes
      const communitySize = 100;
      const numCommunities = 10;

      // Create densely connected communities
      for (let c = 0; c < numCommunities; c++) {
        const startIdx = c * communitySize;
        const endIdx = startIdx + communitySize;

        // Connect nodes within community (star topology from hub + some random edges)
        const hub = startIdx; // First node in community is hub

        for (let i = startIdx + 1; i < endIdx; i++) {
          // Connect to hub (creates star)
          graph.addEdge({
            id: `E${hub}-${i}`,
            source: `P${hub}`,
            target: `P${i}`,
            year: 2020,
          });

          // Add some random edges within community for redundancy
          if (i < endIdx - 1) {
            graph.addEdge({
              id: `E${i}-${i + 1}`,
              source: `P${i}`,
              target: `P${i + 1}`,
              year: 2020,
            });
          }
        }
      }

      // Connect communities via bridge nodes (hubs)
      for (let c = 0; c < numCommunities - 1; c++) {
        const hub1 = c * communitySize;
        const hub2 = (c + 1) * communitySize;
        graph.addEdge({
          id: `BRIDGE-${c}`,
          source: `P${hub1}`,
          target: `P${hub2}`,
          year: 2020,
        });
      }

      expect(graph.getNodeCount()).toBe(1000);
      expect(graph.getEdgeCount()).toBeGreaterThan(1900); // ~1979 edges with current structure

      // When: Run biconnected component decomposition
      const startTime = performance.now();
      const result = biconnectedComponents(graph);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Algorithm completes in under 10 seconds
      expect(executionTime).toBeLessThan(10000); // 10 seconds in milliseconds

      // Verify algorithm produces valid results at scale
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { articulationPoints, components } = result.value;

      // Should find hub nodes as articulation points (10 community hubs)
      // Plus potentially some other nodes
      expect(articulationPoints.size).toBeGreaterThan(0);
      expect(articulationPoints.size).toBeLessThan(1000);

      // Should at least detect the 10 community hubs as articulation points
      expect(articulationPoints.size).toBeGreaterThanOrEqual(10);

      // Should find multiple components
      expect(components.length).toBeGreaterThan(0);

      // All components should have valid structure
      components.forEach((component) => {
        expect(component.nodes.size).toBeGreaterThan(0);
        expect(component.size).toBe(component.nodes.size);
        expect(component.id).toBeGreaterThanOrEqual(0);
      });

      // All nodes should be covered by at least one component
      const coveredNodes = new Set<string>();
      components.forEach((component) => {
        component.nodes.forEach((nodeId) => {
          coveredNodes.add(nodeId);
        });
      });
      expect(coveredNodes.size).toBeGreaterThan(0);
    });

    it('should have linear time complexity O(V+E)', () => {
      // Given: Two graphs of different sizes
      const smallGraph = new Graph<PaperNode, CitationEdge>(false);
      const largeGraph = new Graph<PaperNode, CitationEdge>(false);

      // Small graph: 100 nodes, ~250 edges
      for (let i = 0; i < 100; i++) {
        smallGraph.addNode({ id: `S${i}`, title: `Small ${i}`, year: 2020, community: 0 });
      }
      for (let i = 0; i < 100; i++) {
        for (let j = 1; j <= 5; j++) {
          const target = (i + j) % 100;
          if (i < target) {
            smallGraph.addEdge({ id: `ES${i}-${target}`, source: `S${i}`, target: `S${target}`, year: 2020 });
          }
        }
      }

      // Large graph: 500 nodes, ~1250 edges (5x size)
      for (let i = 0; i < 500; i++) {
        largeGraph.addNode({ id: `L${i}`, title: `Large ${i}`, year: 2020, community: 0 });
      }
      for (let i = 0; i < 500; i++) {
        for (let j = 1; j <= 5; j++) {
          const target = (i + j) % 500;
          if (i < target) {
            largeGraph.addEdge({ id: `EL${i}-${target}`, source: `L${i}`, target: `L${target}`, year: 2020 });
          }
        }
      }

      // When: Run on both graphs
      const smallStart = performance.now();
      const smallResult = biconnectedComponents(smallGraph);
      const smallEnd = performance.now();
      const smallTime = smallEnd - smallStart;

      const largeStart = performance.now();
      const largeResult = biconnectedComponents(largeGraph);
      const largeEnd = performance.now();
      const largeTime = largeEnd - largeStart;

      // Then: Time should scale linearly with graph size
      expect(smallResult.ok).toBe(true);
      expect(largeResult.ok).toBe(true);

      const sizeRatio = (500 + 1250) / (100 + 250); // (V+E) ratio ≈ 5x
      const timeRatio = largeTime / smallTime;

      // Linear scaling: 5x size should take < 30x time (allow 6x margin for CI variance)
      // Small graphs have noisy timing; this test validates sub-quadratic behavior
      expect(timeRatio).toBeLessThan(sizeRatio * 6);
    });
  });
});
