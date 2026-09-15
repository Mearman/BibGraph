/**
 * Adaptive Graph Renderer
 *
 * Automatically adjusts rendering quality and performance based on device capabilities,
 * screen size, and graph complexity. Provides smooth experience across mobile and desktop.
 */

import { Box, LoadingOverlay, useMantineTheme } from '@mantine/core';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from 'react-force-graph-2d';

import { useTouchGestures } from '@/hooks/use-touch-gestures';
import { announceToScreenReader } from '@/utils/accessibility';

import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '../../styles/hash-colors';
import {
  hasZoomMethod,
  isForceGraphLink,
  isForceGraphNode,
  isGraphCallbackNode,
} from './adaptive-graph-type-guards';
import type {
  AdaptiveGraphRendererProps as AdaptiveGraphRendererProperties,
  PerformanceMetrics,
  PerformanceProfile,
} from './adaptive-graph-types';
import {
  detectDeviceCapabilities,
  determinePerformanceProfile,
  getPerformanceSettings,
} from './adaptive-graph-utils';
import { DeviceIndicator } from './DeviceIndicator';
import { GraphInstructionsPanel } from './GraphInstructionsPanel';
import { GraphTooLargeWarning } from './GraphTooLargeWarning';
import { MobileGraphControls } from './MobileGraphControls';
import { PerformanceOverlay } from './PerformanceOverlay';

const DEFAULT_HEIGHT = 400;
const INITIAL_FPS = 60;
const INITIAL_FRAME_TIME = 16;
const FPS_MEASURE_INTERVAL_MS = 1000;
const GRAPH_READY_CHECK_DELAY_MS = 100;
const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3;
const ZOOM_ANIMATION_DURATION = 200;
const ZOOM_TO_FIT_DURATION = 200;
const LABEL_VISIBILITY_SCALE = 2;
const BORDER_VISIBILITY_SCALE = 1.5;
const MIN_FONT_SIZE = 8;
const FONT_SIZE_SCALE = 10;

// FPS thresholds for the "good"/"ok"/"poor" performance-level classification.
const GOOD_FPS_THRESHOLD = 50;
const OK_FPS_THRESHOLD = 30;

// Node radii (px) per detail level.
const NODE_SIZE_HIGH = 8;
const NODE_SIZE_MEDIUM = 6;
const NODE_SIZE_LOW = 4;
// Node fill opacity when animation is disabled (reduced to signal a lower-fidelity render).
const STATIC_NODE_OPACITY = 0.8;

// Link stroke widths (px) per detail level.
const LINK_WIDTH_HIGH = 2;
const LINK_WIDTH_MEDIUM = 1.5;
const LINK_WIDTH_LOW = 1;
// Link opacity with/without animation.
const ANIMATED_LINK_OPACITY = 0.6;
const STATIC_LINK_OPACITY = 0.4;

// Touch-gesture pinch/swipe zoom multipliers and percentage display conversion.
const SWIPE_ZOOM_IN_MULTIPLIER = 1.1;
const SWIPE_ZOOM_OUT_MULTIPLIER = 0.9;
const PERCENTAGE_MULTIPLIER = 100;
// Double-tap zoom level (vs. the base 1x).
const DOUBLE_TAP_ZOOM_LEVEL = 2;

// d3-force simulation decay rates when animation is enabled vs. disabled (faster settling when static).
const ANIMATED_ALPHA_DECAY = 0.0228;
const STATIC_ALPHA_DECAY = 0.1;
const ANIMATED_VELOCITY_DECAY = 0.4;
const STATIC_VELOCITY_DECAY = 0.8;

export const AdaptiveGraphRenderer = ({
  nodes,
  edges,
  visible = true,
  width,
  height = DEFAULT_HEIGHT,
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  onBackgroundClick,
  enableSimulation = true,
  showPerformanceOverlay = false,
  onGraphReady,
  performanceProfile,
}: AdaptiveGraphRendererProperties) => {
  const theme = useMantineTheme();
  const getIsMobile = useCallback(() => {
    const breakpointPx = Number.parseInt(theme.breakpoints.sm.replace('px', ''));
    return window.innerWidth < breakpointPx;
  }, [theme.breakpoints.sm]);
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<
    ForceGraphMethods<NodeObject, LinkObject<NodeObject>> | undefined
  >(undefined);

  // The externally-provided profile, when present, always wins; auto-detection only supplies the initial value and is never re-run, so this is plain derived state adjusted during render (per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) rather than a set-state-in-effect sync.
  const [currentPerformanceProfile, setCurrentPerformanceProfile] =
    useState<PerformanceProfile>(
      () => performanceProfile ?? determinePerformanceProfile(detectDeviceCapabilities())
    );
  const [lastAppliedProfileProp, setLastAppliedProfileProp] = useState(performanceProfile);
  if (performanceProfile !== lastAppliedProfileProp) {
    setLastAppliedProfileProp(performanceProfile);
    if (performanceProfile !== undefined) {
      setCurrentPerformanceProfile(performanceProfile);
    }
  }

  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      fps: INITIAL_FPS,
      frameTime: INITIAL_FRAME_TIME,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      performanceLevel: 'good',
    });

  // Render settings are fully derived from the current profile and graph size (falling back to 'low' when the graph exceeds the candidate profile's own node budget), so this is a pure useMemo rather than useState+useEffect.
  const { renderSettings, wasAutoDowngraded } = useMemo(() => {
    const candidateSettings = getPerformanceSettings(currentPerformanceProfile, nodes.length);
    const tooManyNodes = nodes.length > candidateSettings.maxNodes;
    return {
      renderSettings: tooManyNodes ? getPerformanceSettings('low', nodes.length) : candidateSettings,
      wasAutoDowngraded: tooManyNodes,
    };
  }, [currentPerformanceProfile, nodes.length]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => { setIsMobile(getIsMobile()); };
    window.addEventListener('resize', checkMobile);
    return () => { window.removeEventListener('resize', checkMobile); };
  }, [getIsMobile]);

  // Announce when the graph is too large for the requested profile and had to be auto-downgraded
  useEffect(() => {
    if (wasAutoDowngraded) {
      announceToScreenReader(
        `Performance adjusted to low quality mode for ${String(nodes.length)} nodes`
      );
    }
  }, [wasAutoDowngraded, nodes.length]);

  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measurePerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= FPS_MEASURE_INTERVAL_MS) {
        const fps = Math.round((frameCount * FPS_MEASURE_INTERVAL_MS) / deltaTime);
        const frameTime = deltaTime / frameCount;
        const performanceLevel =
          fps >= GOOD_FPS_THRESHOLD ? 'good' : fps >= OK_FPS_THRESHOLD ? 'ok' : 'poor';

        setPerformanceMetrics({
          fps,
          frameTime,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          performanceLevel,
        });

        if (performanceLevel === 'poor' && currentPerformanceProfile !== 'low') {
          setCurrentPerformanceProfile('low');
          announceToScreenReader(
            'Performance automatically adjusted to maintain smooth interaction'
          );
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    if (!showPerformanceOverlay) return undefined;

    animationFrameId = requestAnimationFrame(measurePerformance);
    return () => { cancelAnimationFrame(animationFrameId); };
  }, [
    showPerformanceOverlay,
    currentPerformanceProfile,
    nodes.length,
    edges.length,
  ]);

  // Node rendering based on performance settings
  const nodeCanvasObject = useCallback(
    (node: unknown, context: CanvasRenderingContext2D, globalScale: number) => {
      if (!isForceGraphNode(node)) return;

      const size =
        renderSettings.nodeDetail === 'high'
          ? NODE_SIZE_HIGH
          : renderSettings.nodeDetail === 'medium'
            ? NODE_SIZE_MEDIUM
            : NODE_SIZE_LOW;
      const opacity = renderSettings.animationEnabled ? 1 : STATIC_NODE_OPACITY;

      context.globalAlpha = opacity;
      context.beginPath();
      context.arc(node.x, node.y, size, 0, 2 * Math.PI);
      context.fillStyle = HASH_BASED_ENTITY_COLORS[node.entityType];
      context.fill();

      if (
        renderSettings.nodeDetail === 'high' &&
        globalScale > BORDER_VISIBILITY_SCALE
      ) {
        context.strokeStyle = 'var(--mantine-color-body)';
        context.lineWidth = 1;
        context.stroke();
      }

      if (renderSettings.labelEnabled && globalScale > LABEL_VISIBILITY_SCALE) {
        const fontSize = Math.max(FONT_SIZE_SCALE / globalScale, MIN_FONT_SIZE);
        context.font = `${String(fontSize)}px Sans-Serif`;
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillStyle = 'var(--mantine-color-text)';
        context.fillText(node.label, node.x, node.y + size + 2);
      }

      context.globalAlpha = 1;
    },
    [renderSettings]
  );

  // Link rendering
  const linkCanvasObject = useCallback(
    (link: unknown, context: CanvasRenderingContext2D, globalScale: number) => {
      if (!isForceGraphLink(link)) return;

      const lineWidth =
        renderSettings.linkDetail === 'high'
          ? LINK_WIDTH_HIGH
          : renderSettings.linkDetail === 'medium'
            ? LINK_WIDTH_MEDIUM
            : LINK_WIDTH_LOW;
      const opacity = renderSettings.animationEnabled ? ANIMATED_LINK_OPACITY : STATIC_LINK_OPACITY;

      context.globalAlpha = opacity;
      context.strokeStyle = 'var(--mantine-color-gray-5)';
      context.lineWidth = lineWidth / globalScale;
      context.beginPath();
      context.moveTo(link.source.x, link.source.y);
      context.lineTo(link.target.x, link.target.y);
      context.stroke();
      context.globalAlpha = 1;
    },
    [renderSettings]
  );

  // Event handlers
  const handleNodeClick = useCallback(
    (node: unknown) => {
      if (isGraphCallbackNode(node)) {
        onNodeClick?.(node);
      }
    },
    [onNodeClick]
  );

  const handleNodeRightClick = useCallback(
    (node: unknown, event: MouseEvent) => {
      if (!isGraphCallbackNode(node)) {
      	return;
      }

      event.preventDefault();
      onNodeRightClick?.(node, event);
    },
    [onNodeRightClick]
  );

  const handleNodeHover = useCallback(
    (node: unknown) => {
      if (node === null) {
        onNodeHover?.(null);
      } else if (isGraphCallbackNode(node)) {
        onNodeHover?.(node);
      }
    },
    [onNodeHover]
  );

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Touch gesture handlers
  const touchHandlers = useTouchGestures(
    {
      onSwipe: (direction: string) => {
        if (!hasZoomMethod(graphRef.current)) return;
        const currentZoom = graphRef.current.zoom();
        const newZoom =
          direction === 'up' || direction === 'left'
            ? Math.min(currentZoom * SWIPE_ZOOM_IN_MULTIPLIER, ZOOM_MAX)
            : Math.max(currentZoom * SWIPE_ZOOM_OUT_MULTIPLIER, ZOOM_MIN);
        graphRef.current.zoom(newZoom, ZOOM_ANIMATION_DURATION * 2);
        setZoomLevel(newZoom);
        announceToScreenReader(
          `Zoom ${direction === 'up' || direction === 'left' ? 'in' : 'out'} to ${String(Math.round(newZoom * PERCENTAGE_MULTIPLIER))}%`
        );
      },
      onDoubleTap: () => {
        if (!hasZoomMethod(graphRef.current)) {
        	return;
        }

        const currentZoom = graphRef.current.zoom();
        const newZoom = currentZoom === 1 ? DOUBLE_TAP_ZOOM_LEVEL : 1;
        graphRef.current.zoom(newZoom, ZOOM_ANIMATION_DURATION * 2);
        setZoomLevel(newZoom);
        announceToScreenReader(
          `Zoom ${newZoom === 1 ? 'out to fit' : 'in to 200%'}`
        );
      },
      onPinch: (scale: number) => {
        if (!hasZoomMethod(graphRef.current)) {
        	return;
        }

        const currentZoom = graphRef.current.zoom();
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom * scale));
        graphRef.current.zoom(newZoom, 0);
        setZoomLevel(newZoom);
      },
      onLongPress: () => {
        setShowControls((previous) => !previous);
        announceToScreenReader(`Controls ${showControls ? 'hidden' : 'shown'}`);
      },
    },
    {
      swipeThreshold: 50,
      pinchThreshold: 0.1,
      doubleTapDelay: 300,
      longPressDelay: 800,
      preventDefault: false,
    }
  );

  // Notify parent when graph is ready
  useEffect(() => {
    const checkReference = () => {
      if (graphRef.current !== undefined && onGraphReady) {
        onGraphReady(graphRef.current);
      }
    };
    checkReference();
    const timeoutId = setTimeout(checkReference, GRAPH_READY_CHECK_DELAY_MS);
    return () => { clearTimeout(timeoutId); };
  }, [onGraphReady]);

  // Pause/resume simulation based on settings
  useEffect(() => {
    if (graphRef.current !== undefined) {
      if (enableSimulation && renderSettings.animationEnabled) {
        graphRef.current.resumeAnimation();
      } else {
        graphRef.current.pauseAnimation();
      }
    }
  }, [enableSimulation, renderSettings.animationEnabled]);

  // Transform data for force graph
  const graphData = useMemo(() => {
    const forceNodes = nodes.map((node) => ({
      id: node.id,
      entityType: node.entityType,
      label: node.label,
      entityId: node.entityId,
      x: node.x,
      y: node.y,
      originalNode: node,
    }));

    const forceLinks = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      originalEdge: edge,
    }));

    return { nodes: forceNodes, links: forceLinks };
  }, [nodes, edges]);

  // Mobile control handlers
  const handleMobileZoomIn = useCallback(() => {
    if (!hasZoomMethod(graphRef.current)) {
    	return;
    }

    const currentZoom = graphRef.current.zoom();
    const newZoom = Math.min(ZOOM_MAX, currentZoom + ZOOM_STEP);
    graphRef.current.zoom(newZoom, ZOOM_ANIMATION_DURATION);
    setZoomLevel(newZoom);
    announceToScreenReader(`Zoom in to ${String(Math.round(newZoom * PERCENTAGE_MULTIPLIER))}%`);
  }, []);

  const handleMobileZoomOut = useCallback(() => {
    if (!hasZoomMethod(graphRef.current)) {
    	return;
    }

    const currentZoom = graphRef.current.zoom();
    const newZoom = Math.max(ZOOM_MIN, currentZoom - ZOOM_STEP);
    graphRef.current.zoom(newZoom, ZOOM_ANIMATION_DURATION);
    setZoomLevel(newZoom);
    announceToScreenReader(`Zoom out to ${String(Math.round(newZoom * PERCENTAGE_MULTIPLIER))}%`);
  }, []);

  const handleMobileZoomToFit = useCallback(() => {
    if (graphRef.current === undefined) {
    	return;
    }

    graphRef.current.zoomToFit(ZOOM_TO_FIT_DURATION);
    setZoomLevel(1);
  }, []);

  const handleMobileRotate = useCallback(() => {
    // Rotation placeholder - can be implemented with graph transformation
  }, []);

  if (!visible) {
    return null;
  }

  if (nodes.length > renderSettings.maxNodes) {
    return (
      <GraphTooLargeWarning
        width={width}
        height={height}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        maxNodes={renderSettings.maxNodes}
      />
    );
  }

  return (
    <Box
      ref={containerRef}
      pos="relative"
      style={{
        width: width ?? '100%',
        height,
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-body)',
      }}
      role="application"
      aria-label={`Interactive graph with ${String(nodes.length)} nodes and ${String(edges.length)} edges. ${renderSettings.animationEnabled ? 'Animation enabled' : 'Animation disabled for performance'}.`}
      {...(isMobile ? touchHandlers.handlers : {})}
    >
      <LoadingOverlay visible={false} />

      <ForceGraph2D
        ref={graphRef}
        width={width}
        height={height}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        enableZoomInteraction={!isMobile}
        enablePanInteraction={!isMobile}
        cooldownTime={renderSettings.simulationCooldown}
        d3AlphaDecay={renderSettings.animationEnabled ? ANIMATED_ALPHA_DECAY : STATIC_ALPHA_DECAY}
        d3VelocityDecay={renderSettings.animationEnabled ? ANIMATED_VELOCITY_DECAY : STATIC_VELOCITY_DECAY}
      />

      <DeviceIndicator
        isMobile={isMobile}
        performanceProfile={currentPerformanceProfile}
        zoomLevel={zoomLevel}
      />

      {isMobile && showControls && (
        <MobileGraphControls
          onZoomIn={handleMobileZoomIn}
          onZoomOut={handleMobileZoomOut}
          onZoomToFit={handleMobileZoomToFit}
          onRotate={handleMobileRotate}
        />
      )}

      {showPerformanceOverlay && (
        <PerformanceOverlay
          metrics={performanceMetrics}
          renderSettings={renderSettings}
        />
      )}

      <GraphInstructionsPanel isMobile={isMobile} />
    </Box>
  );
};
