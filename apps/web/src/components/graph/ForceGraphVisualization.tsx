/**
 * Force-directed graph visualization component
 *
 * Renders a graph using react-force-graph-2d with customizable styling.
 * Presentation logic (colors, highlights, filters) is passed in as props,
 * keeping this component focused on rendering.
 */

import type { EntityType,GraphEdge, GraphNode } from '@bibgraph/types';
import { Box, LoadingOverlay, useComputedColorScheme } from '@mantine/core';
import React, { useCallback, useEffect, useMemo,useRef } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type LinkObject,type NodeObject } from 'react-force-graph-2d';

import { ENTITY_TYPE_COLORS } from '../../styles/hash-colors';
import {
  CONTAINER,
  LABEL,
  LINK,
  LOADING_RING,
  NODE,
  SIMULATION,
  TIMING,
} from './constants';
import { getEdgeStyle } from './edge-styles';

// Default prop values extracted as constants to prevent infinite render loops
const DEFAULT_HIGHLIGHTED_NODE_IDS = new Set<string>();
const DEFAULT_HIGHLIGHTED_PATH: string[] = [];
const DEFAULT_EXPANDING_NODE_IDS = new Set<string>();

// Node for the force graph (extends NodeObject)
interface ForceGraphNode extends NodeObject {
  id: string;
  entityType: EntityType;
  label: string;
  entityId: string;
  // Position managed by force simulation
  x?: number;
  y?: number;
  fx?: number; // Fixed x position
  fy?: number; // Fixed y position
  // Original data
  originalNode: GraphNode;
}

// Link for the force graph (extends LinkObject)
interface ForceGraphLink extends LinkObject {
  id: string;
  type: string;
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  // Original data
  originalEdge: GraphEdge;
}

// Import and re-export shared types
import type { DisplayMode, LinkStyle,NodeStyle } from './types';

export interface ForceGraphVisualizationProps {
  /**
  Graph nodes
   */
  nodes: GraphNode[];
  /**
  Graph edges
   */
  edges: GraphEdge[];
  /**
  Whether to show the graph (for controlled visibility)
   */
  visible?: boolean;
  /**
  Width of the visualization (defaults to container width)
   */
  width?: number;
  /**
  Height of the visualization
   */
  height?: number;
  /**
  Display mode: highlight dims non-selected, filter hides non-selected
   */
  displayMode?: DisplayMode;
  /**
  Set of highlighted node IDs
   */
  highlightedNodeIds?: Set<string>;
  /**
  Path to highlight (ordered array of node IDs)
   */
  highlightedPath?: string[];
  /**
  Community assignments: nodeId maps to communityId
   */
  communityAssignments?: Map<string, number>;
  /**
  Community colors: communityId maps to color
   */
  communityColors?: Map<number, string>;
  /**
  Node IDs currently being expanded (loading relationships)
   */
  expandingNodeIds?: Set<string>;
  /**
  Loading state
   */
  loading?: boolean;
  /**
  Custom node style override
   */
  getNodeStyle?: (node: GraphNode, isHighlighted: boolean, communityId?: number) => NodeStyle;
  /**
  Custom link style override
   */
  getLinkStyle?: (edge: GraphEdge, isHighlighted: boolean) => LinkStyle;
  /**
  Node click handler
   */
  onNodeClick?: (node: GraphNode) => void;
  /**
  Node right-click handler (for context menu)
   */
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
  /**
  Node hover handler
   */
  onNodeHover?: (node: GraphNode | null) => void;
  /**
  Background click handler
   */
  onBackgroundClick?: () => void;
  /**
  Enable/disable force simulation
   */
  enableSimulation?: boolean;
  /**
  Callback when graph methods become available (for external control like zoomToFit)
   */
  onGraphReady?: (methods: Readonly<ForceGraphMethods>) => void;
}

/**
 * Type guards distinguishing our own ForceGraphNode/ForceGraphLink instances from the generic NodeObject/LinkObject types react-force-graph's own canvas-callback signatures declare.
 */
const isForceGraphNode = (node: NodeObject): node is ForceGraphNode => 'originalNode' in node;
const isForceGraphLink = (link: LinkObject): link is ForceGraphLink => 'originalEdge' in link;
const isPositionedForceGraphNode = (endpoint: unknown): endpoint is ForceGraphNode =>
  typeof endpoint === 'object' && endpoint !== null && 'originalNode' in endpoint;

/**
 * Default node styling based on entity type and highlighting
 */
const getDefaultNodeStyle = (node: ForceGraphNode, isHighlighted: boolean, communityId?: number, communityColors?: Map<number, string>): NodeStyle => {
  const communityColor = communityId !== undefined ? communityColors?.get(communityId) : undefined;
  const color = communityColor ?? ENTITY_TYPE_COLORS[node.entityType];

  return {
    color,
    size: isHighlighted ? NODE.HIGHLIGHTED_SIZE : NODE.DEFAULT_SIZE,
    opacity: NODE.FULL_OPACITY,
    borderColor: isHighlighted ? 'var(--mantine-color-body)' : undefined,
    borderWidth: isHighlighted ? NODE.HIGHLIGHTED_BORDER_WIDTH : 0,
  };
};

/**
 * Default link styling based on edge type, direction, and highlighting Uses edge-styles.ts for consistent relationship type colors
 */
const getDefaultLinkStyle = (link: ForceGraphLink, isHighlighted: boolean, isPathHighlightMode: boolean): LinkStyle => {
  const edge = link.originalEdge;
  const edgeStyle = getEdgeStyle(edge);
  const isDirected = edge.direction !== undefined;

  // Path highlight mode overrides edge type colors
  if (isHighlighted && isPathHighlightMode) {
    return {
      color: 'var(--mantine-primary-color-filled)', // Primary color for path highlighting
      width: LINK.HIGHLIGHTED_WIDTH,
      opacity: LINK.HIGHLIGHTED_OPACITY,
      dashed: false,
      directed: isDirected,
    };
  }

  return {
    color: edgeStyle.stroke ?? 'var(--mantine-color-dimmed)',
    width: edgeStyle.strokeWidth ?? LINK.DEFAULT_WIDTH,
    opacity: edgeStyle.strokeOpacity ?? LINK.DEFAULT_OPACITY,
    dashed: edgeStyle.strokeDasharray !== undefined,
    directed: isDirected,
  };
};

export const ForceGraphVisualization = ({
  nodes,
  edges,
  visible = true,
  width,
  height = 500,
  displayMode = 'highlight',
  highlightedNodeIds = DEFAULT_HIGHLIGHTED_NODE_IDS,
  highlightedPath = DEFAULT_HIGHLIGHTED_PATH,
  communityAssignments,
  communityColors,
  expandingNodeIds = DEFAULT_EXPANDING_NODE_IDS,
  loading = false,
  getNodeStyle,
  getLinkStyle,
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  onBackgroundClick,
  enableSimulation = true,
  onGraphReady,
}: ForceGraphVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const colorScheme = useComputedColorScheme('light');

  // Notify parent when graph methods become available
  useEffect(() => {
    // Use a short delay to ensure the ref is populated after render
    const checkReference = () => {
      if (graphRef.current && onGraphReady) {
        onGraphReady(graphRef.current);
      }
    };
    // Check immediately and after a short delay (for initial mount)
    checkReference();
    const timeoutId = setTimeout(checkReference, TIMING.GRAPH_REF_CHECK_DELAY_MS);
    return () => { clearTimeout(timeoutId); };
  }, [onGraphReady]);

  // Track container width for responsive sizing
  const [containerWidth, setContainerWidth] = React.useState(width ?? CONTAINER.DEFAULT_WIDTH);

  useEffect(() => {
    if (!containerRef.current || width !== undefined) return undefined;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => { resizeObserver.disconnect(); };
  }, [width]);

  // Create highlighted path edge set for quick lookup
  const highlightedPathEdges = useMemo(() => {
    const edgeSet = new Set<string>();
    for (let index = 0; index < highlightedPath.length - 1; index++) {
      const source = highlightedPath[index];
      const target = highlightedPath[index + 1];
      // Add both directions since graph might be undirected
      edgeSet.add(`${source}-${target}`);
      edgeSet.add(`${target}-${source}`);
    }
    return edgeSet;
  }, [highlightedPath]);

  // Only use highlightedNodeIds for filtering if in filter mode
  // This prevents graphData from recalculating on every highlight change in "highlight" mode
  const filterNodeIds = displayMode === 'filter' ? highlightedNodeIds : undefined;

  // Transform nodes for force graph
  const graphData = useMemo(() => {
    // Deduplicate nodes by ID (safety net - upstream should already deduplicate)
    const seenNodeIds = new Set<string>();
    const deduplicatedNodes = nodes.filter(n => {
      if (seenNodeIds.has(n.id)) {
        return false;
      }
      seenNodeIds.add(n.id);
      return true;
    });

    // Filter nodes if in filter mode
    const filteredNodes = filterNodeIds && filterNodeIds.size > 0
      ? deduplicatedNodes.filter(n => filterNodeIds.has(n.id))
      : deduplicatedNodes;

    const nodeIdSet = new Set(filteredNodes.map(n => n.id));

    // Filter edges to only include those between visible nodes
    const filteredEdges = edges.filter(e =>
      nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    const forceNodes: ForceGraphNode[] = filteredNodes.map((node) => ({
      id: node.id,
      entityType: node.entityType,
      label: node.label,
      entityId: node.entityId,
      x: node.x,
      y: node.y,
      originalNode: node,
    }));

    const forceLinks: ForceGraphLink[] = filteredEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      originalEdge: edge,
    }));

    return { nodes: forceNodes, links: forceLinks };
  }, [nodes, edges, filterNodeIds]);

  // Determine if a node is highlighted
  const isNodeHighlighted = useCallback((nodeId: string): boolean => {
    if (highlightedNodeIds.size === 0 && highlightedPath.length === 0) {
      return true; // No highlighting active, all nodes are "highlighted"
    }
    return highlightedNodeIds.has(nodeId) || highlightedPath.includes(nodeId);
  }, [highlightedNodeIds, highlightedPath]);

  // Determine if an edge is highlighted
  const isEdgeHighlighted = useCallback((edge: GraphEdge): boolean => {
    // Extract source and target IDs (always strings in our implementation)
    const sourceId = edge.source;
    const targetId = edge.target;

    if (highlightedPath.length > 0) {
      return highlightedPathEdges.has(`${sourceId}-${targetId}`);
    }
    if (highlightedNodeIds.size === 0) {
      return true; // No highlighting active
    }
    // Highlight edge if both endpoints are highlighted
    return highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId);
  }, [highlightedNodeIds, highlightedPath, highlightedPathEdges]);

  // Node canvas rendering
  const nodeCanvasObject = useCallback((node: NodeObject, context: CanvasRenderingContext2D, globalScale: number) => {
    if (!isForceGraphNode(node)) return;
    const isHighlighted = isNodeHighlighted(node.id);
    const isExpanding = expandingNodeIds.has(node.id);
    const communityId = communityAssignments?.get(node.id);

    // Get style from custom function or defaults
    const style = getNodeStyle
      ? getNodeStyle(node.originalNode, isHighlighted, communityId)
      : getDefaultNodeStyle(node, isHighlighted, communityId, communityColors);

    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const size = style.size ?? NODE.DEFAULT_SIZE;

    // Apply opacity for non-highlighted nodes in highlight mode
    context.globalAlpha = isHighlighted ? (style.opacity ?? NODE.FULL_OPACITY) : NODE.DIMMED_OPACITY;

    // Draw node circle
    context.beginPath();
    context.arc(x, y, size, 0, 2 * Math.PI);
    context.fillStyle = style.color ?? ENTITY_TYPE_COLORS[node.entityType];
    context.fill();

    // Draw border if specified
    if (style.borderWidth !== undefined && style.borderWidth > 0 && style.borderColor !== undefined) {
      context.strokeStyle = style.borderColor;
      context.lineWidth = style.borderWidth;
      context.stroke();
    }

    // Draw spinning ring for expanding nodes (loading indicator)
    if (isExpanding) {
      const ringRadius = size * LOADING_RING.RADIUS_MULTIPLIER;
      const ringWidth = size * LOADING_RING.WIDTH_MULTIPLIER;
      // Time-based rotation (full rotation every PRIMARY_ROTATION_PERIOD_MS)
      const rotation = (Date.now() / LOADING_RING.PRIMARY_ROTATION_PERIOD_MS) * Math.PI * 2;

      context.globalAlpha = LOADING_RING.OPACITY;

      // Main spinning arc (primary color)
      context.beginPath();
      context.arc(x, y, ringRadius, rotation, rotation + LOADING_RING.PRIMARY_ARC_LENGTH);
      context.strokeStyle = LOADING_RING.PRIMARY_COLOR;
      context.lineWidth = ringWidth;
      context.lineCap = 'round';
      context.stroke();

      // Secondary faster arc (secondary color, for visual interest)
      const fastRotation = (Date.now() / LOADING_RING.SECONDARY_ROTATION_PERIOD_MS) * Math.PI * 2;
      context.beginPath();
      context.arc(x, y, ringRadius, fastRotation, fastRotation + LOADING_RING.SECONDARY_ARC_LENGTH);
      context.strokeStyle = LOADING_RING.SECONDARY_COLOR;
      context.lineWidth = ringWidth * LOADING_RING.SECONDARY_WIDTH_RATIO;
      context.stroke();

      context.lineCap = 'butt'; // Reset
    }

    // Draw label when zoomed in
    if (globalScale > LABEL.ZOOM_THRESHOLD) {
      const label = node.label || node.id;
      const fontSize = Math.max(LABEL.BASE_FONT_SIZE / globalScale, LABEL.MIN_FONT_SIZE);
      context.font = `${String(fontSize)}px Sans-Serif`;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      context.fillStyle = isHighlighted ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)';
      context.fillText(label, x, y + size + LABEL.VERTICAL_OFFSET);
    }

    context.globalAlpha = 1;
  }, [isNodeHighlighted, expandingNodeIds, communityAssignments, communityColors, getNodeStyle]);

  // Link canvas rendering
  const linkCanvasObject = useCallback((link: LinkObject, context: CanvasRenderingContext2D, globalScale: number) => {
    if (!isForceGraphLink(link)) return;
    const isHighlighted = isEdgeHighlighted(link.originalEdge);

    const style = getLinkStyle
      ? getLinkStyle(link.originalEdge, isHighlighted)
      : getDefaultLinkStyle(link, isHighlighted, highlightedPath.length > 0);

    // By the time this canvas callback fires, react-force-graph has already resolved source/target from raw node-id strings into the actual positioned node objects.
    if (!isPositionedForceGraphNode(link.source) || !isPositionedForceGraphNode(link.target)) return;
    const source = link.source;
    const target = link.target;

    if (source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) return;

    context.globalAlpha = isHighlighted ? (style.opacity ?? LINK.DEFAULT_OPACITY) : LINK.DIMMED_OPACITY;
    context.strokeStyle = style.color ?? 'var(--mantine-color-dimmed)';
    context.fillStyle = style.color ?? 'var(--mantine-color-dimmed)';
    context.lineWidth = (style.width ?? LINK.DEFAULT_WIDTH) / globalScale;

    if (style.dashed === true) {
      context.setLineDash([LINK.DASH_PATTERN / globalScale, LINK.DASH_PATTERN / globalScale]);
    } else {
      context.setLineDash([]);
    }

    // Draw the line
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.stroke();

    // Draw arrowhead for directed edges
    if (style.directed === true) {
      const targetNodeSize = NODE.DEFAULT_SIZE;
      const arrowLength = LINK.ARROW_LENGTH / globalScale;

      // Calculate angle from source to target
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const angle = Math.atan2(dy, dx);
      const distribution = Math.hypot(dx, dy);

      // Position arrow at target node edge (offset by node radius)
      const arrowTipX = source.x + (distribution - targetNodeSize) * Math.cos(angle);
      const arrowTipY = source.y + (distribution - targetNodeSize) * Math.sin(angle);

      // Draw arrowhead
      context.setLineDash([]); // Arrowhead should not be dashed
      context.beginPath();
      context.moveTo(arrowTipX, arrowTipY);
      context.lineTo(
        arrowTipX - arrowLength * Math.cos(angle - LINK.ARROW_ANGLE),
        arrowTipY - arrowLength * Math.sin(angle - LINK.ARROW_ANGLE)
      );
      context.lineTo(
        arrowTipX - arrowLength * Math.cos(angle + LINK.ARROW_ANGLE),
        arrowTipY - arrowLength * Math.sin(angle + LINK.ARROW_ANGLE)
      );
      context.closePath();
      context.fill();
    }

    context.globalAlpha = 1;
    context.setLineDash([]);
  }, [isEdgeHighlighted, getLinkStyle, highlightedPath.length]);

  // Handle node click
  const handleNodeClick = useCallback((node: NodeObject) => {
    if (isForceGraphNode(node)) onNodeClick?.(node.originalNode);
  }, [onNodeClick]);

  // Handle node right-click (context menu)
  const handleNodeRightClick = useCallback((node: NodeObject, event: MouseEvent) => {
    event.preventDefault();
    if (isForceGraphNode(node)) onNodeRightClick?.(node.originalNode, event);
  }, [onNodeRightClick]);

  // Handle node hover
  const handleNodeHover = useCallback((node: NodeObject | null) => {
    if (node !== null && isForceGraphNode(node)) {
      onNodeHover?.(node.originalNode);
    } else {
      onNodeHover?.(null);
    }
  }, [onNodeHover]);

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Pause simulation when not enabled
  useEffect(() => {
    if (graphRef.current) {
      if (enableSimulation) {
        graphRef.current.resumeAnimation();
      } else {
        graphRef.current.pauseAnimation();
      }
    }
  }, [enableSimulation]);

  // Fit graph to view on data change
  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return undefined;

    // Small delay to let simulation settle
    const timeoutId = setTimeout(() => {
      graphRef.current?.zoomToFit(TIMING.ZOOM_TO_FIT_DURATION_MS, TIMING.ZOOM_TO_FIT_PADDING);
    }, TIMING.AUTO_FIT_DELAY_MS);
    return () => { clearTimeout(timeoutId); };
  }, [graphData.nodes.length]);

  if (!visible) {
    return null;
  }

  return (
    <Box
      ref={containerRef}
      pos="relative"
      style={{
        width: width ?? '100%',
        height,
        border: `1px solid ${colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
        backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
      }}
    >
      <LoadingOverlay visible={loading} />
      <ForceGraph2D
        ref={graphRef}
        width={width ?? containerWidth}
        height={height}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        cooldownTime={enableSimulation ? SIMULATION.COOLDOWN_TIME_MS : 0}
        d3AlphaDecay={SIMULATION.ALPHA_DECAY}
        d3VelocityDecay={SIMULATION.VELOCITY_DECAY}
      />
    </Box>
  );
};
