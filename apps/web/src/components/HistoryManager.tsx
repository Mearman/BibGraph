/**
 * History manager component for displaying navigation history
 * Refactored to use catalogue-based history system via useUserInteractions hook
 */

import type { EntityType } from "@bibgraph/types";
import { logError, logger } from "@bibgraph/utils/logger";
import { type CatalogueEntity,catalogueService } from "@bibgraph/utils/storage/catalogue-db";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconExternalLink,
  IconHistory,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";
import { useEntityDisplayName } from "@/hooks/use-entity-display-name";
import { useUserInteractions } from "@/hooks/use-user-interactions";

/** Non-entity pages that shouldn't trigger display name fetches */
const NON_ENTITY_URL_PATTERNS = ["/about", "/settings", "/history", "/bookmarks", "/catalogue"];

/** Color mapping for entity type badges - consistent with BookmarkListItem */
const ENTITY_TYPE_COLORS: Record<string, string> = {
  works: "blue",
  authors: "green",
  sources: "orange",
  institutions: "purple",
  topics: "pink",
  concepts: "cyan",
  publishers: "grape",
  funders: "yellow",
  keywords: "teal",
  domains: "indigo",
  fields: "lime",
  subfields: "violet",
};

const getEntityTypeColor = (entityType: string): string => {
  return ENTITY_TYPE_COLORS[entityType] || "gray";
};

/**
 * Sub-component for rendering a single history entry with display name resolution
 */
interface HistoryEntryCardProps {
  entry: CatalogueEntity;
  onNavigate: (entry: CatalogueEntity) => void;
  onDelete: (entityRecordId: string, title?: string) => void;
  formatDate: (date: Date) => string;
}

const HistoryEntryCard = ({ entry, onNavigate, onDelete, formatDate }: HistoryEntryCardProps) => {
  // Check if this is a special ID (search or list)
  const isSpecialId = entry.entityId.startsWith("search-") || entry.entityId.startsWith("list-");

  // Try to extract URL and title from notes
  const urlFromNotes = entry.notes?.match(/URL: ([^\n]+)/)?.[1];
  const titleFromNotes = entry.notes?.match(/Title: ([^\n]+)/)?.[1];

  // Check if URL points to a non-entity page
  const isNonEntityUrl = urlFromNotes && NON_ENTITY_URL_PATTERNS.some(pattern => urlFromNotes.includes(pattern));

  // Only fetch display name for valid entity URLs
  const { displayName, isLoading } = useEntityDisplayName({
    entityId: entry.entityId,
    entityType: entry.entityType as EntityType,
    enabled: !isSpecialId && !isNonEntityUrl,
  });

  // Format entity type for display (e.g., "works" -> "Work")
  const formatEntityType = (entityType: string): string => {
    const singular = entityType.endsWith("s") ? entityType.slice(0, -1) : entityType;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  };

  // Format entity ID for display (shortened if long)
  const formatEntityId = (entityId: string): string => {
    const idMatch = entityId.match(/([A-Z]\d+)$/);
    if (idMatch) {
      const id = idMatch[1];
      return id.length > 8 ? `${id.slice(0, 8)}...` : id;
    }
    return entityId.length > 15 ? `${entityId.slice(0, 15)}...` : entityId;
  };

  // Determine the title to display with proper priority
  let title: string;
  if (isSpecialId) {
    title = entry.entityId.startsWith("search-")
      ? `Search: ${entry.entityId.replace("search-", "").split("-")[0]}`
      : `List: ${entry.entityId.replace("list-", "")}`;
  } else if (isNonEntityUrl && urlFromNotes) {
    // For non-entity pages, show the page name
    const pageName = urlFromNotes.replace(/.*[#/]/, "").split("/")[0];
    title = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  } else if (displayName) {
    // Prefer freshly fetched display name
    title = displayName;
  } else if (titleFromNotes) {
    // Fall back to stored title from notes
    title = titleFromNotes;
  } else {
    // Improved fallback: "Work W1234567..." instead of "works: W123456789012345"
    title = `${formatEntityType(entry.entityType)} ${formatEntityId(entry.entityId)}`;
  }

  return (
    <Card
      key={`${entry.entityId}-${entry.addedAt.getTime()}`}
      style={{ border: BORDER_STYLE_GRAY_3 }}
      padding="md"
      shadow="sm"
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group gap="xs" wrap="nowrap">
            <Badge
              size="xs"
              color={getEntityTypeColor(entry.entityType)}
              variant="light"
            >
              {formatEntityType(entry.entityType)}
            </Badge>
            {isLoading && !titleFromNotes ? (
              <Skeleton height={16} width="60%" />
            ) : (
              <Text size="sm" fw={500} lineClamp={1}>
                {title}
              </Text>
            )}
          </Group>
          {entry.notes && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {entry.notes.split('\n').filter(line => !line.startsWith('URL:') && !line.startsWith('Title:')).join('\n')}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {formatDate(new Date(entry.addedAt))}
          </Text>
        </Stack>
        <Group gap="xs">
          <Tooltip label="Navigate to this entry">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => onNavigate(entry)}
              aria-label={`Navigate to ${title}`}
            >
              <IconExternalLink size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
          {entry.id && (
            <Tooltip label="Delete history entry">
              <ActionIcon
                variant="light"
                color="red"
                aria-label={`Delete ${title} from history`}
                onClick={() => onDelete(entry.id!, title)}
              >
                <IconTrash size={ICON_SIZE.MD} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Card>
  );
};

interface HistoryManagerProps {
  onNavigate?: (url: string) => void;
}

export const HistoryManager = ({ onNavigate }: HistoryManagerProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Use the refactored user interactions hook for history
  const { recentHistory, clearHistory } = useUserInteractions();

  // Filter history entries based on search query
  const filteredEntries = recentHistory.filter(
    (entry) =>
      searchQuery === "" ||
      entry.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleClearHistory = async () => {
    modals.openConfirmModal({
      title: "Clear All History",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to clear all navigation history? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Clear All", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await clearHistory();
          setSearchQuery("");
        } catch (error) {
          logError(logger, "Failed to clear history", error, "HistoryManager");
        }
      },
    });
  };

  const handleNavigate = (entry: CatalogueEntity) => {
    // Extract URL from entry notes or construct from entity
    let url = "";

    // Try to extract URL from notes
    const urlMatch = entry.notes?.match(/URL: ([^\n]+)/);
    if (urlMatch) {
      url = urlMatch[1];
    } else if (entry.entityId.startsWith("search-") || entry.entityId.startsWith("list-")) {
      // For search and list entries, use the URL from notes
      const urlFromNotes = entry.notes?.match(/URL: ([^\n]+)/);
      url = urlFromNotes?.[1] || "";
    } else {
      // For entity entries, construct the internal path
      url = `/${entry.entityType}/${entry.entityId}`;
    }

    // Handle navigation
    if (url.startsWith("/")) {
      if (onNavigate) {
        onNavigate(url);
      } else {
        navigate({ to: url });
      }
    } else if (url) {
      window.location.href = url;
    }
  };

  const handleDeleteHistoryEntry = (entityRecordId: string, entryTitle?: string) => {
    modals.openConfirmModal({
      title: "Delete History Entry",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete {entryTitle ? `"${entryTitle}"` : "this history entry"}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await catalogueService.removeEntityFromList("history-list", entityRecordId);
        } catch (error) {
          logError(logger, "Failed to delete history entry", error, "HistoryManager");
        }
      },
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const diffDays = (date: Date) => {
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const groupEntriesByDate = (entries: Array<CatalogueEntity>) => {
    const groups: { [key: string]: Array<CatalogueEntity> } = {};

    entries.forEach(entry => {
      const date = new Date(entry.addedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else if (diffDays(date) < 7) {
        groupKey = "This week";
      } else {
        groupKey = date.toLocaleDateString();
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
    });

    return groups;
  };

  const groupedEntries = groupEntriesByDate(filteredEntries);

  return (
    <Stack maw={800} mx="auto" p="md">
      <Group justify="space-between" mb="md">
        <Group>
          <IconHistory size={ICON_SIZE.XXL} />
          <Title order={2}>Navigation History</Title>
        </Group>
        <Button
          variant="light"
          color="red"
          leftSection={<IconTrash size={ICON_SIZE.MD} />}
          onClick={handleClearHistory}
          disabled={recentHistory.length === 0}
        >
          Clear History
        </Button>
      </Group>

      {/* Search */}
      <Group mb="md">
        <TextInput
          placeholder="Search history..."
          aria-label="Search navigation history"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={ICON_SIZE.MD} />}
          style={{ flex: 1 }}
        />
        {searchQuery && (
          <Button variant="light" onClick={() => setSearchQuery("")}>
            Clear
          </Button>
        )}
      </Group>

      {filteredEntries.length === 0 ? (
        <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
          <Stack align="center" gap="md">
            <IconHistory
              size={ICON_SIZE.EMPTY_STATE}
              style={{ color: "var(--mantine-color-gray-4)" }}
            />
            <Text size="lg" fw={500}>
              {searchQuery ? "No history found" : "No navigation history yet"}
            </Text>
            <Text size="sm" c="dimmed">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Your navigation history will appear here as you browse"}
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="md">
          {Object.entries(groupedEntries).map(([groupKey, entries]) => (
            <Stack key={groupKey} gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600} c="dimmed">
                  {groupKey}
                </Text>
                <Text size="xs" c="dimmed">
                  {entries.length} {entries.length === 1 ? 'item' : 'items'}
                </Text>
              </Group>
              {entries.map((entry) => (
                <HistoryEntryCard
                  key={`${entry.entityId}-${entry.addedAt.getTime()}`}
                  entry={entry}
                  onNavigate={handleNavigate}
                  onDelete={handleDeleteHistoryEntry}
                  formatDate={formatDate}
                />
              ))}
              {groupKey !== Object.keys(groupedEntries)[Object.keys(groupedEntries).length - 1] && (
                <Divider size="xs" my="xs" />
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {filteredEntries.length > 0 && (
        <Text size="sm" c="dimmed" ta="center" mt="md">
          {filteredEntries.length} history{" "}
          {filteredEntries.length === 1 ? "entry" : "entries"}
        </Text>
      )}
    </Stack>
  );
};
