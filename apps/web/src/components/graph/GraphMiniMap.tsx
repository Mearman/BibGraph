/**
 * Graph Mini-Map Component
 *
 * Provides a small overview map for large graph navigation.
 * Shows viewport rectangle and allows click-to-pan functionality.
 * Automatically shows when graph has more than 100 nodes.
 */

import type { GraphNode } from '@bibgraph/types';
import type { BoxProps } from '@mantine/core';
import { Box } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';

const MIN_NODES_TO_SHOW = 100;
const MINimap_SIZE = 150;
const VIEWPORT_COLOR = 'rgba(59, 130, 246, 0.3)';
const VIEWPORT_BORDER = 'rgba(59, 130, 246, 0.8)';
const NODE_COLOR = '#666';

interface GraphMiniMapProperties extends Omit<BoxProps, 'children'> {
  /**
  All graph nodes
   */
  nodes: GraphNode[];
  /**
  Graph container dimensions
   */
  containerWidth: number;
  containerHeight: number;
  /**
  Current zoom level
   */
  zoom: number;
  /**
  Current pan position (center x, y)
   */
  panX: number;
  panY: number;
  /**
  Callback when mini-map is clicked (pan to position)
   */
  onPan: (x: number, y: number) => void;
}

/**
 * Graph Mini-Map Component
 */
export const GraphMiniMap: React.FC<GraphMiniMapProperties> = ({
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

    for (const node of nodes) {
      const x = node.x;
      const y = node.y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

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

  const viewportRect = useMemo(() => ({
    x: (panX - viewportWidthInGraph / 2 - nodeBounds.minX) * scale,
    y: (panY - viewportHeightInGraph / 2 - nodeBounds.minY) * scale,
    width: viewportWidthInGraph * scale,
    height: viewportHeightInGraph * scale,
  }), [panX, panY, viewportWidthInGraph, viewportHeightInGraph, nodeBounds, scale]);

  // Render mini-map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear canvas
    context.clearRect(0, 0, MINimap_SIZE, MINimap_SIZE);

    // Draw background
    context.fillStyle = '#f8f9fa';
    context.fillRect(0, 0, MINimap_SIZE, MINimap_SIZE);

    // Draw nodes
    context.fillStyle = NODE_COLOR;
    for (const node of nodes) {
      const x = (node.x - nodeBounds.minX) * scale;
      const y = (node.y - nodeBounds.minY) * scale;

      context.beginPath();
      context.arc(x, y, 1, 0, 2 * Math.PI);
      context.fill();
    }

    // Draw viewport rectangle
    context.strokeStyle = VIEWPORT_BORDER;
    context.fillStyle = VIEWPORT_COLOR;
    context.lineWidth = 1;
    context.fillRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);
    context.strokeRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);

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
      style={[
        {
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
        },
        boxProps.style,
      ]}
      onMouseEnter={() => { setIsHovered(true); }}
      onMouseLeave={() => { setIsHovered(false); }}
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
