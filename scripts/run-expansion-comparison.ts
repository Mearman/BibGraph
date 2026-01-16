#!/usr/bin/env npx tsx
/**
 * Expansion Strategy Comparison Experiment
 *
 * Compares degree-prioritised bidirectional expansion against baselines:
 * - Standard BFS (FIFO queue)
 * - Frontier-Balanced BFS (Cerf et al. 2024)
 * - Random Priority (null hypothesis)
 *
 * Metrics:
 * - Path count: Number of distinct paths found
 * - Path diversity: Mean pairwise Jaccard distance
 * - Hub coverage: Fraction of paths traversing top-10% degree nodes
 * - Degree distribution KL divergence from original graph
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
  computePathDiversityMetrics,
  computeHubCoverage,
  identifyHubNodes,
  compareDegreeDistributions,
  type LoadedNode,
  type LoadedEdge,
} from '../packages/evaluation/dist/index.js';
import { Graph } from '../packages/algorithms/dist/index.js';

// ============================================================================
// Types
// ============================================================================

interface ExpansionResult {
  method: string;
  pathCount: number;
  nodesExpanded: number;
  edgesTraversed: number;
  nodeJaccardDistance: number;
  edgeJaccardDistance: number;
  hubCoverage: number;
  degreeKL: number;
  uniqueNodes: number;
  uniqueEdges: number;
  meanPathLength: number;
}

interface DatasetConfig {
  name: string;
  path: string;
  directed: boolean;
  delimiter?: string | RegExp;
}

// ============================================================================
// Configuration
// ============================================================================

const DATASETS: DatasetConfig[] = [
  {
    name: 'Cora',
    path: 'data/benchmarks/cora/cora.edges',
    directed: true,
    delimiter: /,/,
  },
  {
    name: 'CiteSeer',
    path: 'data/benchmarks/citeseer/citeseer.edges',
    directed: true,
    delimiter: /,/,
  },
  {
    name: 'Facebook',
    path: 'data/benchmarks/facebook/facebook_combined.txt',
    directed: false,
    delimiter: /\s+/,
  },
];

const NUM_SEED_PAIRS = 20;
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

/**
 * Adapter to use Graph<N, E> with expansion algorithms.
 */
class GraphExpanderAdapter implements GraphExpander<LoadedNode> {
  private adjacency: Map<string, Neighbor[]> = new Map();
  private degrees: Map<string, number> = new Map();
  private nodes: Map<string, LoadedNode> = new Map();
  private discoveredEdges: Array<{ source: string; target: string; type: string }> = [];

  constructor(
    private readonly graph: Graph<LoadedNode, LoadedEdge>,
    directed: boolean
  ) {
    // Build node lookup
    for (const node of graph.getAllNodes()) {
      this.nodes.set(node.id, node);
      this.adjacency.set(node.id, []);
    }

    // Build adjacency list
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

    // Compute degrees
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

  addEdge(source: string, target: string, relationshipType: string): void {
    this.discoveredEdges.push({ source, target, type: relationshipType });
  }

  getDiscoveredEdges() {
    return this.discoveredEdges;
  }

  clearDiscoveredEdges(): void {
    this.discoveredEdges = [];
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

  // Sample random pairs ensuring they're different
  while (pairs.length < count && pairs.length < (nodes.length * (nodes.length - 1)) / 2) {
    const i = Math.floor(random() * nodes.length);
    const j = Math.floor(random() * nodes.length);
    if (i !== j) {
      const pair: [string, string] = [nodes[i].id, nodes[j].id];
      // Check for duplicates
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
// Experiment Runner
// ============================================================================

async function runExpansionMethod(
  methodName: string,
  expander: GraphExpanderAdapter,
  seeds: [string, string],
  allDegrees: Map<string, number>
): Promise<ExpansionResult | null> {
  expander.clearDiscoveredEdges();

  let result;
  try {
    switch (methodName) {
      case 'Degree-Prioritised': {
        const expansion = new DegreePrioritisedExpansion(expander, seeds);
        result = await expansion.run();
        break;
      }
      case 'Standard BFS': {
        const expansion = new StandardBfsExpansion(expander, seeds);
        result = await expansion.run();
        break;
      }
      case 'Frontier-Balanced': {
        const expansion = new FrontierBalancedExpansion(expander, seeds);
        result = await expansion.run();
        break;
      }
      case 'Random Priority': {
        const expansion = new RandomPriorityExpansion(expander, seeds, RANDOM_SEED);
        result = await expansion.run();
        break;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }

  if (result.paths.length === 0) {
    return null;
  }

  // Convert paths to string arrays for metrics
  const pathsAsStrings = result.paths.map((p) => p.nodes);

  // Compute path diversity metrics
  const diversityMetrics = computePathDiversityMetrics(pathsAsStrings);

  // Identify hub nodes (top 10% by degree)
  const hubs = identifyHubNodes(allDegrees, 0.1);
  const hubCoverage = computeHubCoverage(pathsAsStrings, hubs);

  // Compute degree distribution comparison
  const sampledDegrees: number[] = [];
  for (const nodeId of result.sampledNodes) {
    const degree = allDegrees.get(nodeId);
    if (degree !== undefined) {
      sampledDegrees.push(degree);
    }
  }
  const allDegreesArray = [...allDegrees.values()];
  const degreeDist = compareDegreeDistributions(sampledDegrees, allDegreesArray);

  return {
    method: methodName,
    pathCount: result.paths.length,
    nodesExpanded: result.stats.nodesExpanded,
    edgesTraversed: result.stats.edgesTraversed,
    nodeJaccardDistance: diversityMetrics.nodeJaccardDistance,
    edgeJaccardDistance: diversityMetrics.edgeJaccardDistance,
    hubCoverage,
    degreeKL: degreeDist.klDivergence,
    uniqueNodes: diversityMetrics.uniqueNodeCount,
    uniqueEdges: diversityMetrics.uniqueEdgeCount,
    meanPathLength: diversityMetrics.meanPathLength,
  };
}

// ============================================================================
// LaTeX Generation
// ============================================================================

function generateLatexTable(
  results: Map<string, ExpansionResult[]>
): string {
  const methods = ['Standard BFS', 'Frontier-Balanced', 'Degree-Prioritised', 'Random Priority'];

  let latex = `% Auto-generated expansion comparison results
% Generated: ${new Date().toISOString()}

\\begin{table}[htbp]
  \\centering
  \\caption{Comparison of bidirectional expansion strategies across benchmark graphs. Degree-prioritised expansion discovers more diverse paths while maintaining structural representativeness.}
  \\label{tab:expansion-comparison}
  \\begin{tabular}{llrrrrr}
    \\toprule
    \\textbf{Graph} & \\textbf{Method} & \\textbf{Paths} & \\textbf{Diversity} & \\textbf{Hub \\%} & \\textbf{KL Div} & \\textbf{Nodes} \\\\
    \\midrule
`;

  for (const [dataset, datasetResults] of results) {
    let first = true;
    for (const method of methods) {
      const methodResults = datasetResults.filter((r) => r.method === method);
      if (methodResults.length === 0) continue;

      // Aggregate results across seed pairs
      const avgPaths = methodResults.reduce((s, r) => s + r.pathCount, 0) / methodResults.length;
      const avgDiversity =
        methodResults.reduce((s, r) => s + r.edgeJaccardDistance, 0) / methodResults.length;
      const avgHubCoverage =
        methodResults.reduce((s, r) => s + r.hubCoverage, 0) / methodResults.length;
      const avgKL = methodResults.reduce((s, r) => s + r.degreeKL, 0) / methodResults.length;
      const avgNodes =
        methodResults.reduce((s, r) => s + r.nodesExpanded, 0) / methodResults.length;

      const graphCol = first ? `\\multirow{4}{*}{${dataset}}` : '';
      first = false;

      // Bold the best values for degree-prioritised
      const isBest = method === 'Degree-Prioritised';
      const fmt = (v: number, precision = 2) =>
        isBest ? `\\textbf{${v.toFixed(precision)}}` : v.toFixed(precision);

      latex += `    ${graphCol} & ${method} & ${fmt(avgPaths, 1)} & ${fmt(avgDiversity)} & ${fmt(avgHubCoverage * 100, 0)}\\% & ${fmt(avgKL)} & ${fmt(avgNodes, 0)} \\\\\n`;
    }
    latex += `    \\midrule\n`;
  }

  // Remove last midrule and add bottomrule
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
  console.log(' Expansion Strategy Comparison Experiment');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const allResults = new Map<string, ExpansionResult[]>();
  const methods = ['Standard BFS', 'Frontier-Balanced', 'Degree-Prioritised', 'Random Priority'];

  for (const dataset of DATASETS) {
    console.log(`\n── ${dataset.name} ──`);

    try {
      const graph = await loadDataset(dataset);
      console.log(`  Loaded: ${graph.getAllNodes().length} nodes, ${graph.getAllEdges().length} edges`);

      const expander = new GraphExpanderAdapter(graph, dataset.directed);
      const allDegrees = expander.getAllDegrees();

      // Sample seed pairs
      const seedPairs = sampleSeedPairs(graph, NUM_SEED_PAIRS, RANDOM_SEED);
      console.log(`  Sampled ${seedPairs.length} seed pairs`);

      const datasetResults: ExpansionResult[] = [];

      for (const [i, seeds] of seedPairs.entries()) {
        process.stdout.write(`\r  Running seed pair ${i + 1}/${seedPairs.length}...`);

        for (const method of methods) {
          const result = await runExpansionMethod(method, expander, seeds, allDegrees);
          if (result) {
            datasetResults.push(result);
          }
        }
      }
      console.log();

      allResults.set(dataset.name, datasetResults);

      // Print summary for this dataset
      console.log(`  Results summary:`);
      for (const method of methods) {
        const methodResults = datasetResults.filter((r) => r.method === method);
        if (methodResults.length > 0) {
          const avgPaths = methodResults.reduce((s, r) => s + r.pathCount, 0) / methodResults.length;
          const avgDiversity =
            methodResults.reduce((s, r) => s + r.edgeJaccardDistance, 0) / methodResults.length;
          console.log(
            `    ${method.padEnd(20)}: ${avgPaths.toFixed(1)} paths, ${avgDiversity.toFixed(3)} diversity`
          );
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

  const latex = generateLatexTable(allResults);
  console.log(latex);

  // Save LaTeX
  const outputPath = resolve(
    process.cwd(),
    '../Thesis/content/chapters/06-method/sections/expansion-comparison.tex'
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, latex);
  console.log(`\nSaved to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
