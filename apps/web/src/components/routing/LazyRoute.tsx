import { Center, Stack,Text } from "@mantine/core";
import { IconLoader } from "@tabler/icons-react";
import React, { Suspense } from "react";

import { ICON_SIZE } from "@/config/style-constants";

interface LazyRouteProperties {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper component for lazy-loaded routes with consistent loading states
 * Provides a centered loading spinner with optional custom fallback
 */
export const LazyRoute: React.FC<LazyRouteProperties> = ({ children, fallback }) => {
  const defaultFallback = (
    <Center style={{ height: "50vh" }}>
      <Stack align="center" gap="md">
        <IconLoader size={ICON_SIZE.EMPTY_STATE_SM} className="animate-spin" />
        <Text size="sm" c="dimmed">
          Loading...
        </Text>
      </Stack>
    </Center>
  );

  return <Suspense fallback={fallback ?? defaultFallback}>{children}</Suspense>;
};
