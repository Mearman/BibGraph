#!/usr/bin/env npx tsx
/**
 * Structural Representativeness Experiment (Experiment 6.3)
 *
 * Validates that degree-prioritised expansion produces structurally representative
 * samples of the ground truth between-graph.
 *
 * Experiment Sets:
 * - Set A (N=2): Bidirectional expansion between seed pairs
 * - Set B (N=1): Single-seed ego network sampling
 * - Set C (N>=3): Multi-seed expansion (future)
 *
 * Compares sampled subgraphs against exhaustively enumerated ground truth.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import type { GraphExpander, Neighbor } from '../packages/graph-expansion/dist/index.js';
import {
  DegreePrioritisedExpansion,
  StandardBfsExpansion,
  FrontierBalancedExpansion,
  RandomPriorityExpansion,
} from '../packages/graph-expansion/dist/index.js';
import {
  loadEdgeList,
  enumerateBetweenGraph,
  computeEgoNetwork as computeEgoNetworkGT,
  computeStructuralRepresentativeness,
  aggregateRepresentativenessResults,
  type LoadedNode,
  type LoadedEdge,
  type StructuralRepresentativenessResult,
} from '../packages/evaluation/dist/index.js';
import { Graph } from '../packages/algorithms/dist/index.js';

// ============================================================================
// Types
// ============================================================================

interface MethodResult {
  method: string;
  coverage: number;
  precision: number;
  f1Score: number;
  degreeKL: number;
  betweennessCorrelation: number;
}

interface DatasetConfig {
  name: string;
  path: string;
  directed: boolean;
  delimiter?: string | RegExp;
  /** Maximum path length for ground truth enumeration */
  maxPathLength?: number;
}

// ============================================================================
// Configuration
// ============================================================================

// Use smaller graphs for ground truth enumeration (exponential complexity)
const DATASETS: DatasetConfig[] = [
  {
    name: 'Cora',
    path: 'data/benchmarks/cora/cora.edges',
    directed: true,
    delimiter: /,/,
    maxPathLength: 5, // Limit path length for tractability
  },
  {
    name: 'CiteSeer',
    path: 'data/benchmarks/citeseer/citeseer.edges',
    directed: true,
    delimiter: /,/,
    maxPathLength: 5,
  },
];

const NUM_SEED_PAIRS = 10;
const RANDOM_SEED = 42;

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
// Graph Expander Adapter
// ============================================================================

class GraphExpanderAdapter implements GraphExpander<LoadedNode> {
  private adjacency: Map<string, Neighbor[]> = new Map();
  private degrees: Map<string, number> = new Map();
  private nodes: Map<string, LoadedNode> = new Map();

  constructor(
    private readonly graph: Graph<LoadedNode, LoadedEdge>,
    directed: boolean
  ) {
    for (const node of graph.getAllNodes()) {
      this.nodes.set(node.id, node);
      this.adjacency.set(node.id, []);
    }

    for (const edge of graph.getAllEdges()) {
      const neighbors = this.adjacency.get(edge.source) ?? [];
      neighbors.push({ targetId: edge.target, relationshipType: edge.type ?? 'edge' });
      this.adjacency.set(edge.source, neighbors);

      if (!directed) {
        const reverseNeighbors = this.adjacency.get(edge.target) ?? [];
        reverseNeighbors.push({ targetId: edge.source, relationshipType: edge.type ?? 'edge' });
        this.adjacency.set(edge.target, reverseNeighbors);
      }
    }

    for (const [nodeId, neighbors] of this.adjacency) {
      this.degrees.set(nodeId, neighbors.length);
    }
  }

  async getNeighbors(nodeId: string): Promise<Neighbor[]> {
    return this.adjacency.get(nodeId) ?? [];
  }

  getDegree(nodeId: string): number {
    return this.degrees.get(nodeId) ?? 0;
  }

  async getNode(nodeId: string): Promise<LoadedNode | null> {
    return this.nodes.get(nodeId) ?? null;
  }

  addEdge(): void {
    // No-op for this experiment
  }

  getAllDegrees(): Map<string, number> {
    return this.degrees;
  }
}

// ============================================================================
// Dataset Loading
// ============================================================================

async function loadDataset(config: DatasetConfig): Promise<Graph<LoadedNode, LoadedEdge>> {
  const fullPath = resolve(process.cwd(), config.path);
  const content = await readFile(fullPath, 'utf-8');

  const result = loadEdgeList(content, {
    directed: config.directed,
    delimiter: config.delimiter,
  });

  return result.graph;
}

// ============================================================================
// Seed Pair Sampling
// ============================================================================

function sampleSeedPairs(
  graph: Graph<LoadedNode, LoadedEdge>,
  count: number,
  seed: number
): Array<[string, string]> {
  const random = createSeededRandom(seed);
  const nodes = graph.getAllNodes();
  const pairs: Array<[string, string]> = [];

  while (pairs.length < count && pairs.length < (nodes.length * (nodes.length - 1)) / 2) {
    const i = Math.floor(random() * nodes.length);
    const j = Math.floor(random() * nodes.length);
    if (i !== j) {
      const pair: [string, string] = [nodes[i].id, nodes[j].id];
      const exists = pairs.some(
        ([a, b]) => (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      );
      if (!exists) {
        pairs.push(pair);
      }
    }
  }

  return pairs;
}

// ============================================================================
// Experiment Set A: N=2 Bidirectional
// ============================================================================

async function runSetA(
  graph: Graph<LoadedNode, LoadedEdge>,
  config: DatasetConfig
): Promise<Map<string, StructuralRepresentativenessResult[]>> {
  console.log('  Set A: N=2 Bidirectional Expansion');

  const expander = new GraphExpanderAdapter(graph, config.directed);
  const seedPairs = sampleSeedPairs(graph, NUM_SEED_PAIRS, RANDOM_SEED);
  const methods = ['Standard BFS', 'Frontier-Balanced', 'Degree-Prioritised', 'Random Priority'];
  const results = new Map<string, StructuralRepresentativenessResult[]>();

  for (const method of methods) {
    results.set(method, []);
  }

  for (const [i, [seedA, seedB]] of seedPairs.entries()) {
    process.stdout.write(`\r    Seed pair ${i + 1}/${seedPairs.length}...`);

    // Compute ground truth between-graph
    const groundTruth = enumerateBetweenGraph(graph, seedA, seedB, {
      maxPathLength: config.maxPathLength ?? 6,
      maxPaths: 5000,
      directed: config.directed,
    });

    if (groundTruth.nodes.size < 3) {
      continue; // Skip pairs with no meaningful between-graph
    }

    // Run each expansion method
    for (const method of methods) {
      let expansion;
      switch (method) {
        case 'Standard BFS':
          expansion = new StandardBfsExpansion(expander, [seedA, seedB]);
          break;
        case 'Frontier-Balanced':
          expansion = new FrontierBalancedExpansion(expander, [seedA, seedB]);
          break;
        case 'Degree-Prioritised':
          expansion = new DegreePrioritisedExpansion(expander, [seedA, seedB]);
          break;
        case 'Random Priority':
          expansion = new RandomPriorityExpansion(expander, [seedA, seedB], RANDOM_SEED);
          break;
        default:
          continue;
      }

      const result = await expansion.run();

      // Compute degrees for sampled nodes
      const sampledDegrees = new Map<string, number>();
      for (const nodeId of result.sampledNodes) {
        sampledDegrees.set(nodeId, expander.getDegree(nodeId));
      }

      // Compute representativeness metrics
      const metrics = computeStructuralRepresentativeness(
        result.sampledNodes,
        groundTruth.nodes,
        sampledDegrees,
        groundTruth.degrees
      );

      results.get(method)!.push(metrics);
    }
  }
  console.log();

  return results;
}

// ============================================================================
// Experiment Set B: N=1 Ego Network
// ============================================================================

async function runSetB(
  graph: Graph<LoadedNode, LoadedEdge>,
  config: DatasetConfig
): Promise<Map<string, StructuralRepresentativenessResult[]>> {
  console.log('  Set B: N=1 Ego Network');

  const expander = new GraphExpanderAdapter(graph, config.directed);
  const nodes = graph.getAllNodes();
  const random = createSeededRandom(RANDOM_SEED);

  // Sample seed nodes
  const seedNodes: string[] = [];
  while (seedNodes.length < NUM_SEED_PAIRS) {
    const i = Math.floor(random() * nodes.length);
    if (!seedNodes.includes(nodes[i].id)) {
      seedNodes.push(nodes[i].id);
    }
  }

  const methods = ['Standard BFS', 'Degree-Prioritised', 'Random Priority'];
  const results = new Map<string, StructuralRepresentativenessResult[]>();

  for (const method of methods) {
    results.set(method, []);
  }

  for (const [i, seed] of seedNodes.entries()) {
    process.stdout.write(`\r    Seed ${i + 1}/${seedNodes.length}...`);

    // Compute ground truth ego network (k=3 hops)
    const groundTruth = computeEgoNetworkGT(graph, seed, 3);

    if (groundTruth.nodes.size < 3) {
      continue;
    }

    // Run each expansion method with single seed
    for (const method of methods) {
      let expansion;
      switch (method) {
        case 'Standard BFS':
          expansion = new StandardBfsExpansion(expander, [seed]);
          break;
        case 'Degree-Prioritised':
          expansion = new DegreePrioritisedExpansion(expander, [seed]);
          break;
        case 'Random Priority':
          expansion = new RandomPriorityExpansion(expander, [seed], RANDOM_SEED);
          break;
        default:
          continue;
      }

      const result = await expansion.run();

      const sampledDegrees = new Map<string, number>();
      for (const nodeId of result.sampledNodes) {
        sampledDegrees.set(nodeId, expander.getDegree(nodeId));
      }

      const metrics = computeStructuralRepresentativeness(
        result.sampledNodes,
        groundTruth.nodes,
        sampledDegrees,
        groundTruth.degrees
      );

      results.get(method)!.push(metrics);
    }
  }
  console.log();

  return results;
}

// ============================================================================
// LaTeX Generation
// ============================================================================

function generateLatexTable(
  datasetResults: Map<string, Map<string, StructuralRepresentativenessResult[]>>,
  experimentSet: string
): string {
  const methods = ['Standard BFS', 'Frontier-Balanced', 'Degree-Prioritised', 'Random Priority'];

  let latex = `% Auto-generated structural representativeness results (${experimentSet})
% Generated: ${new Date().toISOString()}

\\begin{table}[htbp]
  \\centering
  \\caption{Structural representativeness of sampled subgraphs (${experimentSet}). Higher coverage and lower KL divergence indicate better representation.}
  \\label{tab:representativeness-${experimentSet.toLowerCase().replace(/\s+/g, '-')}}
  \\begin{tabular}{llrrrr}
    \\toprule
    \\textbf{Graph} & \\textbf{Method} & \\textbf{Coverage} & \\textbf{Precision} & \\textbf{F1} & \\textbf{KL Div} \\\\
    \\midrule
`;

  for (const [dataset, methodResults] of datasetResults) {
    let first = true;
    for (const method of methods) {
      const results = methodResults.get(method);
      if (!results || results.length === 0) continue;

      const aggregated = aggregateRepresentativenessResults(results);
      const graphCol = first ? `\\multirow{4}{*}{${dataset}}` : '';
      first = false;

      const isBest = method === 'Degree-Prioritised';
      const fmt = (v: number) => (isBest ? `\\textbf{${v.toFixed(3)}}` : v.toFixed(3));

      latex += `    ${graphCol} & ${method} & ${fmt(aggregated.coverage)} & ${fmt(aggregated.precision)} & ${fmt(aggregated.f1Score)} & ${fmt(aggregated.degreeKL)} \\\\\n`;
    }
    latex += `    \\midrule\n`;
  }

  latex = latex.replace(/\\midrule\n$/, '\\bottomrule\n');
  latex += `  \\end{tabular}
\\end{table}
`;

  return latex;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Structural Representativeness Experiment (6.3)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const setAResults = new Map<string, Map<string, StructuralRepresentativenessResult[]>>();
  const setBResults = new Map<string, Map<string, StructuralRepresentativenessResult[]>>();

  for (const dataset of DATASETS) {
    console.log(`\n── ${dataset.name} ──`);

    try {
      const graph = await loadDataset(dataset);
      console.log(`  Loaded: ${graph.getAllNodes().length} nodes, ${graph.getAllEdges().length} edges`);

      // Run Set A (N=2)
      const setA = await runSetA(graph, dataset);
      setAResults.set(dataset.name, setA);

      // Print Set A summary
      console.log('    Set A Summary:');
      for (const [method, results] of setA) {
        if (results.length > 0) {
          const agg = aggregateRepresentativenessResults(results);
          console.log(`      ${method.padEnd(20)}: coverage=${agg.coverage.toFixed(3)}, KL=${agg.degreeKL.toFixed(3)}`);
        }
      }

      // Run Set B (N=1)
      const setB = await runSetB(graph, dataset);
      setBResults.set(dataset.name, setB);

      // Print Set B summary
      console.log('    Set B Summary:');
      for (const [method, results] of setB) {
        if (results.length > 0) {
          const agg = aggregateRepresentativenessResults(results);
          console.log(`      ${method.padEnd(20)}: coverage=${agg.coverage.toFixed(3)}, KL=${agg.degreeKL.toFixed(3)}`);
        }
      }
    } catch (err) {
      console.log(`  Error: ${err}`);
    }
  }

  // Generate LaTeX
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log(' LaTeX Output');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const latexA = generateLatexTable(setAResults, 'Set A: N=2');
  const latexB = generateLatexTable(setBResults, 'Set B: N=1');

  console.log(latexA);
  console.log(latexB);

  // Save LaTeX
  const outputPath = resolve(
    process.cwd(),
    '../Thesis/content/chapters/06-method/sections/representativeness-results.tex'
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, latexA + '\n' + latexB);
  console.log(`\nSaved to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
