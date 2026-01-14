/**
 * Unit tests for Spectral Graph Partitioning algorithm.
 * Validates balanced partitions, minimized edge cuts, and constraint satisfaction.
 *
 * @module __tests__/partitioning/spectral.test
 */

import { describe, it, expect } from 'vitest';
import type { Partition } from '../../src/types/clustering-types';
import { smallCitationNetwork, largeCitationNetwork } from '../fixtures/citation-networks';
import { spectralPartition } from '../../src/partitioning/spectral';

describe('Spectral Graph Partitioning', () => {
  describe('User Story 2 - Scenario 1: Balanced Partitions', () => {
    it('should create balanced partitions with balance ratio < 1.2 for 100-node network', () => {
      // Given: Citation network with 100 papers
      const graph = smallCitationNetwork();
      const k = 4; // Divide into 4 partitions

      // When: Run spectral partitioning
      const startTime = performance.now();
      const result = spectralPartition(graph, k);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Partitions should be balanced
      expect(result.ok).toBe(true);

      if (result.ok) {
        const partitions = result.value;

        // Should have exactly k partitions
        expect(partitions.length).toBe(k);

        // Calculate balance metrics
        const totalNodes = graph.getNodeCount();
        const idealSize = totalNodes / k;
        const sizes = partitions.map(p => p.size);
        const maxSize = Math.max(...sizes);
        const minSize = Math.min(...sizes);
        const balanceRatio = maxSize / idealSize;

        // Balance ratio should be <= 1.2 (within 20% of ideal)
        expect(balanceRatio).toBeLessThanOrEqual(1.2);

        // All nodes should be assigned to exactly one partition
        const allAssignedNodes = new Set<string>();
        partitions.forEach((partition) => {
          partition.nodes.forEach((node) => {
            const nodeId = typeof node === 'string' ? node : node.id;
            expect(allAssignedNodes.has(nodeId)).toBe(false); // No overlaps
            allAssignedNodes.add(nodeId);
          });
        });

        expect(allAssignedNodes.size).toBe(totalNodes);

        // Should complete in reasonable time for small network
        expect(executionTime).toBeLessThan(5000); // < 5 seconds
      }
    });

    it('should produce non-overlapping partitions covering all nodes', () => {
      // Given: Citation network
      const graph = smallCitationNetwork();
      const k = 3;

      // When: Run spectral partitioning
      const result = spectralPartition(graph, k);

      // Then: All nodes should be assigned to exactly one partition
      expect(result.ok).toBe(true);

      if (result.ok) {
        const partitions = result.value;
        const allAssignedNodes = new Set<string>();

        partitions.forEach((partition) => {
          partition.nodes.forEach((node) => {
            const nodeId = typeof node === 'string' ? node : node.id;
            expect(allAssignedNodes.has(nodeId)).toBe(false); // No overlaps
            allAssignedNodes.add(nodeId);
          });
        });

        // All graph nodes should be assigned
        const totalNodes = graph.getNodeCount();
        expect(allAssignedNodes.size).toBe(totalNodes);
      }
    });
  });

  describe('User Story 2 - Scenario 2: Minimized Edge Cuts', () => {
    it('should minimize edge cuts between partitions', () => {
      // Given: Citation network with known community structure
      const graph = smallCitationNetwork();
      const k = 5; // Matches the 5 known communities

      // When: Run spectral partitioning
      const result = spectralPartition(graph, k);

      // Then: Edge cuts should be minimized
      expect(result.ok).toBe(true);

      if (result.ok) {
        const partitions = result.value;

        // Calculate total edge cuts
        let totalEdgeCuts = 0;
        partitions.forEach((partition) => {
          totalEdgeCuts += partition.edgeCuts;
        });

        // For well-structured network with 5 communities, edge cuts should be < 30% of total edges
        const totalEdges = graph.getEdgeCount();
        const cutRatio = totalEdgeCuts / totalEdges;

        expect(cutRatio).toBeLessThan(0.3);

        // Each partition should have metadata
        partitions.forEach((partition) => {
          expect(partition).toHaveProperty('id');
          expect(partition).toHaveProperty('nodes');
          expect(partition).toHaveProperty('size');
          expect(partition).toHaveProperty('edgeCuts');
          expect(partition).toHaveProperty('balance');

          expect(partition.nodes.size).toBeGreaterThan(0);
          expect(partition.size).toBe(partition.nodes.size);
        });
      }
    });
  });

  describe('User Story 2 - Scenario 3: Performance Requirement', () => {
    it('should complete in under 60 seconds for 500-node network', { timeout: 65000 }, () => {
      // Given: Large citation network with 1000 papers (we'll use subset logic)
      const fullGraph = largeCitationNetwork();
      expect(fullGraph.getNodeCount()).toBeGreaterThanOrEqual(500);

      const k = 8; // Partition into 8 groups

      // When: Run spectral partitioning
      const startTime = performance.now();
      const result = spectralPartition(fullGraph, k);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Algorithm completes in under 60 seconds
      expect(executionTime).toBeLessThan(60000); // 60 seconds

      // Verify algorithm produces valid results at scale
      expect(result.ok).toBe(true);

      if (result.ok) {
        const partitions = result.value;

        expect(partitions.length).toBe(k);

        // All nodes should be assigned
        const totalAssignedNodes = partitions.reduce(
          (sum, partition) => sum + partition.size,
          0
        );
        expect(totalAssignedNodes).toBe(fullGraph.getNodeCount());

        // Balance should still be maintained
        const totalNodes = fullGraph.getNodeCount();
        const idealSize = totalNodes / k;
        const sizes = partitions.map(p => p.size);
        const maxSize = Math.max(...sizes);
        const balanceRatio = maxSize / idealSize;

        // Allow slightly more imbalance for larger graphs
        expect(balanceRatio).toBeLessThan(1.5);
      }
    });
  });
});
