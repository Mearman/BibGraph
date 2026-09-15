import { logger } from "@bibgraph/utils/logger";
import { Alert, Button, Container, Group,Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconHome,IconRefresh } from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import React from "react";

import { ICON_SIZE } from "@/config/style-constants";

// PostHog type for window object
interface PostHogInstance {
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    posthog?: PostHogInstance;
  }
}

/**
 * Router Error Component
 * Handles TanStack Router errors at the route level
 * This prevents the router from intercepting errors that should go to GlobalErrorBoundary
 */
export const RouterErrorComponent: React.FC<ErrorComponentProps> = ({
  error,
  reset,
  info,
}) => {
  // Utility function for user agent grouping
  const getUserAgentGroup = (): string => {
    if (typeof navigator === 'undefined') return 'unknown';
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'other';
  };

  // Log the router error with PostHog analytics
  React.useEffect(() => {
    logger.error(
      "routing",
      "TanStack Router error",
      {
        error: error.message,
        stack: error.stack,
        info,
      },
      "RouterErrorComponent",
    );

    // Send error to PostHog for analytics
    try {
      if (typeof window !== 'undefined' && 'posthog' in window) {
        const posthog = window.posthog;
        if (posthog) {
          posthog.capture('error_occurred', {
            error_type: 'router_error',
            error_category: 'navigation_error',
            component_name: 'RouterErrorComponent',
            error_message: error.message,
            user_agent_group: getUserAgentGroup(),
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (analyticsError) {
      logger.warn('routing', 'Failed to send router error to PostHog', { analyticsError }, 'RouterErrorComponent');
    }
  }, [error, info]);

  // For context/hook errors and React Flow errors, throw to let GlobalErrorBoundary handle them
  if (
    error.message.includes("must be used within") ||
    error.message.includes("Context") ||
    error.message.includes("Provider") ||
    error.message.includes("React Flow") ||
    error.message.includes("ReactFlow")
  ) {
    // Re-throw to bubble up to GlobalErrorBoundary
    throw error;
  }

  // Check if this is a 404/not found error
  const isNotFoundError =
    error.message.includes("not found") ||
    error.message.includes("404") ||
    error.message.includes("No route matches") ||
    error.message.includes("does not exist") ||
    error.message.includes("invalid") ||
    error.message.includes("undefined");

  // Handle routing-specific errors here
  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Alert
          icon={<IconAlertTriangle size={ICON_SIZE.XL} />}
          title={isNotFoundError ? "404 - Page Not Found" : "Navigation Error"}
          color="orange"
          variant="light"
        >
          <Text size="sm">
            {isNotFoundError
              ? "The page you are looking for does not exist or has been moved."
              : "There was an error loading this page or route."
            }
          </Text>
        </Alert>

        {/* Display error details with text patterns that E2E tests can detect */}
        {isNotFoundError && (
          <Text c="dimmed" size="sm">
            <strong>404 Error:</strong> The requested page could not be found.
            This resource does not exist or may be invalid.
          </Text>
        )}

        <Text c="dimmed" size="sm">
          {error.message}
        </Text>

        <Group role="group" aria-label="Error recovery actions">
          <Button
            leftSection={<IconRefresh size={ICON_SIZE.MD} />}
            onClick={reset}
            variant="filled"
            aria-label="Try again to reload this page"
          >
            Try Again
          </Button>
          <Button
            leftSection={<IconHome size={ICON_SIZE.MD} />}
            component="a"
            href="#/"
            variant="light"
            aria-label="Navigate to home page"
          >
            Go Home
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};
