/**
 * Benchmark graph fixtures for MI evaluation experiments
 *
 * Provides standard test graphs for reproducible evaluation experiments
 */

import { Graph } from '@bibgraph/algorithms';
import type { Node, Edge } from '@bibgraph/types';

/**
 * Simple citation network with 5 works
 */
export function createSmallCitationNetwork(): Graph<
  Node & { type: string },
  Edge & { source: string; target: string }
> {
  const graph = new Graph<Node & { type: string }, Edge & { source: string; target: string }>();

  // Add work nodes
  const works = ['W1', 'W2', 'W3', 'W4', 'W5'];
  for (const work of works) {
    graph.addNode({ id: work, type: 'Work' });
  }

  // Add citation edges (W1 is most cited)
  graph.addEdge({ id: 'e1', source: 'W2', target: 'W1', weight: 0.5 });
  graph.addEdge({ id: 'e2', source: 'W3', target: 'W1', weight: 0.6 });
  graph.addEdge({ id: 'e3', source: 'W4', target: 'W1', weight: 0.7 });
  graph.addEdge({ id: 'e4', source: 'W5', target: 'W1', weight: 0.8 });
  graph.addEdge({ id: 'e5', source: 'W3', target: 'W2', weight: 0.4 });
  graph.addEdge({ id: 'e6', source: 'W4', target: 'W2', weight: 0.5 });

  return graph;
}

/**
 * Medium citation network with 10 works
 */
export function createMediumCitationNetwork(): Graph<
  Node & { type: string },
  Edge & { source: string; target: string }
> {
  const graph = new Graph<Node & { type: string }, Edge & { source: string; target: string }>();

  // Add work nodes
  for (let i = 1; i <= 10; i++) {
    graph.addNode({ id: `W${i}`, type: 'Work' });
  }

  // Create citation patterns (early works get more citations)
  const citations: Array<[string, string, number]> = [
    ['W2', 'W1', 0.7],
    ['W3', 'W1', 0.6],
    ['W4', 'W1', 0.8],
    ['W5', 'W1', 0.5],
    ['W6', 'W2', 0.6],
    ['W7', 'W2', 0.7],
    ['W8', 'W3', 0.5],
    ['W9', 'W3', 0.6],
    ['W10', 'W4', 0.7],
    ['W4', 'W2', 0.4],
    ['W5', 'W3', 0.3],
    ['W6', 'W4', 0.5],
    ['W7', 'W5', 0.6],
    ['W8', 'W6', 0.4],
    ['W9', 'W7', 0.5],
  ];

  let edgeId = 1;
  for (const [source, target, weight] of citations) {
    graph.addEdge({ id: `e${edgeId++}`, source, target, weight });
  }

  return graph;
}

/**
 * Heterogeneous scholarly graph with Works, Authors, and Institutions
 */
export function createHeterogeneousScholarlyGraph(): Graph<
  Node & { type: string },
  Edge & { source: string; target: string }
> {
  const graph = new Graph<Node & { type: string }, Edge & { source: string; target: string }>();

  // Add works
  for (let i = 1; i <= 5; i++) {
    graph.addNode({ id: `W${i}`, type: 'Work' });
  }

  // Add authors
  for (let i = 1; i <= 3; i++) {
    graph.addNode({ id: `A${i}`, type: 'Author' });
  }

  // Add institutions
  for (let i = 1; i <= 2; i++) {
    graph.addNode({ id: `I${i}`, type: 'Institution' });
  }

  // Add edges (authorship, affiliation, citations)
  const edges: Array<[string, string, number]> = [
    // Authorship (A1 writes W1, W2)
    ['W1', 'A1', 0.9],
    ['W2', 'A1', 0.9],
    // Authorship (A2 writes W2, W3)
    ['W2', 'A2', 0.9],
    ['W3', 'A2', 0.9],
    // Authorship (A3 writes W4, W5)
    ['W4', 'A3', 0.9],
    ['W5', 'A3', 0.9],
    // Affiliation (A1 at I1)
    ['A1', 'I1', 0.8],
    // Affiliation (A2, A3 at I2)
    ['A2', 'I2', 0.8],
    ['A3', 'I2', 0.8],
    // Citations
    ['W2', 'W1', 0.7],
    ['W3', 'W1', 0.6],
    ['W4', 'W2', 0.5],
    ['W5', 'W3', 0.6],
  ];

  let edgeId = 1;
  for (const [source, target, weight] of edges) {
    graph.addEdge({ id: `e${edgeId++}`, source, target, weight });
  }

  return graph;
}

/**
 * Dense community graph with clear community structure
 */
export function createDenseCommunityGraph(): Graph<
  Node & { type: string },
  Edge & { source: string; target: string }
> {
  const graph = new Graph<Node & { type: string }, Edge & { source: string; target: string }>();

  // Create 3 communities of 5 nodes each
  const communities = 3;
  const nodesPerCommunity = 5;

  for (let c = 0; c < communities; c++) {
    for (let i = 0; i < nodesPerCommunity; i++) {
      const nodeId = `C${c}_N${i}`;
      graph.addNode({ id: nodeId, type: 'Node' });
    }
  }

  let edgeId = 1;

  // Add dense intra-community edges
  for (let c = 0; c < communities; c++) {
    for (let i = 0; i < nodesPerCommunity; i++) {
      for (let j = i + 1; j < nodesPerCommunity; j++) {
        const source = `C${c}_N${i}`;
        const target = `C${c}_N${j}`;
        graph.addEdge({
          id: `e${edgeId++}`,
          source,
          target,
          weight: 0.9,
        });
      }
    }
  }

  // Add sparse inter-community edges
  graph.addEdge({ id: 'e1_0', source: 'C0_N0', target: 'C1_N0', weight: 0.2 });
  graph.addEdge({ id: 'e1_1', source: 'C1_N0', target: 'C2_N0', weight: 0.2 });
  graph.addEdge({ id: 'e1_2', source: 'C2_N0', target: 'C0_N0', weight: 0.2 });

  return graph;
}

/**
 * Sparse random graph for stress testing
 */
export function createSparseRandomGraph(): Graph<
  Node & { type: string },
  Edge & { source: string; target: string }
> {
  const graph = new Graph<Node & { type: string }, Edge & { source: string; target: string }>();

  const nodeCount = 20;
  const edgeProbability = 0.1;
  const seed = 42;

  // Simple seeded random
  let rngState = seed;
  const random = () => {
    const x = Math.sin(rngState++) * 10000;
    return x - Math.floor(x);
  };

  // Add nodes
  for (let i = 0; i < nodeCount; i++) {
    graph.addNode({ id: `N${i}`, type: 'Node' });
  }

  // Add random edges
  let edgeId = 1;
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (random() < edgeProbability) {
        graph.addEdge({
          id: `e${edgeId++}`,
          source: `N${i}`,
          target: `N${j}`,
          weight: random(),
        });
      }
    }
  }

  return graph;
}

/**
 * Complete graph for testing edge cases
 */
export function createCompleteGraph(): Graph<
  Node & { type: string },
  Edge & { source: string; target: string }
> {
  const graph = new Graph<Node & { type: string }, Edge & { source: string; target: string }>();

  const nodeCount = 5;

  // Add nodes
  for (let i = 0; i < nodeCount; i++) {
    graph.addNode({ id: `N${i}`, type: 'Node' });
  }

  // Add all possible edges
  let edgeId = 1;
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      graph.addEdge({
        id: `e${edgeId++}`,
        source: `N${i}`,
        target: `N${j}`,
        weight: 0.5,
      });
    }
  }

  return graph;
}

/**
 * Star graph (one central hub)
 */
export function createStarGraph(): Graph<
  Node & { type: string },
  Edge & { source: string; target: string }
> {
  const graph = new Graph<Node & { type: string }, Edge & { source: string; target: string }>();

  // Add center node
  graph.addNode({ id: 'center', type: 'Node' });

  // Add peripheral nodes
  const peripheralCount = 6;
  for (let i = 0; i < peripheralCount; i++) {
    graph.addNode({ id: `P${i}`, type: 'Node' });
    graph.addEdge({
      id: `e${i}`,
      source: `P${i}`,
      target: 'center',
      weight: 0.7,
    });
  }

  return graph;
}
