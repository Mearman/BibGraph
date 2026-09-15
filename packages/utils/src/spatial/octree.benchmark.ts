/**
 * Performance benchmarks for Octree spatial indexing
 *
 * Run with: npx tsx packages/utils/src/spatial/octree.benchmark.ts
 */

import type { BoundingBox3D,Position3D } from '@bibgraph/types';

import type {Octree } from './octree';
import { createOctreeFromItems } from './octree';

/**
Upper bound on the number of warmup iterations run before timing a benchmark.
 */
const WARMUP_ITERATIONS_CAP = 100;
/**
Fraction of the real iteration count used to size the warmup run (1/WARMUP_SAMPLE_RATE).
 */
const WARMUP_SAMPLE_RATE = 10;
/**
Number of milliseconds in one second, used to convert an average time into an operations-per-second rate.
 */
const MS_PER_SECOND = 1000;
/**
Column width, in characters, for a benchmark's name in the printed results table.
 */
const NAME_COLUMN_WIDTH = 40;
/**
Number of decimal places shown for a benchmark's average time.
 */
const AVG_TIME_DECIMAL_PLACES = 4;
/**
Column width, in characters, for a benchmark's average time in the printed results table.
 */
const TIME_COLUMN_WIDTH = 10;
/**
Column width, in characters, for a benchmark's operations-per-second figure in the printed results table.
 */
const OPS_COLUMN_WIDTH = 12;
/**
Width, in characters, of the '=' separator rules printed around report sections.
 */
const SEPARATOR_WIDTH = 70;
const SMALL_NODE_COUNT = 100;
const MEDIUM_NODE_COUNT = 500;
const LARGE_NODE_COUNT = 1000;
const XLARGE_NODE_COUNT = 5000;
const XXLARGE_NODE_COUNT = 10_000;
/**
Node counts exercised by each benchmark round.
 */
const NODE_COUNTS = [SMALL_NODE_COUNT, MEDIUM_NODE_COUNT, LARGE_NODE_COUNT, XLARGE_NODE_COUNT, XXLARGE_NODE_COUNT];
/**
Node count above which a benchmark round uses fewer iterations to keep runtime reasonable.
 */
const LARGE_DATASET_THRESHOLD = 1000;
/**
Iteration count used for expensive per-round benchmarks once the dataset exceeds LARGE_DATASET_THRESHOLD.
 */
const FEW_ITERATIONS = 10;
/**
Iteration count used for expensive per-round benchmarks below LARGE_DATASET_THRESHOLD.
 */
const MANY_ITERATIONS = 100;
/**
Iteration count used for the cheaper, fixed-cost query benchmarks.
 */
const QUERY_BENCHMARK_ITERATIONS = 1000;
/**
Radius used for the sphere-query benchmark.
 */
const SPHERE_QUERY_RADIUS = 200;
/**
Neighbour count used for the k-nearest-neighbours benchmark.
 */
const K_NEAREST_COUNT = 10;
/**
Frame time budget, in milliseconds, for 60fps rendering.
 */
const FRAME_BUDGET_MS = 16.67;

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  opsPerSecond: number;
}

const benchmark = (name: string, function_: () => void, iterations = QUERY_BENCHMARK_ITERATIONS): BenchmarkResult => {
  // Warmup
  for (let index = 0; index < Math.min(WARMUP_ITERATIONS_CAP, iterations / WARMUP_SAMPLE_RATE); index++) {
    function_();
  }

  const start = performance.now();
  for (let index = 0; index < iterations; index++) {
    function_();
  }
  const totalTimeMs = performance.now() - start;
  const avgTimeMs = totalTimeMs / iterations;

  return {
    name,
    iterations,
    totalTimeMs,
    avgTimeMs,
    opsPerSecond: MS_PER_SECOND / avgTimeMs,
  };
};

const generateRandomPoints = (count: number, bounds: BoundingBox3D): Position3D[] => {
  const points: Position3D[] = [];
  const rangeX = bounds.max.x - bounds.min.x;
  const rangeY = bounds.max.y - bounds.min.y;
  const rangeZ = bounds.max.z - bounds.min.z;

  for (let index = 0; index < count; index++) {
    points.push({
      x: bounds.min.x + Math.random() * rangeX,
      y: bounds.min.y + Math.random() * rangeY,
      z: bounds.min.z + Math.random() * rangeZ,
    });
  }
  return points;
};

const formatResult = (result: Readonly<BenchmarkResult>): string => `${result.name.padEnd(NAME_COLUMN_WIDTH)} ${result.avgTimeMs.toFixed(AVG_TIME_DECIMAL_PLACES).padStart(TIME_COLUMN_WIDTH)}ms  ${Math.round(result.opsPerSecond).toLocaleString().padStart(OPS_COLUMN_WIDTH)} ops/s`;

const runBenchmarks = (): void => {
  console.log('='.repeat(SEPARATOR_WIDTH));
  console.log('Octree Performance Benchmarks');
  console.log('='.repeat(SEPARATOR_WIDTH));
  console.log('');

  const bounds: BoundingBox3D = {
    min: { x: -1000, y: -1000, z: -1000 },
    max: { x: 1000, y: 1000, z: 1000 },
  };

  const results: BenchmarkResult[] = [];

  // Test different data sizes
  for (const nodeCount of NODE_COUNTS) {
    console.log(`\n--- ${String(nodeCount)} nodes ---`);

    const points = generateRandomPoints(nodeCount, bounds);
    const items = points.map((p, index) => ({ position: p, data: `node-${String(index)}` }));

    // Build octree
    let octree: Octree<string>;
    results.push(benchmark(
      `Build octree (${String(nodeCount)} nodes)`,
      () => {
        octree = createOctreeFromItems(items);
      },
      nodeCount > LARGE_DATASET_THRESHOLD ? FEW_ITERATIONS : MANY_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

    // Create octree for queries
    octree = createOctreeFromItems(items);

    // Insert operations
    const newPoint = { x: 0, y: 0, z: 0 };
    results.push(benchmark(
      `Insert single node (${String(nodeCount)} existing)`,
      () => {
        const testOctree = createOctreeFromItems(items);
        testOctree.insert(newPoint, 'new-node');
      },
      nodeCount > LARGE_DATASET_THRESHOLD ? FEW_ITERATIONS : MANY_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

    // Range query (small region)
    const smallQuery: BoundingBox3D = {
      min: { x: -100, y: -100, z: -100 },
      max: { x: 100, y: 100, z: 100 },
    };
    results.push(benchmark(
      `Range query small (${String(nodeCount)} nodes)`,
      () => {
        octree.queryRange(smallQuery);
      },
      QUERY_BENCHMARK_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

    // Range query (large region)
    const largeQuery: BoundingBox3D = {
      min: { x: -500, y: -500, z: -500 },
      max: { x: 500, y: 500, z: 500 },
    };
    results.push(benchmark(
      `Range query large (${String(nodeCount)} nodes)`,
      () => {
        octree.queryRange(largeQuery);
      },
      QUERY_BENCHMARK_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

    // Sphere query
    results.push(benchmark(
      `Sphere query r=200 (${String(nodeCount)} nodes)`,
      () => {
        octree.querySphere({ x: 0, y: 0, z: 0 }, SPHERE_QUERY_RADIUS);
      },
      QUERY_BENCHMARK_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

    // Find nearest
    results.push(benchmark(
      `Find nearest (${String(nodeCount)} nodes)`,
      () => {
        octree.findNearest({ x: 0, y: 0, z: 0 });
      },
      QUERY_BENCHMARK_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

    // Find k-nearest (k=10)
    results.push(benchmark(
      `Find 10 nearest (${String(nodeCount)} nodes)`,
      () => {
        octree.findKNearest({ x: 0, y: 0, z: 0 }, K_NEAREST_COUNT);
      },
      QUERY_BENCHMARK_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));
  }

  console.log('\n' + '='.repeat(SEPARATOR_WIDTH));
  console.log('Benchmark Summary');
  console.log('='.repeat(SEPARATOR_WIDTH));
  console.log('');
  console.log('Performance targets for 60fps (16.67ms budget):');
  console.log('- Range queries should complete in <1ms');
  console.log('- Nearest neighbor should complete in <2ms');
  console.log('- Build time is acceptable if done once on load');
  console.log('');

  // Check if any operations exceed budget
  const slowOperations = results.filter(r => r.avgTimeMs > FRAME_BUDGET_MS);
  if (slowOperations.length > 0) {
    console.log('Operations exceeding frame budget:');
    for (const r of slowOperations) console.log(`  - ${r.name}: ${r.avgTimeMs.toFixed(2)}ms`);
  } else {
    console.log('All operations within frame budget!');
  }
};

// Only run when executed directly (not when imported)
if (import.meta.url.endsWith('octree.benchmark.ts')) {
  try {
    runBenchmarks();
  } catch (error) {
    console.error(error);
  }
}
