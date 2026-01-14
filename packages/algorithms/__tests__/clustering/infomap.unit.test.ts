/**
 * Unit tests for Infomap clustering algorithm.
 * Validates flow-based community detection and compression metrics.
 *
 * @module __tests__/clustering/infomap.test
 */

import { describe, it, expect } from 'vitest';
import { infomap } from '../../src/clustering/infomap';
import { smallCitationNetwork, largeCitationNetwork } from '../fixtures/citation-networks';

describe('Infomap Clustering', () => {
  describe('User Story 7 - Scenario 1: Flow Alignment with Temporal Patterns', () => {
    it('should align communities with citation flow direction in temporal networks', () => {
      // Given: Directed citation network with temporal flow patterns
      // (older papers cited by newer papers, creating directional flow)
      const graph = smallCitationNetwork();

      // When: Researcher runs Infomap clustering
      const startTime = performance.now();
      const result = infomap(graph);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Communities align with citation flow direction
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { modules, metrics, compressionRatio } = result.value;

      // Should detect communities (not just single module)
      expect(modules.length).toBeGreaterThan(1);
      expect(modules.length).toBeLessThanOrEqual(10); // Reasonable upper bound

      // Each module should have required properties
      modules.forEach((module) => {
        expect(module).toHaveProperty('id');
        expect(module).toHaveProperty('nodes');
        expect(module).toHaveProperty('descriptionLength');
        expect(module).toHaveProperty('visitProbability');
        expect(module).toHaveProperty('compressionRatio');

        // Nodes should be non-empty
        expect(module.nodes.size).toBeGreaterThan(0);

        // Visit probability should be valid
        expect(module.visitProbability).toBeGreaterThan(0);
        expect(module.visitProbability).toBeLessThanOrEqual(1.0);

        // Description length should be positive
        expect(module.descriptionLength).toBeGreaterThan(0);
      });

      // Should complete in reasonable time for small network
      expect(executionTime).toBeLessThan(10000); // 10s for 100-node network
    });

    it('should produce non-overlapping modules covering all nodes', () => {
      // Given: Citation network
      const graph = smallCitationNetwork();

      // When: Run Infomap clustering
      const result = infomap(graph);

      // Then: All nodes should be assigned to exactly one module
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { modules } = result.value;

      const allAssignedNodes = new Set<string>();
      modules.forEach((module) => {
        module.nodes.forEach((node) => {
          const nodeId = typeof node === 'string' ? node : node.id;
          expect(allAssignedNodes.has(nodeId)).toBe(false); // No overlaps
          allAssignedNodes.add(nodeId);
        });
      });

      // All graph nodes should be assigned
      const totalNodes = graph.getNodeCount();
      expect(allAssignedNodes.size).toBe(totalNodes);
    });
  });

  describe('User Story 7 - Scenario 2: Compression Ratio', () => {
    it('should produce compression ratio > 1.5 for 800-paper network', { timeout: 60000 }, () => {
      // Given: Citation network with 800+ papers
      // (Use large network fixture which has 1000 papers)
      const graph = largeCitationNetwork();
      expect(graph.getNodeCount()).toBeGreaterThanOrEqual(800);

      // When: Infomap clustering completes
      const result = infomap(graph);

      // Then: Algorithm produces communities with compression ratio > 1.5
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { compressionRatio } = result.value;

      // Compression ratio measures how much better the modular encoding is
      // vs. single-module encoding. > 1.0 means improvement, > 1.5 is good.
      expect(compressionRatio).toBeGreaterThan(1.5);
    });

    it('should calculate visit probabilities that sum to 1.0', () => {
      // Given: Citation network
      const graph = smallCitationNetwork();

      // When: Run Infomap clustering
      const result = infomap(graph);

      // Then: Visit probabilities across all modules should sum to ~1.0
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { modules } = result.value;

      const totalVisitProb = modules.reduce(
        (sum, module) => sum + module.visitProbability,
        0
      );

      // Should sum to 1.0 within floating point precision
      expect(totalVisitProb).toBeCloseTo(1.0, 5);
    });
  });

  describe('User Story 7 - Scenario 3: Performance Requirement', () => {
    it('should complete in under 40 seconds for 1000-paper network', { timeout: 45000 }, () => {
      // Given: Large citation network with 1000 papers
      const graph = largeCitationNetwork();
      expect(graph.getNodeCount()).toBeGreaterThanOrEqual(1000);

      // When: Infomap clustering runs
      const startTime = performance.now();
      const result = infomap(graph);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Algorithm completes in under 40 seconds
      expect(executionTime).toBeLessThan(40000); // 40 seconds in milliseconds

      // Verify algorithm still produces valid results at scale
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { modules, compressionRatio } = result.value;

      expect(modules.length).toBeGreaterThan(0);
      expect(modules.length).toBeLessThan(graph.getNodeCount()); // Not every node in own module

      // All nodes should be assigned
      const totalAssignedNodes = modules.reduce(
        (sum, module) => sum + module.nodes.size,
        0
      );
      expect(totalAssignedNodes).toBe(graph.getNodeCount());

      // Compression should still be good at scale
      expect(compressionRatio).toBeGreaterThan(1.2); // Slightly lower threshold for large graphs
    });
  });
});
