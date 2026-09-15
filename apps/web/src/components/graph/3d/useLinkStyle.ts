/**
 * useLinkStyle - Hook for computing link colors and widths
 *
 * Provides callbacks for react-force-graph-3d's linkColor and linkWidth props.
 * Handles highlighted path mode and custom style overrides.
 */

import type { GraphEdge } from '@bibgraph/types';
import { useCallback } from 'react';

import { COLORS_3D } from '../constants';
import type { LinkStyle } from '../types';
import { getDefaultLinkStyle } from './style-helpers';
import type { ForceGraphLink } from './types';

const HIGHLIGHTED_LINK_WIDTH_FALLBACK = 1.5;
const DIMMED_LINK_WIDTH = 0.5;

export interface UseLinkStyleOptions {
  /**
  Function to check if an edge is highlighted
   */
  isEdgeHighlighted: (edge: GraphEdge) => boolean;
  /**
  Custom link style override function
   */
  getLinkStyle?: (edge: GraphEdge, isHighlighted: boolean) => LinkStyle;
  /**
  Whether a path is currently being highlighted
   */
  isPathHighlightMode: boolean;
}

export interface UseLinkStyleReturn {
  /**
  Callback for link color
   */
  linkColor: (link: ForceGraphLink) => string;
  /**
  Callback for link width
   */
  linkWidth: (link: ForceGraphLink) => number;
}

/**
 * Hook for computing link styling
 *
 * Returns callback functions suitable for react-force-graph-3d's
 * linkColor and linkWidth props.
 */
export const useLinkStyle = ({
  isEdgeHighlighted,
  getLinkStyle: customGetLinkStyle,
  isPathHighlightMode,
}: UseLinkStyleOptions): UseLinkStyleReturn => {
  const linkColor = useCallback(
    (link: ForceGraphLink): string => {
      const isHighlighted = isEdgeHighlighted(link.originalEdge);

      if (isPathHighlightMode && isHighlighted) {
        return COLORS_3D.PATH_HIGHLIGHT;
      }

      const style = customGetLinkStyle
        ? customGetLinkStyle(link.originalEdge, isHighlighted)
        : getDefaultLinkStyle(link, isHighlighted, isPathHighlightMode);

      return isHighlighted
        ? (style.color ?? COLORS_3D.DEFAULT_LINK)
        : COLORS_3D.DIMMED_LINK;
    },
    [isEdgeHighlighted, customGetLinkStyle, isPathHighlightMode]
  );

  const linkWidth = useCallback(
    (link: ForceGraphLink): number => {
      const isHighlighted = isEdgeHighlighted(link.originalEdge);
      const style = customGetLinkStyle
        ? customGetLinkStyle(link.originalEdge, isHighlighted)
        : getDefaultLinkStyle(link, isHighlighted, isPathHighlightMode);

      return isHighlighted ? (style.width ?? HIGHLIGHTED_LINK_WIDTH_FALLBACK) : DIMMED_LINK_WIDTH;
    },
    [isEdgeHighlighted, customGetLinkStyle, isPathHighlightMode]
  );

  return { linkColor, linkWidth };
};
