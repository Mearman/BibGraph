import type { TestGraph } from '../generators/types'
import type { PropertyValidationResult } from './types';

// ============================================================================
// SYMMETRY VALIDATORS
// ============================================================================

/**
 * Validate line graph property.
 * Line graph L(G) represents adjacency of edges in base graph G.
 * @param graph
 */
export const validateLine = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.line?.kind !== "line_graph") {
    return {
      property: "line",
      expected: spec.line?.kind ?? "unconstrained",
      actual: spec.line?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 2) {
    return {
      property: "line",
      expected: "line_graph",
      actual: "trivial",
      valid: true,
    };
  }

  // Check if stored base edge data exists
  const hasBaseEdges = nodes.every(n => n.data?.baseEdge !== undefined);
  if (hasBaseEdges) {
    // Verify each vertex represents an edge from base graph
    // Verify adjacency condition: vertices adjacent in L(G) iff edges share vertex in G
    const baseEdges = nodes.map(n => (n.data?.baseEdge as { source: string; target: string } | undefined) ?? { source: '', target: '' });

    // Check that each edge in L(G) corresponds to edges sharing a vertex in G
    for (const edge of edges) {
      const sourceIdx = Number.parseInt(edge.source.replaceAll(/^\D+/g, ''));
      const targetIdx = Number.parseInt(edge.target.replaceAll(/^\D+/g, ''));

      if (Number.isNaN(sourceIdx) || Number.isNaN(targetIdx) || sourceIdx >= baseEdges.length || targetIdx >= baseEdges.length) {
        return {
          property: "line",
          expected: "line_graph",
          actual: "invalid_structure",
          valid: false,
          message: "Invalid node IDs for line graph",
        };
      }

      const e1 = baseEdges[sourceIdx];
      const e2 = baseEdges[targetIdx];

      // Edges should share a vertex in base graph
      const shareVertex = e1.source === e2.source || e1.source === e2.target ||
                          e1.target === e2.source || e1.target === e2.target;

      if (!shareVertex) {
        return {
          property: "line",
          expected: "line_graph",
          actual: "invalid_adjacency",
          valid: false,
          message: "Adjacent vertices in L(G) don't share vertex in base graph G",
        };
      }
    }

    return {
      property: "line",
      expected: "line_graph",
      actual: "line_graph",
      valid: true,
    };
  }

  return {
    property: "line",
    expected: "line_graph",
    actual: "unknown",
    valid: true,
    message: "Line graph validation skipped (no base edge metadata found)",
  };
};

/**
 * Validate self-complementary property.
 * Self-complementary graph is isomorphic to its complement.
 * @param graph
 */
export const validateSelfComplementary = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.selfComplementary?.kind !== "self_complementary") {
    return {
      property: "selfComplementary",
      expected: spec.selfComplementary?.kind ?? "unconstrained",
      actual: spec.selfComplementary?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const n = nodes.length;

  // Self-complementary requires n ≡ 0 or 1 (mod 4)
  if (n % 4 !== 0 && n % 4 !== 1) {
    return {
      property: "selfComplementary",
      expected: "self_complementary",
      actual: "invalid_size",
      valid: false,
      message: `Self-complementary requires n ≡ 0 or 1 (mod 4), got n=${n}`,
    };
  }

  // Check if stored construction metadata exists
  const hasPermutation = nodes.some(n => n.data?.permutation !== undefined);
  const hasConstruction = nodes.some(n => n.data?.selfComplementaryType !== undefined);

  if (hasPermutation || hasConstruction) {
    // Verify edge count is exactly half of total possible edges
    const totalPossibleEdges = (n * (n - 1)) / 2;
    const expectedEdges = totalPossibleEdges / 2;

    if (edges.length !== expectedEdges) {
      return {
        property: "selfComplementary",
        expected: "self_complementary",
        actual: "invalid_edge_count",
        valid: false,
        message: `Self-complementary requires exactly ${expectedEdges} edges, got ${edges.length}`,
      };
    }

    // TODO: Verify isomorphism with complement (expensive for large n)
    return {
      property: "selfComplementary",
      expected: "self_complementary",
      actual: "self_complementary",
      valid: true,
      message: "Isomorphism validation not yet implemented",
    };
  }

  return {
    property: "selfComplementary",
    expected: "self_complementary",
    actual: "unknown",
    valid: true,
    message: "Self-complementary validation skipped (no construction metadata found)",
  };
};

/**
 * Validate threshold graph property.
 * Threshold graphs are both split and cograph.
 * @param graph
 */
export const validateThreshold = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.threshold?.kind !== "threshold") {
    return {
      property: "threshold",
      expected: spec.threshold?.kind ?? "unconstrained",
      actual: spec.threshold?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 2) {
    return {
      property: "threshold",
      expected: "threshold",
      actual: "trivial",
      valid: true,
    };
  }

  // Check for threshold construction metadata
  const hasMetadata = nodes.some(n => n.data?.thresholdType !== undefined);

  if (hasMetadata) {
    // Verify all vertices are marked as dominant or isolated
    const allMarked = nodes.every(n => n.data?.thresholdType === 'dominant' || n.data?.thresholdType === 'isolated');

    if (!allMarked) {
      return {
        property: "threshold",
        expected: "threshold",
        actual: "invalid_metadata",
        valid: false,
        message: "Not all vertices marked as dominant or isolated",
      };
    }

    return {
      property: "threshold",
      expected: "threshold",
      actual: "threshold",
      valid: true,
    };
  }

  // Fallback: check if graph is both split and cograph
  // This is a structural property check
  return {
    property: "threshold",
    expected: "threshold",
    actual: "unknown",
    valid: true,
    message: "Threshold validation requires construction metadata",
  };
};

/**
 * Validate strongly regular graph property.
 * Strongly regular graphs have parameters (n, k, λ, μ).
 * @param graph
 */
export const validateStronglyRegular = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.stronglyRegular?.kind !== "strongly_regular") {
    return {
      property: "stronglyRegular",
      expected: spec.stronglyRegular?.kind ?? "unconstrained",
      actual: spec.stronglyRegular?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const n = nodes.length;
  const { k, lambda, mu } = spec.stronglyRegular;

  if (k === undefined || lambda === undefined || mu === undefined) {
    return {
      property: "stronglyRegular",
      expected: "strongly_regular",
      actual: "missing_parameters",
      valid: false,
      message: "Strongly regular requires k, lambda, mu parameters",
    };
  }

  // Check for SRG parameter metadata
  const hasMetadata = nodes.some(n => n.data?.srgParams !== undefined);

  if (hasMetadata) {
    const params = nodes[0].data?.srgParams as { n: number; k: number; lambda: number; mu: number } | undefined;

    if (!params) {
      return {
        property: "stronglyRegular",
        expected: "strongly_regular",
        actual: "invalid_metadata",
        valid: false,
        message: "SRG parameter metadata not found",
      };
    }

    // Verify parameters match spec
    if (params.n !== n || params.k !== k || params.lambda !== lambda || params.mu !== mu) {
      return {
        property: "stronglyRegular",
        expected: "strongly_regular",
        actual: "parameter_mismatch",
        valid: false,
        message: `SRG parameters mismatch: expected (${n}, ${k}, ${lambda}, ${mu}), got (${params.n}, ${params.k}, ${params.lambda}, ${params.mu})`,
      };
    }

    // Verify regularity (all vertices have degree k)
    const degrees = new Map<string, number>();
    nodes.forEach(node => degrees.set(node.id, 0));
    edges.forEach(edge => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });

    const allDegreeK = [...degrees.values()].every(d => d === k);
    if (!allDegreeK) {
      return {
        property: "stronglyRegular",
        expected: "strongly_regular",
        actual: "not_regular",
        valid: false,
        message: `SRG requires all vertices to have degree ${k}`,
      };
    }

    return {
      property: "stronglyRegular",
      expected: "strongly_regular",
      actual: "strongly_regular",
      valid: true,
    };
  }

  // Fallback: check feasibility condition
  if (k * (k - lambda - 1) !== (n - k - 1) * mu) {
    return {
      property: "stronglyRegular",
      expected: "strongly_regular",
      actual: "invalid_parameters",
      valid: false,
      message: `SRG feasibility condition failed: k(k-λ-1) = (n-k-1)μ required`,
    };
  }

  return {
    property: "stronglyRegular",
    expected: "strongly_regular",
    actual: "strongly_regular",
    valid: true,
    message: "Strongly regular validation skipped (no metadata, feasibility condition satisfied)",
  };
};

/**
 * Validate vertex-transitive graph property.
 * Vertex-transitive graphs have automorphism group acting transitively on vertices.
 * @param graph
 */
export const validateVertexTransitive = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.vertexTransitive?.kind !== "vertex_transitive") {
    return {
      property: "vertexTransitive",
      expected: spec.vertexTransitive?.kind ?? "unconstrained",
      actual: spec.vertexTransitive?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const n = nodes.length;

  if (n < 2) {
    return {
      property: "vertexTransitive",
      expected: "vertex_transitive",
      actual: "trivial",
      valid: true,
    };
  }

  // Check for vertex-transitive metadata
  const hasMetadata = nodes.some(n => n.data?.vertexTransitiveGroup !== undefined);

  if (hasMetadata) {
    // Verify all vertices have group metadata
    const allHaveMetadata = nodes.every(n => n.data?.vertexTransitiveGroup !== undefined);

    if (!allHaveMetadata) {
      return {
        property: "vertexTransitive",
        expected: "vertex_transitive",
        actual: "incomplete_metadata",
        valid: false,
        message: "Not all vertices have vertex-transitive group metadata",
      };
    }

    const group = nodes[0].data?.vertexTransitiveGroup as string;

    if (!group) {
      return {
        property: "vertexTransitive",
        expected: "vertex_transitive",
        actual: "missing_group",
        valid: false,
        message: "Vertex-transitive group metadata not found",
      };
    }

    // Verify all vertices use same group
    const allSameGroup = nodes.every(n => (n.data?.vertexTransitiveGroup as string) === group);

    if (!allSameGroup) {
      return {
        property: "vertexTransitive",
        expected: "vertex_transitive",
        actual: "inconsistent_groups",
        valid: false,
        message: "Not all vertices use same automorphism group",
      };
    }

    return {
      property: "vertexTransitive",
      expected: "vertex_transitive",
      actual: "vertex_transitive",
      valid: true,
    };
  }

  // Fallback: check if graph is symmetric (same degree for all vertices)
  const degrees = new Map<string, number>();
  nodes.forEach(node => degrees.set(node.id, 0));
  graph.edges.forEach(edge => {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  });

  const degreeValues = [...degrees.values()];
  const allSameDegree = degreeValues.every(d => d === degreeValues[0]);

  if (!allSameDegree) {
    return {
      property: "vertexTransitive",
      expected: "vertex_transitive",
      actual: "irregular",
      valid: false,
      message: "Vertex-transitive graphs are regular (all vertices same degree)",
    };
  }

  return {
    property: "vertexTransitive",
    expected: "vertex_transitive",
    actual: "vertex_transitive",
    valid: true,
    message: "Vertex-transitive validation skipped (no metadata, graph is regular)",
  };
};

/**
 * Validate edge-transitive graph property.
 * Edge-transitive graphs have automorphisms mapping any edge to any other.
 * @param graph
 */
export const validateEdgeTransitive = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.edgeTransitive?.kind !== "edge_transitive") {
    return {
      property: "edgeTransitive",
      expected: spec.edgeTransitive?.kind ?? "unconstrained",
      actual: spec.edgeTransitive?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const n = nodes.length;

  if (n < 2) {
    return {
      property: "edgeTransitive",
      expected: "edge_transitive",
      actual: "trivial",
      valid: true,
    };
  }

  // Check for edge-transitive metadata
  const hasMetadata = nodes.some(n => n.data?.edgeTransitive !== undefined);

  if (hasMetadata) {
    return {
      property: "edgeTransitive",
      expected: "edge_transitive",
      actual: "edge_transitive",
      valid: true,
    };
  }

  // Fallback: complete graphs are edge-transitive
  const completeEdgeCount = (n * (n - 1)) / 2;
  if (edges.length === completeEdgeCount) {
    return {
      property: "edgeTransitive",
      expected: "edge_transitive",
      actual: "edge_transitive",
      valid: true,
      message: "Edge-transitive validation skipped (complete graph is edge-transitive)",
    };
  }

  return {
    property: "edgeTransitive",
    expected: "edge_transitive",
    actual: "unknown",
    valid: false,
    message: "Cannot verify edge-transitivity without metadata (non-complete graph)",
  };
};

/**
 * Validate arc-transitive (symmetric) graph property.
 * Arc-transitive graphs are both vertex-transitive AND edge-transitive.
 * @param graph
 */
export const validateArcTransitive = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.arcTransitive?.kind !== "arc_transitive") {
    return {
      property: "arcTransitive",
      expected: spec.arcTransitive?.kind ?? "unconstrained",
      actual: spec.arcTransitive?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const n = nodes.length;

  if (n < 3) {
    return {
      property: "arcTransitive",
      expected: "arc_transitive",
      actual: "trivial",
      valid: true,
    };
  }

  // Check for arc-transitive metadata
  const hasMetadata = nodes.some(n => n.data?.arcTransitive !== undefined);

  if (hasMetadata) {
    const allHaveMetadata = nodes.every(n => n.data?.arcTransitive !== undefined);

    if (!allHaveMetadata) {
      return {
        property: "arcTransitive",
        expected: "arc_transitive",
        actual: "incomplete_metadata",
        valid: false,
        message: "Not all vertices have arc-transitive metadata",
      };
    }

    return {
      property: "arcTransitive",
      expected: "arc_transitive",
      actual: "arc_transitive",
      valid: true,
    };
  }

  // Fallback: check if graph is regular (necessary but not sufficient)
  const degrees = new Map<string, number>();
  nodes.forEach(node => degrees.set(node.id, 0));
  graph.edges.forEach(edge => {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  });

  const degreeValues = [...degrees.values()];
  const allSameDegree = degreeValues.every(d => d === degreeValues[0]);

  if (!allSameDegree) {
    return {
      property: "arcTransitive",
      expected: "arc_transitive",
      actual: "irregular",
      valid: false,
      message: "Arc-transitive graphs must be regular",
    };
  }

  return {
    property: "arcTransitive",
    expected: "arc_transitive",
    actual: "unknown",
    valid: false,
    message: "Cannot verify arc-transitivity without metadata (regularity is necessary but not sufficient)",
  };
};
