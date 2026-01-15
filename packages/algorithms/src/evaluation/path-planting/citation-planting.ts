/**
 * Citation network path planting
 *
 * Models real citation patterns for academic graph evaluation
 */

import type { Edge, Node } from '../../types/graph';
import { Graph } from '../../graph/graph';
import type { Path } from '../../types/algorithm-results';
import { plantGroundTruthPaths, type PlantedPathConfig } from './path-generator';

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
 * @returns Graph with planted citation paths
 */
export function plantCitationPaths<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  pathType: CitationPathType,
  config: CitationPathConfig<N, E>
) {
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
}

/**
 * Plant direct citation chains (W1 → W2 → W3).
 */
function plantDirectCitationChains<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
) {
  const chainLength = 3; // W1 → W2 → W3

  for (let i = 0; i < config.numPaths; i++) {
    const startIdx = i * chainLength;
    if (startIdx + chainLength > nodes.length) {
      break;
    }

    const w1 = nodes[startIdx]!;
    const w2 = nodes[startIdx + 1]!;
    const w3 = nodes[startIdx + 2]!;

    // Add citation edges
    addCitationEdge(graph, w1.id, w2.id, rng);
    addCitationEdge(graph, w2.id, w3.id, rng);
  }

  return graph;
}

/**
 * Plant co-citation bridges (W1 ← W2 → W3).
 */
function plantCoCitationBridges<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
) {
  for (let i = 0; i < config.numPaths; i++) {
    const idx = i * 3;
    if (idx + 3 > nodes.length) {
      break;
    }

    const w1 = nodes[idx]!;
    const w2 = nodes[idx + 1]!;
    const w3 = nodes[idx + 2]!;

    // W2 cites both W1 and W3 (co-citation)
    addCitationEdge(graph, w2.id, w1.id, rng);
    addCitationEdge(graph, w2.id, w3.id, rng);
  }

  return graph;
}

/**
 * Plant bibliographic coupling (W1 → W2 ← W3).
 */
function plantBibliographicCoupling<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  nodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
) {
  for (let i = 0; i < config.numPaths; i++) {
    const idx = i * 3;
    if (idx + 3 > nodes.length) {
      break;
    }

    const w1 = nodes[idx]!;
    const w2 = nodes[idx + 1]!;
    const w3 = nodes[idx + 2]!;

    // Both W1 and W3 cite W2 (bibliographic coupling)
    addCitationEdge(graph, w1.id, w2.id, rng);
    addCitationEdge(graph, w3.id, w2.id, rng);
  }

  return graph;
}

/**
 * Plant author-mediated paths (W1 → A → W2).
 */
function plantAuthorMediatedPaths<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  allNodes: N[],
  workNodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
) {
  // Find author nodes
  const authorNodes = filterNodesByType(allNodes, 'Author');

  if (authorNodes.length === 0) {
    // Fall back to treating as regular paths
    return plantGroundTruthPaths(graph, config);
  }

  for (let i = 0; i < config.numPaths; i++) {
    if (i + 2 > workNodes.length) {
      break;
    }

    const w1 = workNodes[i]!;
    const w2 = workNodes[i + 1]!;
    const author = authorNodes[i % authorNodes.length]!;

    // W1 → A (authored) → W2 (authored)
    addAuthorshipEdge(graph, w1.id, author.id, rng);
    addAuthorshipEdge(graph, w2.id, author.id, rng);
  }

  return graph;
}

/**
 * Plant venue-mediated paths (W1 → S → W2).
 */
function plantVenueMediatedPaths<N extends Node, E extends Edge>(
  graph: Graph<N, E>,
  allNodes: N[],
  workNodes: N[],
  config: PlantedPathConfig<N, E>,
  rng: SeededRandom
) {
  // Find source/venue nodes
  const venueNodes = filterNodesByType(allNodes, 'Source');

  if (venueNodes.length === 0) {
    // Fall back to treating as regular paths
    return plantGroundTruthPaths(graph, config);
  }

  for (let i = 0; i < config.numPaths; i++) {
    if (i + 2 > workNodes.length) {
      break;
    }

    const w1 = workNodes[i]!;
    const w2 = workNodes[i + 1]!;
    const venue = venueNodes[i % venueNodes.length]!;

    // W1 → S (published in) → W2 (published in)
    addPublicationEdge(graph, w1.id, venue.id, rng);
    addPublicationEdge(graph, w2.id, venue.id, rng);
  }

  return graph;
}

/**
 * Add citation edge with MI-based weight.
 */
function addCitationEdge<N extends Node, E extends Edge>(graph: Graph<N, E>, source: string, target: string, rng: SeededRandom) {
  const edgeId = `citation_${source}_${target}`;

  // Check if edge exists by trying to get it
  const existing = graph.getEdge(edgeId);
  if (existing.some) {
    return; // Edge already exists
  }

  const edge: E = {
    id: edgeId,
    source,
    target,
    weight: 0.5 + rng.nextDouble() * 0.5, // High MI for citations
  } as E;

  graph.addEdge(edge);
}

/**
 * Add authorship edge with MI-based weight.
 */
function addAuthorshipEdge<N extends Node, E extends Edge>(graph: Graph<N, E>, workId: string, authorId: string, rng: SeededRandom) {
  const edgeId = `authorship_${workId}_${authorId}`;

  // Check if edge exists
  const existing = graph.getEdge(edgeId);
  if (existing.some) {
    return;
  }

  const edge: E = {
    id: edgeId,
    source: workId,
    target: authorId,
    weight: 0.6 + rng.nextDouble() * 0.4, // High MI for authorship
  } as E;

  graph.addEdge(edge);
}

/**
 * Add publication edge with MI-based weight.
 */
function addPublicationEdge<N extends Node, E extends Edge>(graph: Graph<N, E>, workId: string, sourceId: string, rng: SeededRandom) {
  const edgeId = `publication_${workId}_${sourceId}`;

  // Check if edge exists
  const existing = graph.getEdge(edgeId);
  if (existing.some) {
    return;
  }

  const edge: E = {
    id: edgeId,
    source: workId,
    target: sourceId,
    weight: 0.4 + rng.nextDouble() * 0.6, // Moderate MI for venue association
  } as E;

  graph.addEdge(edge);
}

/**
 * Filter nodes to work/authorship type.
 */
function filterWorkNodes<N extends Node>(nodes: N[]): N[] {
  return filterNodesByType(nodes, 'Work');
}

/**
 * Filter nodes by entity type.
 */
function filterNodesByType<N extends Node>(nodes: N[], entityType: string): N[] {
  return nodes.filter(node => {
    if ('type' in node && typeof node.type === 'string') {
      return node.type === entityType;
    }
    if ('entityType' in node && typeof node.entityType === 'string') {
      return node.entityType === entityType;
    }
    return false;
  });
}

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
