/**
 * useNodeExpansion - React hook for expanding nodes in the persistent graph
 *
 * Provides interactive node expansion functionality:
 * - Click a node to fetch its relationships from OpenAlex
 * - Track expansion state (loading, expanded, error)
 * - Integrate with PersistentGraph for persistent storage
 *
 * Module: lib/graph-index/use-node-expansion
 */

import type { NodeExpansionResult } from '@bibgraph/client';
import { expandNode as expandNodeFromGraph,getPersistentGraph } from '@bibgraph/client';
import type { EntityType } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';
import { useCallback, useMemo,useState } from 'react';

const LOG_PREFIX = 'use-node-expansion';

/**
 * Expansion state for a single node
 */
export interface NodeExpansionState {
  /**
  Node ID
   */
  nodeId: string;

  /**
  Whether expansion is in progress
   */
  loading: boolean;

  /**
  Result of expansion (null if not yet expanded or in progress)
   */
  result: NodeExpansionResult | null;

  /**
  Error if expansion failed
   */
  error: Error | null;

  /**
  Timestamp when expansion started
   */
  startedAt: number | null;

  /**
  Timestamp when expansion completed
   */
  completedAt: number | null;
}

/**
 * Result of the useNodeExpansion hook
 */
export interface UseNodeExpansionResult {
  /**
   * Expand a node by ID - fetches relationships and adds discovered entities
   * @param nodeId - The ID of the node to expand
   * @param entityType - Optional entity type (if not provided, inferred from ID prefix)
   * @returns Promise resolving to expansion result
   */
  expandNode: (nodeId: string, entityType?: EntityType) => Promise<NodeExpansionResult>;

  /**
   * Check if a node is currently being expanded
   */
  isExpanding: (nodeId: string) => boolean;

  /**
   * Check if a node has been expanded (has expandedAt timestamp)
   */
  isExpanded: (nodeId: string) => boolean;

  /**
   * Check if a node is a stub (completeness === 'stub')
   */
  isStub: (nodeId: string) => boolean;

  /**
   * Get expansion state for a specific node
   */
  getExpansionState: (nodeId: string) => NodeExpansionState | null;

  /**
   * Map of all expansion states by node ID
   */
  expansionStates: Map<string, NodeExpansionState>;

  /**
   * List of node IDs currently being expanded
   */
  expandingNodeIds: string[];

  /**
   * Clear expansion state for a node (useful for retry)
   */
  clearExpansionState: (nodeId: string) => void;

  /**
   * Clear all expansion states
   */
  clearAllExpansionStates: () => void;
}

/**
 * Hook for managing node expansion in the persistent graph
 *
 * Usage:
 * ```tsx
 * const { expandNode, isExpanding, isExpanded } = useNodeExpansion();
 *
 * const handleNodeClick = async (nodeId: string) => {
 *   if (!isExpanded(nodeId)) {
 *     const result = await expandNode(nodeId);
 *     console.log(`Added ${result.nodesAdded} nodes and ${result.edgesAdded} edges`);
 *   }
 * };
 * ```
 */
export const useNodeExpansion = (): UseNodeExpansionResult => {
  // Track expansion state per node
  const [expansionStates, setExpansionStates] = useState<Map<string, NodeExpansionState>>(
    () => new Map()
  );

  // Get singleton graph instance
  const graph = useMemo(() => getPersistentGraph(), []);

  /**
   * Expand a node and update state
   */
  const expandNode = useCallback(
    async (nodeId: string, entityType?: EntityType): Promise<NodeExpansionResult> => {
      // Check if already expanding
      const currentState = expansionStates.get(nodeId);
      if (currentState?.loading === true) {
        logger.debug(LOG_PREFIX, `Node ${nodeId} is already being expanded`);
        return {
          success: false,
          nodesAdded: 0,
          edgesAdded: 0,
          error: 'Node is already being expanded',
          alreadyExpanded: false,
          nodes: [],
          edges: [],
        };
      }

      // Set loading state
      const startTime = Date.now();
      setExpansionStates((previous) => {
        const next = new Map(previous);
        next.set(nodeId, {
          nodeId,
          loading: true,
          result: null,
          error: null,
          startedAt: startTime,
          completedAt: null,
        });
        return next;
      });

      try {
        // Ensure graph is initialized
        await graph.initialize();

        // Perform expansion - pass entityType if provided for reliable type resolution
        const result = await expandNodeFromGraph(graph, nodeId, entityType);

        // Update state with result
        const completedAt = Date.now();
        setExpansionStates((previous) => {
          const next = new Map(previous);
          next.set(nodeId, {
            nodeId,
            loading: false,
            result,
            error: null,
            startedAt: startTime,
            completedAt,
          });
          return next;
        });

        logger.debug(LOG_PREFIX, `Expanded node ${nodeId}`, {
          success: result.success,
          nodesAdded: result.nodesAdded,
          edgesAdded: result.edgesAdded,
          alreadyExpanded: result.alreadyExpanded,
          durationMs: completedAt - startTime,
        });

        return result;
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to expand node');

        // Update state with error
        setExpansionStates((previous) => {
          const next = new Map(previous);
          next.set(nodeId, {
            nodeId,
            loading: false,
            result: null,
            error,
            startedAt: startTime,
            completedAt: Date.now(),
          });
          return next;
        });

        logger.error(LOG_PREFIX, `Failed to expand node ${nodeId}`, { error: error_ });

        return {
          success: false,
          nodesAdded: 0,
          edgesAdded: 0,
          error: error.message,
          alreadyExpanded: false,
          nodes: [],
          edges: [],
        };
      }
    },
    [graph, expansionStates]
  );

  /**
   * Check if a node is currently being expanded
   */
  const isExpanding = useCallback(
    (nodeId: string): boolean => {
      const state = expansionStates.get(nodeId);
      return state?.loading ?? false;
    },
    [expansionStates]
  );

  /**
   * Check if a node has been expanded (check expandedAt in graph)
   */
  const isExpanded = useCallback(
    (nodeId: string): boolean => {
      const node = graph.getNode(nodeId);
      return node?.expandedAt !== undefined;
    },
    [graph]
  );

  /**
   * Check if a node is a stub
   */
  const isStub = useCallback(
    (nodeId: string): boolean => {
      const node = graph.getNode(nodeId);
      return node?.completeness === 'stub';
    },
    [graph]
  );

  /**
   * Get expansion state for a specific node
   */
  const getExpansionState = useCallback(
    (nodeId: string): NodeExpansionState | null => {
      return expansionStates.get(nodeId) ?? null;
    },
    [expansionStates]
  );

  /**
   * Get list of currently expanding node IDs
   */
  const expandingNodeIds = useMemo(() => {
    const ids: string[] = [];
    for (const [nodeId, state] of expansionStates) {
      if (state.loading) {
        ids.push(nodeId);
      }
    }
    return ids;
  }, [expansionStates]);

  /**
   * Clear expansion state for a node
   */
  const clearExpansionState = useCallback((nodeId: string) => {
    setExpansionStates((previous) => {
      const next = new Map(previous);
      next.delete(nodeId);
      return next;
    });
  }, []);

  /**
   * Clear all expansion states
   */
  const clearAllExpansionStates = useCallback(() => {
    setExpansionStates(new Map());
  }, []);

  return {
    expandNode,
    isExpanding,
    isExpanded,
    isStub,
    getExpansionState,
    expansionStates,
    expandingNodeIds,
    clearExpansionState,
    clearAllExpansionStates,
  };
};
