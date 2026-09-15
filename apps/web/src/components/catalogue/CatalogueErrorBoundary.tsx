/**
 * Catalogue Error Boundary
 *
 * Wraps PostHog's official ErrorBoundary with custom fallback UI
 * for catalogue components. Provides user-friendly error display
 * with automatic error tracking to PostHog.
 */

import { useScreenReader } from "@bibgraph/ui";
import {
  Alert,
  Button,
  Card,
  Code,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import type { PostHogErrorBoundaryFallbackProps } from "@posthog/react";
import { PostHogErrorBoundary } from "@posthog/react";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import type { FunctionComponent,ReactNode} from "react";
import React, {useEffect } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';

interface CatalogueErrorBoundaryProperties {
  children: ReactNode;
  /**
  Optional custom fallback component
   */
  fallback?: FunctionComponent<PostHogErrorBoundaryFallbackProps>;
}

/**
 * Custom fallback component for catalogue errors
 * Provides detailed error information and recovery actions
 */
const CatalogueFallback = ({
  error,
}: PostHogErrorBoundaryFallbackProps) => {
  // Convert unknown error to Error for display
  const errorObject = error instanceof Error ? error : new Error(String(error));

  // Accessibility: announce error to screen readers
  const { announceAction } = useScreenReader();

  useEffect(() => {
    // Announce the error when component mounts
    announceAction(
      'Error occurred',
      `Catalogue error: ${errorObject.message || "Unknown error occurred"}`
    );
  }, [errorObject.message, announceAction]);

  return (
    <Card
      style={{ border: BORDER_STYLE_GRAY_3 }}
      p="xl"
      bg="red.0"
      role="alert"
      aria-live="assertive"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <Stack gap="md">
        <Group>
          <IconAlertTriangle size={ICON_SIZE.EMPTY_STATE_SM} color="var(--mantine-color-red-6)" />
          <div>
            <Text
              id="error-title"
              size="lg"
              fw={600}
              c="red"
            >
              Catalogue Error
            </Text>
            <Text
              id="error-description"
              size="sm"
              c="dimmed"
            >
              Something went wrong while loading the catalogue
            </Text>
          </div>
        </Group>

        <Alert color="red" variant="light">
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Error Details:
            </Text>
            <Code block color="red">
              {errorObject.message || "Unknown error occurred"}
            </Code>
          </Stack>
        </Alert>

        {process.env.NODE_ENV === "development" && errorObject.stack !== undefined && (
          <Alert color="yellow" variant="light">
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Stack Trace (Development Only):
              </Text>
              <Code
                block
                color="yellow"
                style={{ maxHeight: "200px", overflow: "auto" }}
              >
                {errorObject.stack}
              </Code>
            </Stack>
          </Alert>
        )}

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            This error has been automatically reported to PostHog for analysis.
            Please reload the page to continue.
          </Text>
        </Group>

        <Group>
          <Button
            variant="subtle"
            onClick={() => { window.location.reload(); }}
            size="sm"
            leftSection={<IconRefresh size={ICON_SIZE.MD} />}
          >
            Reload Page
          </Button>
          <Button
            variant="subtle"
            onClick={() => { window.history.back(); }}
            size="sm"
          >
            Go Back
          </Button>
        </Group>
      </Stack>
    </Card>
  );
};

/**
 * Catalogue Error Boundary Component
 *
 * Uses PostHog's official ErrorBoundary with custom fallback UI.
 * Automatically tracks errors to PostHog for analytics and debugging.
 * Accepts the components to wrap plus an optional custom fallback component (defaults to CatalogueFallback).
 */
export const CatalogueErrorBoundary = ({
  children,
  fallback,
}: CatalogueErrorBoundaryProperties) => <PostHogErrorBoundary fallback={fallback ?? CatalogueFallback}>
      {children}
    </PostHogErrorBoundary>;
