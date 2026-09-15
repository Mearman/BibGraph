/**
 * React hook for graph list management
 * Provides reactive graph list state and CRUD operations for the persistent working set
 *
 * T029: Graph List hook with storage integration
 * T045: Undo/redo integration for destructive actions
 */

import type { AddToGraphListParams, GraphListNode, PruneGraphListResult } from "@bibgraph/types";
import {
  catalogueEventEmitter,
  logger,
} from "@bibgraph/utils";
import { useCallback, useEffect, useState } from "react";

import { useNotifications } from "@/contexts/NotificationContext";
import { useStorageProvider } from "@/contexts/storage-provider-context";
import { useUndoRedoContext } from "@/contexts/UndoRedoContext";

const GRAPH_LIST_LOGGER_CONTEXT = "graph-list-hook";

export interface UseGraphListResult {
  /**
  Current graph list nodes
   */
  nodes: GraphListNode[];

  /**
  Add a node to the graph list
   */
  addNode: (parameters: Readonly<AddToGraphListParams>) => Promise<string>;

  /**
  Add multiple nodes to the graph list (batch operation)
   */
  addNodesBatch: (parameters: readonly AddToGraphListParams[]) => Promise<string[]>;

  /**
  Remove a node from the graph list by entityId
   */
  removeNode: (entityId: string) => Promise<void>;

  /**
  Clear all nodes from the graph list
   */
  clearGraphList: () => Promise<void>;

  /**
  Check if an entity is in the graph list
   */
  isInGraphList: (entityId: string) => Promise<boolean>;

  /**
  Get current graph list size
   */
  size: number;

  /**
  Prune auto-populated nodes older than 24 hours
   */
  pruneGraphList: () => Promise<PruneGraphListResult>;

  /**
  Loading state
   */
  loading: boolean;

  /**
  Error state
   */
  error: Error | null;

  /**
  Refresh graph list manually
   */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing graph list with reactive state
 *
 * Features:
 * - Automatic initialization of special lists
 * - Reactive updates via catalogueEventEmitter
 * - Error handling with state
 * - Loading states during operations
 * - Optimistic updates for better UX (T030)
 * @example
 * ```tsx
 * const { nodes, addNode, removeNode, isInGraphList, loading, error, size } = useGraphList();
 *
 * // Add node to graph list
 * await addNode({
 *   entityId: "W2741809807",
 *   entityType: "works",
 *   label: "ML for Cultural Heritage",
 *   provenance: "user"
 * });
 *
 * // Check if in graph list
 * const inList = await isInGraphList("W2741809807");
 *
 * // Remove from graph list
 * await removeNode("W2741809807");
 * ```
 */
export const useGraphList = (): UseGraphListResult => {
  const storage = useStorageProvider();
  const { addAction } = useUndoRedoContext();
  const { showNotification } = useNotifications();

  // State
  const [nodes, setNodes] = useState<GraphListNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Refresh graph list from storage (T031: sync)
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize special lists if not already done
      if (!initialized) {
        await storage.initializeSpecialLists();
        setInitialized(true);
        logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Special lists initialized");
      }

      const currentNodes = await storage.getGraphList();
      setNodes(currentNodes);

      logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Graph list refreshed", {
        count: currentNodes.length
      });
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      logger.error(GRAPH_LIST_LOGGER_CONTEXT, "Failed to refresh graph list", { error: error_ });
    } finally {
      setLoading(false);
    }
  }, [storage, initialized]);

  // Initialize on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Subscribe to catalogue events for reactive updates (T031)
  useEffect(() => {
    const unsubscribe = catalogueEventEmitter.subscribe((event) => {
      // Check if event affects graph list
      const isGraphListEvent =
        event.listId === "graph-list" ||
        event.type === "entity-added" ||
        event.type === "entity-removed";

      if (isGraphListEvent) {
        logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Catalogue event detected, refreshing graph list", {
          eventType: event.type,
          listId: event.listId
        });
        void refresh();
      }
    });

    return unsubscribe;
  }, [refresh]);

  // Add node with optimistic update (T030)
  const addNode = useCallback(async (parameters: Readonly<AddToGraphListParams>): Promise<string> => {
    setError(null);

    // T030: Optimistic update - add node to UI immediately
    const optimisticNode: GraphListNode = {
      id: `temp-${String(Date.now())}`, // Temporary ID
      entityId: parameters.entityId,
      entityType: parameters.entityType,
      label: parameters.label,
      addedAt: new Date(),
      provenance: parameters.provenance,
    };

    setNodes(previousNodes => {
      // Check if node already exists
      const isExists = previousNodes.some(n => n.entityId === parameters.entityId && n.entityType === parameters.entityType);
      if (isExists) {
        // Update existing node
        return previousNodes.map(n =>
          n.entityId === parameters.entityId && n.entityType === parameters.entityType
            ? { ...n, label: parameters.label, provenance: parameters.provenance, addedAt: new Date() }
            : n
        );
      }
      return [...previousNodes, optimisticNode];
    });

    try {
      const nodeId = await storage.addToGraphList(parameters);

      showNotification({
        title: "Success",
        message: `Added ${parameters.label || parameters.entityId} to graph`,
        category: "success",
      });

      logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Node added to graph list", {
        entityType: parameters.entityType,
        entityId: parameters.entityId,
        nodeId
      });

      // T031: Refresh from storage to get real ID and sync state
      void refresh();

      return nodeId;
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);

      // Rollback optimistic update on error
      setNodes(previousNodes => previousNodes.filter(n => n.id !== optimisticNode.id));

      showNotification({
        title: "Error",
        message: `Failed to add to graph: ${errorObject.message}`,
        category: "error",
      });

      logger.error(GRAPH_LIST_LOGGER_CONTEXT, "Failed to add node to graph list", {
        params: parameters,
        error: error_
      });
      throw errorObject;
    }
  }, [storage, refresh]);

  // Add multiple nodes with batch operation (T030: optimistic for batch)
  const addNodesBatch = useCallback(async (parameters: readonly AddToGraphListParams[]): Promise<string[]> => {
    setError(null);

    // T030: Optimistic update for batch
    const optimisticNodes: GraphListNode[] = parameters.map((parameter, index) => ({
      id: `temp-batch-${String(Date.now())}-${String(index)}`,
      entityId: parameter.entityId,
      entityType: parameter.entityType,
      label: parameter.label,
      addedAt: new Date(),
      provenance: parameter.provenance,
    }));

    setNodes(previousNodes => {
      const newNodes = [...previousNodes];
      for (const optNode of optimisticNodes) {
        const existsIndex = newNodes.findIndex(
          n => n.entityId === optNode.entityId && n.entityType === optNode.entityType
        );
        if (existsIndex === -1) {
          // Add new
          newNodes.push(optNode);
        } else {
          // Update existing
          newNodes[existsIndex] = {
            ...newNodes[existsIndex],
            label: optNode.label,
            provenance: optNode.provenance,
            addedAt: new Date()
          };
        }
      }
      return newNodes;
    });

    try {
      const nodeIds = await storage.batchAddToGraphList(parameters);

      showNotification({
        title: "Success",
        message: `Added ${String(parameters.length)} nodes to graph`,
        category: "success",
      });

      logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Batch added nodes to graph list", {
        count: parameters.length,
        nodeIds
      });

      // T031: Refresh from storage to sync state
      void refresh();

      return nodeIds;
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);

      // Rollback optimistic updates on error
      const temporaryIds = new Set(optimisticNodes.map(n => n.id));
      setNodes(previousNodes => previousNodes.filter(n => !temporaryIds.has(n.id)));

      showNotification({
        title: "Error",
        message: `Failed to add nodes: ${errorObject.message}`,
        category: "error",
      });

      logger.error(GRAPH_LIST_LOGGER_CONTEXT, "Failed to batch add nodes to graph list", {
        count: parameters.length,
        error: error_
      });
      throw errorObject;
    }
  }, [storage, refresh]);

  // Remove node
  const removeNode = useCallback(async (entityId: string): Promise<void> => {
    setError(null);

    // T030: Optimistic update - remove from UI immediately, capturing the pre-removal list via the updater so the rollback below always has the true previous value
    const removedNode = nodes.find(n => n.entityId === entityId);
    let rollbackNodes: GraphListNode[] = [];
    setNodes(previousNodes_ => {
      rollbackNodes = previousNodes_;
      return previousNodes_.filter(n => n.entityId !== entityId);
    });

    try {
      await storage.removeFromGraphList(entityId);

      showNotification({
        title: "Success",
        message: `Removed ${removedNode?.label ?? entityId} from graph`,
        category: "success",
      });

      // T045: Add undo/redo action for destructive operation
      if (removedNode) {
        addAction({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          description: `Remove ${removedNode.label || removedNode.entityId} from graph`,
          undo: async () => {
            // Restore node to graph list
            await storage.addToGraphList({
              entityId: removedNode.entityId,
              entityType: removedNode.entityType,
              label: removedNode.label,
              provenance: removedNode.provenance,
            });
          },
          redo: async () => {
            // Remove node from graph list again
            await storage.removeFromGraphList(entityId);
          },
        });
      }

      logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Node removed from graph list", {
        entityId
      });

      // Refresh will be triggered by catalogueEventEmitter
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);

      // Rollback optimistic update on error
      setNodes(rollbackNodes);

      showNotification({
        title: "Error",
        message: `Failed to remove: ${errorObject.message}`,
        category: "error",
      });

      logger.error(GRAPH_LIST_LOGGER_CONTEXT, "Failed to remove node from graph list", {
        entityId,
        error: error_
      });
      throw errorObject;
    }
  }, [storage, nodes, addAction]);

  // Clear graph list
  const clearGraphList = useCallback(async (): Promise<void> => {
    setError(null);

    // T030: Optimistic update - clear UI immediately, capturing the pre-clear list via the updater so the rollback and undo action below always have the true previous value
    let rollbackNodes: GraphListNode[] = [];
    setNodes(previousNodes_ => {
      rollbackNodes = previousNodes_;
      return [];
    });

    try {
      await storage.clearGraphList();

      showNotification({
        title: "Success",
        message: `Cleared graph (${String(rollbackNodes.length)} nodes removed)`,
        category: "success",
      });

      // T045: Add undo/redo action for destructive operation
      addAction({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        description: `Clear graph list (${String(rollbackNodes.length)} nodes)`,
        undo: async () => {
          // Restore all nodes to graph list
          const restorePromises = rollbackNodes.map(async node =>
            storage.addToGraphList({
              entityId: node.entityId,
              entityType: node.entityType,
              label: node.label,
              provenance: node.provenance,
            })
          );
          await Promise.all(restorePromises);
        },
        redo: async () => {
          // Clear graph list again
          await storage.clearGraphList();
        },
      });

      logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Graph list cleared");

      // Refresh will be triggered by catalogueEventEmitter
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);

      // Rollback optimistic update on error
      setNodes(rollbackNodes);

      showNotification({
        title: "Error",
        message: `Failed to clear graph: ${errorObject.message}`,
        category: "error",
      });

      logger.error(GRAPH_LIST_LOGGER_CONTEXT, "Failed to clear graph list", {
        error: error_
      });
      throw errorObject;
    }
  }, [storage, addAction]);

  // Check if entity is in graph list
  const isInGraphList = useCallback(async (entityId: string): Promise<boolean> => {
    try {
      const isResult = await storage.isInGraphList(entityId);

      logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Checked graph list status", {
        entityId,
        isInGraphList: isResult
      });

      return isResult;
    } catch (error_) {
      logger.error(GRAPH_LIST_LOGGER_CONTEXT, "Failed to check graph list status", {
        entityId,
        error: error_
      });
      return false;
    }
  }, [storage]);

  // Prune auto-populated nodes
  const pruneGraphList = useCallback(async (): Promise<PruneGraphListResult> => {
    setError(null);

    try {
      const result = await storage.pruneGraphList();

      logger.debug(GRAPH_LIST_LOGGER_CONTEXT, "Graph list pruned", {
        removedCount: result.removedCount
      });

      // Refresh to update UI
      void refresh();

      return result;
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);

      logger.error(GRAPH_LIST_LOGGER_CONTEXT, "Failed to prune graph list", {
        error: error_
      });
      throw errorObject;
    }
  }, [storage, refresh]);

  return {
    nodes,
    addNode,
    addNodesBatch,
    removeNode,
    clearGraphList,
    isInGraphList,
    size: nodes.length,
    pruneGraphList,
    loading,
    error,
    refresh,
  };
};
