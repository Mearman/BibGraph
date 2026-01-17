/**
 * useGraph3DInteractions - Hook for graph interaction handlers
 *
 * Provides event handlers for:
 * - Node click, right-click, hover
 * - Background click
 * - Keyboard navigation (pan, zoom, reset)
 */

import type { GraphNode } from '@bibgraph/types';
import React, { useCallback } from 'react';

import { CAMERA_3D, TIMING } from '../constants';
import type { ForceGraphNode } from './types';

export interface UseGraph3DInteractionsOptions {
  /** Node click handler */
  onNodeClick?: (node: GraphNode) => void;
  /** Node right-click handler (for context menu) */
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Node hover handler */
  onNodeHover?: (node: GraphNode | null) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
  /** Reference to the ForceGraph3D instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graphRef: React.RefObject<any>;
}

export interface UseGraph3DInteractionsReturn {
  /** Handle node click */
  handleNodeClick: (node: ForceGraphNode | null) => void;
  /** Handle node right-click */
  handleNodeRightClick: (node: ForceGraphNode | null, event: MouseEvent) => void;
  /** Handle node hover */
  handleNodeHover: (node: ForceGraphNode | null) => void;
  /** Handle background click */
  handleBackgroundClick: () => void;
  /** Handle keyboard navigation */
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Hook for graph interaction event handlers
 *
 * Wraps ForceGraphNode events to expose the original GraphNode to consumers.
 * Provides keyboard navigation for accessibility (T045).
 * @param root0
 * @param root0.onNodeClick
 * @param root0.onNodeRightClick
 * @param root0.onNodeHover
 * @param root0.onBackgroundClick
 * @param root0.graphRef
 */
export const useGraph3DInteractions = ({
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  onBackgroundClick,
  graphRef,
}: UseGraph3DInteractionsOptions): UseGraph3DInteractionsReturn => {
  const handleNodeClick = useCallback(
    (node: ForceGraphNode | null) => {
      if (node) {
        onNodeClick?.(node.originalNode);
      }
    },
    [onNodeClick]
  );

  const handleNodeRightClick = useCallback(
    (node: ForceGraphNode | null, event: MouseEvent) => {
      if (node) {
        event.preventDefault();
        onNodeRightClick?.(node.originalNode, event);
      }
    },
    [onNodeRightClick]
  );

  const handleNodeHover = useCallback(
    (node: ForceGraphNode | null) => {
      if (node) {
        onNodeHover?.(node.originalNode);
      } else {
        onNodeHover?.(null);
      }
    },
    [onNodeHover]
  );

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  /**
   * Keyboard navigation for accessibility (T045)
   *
   * Controls:
   * - Arrow keys: Pan camera (Shift+Arrow for vertical pan)
   * - +/-: Zoom in/out
   * - Home/R: Reset view (zoom to fit)
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!graphRef.current) return;

      const graph = graphRef.current;
      const cameraPosition = graph.cameraPosition();
      const panDistance = CAMERA_3D.KEYBOARD_PAN_DISTANCE;

      switch (event.key) {
        case 'ArrowUp':
          // Move camera forward (zoom in) or pan up with Shift
          if (event.shiftKey) {
            graph.cameraPosition({ y: cameraPosition.y + panDistance });
          } else {
            const newZ = cameraPosition.z - panDistance;
            graph.cameraPosition({ z: Math.max(newZ, CAMERA_3D.MIN_Z_POSITION) });
          }
          event.preventDefault();
          break;
        case 'ArrowDown':
          // Move camera backward (zoom out) or pan down with Shift
          if (event.shiftKey) {
            graph.cameraPosition({ y: cameraPosition.y - panDistance });
          } else {
            graph.cameraPosition({ z: cameraPosition.z + panDistance });
          }
          event.preventDefault();
          break;
        case 'ArrowLeft':
          // Pan camera left
          graph.cameraPosition({ x: cameraPosition.x - panDistance });
          event.preventDefault();
          break;
        case 'ArrowRight':
          // Pan camera right
          graph.cameraPosition({ x: cameraPosition.x + panDistance });
          event.preventDefault();
          break;
        case 'Home':
        case 'r':
        case 'R':
          // Reset camera to fit graph
          graph.zoomToFit(TIMING.ZOOM_TO_FIT_DURATION_MS, TIMING.ZOOM_TO_FIT_PADDING);
          event.preventDefault();
          break;
        case '+':
        case '=':
          // Zoom in
          graph.cameraPosition({
            z: Math.max(cameraPosition.z - CAMERA_3D.ZOOM_STEP, CAMERA_3D.MIN_Z_POSITION),
          });
          event.preventDefault();
          break;
        case '-':
        case '_':
          // Zoom out
          graph.cameraPosition({ z: cameraPosition.z + CAMERA_3D.ZOOM_STEP });
          event.preventDefault();
          break;
        default:
          break;
      }
    },
    [graphRef]
  );

  return {
    handleNodeClick,
    handleNodeRightClick,
    handleNodeHover,
    handleBackgroundClick,
    handleKeyDown,
  };
};
