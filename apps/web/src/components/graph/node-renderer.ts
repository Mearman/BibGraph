/**
 * Graph node rendering utilities
 * Applies conditional styling based on node metadata (xpac, unverified authors)
 *
 * User Story 2 (T026): Apply conditional node styling in graph renderer
 *
 * This module provides utilities for rendering graph nodes with conditional styling
 * for various graph visualization libraries (react-force-graph, XYFlow, D3, etc.)
 */

import type { GraphNode } from "@bibgraph/types";
import type { Mesh as ThreeMesh, MeshLambertMaterial as ThreeMeshLambertMaterial, SphereGeometry as ThreeSphereGeometry } from "three";

import {
  getConditionalNodeStyle,
  getNodeAccessibilityLabel,
  type NodeStyleProperties,
} from "./node-styles";

// Minimum zoom level at which node labels become legible enough to render.
const LABEL_VISIBILITY_ZOOM_THRESHOLD = 0.8;
// Base font size (px) for node labels at 1x zoom, scaled down as the view zooms out.
const LABEL_FONT_SIZE_PX = 12;

/**
 * Canvas rendering function for react-force-graph-2d/3d
 * Renders a node on a canvas with conditional styling
 * @param node - Graph node to render
 * @param ctx - Canvas 2D rendering context
 * @param globalScale - Current zoom level (for adaptive rendering)
 */
export const renderNodeOnCanvas = (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number): void => {
  const NODE_RADIUS = 5;
  const style = getConditionalNodeStyle(node);

  // Save canvas state
  ctx.save();

  // Set fill style
  ctx.fillStyle = style.fill ?? 'var(--mantine-color-blue-6)';
  ctx.globalAlpha = style.fillOpacity ?? style.opacity ?? 1;

  // Draw node circle
  ctx.beginPath();
  ctx.arc(node.x, node.y, NODE_RADIUS, 0, 2 * Math.PI, false);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = style.stroke ?? 'var(--mantine-color-blue-filled)';
  ctx.lineWidth = (style.strokeWidth ?? 2) / globalScale;

  // Handle dashed borders for xpac works
  if (style.strokeDasharray !== undefined) {
    const dashArray = style.strokeDasharray.split(',').map(Number);
    ctx.setLineDash(dashArray);
  } else {
    ctx.setLineDash([]); // Solid line
  }

  ctx.stroke();

  // Restore canvas state
  ctx.restore();
};

/**
 * SVG element generator for SVG-based renderers
 * Returns SVG element attributes for conditional styling
 * @param node - Graph node
 * @returns SVG attributes object
 */
export const getSvgNodeAttributes = (node: GraphNode): Record<string, string | number> => {
  const style = getConditionalNodeStyle(node);

  return {
    fill: style.fill ?? 'var(--mantine-color-blue-6)',
    stroke: style.stroke ?? 'var(--mantine-color-blue-filled)',
    'stroke-width': style.strokeWidth ?? 2,
    'stroke-dasharray': style.strokeDasharray ?? 'none',
    opacity: style.fillOpacity ?? style.opacity ?? 1,
    'aria-label': getNodeAccessibilityLabel(node),
    ...(style['data-xpac'] !== undefined && { 'data-xpac': style['data-xpac'] }),
    ...(style['data-unverified-author'] !== undefined && {
      'data-unverified-author': style['data-unverified-author'],
    }),
  };
};

/**
 * DOM element styling for DOM-based renderers (e.g., XYFlow)
 * Returns CSS style object for conditional styling
 * @param node - Graph node
 * @returns React CSSProperties object
 */
export const getDomNodeStyle = (node: GraphNode): React.CSSProperties => {
  const style = getConditionalNodeStyle(node);

  return {
    border: style.border ?? `2px solid ${style.stroke ?? 'var(--mantine-color-blue-filled)'}`,
    borderStyle: style.borderStyle ?? (style.strokeDasharray !== undefined ? 'dashed' : 'solid'),
    backgroundColor: style.backgroundColor ?? style.fill ?? 'var(--mantine-color-blue-6)',
    opacity: style.opacity ?? 1,
    // Data attributes for testing
    ...(style['data-xpac'] !== undefined && { 'data-xpac': style['data-xpac'] }),
    ...(style['data-unverified-author'] !== undefined && {
      'data-unverified-author': style['data-unverified-author'],
    }),
  };
};

/**
 * Color accessor function for react-force-graph
 * Returns the fill color for a node based on its metadata
 * @param node - Graph node
 * @returns Hex color string
 */
export const getNodeColor = (node: GraphNode): string => {
  const style = getConditionalNodeStyle(node);
  return style.fill ?? 'var(--mantine-color-blue-6)';
};

/**
 * Node canvas object function for react-force-graph
 * Custom canvas rendering function that replaces default node rendering
 *
 * This is the main integration point for react-force-graph-2d
 * @returns Function compatible with ForceGraph2D's nodeCanvasObject property
 * @example
 * ```tsx
 * <ForceGraph2D
 *   nodeCanvasObject={createNodeCanvasObjectFunction()}
 *   nodePointerAreaPaint={createNodePointerAreaPaintFunction()}
 * />
 * ```
 */
export const createNodeCanvasObjectFunction = () => (node: GraphNode, context: CanvasRenderingContext2D, globalScale: number): void => {
    renderNodeOnCanvas(node, context, globalScale);

    // Optionally render label at higher zoom levels
    if (globalScale > LABEL_VISIBILITY_ZOOM_THRESHOLD) {
      const style = getConditionalNodeStyle(node);
      const NODE_RADIUS = 5;

      context.fillStyle = style.stroke ?? 'var(--mantine-color-blue-filled)';
      context.font = `${String(LABEL_FONT_SIZE_PX / globalScale)}px Sans-Serif`;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      context.fillText(node.label, node.x, node.y + NODE_RADIUS + 2);
    }
  };

/**
 * Node pointer area paint function for react-force-graph
 * Defines the clickable/hoverable area for nodes
 * @returns Function compatible with ForceGraph2D's nodePointerAreaPaint property
 * @example
 * ```tsx
 * <ForceGraph2D
 *   nodePointerAreaPaint={createNodePointerAreaPaintFunction()}
 * />
 * ```
 */
export const createNodePointerAreaPaintFunction = () => (node: GraphNode, color: string, context: CanvasRenderingContext2D): void => {
    const NODE_RADIUS = 5;
    const HOVER_RADIUS = NODE_RADIUS + 2; // Slightly larger for easier clicking

    context.fillStyle = color;
    context.beginPath();
    context.arc(node.x, node.y, HOVER_RADIUS, 0, 2 * Math.PI, false);
    context.fill();
  };

/**
 * Three.js node object generator for react-force-graph-3d
 * Creates a Three.js mesh for 3D node rendering with conditional styling
 *
 * Note: Requires three.js imports to be available
 * @param node - Graph node
 * @returns Three.js Mesh (requires three.js in scope)
 * @example
 * ```tsx
 * import * as THREE from 'three';
 *
 * <ForceGraph3D
 *   nodeThreeObject={(node) => createNodeThreeObject(node as GraphNode, THREE)}
 * />
 * ```
 */
export const createNodeThreeObject = (node: GraphNode, THREE: {
    SphereGeometry: typeof ThreeSphereGeometry;
    MeshLambertMaterial: typeof ThreeMeshLambertMaterial;
    Mesh: typeof ThreeMesh;
  }): InstanceType<typeof THREE.Mesh> => {
  const style = getConditionalNodeStyle(node);
  const NODE_RADIUS = 5;

  const geometry = new THREE.SphereGeometry(NODE_RADIUS);
  const material = new THREE.MeshLambertMaterial({
    color: style.fill ?? 'var(--mantine-color-blue-6)',
    opacity: style.fillOpacity ?? style.opacity ?? 1,
    transparent: (style.fillOpacity ?? style.opacity ?? 1) < 1,
    // Note: Dashed lines not easily supported in Three.js materials
    // Would require custom shader or wireframe approach
  });

  return new THREE.Mesh(geometry, material);
};

/**
 * Integration helper for applying styles to any graph node element
 * Provides a unified interface for all rendering approaches
 * @param node - Graph node
 * @param rendererType - Type of renderer being used
 * @returns Style properties appropriate for the renderer
 */
export const applyConditionalNodeStyling = (node: GraphNode, rendererType: 'canvas' | 'svg' | 'dom' | 'three'): NodeStyleProperties | React.CSSProperties => {
  switch (rendererType) {
    case 'canvas':
      // Return render function for canvas
      return getConditionalNodeStyle(node);

    case 'svg':
      // Return SVG attributes
      return getSvgNodeAttributes(node);

    case 'dom':
      // Return CSS properties
      return getDomNodeStyle(node);

    case 'three':
      // Return style properties (caller will need to create Three.js object)
      return getConditionalNodeStyle(node);

    default:
      return getConditionalNodeStyle(node);
  }
};
