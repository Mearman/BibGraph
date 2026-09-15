import { Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar, IconHash, IconShield } from "@tabler/icons-react";

// OpenAlex filter state interface
export interface OpenAlexFilterState {
  // Date range filters
  fromPublicationDate: Date | null;
  toPublicationDate: Date | null;

  // Citation count range
  minCitationCount: number | string;
  maxCitationCount: number | string;

  // Open access status
  openAccessStatus: string | null;
}

// Component props interface
export interface OpenAlexFiltersProps {
  filters: OpenAlexFilterState;
  onFiltersChange: (filters: Partial<OpenAlexFilterState>) => void;
  disabled?: boolean;
  compact?: boolean;
}

// Open access options for the select dropdown
const OPEN_ACCESS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "true", label: "Open Access Only" },
  { value: "false", label: "Non-Open Access Only" },
] as const;

const DATE_PICKER_WIDTH_COMPACT = 120;
const DATE_PICKER_WIDTH_EXPANDED = 140;
const CITATION_INPUT_WIDTH_COMPACT = 110;
const CITATION_INPUT_WIDTH_EXPANDED = 130;
const ACCESS_SELECT_WIDTH_COMPACT = 160;
const ACCESS_SELECT_WIDTH_EXPANDED = 180;

export const OpenAlexFilters = ({
  filters,
  onFiltersChange,
  disabled = false,
  compact = false,
}: OpenAlexFiltersProps) => {
  // Publication date range handlers
  const handleFromDateChange = (value: string | null) => {
    onFiltersChange({
      fromPublicationDate: value !== null && value !== "" ? new Date(value) : null,
    });
  };

  const handleToDateChange = (value: string | null) => {
    onFiltersChange({
      toPublicationDate: value !== null && value !== "" ? new Date(value) : null,
    });
  };

  // Citation count handlers
  const handleMinCitationChange = (value: string | number) => {
    onFiltersChange({
      minCitationCount: value,
    });
  };

  const handleMaxCitationChange = (value: string | number) => {
    onFiltersChange({
      maxCitationCount: value,
    });
  };

  // Open access status handler
  const handleOpenAccessChange = (value: string | null) => {
    onFiltersChange({
      openAccessStatus: value,
    });
  };

  return (
    <Stack gap={compact ? "sm" : "md"}>
      {/* Publication Date Range Filter */}
      <Group align="flex-end">
        <div>
          <Text size="sm" fw={500} mb={5}>
            Publication Date Range
          </Text>
          <Group gap="xs">
            <DatePickerInput
              placeholder="From date"
              value={filters.fromPublicationDate}
              onChange={handleFromDateChange}
              leftSection={<IconCalendar size={16} />}
              maxDate={filters.toPublicationDate ?? undefined}
              disabled={disabled}
              clearable
              w={compact ? DATE_PICKER_WIDTH_COMPACT : DATE_PICKER_WIDTH_EXPANDED}
              size={compact ? "sm" : "md"}
              aria-label="Publication start date"
            />

            <Text c="dimmed" size="sm">
              to
            </Text>

            <DatePickerInput
              placeholder="To date"
              value={filters.toPublicationDate}
              onChange={handleToDateChange}
              leftSection={<IconCalendar size={16} />}
              minDate={filters.fromPublicationDate ?? undefined}
              disabled={disabled}
              clearable
              w={compact ? DATE_PICKER_WIDTH_COMPACT : DATE_PICKER_WIDTH_EXPANDED}
              size={compact ? "sm" : "md"}
              aria-label="Publication end date"
            />
          </Group>
        </div>
      </Group>

      {/* Citation Count Range Filter */}
      <Group align="flex-end">
        <div>
          <Text size="sm" fw={500} mb={5}>
            Citation Count Range
          </Text>
          <Group gap="xs">
            <NumberInput
              placeholder="Min citations"
              value={filters.minCitationCount}
              onChange={handleMinCitationChange}
              leftSection={<IconHash size={16} />}
              min={0}
              max={
                typeof filters.maxCitationCount === "number"
                  ? filters.maxCitationCount
                  : undefined
              }
              disabled={disabled}
              allowNegative={false}
              allowDecimal={false}
              w={compact ? CITATION_INPUT_WIDTH_COMPACT : CITATION_INPUT_WIDTH_EXPANDED}
              size={compact ? "sm" : "md"}
              aria-label="Minimum citation count"
            />

            <Text c="dimmed" size="sm">
              to
            </Text>

            <NumberInput
              placeholder="Max citations"
              value={filters.maxCitationCount}
              onChange={handleMaxCitationChange}
              leftSection={<IconHash size={16} />}
              min={
                typeof filters.minCitationCount === "number"
                  ? filters.minCitationCount
                  : 0
              }
              disabled={disabled}
              allowNegative={false}
              allowDecimal={false}
              w={compact ? CITATION_INPUT_WIDTH_COMPACT : CITATION_INPUT_WIDTH_EXPANDED}
              size={compact ? "sm" : "md"}
              aria-label="Maximum citation count"
            />
          </Group>
        </div>
      </Group>

      {/* Open Access Status Filter */}
      <Group align="flex-end">
        <div>
          <Text size="sm" fw={500} mb={5}>
            Open Access Status
          </Text>
          <Select
            placeholder="Select access type"
            value={filters.openAccessStatus}
            onChange={handleOpenAccessChange}
            data={OPEN_ACCESS_OPTIONS}
            leftSection={<IconShield size={16} />}
            disabled={disabled}
            clearable
            w={compact ? ACCESS_SELECT_WIDTH_COMPACT : ACCESS_SELECT_WIDTH_EXPANDED}
            size={compact ? "sm" : "md"}
            aria-label="Open access status filter"
          />
        </div>
      </Group>
    </Stack>
  );
};
