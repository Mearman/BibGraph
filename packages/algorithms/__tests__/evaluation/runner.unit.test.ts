/**
 * Unit tests for experiment runner infrastructure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '@bibgraph/algorithms';
import type { Node, Edge } from '@bibgraph/types';
import type { Path } from '@bibgraph/algorithms';
import {
  runExperiment,
  runCrossValidation,
} from '@bibgraph/graph-expansion';
import {
  generateMarkdownReport,
  generateLatexTable,
  generateJSONSummary,
  generateHTMLReport,
} from '@bibgraph/graph-expansion';
import type {
  ExperimentConfig,
  MethodConfig,
  MetricType,
} from '@bibgraph/graph-expansion';
import type { ExperimentReport } from '@bibgraph/graph-expansion';

describe('Experiment Runner', () => {
  let testGraph: Graph<Node & { type: string }, Edge & { source: string; target: string }>;

  beforeEach(() => {
    // Create simple test graph
    testGraph = new Graph();
    testGraph.addNode({ id: 'n1', type: 'test' });
    testGraph.addNode({ id: 'n2', type: 'test' });
    testGraph.addNode({ id: 'n3', type: 'test' });
    testGraph.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
    testGraph.addEdge({ id: 'e2', source: 'n2', target: 'n3' });
  });

  describe('runExperiment', () => {
    it('should run a simple experiment with two methods', async () => {
      const mockRanker = (_graph: typeof testGraph, paths: Path<Node, Edge>[]) => {
        return paths.map((path) => ({ path, score: path.totalWeight ?? 0 }));
      };

      const randomRanker = (_graph: typeof testGraph, paths: Path<Node, Edge>[]) => {
        return paths.map((path) => ({ path, score: Math.random() }));
      };

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Test Experiment',
        repetitions: 3,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [
          { name: 'Mock', ranker: mockRanker },
          { name: 'Random', ranker: randomRanker },
        ],
        metrics: ['spearman', 'ndcg'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, testGraph);

      expect(report.name).toBe('Test Experiment');
      expect(report.methods).toHaveLength(2);
      expect(report.winner).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.duration).toBeDefined();
    });

    it('should compute metrics correctly', async () => {
      let callCount = 0;
      const deterministicRanker = (_graph: typeof testGraph, paths: Path<Node, Edge>[]) => {
        callCount++;
        // Return paths in reverse order on second call
        const sortedPaths = [...paths].sort((a, b) => {
          const scoreA = callCount > 1 ? 0 : (a.totalWeight ?? 0);
          const scoreB = callCount > 1 ? 0 : (b.totalWeight ?? 0);
          return scoreB - scoreA;
        });
        return sortedPaths.map((path) => ({ path, score: path.totalWeight ?? 0 }));
      };

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Metrics Test',
        repetitions: 2,
        pathPlanting: {
          numPaths: 3,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'Deterministic', ranker: deterministicRanker }],
        metrics: ['spearman', 'kendall', 'ndcg'],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, testGraph);

      expect(report.methods).toHaveLength(1);
      expect(report.methods[0]?.method).toBe('Deterministic');
      expect(report.methods[0]?.results).toBeDefined();
    });

    it('should handle empty metrics list', async () => {
      const mockRanker = (_graph: typeof testGraph, paths: Path<Node, Edge>[]) => {
        return paths.map((path) => ({ path, score: path.totalWeight ?? 0 }));
      };

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Empty Metrics Test',
        repetitions: 1,
        pathPlanting: {
          numPaths: 2,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'weak',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'Mock', ranker: mockRanker }],
        metrics: [],
        statisticalTests: [],
        seed: 42,
      };

      const report = await runExperiment(config, testGraph);

      expect(report.methods).toHaveLength(1);
      expect(report.methods[0]?.results).toBeDefined();
    });
  });

  describe('runCrossValidation', () => {
    it('should run k-fold cross-validation', async () => {
      const mockRanker = (_graph: typeof testGraph, paths: Path<Node, Edge>[]) => {
        return paths.map((path) => ({ path, score: path.totalWeight ?? 0 }));
      };

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'CV Test',
        repetitions: 2,
        pathPlanting: {
          numPaths: 2,
          pathLength: { min: 2, max: 3 },
          signalStrength: 'medium',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'Mock', ranker: mockRanker }],
        metrics: ['spearman'],
        statisticalTests: [],
        seed: 42,
      };

      const result = await runCrossValidation(config, testGraph, 3);

      expect(result.foldResults).toHaveLength(3);
      expect(result.aggregated).toBeDefined();
      expect(result.stdDev).toBeDefined();
      expect(result.aggregated.methods).toHaveLength(1);
      expect(result.stdDev.methods).toHaveLength(1);
    });

    it('should use default 5 folds when not specified', async () => {
      const mockRanker = (_graph: typeof testGraph, paths: Path<Node, Edge>[]) => {
        return paths.map((path) => ({ path, score: path.totalWeight ?? 0 }));
      };

      const config: ExperimentConfig<Node & { type: string }, Edge & { source: string; target: string }> = {
        name: 'Default Folds Test',
        repetitions: 1,
        pathPlanting: {
          numPaths: 2,
          pathLength: { min: 2, max: 2 },
          signalStrength: 'weak',
          allowOverlap: false,
          seed: 42,
        },
        methods: [{ name: 'Mock', ranker: mockRanker }],
        metrics: ['spearman'],
        statisticalTests: [],
        seed: 42,
      };

      const result = await runCrossValidation(config, testGraph);

      expect(result.foldResults).toHaveLength(5);
    });
  });
});

describe('Report Generator', () => {
  let mockReport: ExperimentReport;

  beforeEach(() => {
    mockReport = {
      name: 'MI vs Random Baseline',
      graphSpec: 'small-citation-network',
      timestamp: '2025-01-15T12:00:00Z',
      duration: 1500,
      winner: 'MI',
      methods: [
        {
          method: 'MI',
          results: {
            spearman: 0.85,
            kendall: 0.72,
            ndcg: 0.88,
            map: 0.75,
            mrr: 0.82,
            precision_at_5: 0.8,
            precision_at_10: 0.75,
            recall_at_5: 0.7,
            recall_at_10: 0.85,
          },
          runtime: 100,
        },
        {
          method: 'Random',
          results: {
            spearman: 0.02,
            kendall: 0.01,
            ndcg: 0.05,
            map: 0.03,
            mrr: 0.04,
            precision_at_5: 0.02,
            precision_at_10: 0.03,
            recall_at_5: 0.01,
            recall_at_10: 0.02,
          },
          runtime: 50,
        },
      ],
      statisticalTests: [
        {
          type: 'paired-t',
          comparison: 'MI vs Random',
          pValue: 0.001,
          significant: true,
          statistic: 4.5,
        },
        {
          type: 'wilcoxon',
          comparison: 'MI vs Random',
          pValue: 0.002,
          significant: true,
          statistic: 123,
        },
      ],
    };
  });

  describe('generateMarkdownReport', () => {
    it('should generate valid markdown report', () => {
      const markdown = generateMarkdownReport(mockReport);

      expect(markdown).toContain('# MI vs Random Baseline');
      expect(markdown).toContain('**Timestamp:**');
      expect(markdown).toContain('**Graph Spec:**');
      expect(markdown).toContain('**Duration:**');
      expect(markdown).toContain('## Winner');
      expect(markdown).toContain('**MI**');
      expect(markdown).toContain('## Method Performance');
      expect(markdown).toContain('| Method |');
      expect(markdown).toContain('| MI |');
      expect(markdown).toContain('| Random |');
      expect(markdown).toContain('## Statistical Tests');
      expect(markdown).toContain('paired-t');
      expect(markdown).toContain('wilcoxon');
      expect(markdown).toContain('## Interpretation');
    });

    it('should include duration when present', () => {
      const markdown = generateMarkdownReport(mockReport);
      expect(markdown).toContain('**Duration:** 1500ms');
    });

    it('should handle missing duration', () => {
      const reportWithoutDuration = { ...mockReport, duration: undefined };
      const markdown = generateMarkdownReport(reportWithoutDuration);
      expect(markdown).not.toContain('**Duration:**');
    });

    it('should format numbers to 4 decimal places', () => {
      const markdown = generateMarkdownReport(mockReport);
      expect(markdown).toContain('0.8500');
      expect(markdown).toContain('0.7200');
    });
  });

  describe('generateLatexTable', () => {
    it('should generate valid LaTeX table', () => {
      const latex = generateLatexTable(mockReport);

      expect(latex).toContain('\\begin{table}[h]');
      expect(latex).toContain('\\begin{tabular}');
      expect(latex).toContain('\\toprule');
      expect(latex).toContain('\\midrule');
      expect(latex).toContain('\\bottomrule');
      expect(latex).toContain('\\end{tabular}');
      expect(latex).toContain('\\end{table}');
      expect(latex).toContain('Method &');
      expect(latex).toContain('MI &');
      expect(latex).toContain('Random &');
    });

    it('should escape special LaTeX characters', () => {
      const reportWithSpecialChars: ExperimentReport = {
        ...mockReport,
        name: 'MI vs Random_Baseline & Test',
        methods: [
          {
            method: 'Method_A & B',
            results: mockReport.methods[0]!.results,
            runtime: 100,
          },
        ],
      };

      const latex = generateLatexTable(reportWithSpecialChars);
      expect(latex).toContain('\\_'); // Underscore escaped
      expect(latex).toContain('\\&'); // Ampersand escaped
    });

    it('should include caption with experiment name', () => {
      const latex = generateLatexTable(mockReport);
      expect(latex).toContain('\\caption{Results for MI vs Random Baseline}');
    });
  });

  describe('generateJSONSummary', () => {
    it('should generate valid JSON summary', () => {
      const json = generateJSONSummary(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('MI vs Random Baseline');
      expect(parsed.timestamp).toBe('2025-01-15T12:00:00Z');
      expect(parsed.winner).toBe('MI');
      expect(parsed.methods).toHaveLength(2);
      expect(parsed.methods[0].name).toBe('MI');
      expect(parsed.methods[0].results.spearman).toBe(0.85);
      expect(parsed.statisticalTests).toHaveLength(2);
      expect(parsed.statisticalTests[0].type).toBe('paired-t');
    });

    it('should format JSON with indentation', () => {
      const json = generateJSONSummary(mockReport);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('generateHTMLReport', () => {
    it('should generate valid HTML report', () => {
      const html = generateHTMLReport(mockReport);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('<title>MI vs Random Baseline</title>');
      expect(html).toContain('<style>');
      expect(html).toContain('table {');
      expect(html).toContain('<h1>MI vs Random Baseline</h1>');
      expect(html).toContain('<h2>Winner</h2>');
      expect(html).toContain('<h2>Method Performance</h2>');
      expect(html).toContain('<table>');
      expect(html).toContain('</html>');
    });

    it('should apply CSS classes for significance', () => {
      const html = generateHTMLReport(mockReport);
      expect(html).toContain('class="significant"');
      // All tests in mockReport are significant, so not-significant won't appear
    });

    it('should escape HTML entities', () => {
      const reportWithHTML: ExperimentReport = {
        ...mockReport,
        name: 'MI <script>alert("test")</script> vs Baseline',
        methods: [
          {
            method: 'Method & Test',
            results: mockReport.methods[0]!.results,
            runtime: 100,
          },
        ],
      };

      const html = generateHTMLReport(reportWithHTML);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&amp;');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
    });

    it('should highlight winner method', () => {
      const html = generateHTMLReport(mockReport);
      expect(html).toContain('font-weight: bold');
    });
  });

  describe('Metric headers formatting', () => {
    it('should format precision_at_K and recall_at_K correctly', () => {
      const markdown = generateMarkdownReport(mockReport);
      expect(markdown).toContain('PRECISION@5');
      expect(markdown).toContain('PRECISION@10');
      expect(markdown).toContain('RECALL@5');
      expect(markdown).toContain('RECALL@10');
    });

    it('should capitalize first letter for other metrics', () => {
      const markdown = generateMarkdownReport(mockReport);
      expect(markdown).toContain('Spearman');
      expect(markdown).toContain('Kendall');
      expect(markdown).toContain('Ndcg');
      expect(markdown).toContain('Map');
      expect(markdown).toContain('Mrr');
    });
  });
});
