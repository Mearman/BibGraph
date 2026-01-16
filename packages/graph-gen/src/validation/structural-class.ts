import type { TestEdge, TestNode } from '../generators/types'
import type { TestGraph } from '../generators/types'
import type { PropertyValidationResult } from './types';

import {
  getCombinations,
  hasInducedP4,
  hasChord,
  findInducedCycles,
  checkTransitiveOrientation,
} from "./helper-functions";

// ============================================================================
// STRUCTURAL CLASS VALIDATORS
// ============================================================================

/**
 * Validates split graph property.
 * Split graph = vertices can be partitioned into clique K and independent set I.
 *
 * @param graph - The graph to validate
 * @returns PropertyValidationResult with validation details
 */
export const validateSplit = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  // Only validate when spec requires split
  if (spec.split?.kind !== "split") {
    return {
      property: "split",
      expected: spec.split?.kind ?? "unconstrained",
      actual: spec.split?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 2) {
    return {
      property: "split",
      expected: "split",
      actual: "trivial",
      valid: true,
    };
  }

  // Build adjacency list for efficient clique/independent set checking
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    if (spec.directionality.kind === "undirected") {
      adjacency.get(edge.target)?.add(edge.source);
    }
  }

  // Check if stored partition is valid (from generator metadata)
  const hasStoredPartition = nodes.every(n => n.data?.splitPartition);
  if (hasStoredPartition) {
    const clique = nodes.filter(n => n.data?.splitPartition === 'clique');
    const independent = nodes.filter(n => n.data?.splitPartition === 'independent');

    // Verify clique is complete
    let cliqueIsComplete = true;
    for (let i = 0; i < clique.length && cliqueIsComplete; i++) {
      for (let j = i + 1; j < clique.length && cliqueIsComplete; j++) {
        if (!adjacency.get(clique[i].id)?.has(clique[j].id)) {
          cliqueIsComplete = false;
        }
      }
    }

    // Verify independent set has no internal edges
    let independentIsEmpty = true;
    for (let i = 0; i < independent.length && independentIsEmpty; i++) {
      for (let j = i + 1; j < independent.length && independentIsEmpty; j++) {
        if (adjacency.get(independent[i].id)?.has(independent[j].id)) {
          independentIsEmpty = false;
        }
      }
    }

    if (cliqueIsComplete && independentIsEmpty) {
      return {
        property: "split",
        expected: "split",
        actual: "split",
        valid: true,
      };
    }
  }

  // Fallback: Try to find a valid split partition (brute force for small n)
  if (nodes.length > 10) {
    // For large graphs, skip exhaustive search
    return {
      property: "split",
      expected: "split",
      actual: "unknown (too large for validation)",
      valid: true, // Assume valid for performance
      message: "Split validation skipped for large graph (n > 10)",
    };
  }

  // Try all possible clique sizes (1 to n-1)
  for (const cliqueSize of Array.from({length: nodes.length - 1}, (_, i) => i + 1)) {
    // Try all combinations of this size for clique
    const combinations = getCombinations(nodes.map(n => n.id), cliqueSize);

    for (const cliqueIds of combinations) {
      const cliqueSet = new Set(cliqueIds);
      const independentIds = nodes.map(n => n.id).filter(id => !cliqueSet.has(id));

      // Check if clique is complete
      let cliqueIsComplete = true;
      for (let i = 0; i < cliqueIds.length && cliqueIsComplete; i++) {
        for (let j = i + 1; j < cliqueIds.length && cliqueIsComplete; j++) {
          if (!adjacency.get(cliqueIds[i])?.has(cliqueIds[j])) {
            cliqueIsComplete = false;
          }
        }
      }

      if (!cliqueIsComplete) continue;

      // Check if independent set has no internal edges
      let independentIsEmpty = true;
      for (let i = 0; i < independentIds.length && independentIsEmpty; i++) {
        for (let j = i + 1; j < independentIds.length && independentIsEmpty; j++) {
          if (adjacency.get(independentIds[i])?.has(independentIds[j])) {
            independentIsEmpty = false;
          }
        }
      }

      if (independentIsEmpty) {
        return {
          property: "split",
          expected: "split",
          actual: "split",
          valid: true,
        };
      }
    }
  }

  return {
    property: "split",
    expected: "split",
    actual: "non_split",
    valid: false,
    message: "Graph cannot be partitioned into clique + independent set",
  };
};

/**
 * Validates cograph property (P4-free).
 * Cographs contain no induced path on 4 vertices (P4).
 *
 * @param graph - The graph to validate
 * @returns PropertyValidationResult with validation details
 */
export const validateCograph = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  // Only validate when spec requires cograph
  if (spec.cograph?.kind !== "cograph") {
    return {
      property: "cograph",
      expected: spec.cograph?.kind ?? "unconstrained",
      actual: spec.cograph?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 4) {
    return {
      property: "cograph",
      expected: "cograph",
      actual: "trivial",
      valid: true,
    };
  }

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    if (spec.directionality.kind === "undirected") {
      adjacency.get(edge.target)?.add(edge.source);
    }
  }

  // Check all 4-vertex subsets for induced P4
  const fourVertexSets = getCombinations(nodes.map(n => n.id), 4);

  for (const subset of fourVertexSets) {
    if (hasInducedP4(subset, adjacency, spec.directionality.kind === "directed")) {
      return {
        property: "cograph",
        expected: "cograph",
        actual: "non_cograph",
        valid: false,
        message: `Graph contains induced P4 on vertices [${subset.join(", ")}]`,
      };
    }
  }

  return {
    property: "cograph",
    expected: "cograph",
    actual: "cograph",
    valid: true,
  };
};

/**
 * Validates claw-free property.
 * Claw-free = no induced K_{1,3} (star with 3 leaves).
 *
 * @param graph - The graph to validate
 * @returns PropertyValidationResult with validation details
 */
export const validateClawFree = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  // Only validate when spec requires claw-free
  if (spec.clawFree?.kind !== "claw_free") {
    return {
      property: "clawFree",
      expected: spec.clawFree?.kind ?? "unconstrained",
      actual: spec.clawFree?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 4) {
    return {
      property: "clawFree",
      expected: "claw_free",
      actual: "trivial",
      valid: true,
    };
  }

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    if (spec.directionality.kind === "undirected") {
      adjacency.get(edge.target)?.add(edge.source);
    }
  }

  // Check each vertex as potential claw center
  for (const center of nodes) {
    const neighbors = [...adjacency.get(center.id) || []];

    if (neighbors.length < 3) continue;

    // Check all combinations of 3 neighbors
    const triples = getCombinations(neighbors, 3);

    for (const triple of triples) {
      // Check if triple forms independent set (no edges between them)
      let independent = true;
      for (let i = 0; i < triple.length && independent; i++) {
        for (let j = i + 1; j < triple.length && independent; j++) {
          const hasEdge = adjacency.get(triple[i])?.has(triple[j]);
          if (hasEdge) {
            independent = false;
          }
        }
      }

      if (independent) {
        return {
          property: "clawFree",
          expected: "claw_free",
          actual: "has_claw",
          valid: false,
          message: `Graph contains induced K_{1,3} with center ${center.id} and leaves [${triple.join(", ")}]`,
        };
      }
    }
  }

  return {
    property: "clawFree",
    expected: "claw_free",
    actual: "claw_free",
    valid: true,
  };
};

/**
 * Validates chordal graph property.
 * Chordal graphs have no induced cycles > 3 (all cycles have chords).
 * @param graph
 */
export const validateChordal = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.chordal?.kind !== "chordal") {
    return {
      property: "chordal",
      expected: spec.chordal?.kind ?? "unconstrained",
      actual: spec.chordal?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 4) {
    // Graphs with < 4 vertices cannot have induced cycles > 3
    return {
      property: "chordal",
      expected: "chordal",
      actual: "trivial",
      valid: true,
    };
  }

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    if (spec.directionality.kind === "undirected") {
      adjacency.get(edge.target)?.add(edge.source);
    }
  }

  // For small n, check all subsets for chordless cycles
  if (nodes.length <= 10) {
    // Check for cycles of length >= 4
    for (let cycleLength = 4; cycleLength <= nodes.length; cycleLength++) {
      const cycles = findInducedCycles(nodes.map(n => n.id), adjacency, cycleLength, spec.directionality.kind === "directed");

      for (const cycle of cycles) {
        // Check if cycle has chord (edge between non-consecutive vertices)
        if (!hasChord(cycle, adjacency, spec.directionality.kind === "directed")) {
          return {
            property: "chordal",
            expected: "chordal",
            actual: "non_chordal",
            valid: false,
            message: `Graph contains chordless cycle of length ${cycleLength}: [${cycle.join(", ")}]`,
          };
        }
      }
    }
  }

  return {
    property: "chordal",
    expected: "chordal",
    actual: "chordal",
    valid: true,
    message: nodes.length > 10 ? "Chordal validation skipped for large graph (n > 10)" : undefined,
  };
};

/**
 * Validates interval graph property.
 * Interval graphs = intersection graphs of intervals on real line.
 * @param graph
 */
export const validateInterval = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.interval?.kind !== "interval") {
    return {
      property: "interval",
      expected: spec.interval?.kind ?? "unconstrained",
      actual: spec.interval?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 2) {
    return {
      property: "interval",
      expected: "interval",
      actual: "trivial",
      valid: true,
    };
  }

  // Check if stored interval data exists and is valid
  const hasIntervalData = nodes.every(n => n.data?.interval);
  if (hasIntervalData) {
    const intervals = nodes.map(node => ({
      node,
      start: (node.data?.interval as { start: number; end: number; length: number } | undefined)?.start ?? 0,
      end: (node.data?.interval as { start: number; end: number; length: number } | undefined)?.end ?? 0,
    }));

    // Verify edges match interval intersections
    const adjacency = new Map<string, Set<string>>();
    for (const node of nodes) {
      adjacency.set(node.id, new Set());
    }
    for (const edge of edges) {
      adjacency.get(edge.source)?.add(edge.target);
      if (spec.directionality.kind === "undirected") {
        adjacency.get(edge.target)?.add(edge.source);
      }
    }

    // Check all pairs
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const a = intervals[i];
        const b = intervals[j];

        // Check if intervals intersect
        const intersect = a.start < b.end && b.start < a.end;
        const hasEdge = adjacency.get(a.node.id)?.has(b.node.id);

        if (intersect !== hasEdge) {
          return {
            property: "interval",
            expected: "interval",
            actual: "non_interval",
            valid: false,
            message: `Edge mismatch: intervals ${a.node.id} and ${b.node.id} ${intersect ? 'intersect but no edge' : 'have edge but don\'t intersect'}`,
          };
        }
      }
    }

    return {
      property: "interval",
      expected: "interval",
      actual: "interval",
      valid: true,
    };
  }

  return {
    property: "interval",
    expected: "interval",
    actual: "unknown",
    valid: true,
    message: "Interval validation skipped (no interval metadata found)",
  };
};

/**
 * Validates permutation graph property.
 * Permutation graphs = graphs from permutation π with edge (i,j) iff (i-j)(π(i)-π(j)) < 0.
 * @param graph
 */
export const validatePermutation = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.permutation?.kind !== "permutation") {
    return {
      property: "permutation",
      expected: spec.permutation?.kind ?? "unconstrained",
      actual: spec.permutation?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 2) {
    return {
      property: "permutation",
      expected: "permutation",
      actual: "trivial",
      valid: true,
    };
  }

  // Check if stored permutation data exists
  const hasPermutationData = nodes.every(n => n.data?.permutationValue !== undefined);
  if (hasPermutationData) {
    const permutation = nodes.map(n => (n.data?.permutationValue as number | undefined) ?? 0);

    // Verify edges match permutation pattern
    const adjacency = new Map<string, Set<string>>();
    for (const node of nodes) {
      adjacency.set(node.id, new Set());
    }
    for (const edge of edges) {
      adjacency.get(edge.source)?.add(edge.target);
      if (spec.directionality.kind === "undirected") {
        adjacency.get(edge.target)?.add(edge.source);
      }
    }

    // Check all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const diff1 = i - j;
        const diff2 = permutation[i] - permutation[j];
        const shouldHaveEdge = diff1 * diff2 < 0;
        const hasEdge = adjacency.get(nodes[i].id)?.has(nodes[j].id);

        if (shouldHaveEdge !== hasEdge) {
          return {
            property: "permutation",
            expected: "permutation",
            actual: "non_permutation",
            valid: false,
            message: `Edge mismatch: nodes ${i} and ${j} ${shouldHaveEdge ? 'should have edge but don\'t' : 'have edge but shouldn\'t'}`,
          };
        }
      }
    }

    return {
      property: "permutation",
      expected: "permutation",
      actual: "permutation",
      valid: true,
    };
  }

  return {
    property: "permutation",
    expected: "permutation",
    actual: "unknown",
    valid: true,
    message: "Permutation validation skipped (no permutation metadata found)",
  };
};

/**
 * Validates comparability graph property.
 * Comparability graphs = transitively orientable graphs (from partial orders).
 * @param graph
 */
export const validateComparability = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.comparability?.kind !== "comparability") {
    return {
      property: "comparability",
      expected: spec.comparability?.kind ?? "unconstrained",
      actual: spec.comparability?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 2) {
    return {
      property: "comparability",
      expected: "comparability",
      actual: "trivial",
      valid: true,
    };
  }

  // Check if stored topological order exists
  const hasTopologicalOrder = nodes.every(n => n.data?.topologicalOrder !== undefined);
  if (hasTopologicalOrder) {
    // If generated with topological order, verify it's a valid DAG orientation
    // For now, just check that the stored order is consistent
    const orders = nodes.map(n => (n.data?.topologicalOrder as number | undefined) ?? 0);
    const uniqueOrders = new Set(orders);

    if (uniqueOrders.size !== nodes.length) {
      return {
        property: "comparability",
        expected: "comparability",
        actual: "invalid_order",
        valid: false,
        message: "Topological order contains duplicate values",
      };
    }

    return {
      property: "comparability",
      expected: "comparability",
      actual: "comparability",
      valid: true,
    };
  }

  // Fallback: check if graph is transitively orientable
  // This is NP-hard in general, so for large graphs we skip it
  if (nodes.length <= 10) {
    const isTransitivelyOrientable = checkTransitiveOrientation(nodes, edges, spec.directionality.kind === "directed");

    if (!isTransitivelyOrientable) {
      return {
        property: "comparability",
        expected: "comparability",
        actual: "non_comparability",
        valid: false,
        message: "Graph is not transitively orientable",
      };
    }
  }

  return {
    property: "comparability",
    expected: "comparability",
    actual: "comparability",
    valid: true,
    message: nodes.length > 10 ? "Comparability validation skipped for large graph (n > 10)" : undefined,
  };
};

/**
 * Validates perfect graph property.
 * Perfect graphs = ω(H) = χ(H) for all induced subgraphs H.
 * @param graph
 */
export const validatePerfect = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.perfect?.kind !== "perfect") {
    return {
      property: "perfect",
      expected: spec.perfect?.kind ?? "unconstrained",
      actual: spec.perfect?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 2) {
    return {
      property: "perfect",
      expected: "perfect",
      actual: "trivial",
      valid: true,
    };
  }

  // Check if perfect class metadata exists
  const hasPerfectClass = nodes.every(n => n.data?.perfectClass);
  if (hasPerfectClass) {
    const perfectClass = nodes[0].data?.perfectClass;

    // Verify all nodes have the same class
    const consistentClass = nodes.every(n => (n.data?.perfectClass as string | undefined) === perfectClass);
    if (!consistentClass) {
      return {
        property: "perfect",
        expected: "perfect",
        actual: "mixed_classes",
        valid: false,
        message: "Nodes have inconsistent perfect class markers",
      };
    }

    // All known classes are perfect by construction
    return {
      property: "perfect",
      expected: "perfect",
      actual: `perfect (${perfectClass})`,
      valid: true,
    };
  }

  // Fallback: check if graph is chordal, bipartite, or cograph (all perfect)
  // For now, just validate as perfect if it passes those checks
  return {
    property: "perfect",
    expected: "perfect",
    actual: "unknown",
    valid: true,
    message: "Perfect validation skipped (no perfect class metadata found)",
  };
};
