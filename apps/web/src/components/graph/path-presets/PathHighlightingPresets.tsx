/**
 * Path Highlighting Presets Component
 *
 * Provides preset path analysis modes:
 * - Shortest path between two nodes (default)
 * - All outgoing paths from source
 * - All incoming paths to target
 * - All paths between source and target
 *
 * @module components/graph/path-presets
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { Group, SegmentedControl, Text, Tooltip } from '@mantine/core';
import { useMemo } from 'react';

import { findReachableNodes, type PathPreset } from '@/lib/path-presets';

interface PathHighlightingPresetsProps {
  /** Currently selected preset */
  preset: PathPreset;
  /** Callback when preset changes */
  onPresetChange: (preset: PathPreset) => void;
  /** Source node ID */
  pathSource: string | null;
  /** Target node ID */
  pathTarget: string | null;
  /** All graph nodes */
  nodes: GraphNode[];
  /** All graph edges */
  edges: GraphEdge[];
  /** Callback to highlight nodes */
  onHighlightNodes: (nodeIds: string[]) => void;
  /** Callback to highlight path */
  onHighlightPath: (path: string[]) => void;
  /** Callback to clear highlights */
  onClearHighlights: () => void;
}

/** Preset descriptions for tooltips */
const PRESET_DESCRIPTIONS: Record<PathPreset, string> = {
  shortest: 'Find shortest path between source and target nodes',
  'outgoing-paths': 'Show all paths going out from source node',
  'incoming-paths': 'Show all paths coming into target node',
  'all-paths': 'Find all paths between source and target nodes',
} as const;

/**
 * Path Highlighting Presets Component
 * @param root0
 * @param root0.preset
 * @param root0.onPresetChange
 * @param root0.pathSource
 * @param root0.pathTarget
 * @param root0.nodes
 * @param root0.edges
 * @param root0.onHighlightNodes
 * @param root0.onHighlightPath
 * @param root0.onClearHighlights
 */
export const PathHighlightingPresets: React.FC<PathHighlightingPresetsProps> = ({
  preset,
  onPresetChange,
  pathSource,
  pathTarget,
  nodes,
  edges,
  onHighlightNodes: _onHighlightNodes,
  onHighlightPath: _onHighlightPath,
  onClearHighlights: _onClearHighlights,
}) => {
  // Build graph adjacency map for pathfinding
  const graph = useMemo(() => {
    const adjacency = new Map<string, Set<string>>();

    // Initialize all nodes
    nodes.forEach((node) => {
      adjacency.set(node.id, new Set());
    });

    // Build adjacency list from edges
    edges.forEach((edge) => {
      const sourceId = typeof edge.source === 'string' ? edge.source : String(edge.source);
      const targetId = typeof edge.target === 'string' ? edge.target : String(edge.target);

      if (adjacency.has(sourceId)) {
        adjacency.get(sourceId)?.add(targetId);
      }
    });

    return adjacency;
  }, [nodes, edges]);

  // Calculate path count
  const pathCount = useMemo(() => {
    if (preset === 'shortest' || preset === 'all-paths') {
      if (!pathSource || !pathTarget) return 0;
      const reachable = findReachableNodes(graph, pathSource, pathTarget, preset === 'all-paths' ? 10 : 1);
      return reachable.length;
    } else if (preset === 'outgoing-paths') {
      if (!pathSource) return 0;
      return findReachableNodes(graph, pathSource).length;
    } else if (preset === 'incoming-paths') {
      if (!pathTarget) return 0;
      const reversedGraph = new Map<string, Set<string>>();
      graph.forEach((_, nodeId) => {
        reversedGraph.set(nodeId, new Set());
      });
      graph.forEach((neighbors, fromNode) => {
        neighbors.forEach((toNode) => {
          reversedGraph.get(toNode)?.add(fromNode);
        });
      });
      return findReachableNodes(reversedGraph, pathTarget).length;
    }
    return 0;
  }, [preset, pathSource, pathTarget, graph]);

  return (
    <Group gap="xs">
      <Tooltip label={PRESET_DESCRIPTIONS[preset]}>
        <SegmentedControl
          size="xs"
          value={preset}
          onChange={(value) => onPresetChange(value as PathPreset)}
          data={[
            { label: 'Shortest', value: 'shortest' },
            { label: 'Outgoing', value: 'outgoing-paths' },
            { label: 'Incoming', value: 'incoming-paths' },
            { label: 'All Paths', value: 'all-paths' },
          ]}
        />
      </Tooltip>

      {/* Path count display */}
      {pathCount > 0 && (
        <Text size="xs" c="dimmed" ml="xs">
          {pathCount} node{pathCount === 1 ? '' : 's'}
        </Text>
      )}
    </Group>
  );
};
