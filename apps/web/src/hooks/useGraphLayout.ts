/**
 * useGraphLayout - Hook for applying layout algorithms to graph nodes
 *
 * Provides layout calculation and application for different graph layout types:
 * - Force-directed (default, handled by react-force-graph)
 * - Hierarchical/tree layout
 * - Circular layout
 * - Bipartite layout
 * - Timeline layout
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { useCallback, useMemo, useState } from 'react';

import { hierarchicalLayout, type HierarchicalLayoutOptions } from '@/utils/hierarchical-layout';

/**
 * Supported layout types
 */
export type GraphLayoutType = 'force' | 'hierarchical' | 'circular' | 'bipartite' | 'timeline';

/**
 * Layout configuration by type
 */
export interface LayoutConfig {
  options?: HierarchicalLayoutOptions | CircularLayoutOptions | BipartiteLayoutOptions | TimelineLayoutOptions;
  type: GraphLayoutType;
}

/**
 * Circular layout options
 */
export interface CircularLayoutOptions {
  /**
  Start angle in radians (default: 0)
   */
  startAngle?: number;
  /**
  Radius of the circle
   */
  radius?: number;
}

/**
 * Bipartite layout options (two-column layout)
 */
export interface BipartiteLayoutOptions {
  /**
  Horizontal spacing between columns
   */
  columnSpacing?: number;
  /**
  Function to determine which column a node belongs to
   */
  getColumn: (node: GraphNode) => 'left' | 'right';
  /**
  Vertical spacing between nodes
   */
  nodeSpacing?: number;
}

/**
 * Timeline layout options
 */
export interface TimelineLayoutOptions {
  /**
  Function to extract timestamp from node
   */
  getTimestamp: (node: GraphNode) => number;
  /**
  Vertical spacing between nodes at same time
   */
  nodeSpacing?: number;
  /**
  Horizontal spacing between time points
   */
  timeSpacing?: number;
}

/**
 * The four layout-specific options types are all-optional and share no property names with each other except `nodeSpacing`, so TypeScript can't narrow the combined union to a single member by control flow alone - `applyLayout` only knows which shape is correct via the separate `layoutType` argument, not from the `layoutOptions` value itself. These helpers extract exactly the fields each layout algorithm reads, narrowing per-property via `in` (the same technique `applyBipartiteLayout`/`applyTimelineLayout`'s required-field checks already use below).
 */
type AnyLayoutOptions =
  | HierarchicalLayoutOptions
  | CircularLayoutOptions
  | BipartiteLayoutOptions
  | TimelineLayoutOptions;

const toHierarchicalLayoutOptions = (
  options: AnyLayoutOptions | undefined
): HierarchicalLayoutOptions | undefined => {
  if (options === undefined) return undefined;
  const narrowed: HierarchicalLayoutOptions = {};
  if ('levelSpacing' in options) narrowed.levelSpacing = options.levelSpacing;
  if ('nodeSpacing' in options) narrowed.nodeSpacing = options.nodeSpacing;
  if ('rootNodeId' in options) narrowed.rootNodeId = options.rootNodeId;
  if ('direction' in options) narrowed.direction = options.direction;
  return narrowed;
};

const toCircularLayoutOptions = (
  options: AnyLayoutOptions | undefined
): CircularLayoutOptions | undefined => {
  if (options === undefined) return undefined;
  const narrowed: CircularLayoutOptions = {};
  if ('startAngle' in options) narrowed.startAngle = options.startAngle;
  if ('radius' in options) narrowed.radius = options.radius;
  return narrowed;
};

/**
 * Apply circular layout to nodes
 */
const DEFAULT_CIRCULAR_RADIUS = 300;
const DEFAULT_BIPARTITE_COLUMN_SPACING = 200;
const DEFAULT_BIPARTITE_NODE_SPACING = 80;
const DEFAULT_TIMELINE_TIME_SPACING = 100;
const DEFAULT_TIMELINE_NODE_SPACING = 50;

const applyCircularLayout = (
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  options: Readonly<CircularLayoutOptions> = {}
): Map<GraphNode, { x: number; y: number }> => {
  const radius = options.radius ?? DEFAULT_CIRCULAR_RADIUS;
  const startAngle = options.startAngle ?? 0;
  const positionMap = new Map<GraphNode, { x: number; y: number }>();

  for (const [index, node] of nodes.entries()) {
    const angle = startAngle + (2 * Math.PI * index) / nodes.length;
    positionMap.set(node, {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  return positionMap;
};

/**
 * Apply bipartite layout to nodes
 */
const applyBipartiteLayout = (
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  options: Readonly<BipartiteLayoutOptions>
): Map<GraphNode, { x: number; y: number }> => {
  const columnSpacing = options.columnSpacing ?? DEFAULT_BIPARTITE_COLUMN_SPACING;
  const nodeSpacing = options.nodeSpacing ?? DEFAULT_BIPARTITE_NODE_SPACING;
  const positionMap = new Map<GraphNode, { x: number; y: number }>();

  // Separate nodes into two columns
  const leftColumn: GraphNode[] = [];
  const rightColumn: GraphNode[] = [];

  for (const node of nodes) {
    if (options.getColumn(node) === 'left') {
      leftColumn.push(node);
    } else {
      rightColumn.push(node);
    }
  }

  // Position left column
  for (const [index, node] of leftColumn.entries()) {
    const y = (index - (leftColumn.length - 1) / 2) * nodeSpacing;
    positionMap.set(node, { x: 0, y });
  }

  // Position right column
  for (const [index, node] of rightColumn.entries()) {
    const y = (index - (rightColumn.length - 1) / 2) * nodeSpacing;
    positionMap.set(node, { x: columnSpacing, y });
  }

  return positionMap;
};

/**
 * Apply timeline layout to nodes
 */
const applyTimelineLayout = (
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  options: Readonly<TimelineLayoutOptions>
): Map<GraphNode, { x: number; y: number }> => {
  const timeSpacing = options.timeSpacing ?? DEFAULT_TIMELINE_TIME_SPACING;
  const nodeSpacing = options.nodeSpacing ?? DEFAULT_TIMELINE_NODE_SPACING;
  const positionMap = new Map<GraphNode, { x: number; y: number }>();

  // Group nodes by timestamp
  const timeGroups = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const timestamp = options.getTimestamp(node);
    if (!timeGroups.has(timestamp)) {
      timeGroups.set(timestamp, []);
    }
    const group = timeGroups.get(timestamp);
    if (group) {
      group.push(node);
    }
  }

  // Position nodes
  let xOffset = 0;
  const sortedTimes = [...timeGroups.keys()].sort((a, b) => a - b);

  for (const timestamp of sortedTimes) {
    const groupNodes = timeGroups.get(timestamp) ?? [];
    const groupHeight = (groupNodes.length - 1) * nodeSpacing;
    const startY = -groupHeight / 2;

    for (const [index, node] of groupNodes.entries()) {
      positionMap.set(node, {
        x: xOffset,
        y: startY + index * nodeSpacing,
      });
    }

    xOffset += timeSpacing;
  }

  return positionMap;
};

/**
 * Hook for applying graph layouts
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param initialLayout - Initial layout type
 */
export const useGraphLayout = (
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  initialLayout: GraphLayoutType = 'force'
) => {
  const [currentLayout, setCurrentLayout] = useState<GraphLayoutType>(initialLayout);
  const [enableSimulation, setEnableSimulation] = useState(initialLayout === 'force');

  /**
   * Apply the selected layout to nodes
   */
  const applyLayout = useCallback((
    layoutType: GraphLayoutType,
    layoutOptions?: HierarchicalLayoutOptions | CircularLayoutOptions | BipartiteLayoutOptions | TimelineLayoutOptions
  ): Map<string, { x: number; y: number }> => {
    if (layoutType === 'force') {
      // Force layout is handled by react-force-graph simulation
      setEnableSimulation(true);
      return new Map();
    }

    // Disable simulation for static layouts
    setEnableSimulation(false);

    let positionMap: Map<GraphNode, { x: number; y: number }>;

    switch (layoutType) {
      case 'hierarchical': {
        const result = hierarchicalLayout(nodes, edges, toHierarchicalLayoutOptions(layoutOptions));
        positionMap = new Map();
        for (const { node, x, y } of result.nodes) {
          positionMap.set(node, { x, y });
        }
        break;
      }
      case 'circular': {
        positionMap = applyCircularLayout(nodes, edges, toCircularLayoutOptions(layoutOptions));
        break;
      }
      case 'bipartite': {
        if (!layoutOptions || !('getColumn' in layoutOptions)) {
          throw new Error('Bipartite layout requires getColumn option');
        }
        positionMap = applyBipartiteLayout(nodes, edges, layoutOptions);
        break;
      }
      case 'timeline': {
        if (!layoutOptions || !('getTimestamp' in layoutOptions)) {
          throw new Error('Timeline layout requires getTimestamp option');
        }
        positionMap = applyTimelineLayout(nodes, edges, layoutOptions);
        break;
      }
      default:
        return new Map();
    }

    // Convert GraphNode keys to node IDs
    const nodeIdPositionMap = new Map<string, { x: number; y: number }>();
    positionMap.forEach((position, node) => {
      nodeIdPositionMap.set(node.id, position);
    });

    return nodeIdPositionMap;
  }, [nodes, edges]);

  /**
   * Change the current layout type
   */
  const setLayout = useCallback((layoutType: GraphLayoutType) => {
    setCurrentLayout(layoutType);
    setEnableSimulation(layoutType === 'force');
  }, []);

  /**
   * Apply hierarchical layout with options
   */
  const applyHierarchicalLayout = useCallback((options: Readonly<HierarchicalLayoutOptions> = {}) => {
    setCurrentLayout('hierarchical');
    return applyLayout('hierarchical', options);
  }, [applyLayout]);

  /**
   * Apply circular layout with options
   */
  const applyCircularLayoutFunction = useCallback((options: Readonly<CircularLayoutOptions> = {}) => {
    setCurrentLayout('circular');
    return applyLayout('circular', options);
  }, [applyLayout]);

  /**
   * Apply bipartite layout with options
   */
  const applyBipartiteLayoutFunction = useCallback((options: Readonly<BipartiteLayoutOptions>) => {
    setCurrentLayout('bipartite');
    return applyLayout('bipartite', options);
  }, [applyLayout]);

  /**
   * Apply timeline layout with options
   */
  const applyTimelineLayoutFunction = useCallback((options: Readonly<TimelineLayoutOptions>) => {
    setCurrentLayout('timeline');
    return applyLayout('timeline', options);
  }, [applyLayout]);

  return useMemo(() => ({
    applyBipartiteLayout: applyBipartiteLayoutFunction,
    applyCircularLayout: applyCircularLayoutFunction,
    applyHierarchicalLayout,
    applyLayout,
    applyTimelineLayout: applyTimelineLayoutFunction,
    currentLayout,
    enableSimulation,
    setCurrentLayout: setLayout,
  }), [
    currentLayout,
    setLayout,
    enableSimulation,
    applyLayout,
    applyHierarchicalLayout,
    applyCircularLayoutFunction,
    applyBipartiteLayoutFunction,
    applyTimelineLayoutFunction,
  ]);
}
