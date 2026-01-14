import type { GraphSpec } from './graph-spec';

/**
 * Node in a generated test graph.
 */
export interface TestNode {
  id: string;
  type?: string; // For heterogeneous graphs
  data?: Record<string, unknown>;
}

/**
 * Edge in a generated test graph.
 */
export interface TestEdge {
  source: string;
  target: string;
  weight?: number; // For weighted graphs
  type?: string; // For heterogeneous graphs
}

/**
 * Complete graph structure for testing.
 */
export interface TestGraph {
  nodes: TestNode[];
  edges: TestEdge[];
  spec: GraphSpec;
}

/**
 * Configuration for graph generation.
 */
export interface GraphGenerationConfig {
  /** Number of nodes to generate */
  nodeCount: number;

  /** Node type distribution (for heterogeneous graphs) */
  nodeTypes?: { type: string; proportion: number }[];

  /** Edge type distribution (for heterogeneous graphs) */
  edgeTypes?: { type: string; proportion: number }[];

  /** Weight range for weighted graphs */
  weightRange?: { min: number; max: number };

  /** Random seed for reproducibility */
  seed?: number;
}

/**
 * Simple seeded random number generator for reproducible tests.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  integer(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.integer(0, array.length - 1)];
  }

  sample<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => this.next() - 0.5);
    return shuffled.slice(0, count);
  }
}

/**
 * Generate a test graph matching specified properties.
 */
export function generateGraph(
  spec: GraphSpec,
  config: GraphGenerationConfig
): TestGraph {
  const rng = new SeededRandom(config.seed);
  const nodes = generateNodes(spec, config, rng);

  // Generate base structure
  const edges = generateBaseStructure(nodes, spec, config, rng);

  // Add additional edges for density
  addDensityEdges(nodes, edges, spec, config, rng);

  // Add weights if needed
  if (spec.weighting.kind === "weighted_numeric") {
    addWeights(edges, config, rng);
  }

  return { nodes, edges, spec };
}

/**
 * Generate nodes with appropriate types and partitions.
 */
function generateNodes(
  spec: GraphSpec,
  config: GraphGenerationConfig,
  rng: SeededRandom
): TestNode[] {
  const nodes: TestNode[] = [];

  // For bipartite graphs, determine partition sizes
  let leftPartitionSize = 0;
  let rightPartitionSize = 0;

  if (spec.partiteness?.kind === "bipartite") {
    // Split roughly 50-50, but handle odd numbers
    leftPartitionSize = Math.floor(config.nodeCount / 2);
    rightPartitionSize = config.nodeCount - leftPartitionSize;
  } else if (spec.completeBipartite?.kind === "complete_bipartite") {
    // Use specified m, n sizes
    const { m, n } = spec.completeBipartite;
    leftPartitionSize = Math.min(m, config.nodeCount);
    rightPartitionSize = Math.min(n, config.nodeCount - leftPartitionSize);
  }

  for (let i = 0; i < config.nodeCount; i++) {
    const node: TestNode = {
      id: `N${i}`,
    };

    // Assign bipartite partition if needed
    if (spec.partiteness?.kind === "bipartite" || spec.completeBipartite?.kind === "complete_bipartite") {
      if (i < leftPartitionSize) {
        (node as any).partition = "left";
      } else if (i < leftPartitionSize + rightPartitionSize) {
        (node as any).partition = "right";
      }
    }

    if (spec.schema.kind === "heterogeneous" && config.nodeTypes) {
      // Assign type based on proportions
      const rand = rng.next();
      let cumulative = 0;
      for (const { type, proportion } of config.nodeTypes) {
        cumulative += proportion;
        if (rand < cumulative) {
          node.type = type;
          break;
        }
      }
      if (!node.type) {
        node.type = config.nodeTypes[config.nodeTypes.length - 1].type;
      }
    }

    nodes.push(node);
  }

  return nodes;
}

/**
 * Generate base graph structure based on connectivity and cyclicity.
 */
function generateBaseStructure(
  nodes: TestNode[],
  spec: GraphSpec,
  _config: GraphGenerationConfig,
  rng: SeededRandom
): TestEdge[] {
  const edges: TestEdge[] = [];

  // Handle complete bipartite K_{m,n} first
  if (spec.completeBipartite?.kind === "complete_bipartite") {
    generateCompleteBipartiteEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle bipartite graphs
  if (spec.partiteness?.kind === "bipartite") {
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      // Bipartite tree
      generateBipartiteTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      // Bipartite connected with cycles (even-length cycles)
      generateBipartiteConnectedEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      // Bipartite forest
      generateBipartiteForestEdges(nodes, edges, spec, rng);
    } else {
      // Bipartite disconnected with cycles
      generateBipartiteDisconnectedEdges(nodes, edges, spec, rng);
    }
    return edges;
  }

  // Handle star graphs (specific tree structure: center + leaves)
  if (spec.star?.kind === "star") {
    generateStarEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle wheel graphs (cycle + hub)
  if (spec.wheel?.kind === "wheel") {
    generateWheelEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle grid graphs (2D lattice)
  if (spec.grid?.kind === "grid") {
    generateGridEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle toroidal graphs (grid with wraparound)
  if (spec.toroidal?.kind === "toroidal") {
    generateToroidalEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle binary trees (each node has ≤ 2 children)
  if (spec.binaryTree?.kind === "binary_tree" ||
      spec.binaryTree?.kind === "full_binary" ||
      spec.binaryTree?.kind === "complete_binary") {
    generateBinaryTreeEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle tournament graphs (complete oriented graphs)
  if (spec.tournament?.kind === "tournament") {
    generateTournamentEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle cubic graphs (3-regular)
  if (spec.cubic?.kind === "cubic") {
    generateRegularEdges(nodes, edges, spec, 3, rng);
    return edges;
  }

  // Handle k-regular graphs
  if (spec.specificRegular?.kind === "k_regular") {
    generateRegularEdges(nodes, edges, spec, spec.specificRegular.k, rng);
    return edges;
  }

  // Handle Eulerian and semi-Eulerian graphs
  if (spec.eulerian?.kind === "eulerian" || spec.eulerian?.kind === "semi_eulerian") {
    generateEulerianEdges(nodes, edges, spec, rng);
    return edges;
  }

  // Handle k-vertex-connected graphs
  if (spec.kVertexConnected?.kind === "k_vertex_connected") {
    generateKVertexConnectedEdges(nodes, edges, spec, spec.kVertexConnected.k, rng);
    return edges;
  }

  // Handle k-edge-connected graphs
  if (spec.kEdgeConnected?.kind === "k_edge_connected") {
    generateKEdgeConnectedEdges(nodes, edges, spec, spec.kEdgeConnected.k, rng);
    return edges;
  }

  // Handle treewidth-bounded graphs (k-trees)
  if (spec.treewidth?.kind === "treewidth") {
    generateTreewidthBoundedEdges(nodes, edges, spec, spec.treewidth.width, rng);
    return edges;
  }

  // Handle k-colorable graphs
  if (spec.kColorable?.kind === "k_colorable") {
    generateKColorableEdges(nodes, edges, spec, spec.kColorable.k, rng);
    return edges;
  }

  // Handle bipartite colorable (2-colorable) graphs
  if (spec.kColorable?.kind === "bipartite_colorable") {
    // 2-colorable is the same as bipartite
    // NOTE: spec.partiteness should be set before calling this function
    // when using bipartite_colorable. This is handled at the call site.
    // Continue with bipartite generation
    if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
      generateBipartiteTreeEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
      generateBipartiteConnectedEdges(nodes, edges, spec, rng);
    } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
      generateBipartiteForestEdges(nodes, edges, spec, rng);
    } else {
      generateBipartiteDisconnectedEdges(nodes, edges, spec, rng);
    }
    return edges;
  }

  // Non-bipartite graphs
  if (spec.connectivity.kind === 'connected' && spec.cycles.kind === 'acyclic') {
    // Generate tree structure
    generateTreeEdges(nodes, edges, spec, rng);
  } else if (spec.connectivity.kind === 'connected' && spec.cycles.kind === "cycles_allowed") {
    // Generate cycle or connected graph with cycles
    generateConnectedCyclicEdges(nodes, edges, spec, rng);
  } else if (spec.connectivity.kind === "unconstrained" && spec.cycles.kind === 'acyclic') {
    // Generate forest (multiple disconnected trees)
    generateForestEdges(nodes, edges, spec, rng);
  } else {
    // Generate disconnected graph with cycles
    generateDisconnectedEdges(nodes, edges, spec, rng);
  }

  return edges;
}

/**
 * Generate tree structure (connected, acyclic).
 */
function generateTreeEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  if (nodes.length === 0) return;

  // Build tree by randomly connecting each node to a previous node
  const connected = new Set([nodes[0].id]);

  for (let i = 1; i < nodes.length; i++) {
    const target = nodes[i].id;
    const parentIndex = rng.integer(0, i - 1);
    const source = nodes[parentIndex].id;

    addEdge(edges, source, target, spec, rng);
    connected.add(target);
  }
}

/**
 * Generate star graph (center node connected to all other nodes).
 * Star graphs are trees with one central node and n-1 leaves.
 */
function generateStarEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  if (nodes.length === 0) return;

  // First node is the center
  const center = nodes[0].id;

  // Connect all other nodes (leaves) to the center
  for (let i = 1; i < nodes.length; i++) {
    const leaf = nodes[i].id;
    addEdge(edges, center, leaf, spec, rng);
  }
}

/**
 * Generate wheel graph (cycle + hub).
 * Wheel graphs have a central hub connected to all nodes in a cycle.
 * The hub is the first node, and the remaining nodes form the cycle.
 */
function generateWheelEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void {
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
}

/**
 * Generate grid graph (2D lattice).
 * Grid graphs are arranged in rows × cols grid with 4-connectivity.
 */
function generateGridEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void {
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
}

/**
 * Generate toroidal graph (grid with wraparound).
 * Toroidal graphs are grids where edges wrap around both horizontally and vertically.
 */
function generateToroidalEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _rng: SeededRandom
): void {
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
}

/**
 * Generate binary tree (each node has ≤ 2 children).
 * Supports three variants:
 * - binary_tree: each node has 0, 1, or 2 children
 * - full_binary: each node has 0 or 2 children (no nodes with 1 child)
 * - complete_binary: all levels filled except possibly last, filled left-to-right
 */
function generateBinaryTreeEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
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
      const parentIndex = parentQueue.shift()!;
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
      const parentIndex = parentQueue.shift()!;

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
}

/**
 * Generate tournament graph (complete oriented graph).
 * Tournament graphs have exactly one directed edge between each pair of vertices.
 * For every pair (u, v), exactly one of u→v or v→u exists, never both.
 */
function generateTournamentEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  if (nodes.length < 2) return;

  // Generate one directed edge for each unordered pair of vertices
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const source = nodes[i].id;
      const target = nodes[j].id;

      // Randomly decide direction: either i→j or j→i
      if (rng.next() > 0.5) {
        addEdge(edges, source, target, spec, rng);
      } else {
        addEdge(edges, target, source, spec, rng);
      }
    }
  }
}

/**
 * Generate k-regular graph (all vertices have degree k).
 * Uses the configuration model: create k stubs per vertex, then randomly pair them.
 */
function generateRegularEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  k: number,
  rng: SeededRandom
): void {
  const n = nodes.length;

  // Validation: k-regular graph requires n > k and n*k to be even
  if (k >= n) {
    throw new Error(`k-regular graph requires k < n (got k=${k}, n=${n})`);
  }
  if ((n * k) % 2 !== 0) {
    throw new Error(`k-regular graph requires n*k to be even (got n=${n}, k=${k}, n*k=${n*k})`);
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

  // Pair up stubs to create edges
  const existingEdges = new Set<string>();
  for (let i = 0; i < stubs.length; i += 2) {
    const source = stubs[i];
    const target = stubs[i + 1];

    // Skip self-loops (unless allowed)
    if (source === target && spec.selfLoops.kind === "disallowed") {
      continue;
    }

    // For simple graphs, skip duplicate edges
    const edgeKey = spec.directionality.kind === 'directed'
      ? `${source}→${target}`
      : [source, target].sort().join('-');

    if (spec.edgeMultiplicity.kind === 'simple' && existingEdges.has(edgeKey)) {
      // Skip this edge if it's a duplicate and we want a simple graph
      continue;
    }

    addEdge(edges, source, target, spec, rng);

    if (spec.edgeMultiplicity.kind === 'simple') {
      existingEdges.add(edgeKey);
    }
  }
}

/**
 * Generate Eulerian or semi-Eulerian graph.
 * Eulerian graphs have all vertices with even degree (allow Eulerian circuit).
 * Semi-Eulerian graphs have exactly 2 vertices with odd degree (allow Eulerian trail).
 */
function generateEulerianEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  const n = nodes.length;
  if (n < 2) return;

  const isSemiEulerian = spec.eulerian?.kind === "semi_eulerian";

  // Step 1: Create a cycle through all nodes (ensures all have degree 2, which is even)
  for (let i = 0; i < n; i++) {
    const source = nodes[i].id;
    const target = nodes[(i + 1) % n].id;
    addEdge(edges, source, target, spec, rng);
  }

  // Step 2: For semi-Eulerian, remove one edge to create exactly 2 odd-degree vertices
  if (isSemiEulerian && edges.length > 0) {
    // Remove a random edge from the cycle
    const edgeToRemove = rng.choice(edges);
    const index = edges.indexOf(edgeToRemove);
    if (index > -1) {
      edges.splice(index, 1);
    }
  }

  // Step 3: Add more edges while maintaining the degree parity constraint
  // For Eulerian: keep all degrees even
  // For semi-Eulerian: keep exactly 2 vertices with odd degree
  const existingEdges = new Set(
    edges.map((e) =>
      spec.directionality.kind === 'directed'
        ? `${e.source}→${e.target}`
        : [e.source, e.target].sort().join('-')
    )
  );

  // Calculate current degrees
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }
  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    if (spec.directionality.kind === "undirected") {
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }
  }

  // Add random edges while maintaining parity constraints
  const maxAttempts = n * 2;
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;

    // Pick two random nodes
    const node1 = rng.choice(nodes).id;
    const node2 = rng.choice(nodes).id;

    if (node1 === node2) continue; // Skip self-loops

    const edgeKey = spec.directionality.kind === 'directed'
      ? `${node1}→${node2}`
      : [node1, node2].sort().join('-');

    if (spec.edgeMultiplicity.kind === 'simple' && existingEdges.has(edgeKey)) {
      continue; // Skip existing edges
    }

    // Check if adding this edge maintains parity constraints
    const degree1 = degrees.get(node1) || 0;
    const degree2 = degrees.get(node2) || 0;

    if (spec.directionality.kind === "undirected") {
      // For undirected, adding edge affects both vertices
      const oddCountBefore = Array.from(degrees.values()).filter(d => d % 2 === 1).length;
      const oddCountAfter = oddCountBefore +
        (degree1 % 2 === 0 ? 1 : -1) +  // node1 flips parity
        (degree2 % 2 === 0 ? 1 : -1);   // node2 flips parity

      if (isSemiEulerian && oddCountAfter === 2) {
        // Valid for semi-Eulerian
        addEdge(edges, node1, node2, spec, rng);
        degrees.set(node1, degree1 + 1);
        degrees.set(node2, degree2 + 1);
        existingEdges.add(edgeKey);
      } else if (!isSemiEulerian && oddCountAfter === 0) {
        // Valid for Eulerian
        addEdge(edges, node1, node2, spec, rng);
        degrees.set(node1, degree1 + 1);
        degrees.set(node2, degree2 + 1);
        existingEdges.add(edgeKey);
      }
    } else {
      // For directed, out-degree and in-degree are separate
      // Eulerian for directed requires in-degree = out-degree for all vertices
      // This is more complex, so we'll skip adding extra edges for directed graphs
      break;
    }
  }
}

/**
 * Generate k-vertex-connected graph.
 * A graph is k-vertex-connected if it has at least k+1 vertices and
 * cannot be disconnected by removing fewer than k vertices.
 *
 * Construction approach:
 * 1. Start with K_{k+1} (complete graph on k+1 vertices)
 * 2. Add remaining vertices, each connected to at least k existing vertices
 */
function generateKVertexConnectedEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  k: number,
  rng: SeededRandom
): void {
  const n = nodes.length;

  // Validation: k-vertex-connected requires at least k+1 vertices
  if (n < k + 1) {
    throw new Error(`k-vertex-connected graph requires at least ${k + 1} vertices (got n=${n}, k=${k})`);
  }

  // Step 1: Create K_{k+1} as the initial core (complete graph on first k+1 vertices)
  const coreSize = Math.min(k + 1, n);
  for (let i = 0; i < coreSize; i++) {
    for (let j = i + 1; j < coreSize; j++) {
      addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
    }
  }

  // Step 2: Add remaining vertices, each connected to at least k existing vertices
  for (let i = coreSize; i < n; i++) {
    const newNode = nodes[i].id;

    // Connect to at least k existing vertices
    // Choose k random vertices from already connected vertices (0 to i-1)
    const existingVertices = nodes.slice(0, i);
    const connectionsNeeded = Math.min(k, existingVertices.length);

    // Shuffle existing vertices and pick k to connect to
    const shuffled = [...existingVertices];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const pos = rng.integer(0, j);
      [shuffled[j], shuffled[pos]] = [shuffled[pos], shuffled[j]];
    }

    for (let j = 0; j < connectionsNeeded; j++) {
      addEdge(edges, newNode, shuffled[j].id, spec, rng);
    }
  }
}

/**
 * Generate k-edge-connected graph.
 * A graph is k-edge-connected if it has at least k+1 vertices and
 * cannot be disconnected by removing fewer than k edges.
 *
 * Construction approach:
 * 1. Create a k-regular or near-k-regular graph
 * 2. This ensures minimum degree ≥ k, which guarantees edge connectivity ≥ k
 */
function generateKEdgeConnectedEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  k: number,
  rng: SeededRandom
): void {
  const n = nodes.length;

  // Validation: k-edge-connected requires at least k+1 vertices
  if (n < k + 1) {
    throw new Error(`k-edge-connected graph requires at least ${k + 1} vertices (got n=${n}, k=${k})`);
  }

  // For directed graphs, k-edge-connectivity is more complex
  // We'll focus on undirected graphs
  if (spec.directionality.kind === 'directed') {
    // Fallback: create a strongly connected directed graph
    // Create a cycle and add random edges
    for (let i = 0; i < n; i++) {
      const source = nodes[i].id;
      const target = nodes[(i + 1) % n].id;
      addEdge(edges, source, target, spec, rng);
    }

    // Add k-1 more outgoing edges from each vertex
    for (let i = 0; i < n; i++) {
      const source = nodes[i].id;
      for (let j = 0; j < k - 1; j++) {
        const targetIndex = (i + j + 2) % n;
        const target = nodes[targetIndex].id;
        addEdge(edges, source, target, spec, rng);
      }
    }
    return;
  }

  // For undirected graphs, ensure minimum degree ≥ k
  // Start with a cycle (degree 2 for all vertices)
  for (let i = 0; i < n; i++) {
    const source = nodes[i].id;
    const target = nodes[(i + 1) % n].id;
    addEdge(edges, source, target, spec, rng);
  }

  // Track current degrees
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node.id, 2); // All nodes have degree 2 from the cycle
  }

  // Track existing edges
  const existingEdges = new Set(
    edges.map((e) => [e.source, e.target].sort().join('-'))
  );

  // Add edges until all vertices have degree at least k
  const maxAttempts = n * k * 2;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // Find a vertex with degree < k
    const lowDegreeVertices = Array.from(degrees.entries())
      .filter(([_, degree]) => degree < k)
      .map(([nodeId, _]) => nodeId);

    if (lowDegreeVertices.length === 0) {
      // All vertices have degree ≥ k
      break;
    }

    // Pick a vertex with degree < k
    const node1 = rng.choice(lowDegreeVertices);

    // Find another vertex to connect to
    const candidates = nodes.filter(n => n.id !== node1);
    if (candidates.length === 0) break;

    const node2 = rng.choice(candidates).id;

    // Check if edge already exists
    const edgeKey = [node1, node2].sort().join('-');
    if (existingEdges.has(edgeKey)) {
      continue;
    }

    // Add the edge
    addEdge(edges, node1, node2, spec, rng);
    existingEdges.add(edgeKey);
    degrees.set(node1, (degrees.get(node1) || 0) + 1);
    degrees.set(node2, (degrees.get(node2) || 0) + 1);
  }
}

/**
 * Generate treewidth-bounded graph using k-tree construction.
 * A k-tree is a chordal graph with treewidth exactly k.
 *
 * Construction algorithm:
 * 1. Start with a (k+1)-clique (complete graph on k+1 vertices)
 * 2. Repeatedly add new vertices, each connected to a k-clique of existing vertices
 *
 * This generates a chordal graph with treewidth exactly k.
 */
function generateTreewidthBoundedEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  k: number,
  rng: SeededRandom
): void {
  const n = nodes.length;

  // Validation: treewidth k requires at least k+1 vertices
  if (n < k + 1) {
    throw new Error(`Treewidth ${k} requires at least ${k + 1} vertices (got n=${n}, k=${k})`);
  }

  // For treewidth 0 (forest), generate a tree/forest
  if (k === 0) {
    if (spec.connectivity.kind === 'connected') {
      // Generate a tree (n-1 edges)
      for (let i = 1; i < n; i++) {
        const target = nodes[i].id;
        const parentIndex = rng.integer(0, i - 1);
        const source = nodes[parentIndex].id;
        addEdge(edges, source, target, spec, rng);
      }
    } else {
      // Generate a forest (disconnected trees)
      const componentCount = Math.min(3, Math.max(2, Math.floor(n / 3)));
      const componentSize = Math.floor(n / componentCount);

      for (let c = 0; c < componentCount; c++) {
        const start = c * componentSize;
        const end = c === componentCount - 1 ? n : start + componentSize;
        const componentNodes = nodes.slice(start, end);

        for (let i = 1; i < componentNodes.length; i++) {
          const target = componentNodes[i].id;
          const parentIndex = rng.integer(0, i - 1);
          const source = componentNodes[parentIndex].id;
          addEdge(edges, source, target, spec, rng);
        }
      }
    }
    return;
  }

  // Step 1: Create initial (k+1)-clique
  const cliqueSize = Math.min(k + 1, n);
  for (let i = 0; i < cliqueSize; i++) {
    for (let j = i + 1; j < cliqueSize; j++) {
      addEdge(edges, nodes[i].id, nodes[j].id, spec, rng);
    }
  }

  // Step 2: Add remaining vertices, each connected to a k-clique
  // Track maximal cliques to connect new vertices to
  // We maintain a list of potential k-cliques (sets of k vertices that form a clique)
  const cliques: string[][] = [];

  // Initialize with all k-sized subsets of the initial clique
  if (cliqueSize === k + 1) {
    // Generate all k-sized combinations of the initial (k+1)-clique
    const initialClique = nodes.slice(0, cliqueSize).map(n => n.id);

    function generateCombinations(arr: string[], k: number): string[][] {
      if (k === 0) return [[]];
      if (arr.length === 0) return [];

      const [first, ...rest] = arr;
      const combsWithFirst = generateCombinations(rest, k - 1).map(comb => [first, ...comb]);
      const combsWithoutFirst = generateCombinations(rest, k);

      return [...combsWithFirst, ...combsWithoutFirst];
    }

    cliques.push(...generateCombinations(initialClique, k));
  } else {
    // If we have fewer than k+1 vertices, just use all vertices
    cliques.push(nodes.slice(0, cliqueSize).map(n => n.id));
  }

  // Add remaining vertices
  for (let i = cliqueSize; i < n; i++) {
    const newNode = nodes[i].id;

    // Select a random k-clique to connect to
    const selectedClique = rng.choice(cliques);

    // Connect the new vertex to all vertices in the selected clique
    for (const cliqueVertex of selectedClique) {
      addEdge(edges, newNode, cliqueVertex, spec, rng);
    }

    // Update cliques: new k-cliques are formed by replacing one vertex from selected clique with new vertex
    // Each new k-clique consists of the new vertex plus (k-1) vertices from the selected clique
    for (let j = 0; j < selectedClique.length; j++) {
      const newClique = [
        newNode,
        ...selectedClique.slice(0, j),
        ...selectedClique.slice(j + 1)
      ];
      cliques.push(newClique);
    }
  }
}

/**
 * Generate k-colorable graph.
 * A k-colorable graph is a graph whose vertices can be colored with k colors
 * such that no two adjacent vertices share the same color.
 *
 * Construction approach: Create a k-partite graph
 * 1. Partition vertices into k color classes
 * 2. Add edges only between vertices of different colors
 */
function generateKColorableEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  k: number,
  rng: SeededRandom
): void {
  const n = nodes.length;

  // Validation: k must be at least 1
  if (k < 1) {
    throw new Error(`k-colorable graphs require k >= 1 (got k=${k})`);
  }

  // For k=1, the graph must have no edges (independent set)
  if (k === 1) {
    return; // No edges allowed
  }

  // Assign each vertex a color from {0, 1, ..., k-1}
  const colors: Map<string, number> = new Map();
  const partitions: string[][] = Array.from({ length: k }, () => []);

  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    const color = rng.integer(0, k - 1);
    colors.set(node.id, color);
    partitions[color].push(node.id);
  }

  // Add edges between vertices of different colors
  // This ensures the graph is k-partite (and therefore k-colorable)
  for (let c1 = 0; c1 < k; c1++) {
    for (let c2 = c1 + 1; c2 < k; c2++) {
      // For each pair of color classes, add edges based on density
      const partition1 = partitions[c1];
      const partition2 = partitions[c2];

      // Calculate how many edges to add between these partitions
      // For dense graphs, add all possible edges (complete k-partite)
      // For sparse/moderate, add a subset
      const maxEdgesBetween = partition1.length * partition2.length;

      if (maxEdgesBetween === 0) continue;

      // Determine edge density based on spec
      let edgeRatio: number;
      if (spec.density.kind === "sparse") {
        edgeRatio = 0.2; // Add 20% of possible edges
      } else if (spec.density.kind === "moderate") {
        edgeRatio = 0.5; // Add 50% of possible edges
      } else if (spec.density.kind === "dense") {
        edgeRatio = 1.0; // Add all edges
      } else {
        edgeRatio = 0.5; // Default to moderate
      }

      const targetEdges = Math.floor(maxEdgesBetween * edgeRatio);

      // Add edges between partitions
      const existingEdges = new Set<string>();
      let addedEdges = 0;

      // Shuffle to get random edges
      const shuffled: [string, string][] = [];
      for (const u of partition1) {
        for (const v of partition2) {
          shuffled.push([u, v]);
        }
      }

      // Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = rng.integer(0, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Add edges until we reach target
      for (const [u, v] of shuffled) {
        if (addedEdges >= targetEdges) break;

        addEdge(edges, u, v, spec, rng);
        addedEdges++;
      }
    }
  }

  // For acyclic requirement, we might need to remove some edges
  if (spec.cycles.kind === 'acyclic') {
    // A k-colorable acyclic graph is a forest
    // Remove edges to eliminate cycles while maintaining k-colorability
    // This is complex; for now, we'll just clear and regenerate as a forest
    edges.length = 0;

    // Build a forest using parent-child connections
    const visited = new Set<string>();
    const colorQueue: string[][] = partitions;

    // Start with nodes from first partition as roots
    for (const root of colorQueue[0]) {
      visited.add(root);
    }

    // Connect nodes from subsequent partitions to visited nodes
    for (let colorIdx = 1; colorIdx < k && colorQueue[colorIdx].length > 0; colorIdx++) {
      for (const nodeId of colorQueue[colorIdx]) {
        if (visited.size === 0) break;

        // Connect to a random visited node (from earlier color)
        const parent = rng.choice(Array.from(visited));
        addEdge(edges, parent, nodeId, spec, rng);
        visited.add(nodeId);
      }
    }

    // Handle any remaining unvisited nodes (connect to any visited node)
    for (let colorIdx = 0; colorIdx < k; colorIdx++) {
      for (const nodeId of colorQueue[colorIdx]) {
        if (!visited.has(nodeId) && visited.size > 0) {
          const parent = rng.choice(Array.from(visited));
          addEdge(edges, parent, nodeId, spec, rng);
          visited.add(nodeId);
        }
      }
    }
  }
}

/**
 * Generate connected graph with cycles.
 */
function generateConnectedCyclicEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  if (nodes.length === 0) return;

  // First create a cycle through all nodes
  for (let i = 0; i < nodes.length; i++) {
    const source = nodes[i].id;
    const target = nodes[(i + 1) % nodes.length].id;
    addEdge(edges, source, target, spec, rng);
  }
}

/**
 * Generate forest (disconnected trees).
 */
function generateForestEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  if (nodes.length < 2) return;

  // Split nodes into 2-3 components
  const componentCount = Math.min(3, Math.max(2, Math.floor(nodes.length / 3)));
  const componentSize = Math.floor(nodes.length / componentCount);

  for (let c = 0; c < componentCount; c++) {
    const start = c * componentSize;
    const end = c === componentCount - 1 ? nodes.length : start + componentSize;
    const componentNodes = nodes.slice(start, end);

    // Create tree within component
    for (let i = 1; i < componentNodes.length; i++) {
      const target = componentNodes[i].id;
      const parentIndex = rng.integer(0, i - 1);
      const source = componentNodes[parentIndex].id;
      addEdge(edges, source, target, spec, rng);
    }
  }
}

/**
 * Generate disconnected graph.
 * For sparse, creates forest then optionally adds 1 edge for cycles.
 * For higher densities, creates components with cycles.
 */
function generateDisconnectedEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  if (nodes.length < 2) return;

  // Use minimal structure (trees) for sparse and moderate, then add edges to reach target
  // For dense, create cycles directly since we'll need many edges anyway
  const useMinimal = spec.density.kind === "sparse" || spec.density.kind === "moderate";

  // Create 2-3 components
  const componentCount = Math.min(3, Math.max(2, Math.floor(nodes.length / 3)));
  const componentSize = Math.floor(nodes.length / componentCount);

  // Track component boundaries for later cycle addition
  const componentRanges: Array<{start: number; end: number}> = [];

  for (let c = 0; c < componentCount; c++) {
    const start = c * componentSize;
    const end = c === componentCount - 1 ? nodes.length : start + componentSize;
    const componentNodes = nodes.slice(start, end);
    componentRanges.push({start, end});

    if (componentNodes.length >= 2) {
      if (useMinimal) {
        // Create tree within component (forest) - n-1 edges
        for (let i = 1; i < componentNodes.length; i++) {
          const target = componentNodes[i].id;
          const parentIndex = rng.integer(0, i - 1);
          const source = componentNodes[parentIndex].id;
          addEdge(edges, source, target, spec, rng);
        }
      } else {
        // Create cycle within component for dense
        for (let i = 0; i < componentNodes.length; i++) {
          const source = componentNodes[i].id;
          const target = componentNodes[(i + 1) % componentNodes.length].id;
          addEdge(edges, source, target, spec, rng);
        }
      }
    }
  }

  // For sparse/moderate + cycles_allowed, add exactly 1 edge to create a cycle
  // Pick a component with ≥4 nodes and connect nodes at distance ≥3
  if (useMinimal && spec.cycles.kind === "cycles_allowed") {
    // Build adjacency to check for existing edges
    const existingEdges = new Set(edges.map(e => {
      const key = spec.directionality.kind === 'directed'
        ? `${e.source}→${e.target}`
        : [e.source, e.target].sort().join('-');
      return key;
    }));

    for (const {start, end} of componentRanges) {
      if (end - start >= 4) {
        // Try to find two non-adjacent nodes to connect
        // In a tree, nodes at distance ≥3 are guaranteed not to be directly connected
        for (let i = 0; i < end - start - 3; i++) {
          const source = nodes[start + i].id;
          const target = nodes[start + i + 3].id;
          const key = spec.directionality.kind === 'directed'
            ? `${source}→${target}`
            : [source, target].sort().join('-');

          if (!existingEdges.has(key)) {
            addEdge(edges, source, target, spec, rng);
            break;
          }
        }
        break;
      }
    }
  }
}

/**
 * Add additional edges to achieve desired density.
 */
function addDensityEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  _config: GraphGenerationConfig,
  rng: SeededRandom
): void {
  const n = nodes.length;

  // Early exit for graphs with exact structures that shouldn't be modified
  if (spec.completeBipartite?.kind === "complete_bipartite") {
    return;
  }
  if (spec.grid?.kind === "grid") {
    return; // Grid graphs have exact structure
  }
  if (spec.toroidal?.kind === "toroidal") {
    return; // Toroidal graphs have exact structure
  }
  if (spec.star?.kind === "star") {
    return; // Star graphs have exact structure
  }
  if (spec.wheel?.kind === "wheel") {
    return; // Wheel graphs have exact structure
  }
  if (spec.binaryTree?.kind === "binary_tree" ||
      spec.binaryTree?.kind === "full_binary" ||
      spec.binaryTree?.kind === "complete_binary") {
    return; // Binary trees have exact structure
  }
  if (spec.tournament?.kind === "tournament") {
    return; // Tournament graphs have exact structure
  }
  if (spec.cubic?.kind === "cubic") {
    return; // Cubic graphs have exact structure (3-regular)
  }
  if (spec.specificRegular?.kind === "k_regular") {
    return; // k-regular graphs have exact structure
  }
  if (spec.eulerian?.kind === "eulerian" || spec.eulerian?.kind === "semi_eulerian") {
    return; // Eulerian graphs have exact structure
  }
  if (spec.kVertexConnected?.kind === "k_vertex_connected") {
    return; // k-vertex-connected graphs have exact structure
  }
  if (spec.kEdgeConnected?.kind === "k_edge_connected") {
    return; // k-edge-connected graphs have exact structure
  }
  if (spec.treewidth?.kind === "treewidth") {
    return; // treewidth-bounded graphs have exact structure
  }
  if (spec.kColorable?.kind === "k_colorable" || spec.kColorable?.kind === "bipartite_colorable") {
    return; // k-colorable graphs have exact structure
  }

  // Get bipartite partitions if applicable
  const isBipartite = spec.partiteness?.kind === "bipartite";
  const leftPartition = isBipartite ? nodes.filter((node: any) => node.partition === "left") : [];
  const rightPartition = isBipartite ? nodes.filter((node: any) => node.partition === "right") : [];

  // For disconnected graphs, find components to calculate true maxPossibleEdges
  let components: string[][] = [];
  if (spec.connectivity.kind === "unconstrained") {
    components = findComponents(nodes, edges, spec.directionality.kind === 'directed');
  }

  // Calculate max possible edges accounting for self-loops, bipartite structure, and component structure
  const selfLoopEdges = spec.selfLoops.kind === "allowed" ? n : 0;
  let maxPossibleEdges: number;

  if (isBipartite) {
    // Bipartite graphs: max edges = leftSize * rightSize (or 2x for directed)
    maxPossibleEdges = spec.directionality.kind === 'directed'
      ? (2 * leftPartition.length * rightPartition.length) + selfLoopEdges
      : (leftPartition.length * rightPartition.length);
  } else if (spec.connectivity.kind === "unconstrained" && components.length > 1) {
    // For disconnected graphs, calculate max edges within each component
    maxPossibleEdges = components.reduce((total, comp) => {
      const compSize = comp.length;
      if (spec.directionality.kind === 'directed') {
        return total + (compSize * (compSize - 1));
      } else {
        return total + ((compSize * (compSize - 1)) / 2);
      }
    }, 0) + selfLoopEdges;
  } else {
    // For connected graphs, use standard formula
    maxPossibleEdges = spec.directionality.kind === 'directed'
      ? (n * (n - 1)) + selfLoopEdges  // n*(n-1) directed edges + n self-loops
      : ((n * (n - 1)) / 2); // Undirected: self-loops don't count in traditional edges
  }

  // Map density to percentage of max edges
  const edgePercentage: Record<string, number> = {
    sparse: 0.15,     // 10-20% (use 15% as midpoint)
    moderate: 0.4,    // 30-50% (use 40% as midpoint)
    dense: 0.7,       // 60-80% (use 70% as midpoint)
    unconstrained: 0.4, // Default to moderate for unconstrained
  };

  // Handle completeness and trees with exact edge counts
  let targetEdgeCount: number;
  const isUndirectedTree = spec.directionality.kind === "undirected" &&
    spec.cycles.kind === "acyclic" &&
    spec.connectivity.kind === "connected";

  // Account for edges already added by generateBaseStructure
  const existingEdgeCount = edges.length;

  if (spec.completeness.kind === "complete") {
    targetEdgeCount = maxPossibleEdges;
  } else if (isUndirectedTree) {
    // Trees are already generated with exactly n-1 edges in generateBaseStructure
    // Add parallel edges for multigraphs before returning
    if (spec.edgeMultiplicity.kind === "multi" && edges.length > 0) {
      const edgeToDouble = rng.choice(edges);
      addEdge(edges, edgeToDouble.source, edgeToDouble.target, spec, rng);
    }
    return;
  } else {
    targetEdgeCount = Math.floor(maxPossibleEdges * edgePercentage[spec.density.kind]);
  }

  // Calculate how many MORE edges we need to add (account for existing edges)
  const edgesToAdd = targetEdgeCount - existingEdgeCount;

  // For complete graphs, use deterministic edge generation instead of random
  if (spec.completeness.kind === "complete" && spec.edgeMultiplicity.kind === "simple") {
    // Clear any edges added by generateBaseStructure - complete graphs have deterministic structure
    edges.length = 0;

    const nodeIds = nodes.map(n => n.id);

    // Generate all possible edges deterministically
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = 0; j < nodeIds.length; j++) {
        const source = nodeIds[i];
        const target = nodeIds[j];

        // Skip for undirected: only add when i < j, OR allow self-loops when i === j
        if (spec.directionality.kind === "undirected") {
          if (i >= j && (i !== j || spec.selfLoops.kind !== "allowed")) continue;
        }

        // Skip self-loops if not allowed
        if (spec.selfLoops.kind === "disallowed" && source === target) continue;

        addEdge(edges, source, target, spec, rng);
      }
    }
    return;
  }

  // For self-loops (when not complete), add them as part of density edges
  // Track whether we still need to add a self-loop
  const needsSelfLoop = spec.selfLoops.kind === "allowed" && spec.completeness.kind !== "complete" && nodes.length > 0;

  // Recalculate edges to add
  const finalEdgesToAdd = targetEdgeCount - edges.length;
  if (finalEdgesToAdd <= 0) {
    // Even if we have enough edges, still add:
    // - Self-loop if needed
    // - Cycle for cycles_allowed
    // - Parallel edge for multigraphs
    if (needsSelfLoop && edges.length > 0) {
      const node = rng.choice(nodes).id;
      addEdge(edges, node, node, spec, rng);
    }

    // For cycles_allowed graphs, ensure we have at least one cycle
    if (spec.cycles.kind === "cycles_allowed" &&
        spec.directionality.kind === "directed" &&
        spec.connectivity.kind === "unconstrained" &&
        edges.length > 0) {
      const hasCycle = detectCycleInGraph(nodes, edges, true);
      if (!hasCycle) {
        const edgeToReverse = rng.choice(edges);
        const reverseKey = spec.directionality.kind === 'directed'
          ? `${edgeToReverse.target}→${edgeToReverse.source}`
          : [edgeToReverse.target, edgeToReverse.source].sort().join('-');
        const existingEdges = new Set(edges.map(e =>
          spec.directionality.kind === 'directed' ? `${e.source}→${e.target}` : [e.source, e.target].sort().join('-')
        ));
        if (!existingEdges.has(reverseKey)) {
          addEdge(edges, edgeToReverse.target, edgeToReverse.source, spec, rng);
        }
      }
    }

    // For multigraphs, ensure we have at least one parallel edge
    if (spec.edgeMultiplicity.kind === "multi" && edges.length > 0) {
      const edgeToDouble = rng.choice(edges);
      addEdge(edges, edgeToDouble.source, edgeToDouble.target, spec, rng);
    }
    return;
  }

  // Track existing edges (only matters for non-multigraphs)
  const existingEdges = new Set(
    edges.map((e) =>
      spec.directionality.kind === 'directed' ? `${e.source}→${e.target}` : [e.source, e.target].sort().join('-')
    )
  );

  let attempts = 0;
  // Increase maxAttempts multiplier to allow reaching dense targets
  // For dense graphs, need many more attempts due to high collision rate with existing edges
  const maxAttemptsMultiplier = spec.density.kind === "dense" ? 100 : 10;
  const maxAttempts = finalEdgesToAdd * maxAttemptsMultiplier;

  while (edges.length < targetEdgeCount && attempts < maxAttempts) {
    attempts++;

    let source: string;
    let target: string;

    // Occasionally add self-loop when needed (10% of attempts)
    if (needsSelfLoop && attempts % 10 === 0) {
      const node = rng.choice(nodes).id;
      const selfLoopKey = spec.directionality.kind === 'directed' ? `${node}→${node}` : [node, node].sort().join('-');
      if (spec.edgeMultiplicity.kind === 'multi' || !existingEdges.has(selfLoopKey)) {
        addEdge(edges, node, node, spec, rng);
        if (spec.edgeMultiplicity.kind === 'simple') {
          existingEdges.add(selfLoopKey);
        }
        continue;
      }
    }

    if (isBipartite) {
      // For bipartite graphs, select one node from each partition
      const sourceNode = rng.choice(leftPartition.length > 0 && rightPartition.length > 0
        ? (Math.random() < 0.5 ? leftPartition : rightPartition)
        : (leftPartition.length > 0 ? leftPartition : rightPartition));

      // Select target from opposite partition
      const oppositePartition = (sourceNode as any).partition === "left" ? rightPartition : leftPartition;
      if (oppositePartition.length === 0) continue; // No valid target

      const targetNode = rng.choice(oppositePartition);
      source = sourceNode.id;
      target = targetNode.id;
    } else if (spec.connectivity.kind === "unconstrained" && components.length > 0) {
      // Pick a random component and select both nodes from it
      const component = rng.choice(components);
      if (component.length < 2) continue; // Skip components with only 1 node
      source = rng.choice(component);
      target = rng.choice(component);
    } else {
      // For connected graphs, pick any two nodes
      source = rng.choice(nodes).id;
      target = rng.choice(nodes).id;
    }

    // Avoid self-loops if not allowed
    if (spec.selfLoops.kind === "disallowed" && source === target) continue;

    // For non-multigraphs, check if edge already exists
    const edgeKey =
      spec.directionality.kind === 'directed' ? `${source}→${target}` : [source, target].sort().join('-');
    if (spec.edgeMultiplicity.kind === 'simple' && existingEdges.has(edgeKey)) continue;

    // For acyclic graphs, ensure we don't create cycles
    if (spec.cycles.kind === 'acyclic' && spec.directionality.kind === 'directed') {
      // Simple check: only add edge if target ID > source ID (topological ordering)
      const sourceNum = parseInt(source.slice(1), 10);
      const targetNum = parseInt(target.slice(1), 10);
      if (targetNum <= sourceNum) continue;
    }

    addEdge(edges, source, target, spec, rng);

    // Only track unique edges for non-multigraphs
    if (spec.edgeMultiplicity.kind === 'simple') {
      existingEdges.add(edgeKey);
    }
  }

  // After the loop, ensure we have required features
  // Add self-loop if still needed
  if (needsSelfLoop && edges.length > 0 && !edges.some(e => e.source === e.target)) {
    const node = rng.choice(nodes).id;
    addEdge(edges, node, node, spec, rng);
  }

  // Add cycle for cycles_allowed if still needed
  if (spec.cycles.kind === "cycles_allowed" &&
      spec.directionality.kind === "directed" &&
      spec.connectivity.kind === "unconstrained" &&
      edges.length > 0) {
    const hasCycle = detectCycleInGraph(nodes, edges, true);
    if (!hasCycle) {
      const edgeToReverse = rng.choice(edges);
      const reverseKey = `${edgeToReverse.target}→${edgeToReverse.source}`;
      if (!existingEdges.has(reverseKey)) {
        addEdge(edges, edgeToReverse.target, edgeToReverse.source, spec, rng);
      }
    }
  }

  // Add parallel edge for multigraphs
  if (spec.edgeMultiplicity.kind === "multi" && edges.length > 0) {
    const edgeToDouble = rng.choice(edges);
    addEdge(edges, edgeToDouble.source, edgeToDouble.target, spec, rng);
  }
}

/**
 * Add weights to edges.
 */
function addWeights(edges: TestEdge[], config: GraphGenerationConfig, rng: SeededRandom): void {
  const { min = 1, max = 100 } = config.weightRange ?? {};

  for (const edge of edges) {
    edge.weight = rng.integer(min, max);
  }
}

/**
 * Detect cycles in a graph using DFS (simplified version for internal use).
 */
function detectCycleInGraph(nodes: TestNode[], edges: TestEdge[], directed: boolean): boolean {
  if (nodes.length < 2) return false;

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)!.push(edge.target);
    if (!directed) {
      adjacency.get(edge.target)!.push(edge.source);
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

/**
 * Find connected components in the graph using BFS.
 * Returns array of components, where each component is an array of node IDs.
 */
function findComponents(nodes: TestNode[], edges: TestEdge[], directed: boolean): string[][] {
  const components: string[][] = [];
  const visited = new Set<string>();

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)!.push(edge.target);
    if (!directed) {
      adjacency.get(edge.target)!.push(edge.source);
    }
  }

  // BFS to find each component
  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component: string[] = [];
    const queue: string[] = [node.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      const neighbors = adjacency.get(current) ?? [];
      queue.push(...neighbors.filter((n) => !visited.has(n)));
    }

    components.push(component);
  }

  return components;
}

// ============================================================================
// BIPARTITE GRAPH GENERATORS
// ============================================================================

/**
 * Get nodes in left and right partitions for bipartite graphs.
 */
function getBipartitePartitions(nodes: TestNode[]): { left: TestNode[]; right: TestNode[] } {
  const left = nodes.filter(n => (n as any).partition === "left");
  const right = nodes.filter(n => (n as any).partition === "right");
  return { left, right };
}

/**
 * Generate complete bipartite K_{m,n} graph.
 */
function generateCompleteBipartiteEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  const { left, right } = getBipartitePartitions(nodes);

  // Add all possible edges between left and right partitions
  for (const leftNode of left) {
    for (const rightNode of right) {
      if (spec.directionality.kind === "directed") {
        // For directed bipartite, add edge in both directions or one direction based on spec
        addEdge(edges, leftNode.id, rightNode.id, spec, rng);
      } else {
        // For undirected, add one edge
        addEdge(edges, leftNode.id, rightNode.id, spec, rng);
      }
    }
  }
}

/**
 * Generate bipartite tree (connected, acyclic bipartite graph).
 */
function generateBipartiteTreeEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  const { left, right } = getBipartitePartitions(nodes);

  if (left.length === 0 || right.length === 0) return;

  // Start with one edge connecting left to right
  const firstLeft = left[0];
  const firstRight = right[0];
  addEdge(edges, firstLeft.id, firstRight.id, spec, rng);

  const connected = new Set([firstLeft.id, firstRight.id]);

  // Connect remaining nodes
  const allNodes = [...left.slice(1), ...right.slice(1)];

  for (const node of allNodes) {
    // Connect to a random node in opposite partition that's already connected
    const oppositePartition = (node as any).partition === "left" ? right : left;
    const connectedOpposite = oppositePartition.filter(n => connected.has(n.id));

    if (connectedOpposite.length > 0) {
      const target = rng.choice(connectedOpposite);
      addEdge(edges, node.id, target.id, spec, rng);
      connected.add(node.id);
    }
  }
}

/**
 * Generate connected bipartite graph with even-length cycles.
 */
function generateBipartiteConnectedEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  const { left, right } = getBipartitePartitions(nodes);

  if (left.length === 0 || right.length === 0) return;

  // First create a spanning tree to ensure connectivity
  generateBipartiteTreeEdges(nodes, edges, spec, rng);

  // Add extra edges between partitions (creates even-length cycles)
  const minPartitionSize = Math.min(left.length, right.length);
  const edgesToAdd = Math.max(0, minPartitionSize - 1); // Add some extra edges

  for (let i = 0; i < edgesToAdd; i++) {
    const source = rng.choice(left);
    const target = rng.choice(right);

    // Avoid duplicate edges for simple graphs
    if (spec.edgeMultiplicity.kind === "simple") {
      const exists = edges.some(e =>
        (e.source === source.id && e.target === target.id) ||
        (spec.directionality.kind === "undirected" && e.source === target.id && e.target === source.id)
      );
      if (exists) continue;
    }

    addEdge(edges, source.id, target.id, spec, rng);
  }
}

/**
 * Generate bipartite forest (disconnected acyclic bipartite graphs).
 */
function generateBipartiteForestEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  const { left, right } = getBipartitePartitions(nodes);

  if (left.length === 0 || right.length === 0) return;

  // Create multiple tree components
  const numComponents = Math.max(2, Math.floor(Math.sqrt(nodes.length)));
  const nodesPerComponent = Math.ceil(nodes.length / numComponents);

  for (let c = 0; c < numComponents; c++) {
    const startIdx = c * nodesPerComponent;
    const endIdx = Math.min(startIdx + nodesPerComponent, nodes.length);
    const componentNodes = nodes.slice(startIdx, endIdx);

    if (componentNodes.length < 2) continue;

    // For bipartite, ensure each component has at least one node from each partition
    const compLeft = componentNodes.filter(n => (n as any).partition === "left");
    const compRight = componentNodes.filter(n => (n as any).partition === "right");

    if (compLeft.length === 0 || compRight.length === 0) continue;

    // Create one edge to start the component
    addEdge(edges, compLeft[0].id, compRight[0].id, spec, rng);

    const connected = new Set([compLeft[0].id, compRight[0].id]);
    const remaining = [...compLeft.slice(1), ...compRight.slice(1)];

    // Connect rest of component
    for (const node of remaining) {
      const oppositePartition = (node as any).partition === "left" ? compRight : compLeft;
      const connectedOpposite = oppositePartition.filter(n => connected.has(n.id));

      if (connectedOpposite.length > 0) {
        const target = rng.choice(connectedOpposite);
        addEdge(edges, node.id, target.id, spec, rng);
        connected.add(node.id);
      }
    }
  }
}

/**
 * Generate disconnected bipartite graph with cycles.
 */
function generateBipartiteDisconnectedEdges(
  nodes: TestNode[],
  edges: TestEdge[],
  spec: GraphSpec,
  rng: SeededRandom
): void {
  const { left, right } = getBipartitePartitions(nodes);

  if (left.length === 0 || right.length === 0) return;

  // Create 2-4 components
  const numComponents = 2 + Math.floor(rng.next() * 3);
  const nodesPerComponent = Math.ceil(nodes.length / numComponents);

  for (let c = 0; c < numComponents; c++) {
    const startIdx = c * nodesPerComponent;
    const endIdx = Math.min(startIdx + nodesPerComponent, nodes.length);
    const componentNodes = nodes.slice(startIdx, endIdx);

    const compLeft = componentNodes.filter(n => (n as any).partition === "left");
    const compRight = componentNodes.filter(n => (n as any).partition === "right");

    if (compLeft.length === 0 || compRight.length === 0) continue;

    // Ensure connectivity within component
    const connected = new Set();
    const firstLeft = compLeft[0];
    const firstRight = compRight[0];
    addEdge(edges, firstLeft.id, firstRight.id, spec, rng);
    connected.add(firstLeft.id);
    connected.add(firstRight.id);

    // Add edges to connect rest of component
    for (const node of [...compLeft.slice(1), ...compRight.slice(1)]) {
      const oppositePartition = (node as any).partition === "left" ? compRight : compLeft;
      const connectedOpposite = oppositePartition.filter(n => connected.has(n.id));

      if (connectedOpposite.length > 0) {
        const target = rng.choice(connectedOpposite);
        addEdge(edges, node.id, target.id, spec, rng);
        connected.add(node.id);
      }
    }

    // Add some extra edges to create cycles (even-length for bipartite)
    const extraEdges = Math.floor(rng.next() * compLeft.length);
    for (let i = 0; i < extraEdges; i++) {
      const source = rng.choice(compLeft);
      const target = rng.choice(compRight);

      if (spec.edgeMultiplicity.kind === "simple") {
        const exists = edges.some(e =>
          (e.source === source.id && e.target === target.id) ||
          (spec.directionality.kind === "undirected" && e.source === target.id && e.target === source.id)
        );
        if (exists) continue;
      }

      addEdge(edges, source.id, target.id, spec, rng);
    }
  }
}

/**
 * Add edge to edge list.
 * NOTE: For undirected graphs, only store one direction - the validator's
 * buildAdjacencyList will create bidirectional adjacency.
 */
function addEdge(
  edges: TestEdge[],
  source: string,
  target: string,
  spec: GraphSpec,
  rng: SeededRandom
): void {
  const edge: TestEdge = { source, target };

  if (spec.schema.kind === 'heterogeneous') {
    // Assign random edge type (could be based on config.edgeTypes)
    edge.type = rng.choice(['type_a', 'type_b', 'type_c']);
  }

  edges.push(edge);
}
