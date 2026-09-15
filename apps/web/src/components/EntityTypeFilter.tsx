/**
 * Filter component for entity types
 * Allows filtering autocomplete/search by EntityType with checkboxes
 */

import type { EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Title,
} from "@mantine/core";

/**
 * Entity types that support autocomplete endpoints
 */
export const AUTOCOMPLETE_ENTITY_TYPES: EntityType[] = [
  "works",
  "authors",
  "sources",
  "institutions",
  "topics",
  "concepts",
  "publishers",
  "funders",
];

export interface EntityTypeFilterProps {
  /**
  Currently selected entity types (empty = all)
   */
  selectedTypes: EntityType[];

  /**
  Callback when filter changes
   */
  onChange: (types: readonly EntityType[]) => void;

  /**
  Available entity types to show (defaults to AUTOCOMPLETE_ENTITY_TYPES)
   */
  availableTypes?: EntityType[];

  /**
  Optional title for the filter section
   */
  title?: string;

  /**
  Show as inline chips instead of vertical list
   */
  inline?: boolean;

  /**
   * Whether to show Select All / Clear All buttons. Defaults to `true`.
   */
  showButtons?: boolean;
}

/**
 * Component for filtering by entity type
 * Displays checkboxes or chips for each EntityType
 */
export const EntityTypeFilter = ({
  selectedTypes,
  onChange,
  availableTypes = AUTOCOMPLETE_ENTITY_TYPES,
  title = "Entity Types",
  inline = false,
  showButtons = true,
}: EntityTypeFilterProps) => {
  // Handle checkbox toggle
  const handleToggle = (type: EntityType) => {
    const isCurrentlySelected = selectedTypes.includes(type);

    if (isCurrentlySelected) {
      // Remove from selection
      const newSelection = selectedTypes.filter((t) => t !== type);
      onChange(newSelection);
    } else {
      // Add to selection
      const newSelection = [...selectedTypes, type];
      onChange(newSelection);
    }
  };

  // Handle select all - explicitly select all available types
  const handleSelectAll = () => {
    // Set to all available types (visually all checked)
    onChange([...availableTypes]);
  };

  // Handle clear all - deselect all types (none checked)
  const handleClearAll = () => {
    // Empty array with explicit "none" state - parent handles this as "no filter" or "no results"
    // For this component, we pass an empty array to indicate nothing is selected
    onChange([]);
  };

  // Check if all types are explicitly selected
  const isAllExplicitlySelected = availableTypes.every((t) =>
    selectedTypes.includes(t)
  );
  // Check if none are selected (empty array)
  const isNoneSelected = selectedTypes.length === 0;

  if (inline) {
    return (
      <Group gap="xs" wrap="wrap" data-testid="entity-type-filter-inline">
        {availableTypes.map((type) => {
          const metadata = ENTITY_METADATA[type];
          // Only checked if explicitly in the selection (not when empty)
          const isChecked = selectedTypes.includes(type);

          return (
            <Badge
              key={type}
              variant={isChecked ? "filled" : "outline"}
              color={metadata.color}
              style={{ cursor: "pointer" }}
              onClick={() => { handleToggle(type); }}
              data-testid={`filter-badge-${type}`}
            >
              {metadata.plural}
            </Badge>
          );
        })}
        {showButtons && (
          <>
            <Button
              size="xs"
              variant="subtle"
              onClick={handleSelectAll}
              disabled={isAllExplicitlySelected}
              data-testid="select-all-button"
            >
              Select All
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={handleClearAll}
              disabled={isNoneSelected}
              data-testid="clear-all-button"
            >
              Clear All
            </Button>
          </>
        )}
      </Group>
    );
  }

  return (
    <Paper p="md" data-testid="entity-type-filter">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3} size="h4">
            {title}
          </Title>
          {showButtons && (
            <Group gap="xs">
              <Button
                size="xs"
                variant="subtle"
                onClick={handleSelectAll}
                disabled={isAllExplicitlySelected}
                data-testid="select-all-button"
              >
                Select All
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={handleClearAll}
                disabled={isNoneSelected}
                data-testid="clear-all-button"
              >
                Clear All
              </Button>
            </Group>
          )}
        </Group>

        <Group gap="xs" wrap="wrap">
          {availableTypes.map((type) => {
            const metadata = ENTITY_METADATA[type];
            // Only checked if explicitly in the selection
            const isChecked = selectedTypes.includes(type);

            return (
              <Checkbox
                key={type}
                label={
                  <Badge variant="light" color={metadata.color} size="sm">
                    {metadata.plural}
                  </Badge>
                }
                checked={isChecked}
                onChange={() => { handleToggle(type); }}
                data-testid={`filter-checkbox-${type}`}
              />
            );
          })}
        </Group>
      </Stack>
    </Paper>
  );
};
