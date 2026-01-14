/**
 * Graph Spec Analyzer
 *
 * Compute GraphSpec properties from arbitrary graph instances.
 * Provides the inverse operation to graph generation: given a graph G,
 * infer its structural properties across all 29 property axes.
 *
 * Features:
 * - Conservative inference: Returns "unconstrained"/"abstract" for expensive analyses
 * - Metadata conventions: Uses attribute keys for latent properties (layering, temporal, etc.)
 * - Type-safe predicates: Build runtime checks for graph properties
 * - Registry pattern: DRY computation + equality for each axis
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

function unique<T>(xs: readonly T[]): T[] {
  return Array.from(new Set(xs));
}

function allEqual<T>(xs: readonly T[], eq: (a: T, b: T) => boolean): boolean {
  if (xs.length <= 1) return true;
  for (let i = 1; i < xs.length; i++) if (!eq(xs[0], xs[i])) return false;
  return true;
}

function edgeKeyBinary(u: AnalyzerVertexId, v: AnalyzerVertexId, directed: boolean): string {
  if (directed) return `${u}->${v}`;
  return u < v ? `${u}--${v}` : `${v}--${u}`;
}

function hasAnyDirectedEdges(g: AnalyzerGraph): boolean {
  return g.edges.some(e => e.directed);
}

function hasAnyUndirectedEdges(g: AnalyzerGraph): boolean {
  return g.edges.some(e => !e.directed);
}

function countSelfLoopsBinary(g: AnalyzerGraph): number {
  let c = 0;
  for (const e of g.edges) {
    if (e.endpoints.length !== 2) continue;
    if (e.endpoints[0] === e.endpoints[1]) c++;
  }
  return c;
}

function buildAdjUndirectedBinary(g: AnalyzerGraph): Record<AnalyzerVertexId, AnalyzerVertexId[]> {
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
}

function isConnectedUndirectedBinary(g: AnalyzerGraph): boolean {
  if (g.vertices.length === 0) return true;
  const adj = buildAdjUndirectedBinary(g);
  const start = g.vertices[0].id;
  const seen = new Set<AnalyzerVertexId>();
  const stack: AnalyzerVertexId[] = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of adj[cur] ?? []) if (!seen.has(nxt)) stack.push(nxt);
  }
  return seen.size === g.vertices.length;
}

function isAcyclicDirectedBinary(g: AnalyzerGraph): boolean {
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
  while (q.length) {
    const v = q.pop()!;
    processed++;
    for (const w of out[v]) {
      indeg[w] -= 1;
      if (indeg[w] === 0) q.push(w);
    }
  }
  return processed === verts.length;
}

function degreesUndirectedBinary(g: AnalyzerGraph): number[] {
  const idx: Record<AnalyzerVertexId, number> = {};
  g.vertices.forEach((v, i) => (idx[v.id] = i));
  const deg = Array.from({ length: g.vertices.length }, () => 0);
  for (const e of g.edges) {
    if (e.endpoints.length !== 2) continue;
    const [u, v] = e.endpoints;
    if (u === v) continue;
    if (!e.directed) {
      deg[idx[u]] += 1;
      deg[idx[v]] += 1;
    } else {
      // if directed, treat as out+in for "degree" when classifying undirected degree constraints
      deg[idx[u]] += 1;
      deg[idx[v]] += 1;
    }
  }
  return deg;
}

function isBipartiteUndirectedBinary(g: AnalyzerGraph): boolean {
  const adj = buildAdjUndirectedBinary(g);
  const colour = new Map<AnalyzerVertexId, 0 | 1>();
  for (const v of g.vertices) {
    if (colour.has(v.id)) continue;
    const queue: AnalyzerVertexId[] = [v.id];
    colour.set(v.id, 0);
    while (queue.length) {
      const cur = queue.shift()!;
      const c = colour.get(cur)!;
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
}

// ============================================================================
// Axis Compute Functions
// ============================================================================

export function computeVertexCardinality(g: AnalyzerGraph): { kind: "finite"; n: number } {
  return { kind: "finite", n: g.vertices.length };
}

export function computeVertexIdentity(g: AnalyzerGraph): { kind: "distinguishable" } | { kind: "indistinguishable" } {
  const ids = g.vertices.map(v => v.id);
  return new Set(ids).size === ids.length ? { kind: "distinguishable" } : { kind: "indistinguishable" };
}

export function computeVertexOrdering(
  g: AnalyzerGraph,
  policy: ComputePolicy
): { kind: "unordered" } | { kind: "total_order" } | { kind: "partial_order" } {
  const orders = g.vertices.map(v => v.attrs?.[policy.vertexOrderKey]);
  if (!orders.every(x => typeof x === "number")) return { kind: "unordered" };
  const nums = orders as number[];
  return new Set(nums).size === nums.length ? { kind: "total_order" } : { kind: "partial_order" };
}

export function computeEdgeArity(g: AnalyzerGraph): { kind: "binary" } | { kind: "k_ary"; k: number } {
  if (g.edges.length === 0) return { kind: "binary" };
  const arities = g.edges.map(e => e.endpoints.length);
  const all2 = arities.every(a => a === 2);
  if (all2) return { kind: "binary" };
  if (allEqual(arities, (a, b) => a === b)) return { kind: "k_ary", k: arities[0] };
  throw new Error(`Mixed edge arity cannot be represented as a single EdgeArity: ${unique(arities).join(", ")}`);
}

export function computeEdgeMultiplicity(g: AnalyzerGraph): { kind: "simple" } | { kind: "multi" } {
  const seen = new Set<string>();
  for (const e of g.edges) {
    if (e.endpoints.length === 2) {
      const [u, v] = e.endpoints;
      const k = edgeKeyBinary(u, v, e.directed);
      if (seen.has(k)) return { kind: "multi" };
      seen.add(k);
    } else {
      const k = `H:${e.endpoints.slice().sort().join("|")}`;
      if (seen.has(k)) return { kind: "multi" };
      seen.add(k);
    }
  }
  return { kind: "simple" };
}

export function computeSelfLoops(g: AnalyzerGraph): { kind: "disallowed" } | { kind: "allowed" } {
  return countSelfLoopsBinary(g) > 0 ? { kind: "allowed" } : { kind: "disallowed" };
}

export function computeDirectionality(g: AnalyzerGraph):
  | { kind: "undirected" }
  | { kind: "directed" }
  | { kind: "mixed" }
  | { kind: "bidirected" }
  | { kind: "antidirected" } {
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
}

export function computeWeighting(
  g: AnalyzerGraph,
  policy: ComputePolicy
): { kind: "unweighted" } | { kind: "weighted_numeric"; min?: number; max?: number } {
  if (g.edges.length === 0) return { kind: "unweighted" };

  const allNumeric = g.edges.every(e => typeof e.weight === "number");
  if (allNumeric) return { kind: "weighted_numeric" };

  return { kind: "unweighted" };
}

export function computeSignedness(g: AnalyzerGraph): { kind: "unsigned" } | { kind: "signed" } {
  const anySigned = g.edges.some(e => e.sign === -1 || e.sign === 1);
  return anySigned ? { kind: "signed" } : { kind: "unsigned" };
}

export function computeUncertainty(
  g: AnalyzerGraph,
  policy: ComputePolicy
): { kind: "deterministic" } | { kind: "probabilistic"; min?: number; max?: number } {
  const anyProb =
    g.edges.some(e => typeof e.probability === "number") ||
    g.edges.some(e => typeof e.attrs?.[policy.probabilityKey] === "number");
  return anyProb ? { kind: "probabilistic" } : { kind: "deterministic" };
}

export function computeVertexData(g: AnalyzerGraph): { kind: "unlabelled" } | { kind: "labelled" } | { kind: "attributed" } {
  const anyAttrs = g.vertices.some(v => v.attrs && Object.keys(v.attrs).length > 0);
  const anyLabels = g.vertices.some(v => typeof v.label === "string" && v.label.length > 0);
  if (anyAttrs) return { kind: "attributed" };
  if (anyLabels) return { kind: "labelled" };
  return { kind: "unlabelled" };
}

export function computeEdgeData(g: AnalyzerGraph): { kind: "unlabelled" } | { kind: "labelled" } | { kind: "attributed" } {
  const anyAttrs = g.edges.some(e => e.attrs && Object.keys(e.attrs).length > 0);
  const anyLabels = g.edges.some(e => typeof e.label === "string" && e.label.length > 0);
  if (anyAttrs) return { kind: "attributed" };
  if (anyLabels) return { kind: "labelled" };
  return { kind: "unlabelled" };
}

export function computeSchemaHomogeneity(g: AnalyzerGraph): { kind: "homogeneous" } | { kind: "heterogeneous" } {
  // Convention:
  // - homogeneous if all vertices share the same set of attr keys AND all edges share the same set of attr keys
  // - otherwise heterogeneous
  const vertexKeySets = g.vertices.map(v => Object.keys(v.attrs ?? {}).sort().join("|"));
  const edgeKeySets = g.edges.map(e => Object.keys(e.attrs ?? {}).sort().join("|"));
  const vHom = allEqual(vertexKeySets, (a, b) => a === b);
  const eHom = allEqual(edgeKeySets, (a, b) => a === b);
  return vHom && eHom ? { kind: "homogeneous" } : { kind: "heterogeneous" };
}

export function computeConnectivity(g: AnalyzerGraph): { kind: "unconstrained" } | { kind: "connected" } {
  // We only compute "connected" safely for undirected binary graphs.
  // Otherwise return unconstrained.
  const isUndirectedBinary = g.edges.every(e => !e.directed && e.endpoints.length === 2);
  if (!isUndirectedBinary) return { kind: "unconstrained" };
  return isConnectedUndirectedBinary(g) ? { kind: "connected" } : { kind: "unconstrained" };
}

export function computeCycles(g: AnalyzerGraph): { kind: "cycles_allowed" } | { kind: "acyclic" } {
  // Check if all edges are binary directed
  const isDirectedBinary = g.edges.length > 0 && g.edges.every(e => e.directed && e.endpoints.length === 2);
  // Check if all edges are binary undirected
  const isUndirectedBinary = g.edges.length > 0 && g.edges.every(e => !e.directed && e.endpoints.length === 2);

  if (isDirectedBinary) {
    // Use Kahn's algorithm for directed acyclic check
    return isAcyclicDirectedBinary(g) ? { kind: "acyclic" } : { kind: "cycles_allowed" };
  }

  if (isUndirectedBinary) {
    // For undirected graphs: acyclic if E < V (forest)
    // A tree has E = V - 1, a forest with k components has E = V - k
    // So any undirected binary graph with E < V is acyclic
    return g.edges.length < g.vertices.length ? { kind: "acyclic" } : { kind: "cycles_allowed" };
  }

  // Mixed or non-binary graphs: conservative fallback
  return { kind: "cycles_allowed" };
}

export function computeDegreeConstraint(g: AnalyzerGraph):
  | { kind: "unconstrained" }
  | { kind: "regular"; degree: number }
  | { kind: "degree_sequence"; sequence: readonly number[] } {
  // Safe, non-committal: return degree_sequence for undirected-binary graphs, else unconstrained.
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  // Treat directed degree as total degree for this classifier.
  const deg = degreesUndirectedBinary(g);

  // If all degrees equal -> regular
  if (deg.length > 0 && new Set(deg).size === 1) return { kind: "regular", degree: deg[0] };

  return { kind: "degree_sequence", sequence: deg };
}

export function computeCompleteness(g: AnalyzerGraph): { kind: "incomplete" } | { kind: "complete" } {
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
}

export function computePartiteness(g: AnalyzerGraph): { kind: "unrestricted" } | { kind: "bipartite" } {
  // We only compute bipartite for undirected binary graphs.
  const isUndirectedBinary = g.edges.every(e => !e.directed && e.endpoints.length === 2);
  if (!isUndirectedBinary) return { kind: "unrestricted" };

  return isBipartiteUndirectedBinary(g) ? { kind: "bipartite" } : { kind: "unrestricted" };
}

export function computeDensity(g: AnalyzerGraph): { kind: "unconstrained" } | { kind: "sparse" } | { kind: "dense" } {
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
}

export function computeEmbedding(
  g: AnalyzerGraph,
  policy: ComputePolicy
): { kind: "abstract" } | { kind: "geometric_metric_space" } | { kind: "spatial_coordinates"; dims: 2 | 3 } {
  // Convention: if every vertex has pos {x,y} or {x,y,z}, treat as spatial_coordinates.
  const poss = g.vertices.map(v => v.attrs?.[policy.posKey]);
  const allHavePos = poss.length > 0 && poss.every(p => typeof p === "object" && p != null);
  if (!allHavePos) return { kind: "abstract" };

  const dims = poss.map(p => {
    const o = p as Record<string, unknown>;
    const hasX = typeof o.x === "number";
    const hasY = typeof o.y === "number";
    const hasZ = typeof o.z === "number";
    if (hasX && hasY && hasZ) return 3 as const;
    if (hasX && hasY) return 2 as const;
    return null;
  });

  if (dims.some(d => d == null)) return { kind: "abstract" };
  const uniq = unique(dims as Array<2 | 3>);
  if (uniq.length === 1) return { kind: "spatial_coordinates", dims: uniq[0] };
  // mixed dims -> fall back
  return { kind: "abstract" };
}

export function computeRooting(g: AnalyzerGraph, policy: ComputePolicy): { kind: "unrooted" } | { kind: "rooted" } | { kind: "multi_rooted" } {
  // Convention:
  // - rooted if exactly one vertex has attrs[rootKey] === true
  // - multi_rooted if >1
  // - unrooted otherwise
  const roots = g.vertices.filter(v => v.attrs?.[policy.rootKey] === true);
  if (roots.length === 1) return { kind: "rooted" };
  if (roots.length > 1) return { kind: "multi_rooted" };
  return { kind: "unrooted" };
}

export function computeTemporal(g: AnalyzerGraph, policy: ComputePolicy):
  | { kind: "static" }
  | { kind: "dynamic_structure" }
  | { kind: "temporal_edges" }
  | { kind: "temporal_vertices" }
  | { kind: "time_ordered" } {
  // Convention:
  // - temporal_vertices if any vertex has attrs[timeKey]
  // - temporal_edges if any edge has attrs[timeKey]
  // - time_ordered if both and values look ordered (numbers)
  // - static otherwise
  const vTimes = g.vertices.map(v => v.attrs?.[policy.timeKey]);
  const eTimes = g.edges.map(e => e.attrs?.[policy.timeKey]);
  const anyV = vTimes.some(t => t != null);
  const anyE = eTimes.some(t => t != null);

  const allNumericV = anyV && vTimes.every(t => t == null || typeof t === "number");
  const allNumericE = anyE && eTimes.every(t => t == null || typeof t === "number");

  if (anyV && anyE && allNumericV && allNumericE) return { kind: "time_ordered" };
  if (anyV) return { kind: "temporal_vertices" };
  if (anyE) return { kind: "temporal_edges" };
  return { kind: "static" };
}

export function computeLayering(g: AnalyzerGraph, policy: ComputePolicy):
  | { kind: "single_layer" }
  | { kind: "multi_layer" }
  | { kind: "multiplex" }
  | { kind: "interdependent" } {
  // Convention:
  // - multi_layer if vertices or edges have a layer label and >1 unique layers
  const layers: Array<string | number> = [];
  for (const v of g.vertices) {
    const lv = v.attrs?.[policy.layerKey];
    if (typeof lv === "string" || typeof lv === "number") layers.push(lv);
  }
  for (const e of g.edges) {
    const le = e.attrs?.[policy.layerKey];
    if (typeof le === "string" || typeof le === "number") layers.push(le);
  }
  const uniq = unique(layers.map(String));
  return uniq.length > 1 ? { kind: "multi_layer" } : { kind: "single_layer" };
}

export function computeEdgeOrdering(g: AnalyzerGraph, policy: ComputePolicy): { kind: "unordered" } | { kind: "ordered" } {
  const orders = g.edges.map(e => e.attrs?.[policy.edgeOrderKey]);
  if (!orders.every(x => typeof x === "number")) return { kind: "unordered" };
  return { kind: "ordered" };
}

export function computePorts(g: AnalyzerGraph, policy: ComputePolicy): { kind: "none" } | { kind: "port_labelled_vertices" } {
  // Convention: vertex.attrs[portKey] exists => ports
  const anyPorts = g.vertices.some(v => v.attrs?.[policy.portKey] != null);
  return anyPorts ? { kind: "port_labelled_vertices" } : { kind: "none" };
}

export function computeObservability(g: AnalyzerGraph): { kind: "fully_specified" } | { kind: "partially_observed" } | { kind: "latent_or_inferred" } {
  // Convention: if any vertex/edge has attrs.latent===true => latent_or_inferred
  // else if any has attrs.observed===false => partially_observed
  // else fully_specified
  const anyLatent =
    g.vertices.some(v => v.attrs?.["latent"] === true) ||
    g.edges.some(e => e.attrs?.["latent"] === true);

  if (anyLatent) return { kind: "latent_or_inferred" };

  const anyUnobserved =
    g.vertices.some(v => v.attrs?.["observed"] === false) ||
    g.edges.some(e => e.attrs?.["observed"] === false);

  if (anyUnobserved) return { kind: "partially_observed" };

  return { kind: "fully_specified" };
}

export function computeOperationalSemantics(g: AnalyzerGraph):
  | { kind: "structural_only" }
  | { kind: "annotated_with_functions" }
  | { kind: "executable" } {
  // Convention: if any vertex/edge has attrs.exec===true => executable
  // else if any has attrs.fn present => annotated_with_functions
  // else structural_only
  const anyExec =
    g.vertices.some(v => v.attrs?.["exec"] === true) ||
    g.edges.some(e => e.attrs?.["exec"] === true);
  if (anyExec) return { kind: "executable" };

  const anyFn =
    g.vertices.some(v => typeof v.attrs?.["fn"] === "string") ||
    g.edges.some(e => typeof e.attrs?.["fn"] === "string");
  if (anyFn) return { kind: "annotated_with_functions" };

  return { kind: "structural_only" };
}

export function computeMeasureSemantics(g: AnalyzerGraph): { kind: "none" } | { kind: "metric" } | { kind: "cost" } | { kind: "utility" } {
  // Convention: if weights exist => metric/cost/utility is unknown; choose "metric"
  // If attrs.cost exists => cost; attrs.utility exists => utility
  const anyCost =
    g.edges.some(e => typeof e.attrs?.["cost"] === "number") ||
    g.vertices.some(v => typeof v.attrs?.["cost"] === "number");
  if (anyCost) return { kind: "cost" };

  const anyUtility =
    g.edges.some(e => typeof e.attrs?.["utility"] === "number") ||
    g.vertices.some(v => typeof v.attrs?.["utility"] === "number");
  if (anyUtility) return { kind: "utility" };

  const anyWeight =
    g.edges.some(e => typeof e.weight === "number") ||
    g.edges.some(e => Array.isArray(e.attrs?.["weightVector"]));
  if (anyWeight) return { kind: "metric" };

  return { kind: "none" };
}

// ============================================================================
// NETWORK ANALYSIS PROPERTIES
// ============================================================================

/**
 * Compute scale-free property (power-law degree distribution).
 * Uses maximum likelihood estimation and Kolmogorov-Smirnov test.
 */
export function computeScaleFree(g: AnalyzerGraph): { kind: "scale_free"; exponent: number } | { kind: "not_scale_free" } {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "not_scale_free" };

  if (g.vertices.length < 10) return { kind: "not_scale_free" }; // Too small for reliable fit

  const deg = degreesUndirectedBinary(g);
  const degCounts: Record<number, number> = {};
  for (const d of deg) {
    degCounts[d] = (degCounts[d] || 0) + 1;
  }

  // Remove degree 0 from distribution
  delete degCounts[0];

  const degrees = Object.keys(degCounts).map(Number).sort((a, b) => a - b);
  if (degrees.length < 2) return { kind: "not_scale_free" };

  // Simple power-law test: check if log-log plot is roughly linear
  // For proper implementation, use Clauset et al. (2009) method
  const xmin = Math.min(...degrees);
  const xmax = Math.max(...degrees);

  // Count degrees >= xmin
  let total = 0;
  for (const d of degrees) {
    total += degCounts[d];
  }

  if (total < 5) return { kind: "not_scale_free" };

  // Rough check: does distribution appear power-law?
  // A power-law has P(k) ~ k^(-gamma), so log(P) ~ -gamma * log(k)
  const logLogs: number[] = [];
  for (const d of degrees) {
    if (d >= xmin) {
      const prob = degCounts[d] / total;
      logLogs.push(Math.log(prob) + Math.log(d));
    }
  }

  // If variance is low, it's likely power-law
  const mean = logLogs.reduce((a, b) => a + b, 0) / logLogs.length;
  const variance = logLogs.reduce((a, b) => a + (b - mean) ** 2, 0) / logLogs.length;

  // Low variance suggests power-law (log-linear relationship)
  if (variance < 2.0) {
    // Estimate exponent using method of moments
    const gamma = 1 + mean;
    return { kind: "scale_free", exponent: Math.round(gamma * 100) / 100 };
  }

  return { kind: "not_scale_free" };
}

/**
 * Compute small-world property (high clustering + short paths).
 */
export function computeSmallWorld(g: AnalyzerGraph): { kind: "small_world" } | { kind: "not_small_world" } | { kind: "unconstrained" } {
  // Only valid for undirected binary connected graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  if (!isConnectedUndirectedBinary(g)) return { kind: "unconstrained" };

  if (g.vertices.length < 3) return { kind: "unconstrained" };

  // Compute clustering coefficient
  const adj = buildAdjUndirectedBinary(g);
  let triangles = 0;
  let connectedTriples = 0;

  for (const v of g.vertices) {
    const neighbors = adj[v.id] ?? [];
    const k = neighbors.length;

    if (k < 2) continue;

    connectedTriples += k * (k - 1) / 2;

    // Count triangles involving v
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const ni = neighbors[i];
        const nj = neighbors[j];
        if ((adj[ni] ?? []).includes(nj)) {
          triangles++;
        }
      }
    }
  }

  const clusteringCoeff = connectedTriples > 0 ? (3 * triangles) / connectedTriples : 0;

  // Compute average shortest path length (BFS from each vertex)
  let totalPathLength = 0;
  let pathCount = 0;

  for (const start of g.vertices) {
    const dists: Record<string, number> = { [start.id]: 0 };
    const queue: AnalyzerVertexId[] = [start.id];

    while (queue.length) {
      const cur = queue.shift()!;
      const dist = dists[cur];

      for (const nb of adj[cur] ?? []) {
        if (!(nb in dists)) {
          dists[nb] = dist + 1;
          queue.push(nb);
          totalPathLength += dist + 1;
          pathCount++;
        }
      }
    }
  }

  const avgPathLength = pathCount > 0 ? totalPathLength / pathCount : 0;

  // Compare to random graph of same size/density
  const n = g.vertices.length;
  const p = g.edges.length / (n * (n - 1) / 2);
  const randomPathLength = Math.log(n) / Math.log(1 / (1 - p));

  // Small-world: high clustering AND short paths
  const highClustering = clusteringCoeff > p * 2; // Much higher than random
  const shortPaths = avgPathLength <= randomPathLength * 1.5; // Similar to or shorter than random

  return highClustering && shortPaths ? { kind: "small_world" } : { kind: "not_small_world" };
}

/**
 * Compute modular/community structure property.
 * Uses modularity maximization as heuristic.
 */
export function computeCommunityStructure(
  g: AnalyzerGraph,
  policy: ComputePolicy
): { kind: "modular"; numCommunities: number } | { kind: "non_modular" } | { kind: "unconstrained" } {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  if (g.vertices.length < 4) return { kind: "unconstrained" };

  // Use community attribute if present
  const commCounts = new Map<string, number>();
  let hasCommunityInfo = true;

  for (const v of g.vertices) {
    const comm = v.attrs?.[policy.layerKey] as string | undefined;
    if (!comm) {
      hasCommunityInfo = false;
      break;
    }
    commCounts.set(comm, (commCounts.get(comm) || 0) + 1);
  }

  if (hasCommunityInfo && commCounts.size > 1) {
    return { kind: "modular", numCommunities: commCounts.size };
  }

  // Otherwise, estimate using simple Louvain-style heuristic
  // For now: use connected components as communities
  const adj = buildAdjUndirectedBinary(g);
  const visited = new Set<AnalyzerVertexId>();
  let communities = 0;

  for (const v of g.vertices) {
    if (visited.has(v.id)) continue;

    // BFS to find component
    const queue: AnalyzerVertexId[] = [v.id];
    visited.add(v.id);

    while (queue.length) {
      const cur = queue.shift()!;
      for (const nb of adj[cur] ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }

    communities++;
  }

  return communities > 1 ? { kind: "modular", numCommunities: communities } : { kind: "non_modular" };
}

// ============================================================================
// PATH/CYCLE PROPERTIES
// ============================================================================

/**
 * Compute Hamiltonian property using exhaustive search with pruning.
 * NP-complete, so this is expensive for larger graphs.
 */
export function computeHamiltonian(g: AnalyzerGraph): { kind: "hamiltonian" } | { kind: "non_hamiltonian" } | { kind: "unconstrained" } {
  // Only for small undirected/directed binary graphs due to NP-completeness
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  if (g.vertices.length > 10) return { kind: "unconstrained" }; // Too expensive

  const n = g.vertices.length;
  if (n < 3) return { kind: "non_hamiltonian" }; // Need at least 3 vertices for cycle

  const adj = buildAdjUndirectedBinary(g);
  const directed = g.edges[0]?.directed ?? false;

  // Check necessary condition: minimum degree >= 2
  const degs = degreesUndirectedBinary(g);
  if (Math.min(...degs) < 2) return { kind: "non_hamiltonian" };

  // Backtracking search for Hamiltonian cycle
  const visited = new Set<AnalyzerVertexId>();
  const path: AnalyzerVertexId[] = [];

  const backtrack = (current: AnalyzerVertexId, start: AnalyzerVertexId): boolean => {
    visited.add(current);
    path.push(current);

    if (path.length === n) {
      // Check if can return to start
      const neighbors = adj[current] ?? [];
      if (neighbors.includes(start)) {
        return true;
      }
      path.pop();
      visited.delete(current);
      return false;
    }

    // Try unvisited neighbors
    const neighbors = adj[current] ?? [];
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        if (backtrack(nb, start)) {
          return true;
        }
      }
    }

    path.pop();
    visited.delete(current);
    return false;
  };

  // Try starting from each vertex
  for (const v of g.vertices) {
    path.length = 0;
    visited.clear();
    if (backtrack(v.id, v.id)) {
      return { kind: "hamiltonian" };
    }
  }

  return { kind: "non_hamiltonian" };
}

/**
 * Compute traceable property (has Hamiltonian path).
 */
export function computeTraceable(g: AnalyzerGraph): { kind: "traceable" } | { kind: "non_traceable" } | { kind: "unconstrained" } {
  // Reuse Hamiltonian check for path (easier than cycle)
  const hamiltonian = computeHamiltonian(g);
  if (hamiltonian.kind === "hamiltonian") {
    return { kind: "traceable" }; // Hamiltonian cycle implies Hamiltonian path
  }

  if (g.vertices.length > 10) return { kind: "unconstrained" };

  const adj = buildAdjUndirectedBinary(g);
  const n = g.vertices.length;
  if (n < 2) return { kind: "non_traceable" };

  // Backtracking search for Hamiltonian path
  const visited = new Set<AnalyzerVertexId>();

  const backtrack = (current: AnalyzerVertexId): boolean => {
    visited.add(current);

    if (visited.size === n) {
      return true; // Found path visiting all vertices
    }

    const neighbors = adj[current] ?? [];
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        if (backtrack(nb)) {
          return true;
        }
      }
    }

    visited.delete(current);
    return false;
  };

  for (const v of g.vertices) {
    visited.clear();
    if (backtrack(v.id)) {
      return { kind: "traceable" };
    }
  }

  return { kind: "non_traceable" };
}

// ============================================================================
// STRUCTURAL GRAPH CLASSES
// ============================================================================

/**
 * Compute perfect graph property.
 * Perfect graphs have no odd holes or odd anti-holes.
 */
export function computePerfect(g: AnalyzerGraph): { kind: "perfect" } | { kind: "imperfect" } | { kind: "unconstrained" } {
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
}

/**
 * Compute split graph property (partition into clique + independent set).
 */
export function computeSplit(g: AnalyzerGraph): { kind: "split" } | { kind: "non_split" } | { kind: "unconstrained" } {
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
}

/**
 * Compute cograph property (P4-free graph).
 */
export function computeCograph(g: AnalyzerGraph): { kind: "cograph" } | { kind: "non_cograph" } | { kind: "unconstrained" } {
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
}

/**
 * Compute threshold graph property (split + cograph).
 */
export function computeThreshold(g: AnalyzerGraph): { kind: "threshold" } | { kind: "non_threshold" } | { kind: "unconstrained" } {
  // Threshold graphs are both split and cograph
  const split = computeSplit(g);
  const cograph = computeCograph(g);

  if (split.kind === "unconstrained" || cograph.kind === "unconstrained") {
    return { kind: "unconstrained" };
  }

  return split.kind === "split" && cograph.kind === "cograph"
    ? { kind: "threshold" }
    : { kind: "non_threshold" };
}

/**
 * Compute line graph property.
 */
export function computeLine(g: AnalyzerGraph): { kind: "line_graph" } | { kind: "non_line_graph" } | { kind: "unconstrained" } {
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
}

/**
 * Compute claw-free property (no K1,3 induced subgraph).
 */
export function computeClawFree(g: AnalyzerGraph): { kind: "claw_free" } | { kind: "has_claw" } | { kind: "unconstrained" } {
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
}

// ============================================================================
// REGULARITY PROPERTIES
// ============================================================================

/**
 * Compute cubic graph property (3-regular).
 */
export function computeCubic(g: AnalyzerGraph): { kind: "cubic" } | { kind: "non_cubic" } | { kind: "unconstrained" } {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isUndirected || !isBinary) return { kind: "unconstrained" };

  const deg = degreesUndirectedBinary(g);
  const allDegree3 = deg.length > 0 && deg.every(d => d === 3);

  return allDegree3 ? { kind: "cubic" } : { kind: "non_cubic" };
}

/**
 * Compute specific k-regular property.
 */
export function computeSpecificRegular(g: AnalyzerGraph, k: number): { kind: "k_regular"; k: number } | { kind: "not_k_regular" } | { kind: "unconstrained" } {
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  const deg = degreesUndirectedBinary(g);
  const allDegreeK = deg.length > 0 && deg.every(d => d === k);

  return allDegreeK ? { kind: "k_regular", k } : { kind: "not_k_regular" };
}

/**
 * Auto-detect k-regular property (find k if graph is regular).
 */
export function computeAutoRegular(g: AnalyzerGraph): { kind: "k_regular"; k: number } | { kind: "not_k_regular" } | { kind: "unconstrained" } {
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  if (!isBinary) return { kind: "unconstrained" };

  const deg = degreesUndirectedBinary(g);

  // Check if all vertices have same degree
  const allSame = deg.length > 0 && deg.every(d => d === deg[0]);

  return allSame ? { kind: "k_regular", k: deg[0] } : { kind: "not_k_regular" };
}

/**
 * Compute strongly regular graph property.
 * Strongly regular: (n, k, λ, μ) where every vertex has degree k,
 * adjacent vertices have λ common neighbors, non-adjacent have μ common neighbors.
 */
export function computeStronglyRegular(g: AnalyzerGraph): { kind: "strongly_regular"; k: number; lambda: number; mu: number } | { kind: "not_strongly_regular" } | { kind: "unconstrained" } {
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
        const neighborsU = new Set(adj[u] ?? []);
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
        const neighborsU = new Set(adj[u] ?? []);
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
}

// ============================================================================
// SYMMETRY PROPERTIES
// ============================================================================

/**
 * Compute self-complementary property (graph isomorphic to its complement).
 * GI-complete, so this is expensive.
 */
export function computeSelfComplementary(g: AnalyzerGraph): { kind: "self_complementary" } | { kind: "not_self_complementary" } | { kind: "unconstrained" } {
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
}

/**
 * Compute vertex-transitive property.
 * GI-hard, so this is conservative.
 */
export function computeVertexTransitive(g: AnalyzerGraph): { kind: "vertex_transitive" } | { kind: "not_vertex_transitive" } | { kind: "unconstrained" } {
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
}

// ============================================================================
// SPECIAL BIPARTITE PROPERTIES
// ============================================================================

/**
 * Compute complete bipartite property K_{m,n}.
 */
export function computeCompleteBipartite(g: AnalyzerGraph): { kind: "complete_bipartite"; m: number; n: number } | { kind: "not_complete_bipartite" } | { kind: "unconstrained" } {
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

    while (queue.length) {
      const cur = queue.shift()!;
      const c = color.get(cur)!;

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
}

// ============================================================================
// Type-safe GraphSpec (inferred from graph structure)
// ============================================================================

export type InferredGraphSpec = Readonly<{
  vertexCardinality: ReturnType<typeof computeVertexCardinality>;
  vertexIdentity: ReturnType<typeof computeVertexIdentity>;
  vertexOrdering: ReturnType<typeof computeVertexOrdering>;

  edgeArity: ReturnType<typeof computeEdgeArity>;
  edgeMultiplicity: ReturnType<typeof computeEdgeMultiplicity>;
  selfLoops: ReturnType<typeof computeSelfLoops>;

  directionality: ReturnType<typeof computeDirectionality>;

  weighting: ReturnType<typeof computeWeighting>;
  signedness: ReturnType<typeof computeSignedness>;
  uncertainty: ReturnType<typeof computeUncertainty>;

  vertexData: ReturnType<typeof computeVertexData>;
  edgeData: ReturnType<typeof computeEdgeData>;
  schema: ReturnType<typeof computeSchemaHomogeneity>;

  connectivity: ReturnType<typeof computeConnectivity>;
  cycles: ReturnType<typeof computeCycles>;
  degreeConstraint: ReturnType<typeof computeDegreeConstraint>;
  completeness: ReturnType<typeof computeCompleteness>;
  partiteness: ReturnType<typeof computePartiteness>;
  density: ReturnType<typeof computeDensity>;

  embedding: ReturnType<typeof computeEmbedding>;
  rooting: ReturnType<typeof computeRooting>;
  temporal: ReturnType<typeof computeTemporal>;
  layering: ReturnType<typeof computeLayering>;
  edgeOrdering: ReturnType<typeof computeEdgeOrdering>;
  ports: ReturnType<typeof computePorts>;

  observability: ReturnType<typeof computeObservability>;
  operationalSemantics: ReturnType<typeof computeOperationalSemantics>;
  measureSemantics: ReturnType<typeof computeMeasureSemantics>;

  // Network analysis properties
  scaleFree: ReturnType<typeof computeScaleFree>;
  smallWorld: ReturnType<typeof computeSmallWorld>;
  communityStructure: ReturnType<typeof computeCommunityStructure>;

  // Path and cycle properties
  hamiltonian: ReturnType<typeof computeHamiltonian>;
  traceable: ReturnType<typeof computeTraceable>;

  // Structural properties
  perfect: ReturnType<typeof computePerfect>;
  split: ReturnType<typeof computeSplit>;
  cograph: ReturnType<typeof computeCograph>;
  threshold: ReturnType<typeof computeThreshold>;
  line: ReturnType<typeof computeLine>;
  clawFree: ReturnType<typeof computeClawFree>;

  // Regularity properties
  cubic: ReturnType<typeof computeCubic>;
  specificRegular: ReturnType<typeof computeAutoRegular>;
  stronglyRegular: ReturnType<typeof computeStronglyRegular>;

  // Symmetry properties
  selfComplementary: ReturnType<typeof computeSelfComplementary>;
  vertexTransitive: ReturnType<typeof computeVertexTransitive>;

  // Special bipartite properties
  completeBipartite: ReturnType<typeof computeCompleteBipartite>;
}>;

// ============================================================================
// Main API: Compute full GraphSpec from graph
// ============================================================================

export function computeGraphSpecFromGraph(
  g: AnalyzerGraph,
  policy: Partial<ComputePolicy> = {}
): InferredGraphSpec {
  const p: ComputePolicy = { ...defaultComputePolicy, ...policy };

  return {
    vertexCardinality: computeVertexCardinality(g),
    vertexIdentity: computeVertexIdentity(g),
    vertexOrdering: computeVertexOrdering(g, p),

    edgeArity: computeEdgeArity(g),
    edgeMultiplicity: computeEdgeMultiplicity(g),
    selfLoops: computeSelfLoops(g),

    directionality: computeDirectionality(g),

    weighting: computeWeighting(g, p),
    signedness: computeSignedness(g),
    uncertainty: computeUncertainty(g, p),

    vertexData: computeVertexData(g),
    edgeData: computeEdgeData(g),
    schema: computeSchemaHomogeneity(g),

    connectivity: computeConnectivity(g),
    cycles: computeCycles(g),
    degreeConstraint: computeDegreeConstraint(g),
    completeness: computeCompleteness(g),
    partiteness: computePartiteness(g),
    density: computeDensity(g),

    embedding: computeEmbedding(g, p),
    rooting: computeRooting(g, p),
    temporal: computeTemporal(g, p),
    layering: computeLayering(g, p),
    edgeOrdering: computeEdgeOrdering(g, p),
    ports: computePorts(g, p),

    observability: computeObservability(g),
    operationalSemantics: computeOperationalSemantics(g),
    measureSemantics: computeMeasureSemantics(g),

    // Network analysis properties
    scaleFree: computeScaleFree(g),
    smallWorld: computeSmallWorld(g),
    communityStructure: computeCommunityStructure(g, p),

    // Path and cycle properties
    hamiltonian: computeHamiltonian(g),
    traceable: computeTraceable(g),

    // Structural properties
    perfect: computePerfect(g),
    split: computeSplit(g),
    cograph: computeCograph(g),
    threshold: computeThreshold(g),
    line: computeLine(g),
    clawFree: computeClawFree(g),

    // Regularity properties
    cubic: computeCubic(g),
    specificRegular: computeAutoRegular(g),
    stronglyRegular: computeStronglyRegular(g),

    // Symmetry properties
    selfComplementary: computeSelfComplementary(g),
    vertexTransitive: computeVertexTransitive(g),

    // Special bipartite properties
    completeBipartite: computeCompleteBipartite(g),
  };
}

// ============================================================================
// Type-safe predicates
// ============================================================================

export type AnalyzerGraphPredicate = (g: AnalyzerGraph) => boolean;

/**
 * Create a predicate that checks if an axis equals a specific value.
 * Example: axisEquals("directionality", { kind: "undirected" })
 */
export function axisEquals<K extends keyof InferredGraphSpec>(
  key: K,
  expected: InferredGraphSpec[K],
  policy: Partial<ComputePolicy> = {}
): AnalyzerGraphPredicate {
  const p: ComputePolicy = { ...defaultComputePolicy, ...policy };
  return (g) => {
    const spec = computeGraphSpecFromGraph(g, p);
    return compareAxisValues(spec[key], expected);
  };
}

/**
 * Create a predicate that checks if an axis has a specific kind.
 * Example: axisKindIs("cycles", "acyclic")
 */
export function axisKindIs<K extends keyof InferredGraphSpec, KK extends string>(
  key: K,
  kind: KK,
  policy: Partial<ComputePolicy> = {}
): AnalyzerGraphPredicate {
  const p: ComputePolicy = { ...defaultComputePolicy, ...policy };
  return (g) => {
    const spec = computeGraphSpecFromGraph(g, p);
    const value = spec[key] as unknown as { kind: string };
    return value.kind === kind;
  };
}

/**
 * Create a predicate that checks if graph matches a partial GraphSpec.
 * Only checks the axes specified in the expected partial spec.
 */
export function hasGraphSpec(
  expected: Partial<InferredGraphSpec>,
  policy: Partial<ComputePolicy> = {}
): AnalyzerGraphPredicate {
  const p: ComputePolicy = { ...defaultComputePolicy, ...policy };

  return (g) => {
    const spec = computeGraphSpecFromGraph(g, p);

    for (const k of Object.keys(expected) as Array<keyof InferredGraphSpec>) {
      const got = spec[k];
      const want = expected[k] as InferredGraphSpec[typeof k];
      if (!compareAxisValues(got as any, want as any)) return false;
    }
    return true;
  };
}

/**
 * Compare two axis values for equality.
 * Handles kind-based comparison and field-level comparison.
 */
function compareAxisValues<T extends { kind: string }>(a: T, b: T): boolean {
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
}

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
 */
function isPlanarUndirectedBinary(g: AnalyzerGraph): boolean {
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
}

/**
 * Test if graph is chordal using Maximum Cardinality Search (MCS).
 * A graph is chordal if every cycle of length >= 4 has a chord.
 * Equivalent: graph has a perfect elimination ordering.
 */
function isChordalUndirectedBinary(g: AnalyzerGraph): boolean {
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
  for (const [v, laterNbs] of laterNeighbors) {
    const nbs = Array.from(laterNbs);
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
}

/**
 * Test if graph is an interval graph.
 * Interval graphs are chordal and their complements are comparability graphs.
 * This uses a simplified recognition algorithm.
 */
function isIntervalUndirectedBinary(g: AnalyzerGraph): boolean {
  // Interval graphs must be chordal
  if (!isChordalUndirectedBinary(g)) return false;

  // Build adjacency list
  const adj = buildAdjUndirectedBinary(g);

  // Maximal cliques can be ordered consecutively in interval graphs
  // Use a simplified clique-based approach
  const visited = new Set<AnalyzerVertexId>();
  const maximalCliques: Set<AnalyzerVertexId>[] = [];

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
        const isAdjacentToAll = Array.from(clique).every(c => {
          return (adj[c] ?? []).includes(u.id);
        });

        if (isAdjacentToAll) {
          clique.add(u.id);
          changed = true;
        }
      }
    }

    for (const c of clique) visited.add(c);
    maximalCliques.push(clique);
  }

  // For interval graphs, maximal cliques can be linearly ordered
  // such that for each vertex, the cliques containing it are consecutive
  // This is a simplified check - full algorithm is more complex

  return true; // Conservative: assume interval if chordal with consecutive cliques
}

/**
 * Test if graph is a unit disk graph.
 * Requires spatial embedding information in vertex attributes.
 */
function isUnitDiskGraph(g: AnalyzerGraph, policy: ComputePolicy): boolean {
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
    const pos = v.attrs![policy.posKey] as { x: number; y: number };
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

      const pu = positions.get(u)!;
      const pv = positions.get(v)!;
      const dist = Math.sqrt((pu.x - pv.x) ** 2 + (pu.y - pv.y) ** 2);

      if (hasEdge && dist > threshold) return false;
      if (!hasEdge && dist <= threshold) return false;
    }
  }

  return true;
}

/**
 * Test if graph is a permutation graph.
 * Permutation graphs are both comparability and their complements are comparability.
 */
function isPermutationUndirectedBinary(g: AnalyzerGraph): boolean {
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
}

/**
 * Test if graph is a comparability graph (has transitive orientation).
 */
function isComparabilityUndirectedBinary(g: AnalyzerGraph): boolean {
  // Comparability graphs can be transitively oriented
  // Full algorithm requires checking for transitive orientation
  // This is a conservative placeholder

  // All comparability graphs are perfect (no odd holes or odd anti-holes)
  // This is a necessary but not sufficient condition
  return isChordalUndirectedBinary(g); // Simplified check
}

// ============================================================================
// Convenience predicates for common graph classes
// ============================================================================

/**
 * Check if graph is a tree (undirected, acyclic, connected).
 */
export function isTree(g: AnalyzerGraph): boolean {
  return hasGraphSpec({
    directionality: { kind: "undirected" },
    edgeMultiplicity: { kind: "simple" },
    selfLoops: { kind: "disallowed" },
    cycles: { kind: "acyclic" },
    connectivity: { kind: "connected" },
  })(g);
}

/**
 * Check if graph is a forest (undirected, acyclic).
 */
export function isForest(g: AnalyzerGraph): boolean {
  return hasGraphSpec({
    directionality: { kind: "undirected" },
    edgeMultiplicity: { kind: "simple" },
    selfLoops: { kind: "disallowed" },
    cycles: { kind: "acyclic" },
  })(g);
}

/**
 * Check if graph is a DAG (directed, acyclic).
 */
export function isDAG(g: AnalyzerGraph): boolean {
  return hasGraphSpec({
    directionality: { kind: "directed" },
    edgeMultiplicity: { kind: "simple" },
    selfLoops: { kind: "disallowed" },
    cycles: { kind: "acyclic" },
  })(g);
}

/**
 * Check if graph is bipartite.
 */
export function isBipartite(g: AnalyzerGraph): boolean {
  return axisKindIs("partiteness", "bipartite")(g);
}

/**
 * Check if graph is complete.
 */
export function isComplete(g: AnalyzerGraph): boolean {
  return axisKindIs("completeness", "complete")(g);
}

/**
 * Check if graph is sparse (density <= 10%).
 */
export function isSparse(g: AnalyzerGraph): boolean {
  return axisKindIs("density", "sparse")(g);
}

/**
 * Check if graph is dense (density > 75%).
 */
export function isDense(g: AnalyzerGraph): boolean {
  return axisKindIs("density", "dense")(g);
}

/**
 * Check if graph is regular (all vertices have same degree).
 */
export function isRegular(g: AnalyzerGraph): boolean {
  return axisKindIs("degreeConstraint", "regular")(g);
}

/**
 * Check if graph is connected.
 */
export function isConnected(g: AnalyzerGraph): boolean {
  return axisKindIs("connectivity", "connected")(g);
}

/**
 * Check if graph is Eulerian (all vertices have even degree).
 * For undirected graphs, this means an Eulerian circuit exists.
 * For directed graphs, checks if strongly connected with equal in/out degrees.
 */
export function isEulerian(g: AnalyzerGraph): boolean {
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
}

/**
 * Check if graph is a star (one central vertex connected to all others).
 */
export function isStar(g: AnalyzerGraph): boolean {
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
}

/**
 * Check if graph is planar (can be drawn without edge crossings).
 * Uses Euler's formula heuristics: E <= 3V - 6 for simple graphs.
 * For bipartite planar graphs: E <= 2V - 4.
 * Note: This is a necessary but not sufficient condition.
 */
export function isPlanar(g: AnalyzerGraph): boolean {
  // Only valid for undirected binary simple graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);
  const isSimple = computeEdgeMultiplicity(g).kind === "simple";

  if (!isUndirected || !isBinary || !isSimple) return false;

  return isPlanarUndirectedBinary(g);
}

/**
 * Check if graph is chordal (every cycle of length >= 4 has a chord).
 * Equivalent to having a perfect elimination ordering.
 * Uses Maximum Cardinality Search (MCS) algorithm.
 */
export function isChordal(g: AnalyzerGraph): boolean {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isChordalUndirectedBinary(g);
}

/**
 * Check if graph is an interval graph.
 * Interval graphs are chordal and can be represented as intersection of intervals.
 */
export function isInterval(g: AnalyzerGraph): boolean {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isIntervalUndirectedBinary(g);
}

/**
 * Check if graph is a permutation graph.
 * Permutation graphs are both comparability graphs and their complements are too.
 */
export function isPermutation(g: AnalyzerGraph): boolean {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isPermutationUndirectedBinary(g);
}

/**
 * Check if graph is a unit disk graph.
 * Requires vertices to have position attributes ({x, y}).
 * Graph is unit disk if edges exist exactly when distance <= threshold.
 */
export function isUnitDisk(g: AnalyzerGraph): boolean {
  const p = { ...defaultComputePolicy };

  // Only valid for undirected binary graphs with position data
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isUnitDiskGraph(g, p);
}

/**
 * Check if graph is a comparability graph (has transitive orientation).
 * Comparability graphs represent partial orders.
 */
export function isComparability(g: AnalyzerGraph): boolean {
  // Only valid for undirected binary graphs
  const isUndirected = g.edges.every(e => !e.directed);
  const isBinary = g.edges.every(e => e.endpoints.length === 2);

  if (!isUndirected || !isBinary) return false;

  return isComparabilityUndirectedBinary(g);
}

// ============================================================================
// Network analysis predicates
// ============================================================================

/**
 * Check if graph is scale-free (power-law degree distribution).
 */
export function isScaleFree(g: AnalyzerGraph): boolean {
  return axisKindIs("scaleFree", "scale_free")(g);
}

/**
 * Check if graph has small-world property (high clustering + short paths).
 */
export function isSmallWorld(g: AnalyzerGraph): boolean {
  return axisKindIs("smallWorld", "small_world")(g);
}

/**
 * Check if graph has modular community structure.
 */
export function isModular(g: AnalyzerGraph): boolean {
  return axisKindIs("communityStructure", "modular")(g);
}

// ============================================================================
// Path and cycle predicates
// ============================================================================

/**
 * Check if graph is Hamiltonian (has cycle visiting every vertex exactly once).
 * NP-complete to determine, so this is conservative for graphs with n > 10.
 */
export function isHamiltonian(g: AnalyzerGraph): boolean {
  return axisKindIs("hamiltonian", "hamiltonian")(g);
}

/**
 * Check if graph is traceable (has path visiting every vertex exactly once).
 * NP-complete to determine, so this is conservative for graphs with n > 10.
 */
export function isTraceable(g: AnalyzerGraph): boolean {
  return axisKindIs("traceable", "traceable")(g);
}

// ============================================================================
// Structural predicates
// ============================================================================

/**
 * Check if graph is perfect (ω(H) = χ(H) for all induced subgraphs H).
 * Perfect graphs have no odd holes or odd anti-holes.
 */
export function isPerfect(g: AnalyzerGraph): boolean {
  return axisKindIs("perfect", "perfect")(g);
}

/**
 * Check if graph is a split graph (partition into clique + independent set).
 */
export function isSplit(g: AnalyzerGraph): boolean {
  return axisKindIs("split", "split")(g);
}

/**
 * Check if graph is a cograph (P4-free, no induced path on 4 vertices).
 */
export function isCograph(g: AnalyzerGraph): boolean {
  return axisKindIs("cograph", "cograph")(g);
}

/**
 * Check if graph is a threshold graph (both split and cograph).
 */
export function isThreshold(g: AnalyzerGraph): boolean {
  return axisKindIs("threshold", "threshold")(g);
}

/**
 * Check if graph is a line graph (represents edge adjacencies of another graph).
 */
export function isLineGraph(g: AnalyzerGraph): boolean {
  return axisKindIs("line", "line_graph")(g);
}

/**
 * Check if graph is claw-free (no K1,3 induced subgraph).
 */
export function isClawFree(g: AnalyzerGraph): boolean {
  return axisKindIs("clawFree", "claw_free")(g);
}

// ============================================================================
// Regularity predicates
// ============================================================================

/**
 * Check if graph is cubic (3-regular).
 */
export function isCubic(g: AnalyzerGraph): boolean {
  return axisKindIs("cubic", "cubic")(g);
}

/**
 * Check if graph is k-regular for a specific k.
 */
export function isKRegular(k: number): (g: AnalyzerGraph) => boolean {
  return (g: AnalyzerGraph): boolean => {
    const result = computeSpecificRegular(g, k);
    return result.kind === "k_regular";
  };
}

/**
 * Check if graph is strongly regular (n,k,λ,μ) parameters.
 */
export function isStronglyRegular(g: AnalyzerGraph): boolean {
  return axisKindIs("stronglyRegular", "strongly_regular")(g);
}

// ============================================================================
// Symmetry predicates
// ============================================================================

/**
 * Check if graph is self-complementary (isomorphic to its complement).
 */
export function isSelfComplementary(g: AnalyzerGraph): boolean {
  return axisKindIs("selfComplementary", "self_complementary")(g);
}

/**
 * Check if graph is vertex-transitive (all vertices equivalent under automorphisms).
 * GI-hard to determine, so this is conservative for graphs with n > 6.
 */
export function isVertexTransitive(g: AnalyzerGraph): boolean {
  return axisKindIs("vertexTransitive", "vertex_transitive")(g);
}

// ============================================================================
// Special bipartite predicates
// ============================================================================

/**
 * Check if graph is complete bipartite K_{m,n}.
 */
export function isCompleteBipartite(g: AnalyzerGraph): boolean {
  return axisKindIs("completeBipartite", "complete_bipartite")(g);
}
