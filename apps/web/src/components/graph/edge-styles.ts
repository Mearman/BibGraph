/**
 * Graph edge styling functions for BibGraph
 * Provides multi-modal visual distinction for outbound vs inbound relationships
 *
 * User Story 2: Visual distinction between outbound edges (data stored on source entity)
 * and inbound edges (discovered via reverse lookup)
 *
 * Accessibility: Multi-modal distinction using line style + color + arrow style
 * to meet WCAG 2.1 Level AA standards
 */

import type { EdgeDirection,GraphEdge, RelationType  } from "@bibgraph/types";

import { RELATIONSHIP_TYPE_COLORS as HASH_BASED_COLORS } from "../../styles/hash-colors";

/**
 * Style properties for graph edges
 * Compatible with both SVG and CSS styling
 */
export interface EdgeStyleProperties {
  // Line styling
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeOpacity?: number;

  // Arrow/marker styling
  markerEnd?: string;
  arrowColor?: string;

  // CSS properties (for DOM-based renderers)
  borderStyle?: string;
  borderColor?: string;
  opacity?: number;

  // Data attributes for testing and debugging
  'data-direction'?: EdgeDirection;
  'data-relation-type'?: RelationType;
}

/**
 * Type-specific colors for relationship types derived from hash-based generation
 * Colors are deterministic based on relationship type string hashes
 * All colors meet WCAG 2.1 Level AA contrast ratio (≥3:1 for graphical objects)
 */


/**
 * Default styling constants
 */
const STYLE_CONSTANTS = {
  // Line styles
  OUTBOUND_LINE: 'solid',
  INBOUND_LINE: 'dashed',

  // Dash pattern for inbound edges (8px dash, 4px gap)
  INBOUND_DASHARRAY: '8,4',

  // Stroke widths
  DEFAULT_STROKE_WIDTH: 2,
  HOVER_STROKE_WIDTH: 3,

  // Opacity
  DEFAULT_OPACITY: 0.8,
  HOVER_OPACITY: 1,
  FILTERED_OPACITY: 0.2,

  // Arrow markers
  OUTBOUND_MARKER: 'arrow-solid',
  INBOUND_MARKER: 'arrow-dashed',
} as const;

// Not every RelationType member's runtime value matches a key in HASH_BASED_COLORS (some enum values are lowercase while the color map's keys are uppercase), so a plain index needs this guard rather than a direct lookup.
const isHashBasedColorKey = (value: string): value is keyof typeof HASH_BASED_COLORS =>
  value in HASH_BASED_COLORS;

/**
 * Get color for a relationship type
 * @param type - Relationship type
 * @returns Hex color string
 */
export const getTypeColor = (type: RelationType): string =>
  isHashBasedColorKey(type) ? HASH_BASED_COLORS[type] : HASH_BASED_COLORS.RELATED_TO;

/**
 * Get styling for outbound edges (solid lines)
 * Outbound edges represent relationships stored directly on the source entity
 * @param type - Relationship type
 * @returns Style properties for outbound edges
 */
export const getOutboundStyle = (type: RelationType): EdgeStyleProperties => {
  const color = getTypeColor(type);

  return {
    // SVG properties
    stroke: color,
    strokeWidth: STYLE_CONSTANTS.DEFAULT_STROKE_WIDTH,
    strokeDasharray: undefined, // Solid line (no dashes)
    strokeOpacity: STYLE_CONSTANTS.DEFAULT_OPACITY,

    // Arrow marker
    markerEnd: STYLE_CONSTANTS.OUTBOUND_MARKER,
    arrowColor: color,

    // CSS properties
    borderStyle: STYLE_CONSTANTS.OUTBOUND_LINE,
    borderColor: color,
    opacity: STYLE_CONSTANTS.DEFAULT_OPACITY,

    // Data attributes
    'data-direction': 'outbound',
    'data-relation-type': type,
  };
};

/**
 * Get styling for inbound edges (dashed lines)
 * Inbound edges represent relationships discovered via reverse lookup
 * @param type - Relationship type
 * @returns Style properties for inbound edges
 */
export const getInboundStyle = (type: RelationType): EdgeStyleProperties => {
  const color = getTypeColor(type);

  return {
    // SVG properties
    stroke: color,
    strokeWidth: STYLE_CONSTANTS.DEFAULT_STROKE_WIDTH,
    strokeDasharray: STYLE_CONSTANTS.INBOUND_DASHARRAY, // Dashed line pattern
    strokeOpacity: STYLE_CONSTANTS.DEFAULT_OPACITY,

    // Arrow marker
    markerEnd: STYLE_CONSTANTS.INBOUND_MARKER,
    arrowColor: color,

    // CSS properties
    borderStyle: STYLE_CONSTANTS.INBOUND_LINE,
    borderColor: color,
    opacity: STYLE_CONSTANTS.DEFAULT_OPACITY,

    // Data attributes
    'data-direction': 'inbound',
    'data-relation-type': type,
  };
};

/**
 * Get complete styling for an edge based on its direction and type
 * Primary entry point for edge styling
 *
 * Multi-modal visual distinction:
 * 1. Line style: Solid (outbound) vs Dashed (inbound)
 * 2. Color: Type-specific colors
 * 3. Arrow style: Different marker styles for outbound/inbound
 * @param edge - Graph edge to style
 * @returns Style properties with multi-modal visual distinction
 * @example
 * ```typescript
 * const edge: GraphEdge = {
 *   id: 'W1-A1',
 *   source: 'W1',
 *   target: 'A1',
 *   type: RelationType.AUTHORSHIP,
 *   direction: 'outbound',
 * };
 * const style = getEdgeStyle(edge);
 * // Returns: { stroke: '#4A90E2', strokeDasharray: undefined, ... }
 * ```
 */
export const getEdgeStyle = (edge: GraphEdge): EdgeStyleProperties => {
  const { type, direction } = edge;

  // Use direction field if available, otherwise default to outbound
  const edgeDirection = direction ?? 'outbound';

  if (edgeDirection === 'inbound') {
    return getInboundStyle(type);
  }

  return getOutboundStyle(type);
};

/**
 * Get hover styling for an edge
 * Increases stroke width and opacity for better visibility
 * @param edge - Graph edge to style
 * @returns Style properties for hover state
 */
export const getEdgeHoverStyle = (edge: GraphEdge): EdgeStyleProperties => {
  const baseStyle = getEdgeStyle(edge);

  return {
    ...baseStyle,
    strokeWidth: STYLE_CONSTANTS.HOVER_STROKE_WIDTH,
    strokeOpacity: STYLE_CONSTANTS.HOVER_OPACITY,
    opacity: STYLE_CONSTANTS.HOVER_OPACITY,
  };
};

/**
 * Get filtered/dimmed styling for an edge
 * Used when edge is not currently visible/active
 * @param edge - Graph edge to style
 * @returns Style properties for filtered state
 */
export const getEdgeFilteredStyle = (edge: GraphEdge): EdgeStyleProperties => {
  const baseStyle = getEdgeStyle(edge);

  return {
    ...baseStyle,
    strokeOpacity: STYLE_CONSTANTS.FILTERED_OPACITY,
    opacity: STYLE_CONSTANTS.FILTERED_OPACITY,
  };
};
