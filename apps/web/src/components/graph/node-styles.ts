/**
 * Graph node styling functions for BibGraph
 * Provides conditional styling for xpac works and works with unverified authors
 *
 * User Story 2: Visual distinction for xpac works (datasets, software, specimens)
 * and works with unverified authors (name-string only, no Author ID)
 */

import type { GraphNode } from "@bibgraph/types";

import { SPECIAL_STATE_COLORS as HASH_BASED_COLORS } from "../../styles/hash-colors";

/**
 * Style properties for graph nodes
 * Compatible with both SVG and CSS styling
 */
export interface NodeStyleProperties {
  // Border styling
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;

  // Fill styling
  fill?: string;
  fillOpacity?: number;

  // CSS properties (for DOM-based renderers)
  border?: string;
  borderStyle?: string;
  backgroundColor?: string;
  opacity?: number;

  // Data attributes for testing
  'data-xpac'?: string;
  'data-unverified-author'?: string;
}

/**
 * Color palette for node styling derived from hash-based generation
 * Colors are deterministic based on state type strings
 * Follows WCAG 2.1 Level AA contrast guidelines
 */


/**
 * Get styling for xpac works
 * Applies dashed border and muted colors to visually distinguish non-traditional works
 * @param baseStyle - Base style properties to extend
 * @returns Style properties with xpac-specific styling
 */
export const getXpacWorkStyle = (baseStyle: Readonly<NodeStyleProperties> = {}): NodeStyleProperties => ({
    ...baseStyle,

    // SVG properties
    stroke: HASH_BASED_COLORS.xpac.stroke,
    strokeWidth: 2,
    strokeDasharray: '5,3', // Dashed border pattern: 5px dash, 3px gap
    fill: HASH_BASED_COLORS.xpac.fill,
    fillOpacity: 0.7, // Slightly transparent

    // CSS properties (for DOM renderers)
    border: `2px dashed ${HASH_BASED_COLORS.xpac.stroke}`,
    borderStyle: 'dashed',
    backgroundColor: HASH_BASED_COLORS.xpac.fill,
    opacity: 0.7,

    // Test attribute
    'data-xpac': 'true',
  });

/**
 * Get styling for works with unverified authors
 * Applies warning indicators (orange/yellow tints) to flag potential data quality issues
 * @param baseStyle - Base style properties to extend
 * @returns Style properties with unverified author warning styling
 */
export const getUnverifiedAuthorStyle = (baseStyle: Readonly<NodeStyleProperties> = {}): NodeStyleProperties => ({
    ...baseStyle,

    // SVG properties
    stroke: HASH_BASED_COLORS.warning.stroke,
    strokeWidth: 2.5, // Slightly thicker to draw attention
    fill: baseStyle.fill ?? HASH_BASED_COLORS.standard.fill, // Preserve base fill color
    // Add a warning tint overlay (would need to be applied as a filter/overlay in actual rendering)

    // CSS properties (for DOM renderers)
    border: `2.5px solid ${HASH_BASED_COLORS.warning.stroke}`,
    // Use box-shadow to add warning tint without changing fill color
    opacity: 1,

    // Test attribute
    'data-unverified-author': 'true',
  });

/**
 * Get combined styling for xpac works with unverified authors
 * Applies both xpac muted styling and warning indicators
 * @param baseStyle - Base style properties to extend
 * @returns Combined style properties
 */
export const getXpacUnverifiedStyle = (baseStyle: Readonly<NodeStyleProperties> = {}): NodeStyleProperties => {
  // Start with xpac styling
  const xpacStyle = getXpacWorkStyle(baseStyle);

  // Add unverified author warning
  return {
    ...xpacStyle,

    // Override stroke to show warning color
    stroke: HASH_BASED_COLORS.warning.stroke,
    strokeWidth: 2.5,

    // CSS override
    border: `2.5px dashed ${HASH_BASED_COLORS.warning.stroke}`, // Dashed + warning color

    // Both test attributes
    'data-xpac': 'true',
    'data-unverified-author': 'true',
  };
};

/**
 * Get node styling based on node metadata flags
 * Main entry point for conditional styling logic
 * @param node - Graph node with metadata
 * @param baseStyle - Base style properties to extend
 * @returns Conditional style properties based on node flags
 * @example
 * ```tsx
 * const style = getConditionalNodeStyle(node);
 * // Apply to SVG: <circle {...style} />
 * // Apply to DOM: <div style={style} />
 * ```
 */
export const getConditionalNodeStyle = (node: Readonly<Pick<GraphNode, 'isXpac' | 'hasUnverifiedAuthor'>>, baseStyle: Readonly<NodeStyleProperties> = {}): NodeStyleProperties => {
  const { isXpac, hasUnverifiedAuthor } = node;

  // Both conditions: xpac + unverified
  if (isXpac === true && hasUnverifiedAuthor === true) {
    return getXpacUnverifiedStyle(baseStyle);
  }

  // Only xpac
  if (isXpac === true) {
    return getXpacWorkStyle(baseStyle);
  }

  // Only unverified author
  if (hasUnverifiedAuthor === true) {
    return getUnverifiedAuthorStyle(baseStyle);
  }

  // Standard work (no special styling)
  return {
    ...baseStyle,
    stroke: HASH_BASED_COLORS.standard.stroke,
    strokeWidth: 2,
    fill: HASH_BASED_COLORS.standard.fill,
    fillOpacity: 1,

    // CSS properties
    border: `2px solid ${HASH_BASED_COLORS.standard.stroke}`,
    backgroundColor: HASH_BASED_COLORS.standard.fill,
    opacity: 1,
  };
};

/**
 * Get accessible label text for node styling
 * Provides screen reader context for visual styling differences
 * @param node - Graph node with metadata
 * @returns Descriptive label for accessibility
 */
export const getNodeAccessibilityLabel = (node: Readonly<Pick<GraphNode, 'isXpac' | 'hasUnverifiedAuthor' | 'label'>>): string => {
  const { isXpac, hasUnverifiedAuthor, label } = node;

  const flags: string[] = [];

  if (isXpac === true) {
    flags.push('extended research output');
  }

  if (hasUnverifiedAuthor === true) {
    flags.push('unverified author');
  }

  if (flags.length === 0) {
    return label;
  }

  return `${label} (${flags.join(', ')})`;
};

/**
 * Export color palette for external use (e.g., legend components)
 */

