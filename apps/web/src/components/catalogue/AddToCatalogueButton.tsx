/**
 * Button component for adding entities to catalogue lists
 * Integrates with existing bookmark system and entity detail components
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBook,
  IconBookmark,
  IconList,
  IconPlus,
} from "@tabler/icons-react";
import React, { useMemo, useState } from "react";

import { ICON_SIZE } from '@/config/style-constants';
import { useCatalogue } from "@/hooks/useCatalogue";

/**
List entries beyond this count are collapsed into a "... and N more" item in the compatible-lists dropdown.
 */
const MAX_VISIBLE_LISTS = 5;

interface AddToCatalogueButtonProperties {
  /**
  Entity type (works, authors, etc.)
   */
  entityType: EntityType;
  /**
  OpenAlex entity ID
   */
  entityId: string;
  /**
  Entity title for display
   */
  entityTitle: string;
  /**
  Optional custom styling
   */
  size?: "xs" | "sm" | "md" | "lg";
  /**
  Show as button instead of icon
   */
  variant?: "icon" | "button";
  /**
  Custom class name
   */
  className?: string;
}

interface CreateAndAddModalProperties {
  opened: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  onSuccess: () => void;
}

const CreateAndAddModal = ({
  opened,
  onClose,
  entityType,
  entityId,
  entityTitle,
  onSuccess,
}: CreateAndAddModalProperties) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createList, addEntityToList} = useCatalogue();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Determine list type based on entity type
      const listType = entityType === "works" ? "bibliography" : "list";

      // Create new list (tags feature not yet implemented)
      const listId = await createList({
        title: title.trim(),
        description: description.trim() || undefined,
        type: listType,
        tags: [],
        isPublic,
      });

      // Add entity to the new list
      await addEntityToList({
        listId,
        entityType,
        entityId,
        notes: `Added from: ${entityTitle}`,
      });

      logger.debug("catalogue-ui", "Created list and added entity successfully", {
        listId,
        listTitle: title.trim(),
        entityType,
        entityId,
        entityTitle
      });

      notifications.show({
        title: "Success",
        message: `Created "${title}" and added ${entityType === "works" ? "work" : entityType}`,
        color: "green",
      });

      onSuccess();
      onClose();
    } catch (error) {
      logger.error("catalogue-ui", "Failed to create list and add entity", {
        entityType,
        entityId,
        entityTitle,
        listTitle: title.trim(),
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to create list and add entity",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create New List" size="md">
      <Stack gap="md">
        <div>
          <Text size="sm" c="dimmed">Adding:</Text>
          <Text fw={500}>{entityTitle}</Text>
          <Badge size="xs" variant="light" mt="xs">
            {entityType}
          </Badge>
        </div>

        <Divider />

        <TextInput
          id="list-title-input"
          label="List Title"
          placeholder="Enter list title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); }}
          required
          aria-required="true"
        />

        <Textarea
          id="list-description-input"
          label="Description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => { setDescription(e.target.value); }}
          minRows={3}
        />

        <Group>
          <Checkbox
            id="is-public-checkbox"
            checked={isPublic}
            onChange={(e) => { setIsPublic(e.target.checked); }}
            label="Make this list publicly shareable"
            size="sm"
          />
        </Group>

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => { void handleSubmit(); }}
            loading={isSubmitting}
            disabled={!title.trim()}
          >
            Create & Add
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export const AddToCatalogueButton = ({
  entityType,
  entityId,
  entityTitle,
  size = "sm",
  variant = "icon",
  className,
}: AddToCatalogueButtonProperties) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { lists, addEntityToList } = useCatalogue();

  // Filter lists that can accept this entity type
  const compatibleLists = useMemo(() => {
    return lists.filter(list => {
      if (list.type === "bibliography") {
        return entityType === "works";
      }
      return true; // Regular lists can accept any entity type
    });
  }, [lists, entityType]);

  const handleAddToList = async (listId: string, listTitle: string) => {
    try {
      await addEntityToList({
        listId,
        entityType,
        entityId,
        notes: `Added from: ${entityTitle}`,
      });

      logger.debug("catalogue-ui", "Entity added to existing list", {
        listId,
        listTitle,
        entityType,
        entityId,
        entityTitle
      });

      notifications.show({
        title: "Added to List",
        message: `Added to "${listTitle}"`,
        color: "green",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        logger.debug("catalogue-ui", "Entity already exists in list", {
          listId,
          listTitle,
          entityType,
          entityId,
          entityTitle
        });
        notifications.show({
          title: "Already in List",
          message: `"${entityTitle}" is already in "${listTitle}"`,
          color: "yellow",
        });
      } else {
        logger.error("catalogue-ui", "Failed to add entity to list", {
          listId,
          listTitle,
          entityType,
          entityId,
          entityTitle,
          error
        });
        notifications.show({
          title: "Error",
          message: "Failed to add to list",
          color: "red",
        });
      }
    }
  };

  const handleCreateAndAdd = () => {
    setShowCreateModal(true);
  };

  if (variant === "button") {
    return (
      <>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Button
              data-testid="add-to-catalogue-button"
              size={size}
              leftSection={<IconBookmark size={ICON_SIZE.MD} />}
              variant="light"
              className={className}
            >
              Add to List
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            {compatibleLists.length > 0 ? (
              <>
                {compatibleLists.slice(0, MAX_VISIBLE_LISTS).map((list) => {
                  if (list.id === undefined) return null;
                  const listId = list.id;
                  const listTitle = list.title;
                  return (
                    <Menu.Item
                      key={listId}
                      leftSection={
                        list.type === "bibliography" ? (
                          <IconBook size={ICON_SIZE.SM} />
                        ) : (
                          <IconList size={ICON_SIZE.SM} />
                        )
                      }
                      onClick={() => { void handleAddToList(listId, listTitle); }}
                    >
                      {listTitle}
                    </Menu.Item>
                  );
                })}
                {compatibleLists.length > MAX_VISIBLE_LISTS && (
                  <Menu.Item disabled>
                    ... and {compatibleLists.length - MAX_VISIBLE_LISTS} more
                  </Menu.Item>
                )}
                <Menu.Divider />
              </>
            ) : (
              <Menu.Item disabled>
                No compatible lists found
              </Menu.Item>
            )}
            <Menu.Item
              leftSection={<IconPlus size={ICON_SIZE.SM} />}
              onClick={handleCreateAndAdd}
            >
              Create New List
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <CreateAndAddModal
          opened={showCreateModal}
          onClose={() => { setShowCreateModal(false); }}
          entityType={entityType}
          entityId={entityId}
          entityTitle={entityTitle}
          onSuccess={() => { /* No-op: `lists` is a live query from useCatalogue, so the dropdown refreshes on its own once the new list is created; the modal's own onClose already handles dismissal. */ }}
        />
      </>
    );
  }

  return (
    <>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <ActionIcon
            data-testid="add-to-catalogue-button"
            size={size}
            variant="light"
            className={className}
            aria-label="Add to catalogue list"
          >
            <IconBookmark size={ICON_SIZE.MD} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          {compatibleLists.length > 0 ? (
            <>
              {compatibleLists.slice(0, MAX_VISIBLE_LISTS).map((list) => {
                if (list.id === undefined) return null;
                const listId = list.id;
                const listTitle = list.title;
                return (
                  <Menu.Item
                    key={listId}
                    leftSection={
                      list.type === "bibliography" ? (
                        <IconBook size={ICON_SIZE.SM} />
                      ) : (
                        <IconList size={ICON_SIZE.SM} />
                      )
                    }
                    onClick={() => { void handleAddToList(listId, listTitle); }}
                  >
                    {listTitle}
                  </Menu.Item>
                );
              })}
              {compatibleLists.length > MAX_VISIBLE_LISTS && (
                <Menu.Item disabled>
                  ... and {compatibleLists.length - MAX_VISIBLE_LISTS} more
                </Menu.Item>
              )}
              <Menu.Divider />
            </>
          ) : (
            <Menu.Item disabled>
              No compatible lists found
            </Menu.Item>
          )}
          <Menu.Item
            leftSection={<IconPlus size={ICON_SIZE.SM} />}
            onClick={handleCreateAndAdd}
          >
            Create New List
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <CreateAndAddModal
        opened={showCreateModal}
        onClose={() => { setShowCreateModal(false); }}
        entityType={entityType}
        entityId={entityId}
        entityTitle={entityTitle}
        onSuccess={() => { /* No-op: `lists` is a live query from useCatalogue, so the dropdown refreshes on its own once the new list is created; the modal's own onClose already handles dismissal. */ }}
      />
    </>
  );
};