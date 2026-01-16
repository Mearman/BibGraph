#!/usr/bin/env npx tsx
/**
 * Node Explosion Mitigation Experiment (Phase 7)
 *
 * Demonstrates that degree-prioritised expansion mitigates node explosion
 * in graphs with hub structures by comparing nodes expanded before finding
 * a target number of paths.
 *
 * Key metrics:
 * - Nodes expanded to find N paths
 * - Hub expansions (high-degree nodes expanded)
 * - Time elapsed
 * - Path quality (diversity, coverage)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import type { GraphExpander, Neighbor } from '../packages/graph-expansion/dist/index.js';
import {
  DegreePrioritisedExpansion,
  StandardBfsExpansion,
  FrontierBalancedExpansion,
} from '../packages/graph-expansion/dist/index.js';
import {
  loadEdgeList,
  identifyHubNodes,
  type LoadedNode,
  type LoadedEdge,
} from '../packages/evaluation/dist/index.js';
import { Graph } from '../packages/algorithms/dist/index.js';

// ============================================================================
// Types
// ============================================================================

interface ExplosionResult {
  method: string;
  nodesExpanded: number;
  hubNodesExpanded: number;
  pathsFound: number;
  timeMs: number;
  avgPathLength: number;
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

const NUM_SEED_PAIRS = 30;
const TARGET_PATHS = 10;
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
// Instrumented Graph Expander
// ============================================================================

/**
 * Graph expander that tracks hub expansions.
 */
class InstrumentedGraphExpander implements GraphExpander<LoadedNode> {
  private adjacency: Map<string, Neighbor[]> = new Map();
  private degrees: Map<string, number> = new Map();
  private nodes: Map<string, LoadedNode> = new Map();
  private discoveredEdges: Array<{ source: string; target: string; type: string }> = [];
  private expandedNodes: Set<string> = new Set();
  private hubNodes: Set<string>;

  constructor(
    private readonly graph: Graph<LoadedNode, LoadedEdge>,
    directed: boolean,
    hubPercentile = 0.1
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

    // Identify hub nodes
    this.hubNodes = identifyHubNodes(this.degrees, hubPercentile);
  }

  async getNeighbors(nodeId: string): Promise<Neighbor[]> {
    this.expandedNodes.add(nodeId);
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

  getExpandedNodes(): Set<string> {
    return this.expandedNodes;
  }

  getHubNodesExpanded(): number {
    let count = 0;
    for (const node of this.expandedNodes) {
      if (this.hubNodes.has(node)) {
        count++;
      }
    }
    return count;
  }

  reset(): void {
    this.expandedNodes = new Set();
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
// Seed Pair Sampling (Hub-Connected)
// ============================================================================

/**
 * Sample seed pairs where the shortest path likely passes through a hub.
 * This tests hub avoidance behavior.
 */
function sampleHubConnectedPairs(
  graph: Graph<LoadedNode, LoadedEdge>,
  hubNodes: Set<string>,
  count: number,
  seed: number
): Array<[string, string]> {
  const random = createSeededRandom(seed);
  const nodes = graph.getAllNodes();
  const pairs: Array<[string, string]> = [];

  // Get neighbors of hub nodes
  const hubNeighbors = new Set<string>();
  for (const hubId of hubNodes) {
    const neighborsResult = graph.getNeighbors(hubId);
    const neighbors = neighborsResult.ok ? neighborsResult.value : [];
    for (const neighborId of neighbors) {
      if (!hubNodes.has(neighborId)) {
        hubNeighbors.add(neighborId);
      }
    }
  }

  const hubNeighborArray = [...hubNeighbors];

  // Sample pairs from hub neighbors (paths likely go through hubs)
  let attempts = 0;
  while (pairs.length < count && attempts < count * 100) {
    attempts++;

    if (hubNeighborArray.length < 2) {
      // Fallback to random pairs
      const i = Math.floor(random() * nodes.length);
      const j = Math.floor(random() * nodes.length);
      if (i !== j) {
        pairs.push([nodes[i].id, nodes[j].id]);
      }
    } else {
      const i = Math.floor(random() * hubNeighborArray.length);
      const j = Math.floor(random() * hubNeighborArray.length);
      if (i !== j) {
        const pair: [string, string] = [hubNeighborArray[i], hubNeighborArray[j]];
        const exists = pairs.some(
          ([a, b]) => (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
        );
        if (!exists) {
          pairs.push(pair);
        }
      }
    }
  }

  return pairs;
}

// ============================================================================
// Experiment Runner
// ============================================================================

async function runExplosionExperiment(
  methodName: string,
  expander: InstrumentedGraphExpander,
  seeds: [string, string]
): Promise<ExplosionResult | null> {
  expander.reset();

  const startTime = performance.now();
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
      default:
        return null;
    }
  } catch {
    return null;
  }

  const endTime = performance.now();

  const pathLengths = result.paths.map((p) => p.nodes.length);
  const avgPathLength =
    pathLengths.length > 0 ? pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length : 0;

  return {
    method: methodName,
    nodesExpanded: expander.getExpandedNodes().size,
    hubNodesExpanded: expander.getHubNodesExpanded(),
    pathsFound: result.paths.length,
    timeMs: endTime - startTime,
    avgPathLength,
  };
}

// ============================================================================
// LaTeX Generation
// ============================================================================

function generateLatexTable(results: Map<string, ExplosionResult[]>): string {
  const methods = ['Standard BFS', 'Frontier-Balanced', 'Degree-Prioritised'];

  let latex = `% Auto-generated node explosion experiment results
% Generated: ${new Date().toISOString()}

\\begin{table}[htbp]
  \\centering
  \\caption{Nodes expanded to find paths across benchmark graphs. Degree-prioritised expansion reduces exploration by avoiding premature hub expansion.}
  \\label{tab:node-explosion-generic}
  \\begin{tabular}{lrrrr}
    \\toprule
    \\textbf{Dataset} & \\textbf{Std BFS} & \\textbf{Frontier-Bal} & \\textbf{Degree-Pri} & \\textbf{Reduction} \\\\
    \\midrule
`;

  for (const [dataset, datasetResults] of results) {
    const avgByMethod: Record<string, number> = {};

    for (const method of methods) {
      const methodResults = datasetResults.filter((r) => r.method === method);
      if (methodResults.length > 0) {
        avgByMethod[method] =
          methodResults.reduce((s, r) => s + r.nodesExpanded, 0) / methodResults.length;
      }
    }

    const stdBfs = avgByMethod['Standard BFS'] ?? 0;
    const frontierBal = avgByMethod['Frontier-Balanced'] ?? 0;
    const degreePri = avgByMethod['Degree-Prioritised'] ?? 0;
    const reduction = stdBfs > 0 && degreePri > 0 ? (stdBfs / degreePri).toFixed(1) : 'N/A';

    latex += `    ${dataset} & ${Math.round(stdBfs)} & ${Math.round(frontierBal)} & \\textbf{${Math.round(degreePri)}} & ${reduction}$\\times$ \\\\\n`;
  }

  latex += `    \\bottomrule
  \\end{tabular}
\\end{table}

`;

  // Hub expansion table
  latex += `\\begin{table}[htbp]
  \\centering
  \\caption{Hub nodes expanded across methods. Lower values indicate better hub avoidance.}
  \\label{tab:hub-expansion}
  \\begin{tabular}{lrrr}
    \\toprule
    \\textbf{Dataset} & \\textbf{Std BFS} & \\textbf{Frontier-Bal} & \\textbf{Degree-Pri} \\\\
    \\midrule
`;

  for (const [dataset, datasetResults] of results) {
    const avgHubsByMethod: Record<string, number> = {};

    for (const method of methods) {
      const methodResults = datasetResults.filter((r) => r.method === method);
      if (methodResults.length > 0) {
        avgHubsByMethod[method] =
          methodResults.reduce((s, r) => s + r.hubNodesExpanded, 0) / methodResults.length;
      }
    }

    const stdBfs = avgHubsByMethod['Standard BFS'] ?? 0;
    const frontierBal = avgHubsByMethod['Frontier-Balanced'] ?? 0;
    const degreePri = avgHubsByMethod['Degree-Prioritised'] ?? 0;

    latex += `    ${dataset} & ${stdBfs.toFixed(1)} & ${frontierBal.toFixed(1)} & \\textbf{${degreePri.toFixed(1)}} \\\\\n`;
  }

  latex += `    \\bottomrule
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
  console.log(' Node Explosion Mitigation Experiment');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const allResults = new Map<string, ExplosionResult[]>();
  const methods = ['Standard BFS', 'Frontier-Balanced', 'Degree-Prioritised'];

  for (const dataset of DATASETS) {
    console.log(`\n── ${dataset.name} ──`);

    try {
      const graph = await loadDataset(dataset);
      console.log(`  Loaded: ${graph.getAllNodes().length} nodes, ${graph.getAllEdges().length} edges`);

      const expander = new InstrumentedGraphExpander(graph, dataset.directed, 0.1);
      const allDegrees = expander.getAllDegrees();
      const hubNodes = identifyHubNodes(allDegrees, 0.1);
      console.log(`  Hub nodes (top 10%): ${hubNodes.size}`);

      // Sample hub-connected seed pairs
      const seedPairs = sampleHubConnectedPairs(graph, hubNodes, NUM_SEED_PAIRS, RANDOM_SEED);
      console.log(`  Sampled ${seedPairs.length} hub-connected seed pairs`);

      const datasetResults: ExplosionResult[] = [];

      for (const [i, seeds] of seedPairs.entries()) {
        process.stdout.write(`\r  Running seed pair ${i + 1}/${seedPairs.length}...`);

        for (const method of methods) {
          const result = await runExplosionExperiment(method, expander, seeds);
          if (result && result.pathsFound >= 1) {
            datasetResults.push(result);
          }
        }
      }
      console.log();

      allResults.set(dataset.name, datasetResults);

      // Print summary
      console.log(`  Results summary:`);
      for (const method of methods) {
        const methodResults = datasetResults.filter((r) => r.method === method);
        if (methodResults.length > 0) {
          const avgNodes =
            methodResults.reduce((s, r) => s + r.nodesExpanded, 0) / methodResults.length;
          const avgHubs =
            methodResults.reduce((s, r) => s + r.hubNodesExpanded, 0) / methodResults.length;
          console.log(
            `    ${method.padEnd(20)}: ${Math.round(avgNodes)} nodes, ${avgHubs.toFixed(1)} hubs`
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
    '../Thesis/content/chapters/06-method/sections/node-explosion-results.tex'
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, latex);
  console.log(`\nSaved to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
