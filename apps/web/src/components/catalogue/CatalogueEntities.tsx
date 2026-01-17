/**
 * Component for displaying entities in a selected catalogue list
 * Supports sorting, filtering, and entity operations
 *
 * This is the main composition component that combines:
 * - Entity filtering and sorting (EntityFilters)
 * - Bulk operations (BulkActionsBar, modals)
 * - Entity table with virtualization (EntityTable)
 * - Empty/loading states (EntityEmptyStates)
 */

import type { EntityType } from "@bibgraph/types";
import { Alert, Card, Stack, Text } from "@mantine/core";

import { BORDER_STYLE_GRAY_3 } from "@/config/style-constants";

import {
  BulkActionsBar,
  BulkMoveModal,
  BulkRemoveModal,
  DuplicatesModal,
  DuplicatesWarningBanner,
  EmptyListState,
  EntityFilters,
  EntityListHeader,
  EntityTable,
  LoadingState,
  NoListSelectedState,
  useCatalogueEntities,
} from "./entities";

interface CatalogueEntitiesProps {
  /** Callback to navigate to entity pages */
  onNavigate?: (entityType: EntityType, entityId: string) => void;
}

export const CatalogueEntities = ({ onNavigate }: CatalogueEntitiesProps) => {
  const {
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
    setSortBy,
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
  } = useCatalogueEntities();

  // Early return states
  if (!selectedList) {
    return <NoListSelectedState />;
  }

  if (isLoadingEntities) {
    return <LoadingState listTitle={selectedList.title} />;
  }

  if (entities.length === 0) {
    return <EmptyListState />;
  }

  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} padding="md">
      <Stack gap="md">
        {/* Duplicate Warning Banner */}
        {duplicateStats && (
          <DuplicatesWarningBanner
            duplicateStats={duplicateStats}
            onViewDuplicates={() => setShowDuplicatesModal(true)}
          />
        )}

        {/* Header */}
        <EntityListHeader
          entityCount={entities.length}
          selectedList={selectedList}
          duplicateStats={duplicateStats}
          onViewDuplicates={() => setShowDuplicatesModal(true)}
        />

        {/* Filters */}
        <EntityFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          sortBy={sortBy}
          onSortChange={setSortBy}
          entityTypes={entityTypes}
        />

        {/* Bulk Actions */}
        {selectedEntities.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedEntities.size}
            listsCount={lists.length}
            onMoveClick={() => setShowBulkMoveModal(true)}
            onRemoveClick={() => setShowBulkConfirm(true)}
            onClearSelection={clearSelection}
          />
        )}

        {/* Entities Table */}
        <EntityTable
          sortedEntities={sortedEntities}
          selectedEntities={selectedEntities}
          onSelectAll={handleSelectAll}
          onToggleEntity={handleToggleEntity}
          onNavigate={onNavigate}
          onRemove={handleRemoveEntity}
          onEditNotes={handleEditNotes}
          onDragEnd={handleDragEnd}
          parentRef={parentRef}
          useVirtualization={useVirtualization}
          rowVirtualizer={rowVirtualizer}
        />

        {/* No results message */}
        {filteredEntities.length === 0 && entities.length > 0 && (
          <Alert color="yellow">
            No entities match your current filters
          </Alert>
        )}

        {/* Footer hint */}
        <Text size="xs" c="dimmed" ta="center">
          Drag entities to reorder them - Click on entity ID to view details
        </Text>
      </Stack>

      {/* Bulk Delete Confirmation Modal */}
      <BulkRemoveModal
        opened={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        selectedCount={selectedEntities.size}
        onConfirm={handleBulkRemove}
      />

      {/* Bulk Move Modal */}
      <BulkMoveModal
        opened={showBulkMoveModal}
        onClose={() => setShowBulkMoveModal(false)}
        selectedCount={selectedEntities.size}
        targetListId={targetListId}
        onTargetListChange={setTargetListId}
        lists={lists}
        currentListId={selectedList?.id}
        onConfirm={handleBulkMove}
      />

      {/* Duplicates Modal */}
      <DuplicatesModal
        opened={showDuplicatesModal}
        onClose={() => setShowDuplicatesModal(false)}
        duplicateStats={duplicateStats}
        onRemoveDuplicates={handleRemoveDuplicates}
      />
    </Card>
  );
};
