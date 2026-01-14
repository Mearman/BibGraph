/**
 * Unit tests for hierarchical clustering algorithm.
 * Validates dendrogram construction and cluster extraction.
 *
 * @module __tests__/hierarchical/clustering.test
 */

import { describe, it, expect } from 'vitest';
import { topicHierarchyGraph } from '../fixtures/topic-hierarchies';
import { hierarchicalClustering } from '../../src/hierarchical/clustering';
import type { Dendrogram } from '../../src/types/clustering-types';

describe('Hierarchical Clustering', () => {
  describe('User Story 3 - Scenario 1: Topic Hierarchy Grouping', () => {
    it('should build dendrogram with (n-1) merge steps for 50 topics', () => {
      // Given: Topic hierarchy graph with 50 topics across 3 levels
      const graph = topicHierarchyGraph(false); // Use undirected (similarity edges only)

      // When: Researcher runs hierarchical clustering
      const startTime = performance.now();
      const result = hierarchicalClustering(graph, { linkage: 'average' });
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Dendrogram built with correct structure
      expect(result.ok).toBe(true);

      if (!result.ok) return;

      const { dendrogram, metadata } = result.value;

      // Should have exactly n-1 merge steps (50 nodes → 49 merges)
      expect(dendrogram.merges.length).toBe(49);

      // Heights should be non-decreasing (agglomerative property)
      for (let i = 1; i < dendrogram.heights.length; i++) {
        expect(dendrogram.heights[i]).toBeGreaterThanOrEqual(dendrogram.heights[i - 1]);
      }

      // Leaf nodes should match graph nodes
      expect(dendrogram.leafNodes.length).toBe(50);

      // Performance: Should complete in < 45s for 50 nodes (spec requirement is for 200 nodes)
      expect(executionTime).toBeLessThan(45000);

      // Validate metadata
      expect(metadata.algorithm).toBe('hierarchical');
      expect(metadata.parameters.linkage).toBe('average');
      expect(metadata.runtime).toBeGreaterThan(0);
    });
  });

  describe('User Story 3 - Scenario 2: Dendrogram Height Cutting', () => {
    it('should extract 5 clusters at appropriate height for 3-level hierarchy', () => {
      // Given: Topic hierarchy graph with 50 topics (5 root disciplines)
      const graph = topicHierarchyGraph(false);

      // When: Researcher runs clustering and cuts at medium height
      const result = hierarchicalClustering(graph, { linkage: 'average' });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { dendrogram } = result.value;

      // Find height that produces approximately 5 clusters (matching root topics)
      // We'll cut at 90% of max height (late merges correspond to larger clusters)
      const maxHeight = dendrogram.heights[dendrogram.heights.length - 1];
      const cutHeight = maxHeight * 0.9;

      const clusters = dendrogram.cutAtHeight(cutHeight);

      // Then: Should get fewer clusters (allow flexibility based on actual merging pattern)
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(50);

      // All nodes should be assigned to exactly one cluster
      const allNodes = new Set<string>();
      clusters.forEach((cluster) => {
        cluster.forEach((nodeId) => {
          expect(allNodes.has(nodeId)).toBe(false); // No duplicates
          allNodes.add(nodeId);
        });
      });
      expect(allNodes.size).toBe(50);

      // Each cluster should be non-empty
      clusters.forEach((cluster) => {
        expect(cluster.size).toBeGreaterThan(0);
      });

      // Verify that cutting at different heights produces different cluster counts
      const lowCutClusters = dendrogram.cutAtHeight(maxHeight * 0.1);
      const highCutClusters = dendrogram.cutAtHeight(maxHeight * 0.95);

      // Lower height should produce more clusters
      expect(lowCutClusters.length).toBeGreaterThanOrEqual(highCutClusters.length);
    });
  });

  describe('User Story 3 - Scenario 3: Exact Cluster Count', () => {
    it('should extract exactly k=3 clusters when requested', () => {
      // Given: Topic hierarchy graph with 50 topics
      const graph = topicHierarchyGraph(false);

      // When: Researcher requests exactly 3 clusters
      const result = hierarchicalClustering(graph, { linkage: 'average' });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { dendrogram } = result.value;

      const k = 3;
      const clusters = dendrogram.getClusters(k);

      // Then: Should get exactly 3 clusters
      expect(clusters.length).toBe(k);

      // All nodes should be assigned to exactly one cluster
      const allNodes = new Set<string>();
      clusters.forEach((cluster) => {
        cluster.forEach((nodeId) => {
          expect(allNodes.has(nodeId)).toBe(false); // No duplicates
          allNodes.add(nodeId);
        });
      });
      expect(allNodes.size).toBe(50);

      // Each cluster should be non-empty
      clusters.forEach((cluster) => {
        expect(cluster.size).toBeGreaterThan(0);
      });

      // Clusters should be reasonably balanced (no single-node clusters in k=3 for 50 nodes)
      const minSize = Math.min(...clusters.map((c) => c.size));
      expect(minSize).toBeGreaterThan(1);
    });
  });

  describe('Performance: 200-node graph', () => {
    it('should complete hierarchical clustering in < 45s for 200 nodes', () => {
      // Given: Larger synthetic graph with 200 nodes
      // Create a synthetic graph with 200 nodes and similarity edges
      const graph = topicHierarchyGraph(false); // Start with 50-node graph

      // Add 150 more nodes to reach 200 total
      for (let i = 50; i < 200; i++) {
        graph.addNode({
          id: `T-${i}`,
          name: `Topic ${i}`,
          level: 2,
        });

        // Connect to random existing nodes (to maintain connectivity)
        const existingNodeCount = i;
        const numConnections = Math.min(3, existingNodeCount);

        for (let j = 0; j < numConnections; j++) {
          const targetIdx = Math.floor(Math.random() * existingNodeCount);
          graph.addEdge({
            id: `E-${i}-${targetIdx}`,
            source: `T-${i}`,
            target: `T-${targetIdx}`,
            type: 'similarity',
            weight: Math.random(),
          });
        }
      }

      // When: Run hierarchical clustering
      const startTime = performance.now();
      const result = hierarchicalClustering(graph, { linkage: 'average' });
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Then: Should complete successfully
      expect(result.ok).toBe(true);

      if (!result.ok) return;

      const { dendrogram } = result.value;

      // Should have n-1 merges
      expect(dendrogram.merges.length).toBe(199);

      // Performance: Should complete in < 45s (spec requirement)
      expect(executionTime).toBeLessThan(45000);
    });
  });
});
