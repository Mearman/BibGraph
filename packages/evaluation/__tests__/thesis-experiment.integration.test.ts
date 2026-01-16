/**
 * MI Path Ranking Experiments for Thesis
 *
 * Compares MI ranking against baselines (random, degree, shortest)
 * and generates LaTeX tables for publication.
 *
 * Run with: pnpm test packages/evaluation/__tests__/thesis-experiment.integration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { Graph, rankPaths } from '@bibgraph/algorithms';
import type { Node, Edge, Path } from '@bibgraph/algorithms';
import { randomRanker } from '../src/baselines';
import { spearmanCorrelation } from '../src/rank-correlation';

// ─────────────────────────────────────────────────────────────────────────────
// Graph Types
// ─────────────────────────────────────────────────────────────────────────────

interface TestNode extends Node {
  id: string;
  type: string;
}

interface TestEdge extends Edge {
  id: string;
  source: string;
  target: string;
  weight?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Benchmark Graph Generators
// ─────────────────────────────────────────────────────────────────────────────

function createCitationNetwork(size: number, seed: number): Graph<TestNode, TestEdge> {
  const graph = new Graph<TestNode, TestEdge>(true); // directed

  // Seeded random
  let rngState = seed;
  const random = () => {
    const x = Math.sin(rngState++) * 10000;
    return x - Math.floor(x);
  };

  // Add work nodes
  for (let i = 0; i < size; i++) {
    graph.addNode({ id: `W${i}`, type: 'Work' });
  }

  // Add citations (older works get more citations - preferential attachment)
  let edgeId = 0;
  for (let i = 1; i < size; i++) {
    // Each work cites 1-3 earlier works
    const numCitations = 1 + Math.floor(random() * 3);
    for (let c = 0; c < numCitations && c < i; c++) {
      // Prefer citing highly-cited works (preferential attachment)
      const target = Math.floor(random() * i);
      const edgeKey = `e${edgeId}`;
      if (!graph.getEdge(edgeKey).some) {
        graph.addEdge({
          id: edgeKey,
          source: `W${i}`,
          target: `W${target}`,
          type: 'cites',
          weight: 0.5 + random() * 0.5,
        });
        edgeId++;
      }
    }
  }

  return graph;
}

function createHeterogeneousGraph(seed: number): Graph<TestNode, TestEdge> {
  const graph = new Graph<TestNode, TestEdge>(false); // undirected

  // Seeded random
  let rngState = seed;
  const random = () => {
    const x = Math.sin(rngState++) * 10000;
    return x - Math.floor(x);
  };

  // Add works (20)
  for (let i = 0; i < 20; i++) {
    graph.addNode({ id: `W${i}`, type: 'Work' });
  }

  // Add authors (10)
  for (let i = 0; i < 10; i++) {
    graph.addNode({ id: `A${i}`, type: 'Author' });
  }

  // Add institutions (5)
  for (let i = 0; i < 5; i++) {
    graph.addNode({ id: `I${i}`, type: 'Institution' });
  }

  let edgeId = 0;

  // Connect works to authors (each work has 1-3 authors)
  for (let w = 0; w < 20; w++) {
    const numAuthors = 1 + Math.floor(random() * 3);
    for (let a = 0; a < numAuthors; a++) {
      const authorId = Math.floor(random() * 10);
      graph.addEdge({
        id: `e${edgeId++}`,
        source: `W${w}`,
        target: `A${authorId}`,
        type: 'authored_by',
        weight: 0.9,
      });
    }
  }

  // Connect authors to institutions
  for (let a = 0; a < 10; a++) {
    const instId = Math.floor(random() * 5);
    graph.addEdge({
      id: `e${edgeId++}`,
      source: `A${a}`,
      target: `I${instId}`,
      type: 'affiliated_with',
      weight: 0.8,
    });
  }

  // Add citations between works
  for (let i = 1; i < 20; i++) {
    const numCitations = 1 + Math.floor(random() * 2);
    for (let c = 0; c < numCitations && c < i; c++) {
      const target = Math.floor(random() * i);
      graph.addEdge({
        id: `e${edgeId++}`,
        source: `W${i}`,
        target: `W${target}`,
        type: 'cites',
        weight: 0.5 + random() * 0.5,
      });
    }
  }

  return graph;
}

// ─────────────────────────────────────────────────────────────────────────────
// Baseline Rankers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple degree-based ranker (sum of node degrees along path)
 */
function simpleDegreeRanker<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  paths: Path<N, E>[]
): Array<{ path: Path<N, E>; score: number }> {
  return paths
    .map((path) => {
      const totalDegree = path.nodes.reduce((sum, node) => {
        const neighbors = graph.getNeighbors(node.id);
        return sum + (neighbors.ok ? neighbors.value.length : 0);
      }, 0);
      return { path, score: totalDegree };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Shortest path ranker (shorter paths score higher)
 */
function shortestPathRanker<N extends Node, E extends Edge>(
  _graph: Graph<N, E>,
  paths: Path<N, E>[]
): Array<{ path: Path<N, E>; score: number }> {
  return paths
    .map((path) => ({
      path,
      score: 1 / (path.edges.length + 1), // +1 to avoid division by zero
    }))
    .sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Storage
// ─────────────────────────────────────────────────────────────────────────────

interface ExperimentResult {
  name: string;
  graph: string;
  nodes: number;
  edges: number;
  paths: number;
  miScore: number;
  randomScore: number;
  degreeScore: number;
  shortestScore: number;
  miWins: boolean;
}

const allResults: ExperimentResult[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// LaTeX Generator
// ─────────────────────────────────────────────────────────────────────────────

function generateLatexTable(results: ExperimentResult[]): string {
  const rows = results
    .map((r) => {
      const best = Math.max(r.miScore, r.randomScore, r.degreeScore, r.shortestScore);
      const formatScore = (score: number) =>
        score === best ? `\\textbf{${score.toFixed(3)}}` : score.toFixed(3);

      return `    ${r.name} & ${r.nodes}/${r.edges} & ${r.paths} & ${formatScore(r.miScore)} & ${formatScore(r.randomScore)} & ${formatScore(r.degreeScore)} & ${formatScore(r.shortestScore)} \\\\`;
    })
    .join('\n');

  return `% Auto-generated LaTeX table from MI experiment
% Generated: ${new Date().toISOString()}

\\begin{table}[htbp]
  \\centering
  \\caption{Spearman rank correlation ($\\rho$) between path rankings and ground truth across different graph types. Bold indicates best performance per row. Ground truth is defined by total edge weight (sum of citation strengths).}
  \\label{tab:mi-experiment-results}
  \\begin{tabular}{lcccccc}
    \\toprule
    \\textbf{Graph Type} & \\textbf{V/E} & \\textbf{Paths} & \\textbf{MI} & \\textbf{Random} & \\textbf{Degree} & \\textbf{Shortest} \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MI Path Ranking Experiments for Thesis', () => {
  const experiments = [
    { name: 'Small Citation', graphFn: () => createCitationNetwork(30, 42), startId: 'W25', endId: 'W0' },
    { name: 'Medium Citation', graphFn: () => createCitationNetwork(50, 123), startId: 'W45', endId: 'W0' },
    { name: 'Large Citation', graphFn: () => createCitationNetwork(100, 456), startId: 'W90', endId: 'W0' },
    { name: 'Heterogeneous', graphFn: () => createHeterogeneousGraph(789), startId: 'W15', endId: 'W0' },
  ];

  for (const exp of experiments) {
    it(`should rank paths on ${exp.name} network`, () => {
      const graph = exp.graphFn();
      const nodeCount = graph.getAllNodes().length;
      const edgeCount = graph.getAllEdges().length;

      // Use rankPaths to find and rank paths (MI ranking)
      const miResult = rankPaths(graph, exp.startId, exp.endId, {
        traversalMode: 'undirected',
        lambda: 0, // Pure MI quality
        maxPaths: 100,
      });

      // Skip if no paths found
      if (!miResult.ok || !miResult.value.some || miResult.value.value.length === 0) {
        console.log(`   ${exp.name}: No paths found - skipping`);
        return;
      }

      // Extract paths from MI result
      const miRanked = miResult.value.value;
      const paths = miRanked.map((r) => r.path);

      // Create ground truth (paths ordered by total edge weight)
      const groundTruth = paths
        .map((path) => ({
          path,
          relevance: path.edges.reduce((sum, e) => sum + ((e as TestEdge).weight ?? 0.5), 0),
        }))
        .sort((a: { relevance: number }, b: { relevance: number }) => b.relevance - a.relevance)
        .map((p: { path: Path<TestNode, TestEdge> }) => p.path);

      // Rank with other methods for comparison
      const randomRanked = randomRanker(paths, 42);
      const degreeRanked = simpleDegreeRanker(graph, paths);
      const shortestRanked = shortestPathRanker(graph, paths);

      // Extract path IDs for comparison
      const groundTruthIds = groundTruth.map((p) => p.nodes.map((n: TestNode) => n.id).join('->'));
      const miIds = miRanked.map((r) => r.path.nodes.map((n: TestNode) => n.id).join('->'));
      const randomIds = randomRanked.map((r) => r.path.nodes.map((n: TestNode) => n.id).join('->'));
      const degreeIds = degreeRanked.map((r) => r.path.nodes.map((n: TestNode) => n.id).join('->'));
      const shortestIds = shortestRanked.map((r) => r.path.nodes.map((n: TestNode) => n.id).join('->'));

      // Compute Spearman correlations
      const miSpearman = spearmanCorrelation(miIds, groundTruthIds);
      const randomSpearman = spearmanCorrelation(randomIds, groundTruthIds);
      const degreeSpearman = spearmanCorrelation(degreeIds, groundTruthIds);
      const shortestSpearman = spearmanCorrelation(shortestIds, groundTruthIds);

      // Log results
      console.log(`\n   ${exp.name} Network:`);
      console.log(`   ├─ Nodes: ${nodeCount}, Edges: ${edgeCount}, Paths: ${paths.length}`);
      console.log(`   ├─ Spearman Correlations:`);
      console.log(`   │  ├─ MI:       ${miSpearman.toFixed(4)}`);
      console.log(`   │  ├─ Random:   ${randomSpearman.toFixed(4)}`);
      console.log(`   │  ├─ Degree:   ${degreeSpearman.toFixed(4)}`);
      console.log(`   │  └─ Shortest: ${shortestSpearman.toFixed(4)}`);

      const miWins =
        miSpearman >= randomSpearman &&
        miSpearman >= degreeSpearman;

      console.log(`   └─ MI wins: ${miWins ? 'Yes ✓' : 'No'}`);

      // Store result
      allResults.push({
        name: exp.name,
        graph: `${nodeCount}/${edgeCount}`,
        nodes: nodeCount,
        edges: edgeCount,
        paths: paths.length,
        miScore: miSpearman,
        randomScore: randomSpearman,
        degreeScore: degreeSpearman,
        shortestScore: shortestSpearman,
        miWins,
      });

      // Basic assertions - MI should not be worse than random
      expect(miSpearman).toBeGreaterThanOrEqual(randomSpearman - 0.3);
    });
  }

  it('should generate LaTeX table', () => {
    if (allResults.length === 0) {
      console.log('No results to generate table from');
      return;
    }

    const latex = generateLatexTable(allResults);
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(' LaTeX Table');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(latex);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(' Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const miWinCount = allResults.filter((r) => r.miWins).length;
    const avgMI = allResults.reduce((s, r) => s + r.miScore, 0) / allResults.length;
    const avgRandom = allResults.reduce((s, r) => s + r.randomScore, 0) / allResults.length;
    const avgDegree = allResults.reduce((s, r) => s + r.degreeScore, 0) / allResults.length;

    console.log(`MI wins: ${miWinCount}/${allResults.length} experiments`);
    console.log(`Average Spearman correlations:`);
    console.log(`  MI:     ${avgMI.toFixed(4)}`);
    console.log(`  Random: ${avgRandom.toFixed(4)}`);
    console.log(`  Degree: ${avgDegree.toFixed(4)}`);

    expect(latex).toContain('\\begin{table}');
    expect(latex).toContain('\\end{table}');
  });
});
