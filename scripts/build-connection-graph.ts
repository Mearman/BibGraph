#!/usr/bin/env tsx
/**
 * Build a connection graph between two OpenAlex entities via BFS traversal.
 *
 * Traverses relationships bidirectionally until N paths connect the two seed entities.
 * Caches fetched entities to disk for resumption if interrupted.
 *
 * Usage: pnpm tsx scripts/build-connection-graph.ts [--paths N] [--output path] [--cache path]
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';

import { BidirectionalBFS } from '../packages/algorithms/dist/index.js';
import { OpenAlexGraphExpander, type Entity, type EntityType } from './lib/openalex-graph-expander.js';

// ============================================================================
// Types
// ============================================================================

interface Edge {
  source: string;
  target: string;
  relationshipType: string;
}

interface GraphData {
  metadata: {
    seedA: string;
    seedB: string;
    pathsFound: number;
    totalEntities: number;
    totalEdges: number;
    generatedAt: string;
  };
  entities: Record<string, Entity>;
  edges: Edge[];
  paths: string[][];
}

// ============================================================================
// Configuration
// ============================================================================

const MAX_ITERATIONS = 2;
const MIN_ITERATIONS = 2;

// Default seed entities
const DEFAULT_SEED_A = 'https://openalex.org/A5035271865'; // Paul Erdős
const DEFAULT_SEED_B = 'https://openalex.org/A5017898742'; // Joseph Mearman

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeId(id: string): string {
  const match = id.match(/([WAISCFTPG]\d+)$/i);
  return match ? `https://openalex.org/${match[1].toUpperCase()}` : id;
}

function getEntityType(id: string): EntityType | null {
  if (!id || typeof id !== 'string') return null;

  const match = id.match(/([WAISCFTPG])\d+$/i);
  if (!match) return null;

  const prefix = match[1].toUpperCase();
  const typeMap: Record<string, EntityType> = {
    W: 'work',
    A: 'author',
    I: 'institution',
    S: 'source',
    C: 'concept',
    T: 'topic',
    F: 'funder',
    P: 'publisher',
  };

  return typeMap[prefix] ?? null;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      paths: { type: 'string', short: 'n', default: '1' },
      output: { type: 'string', short: 'o', default: 'fixtures/connection-graph.json' },
      seedA: { type: 'string', default: DEFAULT_SEED_A },
      seedB: { type: 'string', default: DEFAULT_SEED_B },
    },
  });

  const targetPaths = parseInt(values.paths ?? '1', 10);
  if (targetPaths < 1) {
    console.error('Error: --paths must be >= 1');
    process.exit(1);
  }

  const outputPath = resolve(process.cwd(), values.output ?? 'fixtures/connection-graph.json');

  const seedA = normalizeId(values.seedA ?? DEFAULT_SEED_A);
  const seedB = normalizeId(values.seedB ?? DEFAULT_SEED_B);

  console.log('Configuration:');
  console.log(`  Seed A: ${seedA}`);
  console.log(`  Seed B: ${seedB}`);
  console.log(`  Target paths: ${targetPaths}`);
  console.log(`  Output: ${outputPath}`);

  // Create OpenAlex expander (handles all API fetching and caching)
  const expander = new OpenAlexGraphExpander();

  // Fetch seed entities
  console.log(`\nFetching seed: ${seedA}`);
  const seedAData = await expander.fetchEntity(expander.idToApiUrl(seedA));
  if (!seedAData) {
    console.error(`Failed to fetch seed entity: ${seedA}`);
    process.exit(1);
  }
  const seedAType = getEntityType(seedA);
  if (!seedAType) {
    console.error(`Unknown entity type: ${seedA}`);
    process.exit(1);
  }
  expander.set(seedA, { id: seedA, type: seedAType, data: seedAData });
  console.log(`  ${seedAData.display_name ?? seedAData.title ?? seedA}`);

  console.log(`\nFetching seed: ${seedB}`);
  const seedBData = await expander.fetchEntity(expander.idToApiUrl(seedB));
  if (!seedBData) {
    console.error(`Failed to fetch seed entity: ${seedB}`);
    process.exit(1);
  }
  const seedBType = getEntityType(seedB);
  if (!seedBType) {
    console.error(`Unknown entity type: ${seedB}`);
    process.exit(1);
  }
  expander.set(seedB, { id: seedB, type: seedBType, data: seedBData });
  console.log(`  ${seedBData.display_name ?? seedBData.title ?? seedB}`);

  // Run bidirectional BFS (generic algorithm, no OpenAlex knowledge)
  console.log('\nStarting bidirectional BFS...');
  console.log(`  Seed A: ${seedA}`);
  console.log(`  Seed B: ${seedB}`);
  console.log(`  Target paths: ${targetPaths}`);

  const bfs = new BidirectionalBFS(expander, seedA, seedB, {
    targetPaths,
    maxIterations: MAX_ITERATIONS,
    minIterations: MIN_ITERATIONS,
  });

  const result = await bfs.search();

  console.log(`\nBFS complete after ${result.iterations} iterations`);
  console.log(`  Found ${result.paths.length} paths`);

  // Build graph data from results
  const entities = expander.getAllEntities();
  const edges = expander.getEdges();

  console.log(`  Total entities: ${entities.size}`);
  console.log(`  Total edges: ${edges.length}`);

  const entitiesObj: Record<string, Entity> = {};
  for (const [id, entity] of entities) {
    entitiesObj[id] = entity;
  }

  const graphData: GraphData = {
    metadata: {
      seedA,
      seedB,
      pathsFound: result.paths.length,
      totalEntities: entities.size,
      totalEdges: edges.length,
      generatedAt: new Date().toISOString(),
    },
    entities: entitiesObj,
    edges,
    paths: result.paths,
  };

  // Save result
  console.log(`\nWriting to ${outputPath}...`);
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  await writeFile(outputPath, JSON.stringify(graphData, null, 2), 'utf-8');

  console.log('Done!');
}

main().catch((error: unknown) => {
  console.error('Error:', error);
  process.exit(1);
});
