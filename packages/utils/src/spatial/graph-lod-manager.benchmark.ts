/**
 * Performance benchmarks for GraphLODManager
 *
 * Run with: npx tsx packages/utils/src/spatial/graph-lod-manager.benchmark.ts
 */

import type { Position3D } from '@bibgraph/types';

import { createFrustumBounds,extractFrustumPlanes, GraphLODManager } from './graph-lod-manager';

/**
Upper bound on the number of warmup iterations run before timing a benchmark.
 */
const WARMUP_ITERATIONS_CAP = 1000;
/**
Fraction of the real iteration count used to size the warmup run (1/WARMUP_SAMPLE_RATE).
 */
const WARMUP_SAMPLE_RATE = 10;
/**
Number of milliseconds in one second, used to convert an average time into an operations-per-second rate.
 */
const MS_PER_SECOND = 1000;
/**
Offset subtracted from Math.random() to centre generated jitter on zero.
 */
const JITTER_CENTER_OFFSET = 0.5;
/**
Column width, in characters, for a benchmark's name in the printed results table.
 */
const NAME_COLUMN_WIDTH = 45;
/**
Number of decimal places shown for a benchmark's average time.
 */
const AVG_TIME_DECIMAL_PLACES = 6;
/**
Column width, in characters, for a benchmark's average time in the printed results table.
 */
const TIME_COLUMN_WIDTH = 12;
/**
Column width, in characters, for a benchmark's operations-per-second figure in the printed results table.
 */
const OPS_COLUMN_WIDTH = 12;
/**
Width, in characters, of the '=' separator rules printed around report sections.
 */
const SEPARATOR_WIDTH = 75;
/**
Iteration count used for cheap, single-call benchmarks.
 */
const SINGLE_OP_ITERATIONS = 100_000;
/**
Default iteration count for a benchmark call that doesn't override it (also used explicitly for recordFrameTime).
 */
const DEFAULT_BENCHMARK_ITERATIONS = 10_000;
const SMALL_NODE_COUNT = 100;
const MEDIUM_NODE_COUNT = 500;
const LARGE_NODE_COUNT = 1000;
const XLARGE_NODE_COUNT = 5000;
/**
Node counts exercised by the batched LOD and frustum-culling benchmarks.
 */
const BATCH_NODE_COUNTS = [SMALL_NODE_COUNT, MEDIUM_NODE_COUNT, LARGE_NODE_COUNT, XLARGE_NODE_COUNT];
/**
Spread, in world units, of the random positions generated for the batch LOD benchmark.
 */
const BATCH_LOD_POSITION_SPREAD = 1000;
/**
Iteration count used for the batched getLOD benchmark.
 */
const BATCH_LOD_ITERATIONS = 1000;
/**
Bounding radius used for the frustum-culling benchmarks' test objects.
 */
const FRUSTUM_TEST_RADIUS = 10;
/**
Spread, in world units, of the random positions generated for the batch frustum-culling benchmark.
 */
const FRUSTUM_CULL_POSITION_SPREAD = 2000;
/**
Iteration count used for the batched frustum-culling benchmark.
 */
const BATCH_FRUSTUM_ITERATIONS = 100;
/**
Iteration count used for the matrix-operation benchmarks (extractFrustumPlanes, createFrustumBounds).
 */
const MATRIX_OPERATION_ITERATIONS = 10_000;
/**
Divisor applied to Pi to derive the demo camera's field of view in radians (45 degrees).
 */
const DEMO_CAMERA_FOV_DIVISOR = 4;
/**
Horizontal component of the demo camera's 16:9 aspect ratio.
 */
const DEMO_ASPECT_RATIO_WIDTH = 16;
/**
Vertical component of the demo camera's 16:9 aspect ratio.
 */
const DEMO_ASPECT_RATIO_HEIGHT = 9;
/**
Near clipping plane distance used for the demo camera frustum.
 */
const DEMO_NEAR_PLANE = 0.1;
/**
Far clipping plane distance used for the demo camera frustum.
 */
const DEMO_FAR_PLANE = 1000;
/**
Node count the closing summary scales its estimated per-frame overhead to.
 */
const SUMMARY_NODE_COUNT = 1000;
/**
Number of decimal places shown for the closing summary's millisecond figures.
 */
const SUMMARY_DECIMAL_PLACES = 3;
/**
Frame time budget, in milliseconds, for 60fps rendering.
 */
const FRAME_BUDGET_MS = 16.67;
/**
Estimated per-frame overhead, in milliseconds, below which the LOD system is reported as performant.
 */
const LOW_OVERHEAD_THRESHOLD_MS = 5;
/**
Estimated per-frame overhead, in milliseconds, below which the LOD system is reported as having only moderate overhead.
 */
const MODERATE_OVERHEAD_THRESHOLD_MS = 10;

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  opsPerSecond: number;
}

const benchmark = (name: string, function_: () => void, iterations = DEFAULT_BENCHMARK_ITERATIONS): BenchmarkResult => {
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

const generateRandomPositions = (count: number, spread: number): Position3D[] => {
  const positions: Position3D[] = [];
  for (let index = 0; index < count; index++) {
    positions.push({
      x: (Math.random() - JITTER_CENTER_OFFSET) * spread,
      y: (Math.random() - JITTER_CENTER_OFFSET) * spread,
      z: (Math.random() - JITTER_CENTER_OFFSET) * spread,
    });
  }
  return positions;
};

const formatResult = (result: Readonly<BenchmarkResult>): string => `${result.name.padEnd(NAME_COLUMN_WIDTH)} ${result.avgTimeMs.toFixed(AVG_TIME_DECIMAL_PLACES).padStart(TIME_COLUMN_WIDTH)}ms  ${Math.round(result.opsPerSecond).toLocaleString().padStart(OPS_COLUMN_WIDTH)} ops/s`;

const runBenchmarks = (): void => {
  console.log('='.repeat(SEPARATOR_WIDTH));
  console.log('GraphLODManager Performance Benchmarks');
  console.log('='.repeat(SEPARATOR_WIDTH));
  console.log('');

  const results: BenchmarkResult[] = [];
  const lodManager = new GraphLODManager();
  const cameraPosition: Position3D = { x: 0, y: 0, z: 500 };

  // Single LOD calculation
  console.log('--- Single Operations ---');

  const testPosition: Position3D = { x: 100, y: 100, z: 100 };
  results.push(benchmark(
    'getLODForDistance (single)',
    () => {
      lodManager.getLODForDistance(testPosition, cameraPosition);
    },
    SINGLE_OP_ITERATIONS
  ));
  console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

  results.push(benchmark(
    'getEffectiveLOD (single)',
    () => {
      lodManager.getEffectiveLOD(testPosition, cameraPosition);
    },
    SINGLE_OP_ITERATIONS
  ));
  console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

  results.push(benchmark(
    'getNodeRenderSettings',
    () => {
      lodManager.getNodeRenderSettings(1);
    },
    SINGLE_OP_ITERATIONS
  ));
  console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

  results.push(benchmark(
    'getEdgeRenderSettings',
    () => {
      lodManager.getEdgeRenderSettings(1);
    },
    SINGLE_OP_ITERATIONS
  ));
  console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

  results.push(benchmark(
    'recordFrameTime',
    () => {
      lodManager.recordFrameTime();
    },
    DEFAULT_BENCHMARK_ITERATIONS
  ));
  console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

  // Batch operations with different node counts
  console.log('\n--- Batch LOD Calculations ---');

  for (const nodeCount of BATCH_NODE_COUNTS) {
    const positions = generateRandomPositions(nodeCount, BATCH_LOD_POSITION_SPREAD);

    results.push(benchmark(
      `batchGetLOD (${String(nodeCount)} nodes)`,
      () => {
        lodManager.batchGetLOD(positions, cameraPosition);
      },
      BATCH_LOD_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));
  }

  // Frustum culling
  console.log('\n--- Frustum Culling ---');

  const frustumPlanes = [
    { normal: { x: 1, y: 0, z: 0 }, distance: DEMO_FAR_PLANE },
    { normal: { x: -1, y: 0, z: 0 }, distance: DEMO_FAR_PLANE },
    { normal: { x: 0, y: 1, z: 0 }, distance: DEMO_FAR_PLANE },
    { normal: { x: 0, y: -1, z: 0 }, distance: DEMO_FAR_PLANE },
    { normal: { x: 0, y: 0, z: 1 }, distance: DEMO_FAR_PLANE },
    { normal: { x: 0, y: 0, z: -1 }, distance: DEMO_FAR_PLANE },
  ];

  results.push(benchmark(
    'isInFrustum (single)',
    () => {
      lodManager.isInFrustum(testPosition, FRUSTUM_TEST_RADIUS, frustumPlanes);
    },
    SINGLE_OP_ITERATIONS
  ));
  console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

  // Batch frustum culling
  for (const nodeCount of BATCH_NODE_COUNTS) {
    const positions = generateRandomPositions(nodeCount, FRUSTUM_CULL_POSITION_SPREAD);

    results.push(benchmark(
      `Batch frustum cull (${String(nodeCount)} nodes)`,
      () => {
        for (const pos of positions) {
          lodManager.isInFrustum(pos, FRUSTUM_TEST_RADIUS, frustumPlanes);
        }
      },
      BATCH_FRUSTUM_ITERATIONS
    ));
    console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));
  }

  // Matrix operations
  console.log('\n--- Matrix Operations ---');

  const identityMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];

  results.push(benchmark(
    'extractFrustumPlanes',
    () => {
      extractFrustumPlanes(identityMatrix, identityMatrix);
    },
    MATRIX_OPERATION_ITERATIONS
  ));
  console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

  results.push(benchmark(
    'createFrustumBounds',
    () => {
      createFrustumBounds(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: -1 },
        Math.PI / DEMO_CAMERA_FOV_DIVISOR,
        DEMO_ASPECT_RATIO_WIDTH / DEMO_ASPECT_RATIO_HEIGHT,
        DEMO_NEAR_PLANE,
        DEMO_FAR_PLANE
      );
    },
    MATRIX_OPERATION_ITERATIONS
  ));
  console.log(formatResult(results[results.length - 1] ?? { name: "unknown", iterations: 0, totalTimeMs: 0, avgTimeMs: 0, opsPerSecond: 0 }));

  // Summary
  console.log('\n' + '='.repeat(SEPARATOR_WIDTH));
  console.log('Performance Summary');
  console.log('='.repeat(SEPARATOR_WIDTH));
  console.log('');
  console.log('Target: All per-node operations should be <0.01ms for 60fps with 1000 nodes');
  console.log('Budget: 16.67ms per frame, need headroom for rendering');
  console.log('');

  // Calculate total time for a realistic frame with SUMMARY_NODE_COUNT nodes
  const lodPerNode = results.find(r => r.name === 'getEffectiveLOD (single)')?.avgTimeMs ?? 0;
  const frustumPerNode = results.find(r => r.name === 'isInFrustum (single)')?.avgTimeMs ?? 0;
  const renderSettingsTime = results.find(r => r.name === 'getNodeRenderSettings')?.avgTimeMs ?? 0;

  const totalPerSummaryNodeCount = (lodPerNode + frustumPerNode + renderSettingsTime) * SUMMARY_NODE_COUNT;
  console.log(`Estimated LOD overhead for ${String(SUMMARY_NODE_COUNT)} nodes: ${totalPerSummaryNodeCount.toFixed(SUMMARY_DECIMAL_PLACES)}ms`);
  console.log(`Remaining frame budget: ${(FRAME_BUDGET_MS - totalPerSummaryNodeCount).toFixed(SUMMARY_DECIMAL_PLACES)}ms`);
  console.log('');

  if (totalPerSummaryNodeCount < LOW_OVERHEAD_THRESHOLD_MS) {
    console.log('LOD system is performant - minimal impact on frame budget');
  } else if (totalPerSummaryNodeCount < MODERATE_OVERHEAD_THRESHOLD_MS) {
    console.log('LOD system has moderate overhead - consider batching');
  } else {
    console.log('WARNING: LOD system overhead is high - optimization needed');
  }
};

// Only run when executed directly (not when imported)
if (import.meta.url.endsWith('graph-lod-manager.benchmark.ts')) {
  try {
    runBenchmarks();
  } catch (error) {
    console.error(error);
  }
}
