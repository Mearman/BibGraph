/**
 * Modal component for adding entities to catalogue lists
 */

import type { EntityType } from "@bibgraph/types";
import { logger, SPECIAL_LIST_IDS } from "@bibgraph/utils";
import {
  Alert,
  Button,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import React, { useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';
import { useCatalogue } from "@/hooks/useCatalogue";

// Set of special list IDs that shouldn't be shown in the add-to-list modal
const SPECIAL_LIST_ID_SET: Set<string> = new Set(Object.values(SPECIAL_LIST_IDS));


interface AddToListModalProps {
  entityType: EntityType;
  entityId: string;
  entityDisplayName?: string;
  onClose: () => void;
}

export const AddToListModal = ({
  entityType,
  entityId,
  entityDisplayName,
  onClose
}: AddToListModalProps) => {
  const { lists, isLoadingLists, addEntityToList } = useCatalogue();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter lists based on entity type and exclude special system lists
  // Bibliographies can only contain works
  // Special lists (History, Graph, Bookmarks) should not appear in add-to-list modal
  const availableLists = lists.filter(list => {
    // Exclude special system lists
    if (list.id && SPECIAL_LIST_ID_SET.has(list.id)) {
      return false;
    }
    if (list.type === "bibliography") {
      return entityType === "works";
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedListId) return;

    setIsSubmitting(true);
    try {
      await addEntityToList({
        listId: selectedListId,
        entityType: entityType,
        entityId,
        notes: notes.trim() || undefined,
      });

      const selectedList = lists.find(l => l.id === selectedListId);
      logger.debug("catalogue-ui", "Entity added to list from modal", {
        listId: selectedListId,
        listTitle: selectedList?.title,
        entityType,
        entityId,
        hasNotes: !!notes.trim()
      });

      // Show notification first (it will persist after modal closes)
      notifications.show({
        title: "Added to List",
        message: `${entityDisplayName || entityId} added to "${selectedList?.title}"`,
        color: "green",
        icon: <IconCheck size={ICON_SIZE.MD} />,
      });

      // Close modal immediately - notification will persist
      onClose();
    } catch (error) {
      logger.error("catalogue-ui", "Failed to add entity to list from modal", {
        listId: selectedListId,
        entityType,
        entityId,
        error
      });

      notifications.show({
        title: "Error",
        message: "Failed to add entity to list",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLists) {
    return (
      <Stack align="center" py="xl">
        <Loader size="lg" />
        <Text size="sm" c="dimmed" role="status" aria-live="polite">
          Loading lists...
        </Text>
      </Stack>
    );
  }

  if (availableLists.length === 0) {
    return (
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={ICON_SIZE.MD} />} color="yellow">
          {entityType === "works"
            ? "No lists or bibliographies available. Create a list first to add entities."
            : "No lists available for this entity type. Bibliographies can only contain works."
          }
        </Alert>
        <Group justify="flex-end">
          <Button onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Add {entityDisplayName || entityId} to a catalogue list
        </Text>

        <Select
          id="select-list"
          label="Select List"
          placeholder="Choose a list"
          value={selectedListId}
          onChange={setSelectedListId}
          data={availableLists
            .filter((list): list is typeof list & { id: string } => !!list.id)
            .map(list => ({
              value: list.id,
              label: `${list.title} (${list.type})`,
            }))}
          required
          aria-required="true"
          searchable
          data-testid="add-to-list-select"
        />

        <Textarea
          id="entity-notes"
          label="Notes (Optional)"
          placeholder="Add notes about this entity..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={3}
          data-testid="add-to-list-notes"
        />

        <Group justify="flex-end" gap="xs">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!selectedListId}
            data-testid="add-to-list-submit"
          >
            Add to List
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
