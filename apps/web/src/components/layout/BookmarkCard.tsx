/**
 * Individual bookmark card component for the sidebar
 * Handles display name resolution and actions
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import {
  type CatalogueEntity,
} from "@bibgraph/utils/storage/catalogue-db";
import {
  parseExistingAppUrl,
  reconstructEntityUrl,
} from "@bibgraph/utils/url-reconstruction";
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

interface BookmarkCardProps {
  bookmark: CatalogueEntity;
  onClose?: () => void;
  onDeleted?: () => void;
}

export const BookmarkCard = ({ bookmark, onClose, onDeleted }: BookmarkCardProps) => {
  // Get storage provider
  const storageProvider = useStorageProvider();

  // Check if this is a special ID (search or list)
  const isSpecialId = bookmark.entityId.startsWith("search-") || bookmark.entityId.startsWith("list-");

  // Try to extract title from notes first
  const titleFromNotes = bookmark.notes?.match(/Title: ([^\n]+)/)?.[1];

  // Fetch display name from API if not a special ID and no title in notes
  const { displayName, isLoading } = useEntityDisplayName({
    entityId: bookmark.entityId,
    entityType: bookmark.entityType as EntityType,
    enabled: !isSpecialId && !titleFromNotes,
  });

  // Determine the title to display
  let title: string;
  if (titleFromNotes) {
    title = titleFromNotes;
  } else if (isSpecialId) {
    title = bookmark.entityId.startsWith("search-") ? `Search: ${bookmark.entityId.replace("search-", "").split("-")[0]}` : `List: ${bookmark.entityId.replace("list-", "")}`;
  } else if (displayName) {
    title = displayName;
  } else if (isLoading) {
    title = "Loading...";
  } else {
    title = `${bookmark.entityType}: ${bookmark.entityId}`;
  }

  // Compute link URL using entity-based reconstruction with backward compatibility
  const getLinkUrl = (): string => {
    // For new bookmarks: use entity-based URL reconstruction
    if (bookmark.entityType && bookmark.entityId) {
      return reconstructEntityUrl(
        bookmark.entityType,
        bookmark.entityId,
        { basePath: "" } // bibgraph.com is primary domain
      );
    }

    // Backward compatibility: try to extract URL from notes for existing bookmarks
    const urlMatch = bookmark.notes?.match(/URL: ([^\n]+)/);
    if (urlMatch) {
      const url = urlMatch[1];

      // Try to parse existing app URLs and convert to entity-based navigation
      const parsedUrl = parseExistingAppUrl(url);
      if (parsedUrl && parsedUrl.entityType && parsedUrl.entityId) {
        return reconstructEntityUrl(
          parsedUrl.entityType,
          parsedUrl.entityId,
          { basePath: "" } // bibgraph.com is primary domain
        );
      }

      // Convert OpenAlex API URLs to internal paths
      if (url.startsWith("https://api.openalex.org")) {
        return url.replace("https://api.openalex.org", "");
      }

      // Return internal paths as-is (no base path needed for bibgraph.com)
      if (url.startsWith("/")) {
        return url;
      }
    }

    // Fallback to default entity path
    return `/${String(bookmark.entityType || 'works')}/${String(bookmark.entityId || 'unknown')}`;
  };

  const linkUrl = getLinkUrl();

  const handleClick = () => {
    if (onClose) {
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
      onConfirm: async () => {
        try {
          if (bookmark.id) {
            await storageProvider.removeBookmark(bookmark.id);
            onDeleted?.();
          }
        } catch (error) {
          logger.error("bookmarks", "Failed to delete bookmark:", error);
        }
      },
    });
  };

  // Filter out technical metadata from notes for display
  // This includes URL:, Title:, Tags: prefixes and provenance lines like "AUTHOR from OpenAlex Tags:"
  const notesDisplay = bookmark.notes
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
    .join('\n') || undefined;

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
          {notesDisplay && (
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
        {bookmark.id && (
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
