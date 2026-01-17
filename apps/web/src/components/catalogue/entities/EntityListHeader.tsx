/**
 * Entity List Header Component
 * Header displaying entity count, list name, and quick actions
 */

import type { CatalogueList, DuplicateStats } from "@bibgraph/utils";
import { Badge, Button, Group, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

/** Icon size for the warning triangle in the duplicates button */
const DUPLICATE_ICON_SIZE = 14;

interface EntityListHeaderProps {
  entityCount: number;
  selectedList: CatalogueList;
  duplicateStats: DuplicateStats | null;
  onViewDuplicates: () => void;
}

export const EntityListHeader = ({
  entityCount,
  selectedList,
  duplicateStats,
  onViewDuplicates,
}: EntityListHeaderProps) => {
  return (
    <Group justify="space-between">
      <Text size="lg" fw={500}>
        {entityCount} {entityCount === 1 ? "entity" : "entities"} in "
        {selectedList.title}"
      </Text>
      <Group gap="xs">
        {duplicateStats && duplicateStats.removableCount > 0 && (
          <Button
            size="xs"
            variant="light"
            color="yellow"
            leftSection={<IconAlertTriangle size={DUPLICATE_ICON_SIZE} />}
            onClick={onViewDuplicates}
          >
            {duplicateStats.removableCount} Duplicates
          </Button>
        )}
        <Badge size="sm" color="blue">
          {selectedList.type === "bibliography" ? "Bibliography" : "List"}
        </Badge>
      </Group>
    </Group>
  );
};
