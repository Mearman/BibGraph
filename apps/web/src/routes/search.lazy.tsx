import {
  Button,
  Card,
  Container,
  Group,
  Stack,
} from "@mantine/core";
import { IconToggleLeft } from "@tabler/icons-react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";
import { useSearchPage } from "@/hooks/useSearchPage";

import { AdvancedQueryBuilder, type QueryStructure } from "../components/search/AdvancedQueryBuilder";
import { SearchBookmarkButton } from "../components/search/SearchBookmarkButton";
import { SearchInterface } from "../components/search/SearchInterface";
import { SearchPageHeader } from "../components/search/SearchPageHeader";
import { SearchRefinement } from "../components/search/SearchRefinement";
import { SearchResultsHeader } from "../components/search/SearchResultsHeader";
import {
  SearchResultsCardView,
  SearchResultsListView,
  SearchResultsTableView,
} from "../components/search/SearchResultsViews";
import {
  SearchEmptyStateRenderer,
  SearchErrorStateRenderer,
  SearchLoadingStateRenderer,
  SearchNoResultsStateRenderer,
} from "../components/search/SearchStateRenderers";

const SearchPage = () => {
  const {
    searchFilters,
    searchResults,
    sortedResults,
    isLoading,
    error,
    hasResults,
    hasQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    selectedTypes,
    setSelectedTypes,
    refinementQuery,
    setRefinementQuery,
    searchDuration,
    retryCount,
    maxRetries,
    isRetrying,
    showAdvancedQuery,
    setShowAdvancedQuery,
    loading,
    setLoading,
    userInteractions,
    graphList,
    isInGraph,
    handleSearch,
    handleQuickSearch,
    handleRetry,
    handleRetryWithExponentialBackoff,
    handleTypeFilterToggle,
    handleToggleGraph,
  } = useSearchPage();

  // Handle advanced query builder search
  const handleAdvancedQuerySearch = useCallback((queryStructure: QueryStructure) => {
    const queryString = queryStructure.terms
      .filter((term) => term.text.trim().length > 0)
      .map((term, index) => {
        const prefix = index > 0 ? ` ${term.operator || 'AND'} ` : '';
        return `${prefix}"${term.text.trim()}"`;
      })
      .join('');

    if (queryString.trim()) {
      handleSearch({ query: queryString.trim() });
      setShowAdvancedQuery(false);
    }
  }, [handleSearch, setShowAdvancedQuery]);

  const renderSearchResults = () => {
    if (isLoading) {
      return <SearchLoadingStateRenderer />;
    }

    if (error) {
      return (
        <SearchErrorStateRenderer
          error={error}
          onRetry={handleRetry}
          onRetryWithExponentialBackoff={handleRetryWithExponentialBackoff}
          retryCount={retryCount}
          maxRetries={maxRetries}
          isRetrying={isRetrying}
        />
      );
    }

    if (!hasResults) {
      return <SearchNoResultsStateRenderer query={searchFilters.query} onQuickSearch={handleQuickSearch} />;
    }

    return (
      <Stack>
        <SearchResultsHeader
          sortedResultsCount={sortedResults.length}
          totalResultsCount={searchResults?.length || 0}
          selectedTypes={selectedTypes}
          searchDuration={searchDuration}
          viewMode={viewMode}
          sortBy={sortBy}
          searchResults={searchResults || []}
          searchQuery={searchFilters.query}
          sortedResults={sortedResults}
          onViewModeChange={setViewMode}
          onSortChange={setSortBy}
          onTypeFilterToggle={handleTypeFilterToggle}
          onClearFilters={() => setSelectedTypes([])}
        />

        {hasQuery && (
          <SearchBookmarkButton
            searchQuery={searchFilters.query}
            userInteractions={userInteractions}
            loading={loading}
            onLoadingChange={setLoading}
          />
        )}

        {viewMode === "table" && (
          <SearchResultsTableView
            results={sortedResults}
            isInGraph={isInGraph}
            onToggleGraph={handleToggleGraph}
            graphLoading={graphList.loading}
          />
        )}

        {viewMode === "card" && (
          <SearchResultsCardView
            results={sortedResults}
            isInGraph={isInGraph}
            onToggleGraph={handleToggleGraph}
            graphLoading={graphList.loading}
          />
        )}

        {viewMode === "list" && (
          <SearchResultsListView
            results={sortedResults}
            isInGraph={isInGraph}
            onToggleGraph={handleToggleGraph}
            graphLoading={graphList.loading}
          />
        )}
      </Stack>
    );
  };

  return (
    <Container size="xl">
      <Stack gap="xl">
        <SearchPageHeader />

        {/* Advanced Search Toggle */}
        <Group justify="flex-end">
          <Button
            variant={showAdvancedQuery ? "filled" : "light"}
            leftSection={<IconToggleLeft size={ICON_SIZE.SM} />}
            onClick={() => setShowAdvancedQuery(!showAdvancedQuery)}
            size="sm"
          >
            {showAdvancedQuery ? "Hide" : "Show"} Advanced Query Builder
          </Button>
        </Group>

        {/* Advanced Query Builder */}
        {showAdvancedQuery && (
          <AdvancedQueryBuilder
            onSearch={handleAdvancedQuerySearch}
            placeholder="Enter search term..."
            maxTerms={10}
          />
        )}

        {/* Standard Search Interface */}
        <SearchInterface
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Search for works, authors, institutions, topics... e.g. 'machine learning', 'Marie Curie', 'MIT'"
        />

        {/* Search Within Results Refinement */}
        {hasQuery && hasResults && (
          <SearchRefinement
            refinementQuery={refinementQuery}
            onRefinementChange={setRefinementQuery}
            sortedResultsCount={sortedResults.length}
            totalResultsCount={searchResults?.length || 0}
          />
        )}

        {hasQuery && <Card style={{ border: BORDER_STYLE_GRAY_3 }}>{renderSearchResults()}</Card>}

        {!hasQuery && <SearchEmptyStateRenderer onQuickSearch={handleQuickSearch} />}
      </Stack>
    </Container>
  );
};

export const Route = createLazyFileRoute("/search")({
  component: SearchPage,
});

export default SearchPage;
