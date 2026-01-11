/**
 * Catalogue list component for displaying and managing lists
 */

import type { EntityType } from "@bibgraph/types";
import { type CatalogueList } from "@bibgraph/utils"
import { logger } from "@bibgraph/utils";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconBook,
  IconCheck,
  IconCopy,
  IconEdit,
  IconExternalLink,
  IconList,
  IconTrash,
} from "@tabler/icons-react";
import React, { useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { useCatalogue } from "@/hooks/useCatalogue";

interface CatalogueListProps {
  lists: CatalogueList[];
  selectedListId: string | null;
  onSelectList: (listId: string) => void;
  onDeleteList: (listId: string) => Promise<void>;
  onNavigate?: (url: string) => void;
  isLoading: boolean;
  listType: "list" | "bibliography";
}

interface ListCardProps {
  list: CatalogueList;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

const ListCard = ({ list, isSelected, onSelect, onEdit, onDelete, onShare }: ListCardProps) => {
  const [stats, setStats] = useState<{
    totalEntities: number;
    entityCounts: Record<EntityType, number>;
  } | null>(null);

  const { getListStats } = useCatalogue();

  // Load stats when component mounts
  React.useEffect(() => {
    if (!list.id) return;
    getListStats(list.id)
      .then(setStats)
      .catch((error) => {
        logger.warn("catalogue-ui", "Failed to load list stats", {
          listId: list.id,
          error
        });
      });
  }, [list.id, getListStats]);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#/catalogue/shared/${list.shareToken || list.id}`;
      await navigator.clipboard.writeText(url);
      notifications.show({
        title: "Link Copied",
        message: "List link copied to clipboard",
        color: "green",
        icon: <IconCheck size={ICON_SIZE.MD} />,
      });
      logger.debug("catalogue-ui", "List link copied to clipboard", {
        listId: list.id,
        listTitle: list.title
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to copy list link to clipboard", {
        listId: list.id,
        error
      });
      notifications.show({
        title: "Copy Failed",
        message: "Failed to copy link to clipboard",
        color: "red",
      });
    }
  };

  return (
    <Card
      style={{ border: BORDER_STYLE_GRAY_3, cursor: "pointer" }}
      padding="md"
      className={isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}
      onClick={onSelect}
      data-testid={`list-card-${list.id}`}
    >
      <Group justify="space-between" mb="xs">
        <Group>
          {list.type === "bibliography" ? (
            <IconBook size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
          ) : (
            <IconList size={ICON_SIZE.XL} color="var(--mantine-color-green-6)" />
          )}
          <Text fw={500} size="lg" flex={1} data-testid={`list-card-title-${list.id}`}>
            {list.title}
          </Text>
        </Group>

        <Group gap="xs">
          {list.isPublic && (
            <Badge size="xs" color="green" variant="light">
              Public
            </Badge>
          )}

          <Tooltip label="Copy link">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink();
              }}
              aria-label={`Copy link for ${list.title}`}
            >
              <IconCopy size={ICON_SIZE.SM} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Share">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              aria-label={`Share ${list.title}`}
            >
              <IconExternalLink size={ICON_SIZE.SM} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Edit">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              data-testid={`edit-list-${list.id}`}
              aria-label={`Edit ${list.title}`}
            >
              <IconEdit size={ICON_SIZE.SM} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Delete">
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              data-testid={`delete-list-${list.id}`}
              aria-label={`Delete ${list.title}`}
            >
              <IconTrash size={ICON_SIZE.SM} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {list.description && (
        <Text size="sm" c="dimmed" mb="xs" lineClamp={2}>
          {list.description}
        </Text>
      )}

      {list.tags && list.tags.length > 0 && (
        <Group gap="xs" mb="xs">
          {list.tags.map((tag, index) => (
            <Badge key={index} size="xs" variant="light">
              {tag}
            </Badge>
          ))}
        </Group>
      )}

      <Group justify="space-between" mt="md">
        <Group gap="md">
          {stats ? (
            <>
              <Text size="xs" c="dimmed">
                {stats.totalEntities} {stats.totalEntities === 1 ? "item" : "items"}
              </Text>

              {/* Show entity type breakdown for bibliographies */}
              {list.type === "bibliography" && stats.entityCounts.works > 0 && (
                <Text size="xs" c="dimmed">
                  {stats.entityCounts.works} {stats.entityCounts.works === 1 ? "work" : "works"}
                </Text>
              )}
            </>
          ) : (
            <Text size="xs" c="dimmed">
              Loading...
            </Text>
          )}
        </Group>

        <Text size="xs" c="dimmed">
          {list.updatedAt.toLocaleDateString()}
        </Text>
      </Group>
    </Card>
  );
};

const EditListModal = ({
  list,
  opened,
  onClose,
  onSave,
}: {
  list: CatalogueList;
  opened: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Pick<CatalogueList, "title" | "description" | "tags" | "isPublic">>) => Promise<void>;
}) => {
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description || "");
  const [tags, setTags] = useState(list.tags || []);
  const [isPublic, setIsPublic] = useState(list.isPublic);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateList } = useCatalogue();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.filter(tag => tag.trim().length > 0),
        isPublic,
      };

      if (!list.id) return;
      await updateList(list.id, updateData);
      onSave(updateData);
      onClose();

      logger.debug("catalogue-ui", "List updated successfully", {
        listId: list.id,
        updateData
      });
    } catch (err) {
      logger.error("catalogue-ui", "Failed to update list", {
        listId: list.id,
        updateData: {
          title: title.trim(),
          description: description.trim() || undefined,
          tags: tags.filter(tag => tag.trim().length > 0),
          isPublic,
        },
        error: err
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit List" size="md">
      <Stack gap="md">
        <TextInput
          id="list-title"
          label="Title"
          placeholder="List title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          data-testid="edit-list-title"
        />

        <Textarea
          label="Description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={3}
        />

        <TagsInput
          label="Tags"
          placeholder="Add tags..."
          data={[]}
          value={tags}
          onChange={setTags}
        />

        <Group>
          <Text size="sm">Make this list public?</Text>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
        </Group>

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!title.trim()}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export const CatalogueListComponent = ({
  lists,
  selectedListId,
  onSelectList,
  onDeleteList,
  isLoading,
  listType,
}: CatalogueListProps) => {
  const [editingList, setEditingList] = useState<CatalogueList | null>(null);
  const { generateShareUrl } = useCatalogue();

  const handleSelectList = (listId: string) => {
    onSelectList(listId);
  };

  const handleEditList = (list: CatalogueList) => {
    setEditingList(list);
  };

  const handleDeleteList = (list: CatalogueList) => {
    modals.openConfirmModal({
      title: `Delete ${list.type}?`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete "{list.title}"? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          if (!list.id) return;
          await onDeleteList(list.id);
          notifications.show({
            title: "Deleted",
            message: `${list.type === "bibliography" ? "Bibliography" : "List"} deleted successfully`,
            color: "green",
          });
        } catch {
          notifications.show({
            title: "Error",
            message: `Failed to delete ${list.type}`,
            color: "red",
          });
        }
      },
    });
  };

  const handleShareList = async (list: CatalogueList) => {
    if (!list.id) return;
    try {
      const shareUrl = await generateShareUrl(list.id);
      await navigator.clipboard.writeText(shareUrl);
      notifications.show({
        title: "Share URL Copied",
        message: "Share URL copied to clipboard",
        color: "green",
        icon: <IconCheck size={ICON_SIZE.MD} />,
      });
      logger.debug("catalogue-ui", "Share URL generated and copied", {
        listId: list.id,
        listTitle: list.title
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to generate or copy share URL", {
        listId: list.id,
        error
      });
      notifications.show({
        title: "Error",
        message: "Failed to generate share URL",
        color: "red",
      });
    }
  };

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Loading {listType === "bibliography" ? "bibliographies" : "lists"}...
        </Text>
      </Stack>
    );
  }

  if (lists.length === 0) {
    return (
      <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
        <Stack align="center" gap="md">
          <Box c="gray.4">
            {listType === "bibliography" ? (
              <IconBook size={ICON_SIZE.EMPTY_STATE} />
            ) : (
              <IconList size={ICON_SIZE.EMPTY_STATE} />
            )}
          </Box>
          <Text size="lg" fw={500}>
            No {listType === "bibliography" ? "bibliographies" : "lists"} yet
          </Text>
          <Text size="sm" c="dimmed">
            Create your first list to start organizing your research
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
        {lists.map((list) => {
          if (!list.id) return null;
          const listId = list.id;
          return (
            <ListCard
              key={listId}
              list={list}
              isSelected={selectedListId === listId}
              onSelect={() => handleSelectList(listId)}
              onEdit={() => handleEditList(list)}
              onDelete={() => handleDeleteList(list)}
              onShare={() => handleShareList(list)}
            />
          );
        })}
      </SimpleGrid>

      {editingList && (
        <EditListModal
          list={editingList}
          opened={!!editingList}
          onClose={() => setEditingList(null)}
          onSave={async () => {
            await Promise.resolve();
            setEditingList(null);
          }}
        />
      )}
    </>
  );
};