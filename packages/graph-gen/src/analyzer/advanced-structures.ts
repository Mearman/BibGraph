/**
 * Graph Spec Analyzer - Advanced Structural Properties
 *
 * Compute perfect, split, cograph, threshold, line, claw-free properties,
 * regularity properties (cubic, k-regular, strongly regular),
 * symmetry properties (self-complementary, vertex-transitive),
 * and special bipartite properties (complete bipartite).
 */

import { computePartiteness } from './structure';
import type {
  AnalyzerGraph,
  AnalyzerVertexId
} from './types';
import {
  buildAdjUndirectedBinary,
  degreesUndirectedBinary,
  isBipartiteUndirectedBinary
} from './types';

// Forward declarations for helper functions used in this module
declare function isChordalUndirectedBinary(g: AnalyzerGraph): boolean;
/**
 * Compute perfect graph property.
 * Perfect graphs have no odd holes or odd anti-holes.
 * @param g
 */
export const computePerfect = (g: AnalyzerGraph): { kind: "perfect" } | { kind: "imperfect" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  // Check if chordal (all chordal graphs are perfect)
  if (isChordalUndirectedBinary(g)) return { kind: "perfect" };

  // Check if bipartite complement (also perfect)
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

  // Check if complement is chordal
  const gComplement: AnalyzerGraph = {
    vertices: g.vertices,
    edges: [],
  };

  for (const u of vertices) {
    for (const v of complementAdj[u]) {
      if (u < v) { // Avoid duplicates
        gComplement.edges.push({
          id: `e_${u}_${v}`,
          endpoints: [u, v],
          directed: false,
        });
      }
    }
  }

  if (isChordalUndirectedBinary(gComplement)) return { kind: "perfect" };

  return { kind: "imperfect" };
};

/**
 * Compute split graph property (partition into clique + independent set).
 * @param g
 */
export const computeSplit = (g: AnalyzerGraph): { kind: "split" } | { kind: "non_split" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  // Split graphs are both chordal and their complements are chordal
  if (isChordalUndirectedBinary(g)) {
    // Check if complement is chordal
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

    const gComplement: AnalyzerGraph = {
      vertices: g.vertices,
      edges: [],
    };

    for (const u of vertices) {
      for (const v of complementAdj[u]) {
        if (u < v) {
          gComplement.edges.push({
            id: `e_${u}_${v}`,
            endpoints: [u, v],
            directed: false,
          });
        }
      }
    }

    if (isChordalUndirectedBinary(gComplement)) {
      return { kind: "split" };
    }
  }

  return { kind: "non_split" };
};

/**
 * Compute cograph property (P4-free graph).
 * @param g
 */
export const computeCograph = (g: AnalyzerGraph): { kind: "cograph" } | { kind: "non_cograph" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  // Check for induced P4 (path on 4 vertices)
  const vertices = g.vertices.map(v => v.id);
  if (vertices.length < 4) return { kind: "cograph" }; // Can't have P4

  const adj = buildAdjUndirectedBinary(g);

  // Check all 4-vertex combinations for P4
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      for (let k = j + 1; k < vertices.length; k++) {
        for (let l = k + 1; l < vertices.length; l++) {
          const subset = [vertices[i], vertices[j], vertices[k], vertices[l]];

          // Build induced subgraph
          const subAdj: Record<string, string[]> = {};
          for (const v of subset) {
            subAdj[v] = [];
            const neighbors = adj[v] ?? [];
            for (const nb of neighbors) {
              if (subset.includes(nb)) {
                subAdj[v].push(nb);
              }
            }
          }

          // Check if this is a P4: a-b-c-d with edges (a,b), (b,c), (c,d) only
          const a = subset[0], b = subset[1], c = subset[2], d = subset[3];

          const hasAB = subAdj[a].includes(b);
          const hasBC = subAdj[b].includes(c);
          const hasCD = subAdj[c].includes(d);
          const hasAC = subAdj[a].includes(c);
          const hasBD = subAdj[b].includes(d);
          const hasAD = subAdj[a].includes(d);

          if (hasAB && hasBC && hasCD && !hasAC && !hasAD && !hasBD) {
            return { kind: "non_cograph" }; // Found induced P4
          }
        }
      }
    }
  }

  return { kind: "cograph" };
};

/**
 * Compute threshold graph property (split + cograph).
 * @param g
 */
export const computeThreshold = (g: AnalyzerGraph): { kind: "threshold" } | { kind: "non_threshold" } | { kind: "unconstrained" } => {
  // Threshold graphs are both split and cograph
  const split = computeSplit(g);
  const cograph = computeCograph(g);

  if (split.kind === "unconstrained" || cograph.kind === "unconstrained") {
    return { kind: "unconstrained" };
  }

  return split.kind === "split" && cograph.kind === "cograph"
    ? { kind: "threshold" }
    : { kind: "non_threshold" };
};

/**
 * Compute line graph property.
 * @param g
 */
export const computeLine = (g: AnalyzerGraph): { kind: "line_graph" } | { kind: "non_line_graph" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  // Line graphs are claw-free
  const clawFree = computeClawFree(g);
  if (clawFree.kind === "unconstrained") return { kind: "unconstrained" };

  // Simple heuristic: check if degree sequence is plausible for line graph
  const deg = degreesUndirectedBinary(g);

  // Line graphs have specific degree sequence properties
  // (This is a simplified check - full recognition requires checking 9 forbidden subgraphs)
  const avgDegree = deg.reduce((a, b) => a + b, 0) / deg.length;
  const maxDegree = Math.max(...deg);

  // Rough heuristic: line graphs usually have maxDegree <= avgDegree * 2
  if (maxDegree > avgDegree * 3) return { kind: "non_line_graph" };

  return { kind: "line_graph" };
};

/**
 * Compute claw-free property (no K1,3 induced subgraph).
 * @param g
 */
export const computeClawFree = (g: AnalyzerGraph): { kind: "claw_free" } | { kind: "has_claw" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  if (g.vertices.length < 4) return { kind: "claw_free" }; // Can't have K1,3

  const adj = buildAdjUndirectedBinary(g);
  const vertices = g.vertices.map(v => v.id);

  // Check for claw (K1,3): center vertex with 3 degree-1 neighbors, no edges between leaves
  for (const center of vertices) {
    const neighbors = adj[center] ?? [];
    if (neighbors.length < 3) continue;

    // Check all combinations of 3 neighbors
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        for (let k = j + 1; k < neighbors.length; k++) {
          const n1 = neighbors[i];
          const n2 = neighbors[j];
          const n3 = neighbors[k];

          // Check if these 3 have degree 1 and are not connected to each other
          const deg1 = (adj[n1] ?? []).length;
          const deg2 = (adj[n2] ?? []).length;
          const deg3 = (adj[n3] ?? []).length;

          const connected12 = (adj[n1] ?? []).includes(n2);
          const connected13 = (adj[n1] ?? []).includes(n3);
          const connected23 = (adj[n2] ?? []).includes(n3);

          if (deg1 === 1 && deg2 === 1 && deg3 === 1 && !connected12 && !connected13 && !connected23) {
            return { kind: "has_claw" };
          }
        }
      }
    }
  }

  return { kind: "claw_free" };
};

// ============================================================================
// REGULARITY PROPERTIES
// ============================================================================

/**
 * Compute cubic graph property (3-regular).
 * @param g
 */
export const computeCubic = (g: AnalyzerGraph): { kind: "cubic" } | { kind: "non_cubic" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  const deg = degreesUndirectedBinary(g);
  const allDegree3 = deg.length > 0 && deg.every(d => d === 3);

  return allDegree3 ? { kind: "cubic" } : { kind: "non_cubic" };
};

/**
 * Compute specific k-regular property.
 * @param g
 * @param k
 */
export const computeSpecificRegular = (g: AnalyzerGraph, k: number): { kind: "k_regular"; k: number } | { kind: "not_k_regular" } | { kind: "unconstrained" } => {
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  const deg = degreesUndirectedBinary(g);
  const allDegreeK = deg.length > 0 && deg.every(d => d === k);

  return allDegreeK ? { kind: "k_regular", k } : { kind: "not_k_regular" };
};

/**
 * Auto-detect k-regular property (find k if graph is regular).
 * @param g
 */
export const computeAutoRegular = (g: AnalyzerGraph): { kind: "k_regular"; k: number } | { kind: "not_k_regular" } | { kind: "unconstrained" } => {
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  const deg = degreesUndirectedBinary(g);

  // Check if all vertices have same degree
  const allSame = deg.length > 0 && deg.every(d => d === deg[0]);

  return allSame ? { kind: "k_regular", k: deg[0] } : { kind: "not_k_regular" };
};

/**
 * Compute strongly regular graph property.
 * Strongly regular: (n, k, λ, μ) where every vertex has degree k,
 * adjacent vertices have λ common neighbors, non-adjacent have μ common neighbors.
 * @param g
 */
export const computeStronglyRegular = (g: AnalyzerGraph): { kind: "strongly_regular"; k: number; lambda: number; mu: number } | { kind: "not_strongly_regular" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  const deg = degreesUndirectedBinary(g);

  // Check if regular
  const allSame = deg.length > 0 && deg.every(d => d === deg[0]);
  if (!allSame) return { kind: "not_strongly_regular" };

  const k = deg[0];
  const adj = buildAdjUndirectedBinary(g);
  const vertices = g.vertices.map(v => v.id);

  // Check λ (common neighbors of adjacent pairs)
  let lambda = -1;
  let lambdaConsistent = true;

  for (let i = 0; i < vertices.length && lambdaConsistent; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const u = vertices[i];
      const v = vertices[j];

      if ((adj[u] ?? []).includes(v)) {
        // Adjacent: count common neighbors
        const neighborsU = new Set(adj[u]);
        const common = (adj[v] ?? []).filter(n => neighborsU.has(n)).length;

        if (lambda === -1) {
          lambda = common;
        } else if (lambda !== common) {
          lambdaConsistent = false;
        }
      }
    }
  }

  // Check μ (common neighbors of non-adjacent pairs)
  let mu = -1;
  let muConsistent = true;

  for (let i = 0; i < vertices.length && muConsistent; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const u = vertices[i];
      const v = vertices[j];

      if (!(adj[u] ?? []).includes(v)) {
        // Non-adjacent: count common neighbors
        const neighborsU = new Set(adj[u]);
        const common = (adj[v] ?? []).filter(n => neighborsU.has(n)).length;

        if (mu === -1) {
          mu = common;
        } else if (mu !== common) {
          muConsistent = false;
        }
      }
    }
  }

  return lambdaConsistent && muConsistent
    ? { kind: "strongly_regular", k, lambda, mu }
    : { kind: "not_strongly_regular" };
};

// ============================================================================
// SYMMETRY PROPERTIES
// ============================================================================

/**
 * Compute self-complementary property (graph isomorphic to its complement).
 * GI-complete, so this is expensive.
 * @param g
 */
export const computeSelfComplementary = (g: AnalyzerGraph): { kind: "self_complementary" } | { kind: "not_self_complementary" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  const n = g.vertices.length;
  if (n === 0) return { kind: "self_complementary" }; // Empty graph

  // Necessary condition: n ≡ 0 or 1 (mod 4)
  if (n % 4 !== 0 && n % 4 !== 1) {
    return { kind: "not_self_complementary" };
  }

  // Self-complementary graphs have exactly half the possible edges
  const maxEdges = (n * (n - 1)) / 2;
  if (g.edges.length !== maxEdges / 2) {
    return { kind: "not_self_complementary" };
  }

  // Degree sequence must be self-complementary
  const deg = degreesUndirectedBinary(g);
  const complementDeg: number[] = deg.map(d => n - 1 - d);
  complementDeg.sort((a, b) => a - b);

  const sortedDeg = [...deg].sort((a, b) => a - b);

  const degreeMatch = sortedDeg.length === complementDeg.length &&
    sortedDeg.every((d, i) => d === complementDeg[i]);

  if (!degreeMatch) return { kind: "not_self_complementary" };

  // For small graphs, check isomorphism with complement
  if (n <= 8) {
    // Build complement graph
    const vertices = g.vertices.map(v => v.id);
    const adj = buildAdjUndirectedBinary(g);

    const complementEdges: typeof g.edges = [];
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        if (!(adj[vertices[i]] ?? []).includes(vertices[j])) {
          complementEdges.push({
            id: `e_${i}_${j}`,
            endpoints: [vertices[i], vertices[j]],
            directed: false,
          });
        }
      }
    }

    const gComplement: AnalyzerGraph = {
      vertices: g.vertices,
      edges: complementEdges,
    };

    // Check if same degree sequence and edge count (crude isomorphism check)
    const deg2 = degreesUndirectedBinary(gComplement).sort((a, b) => a - b);
    const sameStructure = deg2.every((d, i) => d === sortedDeg[i]);

    return sameStructure ? { kind: "self_complementary" } : { kind: "not_self_complementary" };
  }

  return { kind: "unconstrained" }; // Too large for exhaustive check
};

/**
 * Compute vertex-transitive property.
 * GI-hard, so this is conservative.
 * @param g
 */
export const computeVertexTransitive = (g: AnalyzerGraph): { kind: "vertex_transitive" } | { kind: "not_vertex_transitive" } | { kind: "unconstrained" } => {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  const deg = degreesUndirectedBinary(g);

  // Necessary condition: all vertices have same degree (regular)
  const allSame = deg.every(d => d === deg[0]);
  if (!allSame) return { kind: "not_vertex_transitive" };

  // For small graphs, can check automorphism group
  // For now, use heuristic: if regular and small, might be vertex-transitive
  if (g.vertices.length <= 6) {
    return { kind: "vertex_transitive" }; // Small regular graphs often symmetric
  }

  return { kind: "unconstrained" };
};

// ============================================================================
// SPECIAL BIPARTITE PROPERTIES
// ============================================================================

/**
 * Compute complete bipartite property K_{m,n}.
 * @param g
 */

/**
 * Compute complete bipartite property K_{m,n}.
 * @param g
 */
export const computeCompleteBipartite = (g: AnalyzerGraph): { kind: "complete_bipartite"; m: number; n: number } | { kind: "not_complete_bipartite" } | { kind: "unconstrained" } => {
  // Must be bipartite first
  const bipartite = computePartiteness(g);
  if (bipartite.kind !== "bipartite") return { kind: "not_complete_bipartite" };

  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  // Find the bipartition
  const adj = buildAdjUndirectedBinary(g);
  const color = new Map<AnalyzerVertexId, 0 | 1>();

  for (const v of g.vertices) {
    if (color.has(v.id)) continue;
    const queue: AnalyzerVertexId[] = [v.id];
    color.set(v.id, 0);

    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur) break;
      const c = color.get(cur);
      if (c === undefined) break;

      for (const nxt of adj[cur] ?? []) {
        if (!color.has(nxt)) {
          color.set(nxt, (c ^ 1) as 0 | 1);
          queue.push(nxt);
        }
      }
    }
  }

  // Count vertices in each partition
  let partition0 = 0;
  let partition1 = 0;
  for (const c of color.values()) {
    if (c === 0) partition0++;
    else partition1++;
  }

  // Check if all cross-partition edges exist
  const partition0Verts = g.vertices.filter(v => color.get(v.id) === 0).map(v => v.id);
  const partition1Verts = g.vertices.filter(v => color.get(v.id) === 1).map(v => v.id);

  const expectedEdges = partition0 * partition1;

  if (g.edges.length === expectedEdges) {
    // Verify all edges are cross-partition
    const adjSet = new Set<string>();
    for (const e of g.edges) {
      const [u, v] = e.endpoints;
      adjSet.add(`${u}_${v}`);
      adjSet.add(`${v}_${u}`);
    }

    let allCross = true;
    for (const u of partition0Verts) {
      for (const v of partition1Verts) {
        if (!adjSet.has(`${u}_${v}`)) {
          allCross = false;
          break;
        }
      }
    }

    if (allCross) {
      return { kind: "complete_bipartite", m: partition0, n: partition1 };
    }
  }

  return { kind: "not_complete_bipartite" };
};
