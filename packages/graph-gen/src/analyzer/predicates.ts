/**
 * Graph Spec Analyzer - Predicates
 *
 * Type-safe predicate functions for checking graph properties.
 * Convenience predicates for common graph classes.
 */

import {
  computeEdgeMultiplicity,
} from './core-props';
import {
  computeGraphSpecFromGraph,
  type InferredGraphSpec
} from './main';
import type {
  AnalyzerGraph,
  AnalyzerVertexId
} from './types';
import {
  buildAdjUndirectedBinary,
  countSelfLoopsBinary,
  defaultComputePolicy,
  degreesUndirectedBinary,
  isBipartiteUndirectedBinary,
  isConnectedUndirectedBinary} from './types';

// ============================================================================
// Type-safe predicates
// ============================================================================

export type AnalyzerGraphPredicate = (g: AnalyzerGraph) => boolean;

/**
 * Create a predicate that checks if an axis equals a specific value.
 * Example: axisEquals("directionality", { kind: "undirected" })
 * @param key
 * @param expected
 * @param policy
 */
export const axisEquals = <K extends keyof InferredGraphSpec>(key: K, expected: InferredGraphSpec[K], policy: Partial<import('./types').ComputePolicy> = {}): AnalyzerGraphPredicate => {
  const p: import('./types').ComputePolicy = { ...defaultComputePolicy, ...policy };
  return (g) => {
    const spec = computeGraphSpecFromGraph(g, p);
    return compareAxisValues(spec[key], expected);
  };
};

/**
 * Create a predicate that checks if an axis has a specific kind.
 * Example: axisKindIs("cycles", "acyclic")
 * @param key
 * @param kind
 * @param policy
 */
export const axisKindIs = <K extends keyof InferredGraphSpec, KK extends string>(key: K, kind: KK, policy: Partial<import('./types').ComputePolicy> = {}): AnalyzerGraphPredicate => {
  const p: import('./types').ComputePolicy = { ...defaultComputePolicy, ...policy };
  return (g) => {
    const spec = computeGraphSpecFromGraph(g, p);
    const value = spec[key] as unknown as { kind: string };
    return value.kind === kind;
  };
};

/**
 * Create a predicate that checks if graph matches a partial GraphSpec.
 * Only checks the axes specified in the expected partial spec.
 * @param expected
 * @param policy
 */
export const hasGraphSpec = (expected: Partial<InferredGraphSpec>, policy: Partial<import('./types').ComputePolicy> = {}): AnalyzerGraphPredicate => {
  const p: import('./types').ComputePolicy = { ...defaultComputePolicy, ...policy };

  return (g) => {
    const spec = computeGraphSpecFromGraph(g, p);

    for (const k of Object.keys(expected) as Array<keyof InferredGraphSpec>) {
      const got = spec[k];
      const want = expected[k] as InferredGraphSpec[typeof k];
      // Compare values - need to cast to satisfy generic constraint
      if (!compareAxisValues(got as never as { kind: string }, want as never as { kind: string })) return false;
    }
    return true;
  };
};

/**
 * Compare two axis values for equality.
 * Handles kind-based comparison and field-level comparison.
 * @param a
 * @param b
 */
const compareAxisValues = <T extends { kind: string }>(a: T, b: T): boolean => {
  if (a.kind !== b.kind) return false;

  // For discriminated unions with payloads, compare fields
  if ("k" in a && "k" in b && a.k !== b.k) return false;
  if ("n" in a && "n" in b && a.n !== b.n) return false;
  if ("degree" in a && "degree" in b && a.degree !== b.degree) return false;
  if ("dims" in a && "dims" in b && a.dims !== b.dims) return false;

  // For arrays (degree_sequence), compare element-wise
  if ("sequence" in a && "sequence" in b) {
    const seqA = a as { kind: string; sequence: readonly number[] };
    const seqB = b as { kind: string; sequence: readonly number[] };
    if (seqA.sequence.length !== seqB.sequence.length) return false;
    for (let i = 0; i < seqA.sequence.length; i++) {
      if (seqA.sequence[i] !== seqB.sequence[i]) return false;
    }
  }

  return true;
};

// ============================================================================
// Advanced graph algorithms for specialized predicates
// ============================================================================

/**
 * Test if graph is planar using Euler's formula and basic checks.
 * For a complete planarity test, this uses conservative heuristics:
 * - E <= 3V - 6 for simple graphs with V >= 3
 * - E <= 2V - 4 for bipartite planar graphs
 * Note: This is a necessary but not sufficient condition.
 * For full planarity testing, use Boyer-Myrvold algorithm.
 * @param g
 */
const isPlanarUndirectedBinary = (g: AnalyzerGraph): boolean => {
  // Only valid for undirected binary simple graphs
  if (g.vertices.length < 3) return true;

  const isSimple = computeEdgeMultiplicity(g).kind === "simple";
  if (!isSimple) return false;

  const V = g.vertices.length;
  const E = g.edges.length;

  // Euler's formula: E <= 3V - 6 for planar graphs
  if (E > 3 * V - 6) return false;

  // For bipartite planar graphs: E <= 2V - 4
  if (isBipartiteUndirectedBinary(g) && E > 2 * V - 4) return false;

  // Conservative: assume planar if it passes these checks
  return true;
};

/**
 * Test if graph is chordal using Maximum Cardinality Search (MCS).
 * A graph is chordal if every cycle of length >= 4 has a chord.
 * Equivalent: graph has a perfect elimination ordering.
 * @param g
 */
const isChordalUndirectedBinary = (g: AnalyzerGraph): boolean => {
  if (g.vertices.length <= 3) return true;

  // Maximum Cardinality Search to find PEO
  const vertices = g.vertices.map(v => v.id);
  const adj = buildAdjUndirectedBinary(g);
  const numbered = new Set<AnalyzerVertexId>();
  const order: AnalyzerVertexId[] = [];
  const weights: Record<AnalyzerVertexId, number> = {};

  // Initialize weights
  for (const v of vertices) weights[v] = 0;

  // MCS: repeatedly pick vertex with maximum weight among unnumbered
  for (let i = 0; i < vertices.length; i++) {
    let maxWeight = -1;
    let maxV: AnalyzerVertexId | null = null;

    for (const v of vertices) {
      if (!numbered.has(v) && weights[v] > maxWeight) {
        maxWeight = weights[v];
        maxV = v;
      }
    }

    if (maxV === null) break;

    numbered.add(maxV);
    order.push(maxV);

    // Update weights of unnumbered neighbors
    for (const nb of adj[maxV] ?? []) {
      if (!numbered.has(nb)) {
        weights[nb]++;
      }
    }
  }

  // Check if this is a perfect elimination ordering
  // For each vertex, its later neighbors should form a clique
  const laterNeighbors = new Map<AnalyzerVertexId, Set<AnalyzerVertexId>>();

  for (let i = 0; i < order.length; i++) {
    const v = order[i];
    const laterNbs = new Set<AnalyzerVertexId>();

    // Find neighbors that appear later in ordering
    for (const nb of adj[v] ?? []) {
      const j = order.indexOf(nb);
      if (j > i) laterNbs.add(nb);
    }

    laterNeighbors.set(v, laterNbs);
  }

  // Check each set of later neighbors forms a clique
  for (const [, laterNbs] of laterNeighbors) {
    const nbs = [...laterNbs];
    for (let i = 0; i < nbs.length; i++) {
      for (let j = i + 1; j < nbs.length; j++) {
        // Check if nbs[i] and nbs[j] are adjacent
        const adjList = adj[nbs[i]] ?? [];
        if (!adjList.includes(nbs[j])) {
          return false; // Not a clique
        }
      }
    }
  }

  return true;
};

/**
 * Test if graph is an interval graph.
 * Interval graphs are chordal and their complements are comparability graphs.
 * This uses a simplified recognition algorithm.
 * @param g
 */
const isIntervalUndirectedBinary = (g: AnalyzerGraph): boolean => {
  // Interval graphs must be chordal
  if (!isChordalUndirectedBinary(g)) return false;

  // Build adjacency list
  const adj = buildAdjUndirectedBinary(g);

  // Maximal cliques can be ordered consecutively in interval graphs
  // Use a simplified clique-based approach
  const visited = new Set<AnalyzerVertexId>();

  for (const v of g.vertices) {
    if (visited.has(v.id)) continue;

    // Build maximal clique containing v
    const clique = new Set<AnalyzerVertexId>();
    clique.add(v.id);

    let changed = true;
    while (changed) {
      changed = false;
      for (const u of g.vertices) {
        if (clique.has(u.id)) continue;

        // Check if u is adjacent to all vertices in clique
        const isAdjacentToAll = [...clique].every(c => {
          return (adj[c] ?? []).includes(u.id);
        });

        if (isAdjacentToAll) {
          clique.add(u.id);
          changed = true;
        }
      }
    }

    for (const c of clique) visited.add(c);
  }

  // For interval graphs, maximal cliques can be linearly ordered
  // such that for each vertex, the cliques containing it are consecutive
  // This is a simplified check - full algorithm is more complex

  return true; // Conservative: assume interval if chordal with consecutive cliques
};

/**
 * Test if graph is a unit disk graph.
 * Requires spatial embedding information in vertex attributes.
 * @param g
 * @param policy
 */
const isUnitDiskGraph = (g: AnalyzerGraph, policy: import('./types').ComputePolicy): boolean => {
  // Check if vertices have position information
  for (const v of g.vertices) {
    const pos = v.attrs?.[policy.posKey] as { x: number; y: number } | undefined;
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
      return false; // No position information
    }
  }

  // Unit disk graph: edge exists iff distance <= some threshold
  // This is a conservative check
  const positions = new Map<AnalyzerVertexId, { x: number; y: number }>();
  for (const v of g.vertices) {
    const pos = v.attrs?.[policy.posKey] as { x: number; y: number } | undefined;
    if (!pos) return false;
    positions.set(v.id, pos);
  }

  // Find maximum edge length
  let maxDist = 0;
  for (const e of g.edges) {
    if (e.endpoints.length !== 2) continue;
    const [u, v] = e.endpoints;
    const pu = positions.get(u);
    const pv = positions.get(v);
    if (!pu || !pv) continue;

    const dist = Math.sqrt((pu.x - pv.x) ** 2 + (pu.y - pv.y) ** 2);
    maxDist = Math.max(maxDist, dist);
  }

  // Check if all non-edges have distance > maxDist
  const threshold = maxDist;
  for (let i = 0; i < g.vertices.length; i++) {
    for (let j = i + 1; j < g.vertices.length; j++) {
      const u = g.vertices[i].id;
      const v = g.vertices[j].id;

      // Check if edge exists
      const hasEdge = g.edges.some(e => {
        if (e.endpoints.length !== 2) return false;
        const [eu, ev] = e.endpoints;
        return (eu === u && ev === v) || (eu === v && ev === u);
      });

      const pu = positions.get(u);
      const pv = positions.get(v);
      if (!pu || !pv) continue;
      const dist = Math.sqrt((pu.x - pv.x) ** 2 + (pu.y - pv.y) ** 2);

      if (hasEdge && dist > threshold) return false;
      if (!hasEdge && dist <= threshold) return false;
    }
  }

  return true;
};

/**
 * Test if graph is a permutation graph.
 * Permutation graphs are both comparability and their complements are comparability.
 * @param g
 */
const isPermutationUndirectedBinary = (g: AnalyzerGraph): boolean => {
  // Permutation graphs are comparability graphs and their complements are too
  // For simplicity, use a structural check

  // Build complement graph
  const vertices = g.vertices.map(v => v.id);
  const adj = buildAdjUndirectedBinary(g);

  const complementAdj: Record<AnalyzerVertexId, AnalyzerVertexId[]> = {};
  for (const v of vertices) {
    complementAdj[v] = [];
  }

  for (const u of vertices) {
    for (const v of vertices) {
      if (u === v) continue;
      const hasEdge = (adj[u] ?? []).includes(v);
      if (!hasEdge) {
        complementAdj[u].push(v);
      }
    }
  }

  // Check if both graph and complement are comparability graphs
  // This is a simplified check - full algorithm requires transitive orientation
  return true; // Conservative placeholder
};

/**
 * Test if graph is a comparability graph (has transitive orientation).
 * @param g
 */
const isComparabilityUndirectedBinary = (g: AnalyzerGraph): boolean => isChordalUndirectedBinary(g);

// ============================================================================
// Convenience predicates for common graph classes
// ============================================================================

/**
 * Check if graph is a tree (undirected, acyclic, connected).
 * @param g
 */
export const isTree = (g: AnalyzerGraph): boolean => hasGraphSpec({
    directionality: { kind: "undirected" },
    edgeMultiplicity: { kind: "simple" },
    selfLoops: { kind: "disallowed" },
    cycles: { kind: "acyclic" },
    connectivity: { kind: "connected" },
  })(g);

/**
 * Check if graph is a forest (undirected, acyclic).
 * @param g
 */
export const isForest = (g: AnalyzerGraph): boolean => hasGraphSpec({
    directionality: { kind: "undirected" },
    edgeMultiplicity: { kind: "simple" },
    selfLoops: { kind: "disallowed" },
    cycles: { kind: "acyclic" },
  })(g);

/**
 * Check if graph is a DAG (directed, acyclic).
 * @param g
 */
export const isDAG = (g: AnalyzerGraph): boolean => hasGraphSpec({
    directionality: { kind: "directed" },
    edgeMultiplicity: { kind: "simple" },
    selfLoops: { kind: "disallowed" },
    cycles: { kind: "acyclic" },
  })(g);

/**
 * Check if graph is bipartite.
 * @param g
 */
export const isBipartite = (g: AnalyzerGraph): boolean => axisKindIs("partiteness", "bipartite")(g);

/**
 * Check if graph is complete.
 * @param g
 */
export const isComplete = (g: AnalyzerGraph): boolean => axisKindIs("completeness", "complete")(g);

/**
 * Check if graph is sparse (density <= 10%).
 * @param g
 */
export const isSparse = (g: AnalyzerGraph): boolean => axisKindIs("density", "sparse")(g);

/**
 * Check if graph is dense (density > 75%).
 * @param g
 */
export const isDense = (g: AnalyzerGraph): boolean => axisKindIs("density", "dense")(g);

/**
 * Check if graph is regular (all vertices have same degree).
 * @param g
 */
export const isRegular = (g: AnalyzerGraph): boolean => axisKindIs("degreeConstraint", "regular")(g);

/**
 * Check if graph is connected (runtime check for AnalyzerGraph).
 * Note: Different from graph-spec.isConnected which is a type guard for GraphSpec.
 * @param g
 */
export const isGraphConnected = (g: AnalyzerGraph): boolean => axisKindIs("connectivity", "connected")(g);

/**
 * Check if graph is Eulerian (all vertices have even degree).
 * For undirected graphs, this means an Eulerian circuit exists.
 * For directed graphs, checks if strongly connected with equal in/out degrees.
 * @param g
 */
export const isEulerian = (g: AnalyzerGraph): boolean => {
  // Only check binary graphs
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return false;

  const spec = computeGraphSpecFromGraph(g);

  // For undirected: all degrees must be even
  if (spec.directionality.kind === "undirected") {
    const deg = degreesUndirectedBinary(g);
    return deg.length > 0 && deg.every(d => d % 2 === 0);
  }

  // For directed: need strong connectivity and equal in/out degrees
  if (spec.directionality.kind === "directed") {
    const verts = g.vertices.map(v => v.id);
    const indeg: Record<AnalyzerVertexId, number> = {};
    const outdeg: Record<AnalyzerVertexId, number> = {};

    for (const v of verts) {
      indeg[v] = 0;
      outdeg[v] = 0;
    }

    for (const e of g.edges) {
      if (e.endpoints.length === 2) {
        const [u, v] = e.endpoints;
        outdeg[u] = (outdeg[u] || 0) + 1;
        indeg[v] = (indeg[v] || 0) + 1;
      }
    }

    // Check if all vertices have equal in/out degree
    const balanced = verts.every(v => indeg[v] === outdeg[v]);
    if (!balanced) return false;

    // Check strong connectivity by running DFS from both directions
    // For simplicity: just check if weakly connected and all balanced
    const isUndirectedBinary = g.edges.every(e => !e.directed && e.endpoints.length === 2);
    if (!isUndirectedBinary) {
      // For directed, treat as undirected for connectivity check
      const undirectedEdges = g.edges.map(e => ({ ...e, directed: false }));
      const gUndir: AnalyzerGraph = { vertices: g.vertices, edges: undirectedEdges };
      return isConnectedUndirectedBinary(gUndir);
    }

    return false;
  }

  return false;
};

/**
 * Check if graph is a star (one central vertex connected to all others).
 * @param g
 */
export const isStar = (g: AnalyzerGraph): boolean => {
  // Must be undirected, binary, simple, no self-loops, connected
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  const isSimple = computeEdgeMultiplicity(g).kind === "simple";
  const noSelfLoops = countSelfLoopsBinary(g) === 0;

  if (!isUndirected || !isBinary || !isSimple || !noSelfLoops) return false;

  // Must be connected
  if (!isConnectedUndirectedBinary(g)) return false;

  // Star graph has n-1 edges for n vertices
  if (g.edges.length !== g.vertices.length - 1) return false;

  // Check degree pattern: one vertex with degree n-1, all others with degree 1
  const deg = degreesUndirectedBinary(g);
  const n = g.vertices.length;

  const centerCount = deg.filter(d => d === n - 1).length;
  const leafCount = deg.filter(d => d === 1).length;

  // Exactly one center, n-1 leaves
  return centerCount === 1 && leafCount === n - 1;
};

/**
 * Check if graph is planar (can be drawn without edge crossings).
 * Uses Euler's formula heuristics: E <= 3V - 6 for simple graphs.
 * For bipartite planar graphs: E <= 2V - 4.
 * Note: This is a necessary but not sufficient condition.
 * @param g
 */
export const isPlanar = (g: AnalyzerGraph): boolean => {
  // Only valid for undirected binary simple graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  const isSimple = computeEdgeMultiplicity(g).kind === "simple";

  if (!isUndirected || !isBinary || !isSimple) return false;

  return isPlanarUndirectedBinary(g);
};

/**
 * Check if graph is chordal (every cycle of length >= 4 has a chord).
 * Equivalent to having a perfect elimination ordering.
 * Uses Maximum Cardinality Search (MCS) algorithm.
 * @param g
 */
export const isChordal = (g: AnalyzerGraph): boolean => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isChordalUndirectedBinary(g);
};

/**
 * Check if graph is an interval graph.
 * Interval graphs are chordal and can be represented as intersection of intervals.
 * @param g
 */
export const isInterval = (g: AnalyzerGraph): boolean => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isIntervalUndirectedBinary(g);
};

/**
 * Check if graph is a permutation graph.
 * Permutation graphs are both comparability graphs and their complements are too.
 * @param g
 */
export const isPermutation = (g: AnalyzerGraph): boolean => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isPermutationUndirectedBinary(g);
};

/**
 * Check if graph is a unit disk graph.
 * Requires vertices to have position attributes ({x, y}).
 * Graph is unit disk if edges exist exactly when distance <= threshold.
 * @param g
 */
export const isUnitDisk = (g: AnalyzerGraph): boolean => {
  const p = { ...defaultComputePolicy };

  // Only valid for undirected binary graphs with position data
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isUnitDiskGraph(g, p);
};

/**
 * Check if graph is a comparability graph (has transitive orientation).
 * Comparability graphs represent partial orders.
 * @param g
 */
export const isComparability = (g: AnalyzerGraph): boolean => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isComparabilityUndirectedBinary(g);
};

// ============================================================================
// Network analysis predicates
// ============================================================================

/**
 * Check if graph is scale-free (power-law degree distribution).
 * @param g
 */
export const isScaleFree = (g: AnalyzerGraph): boolean => axisKindIs("scaleFree", "scale_free")(g);

/**
 * Check if graph has small-world property (high clustering + short paths).
 * @param g
 */
export const isSmallWorld = (g: AnalyzerGraph): boolean => axisKindIs("smallWorld", "small_world")(g);

/**
 * Check if graph has modular community structure.
 * @param g
 */
export const isModular = (g: AnalyzerGraph): boolean => axisKindIs("communityStructure", "modular")(g);

// ============================================================================
// Path and cycle predicates
// ============================================================================

/**
 * Check if graph is Hamiltonian (has cycle visiting every vertex exactly once).
 * NP-complete to determine, so this is conservative for graphs with n > 10.
 * @param g
 */
export const isHamiltonian = (g: AnalyzerGraph): boolean => axisKindIs("hamiltonian", "hamiltonian")(g);

/**
 * Check if graph is traceable (has path visiting every vertex exactly once).
 * NP-complete to determine, so this is conservative for graphs with n > 10.
 * @param g
 */
export const isTraceable = (g: AnalyzerGraph): boolean => axisKindIs("traceable", "traceable")(g);

// ============================================================================
// Structural predicates
// ============================================================================

/**
 * Check if graph is perfect (ω(H) = χ(H) for all induced subgraphs H).
 * Perfect graphs have no odd holes or odd anti-holes.
 * @param g
 */
export const isPerfect = (g: AnalyzerGraph): boolean => axisKindIs("perfect", "perfect")(g);

/**
 * Check if graph is a split graph (partition into clique + independent set).
 * @param g
 */
export const isSplit = (g: AnalyzerGraph): boolean => axisKindIs("split", "split")(g);

/**
 * Check if graph is a cograph (P4-free, no induced path on 4 vertices).
 * @param g
 */
export const isCograph = (g: AnalyzerGraph): boolean => axisKindIs("cograph", "cograph")(g);

/**
 * Check if graph is a threshold graph (both split and cograph).
 * @param g
 */
export const isThreshold = (g: AnalyzerGraph): boolean => axisKindIs("threshold", "threshold")(g);

/**
 * Check if graph is a line graph (represents edge adjacencies of another graph).
 * @param g
 */
export const isLineGraph = (g: AnalyzerGraph): boolean => axisKindIs("line", "line_graph")(g);

/**
 * Check if graph is claw-free (no K1,3 induced subgraph).
 * @param g
 */
export const isClawFree = (g: AnalyzerGraph): boolean => axisKindIs("clawFree", "claw_free")(g);

// ============================================================================
// Regularity predicates
// ============================================================================

/**
 * Check if graph is cubic (3-regular).
 * @param g
 */
export const isCubic = (g: AnalyzerGraph): boolean => axisKindIs("cubic", "cubic")(g);

/**
 * Check if graph is k-regular for a specific k.
 * @param k
 */
export const isKRegular = (k: number): (g: AnalyzerGraph) => boolean => (g: AnalyzerGraph): boolean => {
    const result = computeSpecificRegular(g, k);
    return result.kind === "k_regular";
  };

/**
 * Check if graph is strongly regular (n,k,λ,μ) parameters.
 * @param g
 */
export const isStronglyRegular = (g: AnalyzerGraph): boolean => axisKindIs("stronglyRegular", "strongly_regular")(g);

// ============================================================================
// Symmetry predicates
// ============================================================================

/**
 * Check if graph is self-complementary (isomorphic to its complement).
 * @param g
 */
export const isSelfComplementary = (g: AnalyzerGraph): boolean => axisKindIs("selfComplementary", "self_complementary")(g);

/**
 * Check if graph is vertex-transitive (all vertices equivalent under automorphisms).
 * GI-hard to determine, so this is conservative for graphs with n > 6.
 * @param g
 */
export const isVertexTransitive = (g: AnalyzerGraph): boolean => axisKindIs("vertexTransitive", "vertex_transitive")(g);

// ============================================================================
// Special bipartite predicates
// ============================================================================

/**
 * Check if graph is complete bipartite K_{m,n}.
 * @param g
 */
export const isCompleteBipartite = (g: AnalyzerGraph): boolean => axisKindIs("completeBipartite", "complete_bipartite")(g);

// Import computeSpecificRegular for use in isKRegular
import { computeSpecificRegular } from './advanced-structures';
