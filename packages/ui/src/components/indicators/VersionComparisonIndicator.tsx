/**
 * Version comparison indicator component
 * Shows metadata differences between OpenAlex v1 and v2
 * Temporarily available during November 2025 transition period
 */

import { Badge, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconEqual, IconInfoCircle } from "@tabler/icons-react";
import React from "react";

export interface VersionComparisonIndicatorProps {
  currentVersion: '1' | '2' | undefined;
  referencesCount?: {
    v1?: number;
    v2?: number;
    difference: number;
  };
  locationsCount?: {
    v1?: number;
    v2?: number;
    difference: number;
  };
  'data-testid'?: string;
}

const getDifferenceIcon = (difference: number) => {
  if (difference > 0) return <IconArrowUp size={12} />;
  if (difference < 0) return <IconArrowDown size={12} />;
  return <IconEqual size={12} />;
};

const getDifferenceColor = (difference: number): string => {
  if (difference > 0) return "green";
  if (difference < 0) return "red";
  return "gray";
};

const formatDifference = (difference: number): string => {
  if (difference === 0) return "No change";
  return difference > 0 ? `+${String(difference)}` : difference.toString();
};

export const VersionComparisonIndicator: React.FC<
  VersionComparisonIndicatorProps
> = ({
  currentVersion,
  referencesCount,
  locationsCount,
  'data-testid': testId = 'version-comparison-indicator',
}) => {
  const versionLabel = currentVersion === '1'
    ? "Data Version 1 (legacy)"
    : (currentVersion === '2'
    ? "Data Version 2 (current)"
    : "Data Version 2 (default)");

  const hasReferences = referencesCount !== undefined && referencesCount.difference !== 0;
  const hasLocations = locationsCount !== undefined && locationsCount.difference !== 0;
  const hasDifferences = hasReferences || hasLocations;

  if (!hasDifferences) {
    return (
      <Group gap="xs" data-testid={testId}>
        <Badge variant="light" color="blue" size="sm">
          {versionLabel}
        </Badge>
      </Group>
    );
  }

  return (
    <Stack gap="xs" data-testid={testId}>
      <Group gap="xs">
        <Badge variant="light" color="blue" size="sm">
          {versionLabel}
        </Badge>
        <Tooltip
          label="This work has different metadata between v1 and v2. Differences are shown below."
          position="right"
          multiline
          w={200}
        >
          <IconInfoCircle
            size={14}
            style={{ color: "var(--mantine-color-dimmed)" }}
          />
        </Tooltip>
      </Group>

      <Group gap="sm">
        {hasReferences && (
          <Tooltip
            label={`References: ${String(referencesCount.v1 ?? 0)} (v1) → ${String(referencesCount.v2 ?? 0)} (v2)`}
            position="bottom"
          >
            <Badge
              variant="light"
              color={getDifferenceColor(referencesCount.difference)}
              size="sm"
              leftSection={getDifferenceIcon(referencesCount.difference)}
              data-testid={`${testId}-references`}
            >
              References: {formatDifference(referencesCount.difference)}
            </Badge>
          </Tooltip>
        )}

        {hasLocations && (
          <Tooltip
            label={`Locations: ${String(locationsCount.v1 ?? 0)} (v1) → ${String(locationsCount.v2 ?? 0)} (v2)`}
            position="bottom"
          >
            <Badge
              variant="light"
              color={getDifferenceColor(locationsCount.difference)}
              size="sm"
              leftSection={getDifferenceIcon(locationsCount.difference)}
              data-testid={`${testId}-locations`}
            >
              Locations: {formatDifference(locationsCount.difference)}
            </Badge>
          </Tooltip>
        )}
      </Group>

      <Text size="xs" c="dimmed">
        {currentVersion === '1'
          ? "Switch to v2 in settings to see improved metadata"
          : "v2 includes enhanced reference and location data"}
      </Text>
    </Stack>
  );
};
