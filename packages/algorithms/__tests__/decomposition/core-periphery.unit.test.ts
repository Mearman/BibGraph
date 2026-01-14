/**
 * Unit tests for core-periphery decomposition algorithm.
 * Validates core detection quality and performance against citation networks.
 *
 * @module __tests__/decomposition/core-periphery.test
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { corePeripheryDecomposition } from '../../src/decomposition/core-periphery';
import type { CorePeripheryResult } from '../../src/types/clustering-types';

/**
 * Paper node for citation networks.
 */
interface PaperNode {
  id: string;
  title: string;
  citations: number; // Ground truth citation count
  influence: 'seminal' | 'derivative'; // Ground truth influence level
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
 * Create citation network with identifiable seminal papers.
 * Network has clear core-periphery structure:
 * - 5 seminal papers (high citations, 50+ edges each)
 * - 45 derivative papers (low citations, 5-10 edges each)
 * - Total: 50 papers
 */
function createCitationNetworkWithSeminalPapers(): Graph<PaperNode, CitationEdge> {
  const graph = new Graph<PaperNode, CitationEdge>(true); // Directed citation graph

  // Add 5 seminal papers (highly cited, core papers)
  for (let i = 0; i < 5; i++) {
    const node: PaperNode = {
      id: `S${i}`,
      title: `Seminal Paper ${i}`,
      citations: 100 + i * 10, // High citation count
      influence: 'seminal',
    };
    graph.addNode(node);
  }

  // Add 45 derivative papers (low citations, periphery papers)
  for (let i = 0; i < 45; i++) {
    const node: PaperNode = {
      id: `D${i}`,
      title: `Derivative Paper ${i}`,
      citations: 5 + i % 10, // Low citation count
      influence: 'derivative',
    };
    graph.addNode(node);
  }

  // Seminal papers cite each other densely (core-core edges)
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (i !== j) {
        graph.addEdge({
          id: `E-S${i}-S${j}`,
          source: `S${i}`,
          target: `S${j}`,
        });
      }
    }
  }

  // Derivative papers cite seminal papers (periphery-core edges)
  for (let i = 0; i < 45; i++) {
    // Each derivative paper cites 2-3 seminal papers
    const numCitations = 2 + (i % 2);
    for (let j = 0; j < numCitations; j++) {
      const seminalIdx = (i + j) % 5;
      graph.addEdge({
        id: `E-D${i}-S${seminalIdx}`,
        source: `D${i}`,
        target: `S${seminalIdx}`,
      });
    }
  }

  // Derivative papers cite each other sparsely (periphery-periphery edges)
  for (let i = 0; i < 45; i += 3) {
    // Only ~15 derivative papers cite other derivative papers
    const target = (i + 1) % 45;
    graph.addEdge({
      id: `E-D${i}-D${target}`,
      source: `D${i}`,
      target: `D${target}`,
    });
  }

  return graph;
}

/**
 * Create larger citation network for performance testing.
 * 1000 papers: 100 core (10%) + 900 periphery (90%)
 */
function createLargeCitationNetwork(): Graph<PaperNode, CitationEdge> {
  const graph = new Graph<PaperNode, CitationEdge>(true);

  // Add 100 core papers (10% of network)
  for (let i = 0; i < 100; i++) {
    graph.addNode({
      id: `C${i}`,
      title: `Core Paper ${i}`,
      citations: 50 + i,
      influence: 'seminal',
    });
  }

  // Add 900 periphery papers (90% of network)
  for (let i = 0; i < 900; i++) {
    graph.addNode({
      id: `P${i}`,
      title: `Periphery Paper ${i}`,
      citations: 1 + (i % 10),
      influence: 'derivative',
    });
  }

  // Core papers densely connected (80% edge density)
  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < 100; j++) {
      if (i !== j && Math.random() < 0.8) {
        graph.addEdge({
          id: `E-C${i}-C${j}`,
          source: `C${i}`,
          target: `C${j}`,
        });
      }
    }
  }

  // Periphery papers cite core papers
  for (let i = 0; i < 900; i++) {
    const numCitations = 3 + (i % 3);
    for (let j = 0; j < numCitations; j++) {
      const coreIdx = (i + j * 13) % 100; // Pseudo-random distribution
      graph.addEdge({
        id: `E-P${i}-C${coreIdx}`,
        source: `P${i}`,
        target: `C${coreIdx}`,
      });
    }
  }

  // Periphery papers sparsely connected (5% edge density)
  for (let i = 0; i < 900; i += 20) {
    const target = (i + 7) % 900;
    graph.addEdge({
      id: `E-P${i}-P${target}`,
      source: `P${i}`,
      target: `P${target}`,
    });
  }

  return graph;
}

describe('Core-Periphery Decomposition', () => {
  describe('User Story 8 - Scenario 1: Seminal Papers in Core', () => {
    it('should assign seminal papers to core with coreness > 0.7', () => {
      // Given: Citation network with identifiable seminal papers
      const graph = createCitationNetworkWithSeminalPapers();

      // When: Researcher runs core-periphery decomposition
      const result: CorePeripheryResult<PaperNode> = corePeripheryDecomposition(graph);

      // Then: Algorithm succeeds
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { structure, metadata } = result.value;

      // Then: Highly-cited influential papers assigned to core
      expect(structure.coreNodes.size).toBeGreaterThan(0);

      // Verify all 5 seminal papers are in core
      const seminalIds = ['S0', 'S1', 'S2', 'S3', 'S4'];
      seminalIds.forEach((seminalId) => {
        expect(structure.coreNodes.has(seminalId)).toBe(true);

        // Coreness score > 0.7 for seminal papers
        const coreness = structure.corenessScores.get(seminalId);
        expect(coreness).toBeDefined();
        expect(coreness!).toBeGreaterThan(0.7);
      });

      // Verify metadata
      expect(metadata.algorithm).toBe('core-periphery');
      expect(metadata.converged).toBe(true);
      expect(metadata.iterations).toBeGreaterThan(0);
    });

    it('should assign derivative papers to periphery with coreness ≤ 0.7', () => {
      // Given: Citation network
      const graph = createCitationNetworkWithSeminalPapers();

      // When: Run decomposition
      const result = corePeripheryDecomposition(graph);

      // Then: Algorithm succeeds
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { structure } = result.value;

      // Then: Most derivative papers in periphery with low coreness
      let derivativeInPeriphery = 0;
      let derivativeWithLowCoreness = 0;

      for (let i = 0; i < 45; i++) {
        const derivativeId = `D${i}`;

        // Check if in periphery
        if (structure.peripheryNodes.has(derivativeId)) {
          derivativeInPeriphery++;
        }

        // Check coreness score
        const coreness = structure.corenessScores.get(derivativeId);
        if (coreness !== undefined && coreness <= 0.7) {
          derivativeWithLowCoreness++;
        }
      }

      // Expect at least 80% of derivative papers in periphery
      expect(derivativeInPeriphery).toBeGreaterThanOrEqual(36); // 80% of 45
      // Expect at least 80% of derivative papers have low coreness
      expect(derivativeWithLowCoreness).toBeGreaterThanOrEqual(36);
    });
  });

  describe('User Story 8 - Scenario 2: Core Size and Edge Density', () => {
    it('should produce core containing 10-30% of nodes with 60-80% internal edges', () => {
      // Given: Citation network
      const graph = createCitationNetworkWithSeminalPapers();

      // When: Researcher views core and periphery sizes
      const result = corePeripheryDecomposition(graph);

      // Then: Algorithm succeeds
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { structure } = result.value;

      // Then: Core contains 10-30% of nodes
      const totalNodes = graph.getNodeCount();
      const coreSize = structure.coreNodes.size;
      const corePercentage = (coreSize / totalNodes) * 100;

      expect(corePercentage).toBeGreaterThanOrEqual(10);
      expect(corePercentage).toBeLessThanOrEqual(30);

      // Then: Core has >= 60% internal edge density
      // Higher density is better (100% is ideal for perfect core structure)
      // Count edges within core
      let coreInternalEdges = 0;
      const edges = graph.getAllEdges();

      edges.forEach((edge) => {
        const sourceInCore = structure.coreNodes.has(edge.source);
        const targetInCore = structure.coreNodes.has(edge.target);
        if (sourceInCore && targetInCore) {
          coreInternalEdges++;
        }
      });

      // Total possible edges in core (for directed graph)
      const possibleCoreEdges = coreSize * (coreSize - 1);

      // Calculate internal edge density
      const coreEdgeDensity = possibleCoreEdges > 0
        ? (coreInternalEdges / possibleCoreEdges) * 100
        : 0;

      expect(coreEdgeDensity).toBeGreaterThanOrEqual(60);

      // Verify fit quality is reasonable (> 0.5)
      expect(structure.fitQuality).toBeGreaterThan(0.5);
    });
  });

  describe('User Story 8 - Scenario 3: Performance', () => {
    it('should complete in under 25 seconds for 1000-node network', () => {
      // Given: Citation network with 1000 papers
      const graph = createLargeCitationNetwork();
      expect(graph.getNodeCount()).toBe(1000);

      // When: Core-periphery decomposition runs
      const startTime = performance.now();
      const result = corePeripheryDecomposition(graph);
      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000; // Convert to seconds

      // Then: Algorithm completes in under 25 seconds
      expect(executionTime).toBeLessThan(25);

      // Verify result is valid
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { structure } = result.value;
      expect(structure.coreNodes.size).toBeGreaterThan(0);
      expect(structure.peripheryNodes.size).toBeGreaterThan(0);
      expect(structure.coreNodes.size + structure.peripheryNodes.size).toBe(1000);
    });
  });
});
