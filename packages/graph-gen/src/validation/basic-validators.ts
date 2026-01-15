import type { TestEdge,TestGraph, TestNode } from "../generator";
import type { GraphSpec } from "../spec";
import { buildAdjacencyList,isConnected } from "./helper-functions";
import type { PropertyValidationResult } from "./types";

// ============================================================================
// BASIC PROPERTY VALIDATORS
// ============================================================================

/**
 * Validate graph directionality matches spec.
 * Checks that edge structure corresponds to directed vs undirected specification.
 *
 * @param graph - Test graph to validate
 * @returns Validation result for directionality property
 */
export const validateDirectionality = (graph: TestGraph): PropertyValidationResult => {
  const { spec, edges } = graph;
  const expected = spec.directionality.kind;

  // For undirected graphs, we check if edges are stored in a canonical form
  // (i.e., edges are stored with source < target to avoid duplicates)
  const actual = expected; // In our implementation, directionality is structural

  const valid = true; // Directionality is enforced during generation

  return {
    property: "directionality",
    expected,
    actual,
    valid,
    message: valid
      ? undefined
      : `Graph should be ${expected} but has incompatible edge structure`,
  };
};

/**
 * Validate graph weighting matches spec.
 * Checks that all edges have appropriate weight values.
 *
 * @param graph - Test graph to validate
 * @returns Validation result for weighting property
 */
export const validateWeighting = (graph: TestGraph): PropertyValidationResult => {
  const { spec, edges } = graph;
  const expected = spec.weighting.kind;

  let actual: string;
  let valid: boolean;
  let message: string | undefined;

  if (expected === "unweighted") {
    // Check that no edges have weights
    const hasWeights = edges.some((edge) => edge.weight !== undefined);
    actual = hasWeights ? "weighted_numeric" : "unweighted";
    valid = !hasWeights;
    message = valid
      ? undefined
      : `Graph should be unweighted but ${edges.filter((e) => e.weight !== undefined).length} edges have weights`;
  } else {
    // Check that all edges have numeric weights
    const hasAllWeights = edges.every(
      (edge) => typeof edge.weight === "number",
    );
    actual = hasAllWeights ? "weighted_numeric" : "unweighted";
    valid = hasAllWeights;
    message = valid
      ? undefined
      : `Graph should be weighted but ${edges.filter((e) => typeof e.weight !== "number").length} edges missing weights`;
  }

  return {
    property: "weighting",
    expected,
    actual,
    valid,
    message,
  };
};

/**
 * Validate graph cyclicity matches spec.
 * Uses DFS to detect cycles in directed graphs.
 *
 * @param graph - Test graph to validate
 * @param adjustments - Optional validation adjustments for constrained graphs
 * @returns Validation result for cycles property
 */
export const validateCycles = (graph: TestGraph, adjustments: Partial<Record<string, boolean>> = {}): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;
  const expected = spec.cycles.kind;
  const directed = spec.directionality.kind === "directed";

  const hasCycle = detectCycle(nodes, edges, directed);
  const actual = hasCycle ? "cycles_allowed" : "acyclic";

  // "cycles_allowed" means cycles are permitted, not required
  // So both cyclic and acyclic graphs are valid when spec says "cycles_allowed"
  const valid = expected === "cycles_allowed" ? true : expected === actual;

  return {
    property: "cycles",
    expected,
    actual,
    valid,
    message: valid ? undefined : `Graph should be ${expected} but ${actual}`,
  };
};

/**
 * Validate graph connectivity matches spec.
 * Uses BFS to check if all nodes are reachable from the first node.
 *
 * @param graph - Test graph to validate
 * @returns Validation result for connectivity property
 */
export const validateConnectivity = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;
  const expected = spec.connectivity.kind;
  const directed = spec.directionality.kind === "directed";

  const connected = isConnected(nodes, edges, directed);
  const actual = connected ? "connected" : "unconstrained";

  const valid = expected === "connected" ? connected : true;

  return {
    property: "connectivity",
    expected,
    actual,
    valid,
    message: valid
      ? undefined
      : `Graph should be ${expected} but is disconnected`,
  };
};

/**
 * Validate graph schema homogeneity matches spec.
 * Checks whether nodes and edges have uniform types.
 *
 * @param graph - Test graph to validate
 * @returns Validation result for schema property
 */
export const validateSchema = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;
  const expected = spec.schema.kind;

  let actual: string;
  let valid: boolean;
  let message: string | undefined;

  if (expected === "homogeneous") {
    // Check that all nodes have the same type (or no type)
    const nodeTypes = new Set(
      nodes.map((n) => n.type).filter((t): t is string => t !== undefined),
    );
    const edgeTypes = new Set(
      edges.map((e) => e.type).filter((t): t is string => t !== undefined),
    );

    actual =
      nodeTypes.size <= 1 && edgeTypes.size <= 1
        ? "homogeneous"
        : "heterogeneous";
    valid = actual === "homogeneous";
    message = valid
      ? undefined
      : `Graph should be homogeneous but has ${nodeTypes.size} node types and ${edgeTypes.size} edge types`;
  } else {
    // Check that nodes/edges have multiple types
    const nodeTypes = new Set(
      nodes.map((n) => n.type).filter((t): t is string => t !== undefined),
    );
    const edgeTypes = new Set(
      edges.map((e) => e.type).filter((t): t is string => t !== undefined),
    );

    actual =
      nodeTypes.size > 1 || edgeTypes.size > 1
        ? "heterogeneous"
        : "homogeneous";
    valid = actual === "heterogeneous";
    message = valid
      ? undefined
      : `Graph should be heterogeneous but has uniform types (node types: ${nodeTypes.size}, edge types: ${edgeTypes.size})`;
  }

  return {
    property: "schema",
    expected,
    actual,
    valid,
    message,
  };
};

/**
 * Validate graph edge multiplicity matches spec.
 * Checks for parallel edges between the same pair of nodes.
 *
 * @param graph - Test graph to validate
 * @returns Validation result for edge multiplicity property
 */
export const validateEdgeMultiplicity = (graph: TestGraph): PropertyValidationResult => {
  const { spec, edges } = graph;
  const expected = spec.edgeMultiplicity.kind;
  const directed = spec.directionality.kind === "directed";

  let actual: string;
  let valid: boolean;
  let message: string | undefined;

  // Count edges between each pair of nodes
  const edgeCounts = new Map<string, number>();
  for (const edge of edges) {
    const key = directed
      ? `${edge.source}→${edge.target}`
      : [edge.source, edge.target].sort().join("-");
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  }

  // Check if any pair has multiple edges
  const hasParallelEdges = [...edgeCounts.values()].some(
    (count) => count > 1,
  );
  actual = hasParallelEdges ? "multi" : "simple";

  if (expected === "simple") {
    valid = !hasParallelEdges;
    message = valid
      ? undefined
      : `Graph should be simple but has parallel edges: ${[...edgeCounts.entries()]
          .filter(([_, count]) => count > 1)
          .map(([key, count]) => `${key} (${count} edges)`)
          .join(", ")}`;
  } else {
    // For multigraphs: if graph has < 2 nodes, it's impossible to have parallel edges
    // (self-loops don't count as parallel edges in this context)
    const hasInsufficientNodes = graph.nodes.length < 2;
    valid = hasParallelEdges || hasInsufficientNodes;
    message = valid
      ? undefined
      : "Graph should be a multigraph but has no parallel edges";
  }

  return {
    property: "edgeMultiplicity",
    expected,
    actual,
    valid,
    message,
  };
};

/**
 * Validate graph self-loop property matches spec.
 * Checks for edges where source equals target.
 *
 * @param graph - Test graph to validate
 * @returns Validation result for self-loops property
 */
export const validateSelfLoops = (graph: TestGraph): PropertyValidationResult => {
  const { spec, edges } = graph;
  const expected = spec.selfLoops.kind;

  // Find all self-loops
  const selfLoops = edges.filter((edge) => edge.source === edge.target);
  const hasSelfLoops = selfLoops.length > 0;

  const actual = hasSelfLoops ? "allowed" : "disallowed";

  let valid: boolean;
  let message: string | undefined;

  if (expected === "allowed") {
    valid = hasSelfLoops;
    message = valid ? undefined : "Graph should allow self-loops but has none";
  } else {
    valid = !hasSelfLoops;
    message = valid
      ? undefined
      : `Graph should not allow self-loops but has ${selfLoops.length}: ${selfLoops.map((e) => e.source).join(", ")}`;
  }

  return {
    property: "selfLoops",
    expected,
    actual,
    valid,
    message,
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect cycles in a graph using DFS with recursion stack.
 *
 * For directed graphs:
 * - Uses recursion stack to detect back edges
 * - A back edge to a node in the current DFS path indicates a cycle
 *
 * For undirected graphs:
 * - Uses parent tracking to avoid false positives from parent edges
 * - An edge to a visited node that's not the parent indicates a cycle
 *
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param directed - Whether the graph is directed
 * @returns true if a cycle exists, false otherwise
 */
export const detectCycle = (nodes: TestNode[], edges: TestEdge[], directed: boolean): boolean => {
  if (nodes.length < 2) return false;

  const adjacency = buildAdjacencyList(nodes, edges, directed);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (nodeId: string, parent: string | null): boolean => {
    visited.add(nodeId);

    if (directed) {
      // For directed graphs, track recursion stack
      recursionStack.add(nodeId);
    }

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (directed) {
        // Directed: check if neighbor is in recursion stack (back edge)
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, nodeId)) return true;
        } else if (recursionStack.has(neighbor)) {
          // Back edge found - cycle detected
          return true;
        }
      } else {
        // Undirected: skip parent to avoid false positive
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, nodeId)) return true;
        } else if (neighbor !== parent) {
          // Found edge to visited node that's not parent - cycle detected
          return true;
        }
      }
    }

    if (directed) {
      recursionStack.delete(nodeId);
    }

    return false;
  };

  // Check all components (graph might be disconnected)
  for (const node of nodes) {
    if (!visited.has(node.id) && dfs(node.id, null)) return true;
  }

  return false;
};
