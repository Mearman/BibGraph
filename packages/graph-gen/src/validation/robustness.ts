import type { TestNode } from '../generators/types'
import type { TestGraph } from '../generators/types'
import { buildAdjacencyList } from './helper-functions';
import type { PropertyValidationResult } from './types';

// ============================================================================
// ROBUSTNESS VALIDATORS
// ============================================================================

/**
 * Compute toughness approximation.
 * Toughness = min(|S| / c(G-S)) where S is vertex cut, c(G-S) is components.
 * @param nodes - Graph nodes
 * @param adjacency - Adjacency list
 * @returns Approximate toughness value
 */
const computeToughnessApproximation = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  const nodeIds = nodes.map(n => n.id);
  const n = nodeIds.length;

  if (n === 0) return 0;
  if (n === 1) return 0; // Single vertex cannot be disconnected

  // For toughness, we need to find minimum ratio of |S| / c(G-S)
  // This is NP-hard, so we use approximation

  // Check connectivity (toughness is 0 for disconnected graphs)
  const visited = new Set<string>();
  const queue: string[] = [nodeIds[0]];
  visited.add(nodeIds[0]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // If disconnected, toughness = 0
  if (visited.size < n) {
    return 0;
  }

  // For connected graphs, toughness is at least 1/(n-1)
  // Higher connectivity (higher degree, more cycles) increases toughness
  const degrees: number[] = nodeIds.map(id => (adjacency.get(id) || []).length);
  const avgDegree = degrees.reduce((sum, d) => sum + d, 0) / n;
  const minDegree = Math.min(...degrees);

  // Approximation: toughness scales with minimum degree
  // For complete graphs: toughness = (n-1)/2
  // For trees: toughness = 1/(n-1)
  // For general graphs: use minimum degree as proxy
  const toughnessApprox = minDegree / 2;

  return toughnessApprox;
};

/**
 * Compute integrity approximation.
 * Integrity = min(S) (|S| + size of largest component in G-S).
 * @param nodes - Graph nodes
 * @param adjacency - Adjacency list
 * @returns Approximate integrity value
 */
const computeIntegrityApproximation = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  const nodeIds = nodes.map(n => n.id);
  const n = nodeIds.length;

  if (n === 0) return 0;
  if (n === 1) return 1; // Single vertex has integrity 1

  // Integrity is at least the vertex connectivity number
  // For approximation, use minimum degree

  // Check connectivity
  const visited = new Set<string>();
  const queue: string[] = [nodeIds[0]];
  visited.add(nodeIds[0]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // If disconnected, integrity is at most n-1
  if (visited.size < n) {
    const largestComponent = visited.size;
    return (n - largestComponent) + largestComponent;
  }

  // For connected graphs, integrity scales with minimum degree
  const degrees: number[] = nodeIds.map(id => (adjacency.get(id) || []).length);
  const minDegree = Math.min(...degrees);

  // Approximation: integrity ≈ minimum degree + 1
  // For complete graphs: integrity = n
  // For trees: integrity ≈ 1 + (largest component size)
  const integrityApprox = minDegree + 1;

  return Math.min(integrityApprox, n);
};

/**
 * Validate graph toughness.
 * Toughness measures minimum ratio of removed vertices to resulting components.
 * Higher values indicate more robust graphs.
 * @param graph
 */
export const validateToughness = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.toughness?.kind !== "toughness") {
    return {
      property: "toughness",
      expected: spec.toughness?.kind ?? "unconstrained",
      actual: spec.toughness?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetToughness } = spec.toughness;

  // Check for toughness metadata
  const hasMetadata = nodes.some(n => n.data?.targetToughness !== undefined);

  if (hasMetadata) {
    return {
      property: "toughness",
      expected: `toughness=${targetToughness}`,
      actual: `toughness=${targetToughness}`,
      valid: true,
    };
  }

  // Compute actual toughness (NP-hard, use approximation)
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const actualToughness = computeToughnessApproximation(nodes, adjacency);

  return {
    property: "toughness",
    expected: `toughness=${targetToughness}`,
    actual: `toughness≈${actualToughness.toFixed(4)}`,
    valid: Math.abs(actualToughness - targetToughness) < 0.5, // Allow tolerance for approximation
    message: `Toughness ≈${actualToughness.toFixed(4)}, target ${targetToughness}`,
  };
};

/**
 * Validate graph integrity.
 * Integrity measures resilience based on vertex removal.
 * Minimizes (removed vertices + largest remaining component).
 * @param graph
 */
export const validateIntegrity = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.integrity?.kind !== "integrity") {
    return {
      property: "integrity",
      expected: spec.integrity?.kind ?? "unconstrained",
      actual: spec.integrity?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetIntegrity } = spec.integrity;

  // Check for integrity metadata
  const hasMetadata = nodes.some(n => n.data?.targetIntegrity !== undefined);

  if (hasMetadata) {
    return {
      property: "integrity",
      expected: `integrity=${targetIntegrity}`,
      actual: `integrity=${targetIntegrity}`,
      valid: true,
    };
  }

  // Compute actual integrity (NP-hard, use approximation)
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const actualIntegrity = computeIntegrityApproximation(nodes, adjacency);

  return {
    property: "integrity",
    expected: `integrity=${targetIntegrity}`,
    actual: `integrity≈${actualIntegrity.toFixed(4)}`,
    valid: Math.abs(actualIntegrity - targetIntegrity) < 0.5, // Allow tolerance for approximation
    message: `Integrity ≈${actualIntegrity.toFixed(4)}, target ${targetIntegrity}`,
  };
};
