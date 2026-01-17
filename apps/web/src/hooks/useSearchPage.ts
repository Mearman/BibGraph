/**
 * Custom hook for search page logic
 */
import type { AutocompleteResult } from "@bibgraph/types";
import { toEntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { notifications } from "@mantine/notifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SearchFilters, SortOption, ViewMode } from "@/components/search/search-page-types";
import { searchAllEntities, storeSearchQuery } from "@/components/search/search-utils";
import { SEARCH, TIME_MS } from "@/config/style-constants";
import { useActivity } from "@/contexts/ActivityContext";
import { useGraphList } from "@/hooks/useGraphList";
import { useUserInteractions } from "@/hooks/user-interactions";

const MAX_RETRIES = 3;

export interface UseSearchPageReturn {
  // Search state
  searchFilters: SearchFilters;
  searchResults: AutocompleteResult[] | undefined;
  sortedResults: AutocompleteResult[];
  filteredResults: AutocompleteResult[];
  isLoading: boolean;
  error: unknown;
  hasResults: boolean;
  hasQuery: boolean;

  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  selectedTypes: string[];
  setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>;
  refinementQuery: string;
  setRefinementQuery: (query: string) => void;

  // Search timing
  searchDuration: number;

  // Retry state
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;

  // Advanced query state
  showAdvancedQuery: boolean;
  setShowAdvancedQuery: (show: boolean) => void;

  // Bookmark state
  loading: boolean;
  setLoading: (loading: boolean) => void;
  userInteractions: ReturnType<typeof useUserInteractions>;

  // Graph state
  graphList: ReturnType<typeof useGraphList>;
  isInGraph: (entityId: string) => boolean;

  // Actions
  handleSearch: (filters: SearchFilters) => void;
  handleQuickSearch: (query: string) => void;
  handleRetry: () => Promise<void>;
  handleRetryWithExponentialBackoff: () => Promise<void>;
  handleTypeFilterToggle: (type: string) => void;
  handleToggleGraph: (result: AutocompleteResult, e?: React.MouseEvent) => Promise<void>;
}

export const useSearchPage = (): UseSearchPageReturn => {
  const searchParams = useSearch({ from: "/search" });
  const queryClient = useQueryClient();
  const { addActivity } = useActivity();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [refinementQuery, setRefinementQuery] = useState<string>("");

  // Search duration tracking
  const [searchStartTime, setSearchStartTime] = useState<number>(0);
  const [searchDuration, setSearchDuration] = useState<number>(0);

  // Derive initial search filters from URL parameters
  const initialSearchFilters = useMemo<SearchFilters>(() => {
    const qParam = searchParams.q;
    return {
      query: qParam && typeof qParam === "string" ? qParam : "",
    };
  }, [searchParams.q]);

  const [searchFilters, setSearchFilters] = useState<SearchFilters>(initialSearchFilters);
  const [loading, setLoading] = useState(false);

  // Retry state management
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Advanced query builder state
  const [showAdvancedQuery, setShowAdvancedQuery] = useState(false);

  // Update searchFilters when URL parameters change
  useEffect(() => {
    setSearchFilters(initialSearchFilters);
    storeSearchQuery(initialSearchFilters.query);
  }, [initialSearchFilters]);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => {
    return searchFilters.query ? {} : undefined;
  }, [searchFilters.query]);

  // Track page visits and bookmarks
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

  const handleSearch = useCallback((filters: SearchFilters) => {
    setSearchStartTime(Date.now());
    setSearchFilters(filters);
    storeSearchQuery(filters.query);
  }, []);

  const handleQuickSearch = useCallback((query: string) => {
    setSearchFilters({ query });
    setRetryCount(0);
    storeSearchQuery(query);
  }, []);

  // Retry handlers
  const handleRetry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await queryClient.refetchQueries({
        queryKey: ["search-autocomplete", searchFilters],
      });
    } catch (error) {
      logger.error("search", "Manual retry failed", { error, retryCount: retryCount + 1 });
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, queryClient, searchFilters]);

  const handleRetryWithExponentialBackoff = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) return;

    const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);

    logger.info("search", "Starting exponential backoff retry", {
      retryCount: retryCount + 1,
      delay: delay / 1000
    });

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

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
  }, [retryCount, queryClient, searchFilters]);

  // Reset retry count when search succeeds
  useEffect(() => {
    if (searchResults && searchResults.length > 0 && retryCount > 0) {
      setRetryCount(0);
    }
    if (searchResults && searchStartTime > 0) {
      setSearchDuration(Date.now() - searchStartTime);

      addActivity({
        category: 'search',
        description: `Searched for "${searchFilters.query}"`,
        query: searchFilters.query,
        resultCount: searchResults.length,
      });
    }
  }, [searchResults, retryCount, searchStartTime, searchFilters.query, addActivity]);

  const hasResults = Boolean(searchResults && searchResults.length > 0);
  const hasQuery = Boolean(searchFilters.query.trim());

  // Filter results by selected entity types and refinement query
  const filteredResults = useMemo(() => {
    if (!searchResults) return [];

    let results = searchResults;

    if (selectedTypes.length > 0) {
      results = results.filter(result => selectedTypes.includes(result.entity_type));
    }

    if (refinementQuery.trim()) {
      const query = refinementQuery.toLowerCase();
      results = results.filter(result =>
        result.display_name.toLowerCase().includes(query) ||
        (result.id && result.id.toLowerCase().includes(query))
      );
    }

    return results;
  }, [searchResults, selectedTypes, refinementQuery]);

  // Sort results
  const sortedResults = useMemo(() => {
    const results = filteredResults;

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
        return results;
    }
  }, [filteredResults, sortBy]);

  // Handle entity type filter toggle
  const handleTypeFilterToggle = useCallback((type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  return {
    // Search state
    searchFilters,
    searchResults,
    sortedResults,
    filteredResults,
    isLoading,
    error,
    hasResults,
    hasQuery,

    // View state
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    selectedTypes,
    setSelectedTypes,
    refinementQuery,
    setRefinementQuery,

    // Search timing
    searchDuration,

    // Retry state
    retryCount,
    maxRetries: MAX_RETRIES,
    isRetrying,

    // Advanced query state
    showAdvancedQuery,
    setShowAdvancedQuery,

    // Bookmark state
    loading,
    setLoading,
    userInteractions,

    // Graph state
    graphList,
    isInGraph,

    // Actions
    handleSearch,
    handleQuickSearch,
    handleRetry,
    handleRetryWithExponentialBackoff,
    handleTypeFilterToggle,
    handleToggleGraph,
  };
};
