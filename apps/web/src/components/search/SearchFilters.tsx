import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  RangeSlider,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconCalendar,
  IconClock,
  IconFilter,
  IconHash,
  IconMath,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";

import type { AdvancedSearchFilters } from "./search-filters-types";
import {
  CITATION_IMPACT_LEVELS,
  COMMON_FIELDS,
  countActiveSubValues,
  DATE_RANGE_PRESETS,
  ENTITY_TYPES,
  FILTER_KEYS,
  formatFilterSummaryValue,
  isFilterValueActive,
  LANGUAGES,
  MAX_PUBLICATION_YEAR,
  MIN_PUBLICATION_YEAR,
  PUBLICATION_TYPES,
  QUICK_ENTITY_FILTERS,
} from "./search-filters-types";

interface SearchFiltersProperties {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  onReset: () => void;
}

export const SearchFilters = ({
  filters,
  onFiltersChange,
  onReset,
}: SearchFiltersProperties) => {
  const [localFilters, setLocalFilters] = useState<AdvancedSearchFilters>(filters);

  const updateFilter = useCallback((
    field: keyof AdvancedSearchFilters,
    value: AdvancedSearchFilters[keyof AdvancedSearchFilters]
  ) => {
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  }, [localFilters, onFiltersChange]);

  // Helper function to apply date range preset
  const applyDateRangePreset = useCallback((preset: typeof DATE_RANGE_PRESETS[0]) => {
    updateFilter("publicationYear", { from: preset.from, to: preset.to });
    updateFilter("dateRangePreset", preset.value);
  }, [updateFilter]);

  // Helper function to apply citation impact level
  const applyCitationImpact = useCallback((level: typeof CITATION_IMPACT_LEVELS[0]) => {
    updateFilter("citationCount", { from: level.from, to: level.to });
    updateFilter("citationImpact", level.value);
  }, [updateFilter]);

  // Helper function to toggle quick entity filter
  const toggleQuickEntityFilter = useCallback((entityType: string) => {
    const currentTypes = localFilters.entityType ?? [];
    const newTypes = currentTypes.includes(entityType)
      ? currentTypes.filter(t => t !== entityType)
      : [...currentTypes, entityType];
    updateFilter("entityType", newTypes);
  }, [localFilters.entityType, updateFilter]);

  const hasActiveFilters = useCallback(() => {
    return FILTER_KEYS.some((key) => isFilterValueActive(localFilters[key]));
  }, [localFilters]);

  const getActiveFilterCount = useCallback(() => {
    return FILTER_KEYS.reduce((count, key) => count + countActiveSubValues(localFilters[key]), 0);
  }, [localFilters]);

  const activeFilterCount = getActiveFilterCount();

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconFilter size={20} />
            <Title order={4}>Advanced Filters</Title>
            {activeFilterCount > 0 && (
              <Badge size="sm" color="blue" variant="filled">
                {activeFilterCount} active
              </Badge>
            )}
          </Group>

          <Group gap="xs">
            {hasActiveFilters() && (
              <Button
                variant="outline"
                size="sm"
                leftSection={<IconX size={14} />}
                onClick={onReset}
              >
                Clear All
              </Button>
            )}
          </Group>
        </Group>

        {/* Quick Entity Filter Pills */}
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500}>Quick Entity Filters</Text>
            <Tooltip label="Toggle entity types to quickly narrow search scope">
              <ActionIcon size="sm" variant="subtle">
                <IconHash size={12} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group gap="xs" wrap="wrap">
            {QUICK_ENTITY_FILTERS.map((entity) => {
              const isSelected = localFilters.entityType?.includes(entity.value) ?? false;
              return (
                <Tooltip key={entity.value} label={`Click to ${isSelected ? 'remove' : 'add'} ${entity.label} filter`}>
                  <Button
                    size="compact-sm"
                    variant={isSelected ? "filled" : "outline"}
                    color={isSelected ? entity.color : "gray"}
                    onClick={() => { toggleQuickEntityFilter(entity.value); }}
                    leftSection={
                      isSelected ? <IconX size={10} /> : undefined
                    }
                    style={{
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {entity.label}
                  </Button>
                </Tooltip>
              );
            })}
          </Group>
        </Stack>

        {/* Filters */}
        <Accordion
          variant="contained"
          radius="md"
          defaultValue={["text", "dates"]}
          multiple
        >
          {/* Text-based Filters */}
          <Accordion.Item value="text">
            <Accordion.Control icon={<IconHash size={16} />}>
              Text Search
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <TextInput
                  label="Title"
                  placeholder="Search in title only"
                  value={localFilters.title ?? ""}
                  onChange={(e) => { updateFilter("title", e.target.value); }}
                  rightSection={
                    localFilters.title !== undefined && localFilters.title !== "" && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => { updateFilter("title", ""); }}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Abstract"
                  placeholder="Search in abstract only"
                  value={localFilters.abstract ?? ""}
                  onChange={(e) => { updateFilter("abstract", e.target.value); }}
                  rightSection={
                    localFilters.abstract !== undefined && localFilters.abstract !== "" && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => { updateFilter("abstract", ""); }}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Author"
                  placeholder="Search by author name"
                  value={localFilters.author ?? ""}
                  onChange={(e) => { updateFilter("author", e.target.value); }}
                  rightSection={
                    localFilters.author !== undefined && localFilters.author !== "" && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => { updateFilter("author", ""); }}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Institution"
                  placeholder="Search by institution name"
                  value={localFilters.institution ?? ""}
                  onChange={(e) => { updateFilter("institution", e.target.value); }}
                  rightSection={
                    localFilters.institution !== undefined && localFilters.institution !== "" && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => { updateFilter("institution", ""); }}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Venue"
                  placeholder="Journal or conference name"
                  value={localFilters.venue ?? ""}
                  onChange={(e) => { updateFilter("venue", e.target.value); }}
                  rightSection={
                    localFilters.venue !== undefined && localFilters.venue !== "" && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => { updateFilter("venue", ""); }}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />

                <TextInput
                  label="Keywords"
                  placeholder="Comma-separated keywords"
                  value={localFilters.keywords ?? ""}
                  onChange={(e) => { updateFilter("keywords", e.target.value); }}
                  rightSection={
                    localFilters.keywords !== undefined && localFilters.keywords !== "" && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => { updateFilter("keywords", ""); }}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )
                  }
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Date and Citation Filters */}
          <Accordion.Item value="dates">
            <Accordion.Control icon={<IconCalendar size={16} />}>
              Date & Citation Metrics
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                {/* Date Range Presets */}
                <div>
                  <Group justify="space-between" align="center" mb="xs">
                    <Text size="sm" fw={500}>Quick Date Ranges</Text>
                    <Group gap="xs">
                      {DATE_RANGE_PRESETS.map((preset) => (
                        <Tooltip key={preset.value} label={preset.label}>
                          <Button
                            size="compact-xs"
                            variant={
                              localFilters.dateRangePreset === preset.value ? "filled" : "light"
                            }
                            onClick={() => { applyDateRangePreset(preset); }}
                            leftSection={<IconClock size={10} />}
                          >
                            {preset.label.split(" ", 1)[0]}
                          </Button>
                        </Tooltip>
                      ))}
                    </Group>
                  </Group>
                </div>

                {/* Custom Date Range */}
                <div>
                  <Group justify="space-between" align="center" mb="xs">
                    <Text size="sm" fw={500}>
                      Custom Publication Year
                    </Text>
                    {localFilters.dateRangePreset !== undefined && localFilters.dateRangePreset !== "" && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => {
                          updateFilter("dateRangePreset", undefined);
                        }}
                        title="Clear preset"
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )}
                  </Group>
                  <RangeSlider
                    min={MIN_PUBLICATION_YEAR}
                    max={MAX_PUBLICATION_YEAR}
                    value={[
                      localFilters.publicationYear?.from ?? MIN_PUBLICATION_YEAR,
                      localFilters.publicationYear?.to ?? MAX_PUBLICATION_YEAR,
                    ]}
                    onChange={([from, to]) => {
                      updateFilter("publicationYear", { from, to });
                      // Clear preset when manually adjusting
                      if (localFilters.dateRangePreset !== undefined && localFilters.dateRangePreset !== "") {
                        updateFilter("dateRangePreset", undefined);
                      }
                    }}
                    label={(value) => value.toString()}
                    marks={[
                      { value: 1900, label: "1900" },
                      { value: 1950, label: "1950" },
                      { value: 2000, label: "2000" },
                      { value: 2020, label: "2020" },
                      { value: 2024, label: "2024" },
                    ]}
                  />
                </div>

                {/* Citation Impact Levels */}
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Citation Impact Levels
                  </Text>
                  <SegmentedControl
                    data={[
                      { label: 'All', value: 'all' },
                      ...CITATION_IMPACT_LEVELS.map(level => ({
                        label: level.label,
                        value: level.value,
                      }))
                    ]}
                    value={localFilters.citationImpact ?? 'all'}
                    onChange={(value) => {
                      if (value === 'all') {
                        updateFilter("citationCount", { from: undefined, to: undefined });
                        updateFilter("citationImpact", undefined);
                      } else {
                        const level = CITATION_IMPACT_LEVELS.find(l => l.value === value);
                        if (level) {
                          applyCitationImpact(level);
                        }
                      }
                    }}
                    size="sm"
                    fullWidth
                  />
                </div>

                {/* Custom Citation Count */}
                <div>
                  <Group justify="space-between" align="center" mb="xs">
                    <Text size="sm" fw={500}>
                      Custom Citation Count
                    </Text>
                    {localFilters.citationImpact !== undefined && localFilters.citationImpact !== "" && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => {
                          updateFilter("citationImpact", undefined);
                        }}
                        title="Clear impact level"
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    )}
                  </Group>
                  <Group grow>
                    <NumberInput
                      placeholder="From"
                      min={0}
                      value={localFilters.citationCount?.from}
                      onChange={(value) => {
                        updateFilter("citationCount", {
                          ...localFilters.citationCount,
                          from: typeof value === "number" ? value : undefined,
                        });
                        // Clear impact level when manually adjusting
                        if (localFilters.citationImpact !== undefined && localFilters.citationImpact !== "") {
                          updateFilter("citationImpact", undefined);
                        }
                      }}
                    />
                    <NumberInput
                      placeholder="To"
                      min={0}
                      value={localFilters.citationCount?.to}
                      onChange={(value) => {
                        updateFilter("citationCount", {
                          ...localFilters.citationCount,
                          to: typeof value === "number" ? value : undefined,
                        });
                        // Clear impact level when manually adjusting
                        if (localFilters.citationImpact !== undefined && localFilters.citationImpact !== "") {
                          updateFilter("citationImpact", undefined);
                        }
                      }}
                    />
                  </Group>
                </div>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Type and Classification Filters */}
          <Accordion.Item value="types">
            <Accordion.Control icon={<IconMath size={16} />}>
              Types & Classification
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <MultiSelect
                  label="Entity Types"
                  placeholder="Select types to search"
                  data={ENTITY_TYPES}
                  value={localFilters.entityType ?? []}
                  onChange={(value) => { updateFilter("entityType", value); }}
                />

                <MultiSelect
                  label="Publication Types"
                  placeholder="Select publication types"
                  data={PUBLICATION_TYPES}
                  value={localFilters.publicationType ?? []}
                  onChange={(value) => { updateFilter("publicationType", value); }}
                />

                <MultiSelect
                  label="Languages"
                  placeholder="Select languages"
                  data={LANGUAGES}
                  value={localFilters.language ?? []}
                  onChange={(value) => { updateFilter("language", value); }}
                  searchable
                />

                <MultiSelect
                  label="Fields of Study"
                  placeholder="Select academic fields"
                  data={COMMON_FIELDS}
                  value={localFilters.fieldOfStudy ?? []}
                  onChange={(value) => { updateFilter("fieldOfStudy", value); }}
                  searchable
                />

                <Checkbox
                  label="Open Access only"
                  checked={localFilters.openAccess ?? false}
                  onChange={(e) => { updateFilter("openAccess", e.currentTarget.checked); }}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Concept-based Filters */}
          <Accordion.Item value="concepts">
            <Accordion.Control icon={<IconUsers size={16} />}>
              Concepts & Topics
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Search for specific academic concepts, topics, or research areas.
                  This helps find papers that discuss particular themes or methodologies.
                </Text>

                <MultiSelect
                  label="Concepts"
                  placeholder="e.g., Machine Learning, Climate Change, COVID-19"
                  data={COMMON_FIELDS}
                  value={localFilters.concepts ?? []}
                  onChange={(value) => { updateFilter("concepts", value); }}
                  searchable
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {/* Active Filters Summary */}
        {hasActiveFilters() && (
          <Paper p="sm" bg="blue.0" withBorder style={{ borderColor: "var(--mantine-color-blue-2)" }}>
            <Text size="sm" fw={500} mb="xs">
              Active Filters:
            </Text>
            <Group gap="xs" wrap="wrap">
              {FILTER_KEYS.map((key) => {
                const value = localFilters[key];
                if (!isFilterValueActive(value)) return null;

                const formatted = formatFilterSummaryValue(key, value, localFilters);
                if (!formatted) return null;

                return (
                  <Badge
                    key={key}
                    size="sm"
                    variant="light"
                    color="blue"
                    styles={{
                      root: { cursor: "default" },
                    }}
                  >
                    {formatted}
                  </Badge>
                );
              })}
            </Group>
          </Paper>
        )}
      </Stack>
    </Paper>
  );
};