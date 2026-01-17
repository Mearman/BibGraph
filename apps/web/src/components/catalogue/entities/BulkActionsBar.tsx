/**
 * Bulk Actions Bar Component
 * Actions bar displayed when entities are selected for bulk operations
 */

import { Button, Group, Text } from "@mantine/core";

interface BulkActionsBarProps {
  selectedCount: number;
  listsCount: number;
  onMoveClick: () => void;
  onRemoveClick: () => void;
  onClearSelection: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  listsCount,
  onMoveClick,
  onRemoveClick,
  onClearSelection,
}: BulkActionsBarProps) => {
  return (
    <Group
      gap="md"
      p="sm"
      style={{ background: "var(--mantine-color-blue-0)", borderRadius: "8px" }}
    >
      <Text size="sm" fw={500}>
        {selectedCount} {selectedCount === 1 ? "entity" : "entities"} selected
      </Text>
      <Button
        size="xs"
        variant="light"
        color="blue"
        onClick={onMoveClick}
        disabled={listsCount <= 1}
        data-testid="bulk-move-button"
      >
        Move to...
      </Button>
      <Button
        size="xs"
        variant="light"
        color="red"
        onClick={onRemoveClick}
        data-testid="bulk-remove-button"
      >
        Remove Selected
      </Button>
      <Button size="xs" variant="subtle" onClick={onClearSelection}>
        Clear Selection
      </Button>
    </Group>
  );
};
