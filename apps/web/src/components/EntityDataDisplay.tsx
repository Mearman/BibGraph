/**
 * EntityDataDisplay Component
 *
 * Displays entity data using standard Mantine components with a clean, organized layout.
 */

import { VersionComparisonIndicator } from "@bibgraph/ui";
import { isDataVersionSelectorVisible } from "@bibgraph/utils";
import {
  Anchor,
  Badge,
  Box,
  Code,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconClipboard,
  IconExternalLink,
  IconFile,
  IconInfoCircle,
  IconKey,
  IconLink,
  IconNetwork,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { ICON_SIZE } from "@/config/style-constants";
import { useVersionComparison } from "@/hooks/use-version-comparison";
import { humanizeFieldName } from "@/utils/field-labels";
import { formatNumber } from "@/utils/format-number";
import { convertOpenAlexToInternalLink, isOpenAlexId } from "@/utils/openalex-link-conversion";

/**
 * Decode HTML entities in text
 * Handles common entities like &amp;, &lt;, &gt;, &quot;, etc.
 */
const decodeHtmlEntities = (text: string): string => {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  return text.replaceAll(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (match) => entities[match] ?? match);
};

/** Section priority for consistent ordering */
const SECTION_PRIORITY: Record<string, number> = {
  Identifiers: 1,
  "Basic Information": 2,
  Metrics: 3,
  Dates: 4,
  "Locations & Geo": 5,
  Relationships: 6,
  Other: 7,
};

/** Section icons mapping */
const SECTION_ICONS: Record<string, import("react").ReactNode> = {
  "Basic Information": <IconInfoCircle size={ICON_SIZE.MD} />,
  "Identifiers": <IconKey size={ICON_SIZE.MD} />,
  "Metrics": <IconChartBar size={ICON_SIZE.MD} />,
  "Relationships": <IconNetwork size={ICON_SIZE.MD} />,
  "Dates": <IconCalendar size={ICON_SIZE.MD} />,
  "Locations & Geo": <IconWorld size={ICON_SIZE.MD} />,
  "Other": <IconClipboard size={ICON_SIZE.MD} />,
};

// ============================================================================
// Value Rendering
// ============================================================================

const renderPrimitiveValue = (value: unknown, fieldName?: string): import("react").ReactNode => {
  // Don't render null/undefined - these fields will be filtered out
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return (
      <Badge
        color={value ? "green" : "red"}
        variant="light"
        size="sm"
        leftSection={value ? <IconCheck size={ICON_SIZE.XS} /> : <IconX size={ICON_SIZE.XS} />}
      >
        {value.toString()}
      </Badge>
    );
  }

  if (typeof value === "number") {
    return (
      <Code variant="light" color="blue" ff="monospace" fw={600}>
        {formatNumber(value, fieldName)}
      </Code>
    );
  }

  if (typeof value === "string") {
    const converted = convertOpenAlexToInternalLink(value);

    if (converted.isOpenAlexLink) {
      return (
        <Anchor
          component={Link}
          to={converted.internalPath}
          c="blue"
          size="sm"
          style={{ wordBreak: "break-word" }}
        >
          <Group gap={4}>
            <IconLink size={ICON_SIZE.SM} />
            <Text size="sm" span>{value}</Text>
          </Group>
        </Anchor>
      );
    }

    // Case-insensitive URL detection and normalize display to lowercase
    const lowerValue = value.toLowerCase();
    if (lowerValue.startsWith("http://") || lowerValue.startsWith("https://")) {
      return (
        <Anchor
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          style={{ wordBreak: "break-word" }}
        >
          <Group gap={4}>
            <IconExternalLink size={ICON_SIZE.SM} />
            <Text size="sm" span>{lowerValue}</Text>
          </Group>
        </Anchor>
      );
    }

    if (isOpenAlexId(value)) {
      const idConverted = convertOpenAlexToInternalLink(value);
      return (
        <Anchor
          component={Link}
          to={idConverted.internalPath}
          c="blue"
          size="sm"
          style={{ wordBreak: "break-word" }}
        >
          <Group gap={4}>
            <IconLink size={ICON_SIZE.SM} />
            <Text size="sm" span>{value}</Text>
          </Group>
        </Anchor>
      );
    }

    return <Text size="sm">{decodeHtmlEntities(value)}</Text>;
  }

  return <Text c="dimmed" fs="italic" size="sm">{String(value)}</Text>;
};

// ============================================================================
// Data Grouping
// ============================================================================

interface SectionData {
  name: string;
  fields: Array<{ key: string; value: unknown }>;
  icon: import("react").ReactNode;
}

/**
 * Check if a value should be displayed (not null, undefined, empty string, or empty array)
 */
const isDisplayableValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
};

/**
 * Fields that should be hidden from display (internal API fields, URLs, debug fields, etc.)
 */
const HIDDEN_FIELDS = new Set([
  // API URLs (not useful for display)
  "works_api_url",
  "cited_by_api_url",
  "ngrams_url",
  "sources_api_url",
  // Internal dates (use publication_date instead)
  "updated_date",
  "created_date",
  // Technical data structures
  "abstract_inverted_index",
  "indexed_in",
  // Internal processing fields (from OpenAlex API)
  "block_key",
  "parsed_longest_name",
  "suffix",
  "nickname",
  "given_name",
  "family_name",
  "middle_name",
  // Other internal fields
  "relevance_score",
  "filter_key",
  "longest_name",
]);

const groupFields = (data: Record<string, unknown>): SectionData[] => {
  const groups: Record<string, Record<string, unknown>> = {
    "Identifiers": {},
    "Basic Information": {},
    "Metrics": {},
    "Relationships": {},
    "Dates": {},
    "Locations & Geo": {},
    "Other": {},
  };

  const identifierKeys = ["id", "ids", "doi", "orcid", "issn", "ror", "mag", "openalex_id", "pmid", "pmcid"];
  const metricKeys = ["cited_by_count", "works_count", "h_index", "i10_index", "counts_by_year", "summary_stats", "fwci", "citation_normalized_percentile", "cited_by_percentile_year"];
  const relationshipKeys = ["authorships", "institutions", "concepts", "topics", "keywords", "grants", "sustainable_development_goals", "mesh", "affiliations", "last_known_institutions", "primary_location", "locations", "best_oa_location", "alternate_host_venues", "x_concepts"];
  const dateKeys = ["publication_date", "publication_year"];
  const geoKeys = ["country_code", "countries_distinct_count", "geo", "latitude", "longitude"];
  const basicKeys = ["display_name", "title", "type", "description", "homepage_url", "image_url", "thumbnail_url", "is_oa", "oa_status", "has_fulltext"];

  Object.entries(data).forEach(([key, value]) => {
    // Skip hidden fields and non-displayable values
    if (HIDDEN_FIELDS.has(key) || !isDisplayableValue(value)) {
      return;
    }

    const lowerKey = key.toLowerCase();
    if (identifierKeys.some(k => lowerKey.includes(k))) {
      groups["Identifiers"][key] = value;
    } else if (metricKeys.some(k => lowerKey.includes(k))) {
      groups["Metrics"][key] = value;
    } else if (relationshipKeys.some(k => lowerKey.includes(k))) {
      groups["Relationships"][key] = value;
    } else if (dateKeys.some(k => lowerKey.includes(k))) {
      groups["Dates"][key] = value;
    } else if (geoKeys.some(k => lowerKey.includes(k))) {
      groups["Locations & Geo"][key] = value;
    } else if (basicKeys.some(k => lowerKey.includes(k))) {
      groups["Basic Information"][key] = value;
    } else {
      groups["Other"][key] = value;
    }
  });

  // Convert to SectionData array, sorted by priority
  return Object.entries(groups)
    .filter(([, fields]) => Object.keys(fields).length > 0)
    .sort(([a], [b]) => (SECTION_PRIORITY[a] ?? 99) - (SECTION_PRIORITY[b] ?? 99))
    .map(([name, fields]) => ({
      name,
      icon: SECTION_ICONS[name] || <IconFile size={ICON_SIZE.MD} />,
      fields: Object.entries(fields).map(([key, value]) => ({ key, value })),
    }));
};

// ============================================================================
// Value Content Renderer
// ============================================================================

const renderValueContent = (value: unknown, fieldName?: string): import("react").ReactNode => {
  // Primitives
  if (value === null || value === undefined || typeof value === "boolean" ||
      typeof value === "number" || typeof value === "string") {
    return renderPrimitiveValue(value, fieldName);
  }

  // Arrays - don't render empty arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }

    // Primitive arrays - inline badges
    if (value.every(item => typeof item !== "object" || item === null)) {
      return (
        <Group wrap="wrap" gap={4}>
          {value.map((item, index) => (
            <Badge key={index} variant="light" color="gray" size="sm">
              {renderPrimitiveValue(item)}
            </Badge>
          ))}
        </Group>
      );
    }

    // Object arrays - vertical list
    // Deduplicate arrays of objects by 'id' field if present
    let itemsToRender = value;
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      const firstItem = value[0] as Record<string, unknown>;
      if ("id" in firstItem) {
        const seenIds = new Set<unknown>();
        itemsToRender = value.filter((item) => {
          const itemObj = item as Record<string, unknown>;
          if (seenIds.has(itemObj.id)) return false;
          seenIds.add(itemObj.id);
          return true;
        });
      }
    }

    return (
      <Stack gap="xs">
        {itemsToRender.map((item, index) => (
          <Paper key={index} withBorder p="sm" radius="sm">
            <Group gap="sm" align="flex-start">
              <Badge circle size="sm" color="blue" variant="light">
                {index + 1}
              </Badge>
              <Box style={{ flex: 1, minWidth: 0 }}>
                {renderValueContent(item, fieldName)}
              </Box>
            </Group>
          </Paper>
        ))}
      </Stack>
    );
  }

  // Objects - key-value pairs
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => isDisplayableValue(val));
    if (entries.length === 0) {
      return null;
    }

    return (
      <Stack gap="xs">
        {entries.map(([key, val]) => (
          <Box key={key}>
            <Text size="xs" fw={600} c="dimmed" mb="xs">
              {humanizeFieldName(key)}
            </Text>
            <Box ml="sm">
              {renderValueContent(val, key)}
            </Box>
          </Box>
        ))}
      </Stack>
    );
  }

  return <Text c="dimmed" fs="italic" size="sm">{String(value)}</Text>;
};

// ============================================================================
// Main Component
// ============================================================================

interface EntityDataDisplayProps {
  data: Record<string, unknown>;
  title?: string;
}

export const EntityDataDisplay = ({ data, title }: EntityDataDisplayProps) => {
  // Group and prepare data
  const sections = groupFields(data);

  // Version comparison for Works
  const workId = typeof data.id === 'string' && data.id.startsWith('W') ? data.id : undefined;
  const shouldShowComparison = Boolean(workId && isDataVersionSelectorVisible());
  const { comparison } = useVersionComparison(workId, shouldShowComparison);

  return (
    <Stack gap="lg">
      {title && (
        <Title order={2}>{title}</Title>
      )}

      {/* Version Comparison Indicator */}
      {shouldShowComparison && comparison && (
        <VersionComparisonIndicator
          currentVersion={comparison.currentVersion}
          referencesCount={comparison.referencesCount}
          locationsCount={comparison.locationsCount}
        />
      )}

      {/* Render sections */}
      {sections.map((section) => (
        <Paper key={section.name} withBorder p="md" radius="md">
          {/* Section header */}
          <Group gap="sm" mb="md">
            {section.icon}
            <Text size="lg" fw={600}>{section.name}</Text>
            <Badge variant="light" color="gray" size="sm">
              {section.fields.length} {section.fields.length === 1 ? "field" : "fields"}
            </Badge>
          </Group>

          <Divider mb="md" />

          {/* Section fields */}
          <Stack gap="md">
            {section.fields.map((field) => (
              <Box key={field.key}>
                <Text size="sm" fw={600} c="blue.7" mb="xs">
                  {humanizeFieldName(field.key)}
                </Text>
                {renderValueContent(field.value)}
              </Box>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};