/**
 * Core graph structure generators
 *
 * These functions generate canonical graph structures like trees, stars, wheels,
 * grids, toroidal grids, binary trees, tournaments, and regular graphs.
 */

import type { GraphSpec } from '../spec';

// Local type definitions to avoid circular dependencies
interface TestNode {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
  partition?: 'left' | 'right';
}

interface TestEdge {
  source: string;
  target: string;
  weight?: number;
  type?: string;
}

interface SeededRandom {
  next(): number;
  integer(min: number, max: number): number;
  choice<T>(array: T[]): T;
}

/**
 * Helper function to add an edge to the edge list.
 * Handles heterogeneous graph edge type assignment.
 * @param edges - Edge list to modify
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
 * Generate tree graph (acyclic connected graph).
 * Trees have exactly n-1 edges and no cycles.
 * @param nodes - Node list
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
export const generateTreeEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length === 0) return;

  // Build tree by randomly connecting each node to a previous node
  for (let i = 1; i < nodes.length; i++) {
    const target = nodes[i].id;
    const parentIndex = rng.integer(0, i - 1);
    const source = nodes[parentIndex].id;

    addEdge(edges, source, target, spec, rng);
  }
};

/**
 * Generate star graph (center node connected to all other nodes).
 * Star graphs are trees with one central node and n-1 leaves.
 * @param nodes - Node list
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
export const generateStarEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length === 0) return;

  // First node is the center
  const center = nodes[0].id;

  // Connect all other nodes (leaves) to the center
  for (let i = 1; i < nodes.length; i++) {
    const leaf = nodes[i].id;
    addEdge(edges, center, leaf, spec, rng);
  }
};

/**
 * Generate wheel graph (cycle + hub).
 * Wheel graphs have a central hub connected to all nodes in a cycle.
 * The hub is the first node, and the remaining nodes form the cycle.
 * @param nodes - Node list
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused for deterministic structure)
 */
export const generateWheelEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
  if (nodes.length < 4) {
    // Wheel graphs need at least 4 nodes (1 hub + 3-cycle minimum)
    // For smaller graphs, fall back to star or complete graph
    if (nodes.length === 1) return;
    if (nodes.length === 2) {
      addEdge(edges, nodes[0].id, nodes[1].id, spec, _rng);
      return;
    }
    if (nodes.length === 3) {
      // Create a triangle (K3) - complete graph
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          addEdge(edges, nodes[i].id, nodes[j].id, spec, _rng);
        }
      }
      return;
    }
  }

  // First node is the hub
  const hub = nodes[0].id;

  // Remaining nodes form the cycle
  const cycleNodes = nodes.slice(1);

  // Create edges in the cycle
  for (let i = 0; i < cycleNodes.length; i++) {
    const current = cycleNodes[i].id;
    const next = cycleNodes[(i + 1) % cycleNodes.length].id;
    addEdge(edges, current, next, spec, _rng);
  }

  // Connect hub to all cycle nodes
  for (const node of cycleNodes) {
    addEdge(edges, hub, node.id, spec, _rng);
  }
};

/**
 * Generate grid graph (2D lattice).
 * Grid graphs are arranged in rows × cols grid with 4-connectivity.
 * @param nodes - Node list
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused for deterministic structure)
 */
export const generateGridEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
  if (nodes.length === 0) return;
  if (!spec.grid || spec.grid.kind !== "grid") return;

  const { rows, cols } = spec.grid;
  const gridSize = rows * cols;

  // Use only as many nodes as needed for the grid
  const gridNodes = nodes.slice(0, Math.min(gridSize, nodes.length));

  // Create edges for grid connectivity (4-connected)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const nodeIndex = row * cols + col;
      if (nodeIndex >= gridNodes.length) break;

      const currentNode = gridNodes[nodeIndex].id;

      // Connect to right neighbor
      if (col < cols - 1) {
        const rightIndex = row * cols + (col + 1);
        if (rightIndex < gridNodes.length) {
          addEdge(edges, currentNode, gridNodes[rightIndex].id, spec, _rng);
        }
      }

      // Connect to bottom neighbor
      if (row < rows - 1) {
        const bottomIndex = (row + 1) * cols + col;
        if (bottomIndex < gridNodes.length) {
          addEdge(edges, currentNode, gridNodes[bottomIndex].id, spec, _rng);
        }
      }
    }
  }
};

/**
 * Generate toroidal graph (grid with wraparound).
 * Toroidal graphs are grids where edges wrap around both horizontally and vertically.
 * @param nodes - Node list
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param _rng - Seeded random number generator (unused for deterministic structure)
 */
export const generateToroidalEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, _rng: SeededRandom): void => {
  if (nodes.length === 0) return;
  if (!spec.toroidal || spec.toroidal.kind !== "toroidal") return;

  const { rows, cols } = spec.toroidal;
  const gridSize = rows * cols;

  // Use only as many nodes as needed for the grid
  const gridNodes = nodes.slice(0, Math.min(gridSize, nodes.length));

  // Create edges for toroidal grid connectivity (wraparound in both directions)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const nodeIndex = row * cols + col;
      if (nodeIndex >= gridNodes.length) break;

      const currentNode = gridNodes[nodeIndex].id;

      // Connect to right neighbor (with wraparound)
      const rightCol = (col + 1) % cols;
      const rightIndex = row * cols + rightCol;
      if (rightIndex < gridNodes.length) {
        addEdge(edges, currentNode, gridNodes[rightIndex].id, spec, _rng);
      }

      // Connect to bottom neighbor (with wraparound)
      const bottomRow = (row + 1) % rows;
      const bottomIndex = bottomRow * cols + col;
      if (bottomIndex < gridNodes.length) {
        addEdge(edges, currentNode, gridNodes[bottomIndex].id, spec, _rng);
      }
    }
  }
};

/**
 * Generate binary tree (each node has ≤ 2 children).
 * Supports three variants:
 * - binary_tree: each node has 0, 1, or 2 children
 * - full_binary: each node has 0 or 2 children (no nodes with 1 child)
 * - complete_binary: all levels filled except possibly last, filled left-to-right
 * @param nodes - Node list
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
export const generateBinaryTreeEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length === 0) return;

  const kind = spec.binaryTree?.kind;

  if (kind === "complete_binary") {
    // Complete binary tree: all levels filled except possibly last, left-to-right
    for (let i = 0; i < nodes.length; i++) {
      const leftChildIndex = 2 * i + 1;
      const rightChildIndex = 2 * i + 2;

      if (leftChildIndex < nodes.length) {
        addEdge(edges, nodes[i].id, nodes[leftChildIndex].id, spec, rng);
      }
      if (rightChildIndex < nodes.length) {
        addEdge(edges, nodes[i].id, nodes[rightChildIndex].id, spec, rng);
      }
    }
  } else if (kind === "full_binary") {
    // Full binary tree: each node has 0 or 2 children
    // Build level by level, ensuring we add children in pairs
    const parentQueue: number[] = [0]; // Start with root at index 0
    let nextChild = 1;

    while (parentQueue.length > 0 && nextChild < nodes.length) {
      const parentIndex = parentQueue.shift();
      if (parentIndex === undefined) break;

      const needsChildren = rng.next() > 0.5; // Randomly decide if this parent gets children

      if (needsChildren && nextChild + 1 < nodes.length) {
        // Add both children
        const leftChildIndex = nextChild++;
        const rightChildIndex = nextChild++;

        addEdge(edges, nodes[parentIndex].id, nodes[leftChildIndex].id, spec, rng);
        addEdge(edges, nodes[parentIndex].id, nodes[rightChildIndex].id, spec, rng);

        // Add children to queue for potential grandchildren
        parentQueue.push(leftChildIndex);
        parentQueue.push(rightChildIndex);
      }
      // If no children needed or not enough nodes, this parent becomes a leaf
    }
  } else {
    // Regular binary tree: each node has 0, 1, or 2 children
    // Must ensure all nodes are connected (exactly n-1 edges)
    const parentQueue: number[] = [0]; // Start with root at index 0
    let nextChild = 1;

    while (parentQueue.length > 0 && nextChild < nodes.length) {
      const parentIndex = parentQueue.shift();
      if (parentIndex === undefined) break;

      // Determine how many children to add (1-2, or 0 if we have enough parents in queue)
      // We must add at least 1 child if queue would become empty and there are still nodes to connect
      const maxPossibleChildren = Math.min(2, nodes.length - nextChild);
      const minChildren = (parentQueue.length === 0 && nextChild < nodes.length) ? 1 : 0;

      if (maxPossibleChildren > 0) {
        const childCount = rng.integer(minChildren, maxPossibleChildren);

        for (let c = 0; c < childCount && nextChild < nodes.length; c++) {
          const childIndex = nextChild++;
          addEdge(edges, nodes[parentIndex].id, nodes[childIndex].id, spec, rng);
          parentQueue.push(childIndex);
        }
      }
    }
  }
};

/**
 * Generate tournament graph (complete oriented graph).
 * Tournament graphs have exactly one directed edge between each pair of vertices.
 * For every pair (u, v), exactly one of u→v or v→u exists, never both.
 * @param nodes - Node list
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param rng - Seeded random number generator
 */
export const generateTournamentEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length < 2) return;

  // Generate one directed edge for each unordered pair of vertices
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeId1 = nodes[i].id;
      const nodeId2 = nodes[j].id;

      // Randomly decide direction: either i→j or j→i
      if (rng.next() > 0.5) {
        addEdge(edges, nodeId1, nodeId2, spec, rng);
      } else {
        addEdge(edges, nodeId2, nodeId1, spec, rng);
      }
    }
  }
};

/**
 * Generate k-regular graph (all vertices have degree k).
 * Uses the configuration model: create k stubs per vertex, then randomly pair them.
 * @param nodes - Node list
 * @param edges - Edge list to populate
 * @param spec - Graph specification
 * @param k - Degree of each vertex
 * @param rng - Seeded random number generator
 */
export const generateRegularEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, k: number, rng: SeededRandom): void => {
  const n = nodes.length;

  // Validation: k-regular graph requires n > k and n*k to be even
  if (k >= n) {
    throw new Error(`k-regular graph requires k < n (got k=${k}, n=${n})`);
  }
  if ((n * k) % 2 !== 0) {
    throw new Error(`k-regular graph requires n*k to be even (got n=${n}, k=${k}, n*k=${n*k})`);
  }

  // Use configuration model with retry logic
  // Keep trying until we successfully create all n*k/2 edges
  const maxAttempts = 1000;
  let attempt = 0;

  while (attempt < maxAttempts && edges.length < (n * k) / 2) {
    attempt++;

    // Clear previous failed attempt
    if (attempt > 1) {
      edges.length = 0;
    }

    // Create stubs (half-edges): each vertex has k stubs
    const stubs: string[] = [];
    for (const node of nodes) {
      for (let i = 0; i < k; i++) {
        stubs.push(node.id);
      }
    }

    // Shuffle stubs randomly
    for (let i = stubs.length - 1; i > 0; i--) {
      const j = rng.integer(0, i);
      [stubs[i], stubs[j]] = [stubs[j], stubs[i]];
    }

    // Track existing edges to avoid duplicates in simple graphs
    const existingEdges = new Set<string>();

    // Pair up stubs to create edges
    let success = true;
    for (let i = 0; i < stubs.length; i += 2) {
      const source = stubs[i];
      const target = stubs[i + 1];

      // Skip self-loops (unless allowed) - fail this attempt
      if (source === target && spec.selfLoops.kind === "disallowed") {
        success = false;
        break;
      }

      // For simple graphs, check for duplicate edges - fail this attempt
      const edgeKey = spec.directionality.kind === 'directed'
        ? `${source}→${target}`
        : [source, target].sort().join('-');

      if (spec.edgeMultiplicity.kind === 'simple' && existingEdges.has(edgeKey)) {
        success = false;
        break;
      }

      addEdge(edges, source, target, spec, rng);

      if (spec.edgeMultiplicity.kind === 'simple') {
        existingEdges.add(edgeKey);
      }
    }

    // If we successfully created all edges, we're done
    if (success && edges.length === (n * k) / 2) {
      break;
    }
  }

  // If we failed after max attempts, throw an error
  if (edges.length < (n * k) / 2) {
    throw new Error(`Failed to generate ${k}-regular graph after ${maxAttempts} attempts (got ${edges.length} edges, expected ${(n * k) / 2})`);
  }
};
