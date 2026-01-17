/**
 * useGraphLayout - Hook for applying layout algorithms to graph nodes
 *
 * Provides layout calculation and application for different graph layout types:
 * - Force-directed (default, handled by react-force-graph)
 * - Hierarchical/tree layout
 * - Circular layout
 * - Bipartite layout
 * - Timeline layout
 *
 * @module hooks/use-graph-layout
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
  /** Start angle in radians (default: 0) */
  startAngle?: number;
  /** Radius of the circle */
  radius?: number;
}

/**
 * Bipartite layout options (two-column layout)
 */
export interface BipartiteLayoutOptions {
  /** Horizontal spacing between columns */
  columnSpacing?: number;
  /** Function to determine which column a node belongs to */
  getColumn: (node: GraphNode) => 'left' | 'right';
  /** Vertical spacing between nodes */
  nodeSpacing?: number;
}

/**
 * Timeline layout options
 */
export interface TimelineLayoutOptions {
  /** Function to extract timestamp from node */
  getTimestamp: (node: GraphNode) => number;
  /** Vertical spacing between nodes at same time */
  nodeSpacing?: number;
  /** Horizontal spacing between time points */
  timeSpacing?: number;
}

/**
 * Apply circular layout to nodes
 * @param nodes
 * @param edges
 * @param options
 */
const applyCircularLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: CircularLayoutOptions = {}
): Map<GraphNode, { x: number; y: number }> => {
  const radius = options.radius ?? 300;
  const startAngle = options.startAngle ?? 0;
  const positionMap = new Map<GraphNode, { x: number; y: number }>();

  nodes.forEach((node, index) => {
    const angle = startAngle + (2 * Math.PI * index) / nodes.length;
    positionMap.set(node, {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  });

  return positionMap;
};

/**
 * Apply bipartite layout to nodes
 * @param nodes
 * @param edges
 * @param options
 */
const applyBipartiteLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: BipartiteLayoutOptions
): Map<GraphNode, { x: number; y: number }> => {
  const columnSpacing = options.columnSpacing ?? 200;
  const nodeSpacing = options.nodeSpacing ?? 80;
  const positionMap = new Map<GraphNode, { x: number; y: number }>();

  // Separate nodes into two columns
  const leftColumn: GraphNode[] = [];
  const rightColumn: GraphNode[] = [];

  nodes.forEach((node) => {
    if (options.getColumn(node) === 'left') {
      leftColumn.push(node);
    } else {
      rightColumn.push(node);
    }
  });

  // Position left column
  leftColumn.forEach((node, index) => {
    const y = (index - (leftColumn.length - 1) / 2) * nodeSpacing;
    positionMap.set(node, { x: 0, y });
  });

  // Position right column
  rightColumn.forEach((node, index) => {
    const y = (index - (rightColumn.length - 1) / 2) * nodeSpacing;
    positionMap.set(node, { x: columnSpacing, y });
  });

  return positionMap;
};

/**
 * Apply timeline layout to nodes
 * @param nodes
 * @param edges
 * @param options
 */
const applyTimelineLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: TimelineLayoutOptions
): Map<GraphNode, { x: number; y: number }> => {
  const timeSpacing = options.timeSpacing ?? 100;
  const nodeSpacing = options.nodeSpacing ?? 50;
  const positionMap = new Map<GraphNode, { x: number; y: number }>();

  // Group nodes by timestamp
  const timeGroups = new Map<number, GraphNode[]>();
  nodes.forEach((node) => {
    const timestamp = options.getTimestamp(node);
    if (!timeGroups.has(timestamp)) {
      timeGroups.set(timestamp, []);
    }
    const group = timeGroups.get(timestamp);
    if (group) {
      group.push(node);
    }
  });

  // Position nodes
  let xOffset = 0;
  const sortedTimes = [...timeGroups.keys()].sort((a, b) => a - b);

  sortedTimes.forEach((timestamp) => {
    const groupNodes = timeGroups.get(timestamp) ?? [];
    const groupHeight = (groupNodes.length - 1) * nodeSpacing;
    const startY = -groupHeight / 2;

    groupNodes.forEach((node, index) => {
      positionMap.set(node, {
        x: xOffset,
        y: startY + index * nodeSpacing,
      });
    });

    xOffset += timeSpacing;
  });

  return positionMap;
};

/**
 * Hook for applying graph layouts
 * @param nodes Graph nodes
 * @param edges Graph edges
 * @param initialLayout Initial layout type
 */
export const useGraphLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
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
        const result = hierarchicalLayout(nodes, edges, layoutOptions as HierarchicalLayoutOptions);
        positionMap = new Map();
        result.nodes.forEach(({ node, x, y }) => {
          positionMap.set(node, { x, y });
        });
        break;
      }
      case 'circular': {
        positionMap = applyCircularLayout(nodes, edges, layoutOptions as CircularLayoutOptions);
        break;
      }
      case 'bipartite': {
        if (!layoutOptions || !('getColumn' in layoutOptions)) {
          throw new Error('Bipartite layout requires getColumn option');
        }
        positionMap = applyBipartiteLayout(nodes, edges, layoutOptions as BipartiteLayoutOptions);
        break;
      }
      case 'timeline': {
        if (!layoutOptions || !('getTimestamp' in layoutOptions)) {
          throw new Error('Timeline layout requires getTimestamp option');
        }
        positionMap = applyTimelineLayout(nodes, edges, layoutOptions as TimelineLayoutOptions);
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
  const applyHierarchicalLayout = useCallback((options: HierarchicalLayoutOptions = {}) => {
    setCurrentLayout('hierarchical');
    return applyLayout('hierarchical', options);
  }, [applyLayout]);

  /**
   * Apply circular layout with options
   */
  const applyCircularLayoutFn = useCallback((options: CircularLayoutOptions = {}) => {
    setCurrentLayout('circular');
    return applyLayout('circular', options);
  }, [applyLayout]);

  /**
   * Apply bipartite layout with options
   */
  const applyBipartiteLayoutFn = useCallback((options: BipartiteLayoutOptions) => {
    setCurrentLayout('bipartite');
    return applyLayout('bipartite', options);
  }, [applyLayout]);

  /**
   * Apply timeline layout with options
   */
  const applyTimelineLayoutFn = useCallback((options: TimelineLayoutOptions) => {
    setCurrentLayout('timeline');
    return applyLayout('timeline', options);
  }, [applyLayout]);

  return useMemo(() => ({
    applyBipartiteLayout: applyBipartiteLayoutFn,
    applyCircularLayout: applyCircularLayoutFn,
    applyHierarchicalLayout,
    applyLayout,
    applyTimelineLayout: applyTimelineLayoutFn,
    currentLayout,
    enableSimulation,
    setCurrentLayout: setLayout,
  }), [
    currentLayout,
    setLayout,
    enableSimulation,
    applyLayout,
    applyHierarchicalLayout,
    applyCircularLayoutFn,
    applyBipartiteLayoutFn,
    applyTimelineLayoutFn,
  ]);
}
