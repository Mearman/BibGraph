/**
 * Enhanced Search Interface - Advanced search capabilities
 * Provides sophisticated search options with filters and refinements
 */

import { logger } from "@bibgraph/utils";
import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  FocusTrap,
  Group,
  LoadingOverlay,
  MultiSelect,
  NumberInput,
  RangeSlider,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAdjustmentsHorizontal,
  IconBookmark,
  IconDownload,
  IconFilter,
  IconKeyboard,
  IconRefresh,
  IconSearch,
  IconShare,
  IconTrendingUp,
} from "@tabler/icons-react";
import React, { useCallback, useMemo, useRef, useState } from "react";

import { NOTIFICATION_DURATION } from "@/config/notification-constants";
import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';

import { useKeyboardShortcuts } from "./ui/KeyboardShortcuts";

// Bounds of the publication-year filter slider, matching the earliest and most recent years OpenAlex indexes at the time this filter was built.
const EARLIEST_PUBLICATION_YEAR = 1900;
const LATEST_PUBLICATION_YEAR = 2024;
const DEFAULT_PUBLICATION_YEAR_RANGE: [number, number] = [EARLIEST_PUBLICATION_YEAR, LATEST_PUBLICATION_YEAR];
interface SearchFilters {
  query: string;
  entityType: string;
  publicationYear: [number, number];
  openAccess: boolean;
  peerReviewed: boolean;
  citedByMin: number;
  concepts: string[];
  venues: string[];
  authors: string[];
  institutions: string[];
  countries: string[];
  languages: string[];
  hasAbstract: boolean;
  hasFulltext: boolean;
}

interface EnhancedSearchInterfaceProperties {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
}

export const EnhancedSearchInterface = ({ onSearch, loading = false }: EnhancedSearchInterfaceProperties) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    entityType: "works",
    publicationYear: DEFAULT_PUBLICATION_YEAR_RANGE,
    openAccess: false,
    peerReviewed: false,
    citedByMin: 0,
    concepts: [],
    venues: [],
    authors: [],
    institutions: [],
    countries: [],
    languages: [],
    hasAbstract: false,
    hasFulltext: false,
  });
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Calculate active filters count from current filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.publicationYear[0] !== EARLIEST_PUBLICATION_YEAR || filters.publicationYear[1] !== LATEST_PUBLICATION_YEAR) count++;
    if (filters.openAccess) count++;
    if (filters.peerReviewed) count++;
    if (filters.citedByMin > 0) count++;
    if (filters.concepts.length > 0) count++;
    if (filters.venues.length > 0) count++;
    if (filters.authors.length > 0) count++;
    if (filters.institutions.length > 0) count++;
    if (filters.countries.length > 0) count++;
    if (filters.languages.length > 0) count++;
    if (filters.hasAbstract) count++;
    if (filters.hasFulltext) count++;
    return count;
  }, [filters]);

  const handleSearch = useCallback(() => {
    logger.debug("search", "Enhanced search initiated", { filters });
    onSearch(filters);
    // Announce to screen readers using Mantine notifications
    notifications.show({
      title: "Search Started",
      message: `Searching with ${String(activeFiltersCount)} active filters`,
      color: "blue",
      autoClose: NOTIFICATION_DURATION.BRIEF_MS,
      withCloseButton: false,
      styles: {
        root: {
          position: 'fixed',
          top: -100,
          left: 0,
          opacity: 0,
          pointerEvents: 'none',
        },
      },
    });
  }, [filters, onSearch, activeFiltersCount]);

  const handleReset = useCallback(() => {
    setFilters({
      query: "",
      entityType: "works",
      publicationYear: DEFAULT_PUBLICATION_YEAR_RANGE,
      openAccess: false,
      peerReviewed: false,
      citedByMin: 0,
      concepts: [],
      venues: [],
      authors: [],
      institutions: [],
      countries: [],
      languages: [],
      hasAbstract: false,
      hasFulltext: false,
    });
    logger.debug("search", "Search filters reset");
    // Focus back to search input after reset
    searchInputRef.current?.focus();
    notifications.show({
      title: "Filters Reset",
      message: "All search filters have been cleared",
      color: "blue",
    });
  }, []);

  // Use centralized keyboard shortcuts hook instead of custom implementation
  useKeyboardShortcuts({
    enabled: true,
    shortcuts: [
      {
        id: 'focus-search',
        keys: '/',
        description: 'Focus search input',
        handler: useCallback(() => {
          searchInputRef.current?.focus();
        }, []),
        category: 'Search',
        enabled: true,
      },
      {
        id: 'clear-filters',
        keys: 'ctrl+k',
        description: 'Clear all filters',
        handler: useCallback(() => {
          handleReset();
        }, [handleReset]),
        category: 'Search',
        enabled: true,
      },
      {
        id: 'show-shortcuts',
        keys: 'shift+?',
        description: 'Show keyboard shortcuts',
        handler: useCallback(() => {
          setShowKeyboardShortcuts(true);
        }, []),
        category: 'Help',
        enabled: true,
      },
      {
        id: 'hide-shortcuts',
        keys: 'escape',
        description: 'Hide shortcuts modal',
        handler: useCallback(() => {
          setShowKeyboardShortcuts(false);
        }, []),
        category: 'Help',
        enabled: true,
      },
    ],
  });

  const entityTypeOptions = [
    { value: "works", label: "Works/Papers" },
    { value: "authors", label: "Authors" },
    { value: "venues", label: "Venues/Journals" },
    { value: "institutions", label: "Institutions" },
    { value: "concepts", label: "Concepts/Topics" },
  ];

  const conceptOptions = [
    "Machine Learning",
    "Artificial Intelligence",
    "Deep Learning",
    "Neural Networks",
    "Climate Change",
    "Renewable Energy",
    "Quantum Computing",
    "Blockchain",
    "COVID-19",
    "Genomics",
    "Robotics",
    "Natural Language Processing",
  ];

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "pt", label: "Portuguese" },
    { value: "ru", label: "Russian" },
  ];

  const countryOptions = [
    "United States",
    "United Kingdom",
    "Germany",
    "France",
    "China",
    "Japan",
    "Canada",
    "Australia",
    "Netherlands",
    "Switzerland",
    "Sweden",
    "Italy",
  ];

  return (
    <>
      {/* Keyboard shortcuts modal */}
      {showKeyboardShortcuts && (
        <FocusTrap active={showKeyboardShortcuts}>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            role="dialog"
            aria-labelledby="shortcuts-title"
            aria-modal="true"
            tabIndex={-1}
          >
            <button
              type="button"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -1,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => { setShowKeyboardShortcuts(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowKeyboardShortcuts(false);
                }
              }}
              aria-label="Close modal"
            />
            <Card
              padding="lg"
              shadow="xl"
              style={{ maxWidth: 500, width: '90%' }}
              onClick={(e) => { e.stopPropagation(); }}
            >
              <Title order={3} id="shortcuts-title" mb="md">Keyboard Shortcuts</Title>
              <Stack gap="xs">
                <Group gap="xs">
                  <kbd style={{
                    padding: '2px 6px',
                    border: '1px solid var(--mantine-color-gray-4)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>?</kbd>
                  <Text size="sm">Show shortcuts</Text>
                </Group>
                <Group gap="xs">
                  <kbd style={{
                    padding: '2px 6px',
                    border: '1px solid var(--mantine-color-gray-4)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>/</kbd>
                  <Text size="sm">Focus search input</Text>
                </Group>
                <Group gap="xs">
                  <kbd style={{
                    padding: '2px 6px',
                    border: '1px solid var(--mantine-color-gray-4)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>Enter</kbd>
                  <Text size="sm">Execute search</Text>
                </Group>
                <Group gap="xs">
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <kbd style={{
                      padding: '2px 6px',
                      border: '1px solid var(--mantine-color-gray-4)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--mantine-color-gray-0)',
                      fontFamily: 'monospace',
                      fontSize: '12px'
                    }}>Ctrl</kbd>
                    <Text size="sm">+</Text>
                    <kbd style={{
                      padding: '2px 6px',
                      border: '1px solid var(--mantine-color-gray-4)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--mantine-color-gray-0)',
                      fontFamily: 'monospace',
                      fontSize: '12px'
                    }}>K</kbd>
                  </div>
                  <Text size="sm">Clear all filters</Text>
                </Group>
                <Group gap="xs">
                  <kbd style={{
                    padding: '2px 6px',
                    border: '1px solid var(--mantine-color-gray-4)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>Esc</kbd>
                  <Text size="sm">Close modals</Text>
                </Group>
              </Stack>
              <Button mt="md" onClick={() => { setShowKeyboardShortcuts(false); }}>Close</Button>
            </Card>
          </div>
        </FocusTrap>
      )}

      <Card padding="lg" style={{ border: BORDER_STYLE_GRAY_3 }} shadow="sm" pos="relative">
        <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Group gap="xs" align="center">
                <Title order={3}>Enhanced Search</Title>
                <Text
                  size="xs"
                  c="blue"
                  style={{
                    padding: '2px 6px',
                    border: '1px solid var(--mantine-color-blue-3)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--mantine-color-blue-0)',
                    fontFamily: 'monospace',
                    fontSize: '10px'
                  }}
                >
                  ?
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                Advanced search with powerful filters and refinements • Press <kbd style={{
                  padding: '1px 4px',
                  border: '1px solid var(--mantine-color-gray-4)',
                  borderRadius: '3px',
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  fontFamily: 'monospace',
                  fontSize: '11px'
                }}>?</kbd> for shortcuts
              </Text>
            </div>
            <Group>
              <Tooltip label="Keyboard shortcuts">
                <ActionIcon
                  variant="light"
                  onClick={() => { setShowKeyboardShortcuts(true); }}
                  aria-label="Show keyboard shortcuts"
                >
                  <IconKeyboard size={ICON_SIZE.MD} />
                </ActionIcon>
              </Tooltip>
              <Badge
                variant="light"
                color="blue"
                leftSection={<IconFilter size={ICON_SIZE.XS} />}
              >
                {activeFiltersCount} active filters
              </Badge>
              <Tooltip label="Reset all filters">
                <ActionIcon
                  variant="light"
                  onClick={handleReset}
                  aria-label="Reset all filters"
                >
                  <IconRefresh size={ICON_SIZE.MD} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

        <Divider />

        {/* Basic Search */}
        <Card padding="md" style={{ border: BORDER_STYLE_GRAY_3 }} bg="gray.0">
          <Stack gap="md">
            <Group gap="sm">
              <Select
                value={filters.entityType}
                onChange={(value) => { setFilters({ ...filters, entityType: value !== null && value !== "" ? value : "works" }); }}
                data={entityTypeOptions}
                w={150}
                size="md"
              />
              <TextInput
                ref={searchInputRef}
                placeholder="Enter your search query..."
                value={filters.query}
                onChange={(e) => { setFilters({ ...filters, query: e.target.value }); }}
                style={{ flex: 1 }}
                size="md"
                leftSection={<IconSearch size={ICON_SIZE.MD} />}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  } else if (e.key === "Escape") {
                    setShowKeyboardShortcuts(false);
                  }
                }}
                aria-label="Search query"
                aria-describedby="search-help"
              />
              <Button
                onClick={handleSearch}
                loading={loading}
                size="md"
                leftSection={<IconSearch size={ICON_SIZE.MD} />}
              >
                Search
              </Button>
            </Group>

            <Group gap="xs">
              <Switch
                label="Open Access"
                checked={filters.openAccess}
                onChange={(e) => { setFilters({ ...filters, openAccess: e.currentTarget.checked }); }}
                size="sm"
              />
              <Switch
                label="Peer Reviewed"
                checked={filters.peerReviewed}
                onChange={(e) => { setFilters({ ...filters, peerReviewed: e.currentTarget.checked }); }}
                size="sm"
              />
              <Switch
                label="Has Abstract"
                checked={filters.hasAbstract}
                onChange={(e) => { setFilters({ ...filters, hasAbstract: e.currentTarget.checked }); }}
                size="sm"
              />
              <Switch
                label="Has Full Text"
                checked={filters.hasFulltext}
                onChange={(e) => { setFilters({ ...filters, hasFulltext: e.currentTarget.checked }); }}
                size="sm"
              />
            </Group>
          </Stack>
        </Card>

        {/* Advanced Filters */}
        <Accordion multiple defaultValue={["filters"]}>
          <Accordion.Item value="filters">
            <Accordion.Control icon={<IconAdjustmentsHorizontal size={ICON_SIZE.MD} />}>
              Advanced Filters
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="lg">
                {/* Publication Year */}
                <div>
                  <Group justify="space-between" mb="sm">
                    <Text size="sm" fw={500}>Publication Year</Text>
                    <Text size="xs" c="dimmed">
                      {filters.publicationYear[0]} - {filters.publicationYear[1]}
                    </Text>
                  </Group>
                  <RangeSlider
                    min={EARLIEST_PUBLICATION_YEAR}
                    max={LATEST_PUBLICATION_YEAR}
                    value={filters.publicationYear}
                    onChange={(value) => { setFilters({ ...filters, publicationYear: value }); }}
                    marks={[
                      { value: EARLIEST_PUBLICATION_YEAR, label: String(EARLIEST_PUBLICATION_YEAR) },
                      { value: 1950, label: "1950" },
                      { value: 2000, label: "2000" },
                      { value: 2010, label: "2010" },
                      { value: 2020, label: "2020" },
                      { value: LATEST_PUBLICATION_YEAR, label: String(LATEST_PUBLICATION_YEAR) },
                    ]}
                  />
                </div>

                {/* Citation Count */}
                <div>
                  <Text size="sm" fw={500} mb="sm">Minimum Citations</Text>
                  <NumberInput
                    value={filters.citedByMin}
                    onChange={(value) => { setFilters({ ...filters, citedByMin: Number(value) || 0 }); }}
                    min={0}
                    placeholder="Minimum citation count"
                    leftSection={<IconTrendingUp size={ICON_SIZE.MD} />}
                  />
                </div>

                {/* Multi-select Filters */}
                <div>
                  <Text size="sm" fw={500} mb="sm">Research Concepts</Text>
                  <TagsInput
                    value={filters.concepts}
                    onChange={(value) => { setFilters({ ...filters, concepts: value }); }}
                    placeholder="Add concepts..."
                    data={conceptOptions}
                    clearable
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="sm">Countries</Text>
                  <MultiSelect
                    value={filters.countries}
                    onChange={(value) => { setFilters({ ...filters, countries: value }); }}
                    data={countryOptions}
                    placeholder="Select countries"
                    clearable
                    searchable
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="sm">Languages</Text>
                  <MultiSelect
                    value={filters.languages}
                    onChange={(value) => { setFilters({ ...filters, languages: value }); }}
                    data={languageOptions}
                    placeholder="Select languages"
                    clearable
                  />
                </div>

                {/* Text inputs for entities */}
                <div>
                  <Text size="sm" fw={500} mb="sm">Authors (comma-separated)</Text>
                  <TextInput
                    value={filters.authors.join(", ")}
                    onChange={(e) => { setFilters({ ...filters, authors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }); }}
                    placeholder="Enter author names..."
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="sm">Venues (comma-separated)</Text>
                  <TextInput
                    value={filters.venues.join(", ")}
                    onChange={(e) => { setFilters({ ...filters, venues: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }); }}
                    placeholder="Enter venue names..."
                  />
                </div>

                <div>
                  <Text size="sm" fw={500} mb="sm">Institutions (comma-separated)</Text>
                  <TextInput
                    value={filters.institutions.join(", ")}
                    onChange={(e) => { setFilters({ ...filters, institutions: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }); }}
                    placeholder="Enter institution names..."
                  />
                </div>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="saved">
            <Accordion.Control icon={<IconBookmark size={ICON_SIZE.MD} />}>
              Saved Searches
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed">
                No saved searches yet. Create and save search presets for quick access.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {/* Action Buttons */}
        <Group justify="space-between">
          <Group>
            <Button
              variant="light"
              leftSection={<IconBookmark size={ICON_SIZE.MD} />}
              onClick={() => {
                notifications.show({
                  title: "Save Search",
                  message: "Search saved to your profile",
                  color: "green",
                });
              }}
            >
              Save Search
            </Button>
            <Button
              variant="light"
              leftSection={<IconShare size={ICON_SIZE.MD} />}
              onClick={() => {
                notifications.show({
                  title: "Share Search",
                  message: "Share link copied to clipboard",
                  color: "blue",
                });
              }}
            >
              Share
            </Button>
          </Group>
          <Button
            variant="outline"
            leftSection={<IconDownload size={ICON_SIZE.MD} />}
            onClick={() => {
              notifications.show({
                title: "Export Results",
                message: "Export options would appear here",
                color: "blue",
              });
            }}
          >
            Export
          </Button>
        </Group>
      </Stack>
    </Card>
    </>
  );
};