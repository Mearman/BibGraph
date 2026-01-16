/**
 * Connectivity-based graph generators
 *
 * Functions for generating graphs with specific connectivity properties:
 * - Flow networks (source → sink with capacity weights)
 * - Eulerian and semi-Eulerian graphs
 * - k-vertex-connected and k-edge-connected graphs
 * - Treewidth-bounded graphs
 * - k-colorable graphs
 * - Connected cyclic graphs
 * - Forests (acyclic disconnected)
 * - Disconnected graphs with optional cycles
 */

import type { GraphSpec } from '../spec';
import type { TestEdge,TestNode } from './types';

// Local type definition to avoid circular dependencies with generator.ts
interface SeededRandom {
  next(): number;
  integer(min: number, max: number): number;
  choice<T>(array: T[]): T;
}

/**
 * Add edge to edge list, handling heterogeneous schema types.
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
 * Generate flow network with source and sink nodes.
 * All nodes lie on paths from source to sink. Edges have capacity weights.
 * @param nodes
 * @param edges
 * @param spec
 * @param source - Source node ID
 * @param sink - Sink node ID
 * @param rng
 */
export const generateFlowNetworkEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, source: string, sink: string, rng: SeededRandom): void => {
  const n = nodes.length;

  // Validate source and sink exist
  const sourceNode = nodes.find(node => node.id === source);
  const sinkNode = nodes.find(node => node.id === sink);

  if (!sourceNode) {
    throw new Error(`Source node '${source}' not found in nodes`);
  }
  if (!sinkNode) {
    throw new Error(`Sink node '${sink}' not found in nodes`);
  }
  if (source === sink) {
    throw new Error('Source and sink must be different nodes');
  }

  // Build layers to ensure all nodes lie on source→sink paths
  // Layer 0: source
  // Layer 1: intermediate nodes
  // Layer 2: sink
  const intermediateLayer = new Set<string>(
    nodes.filter(node => node.id !== source && node.id !== sink).map(node => node.id)
  );

  // Connect source to intermediate nodes (50-75% connectivity)
  const sourceConnectivity = 0.5 + rng.next() * 0.25;
  for (const targetId of intermediateLayer) {
    if (rng.next() < sourceConnectivity) {
      edges.push({
        source,
        target: targetId,
        weight: Math.floor(rng.next() * 10) + 1, // Capacity 1-10
      });
    }
  }

  // Connect intermediate nodes among themselves (creating paths)
  const intermediateArray = [...intermediateLayer];
  if (intermediateArray.length > 1) {
    // Create a roughly connected structure among intermediate nodes
    for (let i = 0; i < intermediateArray.length; i++) {
      const fromId = intermediateArray[i];

      // Connect to next 1-2 nodes to create paths
      const connections = Math.floor(rng.next() * 2) + 1;
      for (let j = 1; j <= connections; j++) {
        const toIndex = (i + j) % intermediateArray.length;
        const toId = intermediateArray[toIndex];

        // Avoid backward edges (maintain general flow direction)
        if (rng.next() < 0.7) {
          edges.push({
            source: fromId,
            target: toId,
            weight: Math.floor(rng.next() * 10) + 1,
          });
        }
      }
    }
  }

  // Connect intermediate nodes to sink (50-75% connectivity)
  const sinkConnectivity = 0.5 + rng.next() * 0.25;
  for (const sourceId of intermediateLayer) {
    if (rng.next() < sinkConnectivity) {
      edges.push({
        source: sourceId,
        target: sink,
        weight: Math.floor(rng.next() * 10) + 1,
      });
    }
  }

  // Also add a direct source→sink edge sometimes (higher capacity)
  if (rng.next() < 0.3) {
    edges.push({
      source,
      target: sink,
      weight: Math.floor(rng.next() * 20) + 10, // Higher capacity 10-30
    });
  }

  // Ensure minimum edge count for connectivity
  if (edges.length < n - 1) {
    // Add more connections from source
    for (const targetId of intermediateLayer) {
      const hasEdge = edges.some(e => e.source === source && e.target === targetId);
      if (!hasEdge) {
        edges.push({
          source,
          target: targetId,
          weight: Math.floor(rng.next() * 10) + 1,
        });
        if (edges.length >= n - 1) break;
      }
    }
  }
};

/**
 * Generate Eulerian or semi-Eulerian graph.
 * Eulerian graphs have all vertices with even degree (allow Eulerian circuit).
 * Semi-Eulerian graphs have exactly 2 vertices with odd degree (allow Eulerian trail).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateEulerianEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
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
    if (index !== -1) {
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
      const oddCountBefore = [...degrees.values()].filter(d => d % 2 === 1).length;
      const oddCountAfter = oddCountBefore +
        (degree1 % 2 === 0 ? 1 : -1) +  // node1 flips parity
        (degree2 % 2 === 0 ? 1 : -1);   // node2 flips parity

      // Check if adding this edge maintains parity constraints
      const validParity = isSemiEulerian
        ? oddCountAfter === 2  // Semi-Eulerian: exactly 2 odd-degree vertices
        : oddCountAfter === 0; // Eulerian: all even-degree vertices

      if (validParity) {
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
};

/**
 * Generate k-vertex-connected graph.
 * A graph is k-vertex-connected if it has at least k+1 vertices and
 * cannot be disconnected by removing fewer than k vertices.
 *
 * Construction approach:
 * 1. Start with K_{k+1} (complete graph on k+1 vertices)
 * 2. Add remaining vertices, each connected to at least k existing vertices
 * @param nodes
 * @param edges
 * @param spec
 * @param k
 * @param rng
 */
export const generateKVertexConnectedEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, k: number, rng: SeededRandom): void => {
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
};

/**
 * Generate k-edge-connected graph.
 * A graph is k-edge-connected if it has at least k+1 vertices and
 * cannot be disconnected by removing fewer than k edges.
 *
 * Construction approach:
 * 1. Create a k-regular or near-k-regular graph
 * 2. This ensures minimum degree ≥ k, which guarantees edge connectivity ≥ k
 * @param nodes
 * @param edges
 * @param spec
 * @param k
 * @param rng
 */
export const generateKEdgeConnectedEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, k: number, rng: SeededRandom): void => {
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
    const lowDegreeVertices = [...degrees.entries()]
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
};

/**
 * Generate treewidth-bounded graph using k-tree construction.
 * A k-tree is a chordal graph with treewidth exactly k.
 *
 * Construction algorithm:
 * 1. Start with a (k+1)-clique (complete graph on k+1 vertices)
 * 2. Repeatedly add new vertices, each connected to a k-clique of existing vertices
 *
 * This generates a chordal graph with treewidth exactly k.
 * @param nodes
 * @param edges
 * @param spec
 * @param k
 * @param rng
 */
export const generateTreewidthBoundedEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, k: number, rng: SeededRandom): void => {
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

    const generateCombinations = (arr: string[], k: number): string[][] => {
      if (k === 0) return [[]];
      if (arr.length === 0) return [];

      const [first, ...rest] = arr;
      const combsWithFirst = generateCombinations(rest, k - 1).map(comb => [first, ...comb]);
      const combsWithoutFirst = generateCombinations(rest, k);

      return [...combsWithFirst, ...combsWithoutFirst];
    };

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
};

/**
 * Generate k-colorable graph.
 * A k-colorable graph is a graph whose vertices can be colored with k colors
 * such that no two adjacent vertices share the same color.
 *
 * Construction approach: Create a k-partite graph
 * 1. Partition vertices into k color classes
 * 2. Add edges only between vertices of different colors
 * @param nodes
 * @param edges
 * @param spec
 * @param k
 * @param rng
 */
export const generateKColorableEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, k: number, rng: SeededRandom): void => {
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
  const partitions: string[][] = Array.from({ length: k }, () => []);

  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    const color = rng.integer(0, k - 1);
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
        const parent = rng.choice([...visited]);
        addEdge(edges, parent, nodeId, spec, rng);
        visited.add(nodeId);
      }
    }

    // Handle any remaining unvisited nodes (connect to any visited node)
    for (let colorIdx = 0; colorIdx < k; colorIdx++) {
      for (const nodeId of colorQueue[colorIdx]) {
        if (!visited.has(nodeId) && visited.size > 0) {
          const parent = rng.choice([...visited]);
          addEdge(edges, parent, nodeId, spec, rng);
          visited.add(nodeId);
        }
      }
    }
  }
};

/**
 * Generate connected graph with cycles.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateConnectedCyclicEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  if (nodes.length === 0) return;

  // First create a cycle through all nodes
  for (let i = 0; i < nodes.length; i++) {
    const source = nodes[i].id;
    const target = nodes[(i + 1) % nodes.length].id;
    addEdge(edges, source, target, spec, rng);
  }
};

/**
 * Generate forest (disconnected trees).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateForestEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
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
};

/**
 * Generate disconnected graph.
 * For sparse, creates forest then optionally adds 1 edge for cycles.
 * For higher densities, creates components with cycles.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateDisconnectedEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
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
};
