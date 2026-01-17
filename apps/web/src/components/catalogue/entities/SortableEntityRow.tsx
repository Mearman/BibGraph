/**
 * Sortable Entity Row Component
 * A draggable table row for displaying and managing catalogue entities
 */

import type { EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import type { CatalogueEntity } from "@bibgraph/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Menu,
  Modal,
  Stack,
  Table,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  IconDots,
  IconEdit,
  IconExternalLink,
  IconGripVertical,
  IconNotes,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import { ICON_SIZE } from "@/config/style-constants";

import {
  formatEntityMetadata,
  formatNotesForDisplay,
} from "./entity-metadata-formatter";

export interface SortableEntityRowProps {
  entity: CatalogueEntity;
  onNavigate?: (entityType: EntityType, entityId: string) => void;
  onRemove: (entityId: string) => Promise<void>;
  onEditNotes: (entityId: string, notes: string) => Promise<void>;
  isSelected: boolean;
  onToggleSelect: (entityId: string) => void;
}

export const SortableEntityRow = ({
  entity,
  onNavigate,
  onRemove,
  onEditNotes,
  isSelected,
  onToggleSelect,
}: SortableEntityRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.id ?? "" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(entity.notes || "");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleSaveNotes = async () => {
    if (!entity.id) return;
    await onEditNotes(entity.id, notes);
    setEditingNotes(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-testid="entity-item"
      className="entity-card"
    >
      <Table.Tr>
        <Table.Td w={40}>
          <Checkbox
            checked={isSelected}
            onChange={() => {
              if (!entity.id) return;
              onToggleSelect(entity.id);
            }}
            aria-label={`Select ${entity.entityId}`}
          />
        </Table.Td>
        <Table.Td w={40}>
          <div
            {...listeners}
            style={{ cursor: "grab" }}
            aria-label={`Drag to reorder ${entity.entityId}`}
            role="button"
            tabIndex={0}
            data-testid={`drag-handle-${entity.entityId}`}
          >
            <IconGripVertical
              size={ICON_SIZE.MD}
              color="var(--mantine-color-gray-4)"
            />
          </div>
        </Table.Td>
        <Table.Td>
          <Stack gap="xs">
            <Group gap="sm">
              <Badge
                size="sm"
                variant="light"
                color={ENTITY_METADATA[entity.entityType].color}
              >
                {ENTITY_METADATA[entity.entityType].displayName}
              </Badge>
              <Text size="sm" fw={500}>
                {entity.entityId}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {formatEntityMetadata(entity)}
            </Text>
          </Stack>
        </Table.Td>
        <Table.Td>
          {editingNotes ? (
            <Group gap="xs">
              <Textarea
                size="xs"
                minRows={1}
                maxRows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                flex={1}
                aria-label="Edit notes for this entity"
              />
              <Button size="xs" onClick={handleSaveNotes}>
                Save
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setEditingNotes(false)}
              >
                Cancel
              </Button>
            </Group>
          ) : (
            <Group gap="sm">
              <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                {formatNotesForDisplay(entity.notes)}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => setEditingNotes(true)}
                title="Edit notes"
                aria-label="Edit notes"
              >
                <IconEdit size={ICON_SIZE.SM} />
              </ActionIcon>
            </Group>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {entity.addedAt.toLocaleDateString()}
          </Text>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            {onNavigate && (
              <Tooltip label="View entity">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => onNavigate(entity.entityType, entity.entityId)}
                >
                  <IconExternalLink size={ICON_SIZE.SM} />
                </ActionIcon>
              </Tooltip>
            )}
            <Menu shadow="md" width={160}>
              <Menu.Target>
                <ActionIcon size="sm" variant="subtle">
                  <IconDots size={ICON_SIZE.SM} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconNotes size={ICON_SIZE.SM} />}
                  onClick={() => setEditingNotes(true)}
                >
                  Edit Notes
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={ICON_SIZE.SM} />}
                  color="red"
                  onClick={() => setShowRemoveConfirm(true)}
                  aria-label="Remove entity"
                >
                  Remove
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Table.Td>
      </Table.Tr>

      {/* Remove Confirmation Modal */}
      <Modal
        opened={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        title="Confirm Removal"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to remove this entity from the list? This
            action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              onClick={() => setShowRemoveConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              data-testid="confirm-remove-entity-button"
              disabled={removing}
              onClick={async () => {
                if (!entity.id) return;
                setRemoving(true);
                try {
                  await onRemove(entity.id);
                  setShowRemoveConfirm(false);
                } finally {
                  setRemoving(false);
                }
              }}
            >
              Remove
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
};
