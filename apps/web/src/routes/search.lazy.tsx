import { cachedOpenAlex } from "@bibgraph/client";
import type { AutocompleteResult } from "@bibgraph/types";
import { ENTITY_METADATA, toEntityType } from "@bibgraph/types";
import { convertToRelativeUrl, ErrorRecovery,SearchEmptyState } from "@bibgraph/ui";
import { formatLargeNumber, logger } from "@bibgraph/utils";
import {
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBookmark,
  IconBookmarkOff,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createLazyFileRoute,useSearch  } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE, SEARCH, TIME_MS } from '@/config/style-constants';
import { useUserInteractions } from "@/hooks/use-user-interactions";

import { SearchInterface } from "../components/search/SearchInterface";
import { SearchResultPreview, useSearchResultHover } from "../components/search/SearchResultPreview";
import { SearchResultsSkeleton } from "../components/search/SearchResultsSkeleton";
import { BaseTable } from "../components/tables/BaseTable";
import { pageDescription, pageTitle } from "../styles/layout.css";

interface SearchFilters {
  query: string;
}

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

// Get entity type color for badges using centralized metadata
const getEntityTypeColor = (entityType: AutocompleteResult["entity_type"]) => {
  const pluralForm = toEntityType(entityType);
  if (pluralForm) {
    return ENTITY_METADATA[pluralForm].color;
  }
  return "gray";
};

/**
 * Name cell component - extracted to use hooks properly
 * React hooks must be called at the top level of a component, not in render functions
 */
const SearchResultNameCell = ({ result }: { result: AutocompleteResult }) => {
  const entityUrl = convertToRelativeUrl(result.id);
  const hover = useSearchResultHover(result);

  return (
    <>
      <div {...hover.props}>
        {entityUrl ? (
          <Anchor
            href={entityUrl}
            size="sm"
            fw={500}
            style={{ textDecoration: "none" }}
            aria-label={`View ${result.entity_type} ${result.display_name}`}
          >
            {result.display_name}
          </Anchor>
        ) : (
          <Text fw={500} size="sm">
            {result.display_name}
          </Text>
        )}
        {result.hint && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {result.hint}
          </Text>
        )}
        {result.external_id && (
          <Text size="xs" c="dimmed">
            {result.external_id}
          </Text>
        )}
      </div>

      {/* Hover preview card */}
      <SearchResultPreview
        entity={result}
        opened={hover.opened}
        onToggle={hover.toggle}
        targetElement={hover.targetElement}
      />
    </>
  );
};

// Extract column definitions to reduce complexity
const createSearchColumns = (): ColumnDef<AutocompleteResult>[] => [
  {
    accessorKey: "entity_type",
    header: "Type",
    size: 100,
    cell: ({ row }) => {
      const result = row.original;
      return (
        <Badge
          size="sm"
          color={getEntityTypeColor(result.entity_type)}
          variant="light"
        >
          {result.entity_type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "display_name",
    header: "Name",
    cell: ({ row }) => <SearchResultNameCell result={row.original} />,
  },
  {
    accessorKey: "cited_by_count",
    header: "Citations",
    size: 120,
    cell: ({ row }) => {
      const count = row.original.cited_by_count;
      return count ? (
        <Text size="sm" fw={500}>
          {formatLargeNumber(count)}
        </Text>
      ) : (
        <Text size="sm" c="dimmed">
          —
        </Text>
      );
    },
  },
  {
    accessorKey: "works_count",
    header: "Works",
    size: 100,
    cell: ({ row }) => {
      const count = row.original.works_count;
      return count ? (
        <Text size="sm">{formatLargeNumber(count)}</Text>
      ) : (
        <Text size="sm" c="dimmed">
          —
        </Text>
      );
    },
  },
];

const SearchPage = () => {
  const searchParams = useSearch({ from: "/search" });
  const queryClient = useQueryClient();

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

  const columns = createSearchColumns();

  const handleSearch = async (filters: SearchFilters) => {
    setSearchFilters(filters);
    // Auto-tracking in useUserInteractions will handle page visit recording
  };

  const handleQuickSearch = async (query: string) => {
    setSearchFilters({ query });
    setRetryCount(0); // Reset retry count on new search
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
  }, [searchResults, retryCount]);

  const hasResults = searchResults && searchResults.length > 0;
  const hasQuery = Boolean(searchFilters.query.trim());

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
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            Found {searchResults.length} results for &quot;
            {searchFilters.query}&quot;
          </Text>

          {hasQuery && (
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
          )}
        </Group>

        <BaseTable
          data={searchResults}
          columns={columns}
          searchable={false} // Search is handled by the SearchInterface
          onRowClick={(result) => {
            logger.debug(
              "ui",
              "Search result clicked",
              {
                id: result.id,
                name: result.display_name,
                type: result.entity_type,
              },
              "SearchPage",
            );
            // Navigation is handled by the entity links in the table
          }}
        />
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
