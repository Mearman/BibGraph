import { cachedOpenAlex } from "@bibgraph/client";
import type { AutocompleteResult } from "@bibgraph/types";
import { ENTITY_METADATA, toEntityType } from "@bibgraph/types";
import { convertToRelativeUrl, ErrorRecovery, SearchEmptyState } from "@bibgraph/ui";
import { formatLargeNumber, logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Paper,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBookmark,
  IconBookmarkOff,
  IconGraph,
  IconLayoutGrid,
  IconList,
  IconTable,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createLazyFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE, SEARCH, TIME_MS } from '@/config/style-constants';
import { useGraphList } from "@/hooks/useGraphList";
import { useUserInteractions } from "@/hooks/use-user-interactions";

import { SearchInterface } from "../components/search/SearchInterface";
import { SearchResultsSkeleton } from "../components/search/SearchResultsSkeleton";
import { pageDescription, pageTitle } from "../styles/layout.css";

interface SearchFilters {
  query: string;
}

type ViewMode = "table" | "card" | "list";

type SortOption = "relevance" | "citations" | "works" | "name" | "type";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "citations", label: "Most Cited" },
  { value: "works", label: "Most Works" },
  { value: "name", label: "Name (A-Z)" },
  { value: "type", label: "Entity Type" },
];

// Calculate entity type breakdown from results
const getEntityTypeBreakdown = (results: AutocompleteResult[]) => {
  const breakdown = results.reduce((acc, result) => {
    acc[result.entity_type] = (acc[result.entity_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(breakdown)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
};

// Real OpenAlex API autocomplete function - searches across all entity types
const searchAllEntities = async (
  filters: SearchFilters,
): Promise<AutocompleteResult[]> => {
  if (!filters.query.trim()) return [];

  try {
    logger.debug("search", "Searching all entities with autocomplete", {
      filters,
    });

    // Use the general autocomplete endpoint that searches across all entity types
    const results = await cachedOpenAlex.client.autocomplete.autocompleteGeneral(
      filters.query,
    );

    logger.debug("search", "Autocomplete search completed", {
      resultsCount: results.length,
      query: filters.query,
    });

    return results;
  } catch (error) {
    logger.error("search", "Autocomplete search failed", { error, filters });
    throw error;
  }
};

// Helper functions to reduce cognitive complexity
const renderSearchHeader = () => (
  <div>
    <Title order={1} className={pageTitle}>
      Universal Search
    </Title>
    <Text className={pageDescription}>
      Search across all OpenAlex entities - works, authors, sources,
      institutions, and topics. Results are sorted by relevance and cached for
      improved performance.
    </Text>
  </div>
);

const renderEmptyState = (onQuickSearch?: (query: string) => void) => (
  <SearchEmptyState
    variant="initial"
    onQuickSearch={onQuickSearch}
  />
);

const renderLoadingState = () => (
  <SearchResultsSkeleton
    viewType="table"
    items={8}
    title="Searching OpenAlex database..."
  />
);

const renderErrorState = (
  error: unknown,
  onRetry: () => void,
  onRetryWithExponentialBackoff: () => void,
  retryCount: number,
  maxRetries: number,
  isRetrying: boolean
) => (
  <ErrorRecovery
    error={error}
    onRetry={onRetry}
    onRetryWithExponentialBackoff={onRetryWithExponentialBackoff}
    retryCount={retryCount}
    maxRetries={maxRetries}
    isRetrying={isRetrying}
    context={{
      operation: "Search Academic Database",
      entity: "OpenAlex Search"
    }}
  />
);

const renderNoResultsState = (query: string, onQuickSearch?: (query: string) => void) => (
  <SearchEmptyState
    variant="no-results"
    query={query}
    onQuickSearch={onQuickSearch}
  />
);

// EntityTypeFilterBadge component to reduce nesting depth in search results
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
    leftSection={isSelected ? "✓ " : undefined}
    style={{ cursor: 'pointer', userSelect: 'none' }}
    onClick={() => onToggle(type)}
  >
    {type} ({count})
  </Badge>
);

// Get entity type color for badges using centralized metadata
const getEntityTypeColor = (entityType: AutocompleteResult["entity_type"]) => {
  const pluralForm = toEntityType(entityType);
  if (pluralForm) {
    return ENTITY_METADATA[pluralForm].color;
  }
  return "gray";
};

const SearchPage = () => {
  const searchParams = useSearch({ from: "/search" });
  const queryClient = useQueryClient();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  // Entity type filter state
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Search duration tracking
  const [searchStartTime, setSearchStartTime] = useState<number>(0);
  const [searchDuration, setSearchDuration] = useState<number>(0);

  // Derive initial search filters from URL parameters using useMemo
  const initialSearchFilters = useMemo<SearchFilters>(() => {
    const qParam = searchParams.q;
    return {
      query: qParam && typeof qParam === "string" ? qParam : "",
    };
  }, [searchParams.q]);

  const [searchFilters, setSearchFilters] = useState<SearchFilters>(
    initialSearchFilters,
  );
  const [loading, setLoading] = useState(false);

  // Retry state management
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 3;

  // Update searchFilters when URL parameters change
  useEffect(() => {
    setSearchFilters(initialSearchFilters);

    // Store search query in session storage for "back to search" functionality
    try {
      const query = initialSearchFilters.query;
      if (query && query.trim()) {
        sessionStorage.setItem('lastSearchQuery', query.trim());
      }
    } catch {
      // Session storage might not be available in all contexts
    }
  }, [initialSearchFilters]);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => {
    return searchFilters.query
      ? {}
      : undefined;
  }, [searchFilters.query]);

  // Track page visits and bookmarks - only when we have a query to avoid re-render loops
  const userInteractions = useUserInteractions({
    searchQuery: searchFilters.query || undefined,
    filters: memoizedFilters,
    autoTrackVisits: Boolean(searchFilters.query),
  });

  // Graph list hook for adding entities to graph
  const graphList = useGraphList();

  // Helper function to check if entity is in graph
  const isInGraph = useCallback((entityId: string): boolean => {
    return graphList.nodes.some(node => node.entityId === entityId);
  }, [graphList.nodes]);

  // Handle add/remove from graph
  const handleToggleGraph = useCallback(async (result: AutocompleteResult, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const entityType = toEntityType(result.entity_type);
    if (!entityType) return;

    try {
      if (isInGraph(result.id)) {
        await graphList.removeNode(result.id);
        notifications.show({
          title: "Removed from Graph",
          message: `${result.display_name} removed from graph`,
          color: "gray",
          autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
        });
      } else {
        await graphList.addNode({
          entityId: result.id,
          entityType,
          label: result.display_name,
          provenance: "user",
        });
        notifications.show({
          title: "Added to Graph",
          message: `${result.display_name} added to graph for analysis`,
          color: "green",
          autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
        });
      }
    } catch (error) {
      logger.error("ui", "Failed to toggle graph list", { error, entityId: result.id });
      notifications.show({
        title: "Error",
        message: isInGraph(result.id) ? "Failed to remove from graph" : "Failed to add to graph",
        color: "red",
      });
    }
  }, [graphList, isInGraph]);

  const {
    data: searchResults,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["search-autocomplete", searchFilters],
    queryFn: () => searchAllEntities(searchFilters),
    enabled: Boolean(searchFilters.query.trim()),
    retry: SEARCH.MAX_RETRY_ATTEMPTS,
    staleTime: TIME_MS.SEARCH_STALE_TIME,
  });

  const handleSearch = async (filters: SearchFilters) => {
    setSearchStartTime(Date.now());
    setSearchFilters(filters);

    // Store search query in session storage for "back to search" functionality
    try {
      if (filters.query.trim()) {
        sessionStorage.setItem('lastSearchQuery', filters.query.trim());
      }
    } catch {
      // Session storage might not be available in all contexts
    }

    // Auto-tracking in useUserInteractions will handle page visit recording
  };

  const handleQuickSearch = async (query: string) => {
    setSearchFilters({ query });
    setRetryCount(0); // Reset retry count on new search

    // Store search query in session storage for "back to search" functionality
    try {
      if (query.trim()) {
        sessionStorage.setItem('lastSearchQuery', query.trim());
      }
    } catch {
      // Session storage might not be available in all contexts
    }

    // Auto-tracking in useUserInteractions will handle page visit recording
  };

  // Retry handlers
  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Trigger a new search by invalidating the query cache
      await queryClient.refetchQueries({
        queryKey: ["search-autocomplete", searchFilters],
      });
    } catch (error) {
      logger.error("search", "Manual retry failed", { error, retryCount: retryCount + 1 });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryWithExponentialBackoff = async () => {
    if (retryCount >= maxRetries) return;

    const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000); // Max 30s

    logger.info("search", "Starting exponential backoff retry", {
      retryCount: retryCount + 1,
      delay: delay / 1000
    });

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    // Wait for the delay before retrying
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await queryClient.refetchQueries({
        queryKey: ["search-autocomplete", searchFilters],
      });
    } catch (error) {
      logger.error("search", "Exponential backoff retry failed", {
        error,
        retryCount: retryCount + 1,
        delay: delay / 1000
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Reset retry count when search succeeds
  useEffect(() => {
    if (searchResults && searchResults.length > 0 && retryCount > 0) {
      setRetryCount(0);
    }
    if (searchResults && searchStartTime > 0) {
      setSearchDuration(Date.now() - searchStartTime);
    }
  }, [searchResults, retryCount, searchStartTime]);

  const hasResults = searchResults && searchResults.length > 0;
  const hasQuery = Boolean(searchFilters.query.trim());

  // Filter results by selected entity types
  const filteredResults = useMemo(() => {
    if (!searchResults) return [];
    if (selectedTypes.length === 0) return searchResults;
    return searchResults.filter(result => selectedTypes.includes(result.entity_type));
  }, [searchResults, selectedTypes]);

  // Sort and filter results by selected sort option
  const sortedResults = useMemo(() => {
    let results = filteredResults;

    switch (sortBy) {
      case "citations":
        return [...results].sort((a, b) => (b.cited_by_count || 0) - (a.cited_by_count || 0));
      case "works":
        return [...results].sort((a, b) => (b.works_count || 0) - (a.works_count || 0));
      case "name":
        return [...results].sort((a, b) => a.display_name.localeCompare(b.display_name));
      case "type":
        return [...results].sort((a, b) => a.entity_type.localeCompare(b.entity_type));
      case "relevance":
      default:
        return results; // Keep original order from API (relevance-sorted)
    }
  }, [filteredResults, sortBy]);

  // Calculate entity type breakdown
  const entityTypeBreakdown = useMemo(() => {
    return searchResults ? getEntityTypeBreakdown(searchResults) : [];
  }, [searchResults]);

  // Handle entity type filter toggle (extracted to reduce nesting depth)
  const handleTypeFilterToggle = useCallback((type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const renderSearchResults = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderErrorState(
      error,
      handleRetry,
      handleRetryWithExponentialBackoff,
      retryCount,
      maxRetries,
      isRetrying
    );
    if (!hasResults) return renderNoResultsState(searchFilters.query, handleQuickSearch);

    return (
      <Stack>
        {/* Enhanced Results Header */}
        <Stack gap="md">
          {/* Primary stats row */}
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="md" align="center">
              <Text size="sm" fw={500}>
                {sortedResults.length} {sortedResults.length === 1 ? 'result' : 'results'}
                {selectedTypes.length > 0 && ` (filtered from ${searchResults.length})`}
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
                onChange={(value) => setSortBy(value as SortOption)}
                data={SORT_OPTIONS}
                style={{ width: 140 }}
                allowDeselect={false}
              />
              <SegmentedControl
                value={viewMode}
                onChange={(value) => setViewMode(value as ViewMode)}
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
            </Group>
          </Group>

          {/* Entity type breakdown and filter chips */}
          {entityTypeBreakdown.length > 0 && (
            <Stack gap="xs">
              <Group gap="xs" wrap="wrap">
                <Text size="xs" c="dimmed">Filter by type:</Text>
                {entityTypeBreakdown.map(({ type, count }) => {
                  const isSelected = selectedTypes.includes(type);
                  // Get color safely using toEntityType helper, defaulting to gray for unknown types
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
                      onToggle={handleTypeFilterToggle}
                    />
                  );
                })}
                {selectedTypes.length > 0 && (
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => setSelectedTypes([])}
                  >
                    Clear filters
                  </Button>
                )}
              </Group>
            </Stack>
          )}
        </Stack>

        {/* Bookmark button */}
        {hasQuery && (
          <Group justify="end">
            <Button
              variant="light"
              color={userInteractions.isBookmarked ? "yellow" : "gray"}
              size="sm"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  if (userInteractions.isBookmarked) {
                    await userInteractions.unbookmarkSearch();
                    notifications.show({
                      title: "Bookmark Removed",
                      message: `Search "${searchFilters.query}" has been removed from your bookmarks`,
                      color: "green",
                      autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
                    });
                  } else {
                    const title = searchFilters.query;
                    await userInteractions.bookmarkSearch({
                      title,
                      searchQuery: searchFilters.query,
                    });
                    notifications.show({
                      title: "Search Bookmarked",
                      message: `Search "${searchFilters.query}" has been added to your bookmarks`,
                      color: "blue",
                      autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
                    });
                  }
                } catch (error) {
                  logger.error("ui", "Bookmark operation failed", {
                    error,
                    searchQuery: searchFilters.query,
                    isBookmarked: userInteractions.isBookmarked
                  }, "SearchPage");

                  notifications.show({
                    title: "Bookmark Failed",
                    message: "Could not update bookmark. Please try again.",
                    color: "red",
                    autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
                  });
                } finally {
                  setLoading(false);
                }
              }}
              leftSection={
                userInteractions.isBookmarked ? (
                  <IconBookmark size={ICON_SIZE.MD} fill="currentColor" />
                ) : (
                  <IconBookmarkOff size={ICON_SIZE.MD} />
                )
              }
              title={
                userInteractions.isBookmarked
                  ? "Remove search bookmark"
                  : "Bookmark this search"
              }
            >
              {userInteractions.isBookmarked ? "Bookmarked" : "Bookmark Search"}
            </Button>
          </Group>
        )}

        {/* Results display based on view mode */}
        {viewMode === "table" && (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={100}>Type</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th w={100}>Citations</Table.Th>
                <Table.Th w={100}>Works</Table.Th>
                <Table.Th w={50}>Graph</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedResults.map((result) => {
              const entityUrl = convertToRelativeUrl(result.id);
              const inGraph = isInGraph(result.id);
              return (
                <Table.Tr key={result.id}>
                  <Table.Td>
                    <Badge size="sm" color={getEntityTypeColor(result.entity_type)} variant="light">
                      {result.entity_type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      {entityUrl ? (
                        <Anchor
                          href={entityUrl}
                          size="sm"
                          fw={500}
                          style={{ textDecoration: "none" }}
                        >
                          {result.display_name}
                        </Anchor>
                      ) : (
                        <Text size="sm" fw={500}>{result.display_name}</Text>
                      )}
                      {result.hint && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {result.hint}
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {result.cited_by_count ? formatLargeNumber(result.cited_by_count) : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {result.works_count ? formatLargeNumber(result.works_count) : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={inGraph ? "Remove from graph" : "Add to graph"} position="bottom">
                      <ActionIcon
                        size="sm"
                        variant={inGraph ? "filled" : "light"}
                        color="grape"
                        onClick={(e) => void handleToggleGraph(result, e)}
                        loading={graphList.loading}
                        aria-label={inGraph ? "Remove from graph" : "Add to graph"}
                      >
                        <IconGraph size={ICON_SIZE.XS} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        )}

        {viewMode === "card" && (
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }} spacing="md">
            {sortedResults.map((result) => {
              const entityUrl = convertToRelativeUrl(result.id);
              const inGraph = isInGraph(result.id);
              return (
                <Card
                  key={result.id}
                  shadow="sm"
                  p="md"
                  withBorder
                  style={{ cursor: 'pointer', position: 'relative' }}
                  component={entityUrl ? "a" : "div"}
                  href={entityUrl}
                >
                  <Stack gap="xs">
                    <Group justify="space-between" align="start">
                      <Badge size="sm" color={getEntityTypeColor(result.entity_type)} variant="light">
                        {result.entity_type}
                      </Badge>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">
                          {result.cited_by_count ? `${formatLargeNumber(result.cited_by_count)} citations` : '—'}
                        </Text>
                        <Tooltip label={inGraph ? "Remove from graph" : "Add to graph"} position="bottom">
                          <ActionIcon
                            size="sm"
                            variant={inGraph ? "filled" : "light"}
                            color="grape"
                            onClick={(e) => void handleToggleGraph(result, e)}
                            loading={graphList.loading}
                            aria-label={inGraph ? "Remove from graph" : "Add to graph"}
                          >
                            <IconGraph size={ICON_SIZE.XS} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                    <Text size="sm" fw={500} lineClamp={2}>
                      {result.display_name}
                    </Text>
                    {result.hint && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {result.hint}
                      </Text>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        )}

        {viewMode === "list" && (
          <Stack gap="xs">
            {sortedResults.map((result) => {
              const entityUrl = convertToRelativeUrl(result.id);
              const inGraph = isInGraph(result.id);
              return (
                <Paper
                  key={result.id}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{ cursor: 'pointer' }}
                  component={entityUrl ? "a" : "div"}
                  href={entityUrl}
                >
                  <Group justify="space-between" align="center">
                    <Group gap="sm" align="start" style={{ flex: 1 }}>
                      <Badge size="xs" color={getEntityTypeColor(result.entity_type)} variant="light">
                        {result.entity_type}
                      </Badge>
                      <Stack gap={0} style={{ flex: 1 }}>
                        <Text size="sm" fw={500}>
                          {result.display_name}
                        </Text>
                        {result.hint && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {result.hint}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                    <Group gap="md">
                      {result.cited_by_count && (
                        <Text size="xs" c="dimmed" ta="right">
                          {formatLargeNumber(result.cited_by_count)} citations
                        </Text>
                      )}
                      {result.works_count && (
                        <Text size="xs" c="dimmed" ta="right">
                          {formatLargeNumber(result.works_count)} works
                        </Text>
                      )}
                      <Tooltip label={inGraph ? "Remove from graph" : "Add to graph"} position="bottom">
                        <ActionIcon
                          size="sm"
                          variant={inGraph ? "filled" : "light"}
                          color="grape"
                          onClick={(e) => void handleToggleGraph(result, e)}
                          loading={graphList.loading}
                          aria-label={inGraph ? "Remove from graph" : "Add to graph"}
                        >
                          <IconGraph size={ICON_SIZE.XS} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <Container size="xl">
      <Stack gap="xl">
        {renderSearchHeader()}

        <SearchInterface
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Search for works, authors, institutions, topics... e.g. 'machine learning', 'Marie Curie', 'MIT'"
        />

        {hasQuery && <Card style={{ border: BORDER_STYLE_GRAY_3 }}>{renderSearchResults()}</Card>}

        {!hasQuery && renderEmptyState(handleQuickSearch)}
      </Stack>
    </Container>
  );
};

export const Route = createLazyFileRoute("/search")({
  component: SearchPage,
});

export default SearchPage;
