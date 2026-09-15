/**
 * useForceGraph3DData - Hook for transforming graph data for 3D visualization
 *
 * Handles:
 * - Node deduplication
 * - Filter mode node/edge filtering
 * - Graph data transformation to ForceGraphNode/ForceGraphLink format
 * - Highlighted path edge computation
 * - Deterministic seeded random positioning
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { useMemo } from 'react';

import { SIMULATION } from '../constants';
import type { ForceGraphData, ForceGraphLink, ForceGraphNode } from './types';

// Constants for the linear congruential generator below (glibc's classic rand() parameters).
const LCG_MULTIPLIER = 1_103_515_245;
const LCG_INCREMENT = 12_345;
const LCG_MODULUS_MASK = 0x7F_FF_FF_FF;

/**
 * Simple seeded random number generator for deterministic layouts
 */
const seededRandom = (seed: number): () => number => () => {
  seed = (seed * LCG_MULTIPLIER + LCG_INCREMENT) & LCG_MODULUS_MASK;
  return seed / LCG_MODULUS_MASK;
};

const HALF = 0.5;

export interface UseForceGraph3DDataOptions {
  /**
  Input graph nodes
   */
  nodes: GraphNode[];
  /**
  Input graph edges
   */
  edges: GraphEdge[];
  /**
  Set of node IDs to filter (only used in filter mode)
   */
  filterNodeIds?: Set<string>;
  /**
  Random seed for deterministic initial positions
   */
  seed?: number;
}

export interface UseForceGraph3DDataReturn {
  /**
  Transformed graph data for react-force-graph-3d
   */
  graphData: ForceGraphData;
}

/**
 * Hook for transforming graph data for 3D force-directed visualization
 *
 * Responsibilities:
 * - Deduplicates nodes by ID
 * - Filters nodes/edges when in filter mode
 * - Generates deterministic initial 3D positions
 * - Transforms to ForceGraphNode/ForceGraphLink format
 */
export const useForceGraph3DData = ({
  nodes,
  edges,
  filterNodeIds,
  seed,
}: UseForceGraph3DDataOptions): UseForceGraph3DDataReturn => {
  const graphData = useMemo(() => {
    // Always use deterministic seeding for reproducible layouts
    const random = seededRandom(seed ?? SIMULATION.DEFAULT_SEED);

    // Deduplicate nodes by ID (safety net - upstream should already deduplicate)
    const seenNodeIds = new Set<string>();
    const deduplicatedNodes = nodes.filter((n) => {
      if (seenNodeIds.has(n.id)) {
        return false;
      }
      seenNodeIds.add(n.id);
      return true;
    });

    // Filter nodes if filter mode is active
    const filteredNodes =
      filterNodeIds && filterNodeIds.size > 0
        ? deduplicatedNodes.filter((n) => filterNodeIds.has(n.id))
        : deduplicatedNodes;

    const nodeIdSet = new Set(filteredNodes.map((n) => n.id));

    // Filter edges to only include those between visible nodes
    const filteredEdges = edges.filter(
      (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    const forceNodes: ForceGraphNode[] = filteredNodes.map((node) => ({
      id: node.id,
      entityType: node.entityType,
      label: node.label,
      entityId: node.entityId,
      // x/y come from the node's existing 2D layout position; z is randomized for the 3D view
      x: node.x,
      y: node.y,
      z: (random() - HALF) * SIMULATION.INITIAL_POSITION_SPREAD,
      originalNode: node,
    }));

    const forceLinks: ForceGraphLink[] = filteredEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      originalEdge: edge,
    }));

    return { nodes: forceNodes, links: forceLinks };
  }, [nodes, edges, filterNodeIds, seed]);

  return { graphData };
};

export interface UseHighlightedPathEdgesOptions {
  /**
  Ordered array of node IDs forming the path
   */
  highlightedPath: string[];
}

export interface UseHighlightedPathEdgesReturn {
  /**
  Set of edge keys in format "source-target" for quick lookup
   */
  highlightedPathEdges: Set<string>;
}

/**
 * Hook for computing highlighted path edges
 *
 * Creates a Set of edge keys for O(1) lookup when rendering edges.
 * Includes both directions since graph might be undirected.
 */
export const useHighlightedPathEdges = ({
  highlightedPath,
}: UseHighlightedPathEdgesOptions): UseHighlightedPathEdgesReturn => {
  const highlightedPathEdges = useMemo(() => {
    const edgeSet = new Set<string>();
    for (let index = 0; index < highlightedPath.length - 1; index++) {
      const source = highlightedPath[index];
      const target = highlightedPath[index + 1];
      // Add both directions since graph might be undirected
      edgeSet.add(`${source}-${target}`);
      edgeSet.add(`${target}-${source}`);
    }
    return edgeSet;
  }, [highlightedPath]);

  return { highlightedPathEdges };
};
