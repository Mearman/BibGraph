/**
 * useGraphAutoPopulation - Automatic graph population hook
 *
 * Watches the graph for changes and automatically:
 * 1. Resolves display names for stub nodes (using batch queries)
 * 2. Discovers relationships between existing nodes
 *
 * Uses pluggable background task execution to avoid blocking the UI.
 * Strategies: idle (requestIdleCallback), scheduler (postTask), worker, sync
 *
 * This is separate from explicit node expansion which adds NEW nodes.
 * Auto-population only works with nodes already in the graph.
 * @module hooks/use-graph-auto-population
 */

import type { EntityType, GraphEdge, GraphNode, RelationshipQueryConfig } from '@bibgraph/types';
import { getEntityRelationshipQueries } from '@bibgraph/types';
import { getBackgroundTaskExecutor, logger } from '@bibgraph/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AutoPopulationResult,
  LabelResolutionBatch,
  RelationshipDirection,
  UseGraphAutoPopulationOptions,
} from '@/types/graph-auto-population';
import { BATCH_SIZE, DEBOUNCE_DELAY_MS, PROCESSING_CHUNK_SIZE } from '@/types/graph-auto-population';
import {
  createBatches,
  discoverApiRelationships,
  discoverEmbeddedRelationships,
  discoverEmbeddedWithResolutionRelationships,
  isIdOnlyLabel,
  normalizeId,
  resolveLabelBatch,
} from '@/utils/graph-population-helpers';

const LOG_PREFIX = 'graph-auto-population';

/**
 * Hook for automatic graph population
 *
 * Watches the graph and automatically:
 * - Resolves display names for stub nodes
 * - Discovers relationships between existing nodes
 *
 * Uses background task execution to avoid blocking UI
 * @param root0
 * @param root0.nodes
 * @param root0.edges
 * @param root0.onLabelsResolved
 * @param root0.onEdgesDiscovered
 * @param root0.enabled
 * @param root0.strategy
 */
export const useGraphAutoPopulation = ({
  nodes,
  edges,
  onLabelsResolved,
  onEdgesDiscovered,
  enabled = true,
  strategy = 'idle',
}: UseGraphAutoPopulationOptions): AutoPopulationResult => {
  const [isPopulating, setIsPopulating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [labelsResolved, setLabelsResolved] = useState(0);
  const [edgesDiscovered, setEdgesDiscovered] = useState(0);

  // Track which nodes have been processed to avoid re-processing
  const processedNodesRef = useRef<Set<string>>(new Set());
  const processedEdgePairsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get background task executor with configured strategy
  const executor = useMemo(() => {
    const exec = getBackgroundTaskExecutor();
    exec.setStrategy(strategy);
    return exec;
  }, [strategy]);

  /**
   * Resolve display names for nodes with ID-only labels
   */
  const resolveLabels = useCallback(
    async (nodesToResolve: GraphNode[], signal?: AbortSignal): Promise<Map<string, string>> => {
      const labelMap = new Map<string, string>();

      const needsResolution = nodesToResolve.filter(
        (node) => isIdOnlyLabel(node.label) && !processedNodesRef.current.has(node.id)
      );

      if (needsResolution.length === 0) {
        return labelMap;
      }

      logger.debug(
        LOG_PREFIX,
        `Resolving labels for ${needsResolution.length} nodes using ${executor.currentStrategy} strategy`
      );

      // Group by entity type
      const nodesByType = new Map<EntityType, GraphNode[]>();
      for (const node of needsResolution) {
        const existing = nodesByType.get(node.entityType) ?? [];
        existing.push(node);
        nodesByType.set(node.entityType, existing);
      }

      // Create batches for processing
      const batches: LabelResolutionBatch[] = [];
      for (const [entityType, typeNodes] of nodesByType) {
        for (const batch of createBatches(typeNodes.map((n) => n.id), BATCH_SIZE)) {
          batches.push({ entityType, ids: batch });
        }
      }

      // Process batches using background executor
      const result = await executor.processBatch(batches, resolveLabelBatch, {
        signal,
        chunkSize: PROCESSING_CHUNK_SIZE,
      });

      // Process results
      if (result.success && result.data) {
        for (const batchResults of result.data) {
          for (const entity of batchResults) {
            const displayName = entity.display_name ?? entity.title;
            if (displayName && entity.id) {
              const shortId = normalizeId(entity.id);
              labelMap.set(shortId, displayName);
              processedNodesRef.current.add(shortId);
            }
          }
        }
      }

      logger.debug(LOG_PREFIX, `Resolved ${labelMap.size} labels`);
      return labelMap;
    },
    [executor]
  );

  /**
   * Discover relationships between all nodes using the relationship registry
   */
  const discoverRelationships = useCallback(
    async (
      allNodes: GraphNode[],
      existingEdges: GraphEdge[],
      signal?: AbortSignal
    ): Promise<GraphEdge[]> => {
      const newEdges: GraphEdge[] = [];

      if (allNodes.length < 2) {
        return newEdges;
      }

      // Build set of existing edges for quick lookup
      const existingEdgeKeys = new Set(
        existingEdges.map((e) => `${normalizeId(e.source)}-${normalizeId(e.target)}-${e.type}`)
      );

      // Create a map of all node IDs for quick existence checks
      const allNodeIds = new Set(allNodes.map((n) => normalizeId(n.id)));

      // Group nodes by entity type
      const nodesByType = new Map<EntityType, GraphNode[]>();
      for (const node of allNodes) {
        const existing = nodesByType.get(node.entityType) ?? [];
        existing.push(node);
        nodesByType.set(node.entityType, existing);
      }

      logger.debug(
        LOG_PREFIX,
        `Discovering relationships between ${allNodes.length} nodes across ${nodesByType.size} entity types`
      );

      // Process each entity type
      for (const [entityType, typeNodes] of nodesByType) {
        const queries = getEntityRelationshipQueries(entityType);

        // Process inbound and outbound queries
        for (const direction of ['inbound', 'outbound'] as const) {
          const queryList = direction === 'inbound' ? queries.inbound : queries.outbound;

          for (const query of queryList) {
            logger.debug(
              LOG_PREFIX,
              `Processing ${typeNodes.length} ${entityType} nodes for ${direction} ${query.type}`
            );

            const edges = await processQuery(
              typeNodes,
              query,
              entityType,
              allNodeIds,
              existingEdgeKeys,
              direction,
              signal
            );
            newEdges.push(...edges);
          }
        }
      }

      logger.debug(LOG_PREFIX, `Discovered ${newEdges.length} total edges across all entity types`);
      return newEdges;
    },
    [executor]
  );

  /**
   * Process a single relationship query based on its source type
   * @param typeNodes
   * @param query
   * @param entityType
   * @param allNodeIds
   * @param existingEdgeKeys
   * @param direction
   * @param signal
   */
  const processQuery = async (
    typeNodes: GraphNode[],
    query: RelationshipQueryConfig,
    entityType: EntityType,
    allNodeIds: Set<string>,
    existingEdgeKeys: Set<string>,
    direction: RelationshipDirection,
    signal?: AbortSignal
  ): Promise<GraphEdge[]> => {
    switch (query.source) {
      case 'api':
        return discoverApiRelationships(
          typeNodes,
          query as RelationshipQueryConfig & { source: 'api' },
          allNodeIds,
          existingEdgeKeys,
          processedEdgePairsRef.current,
          direction,
          executor,
          signal
        );
      case 'embedded':
        return discoverEmbeddedRelationships(
          typeNodes,
          query as RelationshipQueryConfig & { source: 'embedded' },
          entityType,
          allNodeIds,
          existingEdgeKeys,
          processedEdgePairsRef.current,
          direction,
          executor,
          signal
        );
      case 'embedded-with-resolution':
        return discoverEmbeddedWithResolutionRelationships(
          typeNodes,
          query as RelationshipQueryConfig & { source: 'embedded-with-resolution' },
          entityType,
          allNodeIds,
          existingEdgeKeys,
          processedEdgePairsRef.current,
          direction,
          executor,
          signal
        );
      default:
        return [];
    }
  };

  /**
   * Main population function
   */
  const populate = useCallback(async () => {
    if (!enabled || nodes.length === 0) {
      return;
    }

    // Cancel any in-progress population
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsPopulating(true);
    setError(null);

    try {
      // Filter out nodes from persistent graph source to prevent feedback loop
      const primaryNodes = nodes.filter((node) => {
        const sourceId = node.entityData?.sourceId as string | undefined;
        return sourceId !== 'graph:persistent';
      });

      logger.debug(
        LOG_PREFIX,
        `Processing ${primaryNodes.length} primary nodes (filtered ${nodes.length - primaryNodes.length} persistent graph nodes)`
      );

      // 1. Resolve labels for stub nodes
      const labelUpdates = await resolveLabels(primaryNodes, signal);

      if (signal.aborted) return;

      if (labelUpdates.size > 0 && onLabelsResolved) {
        onLabelsResolved(labelUpdates);
        setLabelsResolved((prev) => prev + labelUpdates.size);
      }

      // 2. Discover relationships between existing nodes
      const discoveredEdges = await discoverRelationships(primaryNodes, edges, signal);

      if (signal.aborted) return;

      if (discoveredEdges.length > 0 && onEdgesDiscovered) {
        onEdgesDiscovered(discoveredEdges);
        setEdgesDiscovered((prev) => prev + discoveredEdges.length);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const populationError = err instanceof Error ? err : new Error('Failed to populate graph');
      setError(populationError);
      logger.error(LOG_PREFIX, 'Graph population failed', { error: err });
    } finally {
      setIsPopulating(false);
    }
  }, [enabled, nodes, edges, resolveLabels, discoverRelationships, onLabelsResolved, onEdgesDiscovered]);

  // Debounced effect to trigger population when nodes change
  useEffect(() => {
    if (!enabled) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void populate();
    }, DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, [enabled, nodes.length, populate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      executor.cancelAll();
    };
  }, [executor]);

  return {
    labelsResolved,
    edgesDiscovered,
    isPopulating,
    error,
    currentStrategy: executor.currentStrategy,
  };
};
