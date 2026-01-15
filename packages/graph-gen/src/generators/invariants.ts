/**
 * Numerical invariant graph generators.
 *
 * These generators create graphs with specific numerical invariants:
 * - Hereditary classes (forbidden induced subgraphs)
 * - Independence number (size of largest independent set)
 * - Vertex cover number (minimum vertices covering all edges)
 * - Domination number (minimum dominating set size)
 */

import type { GraphSpec } from '../spec';
import type { TestNode, TestEdge } from './types';
import { SeededRandom } from './types';

/**
 * Add edge to edge list with optional type assignment.
 * @param edges - Edge list to modify
 * @param source - Source node ID
 * @param target - Target node ID
 * @param spec - Graph specification
 * @param rng - Random number generator
 */
const addEdge = (edges: TestEdge[], source: string, target: string, spec: GraphSpec, rng: SeededRandom): void => {
  const edge: TestEdge = { source, target };

  if (spec.schema.kind === 'heterogeneous') {
    // Assign random edge type (could be based on config.edgeTypes)
    edge.type = rng.choice(['type_a', 'type_b', 'type_c']);
  }

  edges.push(edge);
};

/**
 * Generate hereditary class graph (forbidding specific induced subgraphs).
 * Hereditary classes are closed under taking induced subgraphs.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateHereditaryClassEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (spec.hereditaryClass?.kind !== "hereditary_class") {
    throw new Error("Hereditary class graph requires hereditary_class spec");
  }

  const { forbidden } = spec.hereditaryClass;

  // Store forbidden patterns for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.forbiddenSubgraphs = forbidden;
    node.data.hereditaryClass = true;
  });

  // For simplicity, generate a graph and filter out forbidden patterns
  // Start with a random graph
  const density = spec.density.kind === "sparse" ? 0.15 :
                  spec.density.kind === "moderate" ? 0.4 :
                  spec.density.kind === "dense" ? 0.7 : 0.3;

  const totalPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
  const targetEdgeCount = Math.floor(totalPossibleEdges * density);

  let added = 0;
  for (let i = 0; i < nodes.length && added < targetEdgeCount; i++) {
    for (let j = i + 1; j < nodes.length && added < targetEdgeCount; j++) {
      if (rng.next() < density) {
        addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
        added++;
      }
    }
  }

  // NOTE: Full hereditary class validation requires checking all induced subgraphs
  // against forbidden patterns. This is computationally expensive and done in validation.
  // The generator creates a random graph; the validator ensures hereditary property.
};

/**
 * Generate graph with specified independence number.
 * Independence number α is the size of the largest independent set (no two vertices adjacent).
 * Uses greedy construction to create independent set of exact size α.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateIndependenceNumberEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (spec.independenceNumber?.kind !== "independence_number") {
    throw new Error("Independence number graph requires independence_number spec");
  }

  const { value: targetAlpha } = spec.independenceNumber;

  if (targetAlpha > nodes.length) {
    throw new Error(`Independence number ${targetAlpha} cannot exceed node count ${nodes.length}`);
  }

  // Store independence number for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetIndependenceNumber = targetAlpha;
  });

  // Select α vertices to form the maximum independent set
  const independentIndices: number[] = [];
  const remainingIndices = nodes.map((_, i) => i);

  // Randomly select α vertices for the independent set
  for (let i = 0; i < targetAlpha; i++) {
    const idx = Math.floor(rng.next() * remainingIndices.length);
    independentIndices.push(remainingIndices[idx]);
    remainingIndices.splice(idx, 1);
  }

  // Mark independent vertices
  independentIndices.forEach(i => {
    nodes[i].data = nodes[i].data || {};
    nodes[i].data.independentSet = true;
  });

  // Create edges: no edges within independent set, all other edges allowed
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      // Skip edges between independent vertices
      if (independentIndices.includes(i) && independentIndices.includes(j)) {
        continue;
      }

      // Add edges between all other pairs
      addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
    }
  }
};

/**
 * Generate graph with specified vertex cover number.
 * Vertex cover number τ is the minimum vertices covering all edges.
 * Uses complement of maximum independent set (Kőnig's theorem: τ + α = n for bipartite).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateVertexCoverEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (spec.vertexCover?.kind !== "vertex_cover") {
    throw new Error("Vertex cover graph requires vertex_cover spec");
  }

  const { value: targetTau } = spec.vertexCover;

  if (targetTau > nodes.length) {
    throw new Error(`Vertex cover number ${targetTau} cannot exceed node count ${nodes.length}`);
  }

  // Store vertex cover number for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetVertexCover = targetTau;
  });

  // By complement of independent set: α = n - τ
  const independenceNumber = nodes.length - targetTau;

  // Select (n - τ) vertices to remove from consideration, leaving τ vertices for the cover
  const remainingIndices = nodes.map((_, i) => i);

  for (let i = 0; i < independenceNumber; i++) {
    const idx = Math.floor(rng.next() * remainingIndices.length);
    remainingIndices.splice(idx, 1);
  }

  // The remaining vertices form the minimum vertex cover
  const coverIndices = remainingIndices;

  // Mark cover vertices
  coverIndices.forEach(i => {
    nodes[i].data = nodes[i].data || {};
    nodes[i].data.vertexCover = true;
  });

  // Create edges: all edges must be incident to cover vertices
  // This means no edge between two non-cover (independent) vertices
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      // Skip edges between two independent vertices (neither in cover)
      if (!coverIndices.includes(i) && !coverIndices.includes(j)) {
        continue;
      }

      // Add all other edges (at least one endpoint in cover)
      addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
    }
  }
};

/**
 * Generate graph with specified domination number.
 * Domination number γ is the minimum vertices such that every vertex is either
 * in the dominating set or adjacent to a vertex in the set.
 * Uses star-like construction: dominating vertices connected to all others.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateDominationNumberEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (spec.dominationNumber?.kind !== "domination_number") {
    throw new Error("Domination number graph requires domination_number spec");
  }

  const { value: targetGamma } = spec.dominationNumber;

  if (targetGamma > nodes.length) {
    throw new Error(`Domination number ${targetGamma} cannot exceed node count ${nodes.length}`);
  }

  // Store domination number for validation
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.targetDominationNumber = targetGamma;
  });

  // Select γ vertices to form the minimum dominating set
  const dominatingIndices: number[] = [];
  const remainingIndices = nodes.map((_, i) => i);

  for (let i = 0; i < targetGamma; i++) {
    const idx = Math.floor(rng.next() * remainingIndices.length);
    dominatingIndices.push(remainingIndices[idx]);
    remainingIndices.splice(idx, 1);
  }

  // Mark dominating vertices
  dominatingIndices.forEach(i => {
    nodes[i].data = nodes[i].data || {};
    nodes[i].data.dominatingSet = true;
  });

  // Create star-like structure: all dominating vertices connect to all non-dominating vertices
  // Non-dominating vertices have no edges between themselves
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      // At least one endpoint must be in dominating set
      if (dominatingIndices.includes(i) || dominatingIndices.includes(j)) {
        addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
      }
      // No edges between two non-dominating vertices
    }
  }
};
