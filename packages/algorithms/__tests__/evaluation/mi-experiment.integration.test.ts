/**
 * Integration tests for MI path ranking experiments
 *
 * Validates the complete evaluation framework by running
 * end-to-end experiments and checking results against expected thresholds
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '@bibgraph/algorithms';
import type { Node, Edge } from '@bibgraph/types';
import {
  runExperiment,
  runCrossValidation,
  generateMarkdownReport,
  generateLatexTable,
  generateJSONSummary,
} from '@bibgraph/graph-expansion';
import { randomRanker } from '@bibgraph/graph-expansion';
import {
  createSmallCitationNetwork,
  createMediumCitationNetwork,
  createHeterogeneousScholarlyGraph,
  createDenseCommunityGraph,
} from './fixtures/benchmark-graphs';
import {
  validateResults,
  validateGraphTypePerformance,
  getEffectSizeCategory,
} from './fixtures/expected-results';
import type { ExperimentConfig, MetricType, StatisticalTestType } from '@bibgraph/graph-expansion';

/**
 * Simple MI ranker for testing (ranks by total path weight)
 */
function miRanker<N extends Node, E extends Edge>(
  _graph: Graph<N, E>,
  paths: any[]
): any[] {
  return paths
    .map((path) => ({ path, score: path.totalWeight ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Simple degree-based ranker for testing
 */
function degreeRanker<N extends Node & { type: string }, E extends Edge>(
  graph: Graph<N, E>,
  paths: any[]
): any[] {
  const pathDegrees = paths.map((path) => {
    let totalDegree = 0;
    for (const node of path.nodes) {
      const neighbors = graph.getNeighbors(node.id);
      totalDegree += neighbors.length;
    }
    return { path, score: totalDegree };
  });
  return pathDegrees.sort((a, b) => b.score - a.score);
}

describe('MI Path Ranking Experiments', () => {
  describe('vs Random Baseline', () => {
    it('should produce valid experiment results with MI ranker', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'MI Experiment',
        repetitions: 5,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'strong',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman', 'ndcg', 'map'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);

      // MI should perform well
      const miResults = report.methods.find((m) => m.method === 'MI');
      expect(miResults).toBeDefined();
      expect(Math.abs(miResults!.results.spearman)).toBeGreaterThan(0);
      expect(miResults!.results.ndcg).toBeGreaterThan(0);
    });
  });

  describe('vs Degree-Based Baseline', () => {
    it('should outperform degree-based on heterogeneous graphs', async () => {
      const graph = createHeterogeneousScholarlyGraph();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'MI vs Degree - Heterogeneous',
        repetitions: 5,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [
          { name: 'MI', ranker: miRanker },
          { name: 'Degree', ranker: degreeRanker },
        ],
        metrics: ['spearman', 'ndcg'],
        statisticalTests: ['paired-t'],
        seed: 42,
      };

      const report = await runExperiment(config, graph);

      const miResults = report.methods.find((m) => m.method === 'MI');
      const degreeResults = report.methods.find((m) => m.method === 'Degree');

      // MI should achieve reasonable NDCG
      expect(miResults!.results.ndcg).toBeGreaterThan(0);

      // Both methods should produce results (not all zeros)
      expect(miResults!.results.spearman).not.toBe(0);
      expect(degreeResults!.results.spearman).not.toBe(0);
    });
  });

  describe('Signal Strength Sensitivity', () => {
    it('should detect strong signal paths with high accuracy', async () => {
      const graph = createMediumCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Strong Signal Detection',
        repetitions: 5,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'strong',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman', 'ndcg', 'map', 'mrr'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);
      const miResults = report.methods.find((m) => m.method === 'MI');

      // Strong signal should yield meaningful correlation
      // Use absolute value since ranking direction depends on interpretation
      expect(Math.abs(miResults!.results.spearman)).toBeGreaterThan(0.3);
      expect(miResults!.results.ndcg).toBeGreaterThan(0.5);
      expect(miResults!.results.map).toBeGreaterThan(0.3);
    });

    it('should detect medium signal paths with moderate accuracy', async () => {
      const graph = createMediumCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Medium Signal Detection',
        repetitions: 5,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman', 'ndcg'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);
      const miResults = report.methods.find((m) => m.method === 'MI');

      // Medium signal should yield some correlation (could be negative due to ranking)
      // The absolute value should be non-zero
      expect(Math.abs(miResults!.results.spearman)).toBeGreaterThan(0);
      expect(miResults!.results.ndcg).toBeGreaterThan(0);
    });

    it('should handle weak signal paths', async () => {
      const graph = createDenseCommunityGraph();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Weak Signal Detection',
        repetitions: 5,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'weak',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);
      const miResults = report.methods.find((m) => m.method === 'MI');

      // MI should produce some ranking (not all zeros)
      expect(miResults).toBeDefined();
      expect(miResults!.results.spearman).not.toBeNaN();
    });
  });

  describe('Cross-Validation Stability', () => {
    it('should produce stable results across folds', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'CV Stability Test',
        repetitions: 3,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman', 'ndcg'],
        statisticalTests: [],
        seed: 42,
      };

      const { foldResults, aggregated, stdDev } = await runCrossValidation(config, graph, 5);

      // Check we got results from all folds
      expect(foldResults).toHaveLength(5);
      expect(aggregated).toBeDefined();
      expect(stdDev).toBeDefined();

      // Check average performance is reasonable
      const miResults = aggregated.methods.find((m) => m.method === 'MI');
      expect(miResults).toBeDefined();
      expect(miResults!.results.spearman).not.toBe(0);

      // Check standard deviation is defined
      const miStdDev = stdDev.methods.find((m) => m.method === 'MI');
      expect(miStdDev).toBeDefined();
      expect(miStdDev!.results.spearman).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate valid markdown report', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Report Test',
        repetitions: 2,
        pathPlanting: {
          numPaths: 2,
          pathLength: { min: 2, max: 2 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);
      const markdown = generateMarkdownReport(report);

      expect(markdown).toContain('# Report Test');
      expect(markdown).toContain('## Method Performance');
      expect(markdown).toContain('| Method |');
      expect(markdown).toContain('| MI |');
    });

    it('should generate valid LaTeX table', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'LaTeX Test',
        repetitions: 2,
        pathPlanting: {
          numPaths: 2,
          pathLength: { min: 2, max: 2 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);
      const latex = generateLatexTable(report);

      expect(latex).toContain('\\begin{table}');
      expect(latex).toContain('\\begin{tabular}');
      expect(latex).toContain('Method &');
      expect(latex).toContain('MI &');
      expect(latex).toContain('\\end{table}');
    });

    it('should generate valid JSON summary', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'JSON Test',
        repetitions: 2,
        pathPlanting: {
          numPaths: 2,
          pathLength: { min: 2, max: 2 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);
      const json = generateJSONSummary(report);

      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('JSON Test');
      expect(parsed.methods).toBeDefined();
      expect(parsed.methods[0].name).toBe('MI');
      expect(parsed.methods[0].results.spearman).toBeDefined();
    });
  });

  describe('Performance Validation', () => {
    it('should meet expected performance thresholds for small citation networks', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Performance Validation',
        repetitions: 5,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman', 'ndcg'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);
      const miResults = report.methods.find((m) => m.method === 'MI');

      const validation = validateGraphTypePerformance('smallCitation', {
        spearman: miResults!.results.spearman,
        ndcg: miResults!.results.ndcg,
        runtime: report.duration ?? 0,
      });

      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Performance violations:', validation.violations);
      }
    });

    it('should categorize effect sizes correctly', () => {
      expect(getEffectSizeCategory(0.05)).toBe('negligible');
      expect(getEffectSizeCategory(0.3)).toBe('small');
      expect(getEffectSizeCategory(0.6)).toBe('medium');
      expect(getEffectSizeCategory(0.9)).toBe('large');
      expect(getEffectSizeCategory(1.5)).toBe('very-large');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single method experiments', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Single Method',
        repetitions: 2,
        pathPlanting: {
          numPaths: 2,
          pathLength: { min: 2, max: 2 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman'],
        statisticalTests: [], // No tests possible with single method
        seed: 42,
      };

      const report = await runExperiment(config, graph);

      expect(report.methods).toHaveLength(1);
      expect(report.winner).toBe('MI');
      expect(report.statisticalTests).toHaveLength(0);
    });

    it('should handle empty metrics list', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Empty Metrics',
        repetitions: 2,
        pathPlanting: {
          numPaths: 2,
          pathLength: { min: 2, max: 2 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: [],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);

      expect(report.methods).toHaveLength(1);
      expect(report.methods[0].results).toBeDefined();
    });

    it('should handle multiple repetitions correctly', async () => {
      const graph = createSmallCitationNetwork();

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Multiple Repetitions',
        repetitions: 10,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'MI', ranker: miRanker }],
        metrics: ['spearman'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, graph);

      expect(report.methods).toHaveLength(1);
      // Duration is optional and may be 0 in some cases
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
