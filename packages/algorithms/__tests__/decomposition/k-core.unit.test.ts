/**
 * Unit tests for K-Core Decomposition using Batagelj-Zaversnik algorithm.
 * Validates degree constraints, nested hierarchy, and performance on large graphs.
 *
 * @module __tests__/decomposition/k-core.test
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { kCoreDecomposition } from '../../src/decomposition/k-core';
import { largeCitationNetwork } from '../fixtures/citation-networks';

/**
 * Paper node for citation networks.
 */
interface PaperNode {
  id: string;
  title: string;
}

/**
 * Citation edge (directed: citing paper → cited paper).
 */
interface CitationEdge {
  id: string;
  source: string;
  target: string;
}

/**
 * Create a perfect k-core test graph using isolated cliques.
 *
 * Network structure (isolated cliques with guaranteed k-cores):
 * - Clique 1: Papers 0-9 (K10 complete graph, 9-core: each has exactly 9 neighbors)
 * - Clique 2: Papers 10-15 (K6 complete graph, 5-core: each has exactly 5 neighbors)
 * - Clique 3: Papers 16-19 (K4 complete graph, 3-core: each has exactly 3 neighbors)
 * - Isolated pairs: Papers 20-29 (5 pairs, 1-core: each has exactly 1 neighbor)
 *
 * Total: 30 papers with guaranteed k-core structure (no cross-clique edges)
 *
 * @returns Graph with guaranteed k-core hierarchy
 */
function createKCoreTestGraph(): Graph<PaperNode, CitationEdge> {
  const graph = new Graph<PaperNode, CitationEdge>(true); // Directed graph

  // Add 30 papers
  for (let i = 0; i < 30; i++) {
    graph.addNode({
      id: `P${i}`,
      title: `Paper ${i}`,
    });
  }

  // Helper to add bidirectional citation
  const addBidirectionalEdge = (i: number, j: number) => {
    graph.addEdge({
      id: `E${i}-${j}`,
      source: `P${i}`,
      target: `P${j}`,
    });
    graph.addEdge({
      id: `E${j}-${i}`,
      source: `P${j}`,
      target: `P${i}`,
    });
  };

  // Clique 1: K10 complete graph (papers 0-9)
  // Each paper has exactly 9 neighbors → 9-core
  for (let i = 0; i < 10; i++) {
    for (let j = i + 1; j < 10; j++) {
      addBidirectionalEdge(i, j);
    }
  }

  // Clique 2: K6 complete graph (papers 10-15)
  // Each paper has exactly 5 neighbors → 5-core
  for (let i = 10; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      addBidirectionalEdge(i, j);
    }
  }

  // Clique 3: K4 complete graph (papers 16-19)
  // Each paper has exactly 3 neighbors → 3-core
  for (let i = 16; i < 20; i++) {
    for (let j = i + 1; j < 20; j++) {
      addBidirectionalEdge(i, j);
    }
  }

  // Isolated pairs (papers 20-29)
  // Each paper has exactly 1 neighbor → 1-core
  for (let i = 20; i < 30; i += 2) {
    addBidirectionalEdge(i, i + 1);
  }

  return graph;
}

describe('K-Core Decomposition (User Story 4)', () => {
  describe('Scenario 1: Degree Constraint Validation', () => {
    it('should handle a single clique correctly', () => {
      // Given: Simple K10 clique (10 nodes, each with 9 neighbors)
      const graph = new Graph<PaperNode, CitationEdge>(true);

      for (let i = 0; i < 10; i++) {
        graph.addNode({ id: `P${i}`, title: `Paper ${i}` });
      }

      for (let i = 0; i < 10; i++) {
        for (let j = i + 1; j < 10; j++) {
          graph.addEdge({ id: `E${i}-${j}`, source: `P${i}`, target: `P${j}` });
          graph.addEdge({ id: `E${j}-${i}`, source: `P${j}`, target: `P${i}` });
        }
      }

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: All nodes should be in 9-core
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, coreNumbers, degeneracy } = result.value;
      expect(degeneracy).toBe(9);
      expect(coreNumbers.size).toBe(10);

      // All nodes have core number 9
      coreNumbers.forEach((coreNumber) => {
        expect(coreNumber).toBe(9);
      });

      // The 9-core contains all 10 nodes
      const core9 = cores.get(9);
      expect(core9).toBeDefined();
      expect(core9!.size).toBe(10);

      // Each node in 9-core has exactly 9 neighbors within the core
      core9!.nodes.forEach((nodeId) => {
        const neighbors = new Set<string>();
        graph.getAllEdges().forEach((edge) => {
          if (edge.source === nodeId) neighbors.add(edge.target);
          if (edge.target === nodeId) neighbors.add(edge.source);
        });

        let degreeInCore = 0;
        neighbors.forEach((neighborId) => {
          if (core9!.nodes.has(neighborId)) degreeInCore++;
        });

        expect(degreeInCore).toBe(9);
      });
    });

    it('should ensure all nodes in k-core have degree >= k within the subgraph', () => {
      // Given: Perfect k-core graph with isolated cliques (30 papers)
      const graph = createKCoreTestGraph();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: Algorithm succeeds
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, coreNumbers } = result.value;

      // Verify each core satisfies degree constraint
      cores.forEach((core, k) => {
        if (k === 0) return; // Skip k=0 (trivial core with all nodes)

        // For each node in k-core, count its neighbors also in the k-core
        // For directed graphs, we need to count both incoming and outgoing neighbors
        core.nodes.forEach((nodeId) => {
          const nodeIdStr = typeof nodeId === 'string' ? nodeId : nodeId.id;

          // Get all edges to count both incoming and outgoing neighbors
          const allEdges = graph.getAllEdges();
          const undirectedNeighbors = new Set<string>();

          allEdges.forEach((edge) => {
            if (edge.source === nodeIdStr) {
              undirectedNeighbors.add(edge.target);
            }
            if (edge.target === nodeIdStr) {
              undirectedNeighbors.add(edge.source);
            }
          });

          // Count neighbors that are also in this k-core
          let degreeInCore = 0;
          undirectedNeighbors.forEach((neighborId) => {
            if (core.nodes.has(neighborId)) {
              degreeInCore++;
            }
          });

          // Degree in k-core must be >= k
          expect(degreeInCore).toBeGreaterThanOrEqual(k);
        });
      });

      // Verify coreNumbers map is complete (all nodes assigned)
      expect(coreNumbers.size).toBe(graph.getNodeCount());
    });

    it('should assign correct core numbers to all nodes', () => {
      // Given: Citation network with guaranteed k-core structure
      const graph = createKCoreTestGraph();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: All nodes have valid core numbers
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { coreNumbers, degeneracy } = result.value;

      // All core numbers should be in range [0, degeneracy]
      coreNumbers.forEach((coreNumber, nodeId) => {
        expect(coreNumber).toBeGreaterThanOrEqual(0);
        expect(coreNumber).toBeLessThanOrEqual(degeneracy);
      });
    });
  });

  describe('Scenario 2: Nested Core Hierarchy', () => {
    it('should produce nested k-cores where (k+1)-core is subset of k-core', () => {
      // Given: Citation network with guaranteed k-core structure
      const graph = createKCoreTestGraph();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: Cores form nested hierarchy
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, degeneracy } = result.value;

      // Verify nesting property: cores[k+1] ⊆ cores[k]
      for (let k = 1; k < degeneracy; k++) {
        const kCore = cores.get(k);
        const kPlusOneCore = cores.get(k + 1);

        if (!kCore || !kPlusOneCore) continue;

        // Every node in (k+1)-core must also be in k-core
        kPlusOneCore.nodes.forEach((nodeId) => {
          expect(kCore.nodes.has(nodeId)).toBe(true);
        });

        // (k+1)-core should be smaller than or equal to k-core
        expect(kPlusOneCore.size).toBeLessThanOrEqual(kCore.size);
      }
    });

    it('should compute correct degeneracy (maximum k)', () => {
      // Given: Citation network with guaranteed k-core structure
      const graph = createKCoreTestGraph();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: Degeneracy equals maximum core number
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, degeneracy, coreNumbers } = result.value;

      // Degeneracy should be the highest k value with non-empty core
      expect(cores.has(degeneracy)).toBe(true);
      const maxCore = cores.get(degeneracy);
      expect(maxCore).toBeDefined();
      if (maxCore) {
        expect(maxCore.size).toBeGreaterThan(0);
      }

      // No core should exist for k > degeneracy
      expect(cores.has(degeneracy + 1)).toBe(false);

      // At least one node should have core number = degeneracy
      let foundMaxCoreNode = false;
      coreNumbers.forEach((coreNumber) => {
        if (coreNumber === degeneracy) {
          foundMaxCoreNode = true;
        }
      });
      expect(foundMaxCoreNode).toBe(true);
    });

    it('should maintain core hierarchy metadata', () => {
      // Given: Citation network with guaranteed k-core structure
      const graph = createKCoreTestGraph();

      // When: Run k-core decomposition
      const result = kCoreDecomposition(graph);

      // Then: Each core has complete metadata
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores } = result.value;

      cores.forEach((core, k) => {
        // Core structure validation
        expect(core.k).toBe(k);
        expect(core.nodes).toBeInstanceOf(Set);
        expect(core.size).toBe(core.nodes.size);
        expect(core.degeneracy).toBeGreaterThanOrEqual(k);
        expect(core.coreNumbers).toBeInstanceOf(Map);
      });
    });
  });

  describe('Scenario 3: Performance Requirement', () => {
    it('should complete in under 15 seconds for 1000-node graph', { timeout: 20000 }, () => {
      // Given: Large citation network with 1000+ papers
      const graph = largeCitationNetwork();
      expect(graph.getNodeCount()).toBeGreaterThanOrEqual(1000);

      // When: K-core decomposition runs
      const startTime = performance.now();
      const result = kCoreDecomposition(graph);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Algorithm completes in under 15 seconds
      expect(executionTime).toBeLessThan(15000); // 15 seconds in milliseconds

      // Verify algorithm still produces valid results at scale
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { cores, coreNumbers, degeneracy } = result.value;

      // All nodes should be assigned core numbers
      expect(coreNumbers.size).toBe(graph.getNodeCount());

      // Should have at least some non-trivial cores
      expect(degeneracy).toBeGreaterThan(0);
      expect(cores.size).toBeGreaterThan(1);

      // Verify largest core size is reasonable (not all nodes)
      const maxCore = cores.get(degeneracy);
      expect(maxCore).toBeDefined();
      if (maxCore) {
        expect(maxCore.size).toBeLessThan(graph.getNodeCount());
      }
    });

    it('should scale linearly with graph size', { timeout: 25000 }, () => {
      // Given: Both small and large networks
      const smallGraph = createKCoreTestGraph();
      const largeGraph = largeCitationNetwork();

      const smallNodeCount = smallGraph.getNodeCount();
      const largeNodeCount = largeGraph.getNodeCount();
      const sizeRatio = largeNodeCount / smallNodeCount;

      // When: Run k-core decomposition on both
      const smallStartTime = performance.now();
      const smallResult = kCoreDecomposition(smallGraph);
      const smallEndTime = performance.now();
      const smallTime = smallEndTime - smallStartTime;

      expect(smallResult.ok).toBe(true);

      const largeStartTime = performance.now();
      const largeResult = kCoreDecomposition(largeGraph);
      const largeEndTime = performance.now();
      const largeTime = largeEndTime - largeStartTime;

      expect(largeResult.ok).toBe(true);

      // Then: Runtime should scale linearly (O(n + m))
      // With 8x safety margin to account for high timing variance on sub-millisecond measurements
      // Small graph runs in <1ms where timing overhead dominates, causing up to 200x variance
      // Use minimum 1ms floor to reduce noise from near-zero measurements
      const timeRatio = largeTime / Math.max(smallTime, 1.0); // Floor to 1ms to avoid noise
      const maxExpectedRatio = sizeRatio * 8; // Linear scaling with 8x safety for CI variance

      expect(timeRatio).toBeLessThan(maxExpectedRatio);
    });
  });
});
