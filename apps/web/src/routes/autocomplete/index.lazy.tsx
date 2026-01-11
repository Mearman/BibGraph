import { cachedOpenAlex } from "@bibgraph/client";
import type { AutocompleteResult, EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import {
  Alert,
  Anchor,
  Badge,
  Card,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconInfoCircle, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EntityGrid } from "@/components/EntityGrid";
import { EntityListView } from "@/components/EntityListView";
import {
  AUTOCOMPLETE_ENTITY_TYPES,
  EntityTypeFilter,
} from "@/components/EntityTypeFilter";
import { ContentSkeleton } from "@/components/molecules/ContentSkeleton";
import { BaseTable } from "@/components/tables/BaseTable";
import { type TableViewMode,TableViewModeToggle } from "@/components/TableViewModeToggle";
import { API, BORDER_STYLE_GRAY_3, ICON_SIZE, TEXT, TIME_MS } from '@/config/style-constants';
import { useThemeColors } from "@/hooks/use-theme-colors";
import { decodeHtmlEntities } from "@/utils/decode-html-entities";
import { transformAutocompleteResultToGridItem } from "@/utils/entity-mappers";

/**
 * Parse comma-separated entity types from URL
 * Returns null if no types param, empty array if "none", or parsed types
 * @param typesParam
 */
const parseEntityTypes = (typesParam: string | undefined): EntityType[] | null => {
  if (!typesParam) return null; // No param = use default (all types)
  if (typesParam === "none") return []; // Explicitly cleared
  return typesParam
    .split(",")
    .map((t) => t.trim() as EntityType)
    .filter((t) => AUTOCOMPLETE_ENTITY_TYPES.includes(t));
};

const AutocompleteGeneralRoute = () => {
  const urlSearch = useSearch({ from: "/autocomplete/" });
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<TableViewMode>("list");
  const { getEntityColor } = useThemeColors();

  // Navigation handler for entity cards in list/grid views
  const handleNavigate = useCallback((path: string) => {
    navigate({ to: path });
  }, [navigate]);

  // Derive query from URL search params
  const query = useMemo(() => {
    return urlSearch.q || urlSearch.search || "";
  }, [urlSearch.q, urlSearch.search]);

  // Derive selected entity types from URL
  // If no types specified in URL, default to all types (all checkboxes checked)
  const selectedTypes = useMemo<EntityType[]>(() => {
    const typesFromUrl = parseEntityTypes(urlSearch.types);
    // null = no param (default to all), [] = explicitly cleared, array = specific types
    if (typesFromUrl === null) return [...AUTOCOMPLETE_ENTITY_TYPES];
    return typesFromUrl;
  }, [urlSearch.types]);

  // Handle entity type filter changes
  const handleEntityTypeChange = useCallback(
    (types: EntityType[]) => {
      // Build URL params, avoiding URLSearchParams encoding for types (commas get encoded)
      const paramParts: string[] = [];
      if (query) {
        paramParts.push(`q=${encodeURIComponent(query)}`);
      }

      // Determine types param: omit if all selected, "none" if cleared, otherwise list
      const allSelected = types.length === AUTOCOMPLETE_ENTITY_TYPES.length &&
        AUTOCOMPLETE_ENTITY_TYPES.every(t => types.includes(t));

      if (types.length === 0) {
        paramParts.push("types=none");
      } else if (!allSelected) {
        // Only include types param if not all selected (partial selection)
        paramParts.push(`types=${types.join(",")}`);
      }
      // If all selected, omit types param entirely (default state)

      if (urlSearch.filter) {
        paramParts.push(`filter=${encodeURIComponent(urlSearch.filter)}`);
      }

      const newHash = paramParts.length > 0
        ? `#/autocomplete?${paramParts.join("&")}`
        : "#/autocomplete";
      window.history.replaceState(null, "", newHash);
    },
    [query, urlSearch.filter]
  );

  // Define table columns for AutocompleteResult
  const tableColumns = useMemo<ColumnDef<AutocompleteResult>[]>(() => [
    {
      id: "display_name",
      accessorKey: "display_name",
      header: "Name",
      cell: (info) => {
        const result = info.row.original;
        const id = typeof result.id === 'string' ? result.id : String(result.id);
        const cleanId = id.replace("https://openalex.org/", "");
        const routeMap: Record<string, string> = {
          work: "works",
          author: "authors",
          institution: "institutions",
          source: "sources",
          concept: "concepts",
          topic: "topics",
          funder: "funders",
          publisher: "publishers",
        };
        const routePath = routeMap[result.entity_type] || result.entity_type;
        return (
          <Anchor href={`#/${routePath}/${cleanId}`} fw={500}>
            {decodeHtmlEntities(info.getValue() as string)}
          </Anchor>
        );
      },
    },
    {
      id: "entity_type",
      accessorKey: "entity_type",
      header: "Type",
      cell: (info) => {
        const entityType = info.getValue() as string;
        return (
          <Badge size="sm" variant="light" color={getEntityColor(entityType)}>
            {entityType}
          </Badge>
        );
      },
    },
    {
      id: "hint",
      accessorKey: "hint",
      header: "Description",
      cell: (info) => {
        const hint = info.getValue() as string | undefined;
        return hint ? (
          <Text size="sm" c="dimmed" lineClamp={TEXT.DEFAULT_LINE_CLAMP}>
            {hint}
          </Text>
        ) : null;
      },
    },
    {
      id: "works_count",
      accessorKey: "works_count",
      header: "Works",
      cell: (info) => {
        const count = info.getValue() as number | undefined;
        return count !== undefined && count !== null
          ? count.toLocaleString()
          : "-";
      },
    },
    {
      id: "cited_by_count",
      accessorKey: "cited_by_count",
      header: "Citations",
      cell: (info) => {
        const count = info.getValue() as number | undefined;
        return count !== undefined && count !== null
          ? count.toLocaleString()
          : "-";
      },
    },
  ], [getEntityColor]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentHash = window.location.hash;
      const decodedHash = decodeURIComponent(currentHash);
      if (currentHash !== decodedHash) {
        window.history.replaceState(null, "", decodedHash);
      }
    }
  }, []);

  // Check if all types are selected (for determining search behavior)
  const allTypesSelected =
    selectedTypes.length === AUTOCOMPLETE_ENTITY_TYPES.length &&
    AUTOCOMPLETE_ENTITY_TYPES.every((t) => selectedTypes.includes(t));

  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["autocomplete", "general", query, selectedTypes, allTypesSelected],
    queryFn: async () => {
      if (!query.trim()) return [];

      // If no types selected, return empty (user cleared all filters)
      if (selectedTypes.length === 0) {
        logger.debug("autocomplete", "No entity types selected, skipping search");
        return [];
      }

      // If all types selected, use general autocomplete (more efficient)
      if (allTypesSelected) {
        logger.debug(
          "autocomplete",
          "Fetching general autocomplete suggestions (all types)",
          { query },
        );

        const response =
          await cachedOpenAlex.client.autocomplete.autocompleteGeneral(query);

        logger.debug("autocomplete", "General suggestions received", {
          count: response.length,
        });

        return response;
      }

      // Otherwise, search specific types
      logger.debug(
        "autocomplete",
        "Fetching filtered autocomplete suggestions",
        { query, types: selectedTypes },
      );

      const response =
        await cachedOpenAlex.client.autocomplete.search(query, selectedTypes);

      logger.debug("autocomplete", "Filtered suggestions received", {
        count: response.length,
        types: selectedTypes,
      });

      return response;
    },
    enabled: query.trim().length > 0 && selectedTypes.length > 0,
    staleTime: TIME_MS.MINUTES_30,
  });

  const handleSearch = useCallback((value: string) => {
    // Build URL params, avoiding URLSearchParams encoding for types
    const paramParts: string[] = [];
    if (value) {
      paramParts.push(`q=${encodeURIComponent(value)}`);
    }

    // Determine types param: omit if all selected, "none" if cleared, otherwise list
    const allSelected = selectedTypes.length === AUTOCOMPLETE_ENTITY_TYPES.length &&
      AUTOCOMPLETE_ENTITY_TYPES.every(t => selectedTypes.includes(t));

    if (selectedTypes.length === 0) {
      paramParts.push("types=none");
    } else if (!allSelected) {
      paramParts.push(`types=${selectedTypes.join(",")}`);
    }

    if (urlSearch.filter) {
      paramParts.push(`filter=${encodeURIComponent(urlSearch.filter)}`);
    }

    const newHash = paramParts.length > 0
      ? `#/autocomplete?${paramParts.join("&")}`
      : "#/autocomplete";
    window.history.replaceState(null, "", newHash);
  }, [selectedTypes, urlSearch.filter]);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Autocomplete Search</Title>
          <Text c="dimmed" size="sm" mt="xs">
            {selectedTypes.length === 0
              ? "Select at least one entity type to search"
              : (allTypesSelected
                ? "Search across all entity types with real-time suggestions from the OpenAlex database"
                : `Searching ${selectedTypes.map((t) => ENTITY_METADATA[t].plural).join(", ")}`)}
          </Text>
        </div>

        <TextInput
          placeholder="Search for anything in OpenAlex..."
          value={query}
          onChange={(event) => handleSearch(event.currentTarget.value)}
          leftSection={<IconSearch size={ICON_SIZE.MD} />}
          size="md"
        />

        <EntityTypeFilter
          selectedTypes={selectedTypes}
          onChange={handleEntityTypeChange}
          title="Filter by Entity Type"
          inline
        />

        {urlSearch.filter && (
          <Alert icon={<IconInfoCircle />} title="Active Filters" color="blue">
            <Text size="sm">Filter: {urlSearch.filter}</Text>
          </Alert>
        )}

        {selectedTypes.length === 0 && (
          <Alert
            icon={<IconInfoCircle />}
            title="No entity types selected"
            color="yellow"
            variant="light"
          >
            <Text size="sm">
              Select at least one entity type above to search.
            </Text>
          </Alert>
        )}

        {selectedTypes.length > 0 && !query.trim() && (
          <Card style={{ border: BORDER_STYLE_GRAY_3 }}>
            <Stack align="center" py="xl">
              <Text size="lg" fw={500}>
                Enter a search term to see suggestions
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Start typing to get real-time autocomplete suggestions from
                {allTypesSelected ? " all OpenAlex entities" : ` ${selectedTypes.length} selected entity types`}
              </Text>
            </Stack>
          </Card>
        )}

        {isLoading && query.trim() && (
          <ContentSkeleton variant="list" />
        )}

        {error && (
          <Alert
            icon={<IconInfoCircle />}
            title="API Error"
            color="red"
            variant="light"
          >
            <Stack gap="xs">
              <Text size="sm">
                {(() => {
                  if (error instanceof Error) {
                    const match = error.message.match(
                      /autocomplete failed: (.+)/,
                    );
                    if (match) {
                      return match[1];
                    }
                    return error.message;
                  }
                  return String(error);
                })()}
              </Text>
            </Stack>
          </Alert>
        )}

        {!isLoading && results.length === 0 && query.trim() && selectedTypes.length > 0 && (
          <Alert
            icon={<IconInfoCircle />}
            title="No results"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              No results found matching &quot;{query}&quot;
              {!allTypesSelected && ` in ${selectedTypes.map((t) => ENTITY_METADATA[t].plural).join(", ")}`}.
              Try different search terms{!allTypesSelected && " or select more entity types"}.
            </Text>
          </Alert>
        )}

        {results.length > 0 && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Found {results.length} suggestion{results.length === 1 ? "" : "s"}
              </Text>
              <TableViewModeToggle value={viewMode} onChange={setViewMode} />
            </Group>

            {viewMode === "table" && (
              <BaseTable
                data={results}
                columns={tableColumns}
                searchable={false}
                pageSize={API.DEFAULT_PAGE_SIZE}
              />
            )}

            {viewMode === "list" && (
              <EntityListView
                items={results.map(transformAutocompleteResultToGridItem)}
                onNavigate={handleNavigate}
              />
            )}

            {viewMode === "grid" && (
              <EntityGrid
                items={results.map(transformAutocompleteResultToGridItem)}
                onNavigate={handleNavigate}
              />
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
};
export const Route = createLazyFileRoute("/autocomplete/")({
  component: AutocompleteGeneralRoute,
});

export default AutocompleteGeneralRoute;
