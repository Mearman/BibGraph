/**
 * Catalogue Entities Module
 * Exports all components and utilities for entity list management
 */

// Components
export { BulkActionsBar } from "./BulkActionsBar";
export { DuplicatesWarningBanner } from "./DuplicatesWarningBanner";
export {
  EmptyListState,
  LoadingState,
  NoListSelectedState,
} from "./EntityEmptyStates";
export { EntityFilters } from "./EntityFilters";
export { EntityListHeader } from "./EntityListHeader";
export {
  BulkMoveModal,
  BulkRemoveModal,
  DuplicatesModal,
} from "./EntityModals";
export { EntityTable } from "./EntityTable";
export { SortableEntityRow } from "./SortableEntityRow";
export type { SortableEntityRowProps } from "./SortableEntityRow";

// Utilities
export {
  formatEntityMetadata,
  formatNotesForDisplay,
  PROVENANCE_LABELS,
} from "./entity-metadata-formatter";

// Hooks
export { useCatalogueEntities } from "./useCatalogueEntities";
export type { SortOption, UseCatalogueEntitiesReturn } from "./useCatalogueEntities";
