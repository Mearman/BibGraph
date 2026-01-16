/**
 * Benchmark Dataset Fixtures
 *
 * Provides standardised access to benchmark graph datasets for evaluation experiments.
 * Each dataset has known properties (node count, edge count, directed/undirected) and
 * can be loaded consistently across experiments.
 *
 * Datasets are stored in data/benchmarks/ relative to the repository root.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Graph } from '@bibgraph/algorithms';
import { loadEdgeList, type LoadedNode, type LoadedEdge } from '../loaders/index';

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata for a benchmark dataset.
 */
export interface BenchmarkDatasetMeta {
  /** Human-readable name */
  name: string;

  /** Short identifier for tables/logs */
  id: string;

  /** Brief description */
  description: string;

  /** Whether edges are directed */
  directed: boolean;

  /** Expected node count (approximate, for validation) */
  expectedNodes: number;

  /** Expected edge count (approximate, for validation) */
  expectedEdges: number;

  /** File path relative to data/benchmarks/ */
  relativePath: string;

  /** Delimiter for parsing (regex or string) */
  delimiter: string | RegExp;

  /** Source/citation for the dataset */
  source: string;
}

/**
 * A loaded benchmark dataset with graph and metadata.
 */
export interface LoadedBenchmark {
  /** The loaded graph */
  graph: Graph<LoadedNode, LoadedEdge>;

  /** Dataset metadata */
  meta: BenchmarkDatasetMeta;

  /** Actual node count after loading */
  nodeCount: number;

  /** Actual edge count after loading */
  edgeCount: number;
}

// ============================================================================
// Dataset Definitions
// ============================================================================

/**
 * Cora citation network.
 *
 * A citation network of machine learning papers.
 * Nodes are papers, edges are citations.
 */
export const CORA: BenchmarkDatasetMeta = {
  name: 'Cora',
  id: 'cora',
  description: 'Citation network of machine learning papers',
  directed: true,
  expectedNodes: 2708,
  expectedEdges: 5429,
  relativePath: 'cora/cora.edges',
  delimiter: /,/,
  source: 'McCallum et al., Automating the Construction of Internet Portals with Machine Learning, 2000',
};

/**
 * CiteSeer citation network.
 *
 * A citation network of computer science papers.
 * Nodes are papers, edges are citations.
 */
export const CITESEER: BenchmarkDatasetMeta = {
  name: 'CiteSeer',
  id: 'citeseer',
  description: 'Citation network of computer science papers',
  directed: true,
  expectedNodes: 3264,
  expectedEdges: 4536,
  relativePath: 'citeseer/citeseer.edges',
  delimiter: /,/,
  source: 'Giles et al., CiteSeer: An Automatic Citation Indexing System, 1998',
};

/**
 * Facebook ego network.
 *
 * Combined ego networks from Facebook, representing friendships.
 * Nodes are users, edges are friendships (undirected).
 */
export const FACEBOOK: BenchmarkDatasetMeta = {
  name: 'Facebook',
  id: 'facebook',
  description: 'Combined Facebook ego networks (friendships)',
  directed: false,
  expectedNodes: 4039,
  expectedEdges: 88234,
  relativePath: 'facebook/facebook_combined.txt',
  delimiter: /\s+/,
  source: 'Leskovec & McAuley, Learning to Discover Social Circles in Ego Networks, NIPS 2012',
};

/**
 * Zachary's Karate Club network.
 *
 * Classic social network of a university karate club.
 * Nodes are members, edges represent friendships outside the club.
 */
export const KARATE: BenchmarkDatasetMeta = {
  name: 'Karate Club',
  id: 'karate',
  description: "Zachary's Karate Club social network",
  directed: false,
  expectedNodes: 34,
  expectedEdges: 78,
  relativePath: 'karate/karate.edges',
  delimiter: /\s+/,
  source: 'Zachary, An Information Flow Model for Conflict and Fission in Small Groups, 1977',
};

/**
 * Les Misérables character co-appearance network.
 *
 * Characters from Victor Hugo's novel connected by co-appearance.
 * Nodes are characters, edges weighted by number of co-appearances.
 */
export const LESMIS: BenchmarkDatasetMeta = {
  name: 'Les Misérables',
  id: 'lesmis',
  description: 'Character co-appearance network from Les Misérables',
  directed: false,
  expectedNodes: 69,
  expectedEdges: 279,
  relativePath: 'lesmis/lesmis.edges',
  delimiter: /\s+/,
  source: 'Knuth, The Stanford GraphBase: A Platform for Combinatorial Computing, 1993',
};

/**
 * DBLP co-authorship network.
 *
 * Large-scale collaboration network from computer science bibliography.
 * Nodes are authors, edges represent co-authorship on publications.
 * Note: This is a large dataset (300K+ nodes) and may take time to load.
 */
export const DBLP: BenchmarkDatasetMeta = {
  name: 'DBLP',
  id: 'dblp',
  description: 'DBLP computer science co-authorship network',
  directed: false,
  expectedNodes: 317080,
  expectedEdges: 1049866,
  relativePath: 'dblp/com-dblp.ungraph.txt',
  delimiter: /\t/,
  source: 'Yang & Leskovec, Defining and Evaluating Network Communities based on Ground-truth, ICDM 2012',
};

/**
 * All available benchmark datasets.
 */
export const BENCHMARK_DATASETS: BenchmarkDatasetMeta[] = [CORA, CITESEER, FACEBOOK, KARATE, LESMIS, DBLP];

/**
 * Map of dataset IDs to metadata.
 */
export const DATASETS_BY_ID: Map<string, BenchmarkDatasetMeta> = new Map(
  BENCHMARK_DATASETS.map((d) => [d.id, d])
);

// ============================================================================
// Loader Functions
// ============================================================================

/**
 * Resolve the path to a benchmark dataset file.
 *
 * @param meta - Dataset metadata
 * @param benchmarksRoot - Optional root directory for benchmarks (defaults to repo data/benchmarks/)
 * @returns Absolute path to the dataset file
 */
export function resolveBenchmarkPath(meta: BenchmarkDatasetMeta, benchmarksRoot?: string): string {
  if (benchmarksRoot) {
    return resolve(benchmarksRoot, meta.relativePath);
  }

  // Default: assume we're in packages/evaluation, go up to repo root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const repoRoot = resolve(__dirname, '..', '..', '..', '..');
  return resolve(repoRoot, 'data', 'benchmarks', meta.relativePath);
}

/**
 * Load a benchmark dataset.
 *
 * @param meta - Dataset metadata
 * @param benchmarksRoot - Optional root directory for benchmarks
 * @returns Loaded benchmark with graph and metadata
 * @throws Error if file not found or parsing fails
 */
export async function loadBenchmark(
  meta: BenchmarkDatasetMeta,
  benchmarksRoot?: string
): Promise<LoadedBenchmark> {
  const filePath = resolveBenchmarkPath(meta, benchmarksRoot);
  const content = await readFile(filePath, 'utf-8');

  const result = loadEdgeList(content, {
    directed: meta.directed,
    delimiter: meta.delimiter,
  });

  const nodeCount = result.graph.getAllNodes().length;
  const edgeCount = result.graph.getAllEdges().length;

  return {
    graph: result.graph,
    meta,
    nodeCount,
    edgeCount,
  };
}

/**
 * Load a benchmark dataset by ID.
 *
 * @param id - Dataset identifier (e.g., 'cora', 'citeseer', 'facebook')
 * @param benchmarksRoot - Optional root directory for benchmarks
 * @returns Loaded benchmark with graph and metadata
 * @throws Error if dataset ID not found
 */
export async function loadBenchmarkById(
  id: string,
  benchmarksRoot?: string
): Promise<LoadedBenchmark> {
  const meta = DATASETS_BY_ID.get(id.toLowerCase());
  if (!meta) {
    const available = BENCHMARK_DATASETS.map((d) => d.id).join(', ');
    throw new Error(`Unknown benchmark dataset: '${id}'. Available: ${available}`);
  }
  return loadBenchmark(meta, benchmarksRoot);
}

/**
 * Load all benchmark datasets.
 *
 * @param benchmarksRoot - Optional root directory for benchmarks
 * @returns Map of dataset ID to loaded benchmark
 */
export async function loadAllBenchmarks(
  benchmarksRoot?: string
): Promise<Map<string, LoadedBenchmark>> {
  const results = new Map<string, LoadedBenchmark>();

  for (const meta of BENCHMARK_DATASETS) {
    try {
      const benchmark = await loadBenchmark(meta, benchmarksRoot);
      results.set(meta.id, benchmark);
    } catch (err) {
      console.warn(`Failed to load benchmark '${meta.id}': ${err}`);
    }
  }

  return results;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get summary statistics for a loaded benchmark.
 *
 * @param benchmark - Loaded benchmark
 * @returns Summary string
 */
export function getBenchmarkSummary(benchmark: LoadedBenchmark): string {
  const { meta, nodeCount, edgeCount } = benchmark;
  const direction = meta.directed ? 'directed' : 'undirected';
  return `${meta.name}: ${nodeCount} nodes, ${edgeCount} edges (${direction})`;
}

/**
 * Validate that a loaded benchmark matches expected properties.
 *
 * @param benchmark - Loaded benchmark
 * @param tolerance - Allowed percentage difference (default 5%)
 * @returns Validation result with any warnings
 */
export function validateBenchmark(
  benchmark: LoadedBenchmark,
  tolerance = 0.05
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const { meta, nodeCount, edgeCount } = benchmark;

  const nodeDiff = Math.abs(nodeCount - meta.expectedNodes) / meta.expectedNodes;
  const edgeDiff = Math.abs(edgeCount - meta.expectedEdges) / meta.expectedEdges;

  if (nodeDiff > tolerance) {
    warnings.push(
      `Node count ${nodeCount} differs from expected ${meta.expectedNodes} by ${(nodeDiff * 100).toFixed(1)}%`
    );
  }

  if (edgeDiff > tolerance) {
    warnings.push(
      `Edge count ${edgeCount} differs from expected ${meta.expectedEdges} by ${(edgeDiff * 100).toFixed(1)}%`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
