/**
 * Entity Modal Components
 * Modals for bulk operations and duplicate management
 */

import type { CatalogueList, DuplicateStats } from "@bibgraph/utils";
import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
} from "@mantine/core";

interface BulkRemoveModalProps {
  opened: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: () => void;
}

export const BulkRemoveModal = ({
  opened,
  onClose,
  selectedCount,
  onConfirm,
}: BulkRemoveModalProps) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Confirm Bulk Removal"
      centered
    >
      <Stack gap="md">
        <Text>
          Are you sure you want to remove {selectedCount}{" "}
          {selectedCount === 1 ? "entity" : "entities"} from this list? This
          action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button color="red" onClick={onConfirm}>
            Remove
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

interface BulkMoveModalProps {
  opened: boolean;
  onClose: () => void;
  selectedCount: number;
  targetListId: string | null;
  onTargetListChange: (id: string | null) => void;
  lists: CatalogueList[];
  currentListId: string | undefined;
  onConfirm: () => void;
}

export const BulkMoveModal = ({
  opened,
  onClose,
  selectedCount,
  targetListId,
  onTargetListChange,
  lists,
  currentListId,
  onConfirm,
}: BulkMoveModalProps) => {
  const handleClose = () => {
    onClose();
    onTargetListChange(null);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Move Entities to List"
      centered
    >
      <Stack gap="md">
        <Text size="sm">
          Select a list to move {selectedCount}{" "}
          {selectedCount === 1 ? "entity" : "entities"} to:
        </Text>
        <Select
          label="Target List"
          placeholder="Select a list..."
          value={targetListId}
          onChange={(value) => onTargetListChange(value)}
          data={lists
            .filter(
              (list): list is typeof list & { id: string } =>
                list.id !== currentListId && !!list.id
            )
            .map((list) => ({
              value: list.id,
              label: list.title,
            }))}
          searchable
          required
        />
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button color="blue" onClick={onConfirm} disabled={!targetListId}>
            Move
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

interface DuplicatesModalProps {
  opened: boolean;
  onClose: () => void;
  duplicateStats: DuplicateStats | null;
  onRemoveDuplicates: () => void;
}

export const DuplicatesModal = ({
  opened,
  onClose,
  duplicateStats,
  onRemoveDuplicates,
}: DuplicatesModalProps) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Duplicate Entities"
      size="lg"
    >
      {duplicateStats && duplicateStats.removableCount > 0 ? (
        <Stack gap="md">
          <Text size="sm">
            Found <Text fw={700}>{duplicateStats.removableCount}</Text> duplicate{" "}
            {duplicateStats.removableCount === 1 ? "entity" : "entities"} in
            this list. Removing duplicates will free up{" "}
            <Text fw={700}>{duplicateStats.duplicatePercentage.toFixed(1)}%</Text>{" "}
            of the list.
          </Text>

          <Alert variant="light" color="blue">
            <Text size="sm">
              Duplicates are detected when the same entity (same type and ID)
              appears multiple times in the list. Only the most recently added
              duplicate will be kept; earlier duplicates will be removed.
            </Text>
          </Alert>

          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button color="red" onClick={onRemoveDuplicates}>
              Remove All Duplicates
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
          <Text size="sm">No duplicates found in this list.</Text>
          <Button onClick={onClose}>Close</Button>
        </Stack>
      )}
    </Modal>
  );
};
