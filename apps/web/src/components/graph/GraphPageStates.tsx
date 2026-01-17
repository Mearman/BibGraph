/**
 * Graph Page State Components
 *
 * Loading, error, and empty states for the graph page.
 *
 * @module components/graph/GraphPageStates
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

interface GraphLoadingStateProps {
  message?: string;
}

/**
 * Loading state for graph page - shown while data sources are loading
 * @param root0
 * @param root0.message
 */
export const GraphLoadingState: React.FC<GraphLoadingStateProps> = ({
  message = 'Loading data sources...',
}) => (
  <Container size="xl" py="md">
    <Stack align="center" justify="center" h="50vh" gap="md">
      <Loader size="xl" />
      <Text c="dimmed">{message}</Text>
    </Stack>
  </Container>
);

interface GraphErrorStateProps {
  error: Error;
  onRetry: () => void;
}

/**
 * Error state for graph page - shown when data loading fails
 * @param root0
 * @param root0.error
 * @param root0.onRetry
 */
export const GraphErrorState: React.FC<GraphErrorStateProps> = ({
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

interface GraphEmptyStateWithPanelProps {
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
 * @param root0
 * @param root0.variant
 * @param root0.sources
 * @param root0.enabledSourceIds
 * @param root0.onToggleSource
 * @param root0.onEnableAll
 * @param root0.onDisableAll
 * @param root0.onRefresh
 * @param root0.loading
 */
export const GraphEmptyStateWithPanel: React.FC<GraphEmptyStateWithPanelProps> = ({
  variant,
  sources,
  enabledSourceIds,
  onToggleSource,
  onEnableAll,
  onDisableAll,
  onRefresh,
  loading,
}) => (
  <Flex h={`calc(100vh - ${LAYOUT.HEADER_HEIGHT}px)`}>
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
