/**
 * Entity Type Filtering with Graph List Bypass
 *
 * T038-T040: Implements visibility formula: visible = graph_list ∪ (collections ∩ entity_types)
 *
 * - Graph list nodes ALWAYS visible (bypass entity type filters)
 * - Collection nodes (bookmarks, history, custom lists) respect entity type filters
 * - Empty selectedTypes array means "show all"
 */


import type { EntityType, GraphNode } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';
import { useMemo, useState } from 'react';

const LOG_CONTEXT = 'entity-type-filter';

/**
 * Check if a node is from the graph list source (should bypass filters)
 * T040: Graph list nodes bypass entity type filters
 */
export const isGraphListNode = (node: GraphNode): boolean => {
  // Check sourceId first (most reliable)
  if (node.entityData?.sourceId === 'catalogue:graph-list') {
    return true;
  }

  // Also check for provenance metadata (nodes can have provenance even from other sources)
  if (node.entityData?._graphListProvenance !== undefined) {
    return true;
  }

  return false;
};

/**
 * Apply entity type filtering with graph list bypass
 * T038: Implement union formula: visible = graph_list ∪ (collections ∩ entity_types)
 * T039: Collection nodes respect entity type filters
 * T040: Graph list nodes bypass filters
 * @param nodes - All graph nodes
 * @param selectedTypes - Array of selected entity types (empty = show all)
 * @returns Filtered nodes following the union formula
 */
export const applyEntityTypeFilter = (nodes: readonly GraphNode[], selectedTypes: readonly EntityType[] | null | undefined): GraphNode[] => {
  // Handle null/undefined as "show all"
  if (!selectedTypes || selectedTypes.length === 0) {
    logger.debug(LOG_CONTEXT, 'No filters selected, showing all nodes', {
      nodeCount: nodes.length,
    });
    return [...nodes];
  }

  const filteredNodes = nodes.filter((node) => {
    // T040: Graph list nodes ALWAYS visible (bypass)
    if (isGraphListNode(node)) {
      return true;
    }

    // T039: Collection nodes must match entity type filter
    return selectedTypes.includes(node.entityType);
  });

  logger.debug(LOG_CONTEXT, 'Applied entity type filter', {
    totalNodes: nodes.length,
    filteredNodes: filteredNodes.length,
    selectedTypes,
    graphListBypassCount: filteredNodes.filter(isGraphListNode).length,
  });

  return filteredNodes;
};

/**
 * Hook for managing entity type filter state
 * Provides filter state management and application logic
 */
export const useEntityTypeFilter = (allNodes: readonly GraphNode[]) => {
  const [selectedTypes, setSelectedTypes] = useState<EntityType[]>([]);

  // Apply filter whenever nodes or selected types change
  const visibleNodes = useMemo(
    () => applyEntityTypeFilter(allNodes, selectedTypes),
    [allNodes, selectedTypes]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const graphListCount = visibleNodes.filter(isGraphListNode).length;
    const collectionCount = visibleNodes.length - graphListCount;

    return {
      total: visibleNodes.length,
      graphListNodes: graphListCount,
      collectionNodes: collectionCount,
      filterActive: selectedTypes.length > 0,
    };
  }, [visibleNodes, selectedTypes]);

  return {
    visibleNodes,
    selectedTypes,
    setSelectedTypes,
    stats,
    isGraphListNode,
  };
};