#!/usr/bin/env npx tsx
/**
 * Generate synthetic OpenAlex-like heterogeneous graph for experiments
 *
 * Creates a graph with the same entity types and relationships as OpenAlex
 * but with controlled structure suitable for path ranking evaluation.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';

// ============================================================================
// Types
// ============================================================================

type EntityType = 'work' | 'author' | 'institution' | 'source' | 'concept';

interface Entity {
  id: string;
  type: EntityType;
  citedByCount?: number;
  worksCount?: number;
}

interface Edge {
  source: string;
  target: string;
  type: string;
}

interface OpenAlexGraphData {
  metadata: {
    totalEntities: number;
    totalEdges: number;
    entityTypes: Record<string, number>;
    generatedAt: string;
    seed: number;
  };
  entities: Entity[];
  edges: Edge[];
}

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
// Graph Generator
// ============================================================================

function generateOpenAlexGraph(
  numWorks: number,
  numAuthors: number,
  numInstitutions: number,
  numSources: number,
  numConcepts: number,
  seed: number
): OpenAlexGraphData {
  const random = createSeededRandom(seed);
  const entities: Entity[] = [];
  const edges: Edge[] = [];

  // Create entities with importance metrics
  for (let i = 0; i < numWorks; i++) {
    entities.push({
      id: `W${i}`,
      type: 'work',
      citedByCount: Math.floor(Math.pow(random(), 2) * 1000), // Power law
    });
  }

  for (let i = 0; i < numAuthors; i++) {
    entities.push({
      id: `A${i}`,
      type: 'author',
      worksCount: Math.floor(Math.pow(random(), 2) * 100),
    });
  }

  for (let i = 0; i < numInstitutions; i++) {
    entities.push({
      id: `I${i}`,
      type: 'institution',
      worksCount: Math.floor(Math.pow(random(), 2) * 10000),
    });
  }

  for (let i = 0; i < numSources; i++) {
    entities.push({
      id: `S${i}`,
      type: 'source',
      worksCount: Math.floor(Math.pow(random(), 2) * 5000),
    });
  }

  for (let i = 0; i < numConcepts; i++) {
    entities.push({
      id: `C${i}`,
      type: 'concept',
      worksCount: Math.floor(Math.pow(random(), 2) * 50000),
    });
  }

  // Work → Author (authorship, 1-5 authors per work)
  for (let w = 0; w < numWorks; w++) {
    const numAuthorsForWork = 1 + Math.floor(random() * 4);
    for (let a = 0; a < numAuthorsForWork; a++) {
      const authorId = Math.floor(random() * numAuthors);
      edges.push({
        source: `W${w}`,
        target: `A${authorId}`,
        type: 'authored_by',
      });
    }
  }

  // Author → Institution (affiliation, 1-2 per author)
  for (let a = 0; a < numAuthors; a++) {
    const numAffiliations = 1 + Math.floor(random() * 2);
    for (let i = 0; i < numAffiliations; i++) {
      const instId = Math.floor(random() * numInstitutions);
      edges.push({
        source: `A${a}`,
        target: `I${instId}`,
        type: 'affiliated_with',
      });
    }
  }

  // Work → Source (published_in, 1 per work)
  for (let w = 0; w < numWorks; w++) {
    const sourceId = Math.floor(random() * numSources);
    edges.push({
      source: `W${w}`,
      target: `S${sourceId}`,
      type: 'published_in',
    });
  }

  // Work → Concept (has_concept, 2-5 per work)
  for (let w = 0; w < numWorks; w++) {
    const numConcepts = 2 + Math.floor(random() * 3);
    for (let c = 0; c < numConcepts; c++) {
      const conceptId = Math.floor(random() * numConcepts);
      edges.push({
        source: `W${w}`,
        target: `C${conceptId}`,
        type: 'has_concept',
      });
    }
  }

  // Work → Work (citations, preferential attachment)
  for (let w = 1; w < numWorks; w++) {
    const numCitations = 1 + Math.floor(random() * 5);
    for (let c = 0; c < numCitations && c < w; c++) {
      // Prefer citing higher cited works
      const weights = entities
        .slice(0, w)
        .filter((e) => e.type === 'work')
        .map((e) => (e.citedByCount ?? 1) + 1);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let r = random() * totalWeight;
      let targetIdx = 0;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          targetIdx = i;
          break;
        }
      }
      edges.push({
        source: `W${w}`,
        target: `W${targetIdx}`,
        type: 'cites',
      });
    }
  }

  // Count entity types
  const entityTypes: Record<string, number> = {};
  for (const entity of entities) {
    entityTypes[entity.type] = (entityTypes[entity.type] ?? 0) + 1;
  }

  return {
    metadata: {
      totalEntities: entities.length,
      totalEdges: edges.length,
      entityTypes,
      generatedAt: new Date().toISOString(),
      seed,
    },
    entities,
    edges,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      works: { type: 'string', default: '200' },
      authors: { type: 'string', default: '80' },
      institutions: { type: 'string', default: '20' },
      sources: { type: 'string', default: '30' },
      concepts: { type: 'string', default: '50' },
      seed: { type: 'string', default: '42' },
      output: { type: 'string', short: 'o', default: 'data/benchmarks/openalex/openalex-synthetic.json' },
    },
  });

  const numWorks = parseInt(values.works ?? '200', 10);
  const numAuthors = parseInt(values.authors ?? '80', 10);
  const numInstitutions = parseInt(values.institutions ?? '20', 10);
  const numSources = parseInt(values.sources ?? '30', 10);
  const numConcepts = parseInt(values.concepts ?? '50', 10);
  const seed = parseInt(values.seed ?? '42', 10);
  const outputPath = resolve(values.output ?? 'data/benchmarks/openalex/openalex-synthetic.json');

  console.log('=== Generating Synthetic OpenAlex Graph ===');
  console.log(`Works: ${numWorks}, Authors: ${numAuthors}, Institutions: ${numInstitutions}`);
  console.log(`Sources: ${numSources}, Concepts: ${numConcepts}`);
  console.log(`Seed: ${seed}`);
  console.log('');

  const graphData = generateOpenAlexGraph(
    numWorks,
    numAuthors,
    numInstitutions,
    numSources,
    numConcepts,
    seed
  );

  // Save
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(graphData, null, 2));

  console.log('=== Generation Complete ===');
  console.log(`Entities: ${graphData.metadata.totalEntities}`);
  console.log(`Edges: ${graphData.metadata.totalEdges}`);
  console.log(`Entity types: ${JSON.stringify(graphData.metadata.entityTypes)}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
