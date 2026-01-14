#!/usr/bin/env tsx
/**
 * Generate a test fixture containing sampled works from OpenAlex API.
 *
 * Fetches 100 deterministic sample works and saves them to a JSON file.
 *
 * Usage: pnpm tsx scripts/generate-works-fixture.ts [output-path]
 */

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_URL = 'https://api.openalex.org/works?sample=100&seed=0&per_page=100';
const DEFAULT_OUTPUT = 'fixtures/works-sample.json';

interface OpenAlexResponse {
  meta: unknown;
  results: unknown[];
  group_by: unknown[];
}

interface WorksFixture {
  works: unknown[];
}

async function main(): Promise<void> {
  const outputPath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_OUTPUT);

  console.log(`Fetching works from ${API_URL}...`);

  const response = await fetch(API_URL, {
    headers: {
      'User-Agent': 'BibGraph/1.0 (https://github.com/jmearman/bibgraph)',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OpenAlexResponse;

  const fixture: WorksFixture = {
    works: data.results,
  };

  console.log(`Received ${fixture.works.length} works`);
  console.log(`Writing to ${outputPath}...`);

  await writeFile(outputPath, JSON.stringify(fixture, null, 2), 'utf-8');

  console.log('Done!');
}

main().catch((error: unknown) => {
  console.error('Error:', error);
  process.exit(1);
});
