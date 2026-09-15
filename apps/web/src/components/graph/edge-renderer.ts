/**
 * Graph edge rendering utilities
 * Applies multi-modal visual distinction for outbound vs inbound relationships
 *
 * User Story 2 (T035): Apply edge styling in graph renderer
 *
 * This module provides utilities for rendering graph edges with directional styling
 * for various graph visualization libraries (react-force-graph, XYFlow, D3, etc.)
 */

import type { GraphEdge } from "@bibgraph/types";

import { RELATIONSHIP_TYPE_COLORS as TYPE_COLORS } from "../../styles/hash-colors";
import {
  type EdgeStyleProperties,
  getEdgeFilteredStyle,
  getEdgeHoverStyle,
  getEdgeStyle,
} from "./edge-styles";

// Fallback opacity for an edge with no explicit style opacity set.
const DEFAULT_EDGE_OPACITY = 0.8;
// Fallback stroke width (px) for an edge with no explicit style width set.
const DEFAULT_STROKE_WIDTH = 2;

/**
 * Type guard for a positioned endpoint (numeric x/y coordinates)
 */
const hasNumericPosition = (endpoint: unknown): endpoint is { x: number; y: number } =>
  typeof endpoint === 'object' &&
  endpoint !== null &&
  'x' in endpoint &&
  typeof endpoint.x === 'number' &&
  'y' in endpoint &&
  typeof endpoint.y === 'number';

/**
 * Canvas rendering function for react-force-graph-2d/3d edges
 * Renders an edge on a canvas with conditional styling based on direction
 * @param edge - Graph edge to render
 * @param sourceNode - Source node position
 * @param targetNode - Target node position
 * @param ctx - Canvas 2D rendering context
 * @param globalScale - Current zoom level (for adaptive rendering)
 */
export const renderEdgeOnCanvas = (edge: GraphEdge, sourceNode: Readonly<{ x: number; y: number }>, targetNode: Readonly<{ x: number; y: number }>, ctx: CanvasRenderingContext2D, globalScale: number): void => {
  const style = getEdgeStyle(edge);

  // Save canvas state
  ctx.save();

  // Set stroke style
  ctx.strokeStyle = style.stroke ?? TYPE_COLORS.RELATED_TO;
  ctx.lineWidth = (style.strokeWidth ?? DEFAULT_STROKE_WIDTH) / globalScale;
  ctx.globalAlpha = style.strokeOpacity ?? style.opacity ?? DEFAULT_EDGE_OPACITY;

  // Handle dashed lines for inbound edges
  if (style.strokeDasharray !== undefined) {
    const dashArray = style.strokeDasharray.split(',').map(Number);
    ctx.setLineDash(dashArray);
  } else {
    ctx.setLineDash([]); // Solid line
  }

  // Draw the edge line
  ctx.beginPath();
  ctx.moveTo(sourceNode.x, sourceNode.y);
  ctx.lineTo(targetNode.x, targetNode.y);
  ctx.stroke();

  // Restore canvas state
  ctx.restore();
};

/**
 * SVG element generator for SVG-based renderers
 * Returns SVG line/path attributes for conditional styling
 * @param edge - Graph edge
 * @returns SVG attributes object
 */
export const getSvgEdgeAttributes = (edge: GraphEdge): Record<string, string | number> => {
  const style = getEdgeStyle(edge);

  return {
    stroke: style.stroke ?? TYPE_COLORS.RELATED_TO,
    'stroke-width': style.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    'stroke-dasharray': style.strokeDasharray ?? 'none',
    'stroke-opacity': style.strokeOpacity ?? style.opacity ?? DEFAULT_EDGE_OPACITY,
    // Only present when the edge actually has a marker; the property is genuinely absent otherwise, not an empty/placeholder string.
    ...(style.markerEnd !== undefined && { 'marker-end': `url(#${style.markerEnd})` }),
    ...(style['data-direction'] !== undefined && { 'data-direction': style['data-direction'] }),
    ...(style['data-relation-type'] !== undefined && {
      'data-relation-type': style['data-relation-type'],
    }),
  };
};

/**
 * DOM element styling for DOM-based renderers (e.g., XYFlow)
 * Returns CSS style object for conditional styling
 * @param edge - Graph edge
 * @returns React CSSProperties object
 */
export const getDomEdgeStyle = (edge: GraphEdge): React.CSSProperties & Record<string, unknown> => {
  const style = getEdgeStyle(edge);

  return {
    borderColor: style.borderColor ?? style.stroke ?? TYPE_COLORS.RELATED_TO,
    borderStyle: style.borderStyle ?? (style.strokeDasharray !== undefined ? 'dashed' : 'solid'),
    borderWidth: style.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    opacity: style.opacity ?? DEFAULT_EDGE_OPACITY,
    // Data attributes for testing
    ...(style['data-direction'] !== undefined && { 'data-direction': style['data-direction'] }),
    ...(style['data-relation-type'] !== undefined && {
      'data-relation-type': style['data-relation-type'],
    }),
  };
};

/**
 * Color accessor function for react-force-graph
 * Returns the stroke color for an edge based on its type and direction
 * @param edge - Graph edge
 * @returns Hex color string
 */
export const getEdgeColor = (edge: GraphEdge): string => {
  const style = getEdgeStyle(edge);
  return style.stroke ?? TYPE_COLORS.RELATED_TO;
};

/**
 * Width accessor function for react-force-graph
 * Returns the stroke width for an edge
 * @param edge - Graph edge
 * @returns Width in pixels
 */
export const getEdgeWidth = (edge: GraphEdge): number => {
  const style = getEdgeStyle(edge);
  return style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
};

/**
 * Edge canvas object function for react-force-graph
 * Custom canvas rendering function that replaces default edge rendering
 *
 * This is the main integration point for react-force-graph-2d
 * @returns Function compatible with ForceGraph2D's linkCanvasObject property
 * @example
 * ```tsx
 * <ForceGraph2D
 *   linkCanvasObject={createEdgeCanvasObjectFunction()}
 *   linkColor={(link) => getEdgeColor(link as GraphEdge)}
 *   linkWidth={(link) => getEdgeWidth(link as GraphEdge)}
 * />
 * ```
 */
export const createEdgeCanvasObjectFunction = () => (
    edge: GraphEdge,
    context: CanvasRenderingContext2D,
    globalScale: number
  ): void => {
    // react-force-graph mutates the edge at runtime, replacing the source/target node-id strings GraphEdge declares with the actual positioned node objects - a shape this static type doesn't capture.
    if (!hasNumericPosition(edge.source) || !hasNumericPosition(edge.target)) {
      return;
    }
    const { source, target } = edge;

    renderEdgeOnCanvas(
      edge,
      { x: source.x, y: source.y },
      { x: target.x, y: target.y },
      context,
      globalScale
    );
  };

/**
 * Hover state handler for edges
 * Returns style properties for an edge in hover state
 * @param edge - Graph edge
 * @returns Hover style properties
 */
export const getEdgeHoverColor = (edge: GraphEdge): string => {
  const style = getEdgeHoverStyle(edge);
  return style.stroke ?? TYPE_COLORS.RELATED_TO;
};

/**
 * Filtered/dimmed state handler for edges
 * Returns style properties for edges that are filtered out
 * @param edge - Graph edge
 * @returns Filtered style properties
 */
export const getEdgeFilteredColor = (edge: GraphEdge): string => {
  const style = getEdgeFilteredStyle(edge);
  return style.stroke ?? TYPE_COLORS.RELATED_TO;
};

/**
 * Integration helper for applying styles to any graph edge element
 * Provides a unified interface for all rendering approaches
 * @param edge - Graph edge
 * @param rendererType - Type of renderer being used
 * @returns Style properties appropriate for the renderer
 */
export const applyConditionalEdgeStyling = (edge: GraphEdge, rendererType: 'canvas' | 'svg' | 'dom'): EdgeStyleProperties | React.CSSProperties | Record<string, unknown> => {
  switch (rendererType) {
    case 'canvas':
      // Return style properties for canvas
      return getEdgeStyle(edge);

    case 'svg':
      // Return SVG attributes
      return getSvgEdgeAttributes(edge);

    case 'dom':
      // Return CSS properties
      return getDomEdgeStyle(edge);

    default:
      return getEdgeStyle(edge);
  }
};
