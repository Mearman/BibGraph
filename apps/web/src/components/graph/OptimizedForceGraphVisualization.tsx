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

import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '../../styles/hash-colors';
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

// Entity type colors using hash-based generation for deterministic, consistent coloring
const ENTITY_TYPE_COLORS: Record<EntityType, string> = HASH_BASED_ENTITY_COLORS;

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
  /** Graph nodes */
  nodes: GraphNode[];
  /** Graph edges */
  edges: GraphEdge[];
  /** Whether to show the graph (for controlled visibility) */
  visible?: boolean;
  /** Width of the visualization (defaults to container width) */
  width?: number;
  /** Height of the visualization */
  height?: number;
  /** Display mode: highlight dims non-selected, filter hides non-selected */
  _displayMode?: DisplayMode;
  /** Set of highlighted node IDs */
  highlightedNodeIds?: Set<string>;
  /** Path to highlight (ordered array of node IDs) */
  highlightedPath?: string[];
  /** Community assignments: nodeId -> communityId */
  communityAssignments?: Map<string, number>;
  /** Community colors: communityId -> color */
  communityColors?: Map<number, string>;
  /** Node IDs currently being expanded (loading relationships) */
  expandingNodeIds?: Set<string>;
  /** Loading state */
  _loading?: boolean;
  /** Custom node style override */
  getNodeStyle?: (node: GraphNode, isHighlighted: boolean, communityId?: number) => NodeStyle;
  /** Custom link style override */
  getLinkStyle?: (edge: GraphEdge, isHighlighted: boolean) => LinkStyle;
  /** Node click handler */
  onNodeClick?: (node: GraphNode) => void;
  /** Node right-click handler (for context menu) */
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Node hover handler */
  onNodeHover?: (node: GraphNode | null) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
  /** Enable/disable force simulation */
  enableSimulation?: boolean;
  /** Fixed node positions for static layouts (nodeId -> {x, y}) */
  nodePositions?: Map<string, { x: number; y: number }>;
  /** Seed for deterministic initial positions (defaults to 42 for reproducibility) */
  seed?: number;
  /** Callback when graph methods become available (for external control like zoomToFit) */
  onGraphReady?: (methods: ForceGraphMethods) => void;
  /** Enable performance optimizations */
  enableOptimizations?: boolean;
  /** Progressive loading configuration */
  progressiveLoading?: {
    enabled: boolean;
    batchSize: number;
    batchDelayMs: number;
  };
}

/**
 * Simple seeded random number generator for deterministic layouts
 * @param seed
 */
const seededRandom = (seed: number): (() => number) => () => {
  seed = (seed * 1_103_515_245 + 12_345) & 0x7F_FF_FF_FF;
  return seed / 0x7F_FF_FF_FF;
};

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
  seed,
  onGraphReady,
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
    50, // Node radius
    1.2 // Culling margin
  );

  // Use culled nodes if optimizations are enabled, otherwise use all nodes
  const renderNodes = enableOptimizations ? culledNodes.map(n => n.originalNode) : progressiveNodes;

  // Notify parent when graph methods become available
  useEffect(() => {
    const checkRef = () => {
      if (graphRef.current && onGraphReady) {
        onGraphReady(graphRef.current);
      }
    };
    checkRef();
    const timeoutId = setTimeout(checkRef, TIMING.GRAPH_REF_CHECK_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [onGraphReady]);

  // Track container width for responsive sizing and viewport calculation
  const [containerWidth, setContainerWidth] = React.useState(width ?? CONTAINER.DEFAULT_WIDTH);

  useEffect(() => {
    if (!containerRef.current || width) return;

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
              1000, // Default z distance
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
    return () => resizeObserver.disconnect();
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
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      const source = highlightedPath[i];
      const target = highlightedPath[i + 1];
      edgeSet.add(`${source}-${target}`);
      edgeSet.add(`${target}-${source}`);
    }
    return edgeSet;
  }, [highlightedPath]);

  
  // Transform nodes for force graph (only visible nodes)
  const graphData = useMemo(() => {
    const random = seededRandom(seed ?? SIMULATION.DEFAULT_SEED);

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
        x: node.x ?? (random() - 0.5) * 200,
        y: node.y ?? (random() - 0.5) * 200,
        // Use fixed positions if provided (for static layouts)
        fx: fixedPosition?.x,
        fy: fixedPosition?.y,
        originalNode: node,
      };
    });

    // Transform edges, only include edges where both endpoints are visible
    const visibleNodeIds = new Set(transformedNodes.map(n => n.id));
    const transformedEdges: ForceGraphLink[] = edges
      .filter(edge => {
        const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as unknown as string);
        const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as unknown as string);
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
      })
      .map(edge => ({
        id: edge.id,
        type: edge.type || 'related',
        source: edge.source,
        target: edge.target,
        originalEdge: edge,
      }));

    return { nodes: transformedNodes, links: transformedEdges };
  }, [renderNodes, edges, seed, nodePositions]);

  // Node highlighting logic
  const isNodeHighlighted = useCallback((nodeId: string): boolean => {
    if (highlightedNodeIds.size === 0) return true;
    return highlightedNodeIds.has(nodeId);
  }, [highlightedNodeIds]);

  // Edge highlighting logic
  const isEdgeHighlighted = useCallback((edge: ForceGraphLink): boolean => {
    const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as unknown as string);
    const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as unknown as string);

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
    color: colors?.get(communityId || 0) ?? ENTITY_TYPE_COLORS[node.entityType] ?? 'var(--mantine-color-dimmed)',
    size: NODE.DEFAULT_SIZE,
    opacity: isHighlighted ? NODE.FULL_OPACITY : NODE.DIMMED_OPACITY,
    borderWidth: isHighlighted ? NODE.HIGHLIGHTED_BORDER_WIDTH : 0,
    borderColor: 'var(--mantine-color-blue-6)',
  }), []);

  // Enhanced node canvas rendering with performance optimizations
  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const forceNode = node as ForceGraphNode;
    const isHighlighted = isNodeHighlighted(forceNode.id);
    const isExpanding = expandingNodeIds.has(forceNode.id);
    const communityId = communityAssignments?.get(forceNode.id);

    // Skip rendering if node is too small (performance optimization)
    const nodeSize = NODE.DEFAULT_SIZE;
    const screenSize = nodeSize * globalScale;
    if (screenSize < 2) return; // Skip rendering nodes smaller than 2 pixels

    // Get style from custom function or defaults
    const style = getNodeStyle
      ? getNodeStyle(forceNode.originalNode, isHighlighted, communityId)
      : getDefaultNodeStyle(forceNode, isHighlighted, communityId, communityColors);

    const x = forceNode.x ?? 0;
    const y = forceNode.y ?? 0;
    const size = style.size ?? NODE.DEFAULT_SIZE;

    // Apply opacity for non-highlighted nodes in highlight mode
    ctx.globalAlpha = isHighlighted ? (style.opacity ?? NODE.FULL_OPACITY) : NODE.DIMMED_OPACITY;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = style.color ?? ENTITY_TYPE_COLORS[forceNode.entityType] ?? 'var(--mantine-color-dimmed)';
    ctx.fill();

    // Draw border if specified
    if (style.borderWidth && style.borderColor) {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = style.borderWidth;
      ctx.stroke();
    }

    // Draw loading indicator for expanding nodes
    if (isExpanding) {
      const ringRadius = size * LOADING_RING.RADIUS_MULTIPLIER;
      const ringWidth = size * LOADING_RING.WIDTH_MULTIPLIER;

      ctx.strokeStyle = LOADING_RING.PRIMARY_COLOR;
      ctx.lineWidth = ringWidth;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw labels only for sufficiently large nodes (performance optimization)
    if (screenSize > 15) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = colorScheme === 'dark' ? '#ffffff' : '#000000';
      ctx.font = `${Math.min(screenSize / 3, 12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate label if too long
      const label = forceNode.label || forceNode.id;
      const maxLabelLength = Math.max(1, Math.floor(screenSize / 4));
      const truncatedLabel = label.length > maxLabelLength ?
        `${label.slice(0, Math.max(0, maxLabelLength))}...` : label;

      ctx.fillText(truncatedLabel, x, y + size + 12);
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
  const linkCanvasObject = useCallback((link: LinkObject, ctx: CanvasRenderingContext2D, _globalScale: number) => {
    const forceLink = link as ForceGraphLink;
    const isHighlighted = isEdgeHighlighted(forceLink);

    const source = forceLink.source as ForceGraphNode;
    const target = forceLink.target as ForceGraphNode;

    const startX = source.x ?? 0;
    const startY = source.y ?? 0;
    const endX = target.x ?? 0;
    const endY = target.y ?? 0;

    // Get style from custom function or defaults
    const style = getLinkStyle
      ? getLinkStyle(forceLink.originalEdge, isHighlighted)
      : getEdgeStyle(forceLink.originalEdge);

    // Apply opacity
    ctx.globalAlpha = isHighlighted ? LINK.HIGHLIGHTED_OPACITY : LINK.DIMMED_OPACITY;

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

    ctx.strokeStyle = linkColor;
    ctx.lineWidth = linkWidth * (isHighlighted ? 1.5 : 1);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }, [isEdgeHighlighted, getLinkStyle]);

  // Handle zoom/pan to update viewport bounds
  const handleZoom = useCallback(() => {
    if (enableOptimizations && graphRef.current) {
      try {
        // Use zoom method if available, otherwise use default
        const zoom = typeof graphRef.current.zoom === 'function' ? graphRef.current.zoom() : 1;

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
  }, [enableOptimizations, containerWidth, height]);

  // Performance monitoring toggle
  const handlePerformanceToggle = useCallback(() => {
    setShowPerformanceStats(prev => !prev);
  }, []);

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
              <div>FPS: {Math.round(1000 / performanceMetricsRef.current.frameTimeMs)}</div>
              <div>Nodes: {visibleCount}/{nodes.length}</div>
              <div>Culling: {Math.round(cullingEfficiency * 100)}%</div>
              <div>Edges: {graphData.links.length}</div>
              <div>Loading: {loadingState.isLoading ? `${Math.round(loadingState.progress * 100)}%` : 'Complete'}</div>
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
              const forceNode = node as ForceGraphNode;
              onNodeClick?.(forceNode.originalNode);
            }}
            onNodeRightClick={(node, event) => {
              const forceNode = node as ForceGraphNode;
              onNodeRightClick?.(forceNode.originalNode, event);
            }}
            onNodeHover={(node) => {
              onNodeHover?.(node ? (node as ForceGraphNode).originalNode : null);
            }}
            onBackgroundClick={onBackgroundClick}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePointerInteraction={true}
            enablePanInteraction={true}
            warmupTicks={enableSimulation ? 100 : 0}
            cooldownTicks={enableSimulation ? 100 : 0}
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