/**
 * Unit tests for validation functions
 */
import { describe, expect, it } from 'vitest';

import type { TestGraph } from '../generator';
import { generateGraph } from '../generator';
import type { GraphSpec } from '../spec';
import { buildAdjacencyList } from './helper-functions';
import {
  detectCycle,
  validateBipartite,
  validateConnectivity,
  validateCycles,
  validateDensityAndCompleteness,
  validateDirectionality,
  validateEdgeMultiplicity,
  validateEulerian,
  validateFlowNetwork,
  validateKColorable,
  validateKEdgeConnected,
  validateKVertexConnected,
  validateRegularGraph,
  validateSchema,
  validateSelfLoops,
  validateTournament,
  validateTreewidth,
  validateWeighting,
} from './index';

describe('Validation functions', () => {
  describe('Basic validators', () => {
    describe('validateDirectionality', () => {
      it('should validate undirected graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateDirectionality(graph);

        expect(result.valid).toBe(true);
      });

      it('should validate directed graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'directed' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'connected' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'moderate' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
        };
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateDirectionality(graph);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateWeighting', () => {
      it('should validate unweighted graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateWeighting(graph);

        expect(result.valid).toBe(true);
      });

      it('should validate weighted graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'weighted_numeric' },
          connectivity: { kind: 'connected' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'moderate' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
        };
        const graph = generateGraph(spec, {
          nodeCount: 5,
          weightRange: { min: 1, max: 100 },
        });

        const result = validateWeighting(graph);

        expect(result.valid).toBe(true);
        expect(graph.edges.every(e => e.weight !== undefined)).toBe(true);
      });
    });

    describe('validateCycles', () => {
      it('should validate acyclic tree', () => {
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
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateCycles(graph, {});

        expect(result.valid).toBe(true);
      });

      it('should validate graph with cycles', () => {
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
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateCycles(graph, {});

        expect(result.valid).toBe(true);
      });
    });

    describe('validateConnectivity', () => {
      it('should validate connected graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateConnectivity(graph);

        expect(result.valid).toBe(true);
      });

      it('should validate disconnected graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'acyclic' },
          density: { kind: 'sparse' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateConnectivity(graph);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateSchema', () => {
      it('should validate homogeneous schema', () => {
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
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateSchema(graph);

        expect(result.valid).toBe(true);
      });

      it('should validate heterogeneous schema', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'connected' },
          cycles: { kind: 'acyclic' },
          density: { kind: 'sparse' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'heterogeneous' },
        };
        const graph = generateGraph(spec, {
          nodeCount: 10,
          nodeTypes: [
            { type: 'author', proportion: 0.4 },
            { type: 'paper', proportion: 0.6 },
          ],
        });

        const result = validateSchema(graph);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateEdgeMultiplicity', () => {
      it('should validate simple graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateEdgeMultiplicity(graph);

        expect(result.valid).toBe(true);
      });

      it('should validate multigraph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'directed' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'connected' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'moderate' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'multi' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
        };
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateEdgeMultiplicity(graph);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateSelfLoops', () => {
      it('should validate graph without self-loops', () => {
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
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateSelfLoops(graph);

        expect(result.valid).toBe(true);
      });

      it('should validate graph with self-loops', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'connected' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'moderate' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'allowed' },
          schema: { kind: 'homogeneous' },
        };
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateSelfLoops(graph);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Structural validators', () => {
    describe('validateDensityAndCompleteness', () => {
      it('should validate sparse graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'connected' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'sparse' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateDensityAndCompleteness(graph, {});

        expect(result.valid).toBe(true);
      });

      it('should validate complete graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateDensityAndCompleteness(graph, {});

        expect(result.valid).toBe(true);
      });
    });

    describe('validateBipartite', () => {
      it('should validate bipartite graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateBipartite(graph);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateTournament', () => {
      it('should validate tournament graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 5 });

        const result = validateTournament(graph);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Degree validators', () => {
    describe('validateRegularGraph', () => {
      it('should validate cubic graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'moderate' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          cubic: { kind: 'cubic' },
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateRegularGraph(graph);

        // Debug: check degree distribution
        const degrees = new Map<string, number>();
        for (const node of graph.nodes) {
          degrees.set(node.id, 0);
        }
        for (const edge of graph.edges) {
          degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
          degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
        }
        const degreeValues = [...degrees.values()];
        console.log('Cubic graph degree distribution:', degreeValues.sort((a, b) => a - b));
        console.log('Expected: all 3s, Got:', degreeValues);

        expect(result.valid).toBe(true);
      });

      it('should validate k-regular graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'unconstrained' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'moderate' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          specificRegular: { kind: 'k_regular', k: 4 },
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateRegularGraph(graph);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateEulerian', () => {
      it('should validate Eulerian graph', () => {
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
          eulerian: { kind: 'eulerian' },
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateEulerian(graph);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Connectivity validators', () => {
    describe('validateKVertexConnected', () => {
      it('should validate k-vertex-connected graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'undirected' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'connected' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'dense' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
          kVertexConnected: { kind: 'k_vertex_connected', k: 2 },
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateKVertexConnected(graph);

        expect(result.valid).toBe(true);
      });
    });

    describe('validateKEdgeConnected', () => {
      it('should validate k-edge-connected graph', () => {
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
          kEdgeConnected: { kind: 'k_edge_connected', k: 2 },
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const result = validateKEdgeConnected(graph);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Treewidth validator', () => {
    it('should validate treewidth-bounded graph', () => {
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
        treewidth: { kind: 'treewidth', width: 2 },
      };
      const graph = generateGraph(spec, { nodeCount: 10 });

      const result = validateTreewidth(graph);

      expect(result.valid).toBe(true);
    });
  });

  describe('Coloring validator', () => {
    it('should validate k-colorable graph', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'undirected' },
        weighting: { kind: 'unweighted' },
        connectivity: { kind: 'unconstrained' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        kColorable: { kind: 'k_colorable', k: 3 },
      };
      const graph = generateGraph(spec, { nodeCount: 10 });

      const result = validateKColorable(graph);

      expect(result.valid).toBe(true);
    });
  });

  describe('Flow validator', () => {
    it('should validate flow network', () => {
      const spec: GraphSpec = {
        directionality: { kind: 'directed' },
        weighting: { kind: 'weighted_numeric' },
        connectivity: { kind: 'connected' },
        cycles: { kind: 'cycles_allowed' },
        density: { kind: 'moderate' },
        completeness: { kind: 'incomplete' },
        edgeMultiplicity: { kind: 'simple' },
        selfLoops: { kind: 'disallowed' },
        schema: { kind: 'homogeneous' },
        flowNetwork: { kind: 'flow_network', source: 'N0', sink: 'N9' },
      };
      const graph = generateGraph(spec, { nodeCount: 10 });

      const result = validateFlowNetwork(graph);

      expect(result.valid).toBe(true);
    });
  });

  describe('Helper functions', () => {
    describe('buildAdjacencyList', () => {
      it('should build adjacency list for undirected graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 5 });

        const adjacency = buildAdjacencyList(graph.nodes, graph.edges, false);

        expect(adjacency.size).toBe(5);
        for (const [nodeId, neighbors] of adjacency) {
          expect(Array.isArray(neighbors)).toBe(true);
        }
      });

      it('should build adjacency list for directed graph', () => {
        const spec: GraphSpec = {
          directionality: { kind: 'directed' },
          weighting: { kind: 'unweighted' },
          connectivity: { kind: 'connected' },
          cycles: { kind: 'cycles_allowed' },
          density: { kind: 'moderate' },
          completeness: { kind: 'incomplete' },
          edgeMultiplicity: { kind: 'simple' },
          selfLoops: { kind: 'disallowed' },
          schema: { kind: 'homogeneous' },
        };
        const graph = generateGraph(spec, { nodeCount: 5 });

        const adjacency = buildAdjacencyList(graph.nodes, graph.edges, true);

        expect(adjacency.size).toBe(5);
      });
    });

    describe('detectCycle', () => {
      it('should detect cycle in cyclic graph', () => {
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
        };
        const graph = generateGraph(spec, { nodeCount: 10 });

        const hasCycle = detectCycle(graph.nodes, graph.edges, false);

        expect(hasCycle).toBe(true);
      });

      it('should not detect cycle in acyclic graph', () => {
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
        const graph = generateGraph(spec, { nodeCount: 10 });

        const hasCycle = detectCycle(graph.nodes, graph.edges, false);

        expect(hasCycle).toBe(false);
      });
    });
  });
});
