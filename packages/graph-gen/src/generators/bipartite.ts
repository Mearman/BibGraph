/**
 * Bipartite graph generators
 *
 * Functions for generating various bipartite graph structures:
 * - Complete bipartite K_{m,n}
 * - Bipartite trees (acyclic connected)
 * - Connected bipartite graphs with even-length cycles
 * - Bipartite forests (acyclic disconnected)
 * - Disconnected bipartite graphs with cycles
 */

import type { GraphSpec } from '../spec';
import type { TestNode, TestEdge } from './types';
import { SeededRandom } from './types';

/**
 * Get nodes in left and right partitions for bipartite graphs.
 * @param nodes
 */
const getBipartitePartitions = (nodes: TestNode[]): { left: TestNode[]; right: TestNode[] } => {
  const left = nodes.filter((node): node is TestNode & { partition: 'left' } => node.partition === "left");
  const right = nodes.filter((node): node is TestNode & { partition: 'right' } => node.partition === "right");
  return { left, right };
};

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
 * Generate complete bipartite K_{m,n} graph.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateCompleteBipartiteEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  const { left, right } = getBipartitePartitions(nodes);

  // Add all possible edges between left and right partitions
  for (const leftNode of left) {
    for (const rightNode of right) {
      // Both directed and undirected bipartite graphs use the same edge structure
      addEdge(edges, leftNode.id, rightNode.id, spec, rng);
    }
  }
};

/**
 * Generate bipartite tree (connected, acyclic bipartite graph).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateBipartiteTreeEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
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
    const oppositePartition = node.partition === "left" ? right : left;
    const connectedOpposite = oppositePartition.filter(n => connected.has(n.id));

    if (connectedOpposite.length > 0) {
      const target = rng.choice(connectedOpposite);
      addEdge(edges, node.id, target.id, spec, rng);
      connected.add(node.id);
    }
  }
};

/**
 * Generate connected bipartite graph with even-length cycles.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateBipartiteConnectedEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
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
};

/**
 * Generate bipartite forest (disconnected acyclic bipartite graphs).
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateBipartiteForestEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
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
    const compLeft = componentNodes.filter((node): node is TestNode & { partition: 'left' } => node.partition === "left");
    const compRight = componentNodes.filter((node): node is TestNode & { partition: 'right' } => node.partition === "right");

    if (compLeft.length === 0 || compRight.length === 0) continue;

    // Create one edge to start the component
    addEdge(edges, compLeft[0].id, compRight[0].id, spec, rng);

    const connected = new Set([compLeft[0].id, compRight[0].id]);
    const remaining = [...compLeft.slice(1), ...compRight.slice(1)];

    // Connect rest of component
    for (const node of remaining) {
      const oppositePartition = node.partition === "left" ? compRight : compLeft;
      const connectedOpposite = oppositePartition.filter(n => connected.has(n.id));

      if (connectedOpposite.length > 0) {
        const target = rng.choice(connectedOpposite);
        addEdge(edges, node.id, target.id, spec, rng);
        connected.add(node.id);
      }
    }
  }
};

/**
 * Generate disconnected bipartite graph with cycles.
 * @param nodes
 * @param edges
 * @param spec
 * @param rng
 */
export const generateBipartiteDisconnectedEdges = (nodes: TestNode[], edges: TestEdge[], spec: GraphSpec, rng: SeededRandom): void => {
  const { left, right } = getBipartitePartitions(nodes);

  if (left.length === 0 || right.length === 0) return;

  // Create 2-4 components
  const numComponents = 2 + Math.floor(rng.next() * 3);
  const nodesPerComponent = Math.ceil(nodes.length / numComponents);

  for (let c = 0; c < numComponents; c++) {
    const startIdx = c * nodesPerComponent;
    const endIdx = Math.min(startIdx + nodesPerComponent, nodes.length);
    const componentNodes = nodes.slice(startIdx, endIdx);

    const compLeft = componentNodes.filter((node): node is TestNode & { partition: 'left' } => node.partition === "left");
    const compRight = componentNodes.filter((node): node is TestNode & { partition: 'right' } => node.partition === "right");

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
      const oppositePartition = node.partition === "left" ? compRight : compLeft;
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
};
