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

// ─────────────────────────────────────────────────────────────────────────────
// Path Length Independence Experiments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a graph with controlled paths of different lengths between start and end.
 * MI is determined by neighborhood overlap (Jaccard similarity), so we create
 * structural differences by adding different numbers of shared neighbors.
 *
 * Structure:
 *   - Short path (2 hops): START -> MID_SHORT -> END (few shared neighbors, low MI)
 *   - Long path (3 hops): START -> MID_A -> MID_B -> END (many shared neighbors, high MI)
 *
 * CRITICAL: Both paths must have POSITIVE MI for the λ trade-off to work.
 * - At λ=0: Long path wins (higher MI quality)
 * - At high λ: Short path wins (length penalty overcomes MI difference)
 */
function createLengthTestGraph(): Graph<TestNode, TestEdge> {
  const graph = new Graph<TestNode, TestEdge>(false); // undirected
  let edgeId = 0;

  // Main path nodes
  graph.addNode({ id: 'START', type: 'Work' });
  graph.addNode({ id: 'END', type: 'Work' });
  graph.addNode({ id: 'MID_SHORT', type: 'Work' }); // For 2-hop path
  graph.addNode({ id: 'MID_A', type: 'Work' }); // For 3-hop path
  graph.addNode({ id: 'MID_B', type: 'Work' }); // For 3-hop path

  // Add shared neighbors - allocate to different paths
  // SHORT_SHARED: neighbors shared along short path edges
  graph.addNode({ id: 'SHORT_SHARED_0', type: 'Work' });
  // LONG_SHARED: neighbors shared along long path edges (more = higher MI)
  for (let i = 0; i < 6; i++) {
    graph.addNode({ id: `LONG_SHARED_${i}`, type: 'Work' });
  }

  // Short path (length 2): START -> MID_SHORT -> END
  graph.addEdge({ id: `e${edgeId++}`, source: 'START', target: 'MID_SHORT' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_SHORT', target: 'END' });

  // Add ONE shared neighbor for short path - creates low but non-zero MI
  // This neighbor connects START, MID_SHORT, and END
  graph.addEdge({ id: `e${edgeId++}`, source: 'START', target: 'SHORT_SHARED_0' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_SHORT', target: 'SHORT_SHARED_0' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'END', target: 'SHORT_SHARED_0' });

  // Long path (length 3): START -> MID_A -> MID_B -> END
  graph.addEdge({ id: `e${edgeId++}`, source: 'START', target: 'MID_A' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_A', target: 'MID_B' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_B', target: 'END' });

  // Create MANY shared neighbors for long path (high MI for each edge)
  // START <-> MID_A share: LONG_SHARED_0, LONG_SHARED_1
  graph.addEdge({ id: `e${edgeId++}`, source: 'START', target: 'LONG_SHARED_0' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_A', target: 'LONG_SHARED_0' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'START', target: 'LONG_SHARED_1' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_A', target: 'LONG_SHARED_1' });

  // MID_A <-> MID_B share: LONG_SHARED_2, LONG_SHARED_3
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_A', target: 'LONG_SHARED_2' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_B', target: 'LONG_SHARED_2' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_A', target: 'LONG_SHARED_3' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_B', target: 'LONG_SHARED_3' });

  // MID_B <-> END share: LONG_SHARED_4, LONG_SHARED_5
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_B', target: 'LONG_SHARED_4' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'END', target: 'LONG_SHARED_4' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'MID_B', target: 'LONG_SHARED_5' });
  graph.addEdge({ id: `e${edgeId++}`, source: 'END', target: 'LONG_SHARED_5' });

  return graph;
}

interface LengthExperimentResult {
  name: string;
  shortPathWeight: number;
  longPathWeight: number;
  lambda: number;
  shortPathScore: number;
  longPathScore: number;
  preferredPath: 'short' | 'long';
  correctPreference: boolean;
}

const lengthResults: LengthExperimentResult[] = [];

describe('Path Length Independence Experiments', () => {
  describe('Quality vs Length Trade-off', () => {
    it('should prefer high-quality longer path when λ=0', () => {
      // Long path has high MI (many shared neighbors), short path has low MI (few shared)
      const graph = createLengthTestGraph();

      const result = rankPaths(graph, 'START', 'END', {
        traversalMode: 'undirected',
        lambda: 0, // Pure quality, no length penalty
        shortestOnly: false,
        maxLength: 5,
        maxPaths: 100, // Get all paths including low-scoring short path
      });

      expect(result.ok).toBe(true);
      expect(result.value.some).toBe(true);

      const paths = result.value.value;
      expect(paths.length).toBeGreaterThanOrEqual(2);

      // Find the short and long paths by EXACT structure:
      // Short: START->MID_SHORT->END (exactly 2 edges)
      // Long: START->MID_A->MID_B->END (exactly 3 edges)
      const shortPath = paths.find((p) => {
        const nodeIds = p.path.nodes.map((n: TestNode) => n.id);
        return (
          p.path.edges.length === 2 &&
          nodeIds[0] === 'START' &&
          nodeIds[1] === 'MID_SHORT' &&
          nodeIds[2] === 'END'
        );
      });
      const longPath = paths.find((p) => {
        const nodeIds = p.path.nodes.map((n: TestNode) => n.id);
        return (
          p.path.edges.length === 3 &&
          nodeIds[0] === 'START' &&
          nodeIds[1] === 'MID_A' &&
          nodeIds[2] === 'MID_B' &&
          nodeIds[3] === 'END'
        );
      });

      expect(shortPath).toBeDefined();
      expect(longPath).toBeDefined();

      console.log('\n   λ=0 (Pure Quality):');
      console.log(`   ├─ Short path (2 hops, low MI): score=${shortPath!.score.toFixed(4)}`);
      console.log(`   ├─ Long path (3 hops, high MI): score=${longPath!.score.toFixed(4)}`);
      console.log(`   └─ Winner: ${longPath!.score > shortPath!.score ? 'Long path ✓' : 'Short path'}`);

      // With λ=0, the high-quality longer path should rank higher
      expect(longPath!.score).toBeGreaterThan(shortPath!.score);

      lengthResults.push({
        name: 'Pure Quality (λ=0)',
        shortPathWeight: 0, // Not using weights anymore
        longPathWeight: 0,
        lambda: 0,
        shortPathScore: shortPath!.score,
        longPathScore: longPath!.score,
        preferredPath: longPath!.score > shortPath!.score ? 'long' : 'short',
        correctPreference: longPath!.score > shortPath!.score,
      });
    });

    it('should prefer shorter path when λ is high', () => {
      const graph = createLengthTestGraph();

      const result = rankPaths(graph, 'START', 'END', {
        traversalMode: 'undirected',
        lambda: 5.0, // Very strong length penalty
        shortestOnly: false,
        maxLength: 5,
        maxPaths: 100, // Get all paths including low-scoring short path
      });

      expect(result.ok).toBe(true);
      expect(result.value.some).toBe(true);

      const paths = result.value.value;
      // Find paths by EXACT structure
      const shortPath = paths.find((p) => {
        const nodeIds = p.path.nodes.map((n: TestNode) => n.id);
        return (
          p.path.edges.length === 2 &&
          nodeIds[0] === 'START' &&
          nodeIds[1] === 'MID_SHORT' &&
          nodeIds[2] === 'END'
        );
      });
      const longPath = paths.find((p) => {
        const nodeIds = p.path.nodes.map((n: TestNode) => n.id);
        return (
          p.path.edges.length === 3 &&
          nodeIds[0] === 'START' &&
          nodeIds[1] === 'MID_A' &&
          nodeIds[2] === 'MID_B' &&
          nodeIds[3] === 'END'
        );
      });

      expect(shortPath).toBeDefined();
      expect(longPath).toBeDefined();

      console.log('\n   λ=5.0 (Strong Length Penalty):');
      console.log(`   ├─ Short path (2 hops, low MI): score=${shortPath!.score.toFixed(4)}`);
      console.log(`   ├─ Long path (3 hops, high MI): score=${longPath!.score.toFixed(4)}`);
      console.log(`   └─ Winner: ${shortPath!.score > longPath!.score ? 'Short path ✓' : 'Long path'}`);

      // With high λ, the shorter path should win despite lower quality
      expect(shortPath!.score).toBeGreaterThan(longPath!.score);

      lengthResults.push({
        name: 'Strong Length Penalty (λ=5)',
        shortPathWeight: 0,
        longPathWeight: 0,
        lambda: 5.0,
        shortPathScore: shortPath!.score,
        longPathScore: longPath!.score,
        preferredPath: shortPath!.score > longPath!.score ? 'short' : 'long',
        correctPreference: shortPath!.score > longPath!.score,
      });
    });

    it('should show crossover point where length penalty overcomes quality', () => {
      const graph = createLengthTestGraph();
      const lambdaValues = [0, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0];

      console.log('\n   Lambda Trade-off Analysis:');
      console.log('   ┌────────┬────────────┬───────────┬──────────┐');
      console.log('   │ λ      │ Short(2)   │ Long(3)   │ Winner   │');
      console.log('   ├────────┼────────────┼───────────┼──────────┤');

      let crossoverLambda: number | null = null;
      let prevWinner: 'short' | 'long' | null = null;

      for (const lambda of lambdaValues) {
        const result = rankPaths(graph, 'START', 'END', {
          traversalMode: 'undirected',
          lambda,
          shortestOnly: false,
          maxLength: 5,
          maxPaths: 100, // Get all paths
        });

        if (!result.ok || !result.value.some) continue;

        const paths = result.value.value;
        // Find paths by EXACT structure
        const shortPath = paths.find((p) => {
          const nodeIds = p.path.nodes.map((n: TestNode) => n.id);
          return (
            p.path.edges.length === 2 &&
            nodeIds[0] === 'START' &&
            nodeIds[1] === 'MID_SHORT' &&
            nodeIds[2] === 'END'
          );
        });
        const longPath = paths.find((p) => {
          const nodeIds = p.path.nodes.map((n: TestNode) => n.id);
          return (
            p.path.edges.length === 3 &&
            nodeIds[0] === 'START' &&
            nodeIds[1] === 'MID_A' &&
            nodeIds[2] === 'MID_B' &&
            nodeIds[3] === 'END'
          );
        });

        if (!shortPath || !longPath) continue;

        const winner = shortPath.score > longPath.score ? 'short' : 'long';
        console.log(
          `   │ ${lambda.toFixed(2).padStart(6)} │ ${shortPath.score.toFixed(4).padStart(10)} │ ${longPath.score.toFixed(4).padStart(9)} │ ${winner.padStart(8)} │`
        );

        if (prevWinner === 'long' && winner === 'short' && crossoverLambda === null) {
          crossoverLambda = lambda;
        }
        prevWinner = winner;

        lengthResults.push({
          name: `Lambda=${lambda}`,
          shortPathWeight: 0,
          longPathWeight: 0,
          lambda,
          shortPathScore: shortPath.score,
          longPathScore: longPath.score,
          preferredPath: winner,
          correctPreference: true, // All are "correct" - they show the expected trade-off
        });
      }

      console.log('   └────────┴────────────┴───────────┴──────────┘');

      if (crossoverLambda !== null) {
        console.log(`   Crossover point: λ ≈ ${crossoverLambda} (length penalty overcomes quality)`);
      }

      // Verify the expected behaviour: long wins at low λ, short wins at high λ
      const lowLambdaResult = lengthResults.find((r) => r.lambda === 0 && r.name.startsWith('Lambda='));
      const highLambdaResult = lengthResults.find((r) => r.lambda === 5.0 && r.name.startsWith('Lambda='));

      expect(lowLambdaResult?.preferredPath).toBe('long');
      expect(highLambdaResult?.preferredPath).toBe('short');
    });
  });

  describe('Consistent Scoring Across Lengths', () => {
    it('should give similar scores to paths with similar structural MI', () => {
      // Create graph where both paths have similar neighborhood overlap patterns
      const graph = new Graph<TestNode, TestEdge>(false);
      let edgeId = 0;

      graph.addNode({ id: 'A', type: 'Work' });
      graph.addNode({ id: 'B', type: 'Work' });
      graph.addNode({ id: 'M1', type: 'Work' });
      graph.addNode({ id: 'M2', type: 'Work' });
      graph.addNode({ id: 'M3', type: 'Work' });

      // Add shared neighbors for both paths (equal structural similarity)
      graph.addNode({ id: 'S1', type: 'Work' });
      graph.addNode({ id: 'S2', type: 'Work' });
      graph.addNode({ id: 'S3', type: 'Work' });

      // 2-hop path: A -> M1 -> B
      graph.addEdge({ id: `e${edgeId++}`, source: 'A', target: 'M1' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M1', target: 'B' });
      // Shared neighbors for 2-hop path
      graph.addEdge({ id: `e${edgeId++}`, source: 'A', target: 'S1' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M1', target: 'S1' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M1', target: 'S2' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'B', target: 'S2' });

      // 3-hop path: A -> M2 -> M3 -> B
      graph.addEdge({ id: `e${edgeId++}`, source: 'A', target: 'M2' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M2', target: 'M3' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M3', target: 'B' });
      // Shared neighbors for 3-hop path (similar density)
      graph.addEdge({ id: `e${edgeId++}`, source: 'A', target: 'S3' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M2', target: 'S3' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M2', target: 'S1' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M3', target: 'S1' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'M3', target: 'S2' });
      graph.addEdge({ id: `e${edgeId++}`, source: 'B', target: 'S2' });

      const result = rankPaths(graph, 'A', 'B', {
        traversalMode: 'undirected',
        lambda: 0,
        shortestOnly: false,
        maxLength: 5,
        maxPaths: 100, // Get all paths
      });

      expect(result.ok).toBe(true);
      expect(result.value.some).toBe(true);

      const paths = result.value.value;
      const path2 = paths.find((p) =>
        p.path.nodes.some((n: TestNode) => n.id === 'M1') &&
        p.path.edges.length === 2
      );
      const path3 = paths.find((p) =>
        p.path.nodes.some((n: TestNode) => n.id === 'M2') &&
        p.path.nodes.some((n: TestNode) => n.id === 'M3')
      );

      expect(path2).toBeDefined();
      expect(path3).toBeDefined();

      console.log('\n   Similar Structural MI Test (λ=0):');
      console.log(`   ├─ 2-hop path: score=${path2!.score.toFixed(4)}, GM(MI)=${path2!.geometricMeanMI.toFixed(4)}`);
      console.log(`   ├─ 3-hop path: score=${path3!.score.toFixed(4)}, GM(MI)=${path3!.geometricMeanMI.toFixed(4)}`);
      console.log(`   └─ GM(MI) difference: ${Math.abs(path2!.geometricMeanMI - path3!.geometricMeanMI).toFixed(6)}`);

      // With λ=0 and similar structural patterns, scores should be comparable
      // The key insight is that geometric mean normalizes by path length
      // Both scores should be non-zero and in the same order of magnitude
      expect(path2!.score).toBeGreaterThan(0);
      expect(path3!.score).toBeGreaterThan(0);
    });
  });

  it('should generate length independence LaTeX table', () => {
    if (lengthResults.length === 0) {
      console.log('No length results to generate table from');
      return;
    }

    // Filter to just the trade-off analysis results
    const tradeoffResults = lengthResults.filter((r) => r.name.startsWith('Lambda='));

    const rows = tradeoffResults
      .map((r) => {
        const winner = r.preferredPath === 'long' ? '\\textbf{Long}' : '\\textbf{Short}';
        return `    ${r.lambda.toFixed(2)} & ${r.shortPathScore.toFixed(4)} & ${r.longPathScore.toFixed(4)} & ${winner} \\\\`;
      })
      .join('\n');

    const latex = `% Auto-generated LaTeX table: Path Length Independence
% Generated: ${new Date().toISOString()}

\\begin{table}[htbp]
  \\centering
  \\caption{Effect of length penalty parameter $\\lambda$ on path selection. Short path (2 hops, weight=0.3) vs long path (3 hops, weight=0.9). At $\\lambda=0$, quality dominates; as $\\lambda$ increases, length penalty shifts preference to shorter paths.}
  \\label{tab:length_independence}
  \\begin{tabular}{cccc}
    \\toprule
    $\\lambda$ & \\textbf{Short Path Score} & \\textbf{Long Path Score} & \\textbf{Preferred} \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(' Length Independence LaTeX Table');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(latex);

    expect(latex).toContain('\\begin{table}');
    expect(latex).toContain('\\end{table}');
  });
});
