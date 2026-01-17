/**
 * Hook for managing catalogue entity operations
 * Encapsulates business logic for entity filtering, sorting, bulk operations, and drag-and-drop
 */

import type { EntityType } from "@bibgraph/types";
import {
  calculateDuplicateStats,
  type CatalogueEntity,
  type DuplicateStats,
  suggestDuplicateRemovals,
} from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { notifications } from "@mantine/notifications";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NOTIFICATION_DURATION } from "@/config/notification-constants";
import { useCatalogueContext } from "@/contexts/catalogue-context";

/** Threshold above which virtualization is enabled for performance */
const VIRTUALIZATION_THRESHOLD = 100;

/** Estimated row height in pixels for virtualization */
const ESTIMATED_ROW_HEIGHT = 80;

/** Number of items to render above and below viewport */
const VIRTUALIZATION_OVERSCAN = 10;

export type SortOption = "position" | "entityId" | "addedAt" | "entityType";

export interface UseCatalogueEntitiesReturn {
  // Context data
  selectedList: ReturnType<typeof useCatalogueContext>["selectedList"];
  entities: CatalogueEntity[];
  isLoadingEntities: boolean;
  lists: ReturnType<typeof useCatalogueContext>["lists"];

  // Filtering and sorting
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  filteredEntities: CatalogueEntity[];
  sortedEntities: CatalogueEntity[];
  entityTypes: EntityType[];

  // Selection
  selectedEntities: Set<string>;
  handleSelectAll: () => void;
  handleToggleEntity: (entityId: string) => void;
  clearSelection: () => void;

  // Bulk operations
  showBulkConfirm: boolean;
  setShowBulkConfirm: (show: boolean) => void;
  showBulkMoveModal: boolean;
  setShowBulkMoveModal: (show: boolean) => void;
  targetListId: string | null;
  setTargetListId: (id: string | null) => void;
  handleBulkRemove: () => Promise<void>;
  handleBulkMove: () => Promise<void>;

  // Duplicates
  duplicateStats: DuplicateStats | null;
  showDuplicatesModal: boolean;
  setShowDuplicatesModal: (show: boolean) => void;
  handleRemoveDuplicates: () => Promise<void>;

  // Entity operations
  handleRemoveEntity: (entityRecordId: string) => Promise<void>;
  handleEditNotes: (entityRecordId: string, notes: string) => Promise<void>;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;

  // Virtualization
  /** Ref for the scrollable container */
  parentRef: React.RefObject<HTMLDivElement | null>;
  /** Whether virtualization is enabled for the current list */
  useVirtualization: boolean;
  /** Virtualizer instance for rendering large lists efficiently */
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
}

export const useCatalogueEntities = (): UseCatalogueEntitiesReturn => {
  const {
    selectedList,
    entities,
    isLoadingEntities,
    removeEntityFromList,
    reorderEntities,
    updateEntityNotes,
    bulkRemoveEntities,
    bulkMoveEntities,
    lists,
  } = useCatalogueContext();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("position");
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(
    new Set()
  );
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [targetListId, setTargetListId] = useState<string | null>(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicateStats, setDuplicateStats] = useState<DuplicateStats | null>(
    null
  );

  // Virtualization ref
  const parentRef = useRef<HTMLDivElement | null>(null);

  // Debug logging
  useEffect(() => {
    logger.debug("catalogue-entities", "CatalogueEntities render", {
      selectedListId: selectedList?.id,
      selectedListTitle: selectedList?.title,
      entitiesCount: entities.length,
      isLoadingEntities,
    });
  }, [selectedList, entities, isLoadingEntities]);

  // Calculate duplicate statistics when entities change
  useEffect(() => {
    if (entities.length > 0) {
      const stats = calculateDuplicateStats(entities);
      setDuplicateStats(stats);
      logger.debug("catalogue-entities", "Duplicate stats calculated", {
        total: stats.totalEntities,
        unique: stats.uniqueEntities,
        duplicates: stats.duplicateCount,
        removable: stats.removableCount,
        percentage: stats.duplicatePercentage.toFixed(1),
      });
    } else {
      setDuplicateStats(null);
    }
  }, [entities]);

  // Memoized filtered entities
  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      const matchesSearch =
        searchQuery === "" ||
        entity.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entity.notes &&
          entity.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        filterType === "all" || entity.entityType === filterType;

      return matchesSearch && matchesType;
    });
  }, [entities, searchQuery, filterType]);

  // Memoized sorted entities
  const sortedEntities = useMemo(() => {
    return [...filteredEntities].sort((a, b) => {
      switch (sortBy) {
        case "position":
          return a.position - b.position;
        case "entityId":
          return a.entityId.localeCompare(b.entityId);
        case "addedAt":
          return b.addedAt.getTime() - a.addedAt.getTime();
        case "entityType":
          return a.entityType.localeCompare(b.entityType);
        default:
          return 0;
      }
    });
  }, [filteredEntities, sortBy]);

  // Get unique entity types for filter dropdown
  const entityTypes = useMemo(
    () => [...new Set(entities.map((e) => e.entityType))],
    [entities]
  );

  // Virtualization setup
  const useVirtualization = sortedEntities.length > VIRTUALIZATION_THRESHOLD;
  const rowVirtualizer = useVirtualizer({
    count: sortedEntities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    enabled: useVirtualization,
    overscan: VIRTUALIZATION_OVERSCAN,
  });

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedEntities.size === sortedEntities.length) {
      setSelectedEntities(new Set());
    } else {
      setSelectedEntities(
        new Set(
          sortedEntities
            .filter((e): e is typeof e & { id: string } => !!e.id)
            .map((e) => e.id)
        )
      );
    }
  }, [selectedEntities.size, sortedEntities]);

  const handleToggleEntity = useCallback((entityId: string) => {
    setSelectedEntities((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(entityId)) {
        newSelection.delete(entityId);
      } else {
        newSelection.add(entityId);
      }
      return newSelection;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEntities(new Set());
  }, []);

  // Bulk operations
  const handleBulkRemove = useCallback(async () => {
    if (!selectedList || !selectedList.id || selectedEntities.size === 0)
      return;

    try {
      await bulkRemoveEntities(selectedList.id, [...selectedEntities]);

      logger.debug("catalogue-ui", "Bulk remove completed", {
        listId: selectedList.id,
        removedCount: selectedEntities.size,
      });

      notifications.show({
        title: "Removed",
        message: `${selectedEntities.size} entities removed from list`,
        color: "green",
      });

      setSelectedEntities(new Set());
      setShowBulkConfirm(false);
    } catch (error) {
      logger.error("catalogue-ui", "Failed to bulk remove entities", {
        listId: selectedList.id,
        error,
      });
      notifications.show({
        title: "Error",
        message: "Failed to remove entities",
        color: "red",
      });
    }
  }, [selectedList, selectedEntities, bulkRemoveEntities]);

  const handleBulkMove = useCallback(async () => {
    if (
      !selectedList ||
      !selectedList.id ||
      !targetListId ||
      selectedEntities.size === 0
    )
      return;

    try {
      await bulkMoveEntities(selectedList.id, targetListId, [
        ...selectedEntities,
      ]);

      logger.debug("catalogue-ui", "Bulk move completed", {
        sourceListId: selectedList.id,
        targetListId,
        movedCount: selectedEntities.size,
      });

      notifications.show({
        title: "Moved",
        message: `${selectedEntities.size} entities moved to target list`,
        color: "green",
      });

      setSelectedEntities(new Set());
      setShowBulkMoveModal(false);
      setTargetListId(null);
    } catch (error) {
      logger.error("catalogue-ui", "Failed to bulk move entities", {
        sourceListId: selectedList.id,
        targetListId,
        error,
      });
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to move entities",
        color: "red",
      });
    }
  }, [selectedList, targetListId, selectedEntities, bulkMoveEntities]);

  const handleRemoveDuplicates = useCallback(async () => {
    if (!selectedList?.id) return;

    try {
      const toRemove = suggestDuplicateRemovals(entities);
      await bulkRemoveEntities(selectedList.id, toRemove);
      setShowDuplicatesModal(false);
      logger.info("catalogue-entities", "Duplicates removed", {
        removedCount: toRemove.length,
      });
      notifications.show({
        title: "Duplicates Removed",
        message: `Removed ${toRemove.length} duplicate entities`,
        color: "green",
      });
    } catch (error) {
      logger.error("catalogue-entities", "Failed to remove duplicates", {
        error,
      });
      notifications.show({
        title: "Error",
        message: "Failed to remove duplicates",
        color: "red",
      });
    }
  }, [selectedList?.id, entities, bulkRemoveEntities]);

  // Single entity operations
  const handleRemoveEntity = useCallback(
    async (entityRecordId: string) => {
      if (!selectedList || !selectedList.id) return;

      try {
        await removeEntityFromList(selectedList.id, entityRecordId);
        logger.debug("catalogue-ui", "Entity removed from list", {
          listId: selectedList.id,
          entityRecordId,
        });
        notifications.show({
          title: "Removed",
          message: "Entity removed from list",
          color: "green",
        });
      } catch (error) {
        logger.error("catalogue-ui", "Failed to remove entity from list", {
          listId: selectedList.id,
          entityRecordId,
          error,
        });
        notifications.show({
          title: "Error",
          message: "Failed to remove entity",
          color: "red",
        });
      }
    },
    [selectedList, removeEntityFromList]
  );

  const handleEditNotes = useCallback(
    async (entityRecordId: string, notes: string) => {
      try {
        await updateEntityNotes(entityRecordId, notes);
        logger.debug("catalogue-ui", "Entity notes updated", {
          entityRecordId,
          notesLength: notes.length,
        });
        notifications.show({
          title: "Success",
          message: "Notes updated successfully",
          color: "green",
        });
      } catch (error) {
        logger.error("catalogue-ui", "Failed to update entity notes", {
          entityRecordId,
          error,
        });
        notifications.show({
          title: "Error",
          message: "Failed to update notes",
          color: "red",
        });
      }
    },
    [updateEntityNotes]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || !selectedList) return;

      const oldIndex = sortedEntities.findIndex((item) => item.id === active.id);
      const newIndex = sortedEntities.findIndex((item) => item.id === over.id);

      if (oldIndex === newIndex) return;

      const items = arrayMove(sortedEntities, oldIndex, newIndex);

      // Update positions
      const reorderedIds = items
        .filter(
          (entity): entity is typeof entity & { id: string } => !!entity.id
        )
        .map((entity, index) => {
          entity.position = index + 1;
          return entity.id;
        });

      try {
        if (!selectedList.id) return;
        await reorderEntities(selectedList.id, reorderedIds);
        logger.debug("catalogue-ui", "Entities reordered successfully", {
          listId: selectedList.id,
          entityCount: reorderedIds.length,
        });

        // Announce reorder to screen readers
        notifications.show({
          title: "Reordered",
          message: `Entity moved from position ${oldIndex + 1} to position ${newIndex + 1}`,
          color: "blue",
          autoClose: NOTIFICATION_DURATION.SHORT_MS,
        });
      } catch (error) {
        logger.error("catalogue-ui", "Failed to reorder entities", {
          listId: selectedList.id,
          error,
        });
        notifications.show({
          title: "Error",
          message: "Failed to reorder entities",
          color: "red",
        });
      }
    },
    [selectedList, sortedEntities, reorderEntities]
  );

  return {
    // Context data
    selectedList,
    entities,
    isLoadingEntities,
    lists,

    // Filtering and sorting
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy: setSortBy as (sort: SortOption) => void,
    filteredEntities,
    sortedEntities,
    entityTypes,

    // Selection
    selectedEntities,
    handleSelectAll,
    handleToggleEntity,
    clearSelection,

    // Bulk operations
    showBulkConfirm,
    setShowBulkConfirm,
    showBulkMoveModal,
    setShowBulkMoveModal,
    targetListId,
    setTargetListId,
    handleBulkRemove,
    handleBulkMove,

    // Duplicates
    duplicateStats,
    showDuplicatesModal,
    setShowDuplicatesModal,
    handleRemoveDuplicates,

    // Entity operations
    handleRemoveEntity,
    handleEditNotes,
    handleDragEnd,

    // Virtualization
    parentRef,
    useVirtualization,
    rowVirtualizer,
  };
};
