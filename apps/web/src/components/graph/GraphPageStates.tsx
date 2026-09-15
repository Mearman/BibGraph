/**
 * Graph Page State Components
 *
 * Loading, error, and empty states for the graph page.
 */

import type { GraphDataSourceState } from '@bibgraph/utils';
import {
  Alert,
  Button,
  Container,
  Flex,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import type React from 'react';

import { ICON_SIZE, LAYOUT } from '@/config/style-constants';

import { GraphEmptyState } from './GraphEmptyState';
import { GraphSourcePanel } from './GraphSourcePanel';

interface GraphLoadingStateProperties {
  message?: string;
}

/**
 * Loading state for graph page - shown while data sources are loading
 */
export const GraphLoadingState: React.FC<GraphLoadingStateProperties> = ({
  message = 'Loading data sources...',
}) => (
  <Container size="xl" py="md">
    <Stack align="center" justify="center" h="50vh" gap="md">
      <Loader size="xl" />
      <Text c="dimmed">{message}</Text>
    </Stack>
  </Container>
);

interface GraphErrorStateProperties {
  error: Error;
  onRetry: () => void;
}

/**
 * Error state for graph page - shown when data loading fails
 */
export const GraphErrorState: React.FC<GraphErrorStateProperties> = ({
  error,
  onRetry,
}) => (
  <Container size="xl" py="md">
    <Alert icon={<IconAlertTriangle size={ICON_SIZE.MD} />} title="Error Loading Data" color="red">
      <Stack gap="sm">
        <Text>{error.message}</Text>
        <Button
          variant="outline"
          color="red"
          size="xs"
          leftSection={<IconRefresh size={ICON_SIZE.SM} />}
          onClick={onRetry}
        >
          Retry
        </Button>
      </Stack>
    </Alert>
  </Container>
);

interface GraphEmptyStateWithPanelProperties {
  variant: 'no-sources' | 'no-entities';
  sources: GraphDataSourceState[];
  enabledSourceIds: Set<string>;
  onToggleSource: (id: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onRefresh: () => void;
  loading: boolean;
}

/**
 * Empty state with source panel - shown when no sources are enabled or no entities exist
 */
export const GraphEmptyStateWithPanel: React.FC<GraphEmptyStateWithPanelProperties> = ({
  variant,
  sources,
  enabledSourceIds,
  onToggleSource,
  onEnableAll,
  onDisableAll,
  onRefresh,
  loading,
}) => (
  <Flex h={`calc(100vh - ${String(LAYOUT.HEADER_HEIGHT)}px)`}>
    <GraphSourcePanel
      sources={sources}
      enabledSourceIds={enabledSourceIds}
      onToggleSource={onToggleSource}
      onEnableAll={onEnableAll}
      onDisableAll={onDisableAll}
      onRefresh={onRefresh}
      loading={loading}
    />
    <Container size="md" py="xl" flex={1}>
      <GraphEmptyState
        variant={variant}
        availableSourceCount={variant === 'no-sources' ? sources.length : 0}
      />
    </Container>
  </Flex>
);
