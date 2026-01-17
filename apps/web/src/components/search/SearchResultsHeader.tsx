/**
 * Search results header component with stats, filters, and view controls
 */
import type { AutocompleteResult } from "@bibgraph/types";
import { ENTITY_METADATA, toEntityType } from "@bibgraph/types";
import {
  Badge,
  Button,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconLayoutGrid,
  IconList,
  IconTable,
} from "@tabler/icons-react";

import { ICON_SIZE } from "@/config/style-constants";

import { ExportButton } from "../export/ExportButton";
import type { SortOption, ViewMode } from "./search-page-types";
import { getEntityTypeBreakdown,SORT_OPTIONS } from "./search-page-types";

interface EntityTypeFilterBadgeProps {
  type: string;
  count: number;
  isSelected: boolean;
  color: string;
  onToggle: (type: string) => void;
}

const EntityTypeFilterBadge = ({
  type,
  count,
  isSelected,
  color,
  onToggle,
}: EntityTypeFilterBadgeProps) => (
  <Badge
    size="sm"
    color={color}
    variant={isSelected ? "filled" : "light"}
    leftSection={isSelected ? "* " : undefined}
    style={{ cursor: 'pointer', userSelect: 'none' }}
    onClick={() => onToggle(type)}
  >
    {type} ({count})
  </Badge>
);

interface SearchResultsHeaderProps {
  sortedResultsCount: number;
  totalResultsCount: number;
  selectedTypes: string[];
  searchDuration: number;
  viewMode: ViewMode;
  sortBy: SortOption;
  searchResults: AutocompleteResult[];
  searchQuery: string;
  sortedResults: AutocompleteResult[];
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sort: SortOption) => void;
  onTypeFilterToggle: (type: string) => void;
  onClearFilters: () => void;
}

export const SearchResultsHeader = ({
  sortedResultsCount,
  totalResultsCount,
  selectedTypes,
  searchDuration,
  viewMode,
  sortBy,
  searchResults,
  searchQuery,
  sortedResults,
  onViewModeChange,
  onSortChange,
  onTypeFilterToggle,
  onClearFilters,
}: SearchResultsHeaderProps) => {
  const entityTypeBreakdown = getEntityTypeBreakdown(searchResults);

  return (
    <Stack gap="md">
      {/* Primary stats row */}
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="md" align="center">
          <Text size="sm" fw={500}>
            {sortedResultsCount} {sortedResultsCount === 1 ? 'result' : 'results'}
            {selectedTypes.length > 0 && ` (filtered from ${totalResultsCount})`}
          </Text>
          {searchDuration > 0 && (
            <Tooltip label={`${searchDuration}ms from OpenAlex API`}>
              <Text size="xs" c="dimmed" style={{ cursor: 'help' }}>
                {(searchDuration / 1000).toFixed(2)}s
              </Text>
            </Tooltip>
          )}
        </Group>

        {/* View mode toggle and sort selector */}
        <Group gap="sm">
          <Select
            size="xs"
            value={sortBy}
            onChange={(value) => onSortChange(value as SortOption)}
            data={SORT_OPTIONS}
            style={{ width: 140 }}
            allowDeselect={false}
          />
          <SegmentedControl
            value={viewMode}
            onChange={(value) => onViewModeChange(value as ViewMode)}
            data={[
              {
                value: 'table',
                label: (
                  <Tooltip label="Table view"><IconTable size={ICON_SIZE.SM} /></Tooltip>
                )
              },
              {
                value: 'card',
                label: (
                  <Tooltip label="Card view"><IconLayoutGrid size={ICON_SIZE.SM} /></Tooltip>
                )
              },
              {
                value: 'list',
                label: (
                  <Tooltip label="List view"><IconList size={ICON_SIZE.SM} /></Tooltip>
                )
              },
            ]}
            size="xs"
          />
          <ExportButton
            results={sortedResults}
            query={searchQuery}
          />
        </Group>
      </Group>

      {/* Entity type breakdown and filter chips */}
      {entityTypeBreakdown.length > 0 && (
        <Stack gap="xs">
          <Group gap="xs" wrap="wrap">
            <Text size="xs" c="dimmed">Filter by type:</Text>
            {entityTypeBreakdown.map(({ type, count }) => {
              const isSelected = selectedTypes.includes(type);
              const pluralForm = toEntityType(type);
              const color = pluralForm && pluralForm in ENTITY_METADATA
                ? ENTITY_METADATA[pluralForm].color
                : "gray";
              return (
                <EntityTypeFilterBadge
                  key={type}
                  type={type}
                  count={count}
                  isSelected={isSelected}
                  color={color}
                  onToggle={onTypeFilterToggle}
                />
              );
            })}
            {selectedTypes.length > 0 && (
              <Button
                size="xs"
                variant="subtle"
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Stack>
  );
};
