/**
 * Honest surface for a sub-panel load that outlived the shared stall bound: the spinner stops implying progress is imminent, the copy says what is known (still waiting, a server problem when the transport says so, throttling named on HTTP 429) and Retry re-runs the load. The transport's own retries and backoff are still running underneath; this surface replaces the wait, not the request.
 */

import { Button, Group, Stack, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

import { ICON_SIZE } from '@/config/style-constants';
import { useSyncStatus } from '@/contexts/SyncStatusContext';
import { serverErrorMessage } from '@/lib/connectivity';

interface StalledLoadNoticeProperties {
  /**
  Re-run the load this surface replaced; optional so panels without a retry handle can still show the honest copy
   */
  onRetry?: () => void;
}

export const StalledLoadNotice = ({ onRetry }: StalledLoadNoticeProperties) => {
  const { syncStatus } = useSyncStatus();

  // A stall while the server is answering with HTTP errors is a server problem (throttling included), not a connectivity one; the wording must not claim the data is unavailable offline when the transport knows better
  const stalledOutcome = syncStatus.lastRequestOutcome;
  const detail = stalledOutcome !== null && stalledOutcome.kind === 'http-error'
    ? serverErrorMessage(stalledOutcome)
    : 'It will load when the connection returns.';

  return (
    <Stack gap="sm" py="xl" data-testid="subpanel-stalled-state" role="status">
      <Text size="sm" c="dimmed" ta="center" fw={500}>
        Still waiting on the server.
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        {detail}
      </Text>
      {onRetry !== undefined && (
        <Group justify="center">
          <Button
            variant="light"
            size="xs"
            leftSection={<IconRefresh size={ICON_SIZE.SM} />}
            aria-label="Retry loading"
            onClick={onRetry}
          >
            Retry
          </Button>
        </Group>
      )}
    </Stack>
  );
};
