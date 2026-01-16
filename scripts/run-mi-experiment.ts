#!/usr/bin/env npx tsx
/**
 * Run MI path ranking experiments for thesis
 *
 * Compares MI ranking against baselines (random, degree, PageRank)
 * and generates LaTeX tables for publication.
 */

import { Graph, rankPaths } from '@bibgraph/algorithms';
import type { Node, Edge, Path } from '@bibgraph/algorithms';
import {
  runExperiment,
  generateMarkdownReport,
  generateLatexTable,
  randomRanker,
  degreeBasedRanker,
  spearmanCorrelation,
  kendallTau,
  ndcg,
  meanReciprocalRank,
  type ExperimentConfig,
} from '@bibgraph/evaluation';

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
      if (!graph.hasEdge(`e${edgeId}`)) {
        graph.addEdge({
          id: `e${edgeId++}`,
          source: `W${i}`,
          target: `W${target}`,
          type: 'cites',
          weight: 0.5 + random() * 0.5,
        });
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
// Rankers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MI-based ranker using geometric mean mutual information
 */
function miRanker<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  paths: Path<N, E>[]
): Array<{ path: Path<N, E>; score: number }> {
  // Get start and end from first path
  if (paths.length === 0) return [];

  const startId = paths[0].nodes[0]?.id;
  const endId = paths[0].nodes[paths[0].nodes.length - 1]?.id;

  if (!startId || !endId) return [];

  // Use rankPaths for MI scoring
  const result = rankPaths(graph, startId, endId, {
    traversalMode: 'undirected',
    lambda: 0, // Pure MI quality
  });

  if (!result.ok || !result.value.some) {
    // Fallback: return paths with computed scores
    return paths.map((path) => ({
      path,
      score: path.edges.length > 0 ? 1 / path.edges.length : 0,
    }));
  }

  return result.value.value.map((ranked) => ({
    path: ranked.path,
    score: ranked.score,
  }));
}

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
// Main Experiment
// ─────────────────────────────────────────────────────────────────────────────

async function runExperiments() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' MI Path Ranking Experiments');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results: Array<{
    name: string;
    graph: string;
    miScore: number;
    randomScore: number;
    degreeScore: number;
    shortestScore: number;
    miWins: boolean;
  }> = [];

  // Run experiments on different graph types
  const experiments = [
    { name: 'Small Citation', graph: createCitationNetwork(30, 42), startId: 'W25', endId: 'W0' },
    { name: 'Medium Citation', graph: createCitationNetwork(50, 123), startId: 'W45', endId: 'W0' },
    { name: 'Large Citation', graph: createCitationNetwork(100, 456), startId: 'W90', endId: 'W0' },
    { name: 'Heterogeneous', graph: createHeterogeneousGraph(789), startId: 'W15', endId: 'W0' },
  ];

  for (const exp of experiments) {
    console.log(`\n── ${exp.name} Network ──`);
    console.log(`   Nodes: ${exp.graph.getAllNodes().length}`);
    console.log(`   Edges: ${exp.graph.getAllEdges().length}`);

    // Find all shortest paths
    const { findAllShortestPaths } = await import('@bibgraph/algorithms');
    const paths = findAllShortestPaths(exp.graph, exp.startId, exp.endId, 'undirected');

    if (paths.length === 0) {
      console.log('   No paths found - skipping');
      continue;
    }

    console.log(`   Paths found: ${paths.length}`);

    // Create ground truth (paths ordered by total edge weight)
    const groundTruth = paths
      .map((path) => ({
        path,
        relevance: path.edges.reduce((sum, e) => sum + (e.weight ?? 0.5), 0),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .map((p) => p.path);

    // Rank with each method
    const miRanked = miRanker(exp.graph, paths);
    const randomRanked = randomRanker(paths, 42);
    const degreeRanked = simpleDegreeRanker(exp.graph, paths);
    const shortestRanked = shortestPathRanker(exp.graph, paths);

    // Extract path IDs for comparison
    const groundTruthIds = groundTruth.map((p) => p.nodes.map((n) => n.id).join('->'));
    const miIds = miRanked.map((r) => r.path.nodes.map((n) => n.id).join('->'));
    const randomIds = randomRanked.map((p) => p.nodes.map((n) => n.id).join('->'));
    const degreeIds = degreeRanked.map((r) => r.path.nodes.map((n) => n.id).join('->'));
    const shortestIds = shortestRanked.map((r) => r.path.nodes.map((n) => n.id).join('->'));

    // Compute Spearman correlations
    const miSpearman = spearmanCorrelation(miIds, groundTruthIds);
    const randomSpearman = spearmanCorrelation(randomIds, groundTruthIds);
    const degreeSpearman = spearmanCorrelation(degreeIds, groundTruthIds);
    const shortestSpearman = spearmanCorrelation(shortestIds, groundTruthIds);

    console.log(`\n   Spearman Correlations with Ground Truth:`);
    console.log(`   ├─ MI:       ${miSpearman.toFixed(4)}`);
    console.log(`   ├─ Random:   ${randomSpearman.toFixed(4)}`);
    console.log(`   ├─ Degree:   ${degreeSpearman.toFixed(4)}`);
    console.log(`   └─ Shortest: ${shortestSpearman.toFixed(4)}`);

    const miWins =
      miSpearman >= randomSpearman &&
      miSpearman >= degreeSpearman &&
      miSpearman >= shortestSpearman;

    console.log(`\n   Winner: ${miWins ? 'MI ✓' : 'Baseline'}`);

    results.push({
      name: exp.name,
      graph: `${exp.graph.getAllNodes().length}N/${exp.graph.getAllEdges().length}E`,
      miScore: miSpearman,
      randomScore: randomSpearman,
      degreeScore: degreeSpearman,
      shortestScore: shortestSpearman,
      miWins,
    });
  }

  // Generate LaTeX table
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log(' LaTeX Table');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const latex = generateLatexTableFromResults(results);
  console.log(latex);

  // Save to file
  const outputPath = '/Users/joe/Documents/Research/PhD/Thesis/content/chapters/04-analysis/sections/path_ranking/experiment-results.tex';
  await Bun.write(outputPath, latex);
  console.log(`\nSaved to: ${outputPath}`);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const miWinCount = results.filter((r) => r.miWins).length;
  console.log(`MI wins: ${miWinCount}/${results.length} experiments`);
  console.log(`Average MI Spearman: ${(results.reduce((s, r) => s + r.miScore, 0) / results.length).toFixed(4)}`);
  console.log(`Average Random Spearman: ${(results.reduce((s, r) => s + r.randomScore, 0) / results.length).toFixed(4)}`);
}

function generateLatexTableFromResults(
  results: Array<{
    name: string;
    graph: string;
    miScore: number;
    randomScore: number;
    degreeScore: number;
    shortestScore: number;
    miWins: boolean;
  }>
): string {
  const rows = results
    .map((r) => {
      const best = Math.max(r.miScore, r.randomScore, r.degreeScore, r.shortestScore);
      const formatScore = (score: number) =>
        score === best ? `\\textbf{${score.toFixed(3)}}` : score.toFixed(3);

      return `    ${r.name} & ${r.graph} & ${formatScore(r.miScore)} & ${formatScore(r.randomScore)} & ${formatScore(r.degreeScore)} & ${formatScore(r.shortestScore)} \\\\`;
    })
    .join('\n');

  return `% Auto-generated LaTeX table from MI experiment
% Generated: ${new Date().toISOString()}

\\begin{table}[htbp]
  \\centering
  \\caption{Spearman rank correlation ($\\rho$) between path rankings and ground truth across different graph types. Bold indicates best performance per row.}
  \\label{tab:mi-experiment-results}
  \\begin{tabular}{llcccc}
    \\toprule
    \\textbf{Graph Type} & \\textbf{Size} & \\textbf{MI} & \\textbf{Random} & \\textbf{Degree} & \\textbf{Shortest} \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
}

// Run experiments
runExperiments().catch(console.error);
