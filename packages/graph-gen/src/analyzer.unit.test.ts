import { describe, test, expect } from "vitest";
import {
  computeGraphSpecFromGraph,
  axisKindIs,
  axisEquals,
  hasGraphSpec,
  isTree,
  isForest,
  isDAG,
  isBipartite,
  isComplete,
  isSparse,
  isDense,
  isRegular,
  isConnected,
  isEulerian,
  isStar,
  isPlanar,
  isChordal,
  isInterval,
  isPermutation,
  isUnitDisk,
  isComparability,
  type AnalyzerGraph,
} from "@bibgraph/graph-gen";

describe("Graph Spec Analyzer", () => {
  describe("Core property computation", () => {
    test("computes vertex cardinality (finite)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.vertexCardinality).toEqual({ kind: "finite", n: 3 });
    });

    test("computes directionality (undirected)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.directionality).toEqual({ kind: "undirected" });
    });

    test("computes directionality (directed)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: true }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.directionality).toEqual({ kind: "directed" });
    });

    test("computes directionality (mixed)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: true },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.directionality).toEqual({ kind: "mixed" });
    });

    test("detects self-loops", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v0"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.selfLoops).toEqual({ kind: "allowed" });
    });

    test("detects no self-loops", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.selfLoops).toEqual({ kind: "disallowed" });
    });

    test("computes edge multiplicity (simple)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.edgeMultiplicity).toEqual({ kind: "simple" });
    });

    test("computes edge multiplicity (multi)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.edgeMultiplicity).toEqual({ kind: "multi" });
    });

    test("computes edge arity (binary)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.edgeArity).toEqual({ kind: "binary" });
    });

    test("computes edge arity (k-ary)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1", "v2"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.edgeArity).toEqual({ kind: "k_ary", k: 3 });
    });

    test("computes weighting (unweighted)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.weighting).toEqual({ kind: "unweighted" });
    });

    test("computes weighting (weighted)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false, weight: 1.5 }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.weighting).toEqual({ kind: "weighted_numeric" });
    });

    test("computes vertex data (unlabelled)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.vertexData).toEqual({ kind: "unlabelled" });
    });

    test("computes vertex data (labelled)", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", label: "node0" },
          { id: "v1", label: "node1" },
        ],
        edges: [],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.vertexData).toEqual({ kind: "labelled" });
    });

    test("computes vertex data (attributed)", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { value: 42 } },
          { id: "v1" },
        ],
        edges: [],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.vertexData).toEqual({ kind: "attributed" });
    });

    test("computes schema homogeneity (homogeneous)", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { type: "A" } },
          { id: "v1", attrs: { type: "B" } },
        ],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false, attrs: { weight: 1 } },
          { id: "e1", endpoints: ["v0", "v1"], directed: false, attrs: { weight: 2 } },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.schema).toEqual({ kind: "homogeneous" });
    });

    test("computes schema homogeneity (heterogeneous)", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { type: "A" } },
          { id: "v1", attrs: { other: "B" } }, // different key
        ],
        edges: [],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.schema).toEqual({ kind: "heterogeneous" });
    });
  });

  describe("Structural analysis", () => {
    test("detects connected graph", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.connectivity).toEqual({ kind: "connected" });
    });

    test("detects disconnected graph", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.connectivity).toEqual({ kind: "unconstrained" });
    });

    test("detects acyclic directed graph (DAG)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: true },
          { id: "e1", endpoints: ["v1", "v2"], directed: true },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.cycles).toEqual({ kind: "acyclic" });
    });

    test("detects cyclic directed graph", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: true },
          { id: "e1", endpoints: ["v1", "v2"], directed: true },
          { id: "e2", endpoints: ["v2", "v0"], directed: true },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.cycles).toEqual({ kind: "cycles_allowed" });
    });

    test("detects bipartite graph", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }, { id: "v3" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v2"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
          { id: "e2", endpoints: ["v1", "v3"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.partiteness).toEqual({ kind: "bipartite" });
    });

    test("detects non-bipartite graph (odd cycle)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
          { id: "e2", endpoints: ["v2", "v0"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.partiteness).toEqual({ kind: "unrestricted" });
    });

    test("detects regular graph (all degrees equal)", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }, { id: "v3" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
          { id: "e2", endpoints: ["v2", "v3"], directed: false },
          { id: "e3", endpoints: ["v3", "v0"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.degreeConstraint).toEqual({ kind: "regular", degree: 2 });
    });

    test("computes degree sequence", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.degreeConstraint).toEqual({
        kind: "degree_sequence",
        sequence: [1, 2, 1],
      });
    });

    test("detects complete graph", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
          { id: "e2", endpoints: ["v0", "v2"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.completeness).toEqual({ kind: "complete" });
    });

    test("detects incomplete graph", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.completeness).toEqual({ kind: "incomplete" });
    });

    test("detects sparse graph", () => {
      const g: AnalyzerGraph = {
        vertices: Array.from({ length: 20 }, (_, i) => ({ id: `v${i}` })),
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.density).toEqual({ kind: "sparse" });
    });

    test("detects dense graph", () => {
      const n = 10;
      const vertices = Array.from({ length: n }, (_, i) => ({ id: `v${i}` }));
      const edges: AnalyzerGraph["edges"] = [];

      // Create dense graph (>90% of possible edges = 41+ edges out of 45)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          edges.push({ id: `e${edges.length}`, endpoints: [`v${i}`, `v${j}`], directed: false });
        }
      }

      const g: AnalyzerGraph = { vertices, edges };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.density).toEqual({ kind: "dense" });
    });
  });

  describe("Metadata-based properties", () => {
    test("detects spatial embedding (2D)", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { pos: { x: 0, y: 0 } } },
          { id: "v1", attrs: { pos: { x: 1, y: 1 } } },
        ],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.embedding).toEqual({ kind: "spatial_coordinates", dims: 2 });
    });

    test("detects spatial embedding (3D)", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { pos: { x: 0, y: 0, z: 0 } } },
          { id: "v1", attrs: { pos: { x: 1, y: 1, z: 1 } } },
        ],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.embedding).toEqual({ kind: "spatial_coordinates", dims: 3 });
    });

    test("detects rooted graph", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { root: true } },
          { id: "v1" },
          { id: "v2" },
        ],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v0", "v2"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.rooting).toEqual({ kind: "rooted" });
    });

    test("detects multi-rooted graph", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { root: true } },
          { id: "v1", attrs: { root: true } },
          { id: "v2" },
        ],
        edges: [],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.rooting).toEqual({ kind: "multi_rooted" });
    });

    test("detects temporal edges", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false, attrs: { time: 12345 } },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.temporal).toEqual({ kind: "temporal_edges" });
    });

    test("detects time-ordered graph", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { time: 1000 } },
          { id: "v1", attrs: { time: 2000 } },
        ],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false, attrs: { time: 1500 } }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.temporal).toEqual({ kind: "time_ordered" });
    });

    test("detects multi-layer graph", () => {
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { layer: "A" } },
          { id: "v1", attrs: { layer: "B" } },
        ],
        edges: [],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.layering).toEqual({ kind: "multi_layer" });
    });
  });

  describe("Type-safe predicates", () => {
    test("axisKindIs creates predicate for kind check", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };

      const isUndirected = axisKindIs("directionality", "undirected");
      expect(isUndirected(g)).toBe(true);

      const isDirected = axisKindIs("directionality", "directed");
      expect(isDirected(g)).toBe(false);
    });

    test("axisEquals creates predicate for exact match", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [],
      };

      const hasThreeVertices = axisEquals("vertexCardinality", { kind: "finite", n: 3 });
      expect(hasThreeVertices(g)).toBe(true);

      const hasFiveVertices = axisEquals("vertexCardinality", { kind: "finite", n: 5 });
      expect(hasFiveVertices(g)).toBe(false);
    });

    test("hasGraphSpec creates predicate for partial spec match", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };

      const matches = hasGraphSpec({
        directionality: { kind: "undirected" },
        edgeMultiplicity: { kind: "simple" },
      });
      expect(matches(g)).toBe(true);

      const notMatches = hasGraphSpec({
        directionality: { kind: "directed" },
      });
      expect(notMatches(g)).toBe(false);
    });
  });

  describe("Convenience predicates", () => {
    test("isTree identifies trees", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v0", "v2"], directed: false },
        ],
      };
      expect(isTree(g)).toBe(true);
    });

    test("isTree rejects non-trees", () => {
      // Graph with cycle
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
          { id: "e2", endpoints: ["v2", "v0"], directed: false },
        ],
      };
      expect(isTree(g)).toBe(false);
    });

    test("isDAG identifies directed acyclic graphs", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: true },
          { id: "e1", endpoints: ["v1", "v2"], directed: true },
        ],
      };
      expect(isDAG(g)).toBe(true);
    });

    test("isDAG rejects cyclic graphs", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: true },
          { id: "e1", endpoints: ["v1", "v2"], directed: true },
          { id: "e2", endpoints: ["v2", "v0"], directed: true },
        ],
      };
      expect(isDAG(g)).toBe(false);
    });

    test("isBipartite identifies bipartite graphs", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }, { id: "v3" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v2"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
          { id: "e2", endpoints: ["v1", "v3"], directed: false },
        ],
      };
      expect(isBipartite(g)).toBe(true);
    });

    test("isComplete identifies complete graphs", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
          { id: "e2", endpoints: ["v0", "v2"], directed: false },
        ],
      };
      expect(isComplete(g)).toBe(true);
    });

    test("isSparse identifies sparse graphs", () => {
      const g: AnalyzerGraph = {
        vertices: Array.from({ length: 20 }, (_, i) => ({ id: `v${i}` })),
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      expect(isSparse(g)).toBe(true);
    });

    test("isDense identifies dense graphs", () => {
      const g: AnalyzerGraph = {
        vertices: Array.from({ length: 5 }, (_, i) => ({ id: `v${i}` })),
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v0", "v2"], directed: false },
          { id: "e2", endpoints: ["v0", "v3"], directed: false },
          { id: "e3", endpoints: ["v0", "v4"], directed: false },
          { id: "e4", endpoints: ["v1", "v2"], directed: false },
          { id: "e5", endpoints: ["v1", "v3"], directed: false },
          { id: "e6", endpoints: ["v1", "v4"], directed: false },
          { id: "e7", endpoints: ["v2", "v3"], directed: false },
          { id: "e8", endpoints: ["v2", "v4"], directed: false },
          { id: "e9", endpoints: ["v3", "v4"], directed: false },
        ],
      };
      expect(isDense(g)).toBe(true);
    });

    test("isRegular identifies regular graphs", () => {
      // 3-regular graph (cube graph)
      const g: AnalyzerGraph = {
        vertices: Array.from({ length: 8 }, (_, i) => ({ id: `v${i}` })),
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v0", "v2"], directed: false },
          { id: "e2", endpoints: ["v0", "v4"], directed: false },
          { id: "e3", endpoints: ["v1", "v3"], directed: false },
          { id: "e4", endpoints: ["v1", "v5"], directed: false },
          { id: "e5", endpoints: ["v2", "v3"], directed: false },
          { id: "e6", endpoints: ["v2", "v6"], directed: false },
          { id: "e7", endpoints: ["v3", "v7"], directed: false },
          { id: "e8", endpoints: ["v4", "v5"], directed: false },
          { id: "e9", endpoints: ["v4", "v6"], directed: false },
          { id: "e10", endpoints: ["v5", "v7"], directed: false },
          { id: "e11", endpoints: ["v6", "v7"], directed: false },
        ],
      };
      expect(isRegular(g)).toBe(true);
    });

    test("isConnected identifies connected graphs", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.connectivity.kind).toBe("connected");
    });

    test("isEulerian identifies Eulerian graphs", () => {
      // Eulerian circuit: all vertices have even degree
      // Cycle C4: v0-v1-v2-v3-v0, all vertices have degree 2
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }, { id: "v3" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
          { id: "e2", endpoints: ["v2", "v3"], directed: false },
          { id: "e3", endpoints: ["v3", "v0"], directed: false },
        ],
      };
      expect(isEulerian(g)).toBe(true);
    });

    test("isStar identifies star graphs", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }, { id: "v3" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v0", "v2"], directed: false },
          { id: "e2", endpoints: ["v0", "v3"], directed: false },
        ],
      };
      expect(isStar(g)).toBe(true);
    });

    test("isPlanar identifies planar graphs", () => {
      // K4 is planar
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }, { id: "v3" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v0", "v2"], directed: false },
          { id: "e2", endpoints: ["v0", "v3"], directed: false },
          { id: "e3", endpoints: ["v1", "v2"], directed: false },
          { id: "e4", endpoints: ["v1", "v3"], directed: false },
          { id: "e5", endpoints: ["v2", "v3"], directed: false },
        ],
      };
      expect(isPlanar(g)).toBe(true);
    });

    test("isChordal identifies chordal graphs", () => {
      // A tree is chordal (no cycles to check)
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      expect(isChordal(g)).toBe(true);
    });

    test("isInterval identifies interval graphs", () => {
      // A path graph is an interval graph
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      expect(isInterval(g)).toBe(true);
    });

    test("isPermutation identifies permutation graphs", () => {
      // A simple path is a permutation graph
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      expect(isPermutation(g)).toBe(true);
    });

    test("isUnitDisk identifies unit disk graphs", () => {
      // 3 vertices in a line with unit distance edges
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { pos: { x: 0, y: 0 } } },
          { id: "v1", attrs: { pos: { x: 1, y: 0 } } },
          { id: "v2", attrs: { pos: { x: 2, y: 0 } } },
        ],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      expect(isUnitDisk(g)).toBe(true);
    });

    test("isComparability identifies comparability graphs", () => {
      // A tree is a comparability graph
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: false },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      expect(isComparability(g)).toBe(true);
    });
  });

  describe("Edge cases", () => {
    test("handles empty graph", () => {
      const g: AnalyzerGraph = { vertices: [], edges: [] };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.vertexCardinality).toEqual({ kind: "finite", n: 0 });
      expect(spec.edgeArity).toEqual({ kind: "binary" });
    });

    test("handles single vertex", () => {
      const g: AnalyzerGraph = { vertices: [{ id: "v0" }], edges: [] };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.vertexCardinality).toEqual({ kind: "finite", n: 1 });
      expect(spec.completeness).toEqual({ kind: "complete" });
    });

    test("handles single edge", () => {
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }],
        edges: [{ id: "e0", endpoints: ["v0", "v1"], directed: false }],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.connectivity).toEqual({ kind: "connected" });
      expect(spec.edgeMultiplicity).toEqual({ kind: "simple" });
    });

    test("returns unconstrained for unsupported graph types in cycle detection", () => {
      // Mixed directed/undirected edges
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e0", endpoints: ["v0", "v1"], directed: true },
          { id: "e1", endpoints: ["v1", "v2"], directed: false },
        ],
      };
      const spec = computeGraphSpecFromGraph(g);
      expect(spec.cycles).toEqual({ kind: "cycles_allowed" });
    });
  });
});
