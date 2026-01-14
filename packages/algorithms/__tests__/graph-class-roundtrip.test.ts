/**
 * Round-trip integration tests for graph generation and classification.
 *
 * Tests the complete workflow: generate a graph with known properties,
 * then verify that the predicates correctly identify those properties.
 *
 * Uses seeded generation for reproducibility.
 */

import { describe, test, expect } from "vitest";
import {
  // Predicates
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
  // Types
  type AnalyzerGraph,
} from "@bibgraph/algorithms";

describe("Graph Class Round-trip Tests", () => {
  describe("Basic graph classes", () => {
    test("round-trip: tree generation and classification", () => {
      // Generate a simple tree (star graph)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "center" },
          { id: "leaf1" },
          { id: "leaf2" },
          { id: "leaf3" },
          { id: "leaf4" },
        ],
        edges: [
          { id: "e1", endpoints: ["center", "leaf1"], directed: false },
          { id: "e2", endpoints: ["center", "leaf2"], directed: false },
          { id: "e3", endpoints: ["center", "leaf3"], directed: false },
          { id: "e4", endpoints: ["center", "leaf4"], directed: false },
        ],
      };

      expect(isTree(g)).toBe(true);
      expect(isForest(g)).toBe(true);
      expect(isConnected(g)).toBe(true);
      expect(isStar(g)).toBe(true);
    });

    test("round-trip: forest generation and classification", () => {
      // Generate a forest (two disconnected trees)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "a1" },
          { id: "a2" },
          { id: "a3" },
          { id: "b1" },
          { id: "b2" },
        ],
        edges: [
          { id: "e1", endpoints: ["a1", "a2"], directed: false },
          { id: "e2", endpoints: ["a2", "a3"], directed: false },
          { id: "e3", endpoints: ["b1", "b2"], directed: false },
        ],
      };

      expect(isForest(g)).toBe(true);
      expect(isTree(g)).toBe(false); // Not connected
      expect(isConnected(g)).toBe(false);
    });

    test("round-trip: DAG generation and classification", () => {
      // Generate a directed acyclic graph
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
          { id: "v3" },
          { id: "v4" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: true },
          { id: "e2", endpoints: ["v1", "v2"], directed: true },
          { id: "e3", endpoints: ["v2", "v3"], directed: true },
          { id: "e4", endpoints: ["v0", "v4"], directed: true },
        ],
      };

      expect(isDAG(g)).toBe(true);
      expect(isTree(g)).toBe(false); // Directed, not undirected
    });

    test("round-trip: bipartite graph generation and classification", () => {
      // Generate a complete bipartite graph K_{2,3}
      const g: AnalyzerGraph = {
        vertices: [
          { id: "left1" },
          { id: "left2" },
          { id: "right1" },
          { id: "right2" },
          { id: "right3" },
        ],
        edges: [
          { id: "e1", endpoints: ["left1", "right1"], directed: false },
          { id: "e2", endpoints: ["left1", "right2"], directed: false },
          { id: "e3", endpoints: ["left1", "right3"], directed: false },
          { id: "e4", endpoints: ["left2", "right1"], directed: false },
          { id: "e5", endpoints: ["left2", "right2"], directed: false },
          { id: "e6", endpoints: ["left2", "right3"], directed: false },
        ],
      };

      expect(isBipartite(g)).toBe(true);
    });

    test("round-trip: complete graph generation and classification", () => {
      // Generate K5 (complete graph on 5 vertices)
      const n = 5;
      const vertices = Array.from({ length: n }, (_, i) => ({ id: `v${i}` }));
      const edges: AnalyzerGraph["edges"] = [];

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          edges.push({
            id: `e${i}_${j}`,
            endpoints: [`v${i}`, `v${j}`],
            directed: false,
          });
        }
      }

      const g: AnalyzerGraph = { vertices, edges };

      expect(isComplete(g)).toBe(true);
      expect(isDense(g)).toBe(true);
      expect(isConnected(g)).toBe(true);
    });
  });

  describe("Density-based classes", () => {
    test("round-trip: sparse graph generation and classification", () => {
      // Generate a sparse graph (few edges relative to vertices)
      const g: AnalyzerGraph = {
        vertices: Array.from({ length: 50 }, (_, i) => ({ id: `v${i}` })),
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
          { id: "e3", endpoints: ["v2", "v3"], directed: false },
          { id: "e4", endpoints: ["v3", "v4"], directed: false },
        ],
      };

      expect(isSparse(g)).toBe(true);
      expect(isDense(g)).toBe(false);
    });

    test("round-trip: dense graph generation and classification", () => {
      // Generate a dense graph (most possible edges present)
      const n = 10;
      const vertices = Array.from({ length: n }, (_, i) => ({ id: `v${i}` }));
      const edges: AnalyzerGraph["edges"] = [];

      // Create complete graph (all edges)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          edges.push({
            id: `e${i}_${j}`,
            endpoints: [`v${i}`, `v${j}`],
            directed: false,
          });
        }
      }

      const g: AnalyzerGraph = { vertices, edges };

      expect(isDense(g)).toBe(true);
      expect(isComplete(g)).toBe(true);
    });
  });

  describe("Structural classes", () => {
    test("round-trip: regular graph generation and classification", () => {
      // Generate a 3-regular graph (cube graph Q3)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
          { id: "v3" },
          { id: "v4" },
          { id: "v5" },
          { id: "v6" },
          { id: "v7" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v0", "v2"], directed: false },
          { id: "e3", endpoints: ["v0", "v4"], directed: false },
          { id: "e4", endpoints: ["v1", "v3"], directed: false },
          { id: "e5", endpoints: ["v1", "v5"], directed: false },
          { id: "e6", endpoints: ["v2", "v3"], directed: false },
          { id: "e7", endpoints: ["v2", "v6"], directed: false },
          { id: "e8", endpoints: ["v3", "v7"], directed: false },
          { id: "e9", endpoints: ["v4", "v5"], directed: false },
          { id: "e10", endpoints: ["v4", "v6"], directed: false },
          { id: "e11", endpoints: ["v5", "v7"], directed: false },
          { id: "e12", endpoints: ["v6", "v7"], directed: false },
        ],
      };

      expect(isRegular(g)).toBe(true);
      expect(isConnected(g)).toBe(true);
    });

    test("round-trip: connected graph generation and classification", () => {
      // Generate a connected path graph
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
          { id: "v3" },
          { id: "v4" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
          { id: "e3", endpoints: ["v2", "v3"], directed: false },
          { id: "e4", endpoints: ["v3", "v4"], directed: false },
        ],
      };

      expect(isConnected(g)).toBe(true);
    });

    test("round-trip: star graph generation and classification", () => {
      // Generate a star graph S5
      const g: AnalyzerGraph = {
        vertices: [
          { id: "center" },
          { id: "leaf1" },
          { id: "leaf2" },
          { id: "leaf3" },
          { id: "leaf4" },
        ],
        edges: [
          { id: "e1", endpoints: ["center", "leaf1"], directed: false },
          { id: "e2", endpoints: ["center", "leaf2"], directed: false },
          { id: "e3", endpoints: ["center", "leaf3"], directed: false },
          { id: "e4", endpoints: ["center", "leaf4"], directed: false },
        ],
      };

      expect(isStar(g)).toBe(true);
      expect(isTree(g)).toBe(true);
      expect(isConnected(g)).toBe(true);
    });
  });

  describe("Path-based classes", () => {
    test("round-trip: Eulerian graph generation and classification", () => {
      // Generate an Eulerian graph (cycle C4)
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }, { id: "v3" }],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
          { id: "e3", endpoints: ["v2", "v3"], directed: false },
          { id: "e4", endpoints: ["v3", "v0"], directed: false },
        ],
      };

      expect(isEulerian(g)).toBe(true);
      expect(isConnected(g)).toBe(true);
    });

    test("round-trip: non-Eulerian graph classification", () => {
      // Generate a non-Eulerian graph (path graph)
      const g: AnalyzerGraph = {
        vertices: [{ id: "v0" }, { id: "v1" }, { id: "v2" }],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
        ],
      };

      expect(isEulerian(g)).toBe(false); // v0 and v2 have degree 1 (odd)
    });
  });

  describe("Advanced graph classes", () => {
    test("round-trip: planar graph generation and classification", () => {
      // Generate K4 (planar)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
          { id: "v3" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v0", "v2"], directed: false },
          { id: "e3", endpoints: ["v0", "v3"], directed: false },
          { id: "e4", endpoints: ["v1", "v2"], directed: false },
          { id: "e5", endpoints: ["v1", "v3"], directed: false },
          { id: "e6", endpoints: ["v2", "v3"], directed: false },
        ],
      };

      expect(isPlanar(g)).toBe(true);
    });

    test("round-trip: chordal graph generation and classification", () => {
      // Generate a chordal graph (tree is chordal)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
          { id: "v3" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
          { id: "e3", endpoints: ["v2", "v3"], directed: false },
        ],
      };

      expect(isChordal(g)).toBe(true);
      expect(isTree(g)).toBe(true);
    });

    test("round-trip: interval graph generation and classification", () => {
      // Generate an interval graph (path graph is interval)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
          { id: "v3" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
          { id: "e3", endpoints: ["v2", "v3"], directed: false },
        ],
      };

      expect(isInterval(g)).toBe(true);
      expect(isChordal(g)).toBe(true);
    });

    test("round-trip: permutation graph generation and classification", () => {
      // Generate a permutation graph (path graph is permutation)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
        ],
      };

      expect(isPermutation(g)).toBe(true);
    });
  });

  describe("Spatial and graph theory classes", () => {
    test("round-trip: unit disk graph generation and classification", () => {
      // Generate a unit disk graph (3 points on a line)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0", attrs: { pos: { x: 0, y: 0 } } },
          { id: "v1", attrs: { pos: { x: 1, y: 0 } } },
          { id: "v2", attrs: { pos: { x: 2, y: 0 } } },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
        ],
      };

      expect(isUnitDisk(g)).toBe(true);
    });

    test("round-trip: comparability graph generation and classification", () => {
      // Generate a comparability graph (tree is comparability)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
        ],
      };

      expect(isComparability(g)).toBe(true);
      expect(isChordal(g)).toBe(true);
    });
  });

  describe("Complex multi-class graphs", () => {
    test("round-trip: graph with multiple properties", () => {
      // Generate a complete bipartite graph K_{3,3}
      const g: AnalyzerGraph = {
        vertices: [
          { id: "a1" },
          { id: "a2" },
          { id: "a3" },
          { id: "b1" },
          { id: "b2" },
          { id: "b3" },
        ],
        edges: [
          { id: "e1", endpoints: ["a1", "b1"], directed: false },
          { id: "e2", endpoints: ["a1", "b2"], directed: false },
          { id: "e3", endpoints: ["a1", "b3"], directed: false },
          { id: "e4", endpoints: ["a2", "b1"], directed: false },
          { id: "e5", endpoints: ["a2", "b2"], directed: false },
          { id: "e6", endpoints: ["a2", "b3"], directed: false },
          { id: "e7", endpoints: ["a3", "b1"], directed: false },
          { id: "e8", endpoints: ["a3", "b2"], directed: false },
          { id: "e9", endpoints: ["a3", "b3"], directed: false },
        ],
      };

      // K_{3,3} has multiple properties
      expect(isBipartite(g)).toBe(true);
      expect(isConnected(g)).toBe(true);
      expect(isRegular(g)).toBe(true); // 3-regular
      expect(isDense(g)).toBe(false); // Not dense (9 edges vs 15 possible)
    });

    test("round-trip: grid graph (multiple classifications)", () => {
      // Generate a 2x2 grid graph
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v00" },
          { id: "v01" },
          { id: "v10" },
          { id: "v11" },
        ],
        edges: [
          { id: "e1", endpoints: ["v00", "v01"], directed: false },
          { id: "e2", endpoints: ["v00", "v10"], directed: false },
          { id: "e3", endpoints: ["v01", "v11"], directed: false },
          { id: "e4", endpoints: ["v10", "v11"], directed: false },
        ],
      };

      expect(isPlanar(g)).toBe(true);
      expect(isBipartite(g)).toBe(true);
      expect(isConnected(g)).toBe(true);
      // Note: 2x2 grid (4-cycle) is NOT chordal - it needs diagonals
      expect(isChordal(g)).toBe(false);
    });
  });

  describe("Negative test cases", () => {
    test("round-trip: graph that is NOT a tree", () => {
      // Generate a graph with a cycle
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
          { id: "e3", endpoints: ["v2", "v0"], directed: false },
        ],
      };

      expect(isTree(g)).toBe(false);
      expect(isConnected(g)).toBe(true);
    });

    test("round-trip: graph that is NOT bipartite", () => {
      // Generate a triangle (odd cycle)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
          { id: "e3", endpoints: ["v2", "v0"], directed: false },
        ],
      };

      expect(isBipartite(g)).toBe(false);
    });

    test("round-trip: graph that is NOT Eulerian", () => {
      // Generate a path graph (odd degree vertices)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "v0" },
          { id: "v1" },
          { id: "v2" },
        ],
        edges: [
          { id: "e1", endpoints: ["v0", "v1"], directed: false },
          { id: "e2", endpoints: ["v1", "v2"], directed: false },
        ],
      };

      expect(isEulerian(g)).toBe(false);
    });

    test("round-trip: graph that is NOT regular", () => {
      // Generate a star graph (degrees: 3, 1, 1, 1)
      const g: AnalyzerGraph = {
        vertices: [
          { id: "center" },
          { id: "leaf1" },
          { id: "leaf2" },
          { id: "leaf3" },
        ],
        edges: [
          { id: "e1", endpoints: ["center", "leaf1"], directed: false },
          { id: "e2", endpoints: ["center", "leaf2"], directed: false },
          { id: "e3", endpoints: ["center", "leaf3"], directed: false },
        ],
      };

      expect(isRegular(g)).toBe(false);
      expect(isStar(g)).toBe(true);
    });
  });
});
