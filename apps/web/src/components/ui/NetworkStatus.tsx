/**
 * Network Status Component - Simple network connectivity indicator
 *
 * Provides real-time network status display with visual feedback
 * and basic offline detection capabilities.
 */

import { Badge, Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCloudCheck,
  IconCloudOff,
  IconWifi,
  IconWifiOff} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { useNetwork } from "./NetworkProvider";

export interface NetworkStatusProps {
  /**
  Whether to show detailed status information
   */
  detailed?: boolean;
  /**
  Size of the status indicator
   */
  size?: "xs" | "sm" | "md" | "lg";
  /**
  Whether to show as a compact badge
   */
  compact?: boolean;
  /**
  Custom label override
   */
  label?: string;
}

export type NetworkStatusType = "online" | "offline" | "slow" | "unstable";

const STATUS_CHECK_INTERVAL_MS = 30000;

/**
 * Network Status Component
 *
 * Displays current network connectivity status with appropriate
 * visual indicators and optional detailed information.
 */
export const NetworkStatus = ({
  detailed = false,
  size = "sm",
  compact = false,
  label
}: NetworkStatusProps) => {
  // The browser API's presence doesn't change during a session, so this is computed once at mount.
  const [isBrowserSupported] = useState(() => typeof navigator !== 'undefined' && 'onLine' in navigator);

  // Try to use NetworkProvider context, fallback to browser API
  let networkContext: ReturnType<typeof useNetwork> | null;
  try {
    networkContext = useNetwork();
  } catch {
    // NetworkProvider not available, use browser API directly
    networkContext = null;
  }

  const [browserStatus, setBrowserStatus] = useState<NetworkStatusType>(() =>
    (typeof navigator !== 'undefined' && navigator.onLine) ? "online" : "offline"
  );

  // Fallback network detection if NetworkProvider not available
  useEffect(() => {
    if (networkContext) return undefined;
    if (!isBrowserSupported) return undefined;

    const checkConnection = () => {
      if (!navigator.onLine) {
        setBrowserStatus("offline");
      } else {
        // Simple connectivity check
        setBrowserStatus("online");
      }
    };

    const handleOnline = () => {
      setBrowserStatus("online");
    };

    const handleOffline = () => {
      setBrowserStatus("offline");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic status checks
    const interval = setInterval(checkConnection, STATUS_CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [networkContext, isBrowserSupported]);

  // Get status from context or browser API
  const status = networkContext ? networkContext.status : browserStatus;
  const isOnline = networkContext ? networkContext.isOnline : navigator.onLine;
  const queueLength = networkContext?.queueLength ?? 0;

  const getStatusConfig = () => {
    switch (status) {
      case "online":
        return {
          color: "green",
          icon: <IconCloudCheck size={16} />,
          label: "Online",
          description: "Connection stable"
        };
      case "slow":
        return {
          color: "orange",
          icon: <IconWifi size={16} />,
          label: "Slow",
          description: "Connection degraded"
        };
      case "unstable":
        return {
          color: "yellow",
          icon: <IconAlertTriangle size={16} />,
          label: "Unstable",
          description: "Connection unstable"
        };
      case "offline":
        return {
          color: "red",
          icon: <IconCloudOff size={16} />,
          label: "Offline",
          description: "No connection"
        };
      default:
        return {
          color: "gray",
          icon: <IconWifiOff size={16} />,
          label: "Unknown",
          description: "Status unknown"
        };
    }
  };

  const statusConfig = getStatusConfig();
  const displayLabel = label ?? statusConfig.label;

  // Compact badge version
  if (compact) {
    return (
      <Tooltip
        label={`${displayLabel} - ${statusConfig.description}${queueLength > 0 ? ` (${String(queueLength)} queued)` : ''}`}
        position="top"
      >
        <Badge
          color={statusConfig.color}
          variant={isOnline ? "filled" : "outline"}
          size={size}
          leftSection={statusConfig.icon}
          rightSection={queueLength > 0 && (
            <Text size="xs" c="white">
              {queueLength}
            </Text>
          )}
        >
          {displayLabel}
        </Badge>
      </Tooltip>
    );
  }

  // Detailed version
  if (detailed) {
    return (
      <Stack gap="xs" miw={200}>
        <Group justify="space-between" align="center">
          <Group gap="xs">
            {statusConfig.icon}
            <Text size={size} fw={500}>
              Network Status
            </Text>
          </Group>
          <Badge
            color={statusConfig.color}
            variant={isOnline ? "filled" : "outline"}
            size={size}
          >
            {displayLabel}
          </Badge>
        </Group>

        <Text size="xs" c="dimmed">
          {statusConfig.description}
        </Text>

        {queueLength > 0 && (
          <Text size="xs" c="orange">
            {queueLength} request{queueLength !== 1 ? 's' : ''} queued
          </Text>
        )}

        {!isBrowserSupported && (
          <Text size="xs" c="red">
            Network status not supported in this browser
          </Text>
        )}

        {networkContext && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Last successful request:</Text>
              <Text size="xs">
                {new Date(networkContext.lastSuccessfulRequest).toLocaleTimeString()}
              </Text>
            </Group>

            {networkContext.failedRequests > 0 && (
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Failed requests:</Text>
                <Text size="xs" c="red">
                  {networkContext.failedRequests}
                </Text>
              </Group>
            )}
          </Stack>
        )}
      </Stack>
    );
  }

  // Simple badge version
  return (
    <Tooltip label={`${displayLabel} - ${statusConfig.description}${queueLength > 0 ? ` (${String(queueLength)} queued)` : ''}`}>
      <Badge
        color={statusConfig.color}
        variant={isOnline ? "filled" : "outline"}
        size={size}
        leftSection={statusConfig.icon}
        styles={{
          root: {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        }}
      >
        {displayLabel}
        {queueLength > 0 && (
          <Badge
            color="orange"
            size="xs"
            ml={4}
            circle
          >
            {queueLength}
          </Badge>
        )}
      </Badge>
    </Tooltip>
  );
};

/**
 * Network Connectivity Hook
 *
 * Simplified hook for basic network status without NetworkProvider dependency
 */
export const useNetworkConnectivity = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [status, setStatus] = useState<NetworkStatusType>("online");

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus("online");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus("offline");
    };

    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return undefined;
  }, []);

  return {
    isOnline,
    status
  };
};