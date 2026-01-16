/**
 * Graph loading utilities for benchmark datasets
 *
 * Supports common graph file formats used in research benchmarks:
 * - Edge list (node1 node2 per line)
 * - Weighted edge list (node1 node2 weight per line)
 * - Triple format (head relation tail) for knowledge graphs
 */

import { Graph } from '@bibgraph/algorithms';
import type { Node, Edge } from '@bibgraph/types';

/**
 * Generic node type for loaded graphs
 */
export interface LoadedNode extends Node {
  id: string;
  type: string;
  label?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Generic edge type for loaded graphs
 */
export interface LoadedEdge extends Edge {
  id: string;
  type: string;
  source: string;
  target: string;
  weight?: number;
  relation?: string;
}

/**
 * Configuration for edge list loading
 */
export interface EdgeListConfig {
  /** Delimiter between fields (default: whitespace) */
  delimiter?: string | RegExp;
  /** Whether graph is directed (default: false) */
  directed?: boolean;
  /** Whether to skip lines starting with # (default: true) */
  skipComments?: boolean;
  /** Number of header lines to skip (default: 0) */
  headerLines?: number;
  /** Default node type (default: 'Node') */
  nodeType?: string;
  /** Column index for source node (default: 0) */
  sourceColumn?: number;
  /** Column index for target node (default: 1) */
  targetColumn?: number;
  /** Column index for edge weight (default: undefined = no weight) */
  weightColumn?: number;
}

/**
 * Configuration for triple/knowledge graph loading
 */
export interface TripleConfig {
  /** Delimiter between fields (default: tab) */
  delimiter?: string | RegExp;
  /** Whether to skip lines starting with # (default: true) */
  skipComments?: boolean;
  /** Number of header lines to skip (default: 0) */
  headerLines?: number;
  /** Column index for head entity (default: 0) */
  headColumn?: number;
  /** Column index for relation (default: 1) */
  relationColumn?: number;
  /** Column index for tail entity (default: 2) */
  tailColumn?: number;
}

/**
 * Result of graph loading operation
 */
export interface LoadResult {
  graph: Graph<LoadedNode, LoadedEdge>;
  nodeCount: number;
  edgeCount: number;
  nodeTypes: Set<string>;
  edgeTypes: Set<string>;
  warnings: string[];
}

/**
 * Load a graph from edge list format
 *
 * Edge list format: one edge per line
 * - Simple: "node1 node2"
 * - Weighted: "node1 node2 weight"
 *
 * @param content - File content as string
 * @param config - Loading configuration
 * @returns Loaded graph with metadata
 */
export function loadEdgeList(content: string, config: EdgeListConfig = {}): LoadResult {
  const {
    delimiter = /\s+/,
    directed = false,
    skipComments = true,
    headerLines = 0,
    nodeType = 'Node',
    sourceColumn = 0,
    targetColumn = 1,
    weightColumn,
  } = config;

  const graph = new Graph<LoadedNode, LoadedEdge>(directed);
  const nodeIds = new Set<string>();
  const warnings: string[] = [];
  let edgeId = 0;

  const lines = content.split('\n');
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    // Skip header lines
    if (lineNumber <= headerLines) continue;

    // Skip empty lines
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip comments
    if (skipComments && trimmed.startsWith('#')) continue;

    // Parse fields
    const fields = trimmed.split(delimiter);

    if (fields.length < 2) {
      warnings.push(`Line ${lineNumber}: insufficient fields (got ${fields.length}, need at least 2)`);
      continue;
    }

    const sourceId = fields[sourceColumn];
    const targetId = fields[targetColumn];

    if (!sourceId || !targetId) {
      warnings.push(`Line ${lineNumber}: missing source or target node ID`);
      continue;
    }

    // Add nodes if not already present
    if (!nodeIds.has(sourceId)) {
      graph.addNode({ id: sourceId, type: nodeType });
      nodeIds.add(sourceId);
    }

    if (!nodeIds.has(targetId)) {
      graph.addNode({ id: targetId, type: nodeType });
      nodeIds.add(targetId);
    }

    // Parse weight if specified
    let weight: number | undefined;
    if (weightColumn !== undefined && fields[weightColumn] !== undefined) {
      weight = parseFloat(fields[weightColumn]);
      if (isNaN(weight)) {
        warnings.push(`Line ${lineNumber}: invalid weight "${fields[weightColumn]}"`);
        weight = undefined;
      }
    }

    // Add edge
    const edgeData: LoadedEdge = {
      id: `e${edgeId++}`,
      source: sourceId,
      target: targetId,
      type: 'edge',
    };

    if (weight !== undefined) {
      edgeData.weight = weight;
    }

    graph.addEdge(edgeData);
  }

  return {
    graph,
    nodeCount: nodeIds.size,
    edgeCount: edgeId,
    nodeTypes: new Set([nodeType]),
    edgeTypes: new Set(['edge']),
    warnings,
  };
}

/**
 * Load a knowledge graph from triple format
 *
 * Triple format: one triple per line
 * - Standard: "head\trelation\ttail"
 *
 * Creates a heterogeneous graph where:
 * - Nodes are entities (head/tail)
 * - Edges have relation types
 *
 * @param content - File content as string
 * @param config - Loading configuration
 * @returns Loaded graph with metadata
 */
export function loadTriples(content: string, config: TripleConfig = {}): LoadResult {
  const {
    delimiter = /\t/,
    skipComments = true,
    headerLines = 0,
    headColumn = 0,
    relationColumn = 1,
    tailColumn = 2,
  } = config;

  // Knowledge graphs are typically directed
  const graph = new Graph<LoadedNode, LoadedEdge>(true);
  const nodeIds = new Set<string>();
  const edgeTypes = new Set<string>();
  const warnings: string[] = [];
  let edgeId = 0;

  const lines = content.split('\n');
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    // Skip header lines
    if (lineNumber <= headerLines) continue;

    // Skip empty lines
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip comments
    if (skipComments && trimmed.startsWith('#')) continue;

    // Parse fields
    const fields = trimmed.split(delimiter);

    if (fields.length < 3) {
      warnings.push(`Line ${lineNumber}: insufficient fields (got ${fields.length}, need at least 3)`);
      continue;
    }

    const headId = fields[headColumn];
    const relation = fields[relationColumn];
    const tailId = fields[tailColumn];

    if (!headId || !relation || !tailId) {
      warnings.push(`Line ${lineNumber}: missing head, relation, or tail`);
      continue;
    }

    // Add nodes if not already present
    if (!nodeIds.has(headId)) {
      graph.addNode({ id: headId, type: 'Entity' });
      nodeIds.add(headId);
    }

    if (!nodeIds.has(tailId)) {
      graph.addNode({ id: tailId, type: 'Entity' });
      nodeIds.add(tailId);
    }

    // Track edge types
    edgeTypes.add(relation);

    // Add edge with relation type
    graph.addEdge({
      id: `e${edgeId++}`,
      source: headId,
      target: tailId,
      type: relation,
      relation,
    });
  }

  return {
    graph,
    nodeCount: nodeIds.size,
    edgeCount: edgeId,
    nodeTypes: new Set(['Entity']),
    edgeTypes,
    warnings,
  };
}

/**
 * Load a graph from file content with auto-detection
 *
 * Attempts to detect format based on content structure:
 * - 3 columns with relation-like middle field → triples
 * - 2-3 columns with numeric third field → weighted edge list
 * - 2 columns → edge list
 *
 * @param content - File content as string
 * @param hint - Optional format hint ('edge-list' | 'triples')
 * @returns Loaded graph with metadata
 */
export function loadGraph(
  content: string,
  hint?: 'edge-list' | 'triples' | 'weighted-edge-list'
): LoadResult {
  // Use hint if provided
  if (hint === 'triples') {
    return loadTriples(content);
  }

  if (hint === 'edge-list') {
    return loadEdgeList(content);
  }

  if (hint === 'weighted-edge-list') {
    return loadEdgeList(content, { weightColumn: 2 });
  }

  // Auto-detect based on content
  const lines = content.split('\n').filter((l) => {
    const trimmed = l.trim();
    return trimmed && !trimmed.startsWith('#');
  });

  if (lines.length === 0) {
    return {
      graph: new Graph<LoadedNode, LoadedEdge>(false),
      nodeCount: 0,
      edgeCount: 0,
      nodeTypes: new Set(),
      edgeTypes: new Set(),
      warnings: ['Empty file or only comments'],
    };
  }

  // Sample first non-comment line
  const sampleLine = lines[0];
  const fields = sampleLine.split(/\s+/);

  // If 3 fields and middle field doesn't look numeric, assume triples
  if (fields.length >= 3) {
    const middleField = fields[1];
    const isNumeric = !isNaN(parseFloat(middleField));

    if (!isNumeric) {
      // Middle field looks like a relation name
      return loadTriples(content, { delimiter: /\s+/ });
    }
  }

  // Default to edge list
  return loadEdgeList(content);
}

/**
 * Load graph from a URL (for downloading benchmark datasets)
 *
 * @param url - URL to fetch graph data from
 * @param hint - Optional format hint
 * @returns Promise resolving to loaded graph with metadata
 */
export async function loadGraphFromUrl(
  url: string,
  hint?: 'edge-list' | 'triples' | 'weighted-edge-list'
): Promise<LoadResult> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  return loadGraph(content, hint);
}
