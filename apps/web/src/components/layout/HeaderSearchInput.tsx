import type { EntityType } from "@bibgraph/types";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Divider,
  Group,
  Loader,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconArrowRight,
  IconBook,
  IconBuilding,
  IconBulb,
  IconChevronDown,
  IconClock,
  IconHistory,
  IconSearch,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NOTIFICATION_DURATION } from "@/config/notification-constants";
import { ICON_SIZE } from "@/config/style-constants";
import { useNavigationEnhancements } from "@/hooks/useNavigationEnhancements";
import { announceToScreenReader } from "@/utils/accessibility";

import {
  buildSearchSuggestions,
  isOpenAlexAutocompleteResponse,
  type SearchSuggestion,
} from "./search-suggestion-scoring";

// Entity type presentation lookups. Keyed as Record<EntityType, ...> so adding a new EntityType is a compile error here until it is given an icon and colour.
const ENTITY_TYPE_ICONS: Record<EntityType, ReactElement> = {
  works: <IconBook size={ICON_SIZE.XS} />,
  authors: <IconUser size={ICON_SIZE.XS} />,
  institutions: <IconBuilding size={ICON_SIZE.XS} />,
  sources: <IconBulb size={ICON_SIZE.XS} />,
  topics: <IconSearch size={ICON_SIZE.XS} />,
  concepts: <IconSearch size={ICON_SIZE.XS} />,
  publishers: <IconSearch size={ICON_SIZE.XS} />,
  funders: <IconSearch size={ICON_SIZE.XS} />,
  keywords: <IconSearch size={ICON_SIZE.XS} />,
  domains: <IconSearch size={ICON_SIZE.XS} />,
  fields: <IconSearch size={ICON_SIZE.XS} />,
  subfields: <IconSearch size={ICON_SIZE.XS} />,
};

const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  works: 'blue',
  authors: 'green',
  institutions: 'orange',
  sources: 'purple',
  topics: 'gray',
  concepts: 'gray',
  publishers: 'gray',
  funders: 'gray',
  keywords: 'gray',
  domains: 'gray',
  fields: 'gray',
  subfields: 'gray',
};

// Component-level timing and pagination constants
const SUGGESTIONS_DEBOUNCE_MS = 300;
const MAX_HISTORY_ITEMS_NO_QUERY = 5;
const MAX_HISTORY_ITEMS_FILTERED = 3;
const BLUR_CLOSE_DELAY_MS = 200;

export const HeaderSearchInput = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParameters = useSearch({ strict: false });
  // useSearch({ strict: false }) loses per-route type safety, so `q` comes back as `any`; narrow it to a plain string here rather than propagating the `any` further.
  const searchQueryParameter: string | undefined =
    typeof searchParameters.q === "string" ? searchParameters.q : undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsAbortControllerRef = useRef<AbortController | null>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    addToSearchHistory,
    clearSearchHistory,
    searchHistory,
    useKeyboardNavigation
  } = useNavigationEnhancements();

  // Enable keyboard navigation shortcuts
  useKeyboardNavigation();

  // Initialize from URL params if on search page
  const [query, setQuery] = useState(() =>
    location.pathname === "/search" && searchQueryParameter !== undefined ? searchQueryParameter : ""
  );

  // Enhanced state management
  const [focused, setFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Sync local state from the URL during render (rather than in an effect) to avoid an extra render pass.
  const routeSyncKey = `${location.pathname}::${searchQueryParameter ?? ""}`;
  const [lastRouteSyncKey, setLastRouteSyncKey] = useState(routeSyncKey);
  if (routeSyncKey !== lastRouteSyncKey) {
    setLastRouteSyncKey(routeSyncKey);
    setQuery(location.pathname === "/search" && searchQueryParameter !== undefined ? searchQueryParameter : "");
  }

  // Real-time search suggestions with debouncing
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    // Cancel previous request
    if (suggestionsAbortControllerRef.current) {
      suggestionsAbortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    suggestionsAbortControllerRef.current = abortController;

    try {
      setIsLoadingSuggestions(true);
      setSuggestionsError(null);

      // OpenAlex API for autocomplete suggestions
      const response = await fetch(
        `https://api.openalex.org/autocomplete?q=${encodeURIComponent(searchQuery)}`,
        {
          signal: abortController.signal,
          headers: {
            'User-Agent': 'BibGraph/1.0',
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${String(response.status)}`);
      }

      const rawData: unknown = await response.json();
      if (!isOpenAlexAutocompleteResponse(rawData)) {
        throw new Error("Unexpected autocomplete response shape");
      }

      // Transform OpenAlex suggestions to our format with research scoring
      const transformedSuggestions = buildSearchSuggestions(rawData);

      setSuggestions(transformedSuggestions);

      // Announce to screen readers
      if (transformedSuggestions.length > 0) {
        announceToScreenReader(
          `Found ${String(transformedSuggestions.length)} suggestions for ${searchQuery}`,
          'polite'
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setSuggestionsError('Failed to fetch suggestions');
        announceToScreenReader('Search suggestions temporarily unavailable', 'polite');
      }
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setHighlightedIndex(-1);

    // Debounce suggestions
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, SUGGESTIONS_DEBOUNCE_MS);
  }, [fetchSuggestions]);

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const trimmedQuery = searchQuery.trim();

    // Add to search history
    addToSearchHistory(trimmedQuery);

    // Navigate to search
    void navigate({
      to: "/search",
      search: { q: trimmedQuery, filter: undefined, search: undefined },
    });

    // Clear focus and close history
    setFocused(false);
    setShowHistory(false);
    inputRef.current?.blur();
  }, [navigate, addToSearchHistory]);

  // Auto-suggest recent searches when focused
  const filteredHistory = useMemo(() => {
    if (!query.trim()) {
      return searchHistory.slice(0, MAX_HISTORY_ITEMS_NO_QUERY);
    }
    return searchHistory
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, MAX_HISTORY_ITEMS_FILTERED);
  }, [query, searchHistory]);

  // Get entity type icon and color
  const getEntityTypeIcon = useCallback(
    (entityType: EntityType) => ENTITY_TYPE_ICONS[entityType],
    [],
  );

  const getEntityTypeColor = useCallback(
    (entityType: EntityType) => ENTITY_TYPE_COLORS[entityType],
    [],
  );

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const highlightedSuggestion =
          highlightedIndex >= 0 && highlightedIndex < suggestions.length
            ? suggestions[highlightedIndex]
            : undefined;
        if (highlightedSuggestion !== undefined) {
          // Navigate to highlighted suggestion
          handleSearch(highlightedSuggestion.displayName);
        } else {
          handleSearch(query);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setFocused(false);
        setShowHistory(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const totalItems = suggestions.length + (filteredHistory.length > 0 ? filteredHistory.length : 0);
        if (totalItems > 0) {
          const newIndex = highlightedIndex < totalItems - 1 ? highlightedIndex + 1 : 0;
          setHighlightedIndex(newIndex);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const totalItems = suggestions.length + (filteredHistory.length > 0 ? filteredHistory.length : 0);
        if (totalItems > 0) {
          const newIndex = highlightedIndex > 0 ? highlightedIndex - 1 : totalItems - 1;
          setHighlightedIndex(newIndex);
        }
      } else if (e.key === "Tab") {
        // Allow default tab behavior
        setHighlightedIndex(-1);
      }
    },
    [query, handleSearch, suggestions, filteredHistory, highlightedIndex],
  );

  const handleHistoryItemClick = useCallback((historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  }, [handleSearch]);

  const handleClearHistory = useCallback(() => {
    modals.openConfirmModal({
      title: "Clear Search History",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to clear your search history? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Clear History", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        clearSearchHistory();
        notifications.show({
          title: "History Cleared",
          message: "Search history has been cleared",
          color: "blue",
          autoClose: NOTIFICATION_DURATION.SHORT_MS,
        });
      },
    });
  }, [clearSearchHistory]);

  // Cleanup effects
  useEffect(() => {
    return () => {
      // Cleanup timeout
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      // Cleanup fetch request
      if (suggestionsAbortControllerRef.current) {
        suggestionsAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Calculate what to show in dropdown
  const shouldShowSuggestions = query.trim().length >= 2 && (suggestions.length > 0 || isLoadingSuggestions);
  const shouldShowHistory = !shouldShowSuggestions && filteredHistory.length > 0;

  return (
    <Group gap="xs" align="center">
      <Popover
        opened={(showHistory && (shouldShowSuggestions || shouldShowHistory)) || isLoadingSuggestions}
        position="bottom"
        withArrow
        shadow="md"
        offset={8}
      >
        <Popover.Target>
          <TextInput
            ref={inputRef}
            placeholder="Search works, authors, institutions..."
            leftSection={<IconSearch size={ICON_SIZE.MD} />}
            value={query}
            onChange={(e) => { handleChange(e.target.value); }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              setShowHistory(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                if (inputRef.current?.matches(':focus-within') === true) {
                	return;
                }

                setFocused(false);
                setShowHistory(false);
              }, BLUR_CLOSE_DELAY_MS);
            }}
            size="sm"
            styles={{
              root: {
                width: "100%",
                maxWidth: focused ? "420px" : "350px",
                transition: "max-width 200ms ease",
              },
              input: {
                borderRadius: "8px",
                fontSize: "14px",
              },
            }}
            aria-label="Global search input"
            aria-expanded={showHistory && (shouldShowSuggestions || shouldShowHistory)}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
            rightSection={
              <Group gap={2}>
                {query && (
                  <ActionIcon
                    size="sm"
                    variant="transparent"
                    onClick={() => {
                      setQuery("");
                      setSuggestions([]);
                      setHighlightedIndex(-1);
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                  >
                    <IconX size={ICON_SIZE.SM} />
                  </ActionIcon>
                )}
                <Tooltip label="Search suggestions enabled" position="left" offset={-5} withinPortal>
                  <ActionIcon
                    size="sm"
                    variant="transparent"
                    color="gray"
                    onClick={() => inputRef.current?.focus()}
                    aria-label="Search with autocomplete"
                  >
                    <IconChevronDown size={ICON_SIZE.XS} />
                  </ActionIcon>
                </Tooltip>
                {isLoadingSuggestions && (
                  <Loader size={ICON_SIZE.XS} />
                )}
              </Group>
            }
          />
        </Popover.Target>

        <Popover.Dropdown>
          <Stack gap="xs" p="xs" miw="380" mah="400" style={{ overflowY: 'auto' }} role="listbox">
            {/* Keyboard shortcuts help */}
            <Text size="xs" c="dimmed" ta="center">
              ↑↓ Navigate · Enter to select · Esc to close
            </Text>

            {/* Search suggestions */}
            {shouldShowSuggestions && (
              <>
                {isLoadingSuggestions && (
                  <Group justify="center" py="md">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">Searching suggestions...</Text>
                  </Group>
                )}

                {suggestionsError !== null && suggestionsError !== "" && (
                  <Text size="sm" c="red" ta="center" py="md">
                    {suggestionsError}
                  </Text>
                )}

                {suggestions.length > 0 && (
                  <>
                    <Text size="xs" fw={600} c="dimmed" mt="xs">
                      SUGGESTIONS
                    </Text>
                    {suggestions.map((suggestion, index) => {
                      const isHighlighted = highlightedIndex === index;
                      return (
                        <Group
                          key={suggestion.id}
                          gap="xs"
                          align="center"
                          p="xs"
                          style={{
                            borderRadius: "6px",
                            cursor: "pointer",
                            backgroundColor: isHighlighted ? "var(--mantine-color-gray-0)" : undefined,
                            border: isHighlighted ? "1px solid var(--mantine-color-blue-5)" : undefined,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSearch(suggestion.displayName);
                          }}
                          onMouseEnter={() => { setHighlightedIndex(index); }}
                          onMouseLeave={() => { setHighlightedIndex(-1); }}
                          role="option"
                          aria-selected={isHighlighted}
                          tabIndex={-1}
                        >
                          <Avatar size="sm" color={getEntityTypeColor(suggestion.entityType)} radius="sm">
                            {getEntityTypeIcon(suggestion.entityType)}
                          </Avatar>
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" truncate fw={500}>
                              {suggestion.displayName}
                            </Text>
                            <Group gap="xs" mt={2}>
                              <Badge size="xs" variant="light" color={getEntityTypeColor(suggestion.entityType)}>
                                {suggestion.entityType}
                              </Badge>

                              {/* Research relevance indicators */}
                              {suggestion.trending === true && (
                                <Badge size="xs" variant="filled" color="orange">
                                  📈 Trending
                                </Badge>
                              )}
                              {suggestion.recent === true && (
                                <Badge size="xs" variant="light" color="green">
                                  🆕 Recent
                                </Badge>
                              )}

                              <Box style={{ flex: 1 }}>
                                {suggestion.worksCount !== undefined && (
                                  <Text size="xs" c="dimmed">
                                    {suggestion.worksCount.toLocaleString()} works
                                  </Text>
                                )}
                                {suggestion.citedByCount !== undefined && (
                                  <Text size="xs" c="dimmed">
                                    {suggestion.citedByCount.toLocaleString()} citations
                                  </Text>
                                )}
                                {suggestion.relevanceReason !== undefined && suggestion.relevanceReason !== "" && (
                                  <Text size="xs" c="blue" fw={500}>
                                    {suggestion.relevanceReason}
                                  </Text>
                                )}
                              </Box>
                            </Group>
                          </Box>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSearch(suggestion.displayName);
                            }}
                            aria-label={`Search for ${suggestion.displayName}`}
                          >
                            <IconArrowRight size={ICON_SIZE.XXS} />
                          </ActionIcon>
                        </Group>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* Divider between suggestions and history */}
            {shouldShowSuggestions && shouldShowHistory && <Divider />}

            {/* Search history */}
            {shouldShowHistory && (
              <>
                <Group justify="space-between" align="center" mt="xs">
                  <Text size="xs" fw={600} c="dimmed">
                    <Group gap="xs">
                      <IconHistory size={ICON_SIZE.XS} />
                      RECENT SEARCHES
                    </Group>
                  </Text>
                  {searchHistory.length > 0 && (
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      onClick={handleClearHistory}
                      aria-label="Clear search history"
                    >
                      <IconX size={ICON_SIZE.XXS} />
                    </ActionIcon>
                  )}
                </Group>

                {filteredHistory.map((historyQuery, index) => {
                  const isHighlighted = highlightedIndex === suggestions.length + index;
                  return (
                    <Group
                      key={historyQuery}
                      gap="xs"
                      align="center"
                      p="xs"
                      style={{
                        borderRadius: "6px",
                        cursor: "pointer",
                        backgroundColor: isHighlighted ? "var(--mantine-color-gray-0)" : undefined,
                        border: isHighlighted ? "1px solid var(--mantine-color-blue-5)" : undefined,
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleHistoryItemClick(historyQuery);
                      }}
                      onMouseEnter={() => { setHighlightedIndex(suggestions.length + index); }}
                      onMouseLeave={() => { setHighlightedIndex(-1); }}
                      role="option"
                      aria-selected={isHighlighted}
                      tabIndex={-1}
                    >
                      <IconClock size={ICON_SIZE.XS} color="var(--mantine-color-gray-5)" />
                      <Text
                        size="sm"
                        style={{ flex: 1 }}
                        truncate
                      >
                        {historyQuery}
                      </Text>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHistoryItemClick(historyQuery);
                        }}
                        aria-label={`Search for ${historyQuery}`}
                      >
                        <IconArrowRight size={ICON_SIZE.XXS} />
                      </ActionIcon>
                    </Group>
                  );
                })}

                {filteredHistory.length === 0 && query.trim().length < 2 && (
                  <Stack gap="xs" py="md">
                    <Text size="sm" c="dimmed" ta="center">
                      {query.trim().length > 0 ? "Keep typing for suggestions" : "Type to search"}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      Search works, authors, institutions, and more
                    </Text>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>

      <Badge
        size="xs"
        variant="light"
        color="gray"
        hidden={searchHistory.length === 0}
      >
        {searchHistory.length}
      </Badge>
    </Group>
  );
};
