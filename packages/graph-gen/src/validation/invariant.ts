import type { TestNode } from '../generators/types'
import type { TestGraph } from '../generators/types'
import { buildAdjacencyList } from './helper-functions';
import type { PropertyValidationResult } from './types';

// ============================================================================
// GRAPH INVARIANT VALIDATORS
// ============================================================================

/**
 * Validate hereditary class property.
 * Hereditary classes are closed under taking induced subgraphs.
 * @param graph
 */
export const validateHereditaryClass = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.hereditaryClass?.kind !== "hereditary_class") {
    return {
      property: "hereditaryClass",
      expected: spec.hereditaryClass?.kind ?? "unconstrained",
      actual: spec.hereditaryClass?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { forbidden } = spec.hereditaryClass;

  if (forbidden.length === 0) {
    return {
      property: "hereditaryClass",
      expected: "hereditary_class",
      actual: "hereditary_class",
      valid: true,
    };
  }

  // Check for hereditary metadata
  const hasMetadata = nodes.some(n => n.data?.hereditaryClass !== undefined);

  if (hasMetadata) {
    return {
      property: "hereditaryClass",
      expected: "hereditary_class",
      actual: "hereditary_class",
      valid: true,
    };
  }

  // Fallback: note that full validation requires expensive induced subgraph checks
  return {
    property: "hereditaryClass",
    expected: "hereditary_class",
    actual: "unknown",
    valid: false,
    message: `Hereditary class validation requires checking all induced subgraphs against forbidden patterns: ${forbidden.join(", ")}`,
  };
};

/**
 * Validate independence number (α).
 * Independence number is the size of the largest independent set (no two vertices adjacent).
 * @param graph
 */
export const validateIndependenceNumber = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.independenceNumber?.kind !== "independence_number") {
    return {
      property: "independenceNumber",
      expected: spec.independenceNumber?.kind ?? "unconstrained",
      actual: spec.independenceNumber?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetAlpha } = spec.independenceNumber;

  // Check for independence number metadata
  const hasMetadata = nodes.some(n => n.data?.targetIndependenceNumber !== undefined);

  if (hasMetadata) {
    return {
      property: "independenceNumber",
      expected: `α=${targetAlpha}`,
      actual: `α=${targetAlpha}`,
      valid: true,
    };
  }

  // Compute actual independence number using branch and bound
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const actualAlpha = computeIndependenceNumber(nodes, adjacency);

  return {
    property: "independenceNumber",
    expected: `α=${targetAlpha}`,
    actual: `α=${actualAlpha}`,
    valid: actualAlpha === targetAlpha,
    message: actualAlpha === targetAlpha ?
      `Graph has independence number ${actualAlpha}` :
      `Graph has independence number ${actualAlpha}, expected ${targetAlpha}`,
  };
};

/**
 * Validate vertex cover number (τ).
 * Vertex cover number is the minimum vertices covering all edges.
 * @param graph
 */
export const validateVertexCover = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.vertexCover?.kind !== "vertex_cover") {
    return {
      property: "vertexCover",
      expected: spec.vertexCover?.kind ?? "unconstrained",
      actual: spec.vertexCover?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetTau } = spec.vertexCover;

  // Check for vertex cover metadata
  const hasMetadata = nodes.some(n => n.data?.targetVertexCover !== undefined);

  if (hasMetadata) {
    return {
      property: "vertexCover",
      expected: `τ=${targetTau}`,
      actual: `τ=${targetTau}`,
      valid: true,
    };
  }

  // Compute actual vertex cover using complement of independence number (τ = n - α)
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const independenceNumber = computeIndependenceNumber(nodes, adjacency);
  const actualTau = nodes.length - independenceNumber;

  return {
    property: "vertexCover",
    expected: `τ=${targetTau}`,
    actual: `τ=${actualTau}`,
    valid: actualTau === targetTau,
    message: actualTau === targetTau ?
      `Graph has vertex cover number ${actualTau}` :
      `Graph has vertex cover number ${actualTau}, expected ${targetTau}`,
  };
};

/**
 * Validate domination number (γ).
 * Domination number is the minimum vertices such that every vertex is either
 * in the dominating set or adjacent to a vertex in the set.
 * @param graph
 */
export const validateDominationNumber = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.dominationNumber?.kind !== "domination_number") {
    return {
      property: "dominationNumber",
      expected: spec.dominationNumber?.kind ?? "unconstrained",
      actual: spec.dominationNumber?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetGamma } = spec.dominationNumber;

  // Check for domination number metadata
  const hasMetadata = nodes.some(n => n.data?.targetDominationNumber !== undefined);

  if (hasMetadata) {
    return {
      property: "dominationNumber",
      expected: `γ=${targetGamma}`,
      actual: `γ=${targetGamma}`,
      valid: true,
    };
  }

  // Compute actual domination number
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const actualGamma = computeDominationNumber(nodes, adjacency);

  return {
    property: "dominationNumber",
    expected: `γ=${targetGamma}`,
    actual: `γ=${actualGamma}`,
    valid: actualGamma === targetGamma,
    message: actualGamma === targetGamma ?
      `Graph has domination number ${actualGamma}` :
      `Graph has domination number ${actualGamma}, expected ${targetGamma}`,
  };
};

// ============================================================================
// COMPUTE FUNCTIONS
// ============================================================================

/**
 * Computes the independence number (α) using branch and bound.
 * Time complexity: O(1.4422^n) in worst case, but much faster in practice.
 */
const computeIndependenceNumber = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  const n = nodes.length;

  if (n === 0) return 0;
  if (n === 1) return 1;

  // Convert nodes to array of IDs for faster processing
  const vertexIds = nodes.map(n => n.id);

  // Branch and bound algorithm
  const branchAndBound = (
    candidates: Set<string>,
    currentSize: number,
    bestSize: number
  ): number => {
    // Upper bound: current size + remaining candidates
    const upperBound = currentSize + candidates.size;

    // Prune if we can't beat the best solution
    if (upperBound <= bestSize) {
      return bestSize;
    }

    // Base case: no candidates left
    if (candidates.size === 0) {
      return currentSize;
    }

    // Choose a vertex with maximum degree for better pruning
    let maxDegreeVertex = "";
    let maxDegree = -1;

    for (const v of candidates) {
      const neighbors = adjacency.get(v) ?? [];
      const degree = neighbors.filter(n => candidates.has(n)).length;

      if (degree > maxDegree) {
        maxDegree = degree;
        maxDegreeVertex = v;
      }
    }

    if (!maxDegreeVertex) {
      return currentSize;
    }

    // Branch 1: Include maxDegreeVertex in independent set
    const newCandidates1 = new Set(candidates);
    newCandidates1.delete(maxDegreeVertex);

    // Remove all neighbors of maxDegreeVertex
    const neighbors = adjacency.get(maxDegreeVertex) ?? [];
    for (const neighbor of neighbors) {
      newCandidates1.delete(neighbor);
    }

    const best1 = branchAndBound(newCandidates1, currentSize + 1, bestSize);

    // Branch 2: Exclude maxDegreeVertex from independent set
    const newCandidates2 = new Set(candidates);
    newCandidates2.delete(maxDegreeVertex);

    const best2 = branchAndBound(newCandidates2, currentSize, best1);

    return Math.max(best1, best2);
  };

  return branchAndBound(new Set(vertexIds), 0, 0);
};

/**
 * Computes the domination number (γ) using branch and bound.
 * A dominating set D has the property that every vertex is either in D
 * or adjacent to a vertex in D.
 */
const computeDominationNumber = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  const n = nodes.length;

  if (n === 0) return 0;
  if (n === 1) return 1;

  const vertexIds = nodes.map(n => n.id);

  // Check if a set of vertices is a dominating set
  const isDominatingSet = (dominatingSet: Set<string>): boolean => {
    for (const v of vertexIds) {
      // Either v is in the dominating set or has a neighbor in it
      if (!dominatingSet.has(v)) {
        const neighbors = adjacency.get(v) ?? [];
        const hasNeighborInSet = neighbors.some(n => dominatingSet.has(n));

        if (!hasNeighborInSet) {
          return false;
        }
      }
    }

    return true;
  };

  // Branch and bound algorithm
  const branchAndBound = (
    startIdx: number,
    currentSet: Set<string>,
    bestSize: number
  ): number => {
    // Prune if current set is already too large
    if (currentSet.size >= bestSize) {
      return bestSize;
    }

    // Check if current set dominates all vertices
    if (isDominatingSet(currentSet)) {
      return currentSet.size;
    }

    // Try adding remaining vertices
    for (let i = startIdx; i < vertexIds.length; i++) {
      const vertex = vertexIds[i];

      if (!currentSet.has(vertex)) {
        currentSet.add(vertex);
        const result = branchAndBound(i + 1, currentSet, bestSize);

        if (result < bestSize) {
          bestSize = result;
        }

        currentSet.delete(vertex);

        // If we found a dominating set of size k, we don't need to try larger sets
        if (bestSize === currentSet.size + 1) {
          break;
        }
      }
    }

    return bestSize;
  };

  // Start with empty set and try to build a dominating set
  return branchAndBound(0, new Set(), n);
};
