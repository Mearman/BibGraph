import { isEntityType } from "@bibgraph/types";
import { useLiveRegion } from "@bibgraph/ui";
import { logger } from "@bibgraph/utils";
import { Alert, Button, Code, Container, Flex, Group, Loader, Paper, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle, IconRefresh, IconWifiOff } from "@tabler/icons-react";
import React, { useEffect,useRef,useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE, LOADING_CONSTANTS } from "@/config/style-constants";
import { useSyncStatus } from "@/contexts/SyncStatusContext";
import { serverErrorMessage } from "@/lib/connectivity";

import type { EntityTypeConfig } from "./EntityTypeConfig";
import { getMantineColor } from "./EntityTypeConfig";

interface LoadingStateProperties {
  entityType: string;
  entityId: string;
  config: EntityTypeConfig;
  operation?: string;
  onRetry?: () => void;
}

export const LoadingState = ({
  entityType,
  entityId,
  config: _config,
  operation = "load",
  onRetry
}: LoadingStateProperties) => {
  // Elapsed time is tracked only to drive the stall flip; it is never shown, because the component cannot know the request's real progress
  const [timeElapsed, setTimeElapsed] = useState(0);
  const loaderColor = isEntityType(entityType) ? getMantineColor(entityType) : 'blue';

  // Accessibility hooks
  const { announce, LiveRegionComponent } = useLiveRegion();
  const loadingElementRef = useRef<HTMLDivElement>(null);
  const { syncStatus } = useSyncStatus();

  // An unresolved load past the stall timeout is treated as failed. Derived rather than stored so the flip cannot desynchronise from elapsed time
  const isStalled = timeElapsed >= LOADING_CONSTANTS.STALL_TIMEOUT_MS;
  const stallAnnouncedRef = useRef(false);

  // A stall while the server is answering with HTTP errors is a server problem (throttling included), not a connectivity one; the wording must not claim the record is unavailable offline when the transport knows better
  const stalledOutcome = isStalled ? syncStatus.lastRequestOutcome : null;
  const isHttpErrorStall = stalledOutcome?.kind === 'http-error';
  const stalledHeadline = isHttpErrorStall ? 'The server could not serve this record.' : 'This record is not available offline.';
  const stalledDetail = stalledOutcome !== null && stalledOutcome.kind === 'http-error' ? serverErrorMessage(stalledOutcome) : 'It will load when the connection returns.';

  // Announce loading once, politely: no percentage or step announcements, since any number would be fabricated
  useEffect(() => {
    announce(`Loading ${entityType}.`, 'polite');
  }, [entityType, announce]);

  // Announce the stall to screen readers exactly once, with the same wording the panel shows
  useEffect(() => {
    if (isStalled && !stallAnnouncedRef.current) {
      stallAnnouncedRef.current = true;
      announce(
        `Loading ${entityType} is taking longer than expected. ${stalledHeadline} ${stalledDetail}`,
        'assertive'
      );
    }
  }, [isStalled, entityType, announce, stalledHeadline, stalledDetail]);

  // Count elapsed time, bounded by the stall timeout: once stalled the effect schedules no further ticks
  useEffect(() => {
    if (isStalled) {
      return undefined;
    }
    const interval = setInterval(() => {
      // Functional update so elapsed keeps climbing even when React batches multiple ticks together
      setTimeElapsed(previous => previous + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    }, LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);

    return () => { clearInterval(interval); };
  }, [isStalled]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Fallback: reload the current page
      window.location.reload();
    }
  };

  // Debug logging
  logger.debug("ui", "LoadingState rendering", {
    entityType,
    operation,
    isStalled,
  });

  // Stalled surface: no fabricated progress, no elapsed/estimated readout, just the honest offline message and a retry action
  if (isStalled) {
    return (
      <>
        <LiveRegionComponent />
        <Container size="md" p="xl" data-testid="loading-stalled-state" role="alert">
          <Flex h="100vh" justify="center" align="center">
            <Paper p="xl" radius="xl" style={{ border: BORDER_STYLE_GRAY_3 }} w="100%" maw="48rem">
              <Stack gap="lg">
                <Group justify="center" mb="md">
                  <Alert variant="light" color={isHttpErrorStall ? 'red' : 'orange'} radius="xl" p="lg" w="fit-content">
                    {isHttpErrorStall ? <IconAlertCircle size={ICON_SIZE.HERO} /> : <IconWifiOff size={ICON_SIZE.HERO} />}
                  </Alert>
                </Group>
                <Title order={2} ta="center">
                  {stalledHeadline}
                </Title>
                <Text size="sm" c="dimmed" ta="center">
                  {stalledDetail}
                </Text>
                <Group justify="center" gap="md" mt="md">
                  <Button
                    variant="filled"
                    color="blue"
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleRetry}
                  >
                    Retry
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Flex>
        </Container>
      </>
    );
  }

  return (
    <>
      {/* Live region for screen reader announcements */}
      <LiveRegionComponent />
      <Container
        size="md"
        p="xl"
        data-testid="loading-state"
        ref={loadingElementRef}
        role="status"
        aria-live="polite"
        aria-label={`Loading ${entityType}`}
      >
        <Flex h="100vh" justify="center" align="center">
          <Paper
            p="xl"
            radius="xl"
            style={{ border: BORDER_STYLE_GRAY_3 }}
            w="100%"
            maw="48rem"
          >
          <Stack gap="xl">
            {/* Header: spinner and the operation, nothing the component cannot know (no percentage, steps or time estimates) */}
            <Group justify="center" gap="md">
              <Loader size="xl" color={loaderColor} />
              <div>
                <Title order={2} c={loaderColor}>
                  {operation === 'load' ? 'Loading' : operation} {entityType}...
                </Title>
              </div>
            </Group>

            {/* Entity Information */}
            <Stack gap="xs" w="100%">
              <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {entityType} ID:
              </Text>
              <Code style={{ wordBreak: "break-all" }}>
                {entityId}
              </Code>
            </Stack>

            {/* Content Preview Skeleton */}
            <Stack gap="md">
              <Text size="sm" fw={500} c="dimmed">Preview:</Text>
              <Stack gap="xs">
                {/* Title skeleton */}
                <Skeleton height={24} width="60%" radius="md" />

                {/* Metadata skeleton */}
                <Group gap="sm">
                  <Skeleton height={16} width="20%" radius="sm" />
                  <Skeleton height={16} width="15%" radius="sm" />
                  <Skeleton height={16} width="25%" radius="sm" />
                </Group>

                {/* Description skeleton */}
                <Skeleton height={12} width="100%" radius="sm" />
                <Skeleton height={12} width="95%" radius="sm" />
                <Skeleton height={12} width="85%" radius="sm" />
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Flex>
    </Container>
    </>
  );
};
