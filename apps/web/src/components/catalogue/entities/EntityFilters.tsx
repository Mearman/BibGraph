/**
 * Entity Filters Component
 * Search, filter by type, and sort controls for entity list
 */

import type { EntityType } from "@bibgraph/types";
import { Group, Select, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { ICON_SIZE } from "@/config/style-constants";

import type { SortOption } from "./useCatalogueEntities";

interface EntityFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: string;
  onFilterTypeChange: (type: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  entityTypes: EntityType[];
}

export const EntityFilters = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  sortBy,
  onSortChange,
  entityTypes,
}: EntityFiltersProps) => {
  return (
    <Group gap="md">
      <TextInput
        placeholder="Search entities..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        leftSection={<IconSearch size={ICON_SIZE.MD} />}
        flex={1}
        aria-label="Search entities by ID or notes"
      />

      <Select
        value={filterType}
        onChange={(value) => onFilterTypeChange(value || "all")}
        data={[
          { value: "all", label: "All Types" },
          ...entityTypes.map((type) => ({ value: type, label: type })),
        ]}
        w={120}
        aria-label="Filter entities by type"
      />

      <Select
        value={sortBy}
        onChange={(value) => onSortChange((value || "position") as SortOption)}
        data={[
          { value: "position", label: "Order" },
          { value: "entityId", label: "Entity ID" },
          { value: "entityType", label: "Type" },
          { value: "addedAt", label: "Date Added" },
        ]}
        w={120}
        aria-label="Sort entities by"
      />
    </Group>
  );
};
