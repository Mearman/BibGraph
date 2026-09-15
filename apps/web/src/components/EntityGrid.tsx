import type { EntityType } from "@bibgraph/types";
import { EntityCard } from "@bibgraph/ui";
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconLayoutGrid,
  IconList,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { ContentSkeleton } from "./molecules/ContentSkeleton";

export interface EntityGridItem {
  id: string;
  displayName: string;
  entityType: EntityType;
  worksCount?: number;
  citedByCount?: number;
  description?: string;
  tags?: { label: string; color?: string }[];
  bookmarked?: boolean;
  lastUpdated?: string;
}

interface EntityGridProperties {
  items: EntityGridItem[];
  onNavigate?: (path: string) => void;
  onBookmark?: (id: string) => void;
  onRefresh?: () => void;
  cols?: number | { base: number; xs: number; sm: number; md: number; lg: number; xl: number };
  spacing?: "xs" | "sm" | "md" | "lg" | "xl";
  emptyMessage?: string;
  loading?: boolean;
  loadingCount?: number;
  searchable?: boolean;
  filterable?: boolean;
  showViewToggle?: boolean;
  defaultView?: "grid" | "list";
  maxHeight?: number;
}

const DEFAULT_COLS = { base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 5 };

export const EntityGrid = ({
  items,
  onNavigate,
  onBookmark: _onBookmark,
  onRefresh,
  cols = DEFAULT_COLS,
  spacing = "md",
  emptyMessage = "No items to display",
  loading = false,
  loadingCount = 6,
  searchable = false,
  filterable = false,
  showViewToggle = false,
  defaultView = "grid",
  maxHeight,
}: EntityGridProperties) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultView);
  const [selectedTypes, setSelectedTypes] = useState<EntityType[]>([]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let result = items;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const matchesName = item.displayName.toLowerCase().includes(query);
        const matchesDescription = item.description?.toLowerCase().includes(query) ?? false;
        const matchesTag = item.tags?.some((tag) => tag.label.toLowerCase().includes(query)) ?? false;
        return matchesName || matchesDescription || matchesTag;
      });
    }

    // Type filter
    if (selectedTypes.length > 0) {
      result = result.filter((item) => selectedTypes.includes(item.entityType));
    }

    return result;
  }, [items, searchQuery, selectedTypes]);

  // Get unique entity types for filtering
  const availableTypes = useMemo(() => {
    return [...new Set(items.map((item) => item.entityType))];
  }, [items]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTypes([]);
  };

  // Toggle type filter
  const toggleTypeFilter = (type: EntityType) => {
    setSelectedTypes((previous) =>
      previous.includes(type)
        ? previous.filter((t) => t !== type)
        : [...previous, type]
    );
  };
  // Render loading state
  if (loading) {
    return (
      <Stack gap="md">
        {(searchable || filterable || showViewToggle || onRefresh) && (
          <Paper p="md" withBorder>
            <Group justify="space-between">
              <Group>
                {searchable && (
                  <TextInput
                    placeholder="Search entities..."
                    leftSection={<IconSearch size={16} />}
                    disabled
                    style={{ flex: 1 }}
                  />
                )}
                {filterable && availableTypes.map((type) => (
                  <Badge key={type} variant="light" style={{ opacity: 0.6 }}>
                    {type}
                  </Badge>
                ))}
              </Group>
              <Group>
                {showViewToggle && (
                  <SegmentedControl
                    value={viewMode}
                    // Loading skeleton is disabled, so the control never fires onChange; a stub keeps SegmentedControl controlled.
                    onChange={() => { /* disabled control never fires */ }}
                    disabled
                    data={[
                      { value: 'grid', label: <IconLayoutGrid size={16} /> },
                      { value: 'list', label: <IconList size={16} /> }
                    ]}
                  />
                )}
                {onRefresh && (
                  <ActionIcon variant="light" disabled>
                    <IconRefresh size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
          </Paper>
        )}
        <SimpleGrid cols={cols} spacing={spacing}>
          {Array.from({ length: loadingCount }).map((_, index) => (
            <ContentSkeleton key={index} variant="card" count={1} />
          ))}
        </SimpleGrid>
      </Stack>
    );
  }

  // Enhanced controls section
  const hasControls = searchable || filterable || showViewToggle || onRefresh !== undefined;

  return (
    <Stack gap="md" style={{ maxHeight, overflow: 'auto' }}>
      {hasControls && (
        <Paper p="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <Group gap="md" style={{ flex: 1 }}>
              {searchable && (
                <TextInput
                  placeholder="Search entities..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.currentTarget.value); }}
                  style={{ flex: 1, minWidth: 200 }}
                />
              )}
              {filterable && availableTypes.length > 1 && (
                <Group gap="xs">
                  {availableTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={selectedTypes.includes(type) ? "filled" : "light"}
                      style={{ cursor: 'pointer' }}
                                      onClick={() => { toggleTypeFilter(type); }}
                    >
                      {type}
                    </Badge>
                  ))}
                </Group>
              )}
            </Group>
            <Group gap="sm">
              {(searchQuery || selectedTypes.length > 0) && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={clearFilters}
                  leftSection={<IconAdjustmentsHorizontal size={14} />}
                >
                  Clear Filters
                </Button>
              )}
              {showViewToggle && (
                <SegmentedControl
                  value={viewMode}
                  onChange={(value) => { setViewMode(value); }}
                  data={[
                    { value: 'grid', label: <IconLayoutGrid size={16} /> },
                    { value: 'list', label: <IconList size={16} /> }
                  ]}
                  size="sm"
                />
              )}
              {onRefresh && (
                <ActionIcon variant="light" onClick={onRefresh}>
                  <IconRefresh size={16} />
                </ActionIcon>
              )}
            </Group>
          </Group>
          {filteredItems.length !== items.length && (
            <Text size="sm" c="dimmed" mt="xs">
              Showing {filteredItems.length} of {items.length} items
            </Text>
          )}
        </Paper>
      )}

      {/* Empty state */}
      {filteredItems.length === 0 ? (
        <Center p="xl" style={{ minHeight: 200 }}>
          <Stack align="center" gap="md">
            <Text size="lg" c="dimmed" ta="center">
              {searchQuery || selectedTypes.length > 0
                ? "No items match your filters"
                : emptyMessage}
            </Text>
            {(searchQuery || selectedTypes.length > 0) && (
              <Button variant="light" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            )}
          </Stack>
        </Center>
      ) : (
        /*
        Grid/List View
        */
        <SimpleGrid
          cols={viewMode === 'list' ? 1 : cols}
          spacing={spacing}
        >
          {filteredItems.map((item) => (
            <EntityCard
              key={item.id}
              id={item.id}
              displayName={item.displayName}
              entityType={item.entityType}
              worksCount={item.worksCount}
              citedByCount={item.citedByCount}
              description={item.description}
              tags={item.tags}
              onNavigate={onNavigate}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
};
