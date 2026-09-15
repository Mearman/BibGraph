import {
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import type { AdvancedSearchFilters } from "./search-filters-types";

interface SearchFacetsProperties {
  filters?: AdvancedSearchFilters;
  resultsCount?: number;
  onRemoveFilter: (field: keyof AdvancedSearchFilters, value?: unknown) => void;
  onClearAll: () => void;
  isLoading?: boolean;
}

const MAX_VISIBLE_FACETS = 8;

interface ActiveFilter {
  field: keyof AdvancedSearchFilters;
  label: string;
  value: string;
  removable: boolean;
}

export const SearchFacets = ({
  filters,
  resultsCount = 0,
  onRemoveFilter,
  onClearAll,
  isLoading = false,
}: SearchFacetsProperties) => {
  const [showAllFacets, setShowAllFacets] = useState(false);

  const getActiveFilters = (): ActiveFilter[] => {
    if (!filters) return [];

    const activeFilters: ActiveFilter[] = [];

    // Text-based filters
    if (filters.title !== undefined && filters.title !== "") {
      activeFilters.push({
        field: "title",
        label: "Title",
        value: filters.title,
        removable: true,
      });
    }

    if (filters.abstract !== undefined && filters.abstract !== "") {
      activeFilters.push({
        field: "abstract",
        label: "Abstract",
        value: filters.abstract,
        removable: true,
      });
    }

    if (filters.author !== undefined && filters.author !== "") {
      activeFilters.push({
        field: "author",
        label: "Author",
        value: filters.author,
        removable: true,
      });
    }

    if (filters.institution !== undefined && filters.institution !== "") {
      activeFilters.push({
        field: "institution",
        label: "Institution",
        value: filters.institution,
        removable: true,
      });
    }

    if (filters.venue !== undefined && filters.venue !== "") {
      activeFilters.push({
        field: "venue",
        label: "Venue",
        value: filters.venue,
        removable: true,
      });
    }

    if (filters.keywords !== undefined && filters.keywords !== "") {
      activeFilters.push({
        field: "keywords",
        label: "Keywords",
        value: filters.keywords,
        removable: true,
      });
    }

    // Date filters
    if (filters.publicationYear) {
      const { from, to } = filters.publicationYear;
      let publicationYearValue: string | undefined;
      if (from !== undefined && to !== undefined) {
        publicationYearValue = `${String(from)}-${String(to)}`;
      } else if (from !== undefined) {
        publicationYearValue = `>= ${String(from)}`;
      } else if (to !== undefined) {
        publicationYearValue = `<= ${String(to)}`;
      }
      if (publicationYearValue !== undefined) {
        activeFilters.push({
          field: "publicationYear",
          label: "Publication Year",
          value: publicationYearValue,
          removable: true,
        });
      }
    }

    // Citation filters
    if (filters.citationCount) {
      const { from, to } = filters.citationCount;
      let citationCountValue: string | undefined;
      if (from !== undefined && to !== undefined) {
        citationCountValue = `${String(from)}-${String(to)}`;
      } else if (from !== undefined) {
        citationCountValue = `>= ${String(from)}`;
      } else if (to !== undefined) {
        citationCountValue = `<= ${String(to)}`;
      }
      if (citationCountValue !== undefined) {
        activeFilters.push({
          field: "citationCount",
          label: "Citations",
          value: citationCountValue,
          removable: true,
        });
      }
    }

    // Array-based filters
    if (filters.entityType && filters.entityType.length > 0) {
      activeFilters.push({
        field: "entityType",
        label: "Entity Types",
        value: filters.entityType.join(", "),
        removable: true,
      });
    }

    if (filters.publicationType && filters.publicationType.length > 0) {
      activeFilters.push({
        field: "publicationType",
        label: "Publication Types",
        value: filters.publicationType.join(", "),
        removable: true,
      });
    }

    if (filters.language && filters.language.length > 0) {
      activeFilters.push({
        field: "language",
        label: "Languages",
        value: filters.language.join(", "),
        removable: true,
      });
    }

    if (filters.fieldOfStudy && filters.fieldOfStudy.length > 0) {
      activeFilters.push({
        field: "fieldOfStudy",
        label: "Fields",
        value: filters.fieldOfStudy.join(", "),
        removable: true,
      });
    }

    if (filters.concepts && filters.concepts.length > 0) {
      activeFilters.push({
        field: "concepts",
        label: "Concepts",
        value: filters.concepts.join(", "),
        removable: true,
      });
    }

    // Boolean filters
    if (filters.openAccess === true) {
      activeFilters.push({
        field: "openAccess",
        label: "Access",
        value: "Open Access",
        removable: true,
      });
    }

    return activeFilters;
  };

  const activeFilters = getActiveFilters();
  const displayFilters = showAllFacets ? activeFilters : activeFilters.slice(0, MAX_VISIBLE_FACETS);

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <Paper p="md" mb="md" withBorder>
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconFilter size={16} />
            <Text size="sm" fw={500}>
              Active Filters
            </Text>
            <Badge size="sm" variant="light" color="blue">
              {activeFilters.length}
            </Badge>
          </Group>

          {resultsCount > 0 && (
            <Text size="sm" c="dimmed">
              {resultsCount.toLocaleString()} results
            </Text>
          )}
        </Group>

        {/* Active Filter Pills */}
        <ScrollArea.Autosize mah={120}>
          <Group gap="xs" wrap="wrap">
            {displayFilters.map((filter, index) => (
              <Badge
                key={`${filter.field}-${String(index)}`}
                size="md"
                variant="light"
                color="blue"
                pl="xs"
                pr={filter.removable ? "xs" : "sm"}
                style={{
                  maxWidth: "200px",
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "default",
                }}
              >
                <Group gap={4}>
                  <Tooltip label={filter.value} position="bottom">
                    <span style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "inline-block",
                      maxWidth: filter.removable ? "120px" : "150px"
                    }}>
                      <strong>{filter.label}:</strong> {filter.value}
                    </span>
                  </Tooltip>
                  {filter.removable && (
                    <IconX
                      size={10}
                      style={{ cursor: "pointer", flexShrink: 0 }}
                      onClick={() => {
                        onRemoveFilter(filter.field);
                      }}
                    />
                  )}
                </Group>
              </Badge>
            ))}

            {activeFilters.length > MAX_VISIBLE_FACETS && !showAllFacets && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconChevronDown size={12} />}
                onClick={() => {
                  setShowAllFacets(true);
                }}
              >
                Show {activeFilters.length - MAX_VISIBLE_FACETS} more
              </Button>
            )}

            {showAllFacets && activeFilters.length > MAX_VISIBLE_FACETS && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconChevronUp size={12} />}
                onClick={() => {
                  setShowAllFacets(false);
                }}
              >
                Show less
              </Button>
            )}
          </Group>
        </ScrollArea.Autosize>

        {/* Actions */}
        <Group justify="flex-end" gap="xs">
          {activeFilters.length > 1 && (
            <Button
              variant="outline"
              size="xs"
              leftSection={<IconRefresh size={12} />}
              onClick={onClearAll}
              disabled={isLoading}
            >
              Clear All Filters
            </Button>
          )}
        </Group>

        {/* Filter Summary */}
        {activeFilters.length > 0 && (
          <Text size="xs" c="dimmed" ta="right">
            Click × to remove individual filters or "Clear All" to reset
          </Text>
        )}
      </Stack>
    </Paper>
  );
};