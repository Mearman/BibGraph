/**
 * Style helper functions for 3D graph visualization
 *
 * Provides default styling for nodes and links based on entity types,
 * highlighting state, and community assignments.
 */

import type { EntityType } from '@bibgraph/types';

import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '../../../styles/hash-colors';
import { COLORS_3D, LINK, NODE } from '../constants';
import { getEdgeStyle } from '../edge-styles';
import type { LinkStyle, NodeStyle } from '../types';
import type { ForceGraphLink, ForceGraphNode } from './types';

/**
 * Entity type colors using hash-based generation for deterministic, consistent coloring
 */
export const ENTITY_TYPE_COLORS: Record<EntityType, string> = HASH_BASED_ENTITY_COLORS;

/**
 * Get default node styling based on entity type and highlighting
 *
 * Uses entity type colors with community color override if available.
 * Adjusts size based on highlight state.
 * @param node
 * @param isHighlighted
 * @param communityId
 * @param communityColors
 */
export const getDefaultNodeStyle = (
  node: ForceGraphNode,
  isHighlighted: boolean,
  communityId?: number,
  communityColors?: Map<number, string>
): NodeStyle => {
  let color = ENTITY_TYPE_COLORS[node.entityType] ?? COLORS_3D.DEFAULT_FALLBACK;

  // Use community color if available
  if (communityId !== undefined && communityColors?.has(communityId)) {
    color = communityColors.get(communityId) ?? color;
  }

  return {
    color,
    size: isHighlighted ? NODE.HIGHLIGHTED_SIZE : NODE.DEFAULT_SIZE,
    opacity: NODE.FULL_OPACITY,
  };
};

/**
 * Get default link styling based on edge type and highlighting
 *
 * Uses edge-styles module for consistent visual distinction between
 * outbound and inbound relationships.
 * @param link
 * @param isHighlighted
 * @param isPathHighlightMode
 */
export const getDefaultLinkStyle = (
  link: ForceGraphLink,
  isHighlighted: boolean,
  isPathHighlightMode: boolean
): LinkStyle => {
  const edge = link.originalEdge;
  const edgeStyle = getEdgeStyle(edge);

  // Path highlight mode overrides edge type colors
  if (isHighlighted && isPathHighlightMode) {
    return {
      color: COLORS_3D.PATH_HIGHLIGHT,
      width: LINK.HIGHLIGHTED_WIDTH,
      opacity: LINK.HIGHLIGHTED_OPACITY,
      dashed: false,
    };
  }

  return {
    color: edgeStyle.stroke ?? COLORS_3D.DEFAULT_LINK,
    width: edgeStyle.strokeWidth ?? LINK.DEFAULT_WIDTH,
    opacity: edgeStyle.strokeOpacity ?? LINK.DEFAULT_OPACITY,
    dashed: edgeStyle.strokeDasharray !== undefined,
  };
};
