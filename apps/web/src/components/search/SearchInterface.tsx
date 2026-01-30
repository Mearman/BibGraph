import { SearchLoadingSpinner } from "@bibgraph/ui";
import { debouncedSearch, isValidSearchQuery, logger, normalizeSearchQuery } from "@bibgraph/utils";
import { ActionIcon, Alert, Button, Group, Paper, Stack, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { IconFilter, IconInfoCircle, IconSearch, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";
import { useSearchHotkeys } from "@/hooks/use-hotkeys";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { announceToScreenReader } from "@/utils/accessibility";

import { AdvancedSearchFilters,SearchFilters } from "./SearchFilters";
import { SearchHistoryDropdown } from "./SearchHistoryDropdown";

interface SearchFilters {
  query: string;
  advanced?: AdvancedSearchFilters;
}

interface SearchInterfaceProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
  placeholder?: string;
  showHelp?: boolean;
  showAdvancedFilters?: boolean;
}

export const SearchInterface = ({
  onSearch,
  isLoading = false,
  placeholder = "Search academic works, authors, institutions...",
  showHelp = false,
  showAdvancedFilters = false
}: SearchInterfaceProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchTip, setSearchTip] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { addSearchQuery } = useSearchHistory();

  // Set up keyboard shortcuts for search
  useSearchHotkeys(
    () => handleSearch(),
    () => handleClearFilters()
  );

  const handleSearch = useCallback(() => {
    const filters = {
      query: isValidSearchQuery(query) ? normalizeSearchQuery(query) : "",
      advanced: showFilters && Object.keys(advancedFilters).length > 0 ? advancedFilters : undefined,
    };

    // Add to search history
    if (filters.query) {
      void addSearchQuery(filters.query);
      announceToScreenReader(`Searching for: ${filters.query}`);
    }

    onSearch(filters);
  }, [query, advancedFilters, showFilters, onSearch, addSearchQuery]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    // Only trigger debounced search if we have a valid query
    if (isValidSearchQuery(value)) {
      debouncedSearch(() => {
        const filters = {
          query: normalizeSearchQuery(value),
          advanced: showFilters && Object.keys(advancedFilters).length > 0 ? advancedFilters : undefined,
        };
        // Add to search history for debounced searches too
        void addSearchQuery(filters.query);
        onSearch(filters);
      }, value);
    }
  }, [onSearch, advancedFilters, showFilters, addSearchQuery]);

  const handleHistoryQuerySelect = useCallback((selectedQuery: string) => {
    setQuery(selectedQuery);
    handleQueryChange(selectedQuery);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [handleQueryChange]);

  const handleFiltersChange = useCallback((filters: AdvancedSearchFilters) => {
    setAdvancedFilters(filters);
    // Auto-trigger search when filters change and we have a query
    if (query.trim() && isValidSearchQuery(query)) {
      debouncedSearch(() => {
        const searchFilters = {
          query: normalizeSearchQuery(query),
          advanced: Object.keys(filters).length > 0 ? filters : undefined,
        };
        onSearch(searchFilters);
      }, `filters-${JSON.stringify(filters)}`);
    }
  }, [query, onSearch]);

  const handleResetFilters = useCallback(() => {
    setAdvancedFilters({});
    // Trigger search with reset filters
    if (query.trim() && isValidSearchQuery(query)) {
      debouncedSearch(() => {
        const filters = {
          query: normalizeSearchQuery(query),
        };
        onSearch(filters);
      }, "reset-filters");
    }
  }, [query, onSearch]);

  const handleClearFilters = () => {
    setQuery("");
    setAdvancedFilters({});
    onSearch({
      query: "",
      advanced: undefined,
    });
    logger.info("ui", "Search cleared by user", { component: "SearchInterface" }, "SearchInterface");
  };

  // Generate search tips rotation
  useEffect(() => {
    const tips = [
      "Use quotes for exact phrases: \"machine learning\"",
      "Combine terms: AI AND healthcare",
      "Exclude terms: climate -change",
      "Search by entity type: authors:Smith",
      "Use wildcards: neural* networks",
      "Filter by year: published:>2020",
      "Use advanced filters for precise results",
      "Combine text search with faceted filters"
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setSearchTip(randomTip);

    const tipInterval = setInterval(() => {
      const nextTip = tips[Math.floor(Math.random() * tips.length)];
      setSearchTip(nextTip);
    }, 8000); // Rotate tips every 8 seconds

    return () => clearInterval(tipInterval);
  }, []);

  
  // Log search activity
  useEffect(() => {
    if (query.length > 0) {
      logger.debug("ui", "Search query updated", {
        queryLength: query.length,
        isValid: isValidSearchQuery(query)
      }, "SearchInterface");
    }
  }, [query]);

  return (
    <Paper p="md" style={{ border: BORDER_STYLE_GRAY_3 }}>
      <Stack gap="md">
        {/* Header with help and filters */}
        <Group justify="space-between" align="center">
          <Title order={3}>Search Academic Literature</Title>
          <Group gap="xs">
            {showAdvancedFilters && (
              <Tooltip label="Toggle advanced filters" position="bottom">
                <Button
                  variant={showFilters ? "filled" : "outline"}
                  size="sm"
                  leftSection={<IconFilter size={ICON_SIZE.SM} />}
                  onClick={() => setShowFilters(!showFilters)}
                  aria-label="Toggle advanced filters"
                >
                  Filters
                </Button>
              </Tooltip>
            )}
            {showHelp && (
              <Tooltip label="Search tips and help" position="bottom">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  aria-label="Search help"
                  onClick={() => {
                    logger.info("ui", "Search help requested", { component: "SearchInterface" }, "SearchInterface");
                  }}
                >
                  <IconInfoCircle size={ICON_SIZE.SM} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* Search Tips */}
        {showHelp && searchTip && (
          <Alert
            variant="light"
            color="blue"
            icon={<IconInfoCircle size={ICON_SIZE.SM} />}
            radius="md"
            id="search-tips"
            role="complementary"
            aria-live="polite"
          >
            <Text size="sm">
              <strong>Pro tip:</strong> {searchTip}
            </Text>
          </Alert>
        )}

        {/* Search Input Group */}
        <Group align="flex-end">
          <TextInput
            ref={searchInputRef}
            placeholder={placeholder}
            data-testid="search-input"
            leftSection={
              isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '2px solid var(--mantine-color-blue-6)',
                    borderTopColor: 'transparent',
                    borderRightColor: 'transparent',
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              ) : (
                <IconSearch size={ICON_SIZE.MD} />
              )
            }
            value={query}
            onChange={(e) => {
              handleQueryChange(e.target.value);
            }}
            disabled={isLoading}
            flex={1}
            size="md"
            aria-label={`Search academic works, ${query ? `current value: ${query}` : 'empty'}`}
            aria-describedby={showHelp ? "search-tips" : undefined}
            role="combobox"
            aria-expanded={showFilters}
            aria-haspopup={showAdvancedFilters}
            rightSection={query && !isLoading && (
              <Tooltip label="Clear search">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handleClearFilters}
                  aria-label="Clear search query"
                >
                  <IconX size={ICON_SIZE.SM} />
                </ActionIcon>
              </Tooltip>
            )}
          />
          <Button
            onClick={handleSearch}
            loading={isLoading}
            leftSection={<IconSearch size={ICON_SIZE.MD} />}
            disabled={!query.trim() || isLoading}
            aria-label="Execute search"
            data-testid="search-button"
          >
            Search
          </Button>
          <SearchHistoryDropdown onSearchQuerySelect={handleHistoryQuerySelect} />
        </Group>

        {/* Search Status */}
        {query && !isLoading && (
          <Text size="sm" c="dimmed" ta="center">
            {isValidSearchQuery(query)
              ? `Ready to search for "${normalizeSearchQuery(query)}"`
              : "Enter a valid search query to continue"}
          </Text>
        )}

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && showFilters && (
          <SearchFilters
            filters={advancedFilters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
          />
        )}

        {/* Enhanced Loading Indicator */}
        {isLoading && (
          <SearchLoadingSpinner
            message="Searching academic database..."
            showEta={true}
          />
        )}
      </Stack>
    </Paper>
  );
};