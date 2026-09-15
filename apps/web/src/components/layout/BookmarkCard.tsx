/**
 * Individual bookmark card component for the sidebar
 * Handles display name resolution and actions
 */

import { logger } from "@bibgraph/utils/logger";
import {
  type CatalogueEntity,
} from "@bibgraph/utils/storage/catalogue-db";
import { reconstructEntityUrl } from "@bibgraph/utils/url-reconstruction";
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";
import { useStorageProvider } from "@/contexts/storage-provider-context";
import { useEntityDisplayName } from "@/hooks/use-entity-display-name";

import * as styles from "./sidebar.css";

interface BookmarkCardProperties {
  bookmark: CatalogueEntity;
  onClose?: () => void;
  onDeleted?: () => void;
}

export const BookmarkCard = ({ bookmark, onClose, onDeleted }: BookmarkCardProperties) => {
  // Get storage provider
  const storageProvider = useStorageProvider();

  // Check if this is a special ID (search or list)
  const isSpecialId = bookmark.entityId.startsWith("search-") || bookmark.entityId.startsWith("list-");

  // Try to extract title from notes first
  const titleFromNotes = bookmark.notes?.match(/Title: ([^\n]+)/)?.[1];

  // Fetch display name from API if not a special ID and no title in notes
  const { displayName, isLoading } = useEntityDisplayName({
    entityId: bookmark.entityId,
    entityType: bookmark.entityType,
    enabled: !isSpecialId && titleFromNotes === undefined,
  });

  // Determine the title to display
  let title: string;
  if (titleFromNotes !== undefined) {
    title = titleFromNotes;
  } else if (isSpecialId) {
    title = bookmark.entityId.startsWith("search-") ? `Search: ${bookmark.entityId.replace("search-", "").split("-", 1)[0]}` : `List: ${bookmark.entityId.replace("list-", "")}`;
  } else if (displayName !== null && displayName !== "") {
    title = displayName;
  } else if (isLoading) {
    title = "Loading...";
  } else {
    title = `${bookmark.entityType}: ${bookmark.entityId}`;
  }

  // Compute link URL using entity-based reconstruction. `entityType` and `entityId` are always present on `CatalogueEntity`, so no fallback is needed.
  const getLinkUrl = (): string =>
    reconstructEntityUrl(
      bookmark.entityType,
      bookmark.entityId,
      { basePath: "" } // bibgraph.com is primary domain
    );

  const linkUrl = getLinkUrl();

  const handleClick = () => {
    if (onClose !== undefined) {
      onClose();
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "Delete Bookmark",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete "{title}"? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        void (async () => {
          try {
            if (bookmark.id !== undefined) {
              await storageProvider.removeBookmark(bookmark.id);
              onDeleted?.();
            }
          } catch (error) {
            logger.error("bookmarks", "Failed to delete bookmark:", error);
          }
        })();
      },
    });
  };

  // Filter out technical metadata from notes for display This includes URL:, Title:, Tags: prefixes and provenance lines like "AUTHOR from OpenAlex Tags:"
  const filteredNotes = bookmark.notes
    ?.split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Filter standard metadata prefixes
      if (trimmed.startsWith('URL:') || trimmed.startsWith('Title:') || trimmed.startsWith('Tags:')) {
        return false;
      }
      // Filter provenance lines: "TYPE from SOURCE" pattern (e.g., "AUTHOR from OpenAlex Tags: ...")
      if (/^[A-Z]+\s+from\s+\S+/i.test(trimmed)) {
        return false;
      }
      return true;
    })
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
  const notesDisplay = filteredNotes !== undefined && filteredNotes !== "" ? filteredNotes : undefined;

  return (
    <Card
      component={Link}
      to={linkUrl}
      style={{ border: BORDER_STYLE_GRAY_3, textDecoration: "none" }}
      padding="xs"
      shadow="none"
      className={styles.bookmarkCard}
      onClick={handleClick}
    >
      <Group justify="space-between" align="flex-start" gap="xs">
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text
            size="xs"
            fw={500}
            lineClamp={2}
            className={styles.bookmarkTitle}
          >
            {title}
          </Text>
          {notesDisplay !== undefined && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {notesDisplay}
            </Text>
          )}
          <Badge size="xs" variant="light" className={styles.tagBadge}>
            {bookmark.entityType}
          </Badge>
          <Text size="xs" c="dimmed">
            {new Date(bookmark.addedAt).toLocaleDateString()}
          </Text>
        </Stack>
        {bookmark.id !== undefined && (
          <Tooltip label="Delete bookmark">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              className={styles.actionButton}
              aria-label={`Delete ${title} from bookmarks`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDelete();
              }}
            >
              <IconTrash size={ICON_SIZE.XS} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Card>
  );
};
