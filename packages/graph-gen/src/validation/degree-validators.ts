import type { GraphSpec } from '../graph-spec';
import type { TestGraph, TestNode, TestEdge } from '../graph-generator';

/**
 * Validate regular graph properties (cubic or k-regular).
 * A k-regular graph has all vertices with degree exactly k.
 * Cubic graphs are 3-regular.
 */
export function validateRegularGraph(graph: TestGraph): {
  property: string;
  expected: string;
  actual: string;
  valid: boolean;
  message?: string;
} {
  const { spec, nodes, edges } = graph;

  // Get expected degree from spec
  let expectedDegree: number | null = null;
  if (spec.cubic?.kind === "cubic") {
    expectedDegree = 3;
  } else if (spec.specificRegular?.kind === "k_regular") {
    expectedDegree = spec.specificRegular.k;
  } else {
    return {
      property: "regularity",
      expected: "unconstrained",
      actual: "unconstrained",
      valid: true,
    };
  }

  if (expectedDegree === null) {
    return {
      property: "regularity",
      expected: "unconstrained",
      actual: "unconstrained",
      valid: true,
    };
  }

  // Count degree of each vertex
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }

  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    if (spec.directionality.kind === "undirected") {
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
  }

  // Check all vertices have the expected degree
  const actualDegrees = Array.from(degrees.values());
  const allHaveCorrectDegree = actualDegrees.every(d => d === expectedDegree);

  if (!allHaveCorrectDegree) {
    const degreeCounts = new Map<number, number>();
    for (const d of actualDegrees) {
      degreeCounts.set(d, (degreeCounts.get(d) || 0) + 1);
    }
    const degreeDistribution = Object.fromEntries(degreeCounts);

    return {
      property: "regularity",
      expected: `${expectedDegree}-regular`,
      actual: `not_regular (degree distribution: ${JSON.stringify(degreeDistribution)})`,
      valid: false,
      message: `Expected all vertices to have degree ${expectedDegree}, but got ${JSON.stringify(degreeDistribution)}`,
    };
  }

  const regularityType = spec.cubic?.kind === "cubic" ? "cubic" : `${expectedDegree}-regular`;
  return {
    property: "regularity",
    expected: regularityType,
    actual: regularityType,
    valid: true,
  };
}

/**
 * Validate Eulerian graph properties.
 * Eulerian graphs have all vertices with even degree (Eulerian circuit exists).
 * Semi-Eulerian graphs have exactly 2 vertices with odd degree (Eulerian trail exists).
 */
export function validateEulerian(graph: TestGraph): {
  property: string;
  expected: string;
  actual: string;
  valid: boolean;
  message?: string;
} {
  const { spec, nodes, edges } = graph;

  // Only validate when spec requires eulerian or semi_eulerian
  const eulerianKind = spec.eulerian?.kind;
  if (eulerianKind !== "eulerian" && eulerianKind !== "semi_eulerian") {
    return {
      property: "eulerian",
      expected: eulerianKind ?? "unconstrained",
      actual: eulerianKind ?? "unconstrained",
      valid: true,
    };
  }

  // Count degree of each vertex
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }

  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    if (spec.directionality.kind === "undirected") {
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    } else {
      // For directed graphs, also count incoming edges
      degrees.set(edge.target, (degrees.get(edge.target) || 0));
    }
  }

  // Count vertices with odd degree
  const oddDegreeVertices: string[] = [];
  degrees.forEach((degree, nodeId) => {
    if (degree % 2 === 1) {
      oddDegreeVertices.push(nodeId);
    }
  });

  const oddCount = oddDegreeVertices.length;

  // For Eulerian graphs: all vertices must have even degree (oddCount === 0)
  if (eulerianKind === "eulerian") {
    if (oddCount === 0) {
      return {
        property: "eulerian",
        expected: "eulerian",
        actual: "eulerian",
        valid: true,
      };
    } else {
      return {
        property: "eulerian",
        expected: "eulerian",
        actual: `semi_eulerian (${oddCount} odd-degree vertices: ${oddDegreeVertices.join(", ")})`,
        valid: false,
        message: `Eulerian graphs require all vertices to have even degree, but found ${oddCount} vertices with odd degree`,
      };
    }
  }

  // For semi-Eulerian graphs: exactly 2 vertices must have odd degree
  if (eulerianKind === "semi_eulerian") {
    if (oddCount === 2) {
      return {
        property: "eulerian",
        expected: "semi_eulerian",
        actual: "semi_eulerian",
        valid: true,
      };
    } else {
      const actualType = oddCount === 0 ? "eulerian" : `non_eulerian (${oddCount} odd-degree vertices)`;
      return {
        property: "eulerian",
        expected: "semi_eulerian",
        actual: actualType,
        valid: false,
        message: `Semi-Eulerian graphs require exactly 2 vertices with odd degree, but found ${oddCount}`,
      };
    }
  }

  // Fallback (shouldn't reach here)
  return {
    property: "eulerian",
    expected: "unconstrained",
    actual: "unconstrained",
    valid: true,
  };
}
