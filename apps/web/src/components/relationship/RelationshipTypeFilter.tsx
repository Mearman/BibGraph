/**
 * Filter component for relationship types
 * Allows filtering relationship sections by RelationType with grouped categories
 * @module RelationshipTypeFilter
 * @see specs/016-entity-relationship-viz/spec.md (User Story 3)
 */

import { RelationType } from '@bibgraph/types';
import {
  Accordion,
  Badge,
  Button,
  Chip,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';
import React from 'react';

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import {
  FILTER_PRESETS,
  RELATIONSHIP_TYPE_CATEGORIES,
  RELATIONSHIP_TYPE_LABELS,
} from '@/types/relationship';

export interface RelationshipTypeFilterProps {
  /** Currently selected relationship types (empty = all) */
  selectedTypes: RelationType[];

  /** Callback when filter changes */
  onChange: (types: RelationType[]) => void;

  /** Optional title for the filter section */
  title?: string;
}

/**
 * Component for filtering relationships by type
 * Displays preset buttons and categorized chip toggles in collapsible sections
 * @param root0
 * @param root0.selectedTypes
 * @param root0.onChange
 * @param root0.title
 */
export const RelationshipTypeFilter = ({
  selectedTypes,
  onChange,
  title = 'Filter by Relationship Type',
}: RelationshipTypeFilterProps) => {
  // Get all available relationship types (unique values only, excluding deprecated aliases)
  const allTypes = React.useMemo(() => {
    const values = Object.values(RelationType);
    const seen = new Set<string>();
    return values.filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }, []);

  // Check if a type is selected (empty selectedTypes = all selected)
  const isTypeSelected = (type: RelationType): boolean => {
    return selectedTypes.length === 0 || selectedTypes.includes(type);
  };

  // Handle individual type toggle
  const handleToggle = (type: RelationType) => {
    if (selectedTypes.length === 0) {
      // Currently showing all - switching to exclude this one
      onChange(allTypes.filter((t) => t !== type));
    } else if (selectedTypes.includes(type)) {
      // Remove from selection
      const newSelection = selectedTypes.filter((t) => t !== type);
      // If removing would leave empty, keep at least one
      onChange(newSelection.length > 0 ? newSelection : []);
    } else {
      // Add to selection
      onChange([...selectedTypes, type]);
    }
  };

  // Handle preset selection
  const handlePresetSelect = (presetTypes: RelationType[]) => {
    onChange(presetTypes);
  };

  // Check if a category is fully selected
  const isCategoryFullySelected = (categoryTypes: RelationType[]): boolean => {
    if (selectedTypes.length === 0) return true;
    return categoryTypes.every((type) => selectedTypes.includes(type));
  };

  // Get count of selected types in a category
  const getSelectedCountInCategory = (categoryTypes: RelationType[]): number => {
    if (selectedTypes.length === 0) return categoryTypes.length;
    return categoryTypes.filter((type) => selectedTypes.includes(type)).length;
  };

  // Toggle all types in a category
  const handleCategoryToggle = (categoryTypes: RelationType[]) => {
    const allCategorySelected = isCategoryFullySelected(categoryTypes);

    if (selectedTypes.length === 0) {
      // Currently all selected - deselect this category
      onChange(allTypes.filter((t) => !categoryTypes.includes(t)));
    } else if (allCategorySelected) {
      // Remove all category types
      const newSelection = selectedTypes.filter((t) => !categoryTypes.includes(t));
      onChange(newSelection.length > 0 ? newSelection : []);
    } else {
      // Add all missing category types
      const missingTypes = categoryTypes.filter((t) => !selectedTypes.includes(t));
      onChange([...selectedTypes, ...missingTypes]);
    }
  };

  // Current active preset (for highlighting)
  const activePresetId = React.useMemo(() => {
    for (const preset of FILTER_PRESETS) {
      if (preset.types.length === 0 && selectedTypes.length === 0) {
        return preset.id;
      }
      if (
        preset.types.length > 0 &&
        preset.types.length === selectedTypes.length &&
        preset.types.every((t) => selectedTypes.includes(t))
      ) {
        return preset.id;
      }
    }
    return null;
  }, [selectedTypes]);

  return (
    <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }} data-testid="relationship-type-filter">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconFilter size={ICON_SIZE.MD} />
            <Title order={3} size="h4">{title}</Title>
          </Group>
          {selectedTypes.length > 0 && (
            <Badge variant="light" color="blue">
              {selectedTypes.length} selected
            </Badge>
          )}
        </Group>

        {/* Preset Buttons */}
        <Group gap="xs">
          {FILTER_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              size="xs"
              variant={activePresetId === preset.id ? 'filled' : 'light'}
              onClick={() => handlePresetSelect(preset.types)}
              data-testid={`preset-${preset.id}`}
            >
              {preset.label}
            </Button>
          ))}
        </Group>

        {/* Categorized Accordion */}
        <Accordion variant="separated" radius="md" defaultValue="core">
          {RELATIONSHIP_TYPE_CATEGORIES.map((category) => {
            const selectedCount = getSelectedCountInCategory(category.types);
            const totalCount = category.types.length;
            const isFullySelected = isCategoryFullySelected(category.types);

            return (
              <Accordion.Item key={category.id} value={category.id}>
                <Accordion.Control>
                  <Group justify="space-between" pr="sm">
                    <Text size="sm" fw={500}>{category.label}</Text>
                    <Badge
                      size="sm"
                      variant={isFullySelected ? 'filled' : 'light'}
                      color={selectedCount > 0 ? 'blue' : 'gray'}
                    >
                      {selectedCount}/{totalCount}
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {/* Category toggle button */}
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => handleCategoryToggle(category.types)}
                      data-testid={`category-toggle-${category.id}`}
                    >
                      {isFullySelected ? 'Deselect All' : 'Select All'}
                    </Button>

                    {/* Type Chips */}
                    <Group gap="xs">
                      {category.types.map((type) => {
                        const label = RELATIONSHIP_TYPE_LABELS[type] || type;
                        const isSelected = isTypeSelected(type);

                        return (
                          <Chip
                            key={type}
                            checked={isSelected}
                            onChange={() => handleToggle(type)}
                            variant="light"
                            size="sm"
                            data-testid={`filter-chip-${type}`}
                          >
                            {label}
                          </Chip>
                        );
                      })}
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      </Stack>
    </Paper>
  );
};
