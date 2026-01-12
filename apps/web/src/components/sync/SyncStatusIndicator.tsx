/**
 * Sync Status Indicator Component
 *
 * Displays real-time synchronization status with visual indicators.
 * Shows current state (idle, syncing, success, error, offline) with tooltips.
 */

import { Badge, Box, Group, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCloudOff,
  IconLoader,
  IconX,
} from '@tabler/icons-react';
import { memo, useMemo } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { useSyncStatus } from '@/contexts/SyncStatusContext';

const STATUS_CONFIG = {
  idle: {
    icon: IconCheck,
    color: 'gray',
    label: 'Synced',
    animate: false,
  },
  syncing: {
    icon: IconLoader,
    color: 'blue',
    label: 'Syncing...',
    animate: true,
  },
  success: {
    icon: IconCheck,
    color: 'teal',
    label: 'Synced',
    animate: false,
  },
  error: {
    icon: IconX,
    color: 'red',
    label: 'Sync error',
    animate: false,
  },
  offline: {
    icon: IconCloudOff,
    color: 'orange',
    label: 'Offline',
    animate: false,
  },
} as const;

export const SyncStatusIndicator = memo(() => {
  const { syncStatus, clearCompleted } = useSyncStatus();
  const { overall, operations } = syncStatus;

  const config = STATUS_CONFIG[overall];
  const Icon = config.icon;
  const hasErrors = operations.some((op) => op.status === 'error');

  // Get active operations count
  const activeCount = useMemo(() => {
    return operations.filter((op) => op.status === 'syncing').length;
  }, [operations]);

  // Get error messages
  const errorMessages = useMemo(() => {
    return operations
      .filter((op) => op.status === 'error')
      .map((op) => `${op.name}: ${op.error?.message || 'Unknown error'}`)
      .slice(0, 3);
  }, [operations]);

  const label = activeCount > 0
    ? `Syncing ${activeCount} operation${activeCount > 1 ? 's' : ''}...`
    : config.label;

  return (
    <Tooltip
      withinPortal
      label={
        <Stack gap={4} p="xs">
          <Group gap="xs">
            <Icon size={ICON_SIZE.SM} />
            <Text size="sm" fw={500}>
              {label}
            </Text>
          </Group>

          {hasErrors && (
            <Stack gap={2}>
              <Text size="xs" c="red">
                Errors:
              </Text>
              {errorMessages.map((msg, i) => (
                <Text key={i} size="xs" c="red">
                  • {msg}
                </Text>
              ))}
            </Stack>
          )}

          {operations.length > 0 && (
            <Text size="xs" c="dimmed">
              {operations.length} operation{operations.length > 1 ? 's' : ''} in history
            </Text>
          )}

          {hasErrors && (
            <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
              Click to clear completed operations
            </Text>
          )}
        </Stack>
      }
      multiline
    >
      <UnstyledButton
        onClick={clearCompleted}
        aria-label={`Sync status: ${label}`}
      >
        <Badge
          leftSection={
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                animation: config.animate ? 'spin 1s linear infinite' : undefined,
              }}
            >
              <Icon size={ICON_SIZE.SM} />
            </Box>
          }
          color={config.color}
          variant="light"
          size="lg"
        >
          {label}
        </Badge>
      </UnstyledButton>
    </Tooltip>
  );
});

SyncStatusIndicator.displayName = 'SyncStatusIndicator';

export default SyncStatusIndicator;
