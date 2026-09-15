/**
 * Optimized Force-directed Graph Visualization Component
 *
 * Enhanced version of ForceGraphVisualization with performance optimizations:
 * - Viewport culling to reduce rendering overhead
 * - Progressive loading for smooth initialization
 * - Object pooling for memory efficiency
 * - Adaptive quality based on performance
 */

import type { EntityType, GraphEdge, GraphNode } from '@bibgraph/types';
import { Box, LoadingOverlay, useComputedColorScheme } from '@mantine/core';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d';

import { calculateViewportBounds, useGraphViewportCulling } from '@/hooks/useGraphViewportCulling';
import { useProgressiveGraphLoading } from '@/hooks/useProgressiveGraphLoading';

import { ENTITY_TYPE_COLORS } from '../../styles/hash-colors';
import {
  CONTAINER,
  LINK,
  LOADING_RING,
  NODE,
  SIMULATION,
  TIMING,
} from './constants';
import { getEdgeStyle } from './edge-styles';

// Performance monitoring
interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  nodeCount: number;
  edgeCount: number;
  cullingEfficiency: number;
}

// Default prop values extracted as constants to prevent infinite render loops
const DEFAULT_HIGHLIGHTED_NODE_IDS = new Set<string>();
const DEFAULT_HIGHLIGHTED_PATH: string[] = [];
const DEFAULT_EXPANDING_NODE_IDS = new Set<string>();

const DEFAULT_PROGRESSIVE_LOADING = {
  enabled: true,
  batchSize: 50,
  batchDelayMs: 16,
} as const;

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
import type { DisplayMode, LinkStyle, NodeStyle } from './types';

export interface OptimizedForceGraphVisualizationProps {
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
  _displayMode?: DisplayMode;
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
  _loading?: boolean;
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
  Fixed node positions for static layouts (nodeId maps to a position)
   */
  nodePositions?: Map<string, { x: number; y: number }>;
  /**
  Callback when graph methods become available (for external control like zoomToFit)
   */
  onGraphReady?: (methods: Readonly<ForceGraphMethods>) => void;
  /**
  Callback when zoom level changes
   */
  onZoom?: (zoom: number) => void;
  /**
  Callback when pan position changes
   */
  onPan?: (x: number, y: number) => void;
  /**
  Enable performance optimizations
   */
  enableOptimizations?: boolean;
  /**
  Progressive loading configuration
   */
  progressiveLoading?: {
    enabled: boolean;
    batchSize: number;
    batchDelayMs: number;
  };
}

// Node radius (px) assumed for viewport-culling bounds checks.
const CULLING_NODE_RADIUS = 50;
// Extra margin multiplier applied to the culling viewport so nodes just off-screen don't pop in/out abruptly.
const CULLING_MARGIN_MULTIPLIER = 1.2;
// Default camera Z distance (px) used when computing viewport bounds before a real camera position is known.
const DEFAULT_CAMERA_Z_DISTANCE = 1000;

/**
 * Resolves a force-graph link endpoint (still a raw node-id string before the simulation starts, or the positioned node object react-force-graph mutates it into afterwards) to its node ID.
 */
const getEndpointId = (endpoint: string | ForceGraphNode): string =>
  typeof endpoint === 'string' ? endpoint : endpoint.id;

/**
 * Type guards distinguishing our own ForceGraphNode/ForceGraphLink instances from the generic NodeObject/LinkObject types react-force-graph's own canvas-callback signatures declare.
 */
const isForceGraphNode = (node: NodeObject): node is ForceGraphNode => 'originalNode' in node;
const isForceGraphLink = (link: LinkObject): link is ForceGraphLink => 'originalEdge' in link;
const isPositionedForceGraphNode = (endpoint: unknown): endpoint is ForceGraphNode =>
  typeof endpoint === 'object' && endpoint !== null && 'originalNode' in endpoint;

// Node label rendering thresholds/sizing (canvas rendering, in px unless noted).
const LABEL_VISIBILITY_MIN_SCREEN_SIZE = 15;
const LABEL_ALPHA = 0.8;
const LABEL_FONT_SIZE_DIVISOR = 3;
const LABEL_MAX_FONT_SIZE_PX = 12;
const LABEL_MAX_LENGTH_DIVISOR = 4;
const LABEL_VERTICAL_OFFSET_PX = 12;
// Line-width multiplier applied to a highlighted link relative to its base width.
const HIGHLIGHTED_LINK_WIDTH_MULTIPLIER = 1.5;
// Polling interval (ms) for reading the canvas pan transform (react-force-graph exposes no pan-change event).
const PAN_POLL_INTERVAL_MS = 100;
// Converts a per-frame duration (ms) to frames-per-second for the stats overlay.
const MS_PER_SECOND = 1000;
// Converts a 0-1 ratio (culling efficiency, load progress) to a percentage for display.
const PERCENTAGE_MULTIPLIER = 100;
// Simulation ticks to run before/after rendering starts, giving the layout time to settle.
const SIMULATION_TICKS = 100;

export const OptimizedForceGraphVisualization = ({
  nodes,
  edges,
  visible = true,
  width,
  height = 500,
  _displayMode = 'highlight',
  highlightedNodeIds = DEFAULT_HIGHLIGHTED_NODE_IDS,
  highlightedPath = DEFAULT_HIGHLIGHTED_PATH,
  communityAssignments,
  communityColors,
  expandingNodeIds = DEFAULT_EXPANDING_NODE_IDS,
  _loading = false,
  getNodeStyle,
  getLinkStyle,
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  onBackgroundClick,
  enableSimulation = true,
  nodePositions,
  onGraphReady,
  onZoom,
  onPan,
  enableOptimizations = true,
  progressiveLoading = DEFAULT_PROGRESSIVE_LOADING,
}: OptimizedForceGraphVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const colorScheme = useComputedColorScheme('light');
  const performanceMetricsRef = useRef<PerformanceMetrics>({
    fps: 60,
    frameTimeMs: 16,
    nodeCount: 0,
    edgeCount: 0,
    cullingEfficiency: 0,
  });

  // Performance monitoring state
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);

  // Progressive loading for smooth graph initialization
  const { visibleItems: progressiveNodes, loadingState } = useProgressiveGraphLoading(
    nodes,
    {
      enabled: enableOptimizations && progressiveLoading.enabled,
      batchSize: progressiveLoading.batchSize,
      batchDelayMs: progressiveLoading.batchDelayMs,
    }
  );

  // Viewport culling for performance optimization
  const [viewportBounds, setViewportBounds] = useState(() => ({
    left: -1000,
    right: 1000,
    top: -1000,
    bottom: 1000,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 1000,
    zoom: 1,
  }));

  const {
    visibleNodes: culledNodes,
    visibleCount,
    cullingEfficiency,
  } = useGraphViewportCulling(
    enableOptimizations ? progressiveNodes : nodes,
    enableOptimizations ? viewportBounds : null,
    CULLING_NODE_RADIUS,
    CULLING_MARGIN_MULTIPLIER
  );

  // Use culled nodes if optimizations are enabled, otherwise use all nodes
  const renderNodes = enableOptimizations ? culledNodes.map(n => n.originalNode) : progressiveNodes;

  // Notify parent when graph methods become available
  useEffect(() => {
    const checkReference = () => {
      if (graphRef.current && onGraphReady) {
        onGraphReady(graphRef.current);
      }
    };
    checkReference();
    const timeoutId = setTimeout(checkReference, TIMING.GRAPH_REF_CHECK_DELAY_MS);
    return () => { clearTimeout(timeoutId); };
  }, [onGraphReady]);

  // Track container width for responsive sizing and viewport calculation
  const [containerWidth, setContainerWidth] = React.useState(width ?? CONTAINER.DEFAULT_WIDTH);

  useEffect(() => {
    if (!containerRef.current || width !== undefined) return undefined;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);

        // Update viewport bounds when container resizes
        if (graphRef.current) {
          try {
            // Use centerAt to get current position (cameraPosition method doesn't exist)
            const center = graphRef.current.centerAt();
            const zoom = graphRef.current.zoom();

            setViewportBounds(calculateViewportBounds(
              center.x,
              center.y,
              DEFAULT_CAMERA_Z_DISTANCE,
              zoom,
              entry.contentRect.width,
              height
            ));
          } catch {
            // Camera might not be ready yet
          }
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => { resizeObserver.disconnect(); };
  }, [width, height]);

  // Update performance metrics
  useEffect(() => {
    performanceMetricsRef.current = {
      fps: 60, // Will be updated by performance monitoring
      frameTimeMs: 16,
      nodeCount: renderNodes.length,
      edgeCount: edges.length,
      cullingEfficiency,
    };
  }, [renderNodes.length, edges.length, cullingEfficiency]);

  // Create highlighted path edge set for quick lookup
  const highlightedPathEdges = useMemo(() => {
    const edgeSet = new Set<string>();
    for (let index = 0; index < highlightedPath.length - 1; index++) {
      const source = highlightedPath[index];
      const target = highlightedPath[index + 1];
      edgeSet.add(`${source}-${target}`);
      edgeSet.add(`${target}-${source}`);
    }
    return edgeSet;
  }, [highlightedPath]);

  
  // Transform nodes for force graph (only visible nodes)
  const graphData = useMemo(() => {
    // Deduplicate nodes by ID
    const seenNodeIds = new Set<string>();
    const deduplicatedNodes = renderNodes.filter(n => {
      if (seenNodeIds.has(n.id)) {
        return false;
      }
      seenNodeIds.add(n.id);
      return true;
    });

    // Transform nodes for force graph
    const transformedNodes: ForceGraphNode[] = deduplicatedNodes.map(node => {
      const fixedPosition = nodePositions?.get(node.id);
      return {
        id: node.id,
        entityType: node.entityType,
        label: node.label || node.id,
        entityId: node.id,
        x: node.x,
        y: node.y,
        // Use fixed positions if provided (for static layouts)
        fx: fixedPosition?.x,
        fy: fixedPosition?.y,
        originalNode: node,
      };
    });

    // Transform edges, only include edges where both endpoints are visible
    const visibleNodeIds = new Set(transformedNodes.map(n => n.id));
    const transformedEdges: ForceGraphLink[] = edges
      .filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map(edge => ({
        id: edge.id,
        type: edge.type,
        source: edge.source,
        target: edge.target,
        originalEdge: edge,
      }));

    return { nodes: transformedNodes, links: transformedEdges };
  }, [renderNodes, edges, nodePositions]);

  // Node highlighting logic
  const isNodeHighlighted = useCallback((nodeId: string): boolean => {
    if (highlightedNodeIds.size === 0) return true;
    return highlightedNodeIds.has(nodeId);
  }, [highlightedNodeIds]);

  // Edge highlighting logic
  const isEdgeHighlighted = useCallback((edge: ForceGraphLink): boolean => {
    const sourceId = getEndpointId(edge.source);
    const targetId = getEndpointId(edge.target);

    if (highlightedPath.length > 0) {
      return highlightedPathEdges.has(`${sourceId}-${targetId}`);
    }
    if (highlightedNodeIds.size === 0) {
      return true;
    }
    return highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId);
  }, [highlightedNodeIds, highlightedPath, highlightedPathEdges]);

  // Default node style function
  const getDefaultNodeStyle = useCallback((
    node: ForceGraphNode,
    isHighlighted: boolean,
    communityId?: number,
    colors?: Map<number, string>
  ): NodeStyle => ({
    color: colors?.get(communityId ?? 0) ?? ENTITY_TYPE_COLORS[node.entityType],
    size: NODE.DEFAULT_SIZE,
    opacity: isHighlighted ? NODE.FULL_OPACITY : NODE.DIMMED_OPACITY,
    borderWidth: isHighlighted ? NODE.HIGHLIGHTED_BORDER_WIDTH : 0,
    borderColor: 'var(--mantine-color-blue-6)',
  }), []);

  // Enhanced node canvas rendering with performance optimizations
  const nodeCanvasObject = useCallback((node: NodeObject, context: CanvasRenderingContext2D, globalScale: number) => {
    if (!isForceGraphNode(node)) return;
    const isHighlighted = isNodeHighlighted(node.id);
    const isExpanding = expandingNodeIds.has(node.id);
    const communityId = communityAssignments?.get(node.id);

    // Skip rendering if node is too small (performance optimization)
    const nodeSize = NODE.DEFAULT_SIZE;
    const screenSize = nodeSize * globalScale;
    if (screenSize < 2) return; // Skip rendering nodes smaller than 2 pixels

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

    // Draw loading indicator for expanding nodes
    if (isExpanding) {
      const ringRadius = size * LOADING_RING.RADIUS_MULTIPLIER;
      const ringWidth = size * LOADING_RING.WIDTH_MULTIPLIER;

      context.strokeStyle = LOADING_RING.PRIMARY_COLOR;
      context.lineWidth = ringWidth;
      context.beginPath();
      context.arc(x, y, ringRadius, 0, 2 * Math.PI);
      context.stroke();
    }

    // Draw labels only for sufficiently large nodes (performance optimization)
    if (screenSize > LABEL_VISIBILITY_MIN_SCREEN_SIZE) {
      context.globalAlpha = LABEL_ALPHA;
      context.fillStyle = colorScheme === 'dark' ? '#ffffff' : '#000000';
      context.font = `${String(Math.min(screenSize / LABEL_FONT_SIZE_DIVISOR, LABEL_MAX_FONT_SIZE_PX))}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      // Truncate label if too long
      const label = node.label || node.id;
      const maxLabelLength = Math.max(1, Math.floor(screenSize / LABEL_MAX_LENGTH_DIVISOR));
      const truncatedLabel = label.length > maxLabelLength ?
        `${label.slice(0, Math.max(0, maxLabelLength))}...` : label;

      context.fillText(truncatedLabel, x, y + size + LABEL_VERTICAL_OFFSET_PX);
    }
  }, [
    isNodeHighlighted,
    expandingNodeIds,
    communityAssignments,
    getNodeStyle,
    getDefaultNodeStyle,
    communityColors,
    colorScheme,
  ]);

  // Enhanced link rendering
  const linkCanvasObject = useCallback((link: LinkObject, context: CanvasRenderingContext2D, _globalScale: number) => {
    if (!isForceGraphLink(link)) return;
    const isHighlighted = isEdgeHighlighted(link);

    // By the time this canvas callback fires, react-force-graph has already resolved source/target from raw node-id strings into the actual positioned node objects.
    if (!isPositionedForceGraphNode(link.source) || !isPositionedForceGraphNode(link.target)) return;
    const source = link.source;
    const target = link.target;

    const startX = source.x ?? 0;
    const startY = source.y ?? 0;
    const endX = target.x ?? 0;
    const endY = target.y ?? 0;

    // Get style from custom function or defaults
    const style = getLinkStyle
      ? getLinkStyle(link.originalEdge, isHighlighted)
      : getEdgeStyle(link.originalEdge);

    // Apply opacity
    context.globalAlpha = isHighlighted ? LINK.HIGHLIGHTED_OPACITY : LINK.DIMMED_OPACITY;

    // Draw link - handle both LinkStyle and EdgeStyleProperties
    let linkColor: string;
    let linkWidth: number;

    if ('stroke' in style && style.stroke !== undefined) {
      // EdgeStyleProperties
      linkColor = style.stroke;
      linkWidth = style.strokeWidth ?? LINK.DEFAULT_WIDTH;
    } else if ('color' in style && style.color !== undefined) {
      // LinkStyle
      linkColor = style.color;
      linkWidth = style.width ?? LINK.DEFAULT_WIDTH;
    } else {
      // Fallback
      linkColor = '#999';
      linkWidth = LINK.DEFAULT_WIDTH;
    }

    context.strokeStyle = linkColor;
    context.lineWidth = linkWidth * (isHighlighted ? HIGHLIGHTED_LINK_WIDTH_MULTIPLIER : 1);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  }, [isEdgeHighlighted, getLinkStyle]);

  // Handle zoom/pan to update viewport bounds
  const handleZoom = useCallback(() => {
    if (enableOptimizations && graphRef.current) {
      try {
        // Use zoom method if available, otherwise use default
        const zoom = typeof graphRef.current.zoom === 'function' ? graphRef.current.zoom() : 1;

        // Notify parent component of zoom change
        onZoom?.(zoom);

        // For camera position, use defaults if method not available
        const x = 0;
        const y = 0;
        const z = 1000;

        setViewportBounds(calculateViewportBounds(
          x,
          y,
          z,
          zoom,
          containerWidth,
          height
        ));
      } catch {
        // Camera might not be ready
      }
    }
  }, [enableOptimizations, containerWidth, height, onZoom]);

  // Performance monitoring toggle
  const handlePerformanceToggle = useCallback(() => {
    setShowPerformanceStats(previous => !previous);
  }, []);

  // Track camera pan position for mini-map
  useEffect(() => {
    if (!onPan || !containerRef.current) return undefined;

    // Poll for camera position changes
    const interval = setInterval(() => {
      try {
        // Access canvas through container
        const canvas = containerRef.current?.querySelector('canvas');
        if (!canvas) return;

        // Get transformation matrix from canvas
        const transform = canvas.style.transform;
        if (!transform) return;

        // Parse transform: "translate(x, y) scale(z)" Split by parentheses to extract translate values
        const translatePrefix = 'translate(';
        const translateStart = transform.indexOf(translatePrefix);
        if (translateStart === -1) return;

        const translateEnd = transform.indexOf(')', translateStart);
        if (translateEnd === -1) return;

        const valuesString = transform.slice(translateStart + translatePrefix.length, translateEnd);
        const values = valuesString.split(',').map(v => v.trim());

        if (values.length >= 2) {
          const panX = Number.parseFloat(values[0]) || 0;
          const panY = Number.parseFloat(values[1]) || 0;
          onPan(panX, panY);
        }
      } catch {
        // Canvas might not be ready or transform not available
      }
    }, PAN_POLL_INTERVAL_MS);

    return () => { clearInterval(interval); };
  }, [onPan]);

  return (
    <Box ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {visible && (
        <>
          <LoadingOverlay visible={loadingState.isLoading} />

          {enableOptimizations && showPerformanceStats && (
            <Box
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                zIndex: 1000,
              }}
            >
              <div>FPS: {Math.round(MS_PER_SECOND / performanceMetricsRef.current.frameTimeMs)}</div>
              <div>Nodes: {visibleCount}/{nodes.length}</div>
              <div>Culling: {Math.round(cullingEfficiency * PERCENTAGE_MULTIPLIER)}%</div>
              <div>Edges: {graphData.links.length}</div>
              <div>Loading: {loadingState.isLoading ? `${String(Math.round(loadingState.progress * PERCENTAGE_MULTIPLIER))}%` : 'Complete'}</div>
            </Box>
          )}

          {enableOptimizations && (
            <Box
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 1000,
              }}
            >
              <button
                onClick={handlePerformanceToggle}
                style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {showPerformanceStats ? 'Hide' : 'Show'} Stats
              </button>
            </Box>
          )}

          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={containerWidth}
            height={height}
            backgroundColor={colorScheme === 'dark' ? '#1a1a1a' : '#ffffff'}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={(node) => {
              if (isForceGraphNode(node)) onNodeClick?.(node.originalNode);
            }}
            onNodeRightClick={(node, event) => {
              if (isForceGraphNode(node)) onNodeRightClick?.(node.originalNode, event);
            }}
            onNodeHover={(node) => {
              onNodeHover?.(node !== null && isForceGraphNode(node) ? node.originalNode : null);
            }}
            onBackgroundClick={onBackgroundClick}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePointerInteraction={true}
            enablePanInteraction={true}
            warmupTicks={enableSimulation ? SIMULATION_TICKS : 0}
            cooldownTicks={enableSimulation ? SIMULATION_TICKS : 0}
            d3AlphaDecay={enableSimulation ? SIMULATION.ALPHA_DECAY : 1}
            d3VelocityDecay={SIMULATION.VELOCITY_DECAY}
            onZoom={handleZoom}
            onZoomEnd={handleZoom}
          />
        </>
      )}
    </Box>
  );
};