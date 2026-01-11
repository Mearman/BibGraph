/**
 * Individual history entry card component for the sidebar
 * Handles display name resolution and actions
 */

import type { EntityType } from "@bibgraph/types";
import { logError, logger } from "@bibgraph/utils/logger";
import { type CatalogueEntity,catalogueService } from "@bibgraph/utils/storage/catalogue-db";
import {
  ActionIcon,
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
import { useEntityDisplayName } from "@/hooks/use-entity-display-name";

import * as styles from "./sidebar.css";

interface HistoryCardProps {
  entry: CatalogueEntity;
  onClose?: () => void;
  formatDate: (date: Date) => string;
}

/** Non-entity pages that shouldn't trigger display name fetches */
const NON_ENTITY_URL_PATTERNS = ["/about", "/settings", "/history", "/bookmarks", "/catalogue"];

/** Pattern for corrupted URLs */
const CORRUPTED_URL_PATTERNS = ["[object Object]", "[object%20Object]", "%5Bobject"];

export const HistoryCard = ({ entry, onClose, formatDate }: HistoryCardProps) => {
  // Check if this is a special ID (search or list)
  const isSpecialId = entry.entityId.startsWith("search-") || entry.entityId.startsWith("list-");

  // Try to extract URL and title from notes
  const urlFromNotes = entry.notes?.match(/URL: ([^\n]+)/)?.[1];
  const titleFromNotes = entry.notes?.match(/Title: ([^\n]+)/)?.[1];

  // Check if URL points to a non-entity page
  const isNonEntityUrl = urlFromNotes && NON_ENTITY_URL_PATTERNS.some(pattern => urlFromNotes.includes(pattern));

  // Check if URL is corrupted
  const isCorruptedUrl = urlFromNotes && CORRUPTED_URL_PATTERNS.some(pattern => urlFromNotes.includes(pattern));

  // Only fetch display name for valid entity URLs
  const { displayName, isLoading } = useEntityDisplayName({
    entityId: entry.entityId,
    entityType: entry.entityType as EntityType,
    enabled: !isSpecialId && !isNonEntityUrl && !isCorruptedUrl,
  });

  // Format entity type for display (e.g., "works" -> "Work", "authors" -> "Author")
  const formatEntityType = (entityType: string): string => {
    const singular = entityType.endsWith("s") ? entityType.slice(0, -1) : entityType;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  };

  // Format entity ID for display (shortened if it's a long ID)
  const formatEntityId = (entityId: string): string => {
    // Extract just the ID part (e.g., "W123456789" from URL or keep as-is)
    const idMatch = entityId.match(/([A-Z]\d+)$/);
    if (idMatch) {
      const id = idMatch[1];
      // Show first letter + first few digits for readability
      return id.length > 8 ? `${id.slice(0, 8)}...` : id;
    }
    // For other IDs, truncate if too long
    return entityId.length > 15 ? `${entityId.slice(0, 15)}...` : entityId;
  };

  // Determine the title to display
  // Priority varies based on URL type
  let title: string;
  if (isSpecialId) {
    title = entry.entityId.startsWith("search-") ? `Search: ${entry.entityId.replace("search-", "").split("-")[0]}` : `List: ${entry.entityId.replace("list-", "")}`;
  } else if (isNonEntityUrl && urlFromNotes) {
    // For non-entity pages, show the page name (e.g., "About", "Settings")
    const pageName = urlFromNotes.replace(/.*[#/]/, "").split("/")[0];
    title = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  } else if (displayName) {
    // Prefer freshly fetched display name for entity pages
    title = displayName;
  } else if (titleFromNotes) {
    // Fall back to stored title from notes
    title = titleFromNotes;
  } else if (isLoading) {
    title = "Loading...";
  } else {
    // Improved fallback: "Work W1234567..." instead of "works: W123456789012345"
    title = `${formatEntityType(entry.entityType)} ${formatEntityId(entry.entityId)}`;
  }

  // Compute link URL - for special IDs, try to extract from notes; otherwise use entity path
  const getLinkUrl = (): string => {
    // Try to extract URL from notes first
    const urlMatch = entry.notes?.match(/URL: ([^\n]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      // Skip corrupted URLs - fall back to entity path
      if (CORRUPTED_URL_PATTERNS.some(pattern => url.includes(pattern))) {
        return `/${String(entry.entityType)}/${String(entry.entityId)}`;
      }
      // Convert OpenAlex API URLs to internal paths
      if (url.startsWith("https://api.openalex.org")) {
        return url.replace("https://api.openalex.org", "");
      }
      // Return internal paths as-is
      if (url.startsWith("/")) {
        return url;
      }
    }
    // Default to entity path
    return `/${String(entry.entityType)}/${String(entry.entityId)}`;
  };

  const linkUrl = getLinkUrl();

  const handleClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: "Delete History Entry",
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
          if (entry.id) {
            await catalogueService.removeEntityFromList("history-list", entry.id);
          }
        } catch (error) {
          logError(logger, "Failed to delete history entry", error, "HistoryCard");
        }
      },
    });
  };

  // Filter out URL and Title from notes for display
  const notesDisplay = entry.notes
    ?.split('\n')
    .filter(line => !line.startsWith('URL:') && !line.startsWith('Title:'))
    .join('\n');

  return (
    <Card
      component={Link}
      to={linkUrl}
      style={{ border: BORDER_STYLE_GRAY_3, textDecoration: "none" }}
      padding="xs"
      shadow="none"
      className={styles.historyCard}
      onClick={handleClick}
    >
      <Group justify="space-between" align="flex-start" gap="xs">
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text
            size="xs"
            fw={500}
            lineClamp={1}
            className={styles.historyEntry}
          >
            {title}
          </Text>
          {notesDisplay && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {notesDisplay}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {formatDate(new Date(entry.addedAt))}
          </Text>
        </Stack>
        {entry.id && (
          <Tooltip label="Delete history entry">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              className={styles.actionButton}
              aria-label={`Delete ${title} from history`}
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
