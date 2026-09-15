/**
 * useGraphVisualization - Hook for managing graph visualization state
 *
 * Manages visualization state shared between algorithms and graph pages:
 * - Node highlighting and path highlighting
 * - Community detection results and coloring
 * - Display mode (highlight vs filter)
 * - Simulation toggle
 * - View mode (2D/3D) with localStorage persistence
 * - Path source/target selection for pathfinding
 */

import type { GraphNode, ViewMode } from '@bibgraph/types';
import { useCallback, useMemo,useState } from 'react';

import type { DisplayMode } from '@/components/graph/types';

import { useViewModePreference } from './useViewModePreference';


/**
 * Community detection result (from algorithm execution)
 */
export interface CommunityResult {
  id: number;
  nodeIds: string[];
  size: number;
}

/**
 * Visualization state managed by the hook
 */
export interface GraphVisualizationState {
  /**
  Set of highlighted node IDs
   */
  highlightedNodes: Set<string>;

  /**
  Ordered array of node IDs forming a path
   */
  highlightedPath: string[];

  /**
  Map from node ID to community ID
   */
  communityAssignments: Map<string, number>;

  /**
  Map from community ID to color string
   */
  communityColors: Map<number, string>;

  /**
  Current display mode ('highlight' dims, 'filter' hides)
   */
  displayMode: DisplayMode;

  /**
  Whether force simulation is running
   */
  enableSimulation: boolean;

  /**
  Current view mode (2D or 3D)
   */
  viewMode: ViewMode;

  /**
  Source node for pathfinding
   */
  pathSource: string | null;

  /**
  Target node for pathfinding
   */
  pathTarget: string | null;
}

/**
 * Actions/handlers provided by the hook
 */
export interface GraphVisualizationActions {
  /**
  Highlight specific nodes (clears previous highlights)
   */
  highlightNodes: (nodeIds: readonly string[]) => void;

  /**
  Highlight a path (ordered array of node IDs)
   */
  highlightPath: (path: readonly string[]) => void;

  /**
  Clear all highlights and path
   */
  clearHighlights: () => void;

  /**
  Set community detection results for coloring
   */
  setCommunitiesResult: (
    communities: readonly CommunityResult[],
    colors: Map<number, string>
  ) => void;

  /**
  Select a specific community (highlights its nodes)
   */
  selectCommunity: (communityId: number, nodeIds: readonly string[]) => void;

  /**
  Change display mode
   */
  setDisplayMode: (mode: DisplayMode) => void;

  /**
  Toggle force simulation on/off
   */
  setEnableSimulation: (enabled: boolean) => void;

  /**
  Change view mode (2D/3D)
   */
  setViewMode: (mode: ViewMode) => void;

  /**
  Set source node for pathfinding
   */
  setPathSource: (nodeId: string | null) => void;

  /**
  Set target node for pathfinding
   */
  setPathTarget: (nodeId: string | null) => void;

  /**
   * Handle node click in visualization.
   * Implements path source/target selection logic:
   * - First click sets source
   * - Second click sets target
   * - Third click resets to new source
   * - Clicking source/target again clears it
   */
  handleNodeClick: (node: GraphNode) => void;

  /**
  Handle background click (clears selection)
   */
  handleBackgroundClick: () => void;

  /**
  Reset all visualization state to defaults
   */
  reset: () => void;
}

/**
 * Combined return type of useGraphVisualization
 */
export type UseGraphVisualizationResult = GraphVisualizationState & GraphVisualizationActions;

/**
 * Hook for managing graph visualization state.
 *
 * Features:
 * - Node and path highlighting for algorithm results
 * - Community detection coloring
 * - Display mode toggle (highlight vs filter)
 * - Simulation control
 * - 2D/3D view mode with localStorage persistence
 * - Path source/target selection for shortest path
 * @example
 * ```tsx
 * function GraphPage() {
 *   const {
 *     highlightedNodes,
 *     highlightedPath,
 *     communityAssignments,
 *     communityColors,
 *     displayMode,
 *     enableSimulation,
 *     viewMode,
 *     pathSource,
 *     pathTarget,
 *     highlightNodes,
 *     handleNodeClick,
 *     // ... other actions
 *   } = useGraphVisualization();
 *
 *   return (
 *     <>
 *       <ForceGraphVisualization
 *         nodes={nodes}
 *         edges={edges}
 *         highlightedNodeIds={highlightedNodes}
 *         highlightedPath={highlightedPath}
 *         communityAssignments={communityAssignments}
 *         communityColors={communityColors}
 *         displayMode={displayMode}
 *         enableSimulation={enableSimulation}
 *         onNodeClick={handleNodeClick}
 *       />
 *       <AlgorithmTabs
 *         pathSource={pathSource}
 *         pathTarget={pathTarget}
 *         onHighlightNodes={highlightNodes}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export const useGraphVisualization = (): UseGraphVisualizationResult => {
  // Highlighting state
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

  // Community coloring state
  const [communityAssignments, setCommunityAssignments] = useState<Map<string, number>>(new Map());
  const [communityColors, setCommunityColors] = useState<Map<number, string>>(new Map());

  // Display settings
  const [displayMode, setDisplayMode] = useState<DisplayMode>('highlight');
  const [enableSimulation, setEnableSimulation] = useState(true);

  // View mode with localStorage persistence
  const { viewMode, setViewMode } = useViewModePreference('2D');

  // Path selection state
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);

  // ==================== Actions ====================

  /**
   * Highlight specific nodes (clears previous highlights)
   */
  const highlightNodes = useCallback((nodeIds: readonly string[]) => {
    setHighlightedNodes(new Set(nodeIds));
    setHighlightedPath([]);
  }, []);

  /**
   * Highlight a path (ordered array of node IDs)
   */
  const highlightPath = useCallback((path: readonly string[]) => {
    setHighlightedPath([...path]);
    setHighlightedNodes(new Set(path));
  }, []);

  /**
   * Clear all highlights and path
   */
  const clearHighlights = useCallback(() => {
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
  }, []);

  /**
   * Set community detection results for coloring
   */
  const setCommunitiesResult = useCallback((
    communities: readonly CommunityResult[],
    colors: Map<number, string>
  ) => {
    // Build node -> community assignment map
    const assignments = new Map<string, number>();
    for (const community of communities) {
      for (const nodeId of community.nodeIds) {
        assignments.set(nodeId, community.id);
      }
    }
    setCommunityAssignments(assignments);
    setCommunityColors(colors);
  }, []);

  /**
   * Select a specific community (highlights its nodes)
   */
  const selectCommunity = useCallback((communityId: number, nodeIds: readonly string[]) => {
    setHighlightedNodes(new Set(nodeIds));
    setHighlightedPath([]);
  }, []);

  /**
   * Handle node click in visualization.
   * Implements source/target selection for pathfinding.
   */
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (pathSource === node.id) {
      // Clicking source again clears it
      setPathSource(null);
      setHighlightedNodes((previous) => {
        const newSet = new Set(previous);
        newSet.delete(node.id);
        return newSet;
      });
    } else if (pathTarget === node.id) {
      // Clicking target again clears it
      setPathTarget(null);
      setHighlightedNodes((previous) => {
        const newSet = new Set(previous);
        newSet.delete(node.id);
        return newSet;
      });
    } else if (pathSource === null) {
      // No source set - this becomes the source
      setPathSource(node.id);
      setHighlightedNodes(new Set([node.id]));
      setHighlightedPath([]);
    } else if (pathTarget === null) {
      // Source set but no target - this becomes the target
      setPathTarget(node.id);
      setHighlightedNodes(new Set([pathSource, node.id]));
      setHighlightedPath([]);
    } else {
      // Both set - start over with this as new source
      setPathSource(node.id);
      setPathTarget(null);
      setHighlightedNodes(new Set([node.id]));
      setHighlightedPath([]);
    }
  }, [pathSource, pathTarget]);

  /**
   * Handle background click (clears selection)
   */
  const handleBackgroundClick = useCallback(() => {
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
    setPathSource(null);
    setPathTarget(null);
  }, []);

  /**
   * Reset all visualization state to defaults
   */
  const reset = useCallback(() => {
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
    setCommunityAssignments(new Map());
    setCommunityColors(new Map());
    setDisplayMode('highlight');
    setEnableSimulation(true);
    setPathSource(null);
    setPathTarget(null);
  }, []);

  // ==================== Return Value ====================

  return useMemo(() => ({
    // State
    highlightedNodes,
    highlightedPath,
    communityAssignments,
    communityColors,
    displayMode,
    enableSimulation,
    viewMode,
    pathSource,
    pathTarget,

    // Actions
    highlightNodes,
    highlightPath,
    clearHighlights,
    setCommunitiesResult,
    selectCommunity,
    setDisplayMode,
    setEnableSimulation,
    setViewMode,
    setPathSource,
    setPathTarget,
    handleNodeClick,
    handleBackgroundClick,
    reset,
  }), [
    highlightedNodes,
    highlightedPath,
    communityAssignments,
    communityColors,
    displayMode,
    enableSimulation,
    viewMode,
    pathSource,
    pathTarget,
    highlightNodes,
    highlightPath,
    clearHighlights,
    setCommunitiesResult,
    selectCommunity,
    setViewMode,
    handleNodeClick,
    handleBackgroundClick,
    reset,
  ]);
};
