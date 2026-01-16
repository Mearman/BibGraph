#!/usr/bin/env npx tsx
/**
 * Multi-Domain MI Path Ranking Experiments
 *
 * Validates MI path ranking across multiple graph domains:
 * - Citation networks (Cora, CiteSeer)
 * - Social networks (Facebook)
 * - Knowledge graphs (FB15k-237)
 * - Academic graphs (OpenAlex-synthetic)
 *
 * Compares against multiple ground truth definitions to show robustness.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { Graph, rankPaths } from '../packages/algorithms/dist/index.js';
import type { Node, Edge, Path, RankedPath } from '../packages/algorithms/dist/index.js';
import {
  loadEdgeList,
  loadTriples,
  spearmanCorrelation,
  computeGroundTruth,
  precomputeImportance,
  type GroundTruthType,
  type LoadedNode,
  type LoadedEdge,
  type PrecomputedImportance,
} from '../packages/evaluation/dist/index.js';

// Simple BFS to find all shortest paths
function findAllShortestPaths<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  source: string,
  target: string,
  mode: 'directed' | 'undirected'
): Path<N, E>[] {
  const result = rankPaths(graph, source, target, {
    traversalMode: mode,
    lambda: 0,
    shortestOnly: true,
    maxPaths: 50,
  });

  if (!result.ok || !result.value.some) {
    return [];
  }

  return result.value.value.map((r) => r.path);
}

// ============================================================================
// Types
// ============================================================================

interface ExperimentResult {
  dataset: string;
  groundTruth: GroundTruthType;
  mi: number;
  random: number;
  degree: number;
  pagerank: number;
  shortest: number;
}

interface DatasetConfig {
  name: string;
  path: string;
  format: 'edge-list' | 'triples' | 'openalex';
  directed: boolean;
  delimiter?: string | RegExp;
  headerLines?: number;
  // For triples format: column indices
  headColumn?: number;
  relationColumn?: number;
  tailColumn?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const DATASETS: DatasetConfig[] = [
  {
    name: 'Cora',
    path: 'data/benchmarks/cora/cora.edges',
    format: 'edge-list',
    directed: true,
    delimiter: /,/,
  },
  {
    name: 'CiteSeer',
    path: 'data/benchmarks/citeseer/citeseer.edges',
    format: 'edge-list',
    directed: true,
    delimiter: /,/,
  },
  {
    name: 'Facebook',
    path: 'data/benchmarks/facebook/facebook_combined.txt',
    format: 'edge-list',
    directed: false,
    delimiter: /\s+/,
  },
  // FB15k-237 skipped for now - too large for path enumeration (14.5K nodes, 272K edges)
  // {
  //   name: 'FB15k-237',
  //   path: 'data/benchmarks/fb15k-237/train2id.txt',
  //   format: 'triples',
  //   directed: true,
  //   headerLines: 1,
  //   delimiter: /\s+/,
  //   // FB15k-237 train2id.txt format: head_id tail_id relation_id
  //   headColumn: 0,
  //   tailColumn: 1,
  //   relationColumn: 2,
  // },
  {
    name: 'OpenAlex',
    path: 'data/benchmarks/openalex/openalex-synthetic.json',
    format: 'openalex',
    directed: false,
  },
];

// All ground truth types - using pre-computed importance for efficiency
const GROUND_TRUTH_TYPES: GroundTruthType[] = ['degree', 'pagerank', 'combined'];

const NUM_NODE_PAIRS = 10;

// ============================================================================
// Seeded Random
// ============================================================================

function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    const x = Math.sin(state++) * 10000;
    return x - Math.floor(x);
  };
}

// ============================================================================
// Dataset Loading
// ============================================================================

async function loadDataset(config: DatasetConfig): Promise<Graph<LoadedNode, LoadedEdge>> {
  const fullPath = resolve(process.cwd(), config.path);
  const content = await readFile(fullPath, 'utf-8');

  if (config.format === 'openalex') {
    // Load OpenAlex JSON format
    const data = JSON.parse(content) as {
      entities: Array<{ id: string; type: string }>;
      edges: Array<{ source: string; target: string; type: string }>;
    };

    const graph = new Graph<LoadedNode, LoadedEdge>(config.directed);

    for (const entity of data.entities) {
      graph.addNode({ id: entity.id, type: entity.type });
    }

    let edgeId = 0;
    for (const edge of data.edges) {
      graph.addEdge({
        id: `e${edgeId++}`,
        source: edge.source,
        target: edge.target,
        type: edge.type,
      });
    }

    return graph;
  }

  if (config.format === 'triples') {
    const result = loadTriples(content, {
      delimiter: config.delimiter,
      headerLines: config.headerLines,
      headColumn: config.headColumn,
      relationColumn: config.relationColumn,
      tailColumn: config.tailColumn,
    });
    return result.graph;
  }

  // Edge list
  const result = loadEdgeList(content, {
    directed: config.directed,
    delimiter: config.delimiter,
    headerLines: config.headerLines,
  });

  return result.graph;
}

// ============================================================================
// Path Sampling
// ============================================================================

function sampleNodePairs(
  graph: Graph<LoadedNode, LoadedEdge>,
  count: number,
  seed: number
): Array<[string, string]> {
  const random = createSeededRandom(seed);
  const nodes = graph.getAllNodes();
  const pairs: Array<[string, string]> = [];

  let attempts = 0;
  const maxAttempts = count * 100;

  while (pairs.length < count && attempts < maxAttempts) {
    attempts++;

    const sourceIdx = Math.floor(random() * nodes.length);
    const targetIdx = Math.floor(random() * nodes.length);

    if (sourceIdx === targetIdx) continue;

    const source = nodes[sourceIdx].id;
    const target = nodes[targetIdx].id;

    // Check if paths exist (quick BFS check)
    const paths = findAllShortestPaths(graph, source, target, 'undirected');
    if (paths.length >= 2) {
      pairs.push([source, target]);
    }
  }

  return pairs;
}

// ============================================================================
// Baseline Rankers
// ============================================================================

function randomRank<N extends Node, E extends Edge>(
  paths: Path<N, E>[],
  seed: number
): RankedPath<N, E>[] {
  const random = createSeededRandom(seed);
  const shuffled = [...paths].sort(() => random() - 0.5);
  return shuffled.map((path, i) => ({
    path,
    score: shuffled.length - i,
    geometricMeanMI: 0,
    edgeMIValues: [],
  }));
}

function degreeRank<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  paths: Path<N, E>[]
): RankedPath<N, E>[] {
  return paths
    .map((path) => {
      let totalDegree = 0;
      for (const node of path.nodes) {
        const neighbors = graph.getNeighbors(node.id);
        totalDegree += neighbors.ok ? neighbors.value.length : 0;
      }
      const avgDegree = path.nodes.length > 0 ? totalDegree / path.nodes.length : 0;
      return {
        path,
        score: avgDegree,
        geometricMeanMI: 0,
        edgeMIValues: [],
      };
    })
    .sort((a, b) => b.score - a.score);
}

function shortestRank<N extends Node, E extends Edge>(paths: Path<N, E>[]): RankedPath<N, E>[] {
  return paths
    .map((path) => ({
      path,
      score: 1 / (path.edges.length + 1),
      geometricMeanMI: 0,
      edgeMIValues: [],
    }))
    .sort((a, b) => b.score - a.score);
}

// ============================================================================
// Experiment Runner
// ============================================================================

async function runExperiment(
  graph: Graph<LoadedNode, LoadedEdge>,
  datasetName: string,
  groundTruthType: GroundTruthType,
  precomputed: PrecomputedImportance
): Promise<ExperimentResult | null> {
  console.log(`  Running with ${groundTruthType} ground truth...`);

  // Sample node pairs
  const pairs = sampleNodePairs(graph, NUM_NODE_PAIRS, 42);

  if (pairs.length < 5) {
    console.log(`    Insufficient node pairs found (${pairs.length}), skipping`);
    return null;
  }

  const miScores: number[] = [];
  const randomScores: number[] = [];
  const degreeScores: number[] = [];
  const shortestScores: number[] = [];

  for (const [source, target] of pairs) {
    // Find paths
    const paths = findAllShortestPaths(graph, source, target, 'undirected');
    if (paths.length < 2) continue;

    // Compute ground truth ranking using pre-computed importance
    const importanceMap = groundTruthType === 'degree' ? precomputed.degree
      : groundTruthType === 'pagerank' ? precomputed.pagerank
      : precomputed.combined;
    const gtRanking = computeGroundTruth(graph, paths, {
      type: groundTruthType,
      precomputedImportance: importanceMap,
    });
    const gtIds = gtRanking.map((r) => r.path.nodes.map((n: LoadedNode) => n.id).join('->'));

    // MI ranking
    const miResult = rankPaths(graph, source, target, {
      traversalMode: 'undirected',
      lambda: 0,
      shortestOnly: true,
      maxPaths: 100,
    });

    if (miResult.ok && miResult.value.some) {
      const miIds = miResult.value.value.map((r) => r.path.nodes.map((n) => n.id).join('->'));
      miScores.push(spearmanCorrelation(miIds, gtIds));
    }

    // Random ranking
    const randomRanked = randomRank(paths, 123);
    const randomIds = randomRanked.map((r) => r.path.nodes.map((n) => n.id).join('->'));
    randomScores.push(spearmanCorrelation(randomIds, gtIds));

    // Degree ranking
    const degreeRanked = degreeRank(graph, paths);
    const degreeIds = degreeRanked.map((r) => r.path.nodes.map((n) => n.id).join('->'));
    degreeScores.push(spearmanCorrelation(degreeIds, gtIds));

    // Shortest ranking
    const shortestRanked = shortestRank(paths);
    const shortestIds = shortestRanked.map((r) => r.path.nodes.map((n) => n.id).join('->'));
    shortestScores.push(spearmanCorrelation(shortestIds, gtIds));
  }

  if (miScores.length === 0) {
    console.log(`    No valid experiments completed`);
    return null;
  }

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    dataset: datasetName,
    groundTruth: groundTruthType,
    mi: mean(miScores),
    random: mean(randomScores),
    degree: mean(degreeScores),
    pagerank: 0, // Would need PageRank ranker
    shortest: mean(shortestScores),
  };
}

// ============================================================================
// LaTeX Generation
// ============================================================================

function generateLatexTable(results: ExperimentResult[]): string {
  // Group by ground truth type
  const byGT = new Map<GroundTruthType, ExperimentResult[]>();
  for (const r of results) {
    const list = byGT.get(r.groundTruth) ?? [];
    list.push(r);
    byGT.set(r.groundTruth, list);
  }

  // Table 1: MI vs Baselines (Degree GT)
  const degreeResults = byGT.get('degree') ?? [];

  let latex = `% Auto-generated multi-domain experiment results
% Generated: ${new Date().toISOString()}

\\begin{table}[htbp]
  \\centering
  \\caption{Spearman $\\rho$ between rankings and degree-based ground truth across graph domains.}
  \\label{tab:multi_domain_degree_gt}
  \\begin{tabular}{lrrrr}
    \\toprule
    \\textbf{Dataset} & \\textbf{MI} & \\textbf{Random} & \\textbf{Degree} & \\textbf{Shortest} \\\\
    \\midrule
`;

  for (const r of degreeResults) {
    const best = Math.max(r.mi, r.random, r.degree, r.shortest);
    const fmt = (v: number) => (v === best ? `\\textbf{${v.toFixed(3)}}` : v.toFixed(3));
    latex += `    ${r.dataset} & ${fmt(r.mi)} & ${fmt(r.random)} & ${fmt(r.degree)} & ${fmt(r.shortest)} \\\\\n`;
  }

  latex += `    \\bottomrule
  \\end{tabular}
\\end{table}

`;

  // Table 2: MI across ground truths
  latex += `\\begin{table}[htbp]
  \\centering
  \\caption{MI ranking Spearman $\\rho$ across different ground truth definitions.}
  \\label{tab:multi_domain_gt_comparison}
  \\begin{tabular}{lrrr}
    \\toprule
    \\textbf{Dataset} & \\textbf{Degree GT} & \\textbf{PageRank GT} & \\textbf{Combined GT} \\\\
    \\midrule
`;

  const datasets = [...new Set(results.map((r) => r.dataset))];
  for (const ds of datasets) {
    const degreeR = results.find((r) => r.dataset === ds && r.groundTruth === 'degree');
    const prR = results.find((r) => r.dataset === ds && r.groundTruth === 'pagerank');
    const combR = results.find((r) => r.dataset === ds && r.groundTruth === 'combined');

    latex += `    ${ds} & ${degreeR?.mi.toFixed(3) ?? 'N/A'} & ${prR?.mi.toFixed(3) ?? 'N/A'} & ${combR?.mi.toFixed(3) ?? 'N/A'} \\\\\n`;
  }

  // Compute means
  const meanDegree = degreeResults.length > 0
    ? degreeResults.reduce((s, r) => s + r.mi, 0) / degreeResults.length
    : 0;
  const prResults = byGT.get('pagerank') ?? [];
  const meanPR = prResults.length > 0
    ? prResults.reduce((s, r) => s + r.mi, 0) / prResults.length
    : 0;
  const combResults = byGT.get('combined') ?? [];
  const meanComb = combResults.length > 0
    ? combResults.reduce((s, r) => s + r.mi, 0) / combResults.length
    : 0;

  latex += `    \\midrule
    \\textit{Mean} & ${meanDegree.toFixed(3)} & ${meanPR.toFixed(3)} & ${meanComb.toFixed(3)} \\\\
    \\bottomrule
  \\end{tabular}
\\end{table}
`;

  return latex;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Multi-Domain MI Path Ranking Experiments');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results: ExperimentResult[] = [];

  for (const dataset of DATASETS) {
    console.log(`\n── ${dataset.name} ──`);

    try {
      const graph = await loadDataset(dataset);
      console.log(`  Loaded: ${graph.getAllNodes().length} nodes, ${graph.getAllEdges().length} edges`);

      // Pre-compute importance values ONCE per graph (this is the expensive part)
      console.log(`  Pre-computing importance values...`);
      const precomputed = precomputeImportance(graph);
      console.log(`  Done (PageRank + degree for ${graph.getAllNodes().length} nodes)`);

      for (const gtType of GROUND_TRUTH_TYPES) {
        const result = await runExperiment(graph, dataset.name, gtType, precomputed);
        if (result) {
          results.push(result);
          console.log(`    MI: ${result.mi.toFixed(3)}, Random: ${result.random.toFixed(3)}, Degree: ${result.degree.toFixed(3)}`);
        }
      }
    } catch (err) {
      console.log(`  Error loading dataset: ${err}`);
    }
  }

  // Generate LaTeX
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log(' Results');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const latex = generateLatexTable(results);
  console.log(latex);

  // Save LaTeX
  const outputPath = resolve(
    process.cwd(),
    '../Thesis/content/chapters/04-analysis/sections/path_ranking/multi-domain-results.tex'
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, latex);
  console.log(`\nSaved to: ${outputPath}`);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const degreeResults = results.filter((r) => r.groundTruth === 'degree');
  const miWins = degreeResults.filter((r) => r.mi >= r.random && r.mi >= r.degree && r.mi >= r.shortest);
  console.log(`MI wins: ${miWins.length}/${degreeResults.length} datasets (degree GT)`);

  if (degreeResults.length > 0) {
    const avgMI = degreeResults.reduce((s, r) => s + r.mi, 0) / degreeResults.length;
    const avgRandom = degreeResults.reduce((s, r) => s + r.random, 0) / degreeResults.length;
    console.log(`Average MI Spearman: ${avgMI.toFixed(3)}`);
    console.log(`Average Random Spearman: ${avgRandom.toFixed(3)}`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
