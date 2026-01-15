import { describe, expect,test } from 'vitest';

import { analyzeGraphSpecConstraints,isGraphSpecImpossible } from './constraints';
import { generateGraph, type GraphGenerationConfig } from './generator';
import { validateGraphProperties } from './graph-validator';
import {
  describeSpec,
  generateCoreSpecPermutations,
  type GraphSpec,
  makeGraphSpec,
} from './spec';

describe('Graph Spec Permutation E2E Tests', () => {
  describe('All valid spec combinations', () => {
    const allPermutations = generateCoreSpecPermutations();

    // Filter out mathematically impossible combinations
    const validPermutations = allPermutations.filter(spec => !isGraphSpecImpossible(spec));

    test(`should generate ${validPermutations.length} valid spec combinations (filtered from ${allPermutations.length} total)`, () => {
      expect(validPermutations.length).toBeGreaterThan(0);
      expect(validPermutations.length).toBeLessThanOrEqual(640);
      console.log(`Generated ${allPermutations.length} total spec combinations`);
      console.log(`Filtered to ${validPermutations.length} valid combinations (${allPermutations.length - validPermutations.length} impossible removed)`);

      // Log some examples of filtered combinations
      const impossible = allPermutations.filter(spec => isGraphSpecImpossible(spec));
      if (impossible.length > 0) {
        console.log('\nSample impossible combinations:');
        for (const spec of impossible.slice(0, 3)) {
          const constraints = analyzeGraphSpecConstraints(spec);
          console.log(`  - ${describeSpec(spec)}`);
          for (const c of constraints) {
            console.log(`    * ${c.reason}`);
          }
        }
      }
    });

    // Test each valid permutation
    test.each(validPermutations)('$# - generates valid graph for: %s', (spec: GraphSpec) => {
      const description = describeSpec(spec);

      const config: GraphGenerationConfig = {
        nodeCount: 10,
        nodeTypes: spec.schema.kind === 'heterogeneous'
          ? [
              { type: 'type_a', proportion: 0.5 },
              { type: 'type_b', proportion: 0.3 },
              { type: 'type_c', proportion: 0.2 },
            ]
          : undefined,
        weightRange: spec.weighting.kind === 'weighted_numeric' ? { min: 1, max: 100 } : undefined,
        seed: 12345,
      };

      // Generate graph
      const graph = generateGraph(spec, config);

      // Validate graph
      const validation = validateGraphProperties(graph);

      // Report validation results
      if (!validation.valid) {
        console.error(`\nValidation failed for: ${description}`);
        console.error('Errors:');
        for (const error of validation.errors) {
          console.error(`  - ${error}`);
        }
        console.error('\nProperty validation details:');
        for (const result of validation.properties) {
          if (!result.valid) {
            console.error(`  - ${result.property}: expected=${result.expected}, actual=${result.actual}`);
            if (result.message) {
              console.error(`    ${result.message}`);
            }
          }
        }
      }

      // Assert validation passed
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });

  describe('Specific spec constraints', () => {
    test('generates only directed acyclic graphs (DAGs)', () => {
      const dags = generateCoreSpecPermutations().filter(
        spec => spec.directionality.kind === "directed" && spec.cycles.kind === "acyclic"
      );

      expect(dags.length).toBeGreaterThan(0);

      for (const spec of dags) {
        expect(spec.directionality.kind).toBe('directed');
        expect(spec.cycles.kind).toBe('acyclic');

        // Generate and validate
        const graph = generateGraph(spec, { nodeCount: 10, seed: 12345 });
        const validation = validateGraphProperties(graph);
        expect(validation.valid).toBe(true);
      }
    });

    test('generates only undirected trees', () => {
      const trees = generateCoreSpecPermutations().filter(
        spec =>
          spec.directionality.kind === "undirected" &&
          spec.cycles.kind === "acyclic" &&
          spec.connectivity.kind === "connected" &&
          !isGraphSpecImpossible(spec)  // Filter out impossible specs
      );

      expect(trees.length).toBeGreaterThan(0);

      for (const spec of trees) {
        expect(spec.directionality.kind).toBe('undirected');
        expect(spec.cycles.kind).toBe('acyclic');
        expect(spec.connectivity.kind).toBe('connected');

        // Generate and validate
        const graph = generateGraph(spec, { nodeCount: 10, seed: 12345 });
        const validation = validateGraphProperties(graph);
        expect(validation.valid).toBe(true);
      }
    });

    test('generates only heterogeneous weighted graphs', () => {
      const hetWeighted = generateCoreSpecPermutations().filter(
        spec =>
          spec.schema.kind === "heterogeneous" &&
          spec.weighting.kind === "weighted_numeric" &&
          !isGraphSpecImpossible(spec)  // Filter out impossible specs
      );

      expect(hetWeighted.length).toBeGreaterThan(0);

      for (const spec of hetWeighted) {
        expect(spec.schema.kind).toBe('heterogeneous');
        expect(spec.weighting.kind).toBe('weighted_numeric');

        // Generate and validate
        const graph = generateGraph(spec, {
          nodeCount: 10,
          seed: 12345,
          nodeTypes: [
            { type: 'work', proportion: 0.6 },
            { type: 'concept', proportion: 0.4 },
          ],
          weightRange: { min: 1, max: 100 },
        });

        const validation = validateGraphProperties(graph);
        expect(validation.valid).toBe(true);
      }
    });

    test('generates only sparse connected graphs', () => {
      const sparseConnected = generateCoreSpecPermutations().filter(
        spec =>
          spec.density.kind === "sparse" &&
          spec.connectivity.kind === "connected" &&
          !isGraphSpecImpossible(spec)  // Filter out impossible specs
      );

      expect(sparseConnected.length).toBeGreaterThan(0);

      for (const spec of sparseConnected) {
        expect(spec.density.kind).toBe('sparse');
        expect(spec.connectivity.kind).toBe('connected');

        // Generate and validate
        const graph = generateGraph(spec, { nodeCount: 20, seed: 12345 });
        const validation = validateGraphProperties(graph);
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe('Edge cases', () => {
    test('handles empty graph (0 nodes)', () => {
      const spec = makeGraphSpec({
        directionality: { kind: "directed" },
        weighting: { kind: "unweighted" },
        cycles: { kind: "acyclic" },
        connectivity: { kind: "connected" },
        schema: { kind: "homogeneous" },
        edgeMultiplicity: { kind: "simple" },
        selfLoops: { kind: "disallowed" },
        density: { kind: "sparse" },
        completeness: { kind: "incomplete" },
      });

      const graph = generateGraph(spec, { nodeCount: 0, seed: 12345 });
      expect(graph.nodes.length).toBe(0);
      expect(graph.edges.length).toBe(0);

      const validation = validateGraphProperties(graph);
      expect(validation.valid).toBe(true);
    });

    test('handles single node graph', () => {
      const spec = makeGraphSpec({
        directionality: { kind: "directed" },
        weighting: { kind: "unweighted" },
        cycles: { kind: "acyclic" },
        connectivity: { kind: "connected" },
        schema: { kind: "homogeneous" },
        edgeMultiplicity: { kind: "simple" },
        selfLoops: { kind: "disallowed" },
        density: { kind: "sparse" },
        completeness: { kind: "incomplete" },
      });

      const graph = generateGraph(spec, { nodeCount: 1, seed: 12345 });
      expect(graph.nodes.length).toBe(1);

      const validation = validateGraphProperties(graph);
      expect(validation.valid).toBe(true);
    });

    test('handles large graphs (100 nodes)', () => {
      const spec = makeGraphSpec({
        directionality: { kind: "directed" },
        weighting: { kind: "weighted_numeric" },
        cycles: { kind: "acyclic" },
        connectivity: { kind: "connected" },
        schema: { kind: "heterogeneous" },
        edgeMultiplicity: { kind: "simple" },
        selfLoops: { kind: "disallowed" },
        density: { kind: "sparse" },
        completeness: { kind: "incomplete" },
      });

      const graph = generateGraph(spec, {
        nodeCount: 100,
        seed: 12345,
        nodeTypes: [
          { type: 'work', proportion: 0.7 },
          { type: 'concept', proportion: 0.3 },
        ],
        weightRange: { min: 1, max: 1000 },
      });

      expect(graph.nodes.length).toBe(100);
      expect(graph.edges.length).toBeGreaterThan(0);

      const validation = validateGraphProperties(graph);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Reproducibility', () => {
    test('generates identical graphs with same seed', () => {
      const spec = makeGraphSpec({
        directionality: { kind: "directed" },
        weighting: { kind: "weighted_numeric" },
        cycles: { kind: "acyclic" },
        connectivity: { kind: "connected" },
        schema: { kind: "heterogeneous" },
        edgeMultiplicity: { kind: "simple" },
        selfLoops: { kind: "disallowed" },
        density: { kind: "sparse" },
        completeness: { kind: "incomplete" },
      });

      const config: GraphGenerationConfig = {
        nodeCount: 20,
        seed: 42,
        nodeTypes: [
          { type: 'a', proportion: 0.5 },
          { type: 'b', proportion: 0.5 },
        ],
        weightRange: { min: 1, max: 50 },
      };

      const graph1 = generateGraph(spec, config);
      const graph2 = generateGraph(spec, config);

      // Should generate identical graphs
      expect(graph1.nodes).toEqual(graph2.nodes);
      expect(graph1.edges).toEqual(graph2.edges);
    });

    test('generates different graphs with different seeds', () => {
      const spec = makeGraphSpec({
        directionality: { kind: "directed" },
        weighting: { kind: "weighted_numeric" },
        cycles: { kind: "acyclic" },
        connectivity: { kind: "connected" },
        schema: { kind: "homogeneous" },
        edgeMultiplicity: { kind: "simple" },
        selfLoops: { kind: "disallowed" },
        density: { kind: "sparse" },
        completeness: { kind: "incomplete" },
      });

      const graph1 = generateGraph(spec, { nodeCount: 20, seed: 1 });
      const graph2 = generateGraph(spec, { nodeCount: 20, seed: 2 });

      // Should generate different edge sets (very unlikely to be identical)
      expect(graph1.edges).not.toEqual(graph2.edges);
    });
  });
});
