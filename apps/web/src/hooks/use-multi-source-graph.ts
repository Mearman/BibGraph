/**
 * useMultiSourceGraph - Hook for loading graph data from multiple sources
 *
 * Manages multiple data sources (catalogue lists, caches) and combines them
 * into a unified graph visualization with toggleable visibility per source.
 */

import { getPersistentGraph } from '@bibgraph/client';
import type { AuthorPosition,GraphEdge, GraphNode } from '@bibgraph/types';
import { ENTITY_TYPES } from '@bibgraph/types';
import type {
  GraphDataSource,
  GraphDataSourceState,
  GraphSourceEntity,
} from '@bibgraph/utils';
import { logger } from '@bibgraph/utils';
import { useCallback, useEffect, useMemo,useRef, useState } from 'react';

import { useStorageProvider } from '@/contexts/storage-provider-context';
import {
  createBookmarksSource,
  createCatalogueListSource,
  createGraphListSource,
  createHistorySource,
  createIndexedDBCacheSource,
  createMemoryCacheSource,
  createPersistentGraphSource,
  createStaticCacheSource,
} from '@/lib/graph-sources';

import { loadEnabledSources, saveEnabledSources } from './graph-source-toggles-storage';
import { isRelationType } from './relationship-query-transformers';

const LOG_PREFIX = 'multi-source-graph';
const AUTHOR_POSITIONS = ['first', 'middle', 'last'] as const;

const isEntityType = (value: string): value is GraphNode['entityType'] => ENTITY_TYPES.some(t => t === value);
const isAuthorPosition = (value: string): value is AuthorPosition => AUTHOR_POSITIONS.some(p => p === value);

/**
 * Check if an entity is from the graph list source
 * T041: Graph list nodes take priority during deduplication
 */
const isGraphListEntity = (entity: GraphSourceEntity): boolean => {
  // Check sourceId first (most reliable)
  if (entity.sourceId === 'catalogue:graph-list') {
    return true;
  }

  // Also check for provenance metadata (nodes can have provenance even from other sources)
  if (entity.entityData._graphListProvenance !== undefined) {
    return true;
  }

  return false;
};

/**
 * Deduplicate entities with graph list priority
 * T041: When same entity exists in multiple sources, prioritize graph list version
 * @param entities - Array of entities from multiple sources
 * @returns Deduplicated array with graph list nodes taking priority
 */
export const deduplicateEntities = (entities: readonly GraphSourceEntity[]): GraphSourceEntity[] => {
  const entityMap = new Map<string, GraphSourceEntity>();

  for (const entity of entities) {
    const existing = entityMap.get(entity.entityId);

    if (!existing) {
      // First occurrence of this entity - add it
      entityMap.set(entity.entityId, entity);
      continue;
    }

    // Entity already exists - check if we should replace it
    const isEntityIsGraphList = isGraphListEntity(entity);
    const isExistingIsGraphList = isGraphListEntity(existing);

    if (isEntityIsGraphList && !isExistingIsGraphList) {
      // Replace collection node with graph list node
      entityMap.set(entity.entityId, entity);
    } else if (!isEntityIsGraphList && isExistingIsGraphList) {
      // Keep existing graph list node over collection node
    }
    // If both are graph list or both are collection, keep first occurrence
  }

  return [...entityMap.values()];
};

const INITIAL_NODE_X_RANGE = 800;
const INITIAL_NODE_X_OFFSET = 400;
const INITIAL_NODE_Y_RANGE = 600;
const INITIAL_NODE_Y_OFFSET = 300;

/**
 * Convert GraphSourceEntity to GraphNode
 */
const sourceEntityToNode = (entity: Readonly<GraphSourceEntity>): GraphNode => ({
    id: entity.entityId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    label: entity.label,
    x: Math.random() * INITIAL_NODE_X_RANGE - INITIAL_NODE_X_OFFSET,
    y: Math.random() * INITIAL_NODE_Y_RANGE - INITIAL_NODE_Y_OFFSET,
    externalIds: [],
    entityData: {
      ...entity.entityData,
      sourceId: entity.sourceId, // Track which source provided this node
    },
  });

/**
 * Build edges from entity relationships Only creates edges where both endpoints exist in the entity map Preserves edge properties (score, authorPosition, etc.) for weighted traversal
 */
const buildEdges = (entities: readonly GraphSourceEntity[], entityIds: Set<string>): GraphEdge[] => {
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  for (const entity of entities) {
    for (const rel of entity.relationships) {
      // Only create edge if target exists in our entity set
      if (!entityIds.has(rel.targetId)) {
      	continue;
      }

      const edgeKey = `${entity.entityId}-${rel.targetId}-${rel.relationType}`;
      const reverseKey = `${rel.targetId}-${entity.entityId}-${rel.relationType}`;

      if (!seenEdges.has(edgeKey) && !seenEdges.has(reverseKey)) {
        seenEdges.add(edgeKey);
        edges.push({
          id: edgeKey,
          source: entity.entityId,
          target: rel.targetId,
          type: rel.relationType,
          weight: rel.score ?? 1,
          // Include edge properties for weighted traversal
          score: rel.score,
          authorPosition: rel.authorPosition,
          isCorresponding: rel.isCorresponding,
          isOpenAccess: rel.isOpenAccess,
        });
      }
    }
  }

  return edges;
};

/**
 * Result of the useMultiSourceGraph hook
 */
export interface UseMultiSourceGraphResult {
  /**
  Combined nodes from all enabled sources
   */
  nodes: GraphNode[];

  /**
  Edges between nodes (cross-source supported)
   */
  edges: GraphEdge[];

  /**
  Loading state
   */
  loading: boolean;

  /**
  True when no entities from any enabled source
   */
  isEmpty: boolean;

  /**
  Error if loading failed
   */
  error: Error | null;

  /**
  Available data sources with their state
   */
  sources: GraphDataSourceState[];

  /**
  Set of enabled source IDs
   */
  enabledSourceIds: Set<string>;

  /**
  Toggle a single source on/off
   */
  toggleSource: (sourceId: string) => void;

  /**
  Enable multiple sources
   */
  enableSources: (sourceIds: readonly string[]) => void;

  /**
  Disable multiple sources
   */
  disableSources: (sourceIds: readonly string[]) => void;

  /**
  Enable all sources
   */
  enableAll: () => void;

  /**
  Disable all sources
   */
  disableAll: () => void;

  /**
  Force refresh all data
   */
  refresh: () => Promise<void>;

  /**
  Add nodes and edges incrementally (without full refresh)
   */
  addNodesAndEdges: (
    newNodes: readonly { id: string; entityType: string; label: string; completeness?: string }[],
    newEdges: readonly { source: string; target: string; type: string; score?: number; authorPosition?: string; isCorresponding?: boolean; isOpenAccess?: boolean }[]
  ) => void;

  /**
  Update labels on multiple existing nodes (for auto-population)
   */
  updateNodeLabels: (updates: Map<string, string>) => void;

  /**
  Add edges discovered through auto-population
   */
  addDiscoveredEdges: (newEdges: readonly GraphEdge[]) => void;
}

/**
 * Hook for managing multi-source graph data
 */
export const useMultiSourceGraph = (): UseMultiSourceGraphResult => {
  const storage = useStorageProvider();

  // Available sources
  const [sources, setSources] = useState<GraphDataSourceState[]>([]);
  const [enabledSourceIds, setEnabledSourceIds] = useState<Set<string>>(() => loadEnabledSources());

  // Graph data
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track initialization
  const initializedReference = useRef(false);
  const loadingSourcesReference = useRef<Set<string>>(new Set());

  /**
   * Discover all available sources
   * T032: Graph list source integrated into multi-source graph
   */
  const discoverSources = useCallback(async (): Promise<GraphDataSource[]> => {
    const discovered: GraphDataSource[] = [];

    // Always add bookmarks, history, and graph list (system special lists)
    discovered.push(createBookmarksSource(storage));
    discovered.push(createHistorySource(storage));
    discovered.push(createGraphListSource(storage)); // T032: Graph list as persistent working set

    // Add user-created catalogue lists
    try {
      const lists = await storage.getAllLists();
      for (const list of lists) {
        // Skip system lists (bookmarks, history, graph list) - they're added above
        if (list.id === 'bookmarks-list' || list.id === 'history-list' || list.id === 'graph-list') continue;
        if (list.id !== undefined && list.id !== '') {
          discovered.push(createCatalogueListSource(storage, list.id, list));
        }
      }
    } catch (error_) {
      logger.debug(LOG_PREFIX, 'Failed to load catalogue lists', { error: error_ });
    }

    // Add persistent graph source (primary source for relationship data)
    const persistentGraphSource = createPersistentGraphSource();
    if (await persistentGraphSource.isAvailable()) {
      discovered.push(persistentGraphSource);
    }

    // Add cache sources
    const indexedDBSource = createIndexedDBCacheSource();
    if (await indexedDBSource.isAvailable()) {
      discovered.push(indexedDBSource);
    }

    const memorySource = createMemoryCacheSource();
    if (await memorySource.isAvailable()) {
      discovered.push(memorySource);
    }

    const staticSource = createStaticCacheSource();
    if (await staticSource.isAvailable()) {
      discovered.push(staticSource);
    }

    return discovered;
  }, [storage]);

  /**
   * Load entity counts for all sources
   */
  const loadSourceStates = useCallback(async (
    discoveredSources: readonly GraphDataSource[]
  ): Promise<GraphDataSourceState[]> => {
    const states: GraphDataSourceState[] = [];

    for (const source of discoveredSources) {
      try {
        const count = await source.getEntityCount();
        states.push({
          source,
          enabled: enabledSourceIds.has(source.id),
          entityCount: count,
          loading: false,
          error: null,
        });
      } catch (error_) {
        states.push({
          source,
          enabled: enabledSourceIds.has(source.id),
          entityCount: null,
          loading: false,
          error: error_ instanceof Error ? error_ : new Error('Failed to load count'),
        });
      }
    }

    return states;
  }, [enabledSourceIds]);

  /**
   * Load graph data from enabled sources
   */
  const loadGraphData = useCallback(async (sourceStates: readonly GraphDataSourceState[]) => {
    const enabledStates = sourceStates.filter(s => s.enabled);

    if (enabledStates.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const allEntities: GraphSourceEntity[] = [];

    // Load entities from each enabled source
    for (const state of enabledStates) {
      if (loadingSourcesReference.current.has(state.source.id)) continue;

      try {
        loadingSourcesReference.current.add(state.source.id);
        const entities = await state.source.getEntities();

        // Collect all entities (deduplication happens after all sources loaded)
        allEntities.push(...entities);
      } catch (error_) {
        logger.warn(LOG_PREFIX, `Failed to load from ${state.source.id}`, { error: error_ });
      } finally {
        loadingSourcesReference.current.delete(state.source.id);
      }
    }

    // T041: Deduplicate entities with graph list priority
    const deduplicatedEntities = deduplicateEntities(allEntities);

    // Build initial nodes from deduplicated entities
    let nodeArray = deduplicatedEntities.map(sourceEntityToNode);
    const entityIds = new Set(deduplicatedEntities.map(e => e.entityId));

    // Build edges from entity relationships
    const relationshipEdges = buildEdges(deduplicatedEntities, entityIds);

    // Also fetch edges and connected nodes from persistent graph
    // This ensures nodes and edges discovered during expansion are included
    const seenEdgeKeys = new Set(relationshipEdges.map(e => `${e.source}-${e.target}-${e.type}`));
    const persistentGraphEdges: GraphEdge[] = [];
    const persistentGraphNodes: GraphNode[] = [];

    try {
      const graph = getPersistentGraph();
      await graph.initialize();
      const graphEdges = graph.getAllEdges();

      // Find edges where BOTH endpoints are in current entity set
      // This ensures we only show relationships between existing nodes
      // without automatically expanding to new nodes
      for (const edge of graphEdges) {
        const isSourceInSet = entityIds.has(edge.source);
        const isTargetInSet = entityIds.has(edge.target);

        // Only include edge if BOTH endpoints are in current set
        if (isSourceInSet && isTargetInSet) {
          const edgeKey = `${edge.source}-${edge.target}-${edge.type}`;
          const reverseKey = `${edge.target}-${edge.source}-${edge.type}`;

          if (!seenEdgeKeys.has(edgeKey) && !seenEdgeKeys.has(reverseKey)) {
            seenEdgeKeys.add(edgeKey);
            persistentGraphEdges.push({
              id: edgeKey,
              source: edge.source,
              target: edge.target,
              type: edge.type,
              weight: edge.score ?? 1,
              score: edge.score,
              authorPosition: edge.authorPosition,
              isCorresponding: edge.isCorresponding,
              isOpenAccess: edge.isOpenAccess,
            });
          }
        }
      }
    } catch (error_) {
      logger.debug(LOG_PREFIX, 'Failed to load from persistent graph', { error: error_ });
    }

    // Combine nodes and edges from both sources
    nodeArray = [...nodeArray, ...persistentGraphNodes];
    const edgeArray = [...relationshipEdges, ...persistentGraphEdges];

    setNodes(nodeArray);
    setEdges(edgeArray);

    logger.debug(LOG_PREFIX, 'Graph data loaded', {
      sources: enabledStates.length,
      nodes: nodeArray.length,
      edges: edgeArray.length,
      relationshipEdges: relationshipEdges.length,
      persistentGraphEdges: persistentGraphEdges.length,
      persistentGraphNodes: persistentGraphNodes.length,
    });
  }, []);

  /**
   * Full refresh - rediscover sources and reload data
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize storage if needed
      if (!initializedReference.current) {
        await storage.initializeSpecialLists();
        initializedReference.current = true;
      }

      // Discover sources
      const discovered = await discoverSources();
      const states = await loadSourceStates(discovered);
      setSources(states);

      // Load graph data
      await loadGraphData(states);
    } catch (error_) {
      const loadError = error_ instanceof Error ? error_ : new Error('Failed to load graph data');
      setError(loadError);
      logger.error(LOG_PREFIX, 'Failed to load graph', { error: error_ });
    } finally {
      setLoading(false);
    }
  }, [storage, discoverSources, loadSourceStates, loadGraphData]);

  /**
   * Toggle a single source
   */
  const toggleSource = useCallback((sourceId: string) => {
    setEnabledSourceIds(previous => {
      const next = new Set(previous);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      saveEnabledSources(next);
      return next;
    });
  }, []);

  /**
   * Enable multiple sources
   */
  const enableSources = useCallback((sourceIds: readonly string[]) => {
    setEnabledSourceIds(previous => {
      const next = new Set(previous);
      for (const id of sourceIds) {
        next.add(id);
      }
      saveEnabledSources(next);
      return next;
    });
  }, []);

  /**
   * Disable multiple sources
   */
  const disableSources = useCallback((sourceIds: readonly string[]) => {
    setEnabledSourceIds(previous => {
      const next = new Set(previous);
      for (const id of sourceIds) {
        next.delete(id);
      }
      saveEnabledSources(next);
      return next;
    });
  }, []);

  /**
   * Enable all sources
   */
  const enableAll = useCallback(() => {
    const allIds = sources.map(s => s.source.id);
    enableSources(allIds);
  }, [sources, enableSources]);

  /**
   * Disable all sources
   */
  const disableAll = useCallback(() => {
    setEnabledSourceIds(new Set());
    saveEnabledSources(new Set());
  }, []);

  // Initial load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reload graph data when enabled sources change
  useEffect(() => {
    if (sources.length === 0) {
    	return;
    }

    // Update source states with new enabled values
    const updatedStates = sources.map(s => ({
      ...s,
      enabled: enabledSourceIds.has(s.source.id),
    }));
    setSources(updatedStates);

    // Reload graph data
    setLoading(true);
    void loadGraphData(updatedStates)
      .catch((error_: unknown) => {
        logger.error(LOG_PREFIX, 'Failed to reload graph', { error: error_ });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [enabledSourceIds, sources.length, loadGraphData]);

  const isEmpty = useMemo(() => nodes.length === 0 && edges.length === 0, [nodes, edges]);

  /**
   * Check if a label looks like an ID-only label (no display name resolved)
   * ID-only labels match the OpenAlex ID pattern: letter followed by digits
   */
  const isIdOnlyLabel = useCallback((label: string): boolean => {
    return /^[A-Z]\d+$/i.test(label);
  }, []);

  /**
   * Add nodes and edges incrementally without full refresh
   * Used after node expansion to add discovered entities
   *
   * Also updates labels on existing nodes if the new node has a resolved
   * (non-ID) label and the existing node has an ID-only label.
   */
  const addNodesAndEdges = useCallback((
    newNodes: readonly { id: string; entityType: string; label: string; completeness?: string }[],
    newEdges: readonly { source: string; target: string; type: string; score?: number; authorPosition?: string; isCorresponding?: boolean; isOpenAccess?: boolean }[]
  ) => {
    // Build map of existing nodes for efficient lookup
    const existingNodeMap = new Map(nodes.map(n => [n.id, n]));

    // Separate new nodes from label updates
    const nodesToAdd: GraphNode[] = [];
    const labelUpdates: { id: string; label: string }[] = [];

    for (const n of newNodes) {
      const existingNode = existingNodeMap.get(n.id);

      if (!existingNode) {
        if (!isEntityType(n.entityType)) {
          logger.warn(LOG_PREFIX, 'Skipping node with unrecognised entityType', { id: n.id, entityType: n.entityType });
          continue;
        }
        // New node - add it
        nodesToAdd.push({
          id: n.id,
          entityType: n.entityType,
          entityId: n.id,
          label: n.label,
          x: Math.random() * INITIAL_NODE_X_RANGE - INITIAL_NODE_X_OFFSET,
          y: Math.random() * INITIAL_NODE_Y_RANGE - INITIAL_NODE_Y_OFFSET,
          externalIds: [],
          entityData: {
            completeness: n.completeness,
          },
        });
      } else if (isIdOnlyLabel(existingNode.label) && !isIdOnlyLabel(n.label)) {
        // Existing node has ID-only label but new data has resolved label - update it
        labelUpdates.push({ id: n.id, label: n.label });
      }
    }

    // Get existing edge keys to avoid duplicates
    const existingEdgeKeys = new Set(edges.map(e => `${e.source}-${e.target}-${e.type}`));

    // Convert and filter new edges (skip duplicates and unrecognised relation types)
    const edgesToAdd: GraphEdge[] = [];
    for (const e of newEdges) {
      const key = `${e.source}-${e.target}-${e.type}`;
      const reverseKey = `${e.target}-${e.source}-${e.type}`;
      if (existingEdgeKeys.has(key) || existingEdgeKeys.has(reverseKey)) continue;

      if (!isRelationType(e.type)) {
        logger.warn(LOG_PREFIX, 'Skipping edge with unrecognised relation type', { source: e.source, target: e.target, type: e.type });
        continue;
      }

      const authorPosition = e.authorPosition !== undefined && isAuthorPosition(e.authorPosition) ? e.authorPosition : undefined;

      edgesToAdd.push({
        id: key,
        source: e.source,
        target: e.target,
        type: e.type,
        weight: e.score ?? 1,
        score: e.score,
        authorPosition,
        isCorresponding: e.isCorresponding,
        isOpenAccess: e.isOpenAccess,
      });
    }

    // Only update state if there's something to add or update
    if (nodesToAdd.length > 0 || edgesToAdd.length > 0 || labelUpdates.length > 0) {
      logger.debug(LOG_PREFIX, 'Incrementally updating graph', {
        nodesAdded: nodesToAdd.length,
        edgesAdded: edgesToAdd.length,
        labelsUpdated: labelUpdates.length,
      });

      // Apply node additions and label updates together
      if (nodesToAdd.length > 0 || labelUpdates.length > 0) {
        const labelUpdateMap = new Map(labelUpdates.map(u => [u.id, u.label]));
        setNodes(previous => {
          // Update existing node labels
          const updated = previous.map(n => {
            const newLabel = labelUpdateMap.get(n.id);
            return newLabel !== undefined ? { ...n, label: newLabel } : n;
          });
          // Add new nodes
          return [...updated, ...nodesToAdd];
        });
      }
      if (edgesToAdd.length > 0) {
        setEdges(previous => [...previous, ...edgesToAdd]);
      }
    }
  }, [nodes, edges, isIdOnlyLabel]);

  /**
   * Update labels on multiple existing nodes
   * Used by auto-population to update stub node labels without full refresh
   */
  const updateNodeLabels = useCallback((updates: Map<string, string>) => {
    if (updates.size === 0) return;

    logger.debug(LOG_PREFIX, 'Updating node labels', { count: updates.size });

    setNodes(previous => previous.map(n => {
      const newLabel = updates.get(n.id);
      return newLabel !== undefined ? { ...n, label: newLabel } : n;
    }));
  }, []);

  /**
   * Add edges discovered through auto-population
   */
  const addDiscoveredEdges = useCallback((newEdges: readonly GraphEdge[]) => {
    if (newEdges.length === 0) return;

    // Get existing edge keys to avoid duplicates
    const existingEdgeKeys = new Set(edges.map(e => `${e.source}-${e.target}-${e.type}`));

    const edgesToAdd = newEdges.filter(e => {
      const key = `${e.source}-${e.target}-${e.type}`;
      const reverseKey = `${e.target}-${e.source}-${e.type}`;
      return !existingEdgeKeys.has(key) && !existingEdgeKeys.has(reverseKey);
    });

    if (edgesToAdd.length > 0) {
      logger.debug(LOG_PREFIX, 'Adding discovered edges', { count: edgesToAdd.length });
      setEdges(previous => [...previous, ...edgesToAdd]);
    }
  }, [edges]);

  return {
    nodes,
    edges,
    loading,
    isEmpty,
    error,
    sources,
    enabledSourceIds,
    toggleSource,
    enableSources,
    disableSources,
    enableAll,
    disableAll,
    refresh,
    addNodesAndEdges,
    updateNodeLabels,
    addDiscoveredEdges,
  };
};
