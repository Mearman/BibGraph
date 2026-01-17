/**
 * Entity Graph Page - Visualizes entities from multiple sources as an interactive graph
 *
 * This page provides real-time visualization of entities from:
 * - Catalogue lists (bookmarks, history, custom lists)
 * - Caches (IndexedDB, memory, static)
 *
 * Features:
 * - 2D/3D force-directed layouts
 * - Community detection and pathfinding algorithms
 * - Interactive node exploration
 * - Toggleable data sources
 * @module routes/graph
 */

import type { GraphNode } from '@bibgraph/types';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconDownload,
  IconEye,
  IconFocus2,
  IconFocusCentered,
  IconGraph,
  IconInfoCircle,
  IconLoader,
  IconPencil,
  IconRefresh,
} from '@tabler/icons-react';
import { createLazyFileRoute } from '@tanstack/react-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { type ForceGraphMethods } from 'react-force-graph-2d';

import { ForceGraph3DVisualization } from '@/components/graph/3d/ForceGraph3DVisualization';
import { GraphAnnotations } from '@/components/graph/annotations';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { GraphMiniMap } from '@/components/graph/GraphMiniMap';
import {
  GraphEmptyStateWithPanel,
  GraphErrorState,
  GraphLoadingState,
} from '@/components/graph/GraphPageStates';
import { GraphSourcePanel } from '@/components/graph/GraphSourcePanel';
import { LayoutSelector } from '@/components/graph/LayoutSelector';
import {
  type ContextMenuState,
  INITIAL_CONTEXT_MENU_STATE,
  NodeContextMenu,
} from '@/components/graph/NodeContextMenu';
import { OptimizedForceGraphVisualization } from '@/components/graph/OptimizedForceGraphVisualization';
import { PathHighlightingPresets } from '@/components/graph/path-presets';
import { GraphSnapshots } from '@/components/graph/snapshots';
import type { DisplayMode } from '@/components/graph/types';
import { ViewModeToggle } from '@/components/ui/ViewModeToggle';
import { ICON_SIZE, LAYOUT } from '@/config/style-constants';
import { useGraphVisualizationContext } from '@/contexts/GraphVisualizationContext';
import { type GraphMethods, useFitToView } from '@/hooks/useFitToView';
import { useGraphAnnotations } from '@/hooks/useGraphAnnotations';
import { useGraphExport } from '@/hooks/useGraphExport';
import { type GraphLayoutType, useGraphLayout } from '@/hooks/useGraphLayout';
import { useNodeExpansion } from '@/lib/graph-index';
import type { PathPreset } from '@/lib/path-presets';

/**
 * Entity Graph Page Component
 *
 * Displays entities from multiple sources as an interactive force-directed graph
 */
const EntityGraphPage = () => {
  // Get shared state from context (provided by RootLayout for graph page)
  const context = useGraphVisualizationContext();

  // This component should only be rendered within the provider, so context should never be null
  if (!context) {
    throw new Error('EntityGraphPage must be used within GraphVisualizationProvider');
  }

  const { graphData, visualization } = context;

  // Destructure graph data
  const {
    nodes,
    edges,
    loading,
    isEmpty,
    error,
    sources,
    enabledSourceIds,
    toggleSource,
    enableAll,
    disableAll,
    refresh,
    addNodesAndEdges,
  } = graphData;

  // Node expansion for click-to-expand
  const {
    expandNode,
    isExpanding,
    isExpanded,
    expandingNodeIds,
  } = useNodeExpansion();

  // Destructure visualization state
  const {
    highlightedNodes,
    highlightedPath,
    communityAssignments,
    communityColors,
    displayMode,
    enableSimulation,
    viewMode,
    pathSource,
    pathTarget,
    setDisplayMode,
    setEnableSimulation,
    setViewMode,
    handleNodeClick,
    handleBackgroundClick,
    clearHighlights,
    setPathSource,
    setPathTarget,
    highlightNodes,
    highlightPath,
  } = visualization;

  // Graph methods ref for external control (zoomToFit, etc.)
  const graphMethodsRef = useRef<GraphMethods | null>(null);

  // Ref for the graph container to access canvas for export
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(INITIAL_CONTEXT_MENU_STATE);

  // Annotations state
  const [showAnnotations, setShowAnnotations] = useState(false);
  const annotations = useGraphAnnotations();

  // Mini-map state
  const [cameraPosition, setCameraPosition] = useState({ zoom: 1, panX: 0, panY: 0 });

  // Path highlighting preset state
  const [pathPreset, setPathPreset] = useState<PathPreset>('shortest');

  // Layout state
  const [currentLayout, setCurrentLayout] = useState<GraphLayoutType>('force');
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const layout = useGraphLayout(nodes, edges, currentLayout);

  // Fit-to-view operations (shared logic for 2D/3D)
  const { fitToViewAll, fitToViewSelected } = useFitToView({
    graphMethodsRef,
    viewMode,
    highlightedNodes,
  });

  // Graph export functionality
  const {
    isExportingPNG,
    isExportingSVG,
    handleExportPNG,
    handleExportSVG,
  } = useGraphExport({
    graphContainerRef,
    nodes,
    edges,
    nodePositions,
  });

  // Handler for when graph methods become available
  const handleGraphReady = useCallback(
    (methods: ForceGraphMethods | unknown) => {
      if (methods && typeof methods === 'object' && methods !== null && 'zoomToFit' in methods && typeof (methods as ForceGraphMethods).zoomToFit === 'function') {
        graphMethodsRef.current = methods as GraphMethods;
      }
    },
    []
  );

  // Handle node right-click - show context menu
  const handleNodeRightClick = useCallback(
    (node: Parameters<typeof handleNodeClick>[0], event: MouseEvent) => {
      setContextMenu({
        opened: true,
        x: event.clientX,
        y: event.clientY,
        node,
      });
    },
    []
  );

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(INITIAL_CONTEXT_MENU_STATE);
  }, []);

  // Handle expand from context menu
  const handleExpandFromMenu = useCallback(
    (node: Parameters<typeof handleNodeClick>[0]) => {
      if (!isExpanded(node.id) && !isExpanding(node.id)) {
        void expandNode(node.id, node.entityType).then((result) => {
          if (result.success && (result.nodes.length > 0 || result.edges.length > 0)) {
            addNodesAndEdges(result.nodes, result.edges);
          }
          return void 0;
        });
      }
    },
    [isExpanded, isExpanding, expandNode, addNodesAndEdges]
  );

  // Node type counts for stats
  const nodeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      counts[node.entityType] = (counts[node.entityType] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Handle layout change
  const handleLayoutChange = useCallback((layoutType: GraphLayoutType) => {
    setCurrentLayout(layoutType);

    if (layoutType === 'force') {
      setNodePositions(new Map());
      setEnableSimulation(true);
    } else {
      const positions = layout.applyLayout(layoutType);
      setNodePositions(positions);
      setEnableSimulation(false);
    }
  }, [layout, setEnableSimulation]);

  // Handle camera position changes for mini-map
  const handleZoomChange = useCallback((zoom: number) => {
    setCameraPosition(prev => ({ ...prev, zoom }));
  }, []);

  const handlePanChange = useCallback((panX: number, panY: number) => {
    setCameraPosition(prev => ({ ...prev, panX, panY }));
  }, []);

  // Handle mini-map pan click
  const handleMiniMapPan = useCallback((x: number, y: number) => {
    if (graphMethodsRef.current && typeof graphMethodsRef.current.centerAt === 'function') {
      graphMethodsRef.current.centerAt(x, y, 500);
    }
  }, []);

  // Handle load snapshot
  const handleLoadSnapshot = useCallback((_snapshot: {
    nodes: GraphNode[];
    edges: string;
    zoom: number;
    panX: number;
    panY: number;
    layoutType: GraphLayoutType;
    nodePositions?: Map<string, { x: number; y: number }>;
    annotations?: unknown[];
  }) => {
    setCameraPosition({ zoom: _snapshot.zoom, panX: _snapshot.panX, panY: _snapshot.panY });
    // TODO: Update nodes, edges, layout, and annotations in context
  }, []);

  // Handle path preset change
  const handlePresetChange = useCallback((preset: PathPreset) => {
    setPathPreset(preset);
  }, []);

  // Convert expandingNodeIds array to Set for visualization components
  const expandingNodeIdsSet = useMemo(() => new Set(expandingNodeIds), [expandingNodeIds]);

  // Count enabled sources with entities
  const enabledSourceCount = sources.filter(s => enabledSourceIds.has(s.source.id)).length;

  // Loading state
  if (loading && sources.length === 0) {
    return <GraphLoadingState />;
  }

  // Error state
  if (error) {
    return <GraphErrorState error={error} onRetry={refresh} />;
  }

  // Empty state - no sources enabled or no entities
  if (isEmpty && enabledSourceCount === 0) {
    return (
      <GraphEmptyStateWithPanel
        variant="no-sources"
        sources={sources}
        enabledSourceIds={enabledSourceIds}
        onToggleSource={toggleSource}
        onEnableAll={enableAll}
        onDisableAll={disableAll}
        onRefresh={refresh}
        loading={loading}
      />
    );
  }

  // Empty state with sources enabled but no entities
  if (isEmpty) {
    return (
      <GraphEmptyStateWithPanel
        variant="no-entities"
        sources={sources}
        enabledSourceIds={enabledSourceIds}
        onToggleSource={toggleSource}
        onEnableAll={enableAll}
        onDisableAll={disableAll}
        onRefresh={refresh}
        loading={loading}
      />
    );
  }

  return (
    <Flex h={`calc(100vh - ${LAYOUT.HEADER_HEIGHT}px)`} style={{ overflow: 'hidden' }}>
      {/* Left: Source Panel */}
      <GraphSourcePanel
        sources={sources}
        enabledSourceIds={enabledSourceIds}
        onToggleSource={toggleSource}
        onEnableAll={enableAll}
        onDisableAll={disableAll}
        onRefresh={refresh}
        loading={loading}
      />

      {/* Center: Main Content */}
      <Box flex={1} style={{ overflow: 'auto', padding: 'var(--mantine-spacing-md)' }}>
        <Stack gap="lg">
          {/* Page Header */}
          <Group justify="space-between" align="flex-start">
            <Group>
              <IconGraph size={ICON_SIZE.HEADER} />
              <Stack gap={0}>
                <Title order={2}>Entity Graph</Title>
                <Text c="dimmed" size="sm">
                  {nodes.length} nodes, {edges.length} edges from {enabledSourceCount} source{enabledSourceCount === 1 ? '' : 's'}
                </Text>
              </Stack>
            </Group>
            <Group gap="xs">
              <GraphSnapshots
                nodes={nodes}
                edges={JSON.stringify(edges)}
                zoom={cameraPosition.zoom}
                panX={cameraPosition.panX}
                panY={cameraPosition.panY}
                layoutType={currentLayout}
                nodePositions={nodePositions}
                annotations={annotations.annotations}
                onLoadSnapshot={handleLoadSnapshot}
              />
              <Tooltip label="Export graph as PNG">
                <ActionIcon
                  variant="light"
                  onClick={handleExportPNG}
                  loading={isExportingPNG}
                  aria-label="Export graph as PNG"
                >
                  <IconDownload size={ICON_SIZE.MD} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Export graph as SVG">
                <ActionIcon
                  variant="light"
                  onClick={handleExportSVG}
                  loading={isExportingSVG}
                  aria-label="Export graph as SVG"
                >
                  <IconDownload size={ICON_SIZE.MD} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Refresh data">
                <ActionIcon variant="light" onClick={refresh} loading={loading}>
                  <IconRefresh size={ICON_SIZE.MD} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Graph Visualization Card */}
          <Card withBorder p="md">
            <Stack gap="md">
              {/* Controls Row */}
              <Group justify="space-between">
                <Group gap="xs">
                  <ViewModeToggle value={viewMode} onChange={setViewMode} />
                  <SegmentedControl
                    size="xs"
                    value={displayMode}
                    onChange={(value) => setDisplayMode(value as DisplayMode)}
                    data={[
                      { label: 'Highlight', value: 'highlight' },
                      { label: 'Filter', value: 'filter' },
                    ]}
                  />
                  <PathHighlightingPresets
                    preset={pathPreset}
                    onPresetChange={handlePresetChange}
                    pathSource={pathSource}
                    pathTarget={pathTarget}
                    nodes={nodes}
                    edges={edges}
                    onHighlightNodes={highlightNodes}
                    onHighlightPath={highlightPath}
                    onClearHighlights={clearHighlights}
                  />
                  <LayoutSelector
                    value={currentLayout}
                    onChange={handleLayoutChange}
                    nodes={nodes}
                    edges={edges}
                  />
                </Group>

                <Group gap="xs">
                  <Tooltip label="Fit all nodes to view">
                    <ActionIcon variant="subtle" size="sm" onClick={fitToViewAll} aria-label="Fit all to view">
                      <IconFocusCentered size={ICON_SIZE.MD} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={highlightedNodes.size > 0 ? "Fit selected nodes to view" : "Fit all to view (no selection)"}>
                    <ActionIcon variant="subtle" size="sm" onClick={fitToViewSelected} aria-label="Fit selected to view" disabled={highlightedNodes.size === 0}>
                      <IconFocus2 size={ICON_SIZE.MD} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={enableSimulation ? 'Pause simulation' : 'Resume simulation'}>
                    <ActionIcon variant={enableSimulation ? 'filled' : 'light'} onClick={() => setEnableSimulation(!enableSimulation)}>
                      <IconEye size={ICON_SIZE.MD} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={showAnnotations ? 'Hide annotations' : 'Show annotations'}>
                    <ActionIcon variant={showAnnotations ? 'filled' : 'light'} onClick={() => setShowAnnotations(!showAnnotations)}>
                      <IconPencil size={ICON_SIZE.MD} />
                    </ActionIcon>
                  </Tooltip>
                  {highlightedNodes.size > 0 && (
                    <Button variant="subtle" size="xs" onClick={clearHighlights}>
                      Clear Selection ({highlightedNodes.size})
                    </Button>
                  )}
                  {expandingNodeIds.length > 0 && (
                    <Badge variant="light" color="blue" size="sm" leftSection={<IconLoader size={ICON_SIZE.XS} className="animate-spin" />}>
                      Expanding {expandingNodeIds.length} node{expandingNodeIds.length === 1 ? '' : 's'}...
                    </Badge>
                  )}
                </Group>
              </Group>

              {/* Graph Container */}
              <Box ref={graphContainerRef} h={LAYOUT.GRAPH_VIEWPORT_HEIGHT} mih={350} style={{ border: '1px solid var(--mantine-color-gray-2)', overflow: 'hidden' }}>
                {viewMode === '2D' ? (
                  <OptimizedForceGraphVisualization
                    nodes={nodes}
                    edges={edges}
                    highlightedNodeIds={highlightedNodes}
                    highlightedPath={highlightedPath}
                    communityAssignments={communityAssignments}
                    communityColors={communityColors}
                    expandingNodeIds={expandingNodeIdsSet}
                    _displayMode={displayMode}
                    enableSimulation={enableSimulation}
                    nodePositions={nodePositions}
                    onNodeClick={handleNodeClick}
                    onNodeRightClick={handleNodeRightClick}
                    onBackgroundClick={handleBackgroundClick}
                    onGraphReady={handleGraphReady}
                    onZoom={handleZoomChange}
                    onPan={handlePanChange}
                    enableOptimizations={true}
                    progressiveLoading={{ enabled: true, batchSize: 50, batchDelayMs: 16 }}
                  />
                ) : (
                  <ForceGraph3DVisualization
                    nodes={nodes}
                    edges={edges}
                    highlightedNodeIds={highlightedNodes}
                    highlightedPath={highlightedPath}
                    communityAssignments={communityAssignments}
                    communityColors={communityColors}
                    expandingNodeIds={expandingNodeIdsSet}
                    displayMode={displayMode}
                    enableSimulation={enableSimulation}
                    onNodeClick={handleNodeClick}
                    onNodeRightClick={handleNodeRightClick}
                    onBackgroundClick={handleBackgroundClick}
                    onGraphReady={handleGraphReady}
                  />
                )}

                <NodeContextMenu
                  state={contextMenu}
                  onClose={handleCloseContextMenu}
                  onExpand={handleExpandFromMenu}
                  onSetPathSource={setPathSource}
                  onSetPathTarget={setPathTarget}
                  isExpanding={isExpanding}
                  isExpanded={isExpanded}
                  pathSource={pathSource}
                  pathTarget={pathTarget}
                />

                {showAnnotations && viewMode === '2D' && (
                  <GraphAnnotations
                    width={graphContainerRef.current?.clientWidth ?? 800}
                    height={typeof window !== 'undefined' ? window.innerHeight * 0.55 : 500}
                    annotations={annotations.annotations}
                    onAddAnnotation={async (annotation) => { await annotations.addAnnotation(annotation); }}
                    onClearAnnotations={async () => { await annotations.clearAnnotations(); }}
                  />
                )}

                {viewMode === '2D' && (
                  <GraphMiniMap
                    nodes={nodes}
                    containerWidth={graphContainerRef.current?.clientWidth ?? 800}
                    containerHeight={typeof window !== 'undefined' ? window.innerHeight * 0.55 : 500}
                    zoom={cameraPosition.zoom}
                    panX={cameraPosition.panX}
                    panY={cameraPosition.panY}
                    onPan={handleMiniMapPan}
                  />
                )}

                <GraphLegend entityTypes={nodes.map(n => n.entityType)} showEdgeTypes={true} position="top-right" />
              </Box>
            </Stack>
          </Card>

          {/* Stats Summary */}
          <Group gap="md">
            {Object.entries(nodeTypeCounts).map(([type, count]) => (
              <Badge key={type} variant="light" size="lg">{type}: {count}</Badge>
            ))}
          </Group>

          {/* Path selection info */}
          {(pathSource || pathTarget) && (
            <Alert icon={<IconInfoCircle size={ICON_SIZE.MD} />} color="blue" title="Path Selection">
              <Text size="sm">
                {pathSource && !pathTarget && `Source selected: ${pathSource}. Click another node to set target.`}
                {pathSource && pathTarget && `Source: ${pathSource} -> Target: ${pathTarget}`}
              </Text>
            </Alert>
          )}
        </Stack>
      </Box>
    </Flex>
  );
};

export const Route = createLazyFileRoute('/graph')({
  component: EntityGraphPage,
});

export default EntityGraphPage;
