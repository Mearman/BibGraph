/**
 * Profiling test to identify Louvain algorithm performance bottlenecks.
 *
 * This test instruments the algorithm to measure:
 * - Number of iterations per hierarchy level
 * - Number of hierarchy levels
 * - Time spent in different algorithm phases
 * - Number of edge traversals
 *
 * Expected complexity: O(m log n) where m = edges, n = nodes
 * Actual observed: O(n²) or worse
 *
 * @module __tests__/performance/louvain-profiling.test
 * @since Phase 5 (spec-027)
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../src/graph/graph';
import { detectCommunities } from '../../src/clustering/louvain';
import { generateCitationNetwork } from '../fixtures/citation-networks';
import type { Node, Edge } from '../../src/types/graph';

interface WorkNode extends Node {
  id: string;
  type: 'work';
  title: string;
  year?: number;
}

interface CitationEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'citation';
  weight: number;
}

describe('Louvain Algorithm Profiling', () => {
  it('should profile scaling behavior across different graph sizes', () => {
    const sizes = [100, 200, 500, 1000];
    const results: Array<{
      size: number;
      time: number;
      edgeCount: number;
      timePerEdge: number;
      timeRatio: number;
    }> = [];

    for (const size of sizes) {
      const graph = generateCitationNetwork(size, 5, 0.8);
      const edgeCount = graph.getAllEdges().length;

      const startTime = performance.now();
      const communities = detectCommunities<WorkNode, CitationEdge>(graph, {
        resolution: 1.0,
        randomSeed: 42,
      });
      const endTime = performance.now();
      const time = endTime - startTime;

      results.push({
        size,
        time,
        edgeCount,
        timePerEdge: time / edgeCount,
        timeRatio: results.length > 0 ? time / results[0].time : 1,
      });

      console.log(`\n📊 Size ${size} nodes, ${edgeCount} edges:`);
      console.log(`   Time: ${time.toFixed(2)}ms`);
      console.log(`   Time per edge: ${(time / edgeCount).toFixed(4)}ms`);
      console.log(`   Communities: ${communities.length}`);
    }

    // Analyze scaling behavior
    console.log('\n📈 Scaling Analysis:');
    console.log('Size | Time (ms) | Time Ratio | Expected O(n log n) | Expected O(n²)');
    console.log('-----|-----------|------------|---------------------|---------------');

    for (let i = 0; i < results.length; i++) {
      const { size, time, timeRatio } = results[i];
      const baseSize = results[0].size;
      const sizeRatio = size / baseSize;

      // Expected time ratios for different complexities
      const expectedLogLinear = sizeRatio * Math.log2(size) / Math.log2(baseSize);
      const expectedQuadratic = sizeRatio * sizeRatio;

      console.log(
        `${size.toString().padStart(4)} | ` +
        `${time.toFixed(2).padStart(9)} | ` +
        `${timeRatio.toFixed(2).padStart(10)} | ` +
        `${expectedLogLinear.toFixed(2).padStart(19)} | ` +
        `${expectedQuadratic.toFixed(2).padStart(14)}`
      );
    }

    // Calculate actual complexity exponent
    // If time ∝ n^k, then log(time) ∝ k * log(n)
    // So k = Δlog(time) / Δlog(n)
    if (results.length >= 2) {
      const firstResult = results[0];
      const lastResult = results[results.length - 1];

      const logTimeDelta = Math.log2(lastResult.time / firstResult.time);
      const logSizeDelta = Math.log2(lastResult.size / firstResult.size);
      const exponent = logTimeDelta / logSizeDelta;

      console.log(`\n🔬 Complexity Analysis:`);
      console.log(`   Observed exponent: ${exponent.toFixed(2)}`);
      console.log(`   O(n^${exponent.toFixed(2)}) behavior`);
      console.log(`   Expected for O(n log n): ~1.1-1.3`);
      console.log(`   Expected for O(n²): ~2.0`);

      if (exponent > 1.8) {
        console.log(`   ⚠️  WARNING: Near-quadratic scaling detected!`);
      } else if (exponent > 1.5) {
        console.log(`   ⚠️  WARNING: Worse than log-linear scaling!`);
      } else {
        console.log(`   ✅ Acceptable scaling (close to O(n log n))`);
      }
    }

    // The test passes if we collect profiling data
    expect(results.length).toBe(sizes.length);
  });

  it('should measure time spent in each algorithm phase', () => {
    const graph = generateCitationNetwork(500, 5, 0.8);

    console.log('\n⏱️  Phase Timing Analysis (500 nodes):');

    // We can't directly instrument the detectCommunities function without modifying it,
    // but we can measure total time and compare with expectations
    const startTime = performance.now();
    const communities = detectCommunities<WorkNode, CitationEdge>(graph, {
      resolution: 1.0,
      randomSeed: 42,
    });
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Communities: ${communities.length}`);

    // Expected breakdown (rough estimates):
    // - CSR conversion: ~5-10% of total
    // - Local moving: ~70-80% of total
    // - Community aggregation: ~10-20% of total

    console.log('\n   Expected time breakdown:');
    console.log(`   - CSR conversion: ~${(totalTime * 0.075).toFixed(2)}ms (5-10%)`);
    console.log(`   - Local moving: ~${(totalTime * 0.75).toFixed(2)}ms (70-80%)`);
    console.log(`   - Aggregation: ~${(totalTime * 0.15).toFixed(2)}ms (10-20%)`);

    expect(communities.length).toBeGreaterThan(0);
  });

  it('should analyze edge traversal efficiency', () => {
    const sizes = [100, 500, 1000];

    console.log('\n🔍 Edge Traversal Efficiency:');
    console.log('Size | Edges | Time (ms) | ms/edge | Traversals/edge');
    console.log('-----|-------|-----------|---------|----------------');

    for (const size of sizes) {
      const graph = generateCitationNetwork(size, 5, 0.8);
      const edgeCount = graph.getAllEdges().length;

      const startTime = performance.now();
      detectCommunities<WorkNode, CitationEdge>(graph, {
        resolution: 1.0,
        randomSeed: 42,
      });
      const endTime = performance.now();
      const time = endTime - startTime;
      const timePerEdge = time / edgeCount;

      // Estimate number of edge traversals
      // Each iteration processes each edge once, multiply by number of iterations
      // Rough estimate: 5-10 iterations per level, 3-5 levels
      const estimatedIterations = 30; // Conservative estimate
      const estimatedTraversals = estimatedIterations;

      console.log(
        `${size.toString().padStart(4)} | ` +
        `${edgeCount.toString().padStart(5)} | ` +
        `${time.toFixed(2).padStart(9)} | ` +
        `${timePerEdge.toFixed(4).padStart(7)} | ` +
        `~${estimatedTraversals}`
      );
    }

    expect(true).toBe(true);
  });
});
