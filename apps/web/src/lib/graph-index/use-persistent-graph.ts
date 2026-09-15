/**
 * usePersistentGraph - React hook for loading graph data from PersistentGraph
 *
 * Provides fast graph visualization loading by:
 * - Hydrating from IndexedDB on first access
 * - Transforming GraphNodeRecord/GraphEdgeRecord to visualization nodes/edges
 * - Tracking hydration status and statistics
 *
 * Module: lib/graph-index/use-persistent-graph
 */

import { getPersistentGraph, type PersistentGraph } from '@bibgraph/client';
import type { GraphEdge, GraphEdgeRecord,GraphNode, GraphNodeRecord, GraphStatistics  } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';
import { useCallback, useEffect, useMemo,useState } from 'react';

const LOG_PREFIX = 'use-persistent-graph';

// Random initial node positions are centered on the origin, spread across an 800x600 viewport-sized area, before the force simulation repositions them.
const INITIAL_POSITION_X_RANGE = 800;
const INITIAL_POSITION_X_OFFSET = 400;
const INITIAL_POSITION_Y_RANGE = 600;
const INITIAL_POSITION_Y_OFFSET = 300;

/**
 * Hydration status for the persistent graph
 */
export type HydrationStatus = 'not_started' | 'hydrating' | 'hydrated' | 'error';

/**
 * Result of the usePersistentGraph hook
 */
export interface UsePersistentGraphResult {
  /**
  Graph nodes transformed for visualization
   */
  nodes: GraphNode[];

  /**
  Graph edges transformed for visualization
   */
  edges: GraphEdge[];

  /**
  Whether the graph is currently loading/hydrating
   */
  loading: boolean;

  /**
  True when graph has no data
   */
  isEmpty: boolean;

  /**
  Error if loading/hydration failed
   */
  error: Error | null;

  /**
  Current hydration status
   */
  hydrationStatus: HydrationStatus;

  /**
  Graph statistics (node/edge counts by type)
   */
  statistics: GraphStatistics | null;

  /**
  Access to the underlying PersistentGraph instance
   */
  graph: PersistentGraph;

  /**
  Force refresh by re-hydrating from IndexedDB
   */
  refresh: () => Promise<void>;
}

/**
 * Transform GraphNodeRecord to GraphNode for visualization
 */
const nodeRecordToGraphNode = (record: GraphNodeRecord): GraphNode => ({
    id: record.id,
    entityType: record.entityType,
    entityId: record.id,
    label: record.label,
    // Initialize with random positions - force simulation will reposition
    x: Math.random() * INITIAL_POSITION_X_RANGE - INITIAL_POSITION_X_OFFSET,
    y: Math.random() * INITIAL_POSITION_Y_RANGE - INITIAL_POSITION_Y_OFFSET,
    externalIds: [],
    // Pass completeness as metadata for visual distinction
    entityData: {
      completeness: record.completeness,
      cachedAt: record.cachedAt,
      updatedAt: record.updatedAt,
      ...record.metadata,
    },
  });

/**
 * Transform GraphEdgeRecord to GraphEdge for visualization
 */
const edgeRecordToGraphEdge = (record: GraphEdgeRecord): GraphEdge => ({
    id: record.id,
    source: record.source,
    target: record.target,
    type: record.type,
    weight: record.score ?? 1,
    // Include edge properties for filtering/display
    metadata: {
      direction: record.direction,
      authorPosition: record.authorPosition,
      isCorresponding: record.isCorresponding,
      isOpenAccess: record.isOpenAccess,
      version: record.version,
      score: record.score,
      years: record.years,
      awardId: record.awardId,
      role: record.role,
      discoveredAt: record.discoveredAt,
    },
  });

/**
 * Hook for loading graph data from the persistent graph index
 *
 * Usage:
 * ```tsx
 * const { nodes, edges, loading, isEmpty, statistics } = usePersistentGraph();
 *
 * if (loading) return <LoadingSpinner />;
 * if (isEmpty) return <EmptyState />;
 *
 * return <GraphVisualization nodes={nodes} edges={edges} />;
 * ```
 */
export const usePersistentGraph = (): UsePersistentGraphResult => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hydrationStatus, setHydrationStatus] = useState<HydrationStatus>('not_started');
  const [statistics, setStatistics] = useState<GraphStatistics | null>(null);

  // Get singleton graph instance
  const graph = useMemo(() => getPersistentGraph(), []);

  /**
   * Load graph data and transform for visualization
   */
  const loadGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Update hydration status from graph
      const graphHydrationState = graph.getHydrationState();
      if (graphHydrationState === 'not_started' || graphHydrationState === 'hydrating') {
        setHydrationStatus('hydrating');
      }

      // Initialize/hydrate the graph
      await graph.initialize();
      setHydrationStatus('hydrated');

      // Get all nodes and edges
      const nodeRecords = graph.getAllNodes();
      const edgeRecords = graph.getAllEdges();

      // Transform to visualization format
      const graphNodes = nodeRecords.map(nodeRecordToGraphNode);
      const graphEdges = edgeRecords.map(edgeRecordToGraphEdge);

      setNodes(graphNodes);
      setEdges(graphEdges);

      // Get statistics
      const stats = graph.getStatistics();
      setStatistics(stats);

      logger.debug(LOG_PREFIX, 'Graph data loaded', {
        nodes: graphNodes.length,
        edges: graphEdges.length,
        statistics: stats,
      });
    } catch (error_) {
      const loadError = error_ instanceof Error ? error_ : new Error('Failed to load persistent graph');
      setError(loadError);
      setHydrationStatus('error');
      logger.error(LOG_PREFIX, 'Failed to load graph', { error: error_ });
    } finally {
      setLoading(false);
    }
  }, [graph]);

  /**
   * Force refresh by re-hydrating from IndexedDB
   */
  const refresh = useCallback(async () => {
    await loadGraphData();
  }, [loadGraphData]);

  // Initial load
  useEffect(() => {
    void loadGraphData();
  }, [loadGraphData]);

  const isEmpty = useMemo(
    () => nodes.length === 0 && edges.length === 0,
    [nodes.length, edges.length]
  );

  return {
    nodes,
    edges,
    loading,
    isEmpty,
    error,
    hydrationStatus,
    statistics,
    graph,
    refresh,
  };
};

/**
 * Hook for getting graph statistics only (lighter weight)
 */
export const usePersistentGraphStatistics = (): {
  statistics: GraphStatistics | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} => {
  const [statistics, setStatistics] = useState<GraphStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const graph = useMemo(() => getPersistentGraph(), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await graph.initialize();
      const stats = graph.getStatistics();
      setStatistics(stats);
    } catch (error_) {
      const loadError = error_ instanceof Error ? error_ : new Error('Failed to load statistics');
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [graph]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { statistics, loading, error, refresh };
};
