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
  Collapse,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
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
import type { ReactNode } from "react";
import { useState } from "react";

import { ICON_SIZE } from "@/config/style-constants";
import { useVersionComparison } from "@/hooks/use-version-comparison";
import { decodeHtmlEntities } from "@/utils/decode-html-entities";
import { humanizeFieldName } from "@/utils/field-labels";
import { formatNumber } from "@/utils/format-number";
import { convertOpenAlexToInternalLink, isOpenAlexId } from "@/utils/openalex-link-conversion";

/**
Section priority for consistent ordering
 */
const SECTION_PRIORITY: Record<string, number> = {
  Identifiers: 1,
  "Basic Information": 2,
  Metrics: 3,
  Dates: 4,
  "Locations & Geo": 5,
  Relationships: 6,
  Other: 7,
};

// Sort weight for a section name with no entry in SECTION_PRIORITY, placing it after every known section.
const UNKNOWN_SECTION_PRIORITY = 99;

/**
Section icons mapping. Partial because `name` is derived from a dynamically-built
groups object, so TypeScript cannot guarantee every section name has a dedicated icon.
 */
const SECTION_ICONS: Partial<Record<string, ReactNode>> = {
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

/**
 * Narrows an unknown value to a plain, non-array object.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Narrows an unknown value to an array of unknown elements. `Array.isArray` itself is typed as `(arg: any) => arg is any[]`, so this wrapper is needed to keep the narrowed element type as `unknown` instead of silently reintroducing `any`.
 */
const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

const renderPrimitiveValue = (value: unknown, fieldName?: string): ReactNode => {
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
      // Normalize URL display to lowercase for consistency
      const normalizedUrl = value.toLowerCase();
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
            <Text size="sm" span>{normalizedUrl}</Text>
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

  return <Text c="dimmed" fs="italic" size="sm">{JSON.stringify(value)}</Text>;
};

// ============================================================================
// Data Grouping
// ============================================================================

interface SectionData {
  name: string;
  fields: { key: string; value: unknown }[];
  icon: ReactNode;
}

/**
 * Check if a value should be displayed (not null, undefined, empty string, empty array, or empty object)
 */
const isDisplayableValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  // Check if object has any displayable properties
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return false;
    // Recursively check if any property is displayable
    return entries.some(([, value_]) => isDisplayableValue(value_));
  }
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

  // Preprocess: Remove redundant ids.openalex if it matches the main id field
  const mainId = typeof data.id === "string" ? data.id.toLowerCase() : null;
  const processedData = { ...data };
  if (isRecord(processedData.ids) && mainId !== null) {
    const ids = processedData.ids;
    const openalexId = typeof ids.openalex === "string" ? ids.openalex.toLowerCase() : null;
    if (openalexId !== null && mainId.includes(openalexId.split("/").pop() ?? "")) {
      // Create a copy and remove openalex from ids since it's redundant with main id
      const remainingIds = { ...ids };
      delete remainingIds.openalex;
      if (Object.keys(remainingIds).length > 0) {
        processedData.ids = remainingIds;
      } else {
        // Delete the key entirely if no other ids remain
        delete processedData.ids;
      }
    }
  }

  // Preprocess: Remove last_known_institutions if it duplicates affiliations data
  // For authors, affiliations contains historical data with years, while last_known_institutions
  // is just the current institution(s). When they contain the same institutions, showing both is redundant.
  if (
    Array.isArray(processedData.affiliations) &&
    Array.isArray(processedData.last_known_institutions) &&
    processedData.affiliations.length > 0 &&
    processedData.last_known_institutions.length > 0
  ) {
    // Extract institution IDs from affiliations
    const affiliationIds = new Set(
      processedData.affiliations
        .map((aff) => {
          if (!isRecord(aff)) return undefined;
          const inst = aff.institution;
          return isRecord(inst) ? inst.id : undefined;
        })
        .filter(Boolean)
    );

    // Check if all last_known_institutions are already in affiliations
    const lastKnownIds = processedData.last_known_institutions
      .map((inst) => (isRecord(inst) ? inst.id : undefined))
      .filter(Boolean);

    const isAllLastKnownInAffiliations = lastKnownIds.length > 0 &&
      lastKnownIds.every(id => affiliationIds.has(id));

    if (isAllLastKnownInAffiliations) {
      // Remove last_known_institutions since affiliations already shows this data with more context
      delete processedData.last_known_institutions;
    }
  }

  const identifierKeys = ["id", "ids", "doi", "orcid", "issn", "ror", "mag", "openalex_id", "pmid", "pmcid"];
  const metricKeys = ["cited_by_count", "works_count", "h_index", "i10_index", "counts_by_year", "summary_stats", "fwci", "citation_normalized_percentile", "cited_by_percentile_year"];
  const relationshipKeys = ["authorships", "institutions", "concepts", "topics", "keywords", "grants", "sustainable_development_goals", "mesh", "affiliations", "last_known_institutions", "primary_location", "locations", "best_oa_location", "alternate_host_venues", "x_concepts"];
  const dateKeys = ["publication_date", "publication_year"];
  const geoKeys = ["country_code", "countries_distinct_count", "geo", "latitude", "longitude"];
  const basicKeys = ["display_name", "title", "type", "description", "homepage_url", "image_url", "thumbnail_url", "is_oa", "oa_status", "has_fulltext"];

  for (const [key, value] of Object.entries(processedData)) {
    // Skip hidden fields and non-displayable values
    if (HIDDEN_FIELDS.has(key) || !isDisplayableValue(value)) {
      continue;
    }

    const lowerKey = key.toLowerCase();
    if (identifierKeys.some(k => lowerKey.includes(k))) {
      groups.Identifiers[key] = value;
    } else if (metricKeys.some(k => lowerKey.includes(k))) {
      groups.Metrics[key] = value;
    } else if (relationshipKeys.some(k => lowerKey.includes(k))) {
      groups.Relationships[key] = value;
    } else if (dateKeys.some(k => lowerKey.includes(k))) {
      groups.Dates[key] = value;
    } else if (geoKeys.some(k => lowerKey.includes(k))) {
      groups["Locations & Geo"][key] = value;
    } else if (basicKeys.some(k => lowerKey.includes(k))) {
      groups["Basic Information"][key] = value;
    } else {
      groups.Other[key] = value;
    }
  }

  // Convert to SectionData array, sorted by priority
  return Object.entries(groups)
    .filter(([, fields]) => Object.keys(fields).length > 0)
    .sort(([a], [b]) => (SECTION_PRIORITY[a] ?? UNKNOWN_SECTION_PRIORITY) - (SECTION_PRIORITY[b] ?? UNKNOWN_SECTION_PRIORITY))
    .map(([name, fields]) => ({
      name,
      icon: SECTION_ICONS[name] !== undefined ? SECTION_ICONS[name] : <IconFile size={ICON_SIZE.MD} />,
      fields: Object.entries(fields).map(([key, value]) => ({ key, value })),
    }));
};

// ============================================================================
// Value Content Renderer
// ============================================================================

const renderValueContent = (value: unknown, fieldName?: string): ReactNode => {
  // Primitives
  if (value === null || value === undefined || typeof value === "boolean" ||
      typeof value === "number" || typeof value === "string") {
    return renderPrimitiveValue(value, fieldName);
  }

  // Arrays - don't render empty arrays
  if (isUnknownArray(value)) {
    if (value.length === 0) {
      return null;
    }

    // Primitive arrays - handle inline or as links depending on content
    if (value.every(item => typeof item !== "object" || item === null)) {
      // Check if any items are URLs that need special rendering
      const hasUrls = value.some(item =>
        typeof item === "string" && /^https?:\/\//i.test(item)
      );

      if (hasUrls) {
        // URLs need individual rendering for proper link handling
        return (
          <Group wrap="wrap" gap={4}>
            {value.map((item, index) => (
              <Box key={index}>{renderPrimitiveValue(item)}</Box>
            ))}
          </Group>
        );
      }

      // Non-URL primitives render as badges
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
    const firstItem = value[0];
    if (isRecord(firstItem) && "id" in firstItem) {
      const seenIds = new Set<unknown>();
      itemsToRender = value.filter((item) => {
        if (!isRecord(item)) return true;
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });
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
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, value_]) => isDisplayableValue(value_));
    if (entries.length === 0) {
      return null;
    }

    return (
      <Stack gap="xs">
        {entries.map(([key, value_]) => (
          <Box key={key}>
            <Text size="xs" fw={600} c="dimmed" mb="xs">
              {humanizeFieldName(key)}
            </Text>
            <Box ml="sm">
              {renderValueContent(value_, key)}
            </Box>
          </Box>
        ))}
      </Stack>
    );
  }

  return <Text c="dimmed" fs="italic" size="sm">{JSON.stringify(value)}</Text>;
};

// ============================================================================
// Main Component
// ============================================================================

interface EntityDataDisplayProperties {
  data: Record<string, unknown>;
  title?: string;
}

export const EntityDataDisplay = ({ data, title }: EntityDataDisplayProperties) => {
  // Group and prepare data
  const sections = groupFields(data);

  // Track collapsed state for each section
  // Basic Information and Identifiers are expanded by default, others collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const section of sections) {
      if (section.name !== "Basic Information" && section.name !== "Identifiers") {
        initial.add(section.name);
      }
    }
    return initial;
  });

  const toggleSection = (sectionName: string) => {
    setCollapsedSections(previous => {
      const next = new Set(previous);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  // Version comparison for Works
  const workId = typeof data.id === 'string' && data.id.startsWith('W') ? data.id : undefined;
  const shouldShowComparison = workId !== undefined && isDataVersionSelectorVisible();
  const { comparison } = useVersionComparison(workId, shouldShowComparison);

  return (
    <Stack gap="lg">
      {title !== undefined && title !== "" && (
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
      {sections.map((section) => {
        const isCollapsed = collapsedSections.has(section.name);
        return (
          <Paper key={section.name} withBorder p="md" radius="md">
            {/* Clickable section header */}
            <UnstyledButton
              onClick={() => { toggleSection(section.name); }}
              style={{ width: '100%' }}
              mb="sm"
            >
              <Group gap="sm" justify="space-between" pr="xs">
                <Group gap="sm">
                  {section.icon}
                  <Text size="lg" fw={600}>{section.name}</Text>
                  <Badge variant="light" color="gray" size="sm">
                    {section.fields.length} {section.fields.length === 1 ? "field" : "fields"}
                  </Badge>
                </Group>
                {isCollapsed ? (
                  <IconChevronDown size={ICON_SIZE.MD} color="var(--mantine-color-dimmed)" />
                ) : (
                  <IconChevronUp size={ICON_SIZE.MD} color="var(--mantine-color-dimmed)" />
                )}
              </Group>
            </UnstyledButton>

            <Collapse expanded={!isCollapsed}>
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
            </Collapse>
          </Paper>
        );
      })}
    </Stack>
  );
};