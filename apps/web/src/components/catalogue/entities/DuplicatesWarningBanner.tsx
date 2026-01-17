/**
 * Duplicates Warning Banner Component
 * Alert banner displayed when duplicate entities are detected
 */

import type { DuplicateStats } from "@bibgraph/utils";
import { Alert, Button, Group, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { ICON_SIZE } from "@/config/style-constants";

interface DuplicatesWarningBannerProps {
  duplicateStats: DuplicateStats;
  onViewDuplicates: () => void;
}

export const DuplicatesWarningBanner = ({
  duplicateStats,
  onViewDuplicates,
}: DuplicatesWarningBannerProps) => {
  if (duplicateStats.removableCount === 0) {
    return null;
  }

  return (
    <Alert
      variant="light"
      color="yellow"
      icon={<IconAlertTriangle size={ICON_SIZE.MD} />}
      title="Duplicates Found"
    >
      <Group justify="space-between">
        <Text size="sm">
          {duplicateStats.removableCount} duplicate{" "}
          {duplicateStats.removableCount === 1 ? "entity" : "entities"} found (
          {duplicateStats.duplicatePercentage.toFixed(1)}% of list)
        </Text>
        <Button size="xs" variant="light" onClick={onViewDuplicates}>
          View & Remove Duplicates
        </Button>
      </Group>
    </Alert>
  );
};
