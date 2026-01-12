/**
 * Graph Mini-Map Component
 *
 * Provides a small overview map for large graph navigation.
 * Shows viewport rectangle and allows click-to-pan functionality.
 * Automatically shows when graph has more than 100 nodes.
 *
 * @module components/graph/GraphMiniMap
 */

import type { GraphNode } from '@bibgraph/types';
import { Box, BoxProps } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';

const MIN_NODES_TO_SHOW = 100;
const MINimap_SIZE = 150;
const VIEWPORT_COLOR = 'rgba(59, 130, 246, 0.3)';
const VIEWPORT_BORDER = 'rgba(59, 130, 246, 0.8)';
const NODE_COLOR = '#666';

interface GraphMiniMapProps extends Omit<BoxProps, 'children'> {
  /** All graph nodes */
  nodes: GraphNode[];
  /** Graph container dimensions */
  containerWidth: number;
  containerHeight: number;
  /** Current zoom level */
  zoom: number;
  /** Current pan position (center x, y) */
  panX: number;
  panY: number;
  /** Callback when mini-map is clicked (pan to position) */
  onPan: (x: number, y: number) => void;
}

/**
 * Graph Mini-Map Component
 * @param root0
 * @param root0.nodes
 * @param root0.containerWidth
 * @param root0.containerHeight
 * @param root0.zoom
 * @param root0.panX
 * @param root0.panY
 * @param root0.onPan
 */
export const GraphMiniMap: React.FC<GraphMiniMapProps> = ({
  nodes,
  containerWidth,
  containerHeight,
  zoom,
  panX,
  panY,
  onPan,
  ...boxProps
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate node bounds
  const nodeBounds = (() => {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    // Add padding
    const padding = 50;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    };
  })();

  const graphWidth = nodeBounds.maxX - nodeBounds.minX;
  const graphHeight = nodeBounds.maxY - nodeBounds.minY;

  // Calculate scale to fit graph in mini-map
  const scaleX = MINimap_SIZE / graphWidth;
  const scaleY = MINimap_SIZE / graphHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

  // Calculate viewport rectangle in mini-map coordinates
  const viewportWidthInGraph = containerWidth / zoom;
  const viewportHeightInGraph = containerHeight / zoom;

  const viewportRect = {
    x: (panX - viewportWidthInGraph / 2 - nodeBounds.minX) * scale,
    y: (panY - viewportHeightInGraph / 2 - nodeBounds.minY) * scale,
    width: viewportWidthInGraph * scale,
    height: viewportHeightInGraph * scale,
  };

  // Render mini-map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, MINimap_SIZE, MINimap_SIZE);

    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, MINimap_SIZE, MINimap_SIZE);

    // Draw nodes
    ctx.fillStyle = NODE_COLOR;
    nodes.forEach(node => {
      const x = (node.x - nodeBounds.minX) * scale;
      const y = (node.y - nodeBounds.minY) * scale;

      ctx.beginPath();
      ctx.arc(x, y, 1, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw viewport rectangle
    ctx.strokeStyle = VIEWPORT_BORDER;
    ctx.fillStyle = VIEWPORT_COLOR;
    ctx.lineWidth = 1;
    ctx.fillRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);
    ctx.strokeRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);

  }, [nodes, nodeBounds, scale, viewportRect]);

  // Handle click on mini-map to pan
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Convert mini-map coordinates to graph coordinates
    const graphX = (clickX / scale) + nodeBounds.minX;
    const graphY = (clickY / scale) + nodeBounds.minY;

    onPan(graphX, graphY);
  };

  // Don't show if less than threshold nodes
  if (nodes.length < MIN_NODES_TO_SHOW) {
    return null;
  }

  return (
    <Box
      {...boxProps}
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '4px',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s',
        zIndex: 100,
        ...boxProps?.style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <canvas
        ref={canvasRef}
        width={MINimap_SIZE}
        height={MINimap_SIZE}
        onClick={handleCanvasClick}
        style={{ cursor: 'crosshair', display: 'block' }}
      />
    </Box>
  );
};
