/**
 * Graph Spec Analyzer - Structural Properties
 *
 * Compute graph completeness, partiteness, and density.
 */

import type {
  AnalyzerGraph
} from './types';
import {
  edgeKeyBinary
,
  isBipartiteUndirectedBinary
} from './types';

export const computeCompleteness = (g: AnalyzerGraph): { kind: "incomplete" } | { kind: "complete" } => {
  // Only meaningful for simple graphs (binary, no multi-edges) when checking complete vs incomplete.
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "incomplete" };

  // Define completeness by presence of all possible edges in the observed directionality.
  const dir = computeDirectionality(g);
  const n = g.vertices.length;
  if (n <= 1) return { kind: "complete" };

  if (dir.kind === "undirected") {
    const needed = (n * (n - 1)) / 2;
    // quick check: count unique undirected keys
    const und = new Set<string>();
    for (const e of g.edges.filter(e => !e.directed && e.endpoints.length === 2)) {
      und.add(edgeKeyBinary(e.endpoints[0], e.endpoints[1], false));
    }
    return und.size === needed ? { kind: "complete" } : { kind: "incomplete" };
  }

  if (dir.kind === "directed" || dir.kind === "bidirected" || dir.kind === "antidirected") {
    const needed = n * (n - 1);
    const dirKeys = new Set<string>();
    for (const e of g.edges.filter(e => e.directed && e.endpoints.length === 2)) {
      dirKeys.add(edgeKeyBinary(e.endpoints[0], e.endpoints[1], true));
    }
    return dirKeys.size === needed ? { kind: "complete" } : { kind: "incomplete" };
  }

  // mixed graphs: we won't call them complete here
  return { kind: "incomplete" };
};

export const computePartiteness = (g: AnalyzerGraph): { kind: "unrestricted" } | { kind: "bipartite" } => {
  // We only compute bipartite for undirected binary graphs.
  const isUndirectedBinary = g.edges.every(e => !e.directed && e.endpoints.length === 2);
  if (!isUndirectedBinary) return { kind: "unrestricted" };

  return isBipartiteUndirectedBinary(g) ? { kind: "bipartite" } : { kind: "unrestricted" };
};

export const computeDensity = (g: AnalyzerGraph): { kind: "unconstrained" } | { kind: "sparse" } | { kind: "dense" } => {
  // Simple heuristic on undirected binary graphs:
  // density = m / (n*(n-1)/2). Call sparse if <= 0.1, dense if >= 0.9.
  const isUndirectedBinary = g.edges.every(e => !e.directed && e.endpoints.length === 2);
  if (!isUndirectedBinary) return { kind: "unconstrained" };
  const n = g.vertices.length;
  if (n <= 1) return { kind: "dense" };
  const m = g.edges.length;
  const max = (n * (n - 1)) / 2;
  const d = m / max;
  if (d <= 0.1) return { kind: "sparse" };
  if (d >= 0.9) return { kind: "dense" };
  return { kind: "unconstrained" };
};

// Import computeDirectionality for use in computeCompleteness
import {
  hasAnyDirectedEdges,
  hasAnyUndirectedEdges
} from './types';

const computeDirectionality = (g: AnalyzerGraph):
  | { kind: "undirected" }
  | { kind: "directed" }
  | { kind: "mixed" }
  | { kind: "bidirected" }
  | { kind: "antidirected" } => {
  const hasDir = hasAnyDirectedEdges(g);
  const hasUndir = hasAnyUndirectedEdges(g);
  if (hasDir && hasUndir) return { kind: "mixed" };
  if (!hasDir) return { kind: "undirected" };

  // purely directed -> refine if possible
  const directedBinary = g.edges.filter(e => e.directed && e.endpoints.length === 2);
  if (directedBinary.length === 0) return { kind: "directed" };

  const set = new Set(directedBinary.map(e => `${e.endpoints[0]}->${e.endpoints[1]}`));
  const allHaveOpposite = directedBinary.every(e => set.has(`${e.endpoints[1]}->${e.endpoints[0]}`));

  if (allHaveOpposite) return { kind: "bidirected" };

  // Antidirected: for every edge u→v, there's also v←u (i.e., v→u in opposite direction)
  // Check if every edge appears in both directions
  const antidirected = directedBinary.every(e => {
    const opp = `${e.endpoints[1]}->${e.endpoints[0]}`;
    return opp !== `${e.endpoints[0]}->${e.endpoints[1]}` && set.has(opp);
  });
  if (antidirected && directedBinary.length > 0) return { kind: "antidirected" };

  return { kind: "directed" };
};
