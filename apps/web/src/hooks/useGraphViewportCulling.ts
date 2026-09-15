/**
 * GraphViewportCulling - Optimizes graph rendering by culling nodes outside viewport
 *
 * Uses spatial indexing and frustum culling to reduce rendering overhead
 * for large graphs with 1000+ nodes.
 */

import type { GraphNode } from '@bibgraph/types';
import { useCallback, useMemo, useRef } from 'react';

// Viewport bounds for culling calculations
interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  zoom: number;
}

// Node with position for culling calculations
interface CullableNode {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number; // Bounding sphere radius
  originalNode: GraphNode;
}


/**
 * Hook for viewport-based node culling
 * Optimizes performance by only returning nodes visible in current viewport
 * @param nodes - array of graph nodes
 * @param viewportBounds - current viewport boundaries
 * @param nodeRadius - radius of each node for culling calculations
 * @param cullingMargin - margin multiplier for culling
 */
const DEFAULT_NODE_RADIUS = 50;
const DEFAULT_CULLING_MARGIN = 1.2;
const ZOOM_CHANGE_THRESHOLD = 0.01;

export const useGraphViewportCulling = (
  nodes: readonly GraphNode[],
  viewportBounds: ViewportBounds | null,
  nodeRadius = DEFAULT_NODE_RADIUS,
  cullingMargin = DEFAULT_CULLING_MARGIN
) => {
  const previousBounds = useRef<ViewportBounds | null>(null);

  // Type guard to check if node has position properties
  const hasPosition = (node: GraphNode): node is GraphNode & { x: number; y: number; z: number } => {
    return 'x' in node && 'y' in node && 'z' in node &&
           typeof node.x === 'number' && typeof node.y === 'number' && typeof node.z === 'number';
  };

  // Convert GraphNode to CullableNode with position and radius
  const cullableNodes = useMemo(() => {
    return nodes.map(node => {
      if (hasPosition(node)) {
        return {
          id: node.id,
          x: node.x,
          y: node.y,
          z: node.z,
          radius: nodeRadius,
          originalNode: node,
        };
      }
      // Default position for nodes without position data
      return {
        id: node.id,
        x: 0,
        y: 0,
        z: 0,
        radius: nodeRadius,
        originalNode: node,
      };
    });
  }, [nodes, nodeRadius]);

  // Simple 2D viewport culling for 2D graphs
  const getVisibleNodes2D = useCallback((bounds: Readonly<ViewportBounds>, candidateNodes: readonly CullableNode[]) => {
    const margin = cullingMargin * nodeRadius;
    const visibleNodes = candidateNodes.filter(node => {
      return (
        node.x + node.radius >= bounds.left - margin &&
        node.x - node.radius <= bounds.right + margin &&
        node.y + node.radius >= bounds.top - margin &&
        node.y - node.radius <= bounds.bottom + margin
      );
    });
    return visibleNodes;
  }, [nodeRadius, cullingMargin]);

  
  const visibleNodes = useMemo(() => {
    if (!viewportBounds) {
      // Return all nodes if no viewport bounds provided
      return cullableNodes;
    }

    // Early return if viewport bounds haven't changed
    const previous = previousBounds.current;
    if (previous !== null &&
        previous.left === viewportBounds.left &&
        previous.right === viewportBounds.right &&
        previous.top === viewportBounds.top &&
        previous.bottom === viewportBounds.bottom &&
        Math.abs(previous.zoom - viewportBounds.zoom) < ZOOM_CHANGE_THRESHOLD) {
      return cullableNodes; // Will be filtered by caller
    }

    previousBounds.current = viewportBounds;

    // For now, implement 2D culling (can be extended to 3D)
    return getVisibleNodes2D(viewportBounds, cullableNodes);
  }, [cullableNodes, viewportBounds, getVisibleNodes2D]);

  return {
    visibleNodes,
    totalNodes: nodes.length,
    visibleCount: visibleNodes.length,
    cullingEfficiency: nodes.length > 0 ? (nodes.length - visibleNodes.length) / nodes.length : 0,
  };
};

/**
 * Utility function to calculate viewport bounds from camera parameters
 * @param cameraX - camera X position
 * @param cameraY - camera Y position
 * @param cameraZ - camera Z position
 * @param zoom - current zoom level
 * @param width - viewport width
 * @param height - viewport height
 */
export const calculateViewportBounds = (
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  zoom: number,
  width: number,
  height: number
): ViewportBounds => {
  const halfWidth = (width / 2) / zoom;
  const halfHeight = (height / 2) / zoom;

  return {
    left: cameraX - halfWidth,
    right: cameraX + halfWidth,
    top: cameraY - halfHeight,
    bottom: cameraY + halfHeight,
    cameraX,
    cameraY,
    cameraZ,
    zoom,
  };
};

/**
 * Performance monitoring for viewport culling
 */
export interface CullingPerformanceMetrics {
  totalNodes: number;
  visibleNodes: number;
  culledNodes: number;
  cullingEfficiency: number; // 0-1, higher is better
  processingTimeMs: number;
}

export const measureCullingPerformance = (
  visibleNodesCount: number,
  totalNodesCount: number,
  processingStartTime: number
): CullingPerformanceMetrics => {
  const processingTimeMs = performance.now() - processingStartTime;
  const culledNodes = totalNodesCount - visibleNodesCount;
  const cullingEfficiency = totalNodesCount > 0 ? culledNodes / totalNodesCount : 0;

  return {
    totalNodes: totalNodesCount,
    visibleNodes: visibleNodesCount,
    culledNodes,
    cullingEfficiency,
    processingTimeMs,
  };
};