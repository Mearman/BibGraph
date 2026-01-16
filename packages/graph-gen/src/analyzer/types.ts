/**
 * Analyzer Types and Helpers
 *
 * Shared types, compute policy, and helper functions for graph analysis.
 */

// ============================================================================
// Graph Model (namespaced to avoid conflicts with types/graph.ts)
// ============================================================================

export type AnalyzerVertexId = string;

export type AnalyzerVertex = {
  id: AnalyzerVertexId;
  label?: string;
  attrs?: Record<string, unknown>;
};

export type AnalyzerEdge = {
  id: string;
  endpoints: readonly AnalyzerVertexId[]; // binary => length 2; hyper => length k
  directed: boolean;

  weight?: number;
  sign?: -1 | 1;
  probability?: number;
  label?: string;
  attrs?: Record<string, unknown>;
};

export type AnalyzerGraph = {
  vertices: AnalyzerVertex[];
  edges: AnalyzerEdge[];
};

// ============================================================================
// Compute Policy (conventions for metadata-backed axes)
// ============================================================================

export type ComputePolicy = Readonly<{
  vertexOrderKey: string; // vertex.attrs[vertexOrderKey] => number for ordering
  edgeOrderKey: string; // edge.attrs[edgeOrderKey] => number for edge ordering
  posKey: string; // vertex.attrs[posKey] => {x,y,(z)} for spatial embedding
  layerKey: string; // vertex/edge attrs[layerKey] indicates layers
  timeKey: string; // vertex/edge attrs[timeKey] indicates temporal
  rootKey: string; // vertex.attrs[rootKey] boolean or "rootId" group
  portKey: string; // vertex attrs indicates ports
  weightVectorKey: string; // edge.attrs[weightVectorKey] => number[]
  probabilityKey: string; // edge.attrs[probabilityKey] => number (if you store there)
}>;

export const defaultComputePolicy: ComputePolicy = {
  vertexOrderKey: "order",
  edgeOrderKey: "order",
  posKey: "pos",
  layerKey: "layer",
  timeKey: "time",
  rootKey: "root",
  portKey: "ports",
  weightVectorKey: "weightVector",
  probabilityKey: "probability",
};

// ============================================================================
// Shared Helpers
// ============================================================================

export const unique = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

export const allEqual = <T>(xs: readonly T[], eq: (a: T, b: T) => boolean): boolean => {
  if (xs.length <= 1) return true;
  for (let i = 1; i < xs.length; i++) if (!eq(xs[0], xs[i])) return false;
  return true;
};

export const edgeKeyBinary = (u: AnalyzerVertexId, v: AnalyzerVertexId, directed: boolean): string => {
  if (directed) return `${u}->${v}`;
  return u < v ? `${u}--${v}` : `${v}--${u}`;
};

export const hasAnyDirectedEdges = (g: AnalyzerGraph): boolean => g.edges.some(e => e.directed);

export const hasAnyUndirectedEdges = (g: AnalyzerGraph): boolean => g.edges.some(e => !e.directed);

export const countSelfLoopsBinary = (g: AnalyzerGraph): number => {
  let c = 0;
  for (const e of g.edges) {
    if (e.endpoints.length !== 2) continue;
    if (e.endpoints[0] === e.endpoints[1]) c++;
  }
  return c;
};

export const buildAdjUndirectedBinary = (g: AnalyzerGraph): Record<AnalyzerVertexId, AnalyzerVertexId[]> => {
  const adj: Record<string, string[]> = {};
  for (const v of g.vertices) adj[v.id] = [];
  for (const e of g.edges) {
    if (e.directed) continue;
    if (e.endpoints.length !== 2) continue;
    const [a, b] = e.endpoints;
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
};

export const isConnectedUndirectedBinary = (g: AnalyzerGraph): boolean => {
  if (g.vertices.length === 0) return true;
  const adj = buildAdjUndirectedBinary(g);
  const start = g.vertices[0].id;
  const seen = new Set<AnalyzerVertexId>();
  const stack: AnalyzerVertexId[] = [start];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur) continue;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of adj[cur] ?? []) if (!seen.has(nxt)) stack.push(nxt);
  }
  return seen.size === g.vertices.length;
};

export const isAcyclicDirectedBinary = (g: AnalyzerGraph): boolean => {
  const verts = g.vertices.map(v => v.id);
  const indeg: Record<AnalyzerVertexId, number> = {};
  const out: Record<AnalyzerVertexId, AnalyzerVertexId[]> = {};
  for (const v of verts) {
    indeg[v] = 0;
    out[v] = [];
  }
  for (const e of g.edges) {
    if (!e.directed) continue;
    if (e.endpoints.length !== 2) continue;
    const [u, v] = e.endpoints;
    out[u].push(v);
    indeg[v] += 1;
  }
  const q: AnalyzerVertexId[] = [];
  for (const v of verts) if (indeg[v] === 0) q.push(v);

  let processed = 0;
  while (q.length > 0) {
    const v = q.pop();
    if (!v) continue;
    processed++;
    for (const w of out[v]) {
      indeg[w] -= 1;
      if (indeg[w] === 0) q.push(w);
    }
  }
  return processed === verts.length;
};

export const degreesUndirectedBinary = (g: AnalyzerGraph): number[] => {
  const idx: Record<AnalyzerVertexId, number> = {};
  g.vertices.forEach((v, i) => (idx[v.id] = i));
  const deg = Array.from({ length: g.vertices.length }, () => 0);
  for (const e of g.edges) {
    if (e.endpoints.length !== 2) continue;
    const [u, v] = e.endpoints;
    if (u === v) continue;
    // Treat both directed and undirected as total degree for this classifier
    deg[idx[u]] += 1;
    deg[idx[v]] += 1;
  }
  return deg;
};

export const isBipartiteUndirectedBinary = (g: AnalyzerGraph): boolean => {
  const adj = buildAdjUndirectedBinary(g);
  const colour = new Map<AnalyzerVertexId, 0 | 1>();
  for (const v of g.vertices) {
    if (colour.has(v.id)) continue;
    const queue: AnalyzerVertexId[] = [v.id];
    colour.set(v.id, 0);
    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur) break;
      const c = colour.get(cur);
      if (c === undefined) break;
      for (const nxt of adj[cur] ?? []) {
        if (!colour.has(nxt)) {
          colour.set(nxt, (c ^ 1) as 0 | 1);
          queue.push(nxt);
        } else if (colour.get(nxt) === c) {
          return false;
        }
      }
    }
  }
  return true;
};
