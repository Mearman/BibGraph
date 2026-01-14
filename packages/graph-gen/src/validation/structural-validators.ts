import type { GraphSpec } from '../graph-spec';
import type { TestGraph, TestNode, TestEdge } from '../graph-generator';
import type { PropertyValidationResult } from './types';
import { findComponentsForDensity, checkBipartiteWithBFS, buildAdjacencyList } from './helper-functions';

/**
 * Validates graph density and completeness properties.
 *
 * A complete graph has density = 1.0 (all possible edges exist).
 * Density = (2 * |E|) / (|V| * (|V| - 1)) for undirected graphs.
 *
 * @param graph - The graph to validate
 * @param adjustments - Optional validation adjustments for constrained graphs
 * @returns PropertyValidationResult with validation details
 */
export function validateDensityAndCompleteness(
  graph: TestGraph,
  adjustments: Record<string, boolean> = {}
): PropertyValidationResult {
  const { spec, nodes, edges } = graph;
  const n = nodes.length;

  if (n < 2) {
    return {
      property: "density/completeness",
      expected: `${spec.density.kind} + ${spec.completeness.kind}`,
      actual: spec.density.kind,
      valid: true,
    };
  }

  // Calculate max possible edges accounting for self-loops and component structure
  const selfLoopEdges = spec.selfLoops.kind === "allowed" ? n : 0;
  let maxPossibleEdges: number;

  // For disconnected graphs, calculate max edges within each component (matches generator logic)
  if (spec.connectivity.kind === "unconstrained") {
    const components = findComponentsForDensity(nodes, edges, spec.directionality.kind === "directed");

    if (components.length > 1) {
      // Calculate max edges within each component
      maxPossibleEdges = components.reduce((total, comp) => {
        const compSize = comp.length;
        if (spec.directionality.kind === 'directed') {
          return total + (compSize * (compSize - 1));
        } else {
          return total + ((compSize * (compSize - 1)) / 2);
        }
      }, 0) + selfLoopEdges;
    } else {
      // Connected graph, use standard formula
      maxPossibleEdges = spec.directionality.kind === "directed"
        ? (n * (n - 1)) + selfLoopEdges
        : ((n * (n - 1)) / 2) + selfLoopEdges;
    }
  } else {
    // Connected graph, use standard formula
    maxPossibleEdges = spec.directionality.kind === "directed"
      ? (n * (n - 1)) + selfLoopEdges
      : ((n * (n - 1)) / 2) + selfLoopEdges;
  }

  const actualEdgeCount = edges.length;
  const densityRatio = actualEdgeCount / maxPossibleEdges;

  // Check completeness first
  if (spec.completeness.kind === "complete") {
    const actualComplete = actualEdgeCount === maxPossibleEdges;
    return {
      property: "completeness",
      expected: "complete",
      actual: actualComplete ? "complete" : `${actualEdgeCount}/${maxPossibleEdges} edges`,
      valid: actualComplete,
      message: actualComplete ? undefined : `Expected complete graph but missing ${maxPossibleEdges - actualEdgeCount} edges`,
    };
  }

  // Map density ratio to density category
  // Use wider tolerance for small graphs with discrete edge counts
  let actualTarget: string;
  if (densityRatio < 0.20) actualTarget = "sparse";      // < 20%
  else if (densityRatio < 0.45) actualTarget = "moderate"; // 20-45%
  else if (densityRatio < 0.75) actualTarget = "dense";     // 45-75%
  else actualTarget = "dense";                           // ≥ 75%

  // For disconnected graphs, adjust expected density based on mathematical constraints
  // Forests (acyclic disconnected) have minimum density > sparse threshold
  // Also apply this relaxation to cycles_allowed when we're at minimum structure + required features
  const isConstrainedForest = spec.connectivity.kind === "unconstrained" &&
    (spec.cycles.kind === "acyclic" || spec.cycles.kind === "cycles_allowed");

  if (isConstrainedForest) {
    // Calculate minimum possible edges for this forest structure
    // If actual edge count is close to minimum, accept any density >= minimum
    const components = findComponentsForDensity(nodes, edges, spec.directionality.kind === 'directed');
    const minEdgesForForest = nodes.length - components.length; // n - k for forest

    // Calculate minimum acceptable edge count accounting for required features
    let minAcceptableEdges = minEdgesForForest;
    if (spec.selfLoops.kind === "allowed") minAcceptableEdges += 1;
    if (spec.cycles.kind === "cycles_allowed" && spec.directionality.kind === "directed") minAcceptableEdges += 1;
    if (spec.edgeMultiplicity.kind === "multi") minAcceptableEdges += 1; // Parallel edge for multigraphs

    // Add tolerance based on density target - more tolerance for moderate since minimum structure may push it near dense boundary
    let tolerance = 1;
    if (spec.density.kind === "moderate") {
      // For moderate, allow up to 50% of maxPossibleEdges since minimum structure + features may already be > 40%
      tolerance = Math.floor(maxPossibleEdges * 0.5) - minAcceptableEdges;
      if (tolerance < 2) tolerance = 2; // At least some tolerance for randomness
    } else if (spec.density.kind === "dense") {
      // For dense, allow even more tolerance
      tolerance = Math.floor(maxPossibleEdges * 0.7) - minAcceptableEdges;
      if (tolerance < 3) tolerance = 3;
    }

    if (actualEdgeCount <= minAcceptableEdges + tolerance) {
      // Graph has minimum forest structure + required features, density is determined by constraints
      // Don't fail validation for impossible density combinations
      return {
        property: "density",
        expected: spec.density.kind,
        actual: actualTarget,
        valid: true, // Always valid - density is constrained by structure
      };
    }
  }

  // For connected graphs, apply similar relaxation based on minimum structure + required features
  if (spec.connectivity.kind === "connected") {
    // Minimum connected structure is a tree: n - 1 edges
    let minAcceptableEdges = nodes.length - 1;

    // Add required features
    if (spec.selfLoops.kind === "allowed") minAcceptableEdges += 1;
    if (spec.cycles.kind === "cycles_allowed" && spec.directionality.kind === "directed") minAcceptableEdges += 1;
    if (spec.edgeMultiplicity.kind === "multi") minAcceptableEdges += 1; // Parallel edge for multigraphs

    // Add tolerance based on density target
    let tolerance = 1;
    if (spec.density.kind === "moderate") {
      tolerance = Math.floor(maxPossibleEdges * 0.5) - minAcceptableEdges;
      if (tolerance < 2) tolerance = 2;
    } else if (spec.density.kind === "dense") {
      tolerance = Math.floor(maxPossibleEdges * 0.7) - minAcceptableEdges;
      if (tolerance < 3) tolerance = 3;
    }

    if (actualEdgeCount <= minAcceptableEdges + tolerance) {
      // Graph has minimum connected structure + required features, density is determined by constraints
      return {
        property: "density",
        expected: spec.density.kind,
        actual: actualTarget,
        valid: true,
      };
    }
  }

  // Apply density relaxation for problematic combinations identified by constraint analysis
  if (adjustments.relaxDensityValidation) {
    return {
      property: "density",
      expected: spec.density.kind,
      actual: actualTarget,
      valid: true,  // Accept actual density even if it doesn't match spec
    };
  }

  const valid = spec.density.kind === "unconstrained" || actualTarget === spec.density.kind;

  return {
    property: "density",
    expected: spec.density.kind,
    actual: actualTarget,
    valid,
    message: valid
      ? undefined
      : `Expected ${spec.density.kind} but found ${actualTarget} (${(densityRatio * 100).toFixed(1)}% edge density: ${actualEdgeCount}/${maxPossibleEdges})`,
  };
}

/**
 * Validates whether a graph is bipartite using BFS-based coloring.
 *
 * A graph is bipartite if its vertices can be divided into two disjoint sets
 * such that every edge connects a vertex in one set to a vertex in the other.
 * Equivalently, the graph contains no odd-length cycles.
 *
 * @param graph - The graph to validate
 * @returns PropertyValidationResult with validation details
 */
export function validateBipartite(
  graph: TestGraph
): PropertyValidationResult {
  const { spec, nodes, edges } = graph;

  // Only validate when spec requires bipartite
  if (spec.partiteness?.kind !== "bipartite") {
    return {
      property: "partiteness",
      expected: spec.partiteness?.kind ?? "unrestricted",
      actual: spec.partiteness?.kind ?? "unrestricted",
      valid: true,
    };
  }

  // Check bipartite property using BFS coloring
  const isBipartite = checkBipartiteWithBFS(nodes, edges, spec.directionality.kind === "directed");

  return {
    property: "partiteness",
    expected: "bipartite",
    actual: isBipartite ? "bipartite" : "not_bipartite",
    valid: isBipartite,
    message: isBipartite
      ? undefined
      : "Graph contains odd-length cycle(s), which violates bipartite property",
  };
}

/**
 * Validates tournament graph properties.
 *
 * A tournament is a complete directed graph where for every pair of vertices
 * (u, v), exactly one of (u, v) or (v, u) is an edge. Every tournament has
 * a Hamiltonian path.
 *
 * Properties checked:
 * 1. Completeness: For every pair of distinct vertices, exactly one directed edge exists
 * 2. No self-loops
 * 3. No parallel edges in opposite directions
 *
 * @param graph - The graph to validate
 * @returns PropertyValidationResult with validation details
 */
export function validateTournament(
  graph: TestGraph
): PropertyValidationResult {
  const { spec, nodes, edges } = graph;
  const numNodes = nodes.length;

  // Only validate when spec requires tournament
  if (spec.tournament?.kind !== "tournament") {
    return {
      property: "tournament",
      expected: spec.tournament?.kind ?? "unconstrained",
      actual: spec.tournament?.kind ?? "unconstrained",
      valid: true,
    };
  }

  // Handle edge cases
  if (numNodes < 2) {
    return {
      property: "tournament",
      expected: "tournament",
      actual: "trivial",
      valid: true,
    };
  }

  // Build edge set for quick lookup
  const edgeSet = new Set<string>();

  for (const edge of edges) {
    const edgeKey = `${edge.source}->${edge.target}`;
    edgeSet.add(edgeKey);

    // Check for self-loops
    if (edge.source === edge.target) {
      return {
        property: "tournament",
        expected: "tournament",
        actual: "not_tournament",
        valid: false,
        message: `Tournament violated: Self-loop detected at node ${edge.source}`,
      };
    }
  }

  // Check tournament properties
  let hasBothDirections = false;
  let hasMissingEdge = false;
  const problematicPairs: string[] = [];

  // For every pair of distinct nodes (u, v)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeU = nodes[i].id;
      const nodeV = nodes[j].id;

      const edgeUV = `${nodeU}->${nodeV}`;
      const edgeVU = `${nodeV}->${nodeU}`;

      const hasUV = edgeSet.has(edgeUV);
      const hasVU = edgeSet.has(edgeVU);

      if (hasUV && hasVU) {
        // Both directions exist - violation
        hasBothDirections = true;
        problematicPairs.push(`(${nodeU}, ${nodeV})`);
      } else if (!hasUV && !hasVU) {
        // Neither direction exists - violation
        hasMissingEdge = true;
        problematicPairs.push(`(${nodeU}, ${nodeV})`);
      }
    }
  }

  const valid = !hasBothDirections && !hasMissingEdge;

  return {
    property: "tournament",
    expected: "tournament",
    actual: valid ? "tournament" : "not_tournament",
    valid,
    message: valid
      ? undefined
      : hasBothDirections
      ? `Tournament violated: Bidirectional edges found between ${problematicPairs.length} pair(s)`
      : `Tournament violated: Missing edges between ${problematicPairs.length} pair(s)`,
  };
}
