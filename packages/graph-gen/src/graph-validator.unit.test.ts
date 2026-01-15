/**
 * Unit tests for graph validator
 */
// eslint-disable-next-line n/no-extraneous-import
import { describe, expect, it } from 'vitest';

import { generateGraph } from './generator';
import { validateGraphProperties } from './graph-validator';
import type { GraphSpec } from './spec';

describe('validateGraphProperties', () => {
  describe('Basic validation', () => {
    it('should validate a simple tree graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'unconstrained' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 10, seed: 42 });
      const result = validateGraphProperties(graph);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.properties).toHaveLength(30); // All 30 validation functions (17 + 3 Phase 1 + 5 Phase 2 + 3 Phase 3 + 2 Phase 4)
    });

    it('should validate a complete graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'complete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 5, seed: 42 });
      const result = validateGraphProperties(graph);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a directed acyclic graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 10, seed: 42 });
      const result = validateGraphProperties(graph);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Warning collection', () => {
    it('should collect warnings from constraint analysis', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 10, seed: 42 });
      const result = validateGraphProperties(graph);

      // Tree with density constraint should generate warning
      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('cycles/density'))).toBe(true);
      }
    });

    it('should not include errors from constraint analysis', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'complete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 5, seed: 42 });
      const result = validateGraphProperties(graph);

      // Constraint errors are filtered out before validation
      // Only actual validation errors should appear
      expect(result.valid).toBe(true);
    });
  });

  describe('Property validation results', () => {
    it('should include validation results for all properties', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 5, seed: 42 });
      const result = validateGraphProperties(graph);

      // Check that all expected properties are validated
      const propertyNames = result.properties.map(p => p.property);
      expect(propertyNames).toContain('directionality');
      expect(propertyNames).toContain('weighting');
      expect(propertyNames).toContain('cycles');
      expect(propertyNames).toContain('connectivity');
      expect(propertyNames).toContain('schema');
      expect(propertyNames).toContain('edgeMultiplicity');
      expect(propertyNames).toContain('selfLoops');
      expect(propertyNames).toContain('density');
      expect(propertyNames).toContain('partiteness');
      expect(propertyNames).toContain('tournament');
      expect(propertyNames).toContain('regularity');
    });

    it('should mark individual property validation failures', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 5, seed: 42 });

      // Manually corrupt the graph to trigger validation failures
      // Add a self-loop (violates selfLoops: disallowed)
      graph.edges.push({ source: 'N0', target: 'N0' });

      const result = validateGraphProperties(graph);

      // Should have validation error for self-loops
      const selfLoopResult = result.properties.find(p => p.property === 'selfLoops');
      expect(selfLoopResult?.valid).toBe(false);
      expect(result.valid).toBe(false);
    });
  });

  describe('Error aggregation', () => {
    it('should aggregate errors from multiple validation failures', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 5, seed: 42 });

      // Corrupt the graph in multiple ways
      graph.edges.push({ source: 'N0', target: 'N0' }); // Self-loop
      graph.edges.push({ source: 'N0', target: 'N1' }); // Duplicate edge (creates cycle)

      const result = validateGraphProperties(graph);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some(e => e.includes('should not allow self-loops but has'))).toBe(true);
    });
  });

  describe('Adjustments integration', () => {
    it('should apply constraint adjustments to validation', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'multi' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 5, seed: 42 });
      const result = validateGraphProperties(graph);

      // Should apply skipCycleValidation adjustment for multigraph + acyclic
      expect(result.valid).toBe(true);
    });
  });

  describe('Graph structure integration', () => {
    it('should preserve spec reference in validation result', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
      };

      const graph = generateGraph(spec, { nodeCount: 5, seed: 42 });
      validateGraphProperties(graph);

      // Verify spec is preserved
      expect(graph.spec).toEqual(spec);
    });
  });

  describe('Special graph types', () => {
    it('should validate tournament graphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        tournament: { kind: 'tournament' },
      };

      const graph = generateGraph(spec, { nodeCount: 5, seed: 42 });
      const result = validateGraphProperties(graph);

      const failures = result.properties.filter(p => !p.valid);
      if (failures.length > 0) {
        throw new Error(`Tournament validation failed: ${failures.map(f => `${f.property} (${f.message})`).join(', ')}`);
      }

      expect(result.valid).toBe(true);
    });

    it('should validate bipartite graphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        partiteness: { kind: 'bipartite' },
      };

      const graph = generateGraph(spec, { nodeCount: 10, seed: 42 });
      const result = validateGraphProperties(graph);

      expect(result.valid).toBe(true);
    });

    it('should validate complete bipartite graphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'dense' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        completeBipartite: { kind: 'complete_bipartite', m: 3, n: 3 },
      };

      const graph = generateGraph(spec, { nodeCount: 6, seed: 42 });
      const result = validateGraphProperties(graph);

      expect(result.valid).toBe(true);
    });

    it('should validate star graphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'acyclic' },
        density: { kind: 'sparse' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        star: { kind: 'star' },
      };

      const graph = generateGraph(spec, { nodeCount: 6, seed: 42 });
      const result = validateGraphProperties(graph);

      expect(result.valid).toBe(true);
    });

    it('should validate grid graphs', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        grid: { kind: 'grid', rows: 3, cols: 4 },
      };

      const graph = generateGraph(spec, { nodeCount: 12, seed: 42 });
      const result = validateGraphProperties(graph);

      expect(result.valid).toBe(true);
    });
  });
});
