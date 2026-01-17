/**
 * Search results view components (Table, Card, List)
 */
import type { AutocompleteResult } from "@bibgraph/types";
import { convertToRelativeUrl } from "@bibgraph/ui";
import { formatLargeNumber } from "@bibgraph/utils";
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconGraph } from "@tabler/icons-react";

import { ICON_SIZE } from "@/config/style-constants";

import { getEntityTypeColor } from "./search-page-types";

interface SearchResultViewProps {
  results: AutocompleteResult[];
  isInGraph: (entityId: string) => boolean;
  onToggleGraph: (result: AutocompleteResult, e?: React.MouseEvent) => void;
  graphLoading: boolean;
}

/**
 * Table view for search results
 * @param root0
 * @param root0.results
 * @param root0.isInGraph
 * @param root0.onToggleGraph
 * @param root0.graphLoading
 */
export const SearchResultsTableView = ({
  results,
  isInGraph,
  onToggleGraph,
  graphLoading,
}: SearchResultViewProps) => (
  <Table striped highlightOnHover withTableBorder>
    <Table.Thead>
      <Table.Tr>
        <Table.Th w={100}>Type</Table.Th>
        <Table.Th>Name</Table.Th>
        <Table.Th w={100}>Citations</Table.Th>
        <Table.Th w={100}>Works</Table.Th>
        <Table.Th w={50}>Graph</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {results.map((result) => {
        const entityUrl = convertToRelativeUrl(result.id);
        const inGraph = isInGraph(result.id);
        return (
          <Table.Tr key={result.id}>
            <Table.Td>
              <Badge size="sm" color={getEntityTypeColor(result.entity_type)} variant="light">
                {result.entity_type}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Stack gap={2}>
                {entityUrl ? (
                  <Anchor
                    href={entityUrl}
                    size="sm"
                    fw={500}
                    style={{ textDecoration: "none" }}
                  >
                    {result.display_name}
                  </Anchor>
                ) : (
                  <Text size="sm" fw={500}>{result.display_name}</Text>
                )}
                {result.hint && (
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {result.hint}
                  </Text>
                )}
              </Stack>
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw={500}>
                {result.cited_by_count ? formatLargeNumber(result.cited_by_count) : '-'}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">
                {result.works_count ? formatLargeNumber(result.works_count) : '-'}
              </Text>
            </Table.Td>
            <Table.Td>
              <Tooltip label={inGraph ? "Remove from graph" : "Add to graph"} position="bottom">
                <ActionIcon
                  size="sm"
                  variant={inGraph ? "filled" : "light"}
                  color="grape"
                  onClick={(e) => { onToggleGraph(result, e); }}
                  loading={graphLoading}
                  aria-label={inGraph ? "Remove from graph" : "Add to graph"}
                >
                  <IconGraph size={ICON_SIZE.XS} />
                </ActionIcon>
              </Tooltip>
            </Table.Td>
          </Table.Tr>
        );
      })}
    </Table.Tbody>
  </Table>
);

/**
 * Card view for search results
 * @param root0
 * @param root0.results
 * @param root0.isInGraph
 * @param root0.onToggleGraph
 * @param root0.graphLoading
 */
export const SearchResultsCardView = ({
  results,
  isInGraph,
  onToggleGraph,
  graphLoading,
}: SearchResultViewProps) => (
  <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }} spacing="md">
    {results.map((result) => {
      const entityUrl = convertToRelativeUrl(result.id);
      const inGraph = isInGraph(result.id);
      return (
        <Card
          key={result.id}
          shadow="sm"
          p="md"
          withBorder
          style={{ cursor: 'pointer', position: 'relative' }}
          component={entityUrl ? "a" : "div"}
          href={entityUrl}
        >
          <Stack gap="xs">
            <Group justify="space-between" align="start">
              <Badge size="sm" color={getEntityTypeColor(result.entity_type)} variant="light">
                {result.entity_type}
              </Badge>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {result.cited_by_count ? `${formatLargeNumber(result.cited_by_count)} citations` : '-'}
                </Text>
                <Tooltip label={inGraph ? "Remove from graph" : "Add to graph"} position="bottom">
                  <ActionIcon
                    size="sm"
                    variant={inGraph ? "filled" : "light"}
                    color="grape"
                    onClick={(e) => { onToggleGraph(result, e); }}
                    loading={graphLoading}
                    aria-label={inGraph ? "Remove from graph" : "Add to graph"}
                  >
                    <IconGraph size={ICON_SIZE.XS} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            <Text size="sm" fw={500} lineClamp={2}>
              {result.display_name}
            </Text>
            {result.hint && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {result.hint}
              </Text>
            )}
          </Stack>
        </Card>
      );
    })}
  </SimpleGrid>
);

/**
 * List view for search results
 * @param root0
 * @param root0.results
 * @param root0.isInGraph
 * @param root0.onToggleGraph
 * @param root0.graphLoading
 */
export const SearchResultsListView = ({
  results,
  isInGraph,
  onToggleGraph,
  graphLoading,
}: SearchResultViewProps) => (
  <Stack gap="xs">
    {results.map((result) => {
      const entityUrl = convertToRelativeUrl(result.id);
      const inGraph = isInGraph(result.id);
      return (
        <Paper
          key={result.id}
          withBorder
          p="sm"
          radius="md"
          style={{ cursor: 'pointer' }}
          component={entityUrl ? "a" : "div"}
          href={entityUrl}
        >
          <Group justify="space-between" align="center">
            <Group gap="sm" align="start" style={{ flex: 1 }}>
              <Badge size="xs" color={getEntityTypeColor(result.entity_type)} variant="light">
                {result.entity_type}
              </Badge>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  {result.display_name}
                </Text>
                {result.hint && (
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {result.hint}
                  </Text>
                )}
              </Stack>
            </Group>
            <Group gap="md">
              {result.cited_by_count && (
                <Text size="xs" c="dimmed" ta="right">
                  {formatLargeNumber(result.cited_by_count)} citations
                </Text>
              )}
              {result.works_count && (
                <Text size="xs" c="dimmed" ta="right">
                  {formatLargeNumber(result.works_count)} works
                </Text>
              )}
              <Tooltip label={inGraph ? "Remove from graph" : "Add to graph"} position="bottom">
                <ActionIcon
                  size="sm"
                  variant={inGraph ? "filled" : "light"}
                  color="grape"
                  onClick={(e) => { onToggleGraph(result, e); }}
                  loading={graphLoading}
                  aria-label={inGraph ? "Remove from graph" : "Add to graph"}
                >
                  <IconGraph size={ICON_SIZE.XS} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Paper>
      );
    })}
  </Stack>
);
