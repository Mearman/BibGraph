import type { TestNode, TestEdge } from './types';
import type { GraphSpec } from '../spec';

// Local type definition to avoid circular dependencies with generator.ts
interface SeededRandom {
  next(): number;
  integer(min: number, max: number): number;
  choice<T>(array: T[]): T;
}

// ============================================================================
// Helper Functions (imported from generator.ts)
// ============================================================================

/**
 * Add edge to edge list with optional schema-specific attributes.
 * @param edges - Edge list to populate
 * @param source - Source node ID
 * @param target - Target node ID
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
const addEdge = (edges: TestEdge[], source: string, target: string, spec: GraphSpec, rng: SeededRandom): void => {
  const edge: TestEdge = { source, target };

  if (spec.schema.kind === 'heterogeneous') {
    // Assign random edge type (could be based on config.edgeTypes)
    edge.type = rng.choice(['type_a', 'type_b', 'type_c']);
  }

  edges.push(edge);
};

/**
 * Shuffle array in-place using Fisher-Yates algorithm with seeded RNG.
 * @param array - Array to shuffle
 * @param rng - Seeded random number generator
 */
const shuffleArray = <T>(array: T[], rng: SeededRandom): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = rng.integer(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
};

/**
 * Get bipartite partitions from nodes.
 * @param nodes - Graph nodes
 * @returns Left and right partitions
 */
const getBipartitePartitions = (nodes: TestNode[]): { left: TestNode[]; right: TestNode[] } => {
  const left = nodes.filter((node): node is TestNode & { partition: 'left' } => node.partition === "left");
  const right = nodes.filter((node): node is TestNode & { partition: 'right' } => node.partition === "right");
  return { left, right };
};

/**
 * Generate complete bipartite K_{m,n} graph.
 * @param nodes - Graph nodes
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
const generateCompleteBipartiteEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  const { left, right } = getBipartitePartitions(nodes);

  // Add all possible edges between left and right partitions
  for (const leftNode of left) {
    for (const rightNode of right) {
      // Both directed and undirected bipartite graphs use the same edge structure
      addEdge(edges, leftNode.id, rightNode.id, spec, rng);
    }
  }
};

// ============================================================================
// Structural Class Generator Functions
// ============================================================================

/**
 * Generate split graph edges.
 * Split graph = vertices partition into clique K + independent set I.
 * Algorithm: Partition nodes ~1/3 clique + ~2/3 independent, add all clique edges,
 * add random cross edges with ~50% density.
 *
 * @param nodes - Graph nodes
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
export const generateSplitEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length < 2) return;

  // Partition: ~1/3 clique, ~2/3 independent set
  const cliqueSize = Math.max(1, Math.floor(nodes.length / 3));
  const clique = nodes.slice(0, cliqueSize);
  const independent = nodes.slice(cliqueSize);

  // Add all edges within clique (complete subgraph)
  for (let i = 0; i < clique.length; i++) {
    for (let j = i + 1; j < clique.length; j++) {
      addEdge(edges, clique[i].id, clique[j].id, spec, rng);
    }
  }

  // Add random edges between clique and independent set (~50% density)
  for (const cliqueNode of clique) {
    for (const indepNode of independent) {
      if (rng.next() < 0.5) {
        addEdge(edges, cliqueNode.id, indepNode.id, spec, rng);
      }
    }
  }

  // Store partition metadata for validation
  for (const node of clique) {
    node.data = node.data || {};
    node.data.splitPartition = 'clique';
  }
  for (const node of independent) {
    node.data = node.data || {};
    node.data.splitPartition = 'independent';
  }
};

/**
 * Generate cograph edges (P4-free graphs).
 * Cographs can be constructed from single vertices by disjoint union and complement operations.
 * Algorithm: Build cotree via union/complement operations, convert to graph.
 *
 * @param nodes - Graph nodes
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
export const generateCographEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length < 2) return;

  // Build cotree: start with single vertices, iteratively combine via union/complement
  // For simplicity, use recursive construction: randomly choose union or complement
  const buildCograph = (nodeList: TestNode[], useUnion: boolean): void => {
    if (nodeList.length <= 1) return;

    if (useUnion) {
      // Union: no edges between components, recursively build each
      const mid = Math.floor(nodeList.length / 2);
      const left = nodeList.slice(0, mid);
      const right = nodeList.slice(mid);

      // Recursively build each component as complete graph
      buildComplete(left);
      buildComplete(right);
      // No edges between left and right (union operation)
    } else {
      // Complement: all edges between components, recursively build each
      const mid = Math.floor(nodeList.length / 2);
      const left = nodeList.slice(0, mid);
      const right = nodeList.slice(mid);

      // Recursively build each component as independent
      buildIndependent(left);
      buildIndependent(right);
      // Add all edges between left and right (complement of union)
      for (const l of left) {
        for (const r of right) {
          addEdge(edges, l.id, r.id, spec, rng);
        }
      }
    }
  };

  const buildComplete = (nodeList: TestNode[]): void => {
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        addEdge(edges, nodeList[i].id, nodeList[j].id, spec, rng);
      }
    }
  };

  const buildIndependent = (_nodeList: TestNode[]): void => {
    // Independent set: no edges
  };

  // Randomly choose union or complement construction
  const useUnion = rng.next() < 0.5;
  buildCograph(nodes, useUnion);
};

/**
 * Generate claw-free graph edges.
 * Claw-free = no induced K_{1,3} (star with 3 leaves).
 * Algorithm: Use complete graph (K_n) which is always claw-free.
 *
 * @param nodes - Graph nodes
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
export const generateClawFreeEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length < 2) return;

  // Complete graph K_n is always claw-free (every node connected to every other)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
    }
  }
};

/**
 * Generate chordal graph edges.
 * Chordal graphs have no induced cycles > 3 (all cycles have chords).
 * Algorithm: Use k-tree construction (simplified treewidth).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateChordalEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length < 3) {
    // Complete graph for small n
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
      }
    }
    return;
  }

  // k-tree construction: start with (k+1)-clique, iteratively add vertices
  // connected to all vertices in a k-clique
  const k = Math.min(Math.floor(rng.next() * 3) + 1, nodes.length - 1);

  // Create initial (k+1)-clique
  const initialClique = nodes.slice(0, k + 1);
  for (let i = 0; i < initialClique.length; i++) {
    for (let j = i + 1; j < initialClique.length; j++) {
      addEdge(edges, initialClique[i].id, initialClique[j].id, spec, rng);
    }
  }

  // Add remaining vertices, each connecting to a k-clique
  for (let i = k + 1; i < nodes.length; i++) {
    // Select k random nodes from existing to form k-clique
    const existingNodes = nodes.slice(0, i);
    const cliqueSize = Math.min(k, existingNodes.length);

    // Simple approach: connect to first k nodes (forms valid k-tree)
    for (let j = 0; j < cliqueSize; j++) {
      addEdge(edges, nodes[i].id, existingNodes[j].id, spec, rng);
    }
  }
};

/**
 * Generate interval graph edges.
 * Interval graphs = intersection graphs of intervals on real line.
 * Algorithm: Generate random intervals, connect if they intersect.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateIntervalEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length < 2) return;

  // Generate random intervals: [start, start + length]
  const intervals = nodes.map(node => {
    const start = rng.next() * 100;
    const length = 1 + rng.next() * 20;
    const end = start + length;

    // Store interval metadata in node data
    node.data = node.data || {};
    node.data.interval = { start, end, length };

    return { node, start, end };
  });

  // Create intersection graph: edge if intervals intersect
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i];
      const b = intervals[j];

      // Intervals intersect if: a.start < b.end && b.start < a.end
      if (a.start < b.end && b.start < a.end) {
        addEdge(edges, a.node.id, b.node.id, spec, rng);
      }
    }
  }
};

/**
 * Generate permutation graph edges.
 * Permutation graphs = intersection graphs of line segments between parallel lines.
 * Algorithm: Generate permutation π, create edge (i, j) iff (i - j)(π(i) - π(j)) < 0.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generatePermutationEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  const n = nodes.length;

  if (n < 2) return;

  // Generate random permutation
  const permutation = Array.from({ length: n }, (_, i) => i);
  shuffleArray(permutation, rng);

  // Store permutation value in node data for validation
  nodes.forEach((node, i) => {
    node.data = node.data || {};
    node.data.permutationValue = permutation[i];
  });

  // Create edge (i, j) iff (i - j)(π(i) - π(j)) < 0 (inversions in permutation)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff1 = i - j;
      const diff2 = permutation[i] - permutation[j];

      // Edge if signs differ (one negative, one positive)
      if (diff1 * diff2 < 0) {
        addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
      }
    }
  }
};

/**
 * Generate comparability graph edges.
 * Comparability graphs = transitively orientable graphs (from partial orders).
 * Algorithm: Generate random DAG, create undirected graph from transitive reduction.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateComparabilityEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length < 2) return;

  // Generate random topological ordering (DAG constraint)
  const ordering = Array.from({ length: nodes.length }, (_, i) => i);
  shuffleArray(ordering, rng);

  // Store order in node data for validation
  nodes.forEach((node, i) => {
    node.data = node.data || {};
    node.data.topologicalOrder = ordering[i];
  });

  // Create edges respecting topological order (only forward in ordering)
  // This creates a DAG, which is transitively orientable
  const edgeProbability = 0.3;

  for (let i = 0; i < ordering.length; i++) {
    for (let j = i + 1; j < ordering.length; j++) {
      if (rng.next() < edgeProbability) {
        const u = nodes[ordering[i]];
        const v = nodes[ordering[j]];
        addEdge(edges, u.id, v.id, spec, rng);
      }
    }
  }
};

/**
 * Generate perfect graph edges.
 * Perfect graphs = ω(H) = χ(H) for all induced subgraphs H.
 * Algorithm: Generate graphs known to be perfect (chordal, bipartite, cograph).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generatePerfectEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length < 2) return;

  // Randomly choose a perfect graph class
  const choice = rng.next();

  if (choice < 0.4) {
    // 40%: Generate chordal graph (perfect by Strong Perfect Graph Theorem)
    generateChordalEdges(nodes, edges, spec, rng);
  } else if (choice < 0.7) {
    // 30%: Generate bipartite graph (perfect)
    generateCompleteBipartiteEdges(nodes, edges, spec, rng);
  } else {
    // 30%: Generate cograph (perfect)
    generateCographEdges(nodes, edges, spec, rng);
  }

  // Mark as perfect for validator
  nodes.forEach(node => {
    node.data = node.data || {};
    node.data.perfectClass = choice < 0.4 ? 'chordal' : choice < 0.7 ? 'bipartite' : 'cograph';
  });
};
