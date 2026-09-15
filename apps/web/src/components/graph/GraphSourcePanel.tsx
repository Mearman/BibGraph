/**
 * GraphSourcePanel - Collapsible sidebar for toggling graph data sources
 *
 * Displays available data sources (catalogue lists, caches) with toggle switches
 * and entity counts. Sources are grouped by category.
 */

import type { GraphDataSourceState } from '@bibgraph/utils';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDatabase,
  IconList,
  IconRefresh,
  IconServer,
} from '@tabler/icons-react';
import { useCallback,useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

export interface GraphSourcePanelProps {
  /**
  Available data sources with their state
   */
  sources: GraphDataSourceState[];

  /**
  Set of enabled source IDs
   */
  enabledSourceIds: Set<string>;

  /**
  Toggle a single source
   */
  onToggleSource: (sourceId: string) => void;

  /**
  Enable all sources
   */
  onEnableAll: () => void;

  /**
  Disable all sources
   */
  onDisableAll: () => void;

  /**
  Refresh all data
   */
  onRefresh: () => void;

  /**
  Whether data is loading
   */
  loading?: boolean;
}

/**
 * Get icon for a source based on its ID
 */
const getSourceIcon = (sourceId: string) => {
  if (sourceId === 'catalogue:bookmarks') return IconBookmark;
  if (sourceId === 'catalogue:history') return IconClock;
  if (sourceId.startsWith('catalogue:')) return IconList;
  if (sourceId === 'cache:indexeddb') return IconDatabase;
  if (sourceId === 'cache:memory') return IconServer;
  if (sourceId === 'cache:static') return IconServer;
  return IconList;
};

/**
 * Single source toggle row
 */
const SourceToggle = ({
  state,
  enabled,
  onToggle,
}: {
  state: GraphDataSourceState;
  enabled: boolean;
  onToggle: () => void;
}) => {
  const Icon = getSourceIcon(state.source.id);
  const count = state.entityCount;

  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Icon size={ICON_SIZE.MD} style={{ flexShrink: 0 }} />
        <Text size="sm" truncate style={{ flex: 1 }}>
          {state.source.label}
        </Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        {count !== null && (
          <Badge size="sm" variant="light" color={enabled ? 'blue' : 'gray'}>
            {count}
          </Badge>
        )}
        <Switch
          size="xs"
          checked={enabled}
          onChange={onToggle}
          aria-label={`Toggle ${state.source.label}`}
        />
      </Group>
    </Group>
  );
};

/**
 * Source category section
 */
const SourceCategory = ({
  title,
  sources,
  enabledIds,
  onToggle,
}: {
  title: string;
  sources: GraphDataSourceState[];
  enabledIds: Set<string>;
  onToggle: (sourceId: string) => void;
}) => {
  if (sources.length === 0) return null;

  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {title}
      </Text>
      {sources.map((state) => (
        <SourceToggle
          key={state.source.id}
          state={state}
          enabled={enabledIds.has(state.source.id)}
          onToggle={() => { onToggle(state.source.id); }}
        />
      ))}
    </Stack>
  );
};

/**
 * Collapsible panel for graph data source toggles
 */
export const GraphSourcePanel = ({
  sources,
  enabledSourceIds,
  onToggleSource,
  onEnableAll,
  onDisableAll,
  onRefresh,
  loading = false,
}: GraphSourcePanelProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => !previous);
  }, []);

  // Group sources by category
  const catalogueSources = sources.filter((s) => s.source.category === 'catalogue');
  const cacheSources = sources.filter((s) => s.source.category === 'cache');

  // Count totals
  const enabledCount = sources.filter((s) => enabledSourceIds.has(s.source.id)).length;
  const totalCount = sources.length;

  if (collapsed) {
    return (
      <Paper
        shadow="sm"
        p="xs"
        withBorder
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 10,
        }}
      >
        <Tooltip label="Show data sources" position="right">
          <ActionIcon variant="subtle" onClick={toggleCollapsed}>
            <IconChevronRight size={ICON_SIZE.LG} />
          </ActionIcon>
        </Tooltip>
      </Paper>
    );
  }

  return (
    <Paper
      shadow="sm"
      p="md"
      withBorder
      style={{
        width: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Text fw={600} size="sm">
            Data Sources
          </Text>
          <Badge size="xs" variant="light">
            {enabledCount}/{totalCount}
          </Badge>
        </Group>
        <Group gap={4}>
          <Tooltip label="Refresh">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={onRefresh}
              loading={loading}
            >
              <IconRefresh size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Collapse panel">
            <ActionIcon variant="subtle" size="sm" onClick={toggleCollapsed}>
              <IconChevronLeft size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Quick actions */}
      <Group gap="xs" mb="md">
        <Button
          size="xs"
          variant="light"
          onClick={onEnableAll}
          disabled={enabledCount === totalCount}
        >
          Enable All
        </Button>
        <Button
          size="xs"
          variant="light"
          color="gray"
          onClick={onDisableAll}
          disabled={enabledCount === 0}
        >
          Disable All
        </Button>
      </Group>

      <Divider mb="md" />

      {/* Source list */}
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <Stack gap="md">
          <SourceCategory
            title="Catalogue Lists"
            sources={catalogueSources}
            enabledIds={enabledSourceIds}
            onToggle={onToggleSource}
          />

          {cacheSources.length > 0 && catalogueSources.length > 0 && (
            <Divider />
          )}

          <SourceCategory
            title="Caches"
            sources={cacheSources}
            enabledIds={enabledSourceIds}
            onToggle={onToggleSource}
          />
        </Stack>
      </ScrollArea>

      {/* Footer info */}
      <Box mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Text size="xs" c="dimmed">
          Toggle sources to show/hide their entities on the graph. Relationships are shown between all visible entities.
        </Text>
      </Box>
    </Paper>
  );
};
