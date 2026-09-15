/**
 * Autocomplete entity type filter with built-in navigation
 *
 * A unified component that combines EntityTypeFilter with navigation logic.
 * Used on both the general autocomplete page and entity-specific routes.
 *
 * On entity-specific routes (e.g., /autocomplete/works):
 * - Shows the current entity type as selected
 * - Clicking other types navigates to the appropriate route
 *
 * On the general autocomplete page:
 * - Allows multi-select with checkboxes
 * - Single type selection navigates to dedicated route
 * - Multiple types stay on general page with types param
 */

import type { EntityType } from "@bibgraph/types";
import { useCallback } from "react";

import {
  AUTOCOMPLETE_ENTITY_TYPES,
  EntityTypeFilter,
} from "@/components/EntityTypeFilter";

export interface AutocompleteEntityFilterProps {
  /**
  Current search query to preserve during navigation
   */
  query: string;

  /**
  Currently selected entity types
   */
  selectedTypes: EntityType[];

  /**
   * Callback when selection changes (used on general page for state updates)
   * On entity-specific routes, this is optional as navigation handles changes
   */
  onSelectionChange?: (types: readonly EntityType[]) => void;

  /**
  Show as inline badges instead of checkboxes (default: false)
   */
  inline?: boolean;

  /**
  Title for the filter section
   */
  title?: string;

  /**
  Whether to show Select All / Clear All buttons (default: true)
   */
  showButtons?: boolean;
}

/**
 * Entity types that have dedicated autocomplete routes
 */
const ENTITY_AUTOCOMPLETE_ROUTES = new Set<EntityType>([
  "works",
  "authors",
  "sources",
  "institutions",
  "concepts",
  "publishers",
  "funders",
]);

/**
 * Autocomplete entity filter with integrated navigation
 */
export const AutocompleteEntityFilter = ({
  query,
  selectedTypes,
  onSelectionChange,
  inline = false,
  title = "Filter by Entity Type",
  showButtons = true,
}: AutocompleteEntityFilterProps) => {
  const handleChange = useCallback(
    (types: readonly EntityType[]) => {
      // If all types selected, go to general autocomplete (default view)
      if (types.length === AUTOCOMPLETE_ENTITY_TYPES.length) {
        if (onSelectionChange) {
          onSelectionChange(types);
        }
        const parameters = new URLSearchParams();
        if (query) parameters.set("q", query);
        window.location.hash = parameters.toString()
          ? `/autocomplete?${parameters.toString()}`
          : "/autocomplete";
        return;
      }

      // If no types selected, go to general autocomplete with explicit "none"
      if (types.length === 0) {
        if (onSelectionChange) {
          onSelectionChange(types);
        }
        const parameters = new URLSearchParams();
        if (query) parameters.set("q", query);
        parameters.set("types", "none");
        window.location.hash = `/autocomplete?${parameters.toString()}`;
        return;
      }

      // If single type selected and it has a dedicated route, navigate there
      if (
        types.length === 1 &&
        ENTITY_AUTOCOMPLETE_ROUTES.has(types[0])
      ) {
        const entityType = types[0];
        const parameters = new URLSearchParams();
        if (query) parameters.set("q", query);
        window.location.hash = parameters.toString()
          ? `/autocomplete/${entityType}?${parameters.toString()}`
          : `/autocomplete/${entityType}`;
        return;
      }

      // Multiple types selected - update state and stay on general page
      if (onSelectionChange) {
        onSelectionChange(types);
      }

      // Navigate to general autocomplete with types param
      const parameters = new URLSearchParams();
      if (query) parameters.set("q", query);
      parameters.set("types", types.join(","));
      window.location.hash = `/autocomplete?${parameters.toString()}`;
    },
    [query, onSelectionChange]
  );

  return (
    <EntityTypeFilter
      selectedTypes={selectedTypes}
      onChange={handleChange}
      title={title}
      inline={inline}
      showButtons={showButtons}
    />
  );
};
