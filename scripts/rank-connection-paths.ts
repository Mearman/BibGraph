/**
 * Rank paths in connection graph using information-theoretic path ranking.
 *
 * Applies the MI-based path ranking algorithm to the 38 paths discovered
 * between Erdős and Joseph Mearman in the connection graph.
 *
 * Usage:
 *   npx tsx scripts/rank-connection-paths.ts [options]
 *
 * Options:
 *   --input <path>          Path to connection-graph.json (default: fixtures/connection-graph.json)
 *   --output <path>         Path to output ranked paths JSON (default: fixtures/ranked-paths.json)
 *   --lambda <num>          Length penalty parameter (default: 0 = no penalty)
 *   --degree-penalty        Enable degree-based exponential penalty
 *   --idf-weighting         Enable IDF-style weighting
 *   --edge-type-rarity      Enable edge type rarity penalty
 *   --penalty-factor <num>  Penalty factor for degree-based penalty (default: 0.5)
 *
 * @module scripts/rank-connection-paths
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Graph } from '../packages/algorithms/src/graph/graph.js';
import { rankPaths } from '../packages/algorithms/src/pathfinding/path-ranking.js';
import { type Entity, type EntityType } from './lib/entity-extraction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface ConnectionGraph {
  metadata: {
    seedA: string;
    seedB: string;
    pathsFound: number;
    totalEntities: number;
    totalEdges: number;
    generatedAt: string;
  };
  entities: Record<string, Entity>;
  edges: Array<{
    source: string;
    target: string;
    relationshipType: string;
  }>;
  paths: string[][];
}

interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  [key: string]: unknown;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  [key: string]: unknown;
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): {
  inputPath: string;
  outputPath: string;
  lambda: number;
  useDegreeBasedPenalty: boolean;
  useIDFWeighting: boolean;
  useEdgeTypeRarity: boolean;
  degreeBasedPenaltyFactor: number;
} {
  const args = process.argv.slice(2);
  let inputPath = resolve(__dirname, 'fixtures/connection-graph.json');
  let outputPath = resolve(__dirname, 'fixtures/ranked-paths.json');
  let lambda = 0;
  let useDegreeBasedPenalty = false;
  let useIDFWeighting = false;
  let useEdgeTypeRarity = false;
  let degreeBasedPenaltyFactor = 0.5;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
        inputPath = resolve(args[++i]);
        break;
      case '--output':
        outputPath = resolve(args[++i]);
        break;
      case '--lambda':
        lambda = parseFloat(args[++i]);
        if (isNaN(lambda) || lambda < 0) {
          throw new Error('Lambda must be a non-negative number');
        }
        break;
      case '--degree-penalty':
        useDegreeBasedPenalty = true;
        break;
      case '--idf-weighting':
        useIDFWeighting = true;
        break;
      case '--edge-type-rarity':
        useEdgeTypeRarity = true;
        break;
      case '--penalty-factor':
        degreeBasedPenaltyFactor = parseFloat(args[++i]);
        if (isNaN(degreeBasedPenaltyFactor) || degreeBasedPenaltyFactor < 0) {
          throw new Error('Penalty factor must be a non-negative number');
        }
        break;
      case '--help':
        console.log(`
Usage: npx tsx scripts/rank-connection-paths.ts [options]

Options:
  --input <path>          Path to connection-graph.json (default: fixtures/connection-graph.json)
  --output <path>         Path to output ranked paths JSON (default: fixtures/ranked-paths.json)
  --lambda <num>          Length penalty parameter (default: 0 = no penalty)
  --degree-penalty        Enable degree-based exponential penalty
  --idf-weighting         Enable IDF-style weighting
  --edge-type-rarity      Enable edge type rarity penalty
  --penalty-factor <num>  Penalty factor for degree-based penalty (default: 0.5)
  --help                  Show this help message
        `);
        process.exit(0);
    }
  }

  return {
    inputPath,
    outputPath,
    lambda,
    useDegreeBasedPenalty,
    useIDFWeighting,
    useEdgeTypeRarity,
    degreeBasedPenaltyFactor,
  };
}

// ============================================================================
// Graph Construction
// ============================================================================

/**
 * Build Graph from connection graph data.
 */
function buildGraph(data: ConnectionGraph): Graph<GraphNode, GraphEdge> {
  const graph = new Graph<GraphNode, GraphEdge>(false); // Undirected

  console.log('Building graph...');
  console.log(`  Entities: ${Object.keys(data.entities).length}`);
  console.log(`  Edges: ${data.edges.length}`);

  // Add nodes
  for (const [id, entity] of Object.entries(data.entities)) {
    const displayName =
      typeof entity.data.display_name === 'string'
        ? entity.data.display_name
        : String(entity.data.display_name ?? id);

    graph.addNode({
      id,
      type: entity.type,
      label: displayName,
    });
  }

  // Add edges
  let edgeIdCounter = 0;
  for (const edge of data.edges) {
    graph.addEdge({
      id: `edge-${edgeIdCounter++}`,
      source: edge.source,
      target: edge.target,
      type: edge.relationshipType,
    });
  }

  console.log(`  Graph nodes: ${graph.getNodeCount()}`);
  console.log(`  Graph edges: ${graph.getEdgeCount()}`);

  return graph;
}

// ============================================================================
// Path Ranking
// ============================================================================

/**
 * Rank paths and format results.
 */
async function rankConnectionPaths(
  graph: Graph<GraphNode, GraphEdge>,
  seedA: string,
  seedB: string,
  lambda: number,
  useDegreeBasedPenalty: boolean,
  useIDFWeighting: boolean,
  useEdgeTypeRarity: boolean,
  degreeBasedPenaltyFactor: number,
): Promise<any[]> {
  console.log('\nRanking paths...');
  console.log(`  Seed A: ${seedA}`);
  console.log(`  Seed B: ${seedB}`);
  console.log(`  Lambda: ${lambda}`);
  console.log(`  Penalties:`);
  console.log(`    Degree-based: ${useDegreeBasedPenalty} (factor: ${degreeBasedPenaltyFactor})`);
  console.log(`    IDF weighting: ${useIDFWeighting}`);
  console.log(`    Edge type rarity: ${useEdgeTypeRarity}`);

  const result = rankPaths(graph, seedA, seedB, {
    traversalMode: 'undirected',
    lambda,
    maxPaths: 1000, // Return all paths
    miConfig: {
      // Use node types for heterogeneous graph MI computation
      useEdgeTypes: true, // Also use edge relationship types
      // Apply penalties to reduce MI for high-degree nodes and common edge types
      useDegreeBasedPenalty,
      degreeBasedPenaltyFactor,
      useIDFWeighting,
      useEdgeTypeRarity,
    },
  });

  if (!result.ok) {
    throw new Error(`Path ranking failed: ${result.error.message}`);
  }

  if (!result.value.some) {
    throw new Error('No paths found between seeds');
  }

  const rankedPaths = result.value.value;
  console.log(`  Ranked ${rankedPaths.length} paths`);

  // Display top 10 paths
  console.log('\nTop 10 paths by MI score:');
  for (let i = 0; i < Math.min(10, rankedPaths.length); i++) {
    const ranked = rankedPaths[i];
    const pathLength = ranked.path.edges.length;
    const nodeLabels = ranked.path.nodes.map((n) => n.label).join(' → ');

    console.log(`\n${i + 1}. Score: ${ranked.score.toFixed(6)}`);
    console.log(`   Geometric Mean MI: ${ranked.geometricMeanMI.toFixed(6)}`);
    console.log(`   Length: ${pathLength} hops`);
    if (ranked.lengthPenalty !== undefined) {
      console.log(`   Length Penalty: ${ranked.lengthPenalty.toFixed(6)}`);
    }
    console.log(`   Path: ${nodeLabels}`);
    console.log(
      `   Edge MI values: [${ranked.edgeMIValues.map((v) => v.toFixed(4)).join(', ')}]`,
    );
  }

  return rankedPaths as any;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    const {
      inputPath,
      outputPath,
      lambda,
      useDegreeBasedPenalty,
      useIDFWeighting,
      useEdgeTypeRarity,
      degreeBasedPenaltyFactor,
    } = parseArgs();

    console.log('Information-Theoretic Path Ranking');
    console.log('===================================\n');
    console.log(`Input: ${inputPath}`);
    console.log(`Output: ${outputPath}`);
    console.log(`Lambda: ${lambda}`);

    // Load connection graph
    console.log('Loading connection graph...');
    const jsonContent = await readFile(inputPath, 'utf-8');
    const data: ConnectionGraph = JSON.parse(jsonContent);

    console.log(`  Metadata:`);
    console.log(`    Seed A: ${data.metadata.seedA}`);
    console.log(`    Seed B: ${data.metadata.seedB}`);
    console.log(`    Paths found: ${data.metadata.pathsFound}`);
    console.log(`    Generated: ${data.metadata.generatedAt}\n`);

    // Build graph
    const graph = buildGraph(data);

    // Rank paths
    const rankedPaths = await rankConnectionPaths(
      graph,
      data.metadata.seedA,
      data.metadata.seedB,
      lambda,
      useDegreeBasedPenalty,
      useIDFWeighting,
      useEdgeTypeRarity,
      degreeBasedPenaltyFactor,
    );

    // Save results
    console.log(`\nWriting results to ${outputPath}...`);
    await writeFile(
      outputPath,
      JSON.stringify(
        {
          metadata: {
            ...data.metadata,
            rankedAt: new Date().toISOString(),
            lambda,
            algorithm: 'information-theoretic-path-ranking',
          },
          rankedPaths: rankedPaths.map((rp: any) => ({
            score: rp.score,
            geometricMeanMI: rp.geometricMeanMI,
            edgeMIValues: rp.edgeMIValues,
            lengthPenalty: rp.lengthPenalty,
            path: rp.path.nodes.map((n: any) => ({
              id: n.id,
              type: n.type,
              label: n.label,
            })),
            edges: rp.path.edges.map((e: any) => ({
              source: e.source,
              target: e.target,
              type: e.type,
            })),
          })),
        },
        null,
        2,
      ),
    );

    console.log('Done!');
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

main();
