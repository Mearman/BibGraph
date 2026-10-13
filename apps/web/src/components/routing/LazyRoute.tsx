import { Group, Loader, Stack, Text } from "@mantine/core";
import React, { Suspense } from "react";

import { CardSkeleton } from "@/components/ui/LoadingSkeleton";

interface LazyRouteProperties {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Pending fallback shared by the Suspense boundary and the router's defaultPendingComponent. It mirrors the page's block structure (a header card plus body) rather than a bare centred spinner, so lazy loads do not shift layout, and announces itself as a busy status region for assistive technology.
 */
export const RoutePendingFallback = (
  <Stack gap="md" p="md" role="status" aria-label="Loading page" aria-busy="true" data-testid="route-pending">
    <Group gap="xs">
      <Loader size="xs" />
      <Text size="sm" c="dimmed">
        Loading...
      </Text>
    </Group>
    <CardSkeleton />
  </Stack>
);

/**
 * Component form of {@link RoutePendingFallback} for router options that take a component rather than an element.
 */
export const RoutePendingComponent = () => RoutePendingFallback;

/**
 * Wrapper component for lazy-loaded routes with a consistent skeleton loading state
 */
export const LazyRoute: React.FC<LazyRouteProperties> = ({ children, fallback }) => (
  <Suspense fallback={fallback ?? RoutePendingFallback}>{children}</Suspense>
);
