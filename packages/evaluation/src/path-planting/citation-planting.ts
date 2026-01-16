/**
 * Citation network path planting
 *
 * Models real citation patterns for academic graph evaluation
 */

import { Graph } from '@bibgraph/algorithms';
import type { Path } from '@bibgraph/algorithms';
import type { Edge, Node } from '@bibgraph/types';
import { type PlantedPathConfig, type PlantedPathResult, plantGroundTruthPaths } from './path-generator';

/**
 * Citation path types based on real scholarly communication patterns.
 */
export type CitationPathType =
  | 'direct-citation-chain' // W1 → W2 → W3 (cites)
  | 'co-citation-bridge' // W1 ← W2 → W3 (co-cited)
  | 'bibliographic-coupling' // W1 → W2 ← W3 (common reference)
  | 'author-mediated' // W1 → A → W2 (same author)
  | 'venue-mediated'; // W1 → S → W2 (same venue)

/**
 * Configuration for citation path planting.
 */
export interface CitationPathConfig<N extends Node, E extends Edge> extends PlantedPathConfig<N, E> {
  /** Type of citation path to plant */
  pathType: CitationPathType;
}

/**
 * Plant citation network paths with realistic structure.
 *
 * Creates paths that model actual scholarly communication patterns:
 * - Direct citation chains: Papers citing papers in sequence
 * - Co-citation bridges: Papers cited together by a third paper
 * - Bibliographic coupling: Papers sharing common references
 * - Author-mediated: Papers linked through shared authors
 * - Venue-mediated: Papers linked through publication venues
 *
 * @template N - Node type (typically Work nodes)
 * @template E - Edge type (typically cites or related edges)
 * @param graph - Citation network graph
 * @param pathType - Type of citation path to plant
 * @param config - Planting configuration
 * @returns PlantedPathResult with graph and ground truth paths
 */
export const plantCitationPaths = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  pathType: CitationPathType,
  config: CitationPathConfig<N, E>
): PlantedPathResult<N, E> => {
  const rng = new SeededRandom(config.seed);

  // Get work nodes (filter by type if available)
  const allNodes = graph.getAllNodes();
  const workNodes = filterWorkNodes(allNodes);

  if (workNodes.length < 3) {
    throw new Error('Need at least 3 work nodes to plant citation paths');
  }

  // Shuffle and select nodes
  const selectedNodes = rng.shuffle([...workNodes]).slice(0, Math.min(config.numPaths * 3, workNodes.length));

  switch (pathType) {
    case 'direct-citation-chain':
      return plantDirectCitationChains(graph, selectedNodes, config, rng);

    case 'co-citation-bridge':
      return plantCoCitationBridges(graph, selectedNodes, config, rng);

    case 'bibliographic-coupling':
      return plantBibliographicCoupling(graph, selectedNodes, config, rng);

    case 'author-mediated':
      return plantAuthorMediatedPaths(graph, allNodes, selectedNodes, config, rng);

    case 'venue-mediated':
      return plantVenueMediatedPaths(graph, allNodes, selectedNodes, config, rng);
  }
};

/**
 * Plant direct citation chains (W1 → W2 → W3).
 */
const plantDirectCitationChains = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
): PlantedPathResult<N, E> => {
  const chainLength = 3; // W1 → W2 → W3
  const plantedPaths: Path<N, E>[] = [];
  const relevanceScores = new Map<string, number>();
  let edgesAdded = 0;
  let totalMI = 0;

  for (let i = 0; i < config.numPaths; i++) {
    const startIdx = i * chainLength;
    if (startIdx + chainLength > nodes.length) {
      break;
    }

    const w1 = nodes[startIdx]!;
    const w2 = nodes[startIdx + 1]!;
    const w3 = nodes[startIdx + 2]!;

    // Add citation edges and track them
    const edge1Result = addCitationEdge(graph, w1.id, w2.id, rng);
    if (edge1Result) {
      edgesAdded++;
      totalMI += edge1Result.weight;
    }

    const edge2Result = addCitationEdge(graph, w2.id, w3.id, rng);
    if (edge2Result) {
      edgesAdded++;
      totalMI += edge2Result.weight;
    }

    // Build path object
    if (edge1Result && edge2Result) {
      const path: Path<N, E> = {
        nodes: [w1, w2, w3],
        edges: [edge1Result.edge, edge2Result.edge],
        totalWeight: edge1Result.weight + edge2Result.weight,
      };
      plantedPaths.push(path);

      // Calculate relevance score as average edge weight
      const avgMI = (edge1Result.weight + edge2Result.weight) / 2;
      const pathId = path.nodes.map(n => n.id).join('→');
      relevanceScores.set(pathId, avgMI);
    }
  }

  return {
    graph,
    groundTruthPaths: plantedPaths,
    relevanceScores,
    metadata: {
      nodesAdded: 0, // Citation paths use existing nodes
      edgesAdded,
      avgPathMI: plantedPaths.length > 0 ? totalMI / plantedPaths.length : 0,
    },
  };
};

/**
 * Plant co-citation bridges (W1 ← W2 → W3).
 */
const plantCoCitationBridges = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
): PlantedPathResult<N, E> => {
  const plantedPaths: Path<N, E>[] = [];
  const relevanceScores = new Map<string, number>();
  let edgesAdded = 0;
  let totalMI = 0;

  for (let i = 0; i < config.numPaths; i++) {
    const idx = i * 3;
    if (idx + 3 > nodes.length) {
      break;
    }

    const w1 = nodes[idx]!;
    const w2 = nodes[idx + 1]!;
    const w3 = nodes[idx + 2]!;

    // W2 cites both W1 and W3 (co-citation)
    const edge1Result = addCitationEdge(graph, w2.id, w1.id, rng);
    const edge2Result = addCitationEdge(graph, w2.id, w3.id, rng);

    if (edge1Result) {
      edgesAdded++;
      totalMI += edge1Result.weight;
    }

    if (edge2Result) {
      edgesAdded++;
      totalMI += edge2Result.weight;
    }

    // Build path object
    if (edge1Result && edge2Result) {
      const path: Path<N, E> = {
        nodes: [w1, w2, w3],
        edges: [edge1Result.edge, edge2Result.edge],
        totalWeight: edge1Result.weight + edge2Result.weight,
      };
      plantedPaths.push(path);

      const avgMI = (edge1Result.weight + edge2Result.weight) / 2;
      const pathId = path.nodes.map(n => n.id).join('→');
      relevanceScores.set(pathId, avgMI);
    }
  }

  return {
    graph,
    groundTruthPaths: plantedPaths,
    relevanceScores,
    metadata: {
      nodesAdded: 0,
      edgesAdded,
      avgPathMI: plantedPaths.length > 0 ? totalMI / plantedPaths.length : 0,
    },
  };
};

/**
 * Plant bibliographic coupling (W1 → W2 ← W3).
 */
const plantBibliographicCoupling = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
): PlantedPathResult<N, E> => {
  const plantedPaths: Path<N, E>[] = [];
  const relevanceScores = new Map<string, number>();
  let edgesAdded = 0;
  let totalMI = 0;

  for (let i = 0; i < config.numPaths; i++) {
    const idx = i * 3;
    if (idx + 3 > nodes.length) {
      break;
    }

    const w1 = nodes[idx]!;
    const w2 = nodes[idx + 1]!;
    const w3 = nodes[idx + 2]!;

    // Both W1 and W3 cite W2 (bibliographic coupling)
    const edge1Result = addCitationEdge(graph, w1.id, w2.id, rng);
    const edge2Result = addCitationEdge(graph, w3.id, w2.id, rng);

    if (edge1Result) {
      edgesAdded++;
      totalMI += edge1Result.weight;
    }

    if (edge2Result) {
      edgesAdded++;
      totalMI += edge2Result.weight;
    }

    // Build path object
    if (edge1Result && edge2Result) {
      const path: Path<N, E> = {
        nodes: [w1, w2, w3],
        edges: [edge1Result.edge, edge2Result.edge],
        totalWeight: edge1Result.weight + edge2Result.weight,
      };
      plantedPaths.push(path);

      const avgMI = (edge1Result.weight + edge2Result.weight) / 2;
      const pathId = path.nodes.map(n => n.id).join('→');
      relevanceScores.set(pathId, avgMI);
    }
  }

  return {
    graph,
    groundTruthPaths: plantedPaths,
    relevanceScores,
    metadata: {
      nodesAdded: 0,
      edgesAdded,
      avgPathMI: plantedPaths.length > 0 ? totalMI / plantedPaths.length : 0,
    },
  };
};

/**
 * Plant author-mediated paths (W1 → A → W2).
 */
const plantAuthorMediatedPaths = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  allNodes: N[],
  workNodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
): PlantedPathResult<N, E> => {
  // Find author nodes
  const authorNodes = filterNodesByType(allNodes, 'Author');

  if (authorNodes.length === 0) {
    // Fall back to treating as regular paths
    return plantGroundTruthPaths(graph, config);
  }

  const plantedPaths: Path<N, E>[] = [];
  const relevanceScores = new Map<string, number>();
  let edgesAdded = 0;
  let totalMI = 0;

  for (let i = 0; i < config.numPaths; i++) {
    if (i + 2 > workNodes.length) {
      break;
    }

    const w1 = workNodes[i]!;
    const w2 = workNodes[i + 1]!;
    const author = authorNodes[i % authorNodes.length]!;

    // W1 → A (authored) → W2 (authored)
    const edge1Result = addAuthorshipEdge(graph, w1.id, author.id, rng);
    const edge2Result = addAuthorshipEdge(graph, w2.id, author.id, rng);

    if (edge1Result) {
      edgesAdded++;
      totalMI += edge1Result.weight;
    }

    if (edge2Result) {
      edgesAdded++;
      totalMI += edge2Result.weight;
    }

    // Build path object
    if (edge1Result && edge2Result) {
      const path: Path<N, E> = {
        nodes: [w1, author, w2],
        edges: [edge1Result.edge, edge2Result.edge],
        totalWeight: edge1Result.weight + edge2Result.weight,
      };
      plantedPaths.push(path);

      const avgMI = (edge1Result.weight + edge2Result.weight) / 2;
      const pathId = path.nodes.map(n => n.id).join('→');
      relevanceScores.set(pathId, avgMI);
    }
  }

  return {
    graph,
    groundTruthPaths: plantedPaths,
    relevanceScores,
    metadata: {
      nodesAdded: 0,
      edgesAdded,
      avgPathMI: plantedPaths.length > 0 ? totalMI / plantedPaths.length : 0,
    },
  };
};

/**
 * Plant venue-mediated paths (W1 → S → W2).
 */
const plantVenueMediatedPaths = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  allNodes: N[],
  workNodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
): PlantedPathResult<N, E> => {
  // Find source/venue nodes
  const venueNodes = filterNodesByType(allNodes, 'Source');

  if (venueNodes.length === 0) {
    // Fall back to treating as regular paths
    return plantGroundTruthPaths(graph, config);
  }

  const plantedPaths: Path<N, E>[] = [];
  const relevanceScores = new Map<string, number>();
  let edgesAdded = 0;
  let totalMI = 0;

  for (let i = 0; i < config.numPaths; i++) {
    if (i + 2 > workNodes.length) {
      break;
    }

    const w1 = workNodes[i]!;
    const w2 = workNodes[i + 1]!;
    const venue = venueNodes[i % venueNodes.length]!;

    // W1 → S (published in) → W2 (published in)
    const edge1Result = addPublicationEdge(graph, w1.id, venue.id, rng);
    const edge2Result = addPublicationEdge(graph, w2.id, venue.id, rng);

    if (edge1Result) {
      edgesAdded++;
      totalMI += edge1Result.weight;
    }

    if (edge2Result) {
      edgesAdded++;
      totalMI += edge2Result.weight;
    }

    // Build path object
    if (edge1Result && edge2Result) {
      const path: Path<N, E> = {
        nodes: [w1, venue, w2],
        edges: [edge1Result.edge, edge2Result.edge],
        totalWeight: edge1Result.weight + edge2Result.weight,
      };
      plantedPaths.push(path);

      const avgMI = (edge1Result.weight + edge2Result.weight) / 2;
      const pathId = path.nodes.map(n => n.id).join('→');
      relevanceScores.set(pathId, avgMI);
    }
  }

  return {
    graph,
    groundTruthPaths: plantedPaths,
    relevanceScores,
    metadata: {
      nodesAdded: 0,
      edgesAdded,
      avgPathMI: plantedPaths.length > 0 ? totalMI / plantedPaths.length : 0,
    },
  };
};

/**
 * Add citation edge with MI-based weight.
 * Returns the edge and weight if added, null if already existed.
 */
const addCitationEdge = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  source: string,
  target: string,
  rng: SeededRandom
): { edge: E; weight: number } | null => {
  const edgeId = `citation_${source}_${target}`;

  // Check if edge exists by trying to get it
  const existing = graph.getEdge(edgeId);
  if (existing.some) {
    return null; // Edge already exists
  }

  const weight = 0.5 + rng.nextDouble() * 0.5; // High MI for citations
  const edge: E = {
    id: edgeId,
    source,
    target,
    weight,
  } as E;

  graph.addEdge(edge);
  return { edge, weight };
};

/**
 * Add authorship edge with MI-based weight.
 * Returns the edge and weight if added, null if already existed.
 */
const addAuthorshipEdge = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  workId: string,
  authorId: string,
  rng: SeededRandom
): { edge: E; weight: number } | null => {
  const edgeId = `authorship_${workId}_${authorId}`;

  // Check if edge exists
  const existing = graph.getEdge(edgeId);
  if (existing.some) {
    return null;
  }

  const weight = 0.6 + rng.nextDouble() * 0.4; // High MI for authorship
  const edge: E = {
    id: edgeId,
    source: workId,
    target: authorId,
    weight,
  } as E;

  graph.addEdge(edge);
  return { edge, weight };
};

/**
 * Add publication edge with MI-based weight.
 * Returns the edge and weight if added, null if already existed.
 */
const addPublicationEdge = <N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  workId: string,
  sourceId: string,
  rng: SeededRandom
): { edge: E; weight: number } | null => {
  const edgeId = `publication_${workId}_${sourceId}`;

  // Check if edge exists
  const existing = graph.getEdge(edgeId);
  if (existing.some) {
    return null;
  }

  const weight = 0.4 + rng.nextDouble() * 0.6; // Moderate MI for venue association
  const edge: E = {
    id: edgeId,
    source: workId,
    target: sourceId,
    weight,
  } as E;

  graph.addEdge(edge);
  return { edge, weight };
};

/**
 * Filter nodes to work/authorship type.
 * @param nodes
 */
const filterWorkNodes = <N extends Node>(nodes: N[]): N[] => filterNodesByType(nodes, 'Work');

/**
 * Filter nodes by entity type.
 * @param nodes
 * @param entityType
 */
const filterNodesByType = <N extends Node>(nodes: N[], entityType: string): N[] => nodes.filter(node => {
    if ('type' in node && typeof node.type === 'string') {
      return node.type === entityType;
    }
    if ('entityType' in node && typeof node.entityType === 'string') {
      return node.entityType === entityType;
    }
    return false;
  });

/**
 * Seeded random number generator.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Generate random number in [0, 1).
   */
  nextDouble(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm.
   * @param array
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextDouble() * (i + 1));
      [result[i]!, result[j]!] = [result[j]!, result[i]!];
    }
    return result;
  }
}
