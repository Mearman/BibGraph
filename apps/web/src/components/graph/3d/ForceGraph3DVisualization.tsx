/**
 * 3D Force-directed graph visualization component
 *
 * Renders a graph using react-force-graph-3d with customizable styling.
 * Presentation logic (colors, highlights, filters) is passed in as props,
 * keeping this component focused on rendering.
 *
 * Features:
 * - Camera state persistence (position, zoom saved to localStorage)
 * - Performance monitoring (FPS, frame time, jank detection)
 * - Level of Detail (LOD) system for adaptive quality
 * - Frustum culling optimization for large graphs
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { detectWebGLCapabilities, GraphLODManager } from '@bibgraph/utils';
import { Box, LoadingOverlay, useComputedColorScheme } from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

import { useCameraPersistence } from '../../../hooks/useCameraPersistence';
import { useGraph3DPerformance } from '../../../hooks/useGraph3DPerformance';
import {
  CAMERA_3D,
  CONTAINER,
  LINK,
  PERFORMANCE_3D,
  SIMULATION,
  TIMING,
} from '../constants';
import type { DisplayMode, LinkStyle, NodeStyle } from '../types';
import { PerformanceOverlay } from './PerformanceOverlay';
import type { WebGLStatus } from './types';
import {
  useForceGraph3DData,
  useHighlightedPathEdges,
} from './useForceGraph3DData';
import { useGraph3DInteractions } from './useGraph3DInteractions';
import { useLinkStyle } from './useLinkStyle';
import { animateSpinningRings, useNodeThreeObject } from './useNodeThreeObject';
import { WebGLFallback } from './WebGLFallback';

// Default prop values extracted as constants to prevent infinite render loops
const DEFAULT_HIGHLIGHTED_NODE_IDS = new Set<string>();
const DEFAULT_HIGHLIGHTED_PATH: string[] = [];
const DEFAULT_EXPANDING_NODE_IDS = new Set<string>();

export interface ForceGraph3DVisualizationProps {
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
  displayMode?: DisplayMode;
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
  loading?: boolean;
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
  /** Seed for deterministic initial positions (defaults to 42 for reproducibility) */
  seed?: number;
  /** Callback when WebGL is unavailable */
  onWebGLUnavailable?: (reason: string) => void;
  /** Enable camera state persistence (position saved to localStorage) */
  enableCameraPersistence?: boolean;
  /** Storage key for camera persistence (default: 'graph3d-camera') */
  cameraStorageKey?: string;
  /** Enable performance monitoring overlay */
  showPerformanceOverlay?: boolean;
  /** Enable adaptive LOD (Level of Detail) based on distance and performance */
  enableAdaptiveLOD?: boolean;
  /** Callback when performance drops below threshold */
  onPerformanceDrop?: (fps: number) => void;
  /** Callback when graph methods become available (for external control like zoomToFit) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGraphReady?: (methods: any) => void;
  /** Enable cursor-centered zoom (zoom toward cursor position instead of orbit center) */
  enableCursorCenteredZoom?: boolean;
}

export const ForceGraph3DVisualization = ({
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
  seed,
  onWebGLUnavailable,
  enableCameraPersistence = false,
  cameraStorageKey = 'graph3d-camera',
  showPerformanceOverlay = false,
  enableAdaptiveLOD = false,
  onPerformanceDrop,
  onGraphReady,
  enableCursorCenteredZoom = true,
}: ForceGraph3DVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(undefined);
  const colorScheme = useComputedColorScheme('light');

  // === WebGL Detection ===
  const webglStatus = useMemo((): WebGLStatus => {
    const result = detectWebGLCapabilities();
    return { available: result.available, reason: result.reason };
  }, []);

  useEffect(() => {
    if (!webglStatus.available && onWebGLUnavailable) {
      onWebGLUnavailable(webglStatus.reason ?? 'WebGL not available');
    }
  }, [webglStatus.available, webglStatus.reason, onWebGLUnavailable]);

  // === Graph Ready Callback ===
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

  // === Performance Hooks ===
  const { cameraState: savedCameraState, updateCameraState } = useCameraPersistence({
    enabled: enableCameraPersistence,
    storageKey: cameraStorageKey,
    debounceMs: CAMERA_3D.PERSISTENCE_DEBOUNCE_MS,
  });

  const {
    stats: performanceStats,
    frameStart,
    frameEnd,
    updateVisibleCounts,
  } = useGraph3DPerformance({
    enabled: showPerformanceOverlay || enableAdaptiveLOD,
    onPerformanceDrop: onPerformanceDrop ? (stats) => onPerformanceDrop(stats.fps) : undefined,
    fpsThreshold: PERFORMANCE_3D.FPS_THRESHOLD,
  });

  const lodManager = useMemo(() => {
    if (!enableAdaptiveLOD) return null;
    return new GraphLODManager({
      adaptiveMode: true,
      targetFps: PERFORMANCE_3D.TARGET_FPS,
      minFps: PERFORMANCE_3D.MIN_FPS,
    });
  }, [enableAdaptiveLOD]);

  // === Cursor-Centered Zoom ===
  useEffect(() => {
    if (!enableCursorCenteredZoom) return;

    const enableZoomToCursor = () => {
      const controls = graphRef.current?.controls?.();
      if (controls && 'zoomToCursor' in controls) {
        controls.zoomToCursor = true;
      }
    };

    enableZoomToCursor();
    const timeoutId = setTimeout(enableZoomToCursor, TIMING.GRAPH_REF_CHECK_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
      const controls = graphRef.current?.controls?.();
      if (controls && 'zoomToCursor' in controls) {
        controls.zoomToCursor = false;
      }
    };
  }, [enableCursorCenteredZoom]);

  // === Container Width Tracking ===
  const [containerWidth, setContainerWidth] = useState(width ?? CONTAINER.DEFAULT_WIDTH);

  useEffect(() => {
    if (!containerRef.current || width) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [width]);

  // === Graph Data Transformation ===
  const filterNodeIds = displayMode === 'filter' ? highlightedNodeIds : undefined;

  const { graphData } = useForceGraph3DData({
    nodes,
    edges,
    filterNodeIds,
    seed,
  });

  const { highlightedPathEdges } = useHighlightedPathEdges({
    highlightedPath,
  });

  // === Highlight Logic ===
  const isNodeHighlighted = useCallback(
    (nodeId: string): boolean => {
      if (highlightedNodeIds.size === 0 && highlightedPath.length === 0) {
        return true;
      }
      return highlightedNodeIds.has(nodeId) || highlightedPath.includes(nodeId);
    },
    [highlightedNodeIds, highlightedPath]
  );

  const isEdgeHighlighted = useCallback(
    (edge: GraphEdge): boolean => {
      if (highlightedPath.length > 0) {
        return highlightedPathEdges.has(`${edge.source}-${edge.target}`);
      }
      if (highlightedNodeIds.size === 0) {
        return true;
      }
      return highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target);
    },
    [highlightedNodeIds, highlightedPath, highlightedPathEdges]
  );

  // === Node Rendering ===
  const { nodeThreeObject, cameraPositionRef } = useNodeThreeObject({
    isNodeHighlighted,
    expandingNodeIds,
    communityAssignments,
    communityColors,
    getNodeStyle,
    lodManager,
  });

  // === Link Styling ===
  const { linkColor, linkWidth } = useLinkStyle({
    isEdgeHighlighted,
    getLinkStyle,
    isPathHighlightMode: highlightedPath.length > 0,
  });

  // === Interactions ===
  const {
    handleNodeClick,
    handleNodeRightClick,
    handleNodeHover,
    handleBackgroundClick,
    handleKeyDown,
  } = useGraph3DInteractions({
    onNodeClick,
    onNodeRightClick,
    onNodeHover,
    onBackgroundClick,
    graphRef,
  });

  // === Simulation Control ===
  useEffect(() => {
    if (graphRef.current) {
      if (enableSimulation) {
        graphRef.current.resumeAnimation();
      } else {
        graphRef.current.pauseAnimation();
      }
    }
  }, [enableSimulation]);

  // === Camera & View Management ===
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        if (enableCameraPersistence && savedCameraState) {
          graphRef.current?.cameraPosition(savedCameraState.position, savedCameraState.lookAt, 0);
        } else {
          graphRef.current?.zoomToFit(TIMING.ZOOM_TO_FIT_DURATION_MS, TIMING.ZOOM_TO_FIT_PADDING);
        }
      }, TIMING.AUTO_FIT_DELAY_MS);
    }
  }, [graphData.nodes.length, enableCameraPersistence, savedCameraState]);

  // === Render Loop (Camera Tracking, LOD, Animation) ===
  useEffect(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;
    let animationFrameId: number;

    const onFrame = () => {
      if (!graph.camera) return;

      const camera = graph.camera();
      if (camera) {
        const pos = camera.position;
        cameraPositionRef.current = { x: pos.x, y: pos.y, z: pos.z };

        if (enableCameraPersistence) {
          const controls = graph.controls?.();
          const lookAt = controls?.target
            ? { x: controls.target.x, y: controls.target.y, z: controls.target.z }
            : { x: 0, y: 0, z: 0 };

          updateCameraState({
            position: { x: pos.x, y: pos.y, z: pos.z },
            lookAt,
            zoom: pos.z,
          });
        }

        if (lodManager) {
          lodManager.recordFrameTime();
        }
      }

      if (showPerformanceOverlay || enableAdaptiveLOD) {
        frameEnd();
        frameStart();
        updateVisibleCounts(graphData.nodes.length, graphData.links.length);
      }

      animateSpinningRings(graph.scene?.());
    };

    const animate = () => {
      onFrame();
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    enableCameraPersistence,
    updateCameraState,
    showPerformanceOverlay,
    enableAdaptiveLOD,
    lodManager,
    frameStart,
    frameEnd,
    updateVisibleCounts,
    graphData.nodes.length,
    graphData.links.length,
    cameraPositionRef,
  ]);

  // === Render ===
  if (!visible) {
    return null;
  }

  const containerStyle = {
    width: width ?? '100%',
    height,
    border: `1px solid ${colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
    borderRadius: 'var(--mantine-radius-md)',
    overflow: 'hidden',
    backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
  };

  if (!webglStatus.available) {
    return (
      <Box ref={containerRef} pos="relative" style={containerStyle}>
        <WebGLFallback reason={webglStatus.reason ?? 'WebGL not available'} />
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      pos="relative"
      tabIndex={0}
      role="application"
      aria-label="3D Graph Visualization. Use arrow keys to pan, +/- to zoom, R to reset view."
      onKeyDown={handleKeyDown}
      style={{ ...containerStyle, outline: 'none' }}
    >
      <LoadingOverlay visible={loading} />
      <ForceGraph3D
        ref={graphRef}
        width={width ?? containerWidth}
        height={height}
        graphData={graphData}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={LINK.DEFAULT_OPACITY}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
        cooldownTime={enableSimulation ? SIMULATION.COOLDOWN_TIME_MS : 0}
        d3AlphaDecay={SIMULATION.ALPHA_DECAY}
        d3VelocityDecay={SIMULATION.VELOCITY_DECAY}
        backgroundColor="rgba(0,0,0,0)"
        warmupTicks={
          graphData.nodes.length > PERFORMANCE_3D.WARMUP_NODE_THRESHOLD
            ? PERFORMANCE_3D.LARGE_GRAPH_WARMUP_TICKS
            : PERFORMANCE_3D.SMALL_GRAPH_WARMUP_TICKS
        }
        cooldownTicks={
          graphData.nodes.length > PERFORMANCE_3D.COOLDOWN_NODE_THRESHOLD
            ? PERFORMANCE_3D.LARGE_GRAPH_COOLDOWN_TICKS
            : PERFORMANCE_3D.NORMAL_COOLDOWN_TICKS
        }
        numDimensions={3}
        d3AlphaMin={
          graphData.nodes.length > PERFORMANCE_3D.COOLDOWN_NODE_THRESHOLD
            ? PERFORMANCE_3D.LARGE_GRAPH_ALPHA_MIN
            : PERFORMANCE_3D.NORMAL_ALPHA_MIN
        }
        controlType="orbit"
      />

      {showPerformanceOverlay && (
        <PerformanceOverlay
          stats={performanceStats}
          enableAdaptiveLOD={enableAdaptiveLOD}
          lodManager={lodManager}
        />
      )}
    </Box>
  );
};
