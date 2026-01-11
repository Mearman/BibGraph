/**
 * Shared component for entity-specific autocomplete pages
 *
 * Renders the complete autocomplete UI including:
 * - Header with title and description
 * - Search input
 * - Entity type filter
 * - Loading, error, empty, and results states
 * - Result cards with entity details
 *
 * Used by all 7 entity-specific autocomplete routes to eliminate duplication.
 */

import type { AutocompleteResult, EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import {
  Alert,
  Anchor,
  Badge,
  Card,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconInfoCircle, IconSearch } from "@tabler/icons-react";

import { AutocompleteEntityFilter } from "@/components/AutocompleteEntityFilter";
import { BORDER_STYLE_GRAY_3 } from "@/config/style-constants";
import { decodeHtmlEntities } from "@/utils/decode-html-entities";

export interface AutocompletePageProps {
  /** The entity type this page is for */
  entityType: EntityType;
  /** Current search query */
  query: string;
  /** Handler for search input changes */
  onSearch: (value: string) => void;
  /** Autocomplete results */
  results: AutocompleteResult[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Active filter from URL (optional) */
  filter?: string;
  /** Custom placeholder text (optional) */
  placeholder?: string;
  /** Custom description text (optional) */
  description?: string;
}

/**
 * Extract error message for display
 * @param error
 * @param entityType
 */
const formatErrorMessage = (error: Error, entityType: EntityType): string => {
  const metadata = ENTITY_METADATA[entityType];
  const pattern = new RegExp(`(?:${metadata.plural}|${metadata.displayName}) autocomplete failed: (.+)`, "i");
  const match = error.message.match(pattern);
  return match ? match[1] : error.message;
};

/**
 * Shared autocomplete page component
 * @param root0
 * @param root0.entityType
 * @param root0.query
 * @param root0.onSearch
 * @param root0.results
 * @param root0.isLoading
 * @param root0.error
 * @param root0.filter
 * @param root0.placeholder
 * @param root0.description
 */
export const AutocompletePage = ({
  entityType,
  query,
  onSearch,
  results,
  isLoading,
  error,
  filter,
  placeholder,
  description,
}: AutocompletePageProps) => {
  const metadata = ENTITY_METADATA[entityType];

  const defaultPlaceholder = `Search for ${metadata.plural.toLowerCase()}...`;
  const defaultDescription = `Search for ${metadata.plural.toLowerCase()} with real-time suggestions from the OpenAlex database`;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1}>Autocomplete {metadata.plural}</Title>
          <Text c="dimmed" size="sm" mt="xs">
            {description || defaultDescription}
          </Text>
        </div>

        {/* Search Input */}
        <TextInput
          placeholder={placeholder || defaultPlaceholder}
          value={query}
          onChange={(event) => onSearch(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="md"
        />

        {/* Entity Type Filter */}
        <AutocompleteEntityFilter
          query={query}
          selectedTypes={[entityType]}
          inline
        />

        {/* Active Filter Alert */}
        {filter && (
          <Alert icon={<IconInfoCircle />} title="Active Filters" color="blue">
            <Text size="sm">Filter: {filter}</Text>
          </Alert>
        )}

        {/* Empty State (no query) */}
        {!query.trim() && (
          <Card style={{ border: BORDER_STYLE_GRAY_3 }}>
            <Stack align="center" py="xl">
              <Text size="lg" fw={500}>
                Enter a search term to see suggestions
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Start typing to get real-time autocomplete suggestions for{" "}
                {metadata.plural.toLowerCase()}
              </Text>
            </Stack>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && query.trim() && (
          <Text ta="center" py="xl">
            Loading suggestions...
          </Text>
        )}

        {/* Error State */}
        {error && (
          <Alert
            icon={<IconInfoCircle />}
            title="API Error"
            color="red"
            variant="light"
          >
            <Stack gap="xs">
              <Text size="sm">{formatErrorMessage(error, entityType)}</Text>
            </Stack>
          </Alert>
        )}

        {/* No Results State */}
        {!isLoading && results.length === 0 && query.trim() && (
          <Alert
            icon={<IconInfoCircle />}
            title="No results"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              No {metadata.plural.toLowerCase()} found matching &quot;{query}&quot;.
              Try different search terms.
            </Text>
          </Alert>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Found {results.length} suggestion{results.length === 1 ? "" : "s"}
            </Text>
            {results.map((result) => (
              <AutocompleteResultCard
                key={result.id}
                result={result}
                entityType={entityType}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
};

/**
 * Individual result card component
 */
interface AutocompleteResultCardProps {
  result: AutocompleteResult;
  entityType: EntityType;
}

const AutocompleteResultCard = ({ result, entityType }: AutocompleteResultCardProps) => {
  const metadata = ENTITY_METADATA[entityType];
  const cleanId = result.id.replace("https://openalex.org/", "");
  const href = `#${metadata.routePath}/${cleanId}`;

  return (
    <Card style={{ border: BORDER_STYLE_GRAY_3 }} padding="md" shadow="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Anchor href={href} fw={500} size="md">
            {decodeHtmlEntities(result.display_name ?? "")}
          </Anchor>
          <Badge size="sm" variant="light" color={metadata.color}>
            {metadata.displayName}
          </Badge>
        </Group>

        {result.hint && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {decodeHtmlEntities(result.hint)}
          </Text>
        )}

        <Group gap="md">
          {result.cited_by_count !== undefined && result.cited_by_count !== null && (
            <Text size="xs" c="dimmed">
              Citations: {result.cited_by_count.toLocaleString()}
            </Text>
          )}
          {result.works_count !== undefined && result.works_count !== null && (
            <Text size="xs" c="dimmed">
              Works: {result.works_count.toLocaleString()}
            </Text>
          )}
        </Group>

        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {result.id}
        </Text>
      </Stack>
    </Card>
  );
};
