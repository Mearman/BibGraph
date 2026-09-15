/**
 * History manager component for displaying navigation history
 * Refactored to use catalogue-based history system via useUserInteractions hook
 */

import { logError, logger } from "@bibgraph/utils/logger";
import { type CatalogueEntity } from "@bibgraph/utils/storage/catalogue-db";
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
import { useStorageProvider } from "@/contexts/storage-provider-context";
import { useEntityDisplayName } from "@/hooks/use-entity-display-name";
import { useUserInteractions } from "@/hooks/user-interactions";

/**
Non-entity pages that shouldn't trigger display name fetches
 */
const NON_ENTITY_URL_PATTERNS = ["/about", "/settings", "/history", "/bookmarks", "/catalogue"];

/**
Color mapping for entity type badges - consistent with BookmarkListItem
 */
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
  return ENTITY_TYPE_COLORS[entityType] ?? "gray";
};

// formatEntityId: truncation lengths for shortened OpenAlex IDs and generic entity IDs.
const SHORT_ENTITY_ID_MAX_LENGTH = 8;
const ENTITY_ID_PREVIEW_LENGTH = 15;

// formatDate/groupEntriesByDate: units for converting a millisecond time difference into human terms.
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_HOUR = MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY;
const RECENT_DAYS_THRESHOLD = 7;

/**
 * Sub-component for rendering a single history entry with display name resolution
 */
interface HistoryEntryCardProperties {
  entry: CatalogueEntity;
  onNavigate: (entry: CatalogueEntity) => void;
  onDelete: (entityRecordId: string, title?: string) => void;
  formatDate: (date: Readonly<Date>) => string;
}

const HistoryEntryCard = ({ entry, onNavigate, onDelete, formatDate }: HistoryEntryCardProperties) => {
  // Check if this is a special ID (search or list)
  const isSpecialId = entry.entityId.startsWith("search-") || entry.entityId.startsWith("list-");

  // Try to extract URL and title from notes
  const urlFromNotes = entry.notes?.match(/URL: ([^\n]+)/)?.[1];
  const titleFromNotes = entry.notes?.match(/Title: ([^\n]+)/)?.[1];

  // Check if URL points to a non-entity page
  const isNonEntityUrl = urlFromNotes !== undefined && NON_ENTITY_URL_PATTERNS.some(pattern => urlFromNotes.includes(pattern));

  // Only fetch display name for valid entity URLs
  const { displayName, isLoading } = useEntityDisplayName({
    entityId: entry.entityId,
    entityType: entry.entityType,
    enabled: !isSpecialId && !isNonEntityUrl,
  });

  // Format entity type for display (e.g., "works" -> "Work")
  const formatEntityType = (entityType: string): string => {
    const singular = entityType.endsWith("s") ? entityType.slice(0, -1) : entityType;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  };

  // Format entity ID for display (shortened if long)
  const formatEntityId = (entityId: string): string => {
    const idMatch = /([A-Z]\d+)$/.exec(entityId);
    if (idMatch) {
      const id = idMatch[1];
      return id.length > SHORT_ENTITY_ID_MAX_LENGTH ? `${id.slice(0, SHORT_ENTITY_ID_MAX_LENGTH)}...` : id;
    }
    return entityId.length > ENTITY_ID_PREVIEW_LENGTH ? `${entityId.slice(0, ENTITY_ID_PREVIEW_LENGTH)}...` : entityId;
  };

  // Determine the title to display with proper priority
  let title: string;
  if (isSpecialId) {
    title = entry.entityId.startsWith("search-")
      ? `Search: ${entry.entityId.replace("search-", "").split("-", 1)[0]}`
      : `List: ${entry.entityId.replace("list-", "")}`;
  } else if (isNonEntityUrl) {
    // For non-entity pages, show the page name
    const pageName = urlFromNotes.replace(/.*[#/]/, "").split("/", 1)[0];
    title = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  } else if (displayName !== null && displayName !== "") {
    // Prefer freshly fetched display name
    title = displayName;
  } else if (titleFromNotes !== undefined) {
    // Fall back to stored title from notes
    title = titleFromNotes;
  } else {
    // Improved fallback: "Work W1234567..." instead of "works: W123456789012345"
    title = `${formatEntityType(entry.entityType)} ${formatEntityId(entry.entityId)}`;
  }

  return (
    <Card
      key={`${entry.entityId}-${String(entry.addedAt.getTime())}`}
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
            {isLoading && titleFromNotes === undefined ? (
              <Skeleton height={16} width="60%" />
            ) : (
              <Text size="sm" fw={500} lineClamp={1}>
                {title}
              </Text>
            )}
          </Group>
          {entry.notes !== undefined && entry.notes !== "" && (
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
              onClick={() => { onNavigate(entry); }}
              aria-label={`Navigate to ${title}`}
            >
              <IconExternalLink size={ICON_SIZE.MD} />
            </ActionIcon>
          </Tooltip>
          {entry.id != null && (
            <Tooltip label="Delete history entry">
              <ActionIcon
                variant="light"
                color="red"
                aria-label={`Delete ${title} from history`}
                onClick={() => {
                  const entryId = entry.id;
                  if (entryId != null) {
                    onDelete(entryId, title);
                  }
                }}
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

interface HistoryManagerProperties {
  onNavigate?: (url: string) => void;
}

export const HistoryManager = ({ onNavigate }: HistoryManagerProperties) => {
  const storageProvider = useStorageProvider();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Use the refactored user interactions hook for history
  const { recentHistory, clearHistory } = useUserInteractions();

  // Filter history entries based on search query
  const filteredEntries = recentHistory.filter(
    (entry) =>
      searchQuery === "" ||
      entry.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
  );

  const confirmClearHistory = async (): Promise<void> => {
    try {
      await clearHistory();
      setSearchQuery("");
    } catch (error) {
      logError(logger, "Failed to clear history", error, "HistoryManager");
    }
  };

  const handleClearHistory = () => {
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
      onConfirm: () => {
        void confirmClearHistory();
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
      url = urlFromNotes?.[1] ?? "";
    } else {
      // For entity entries, construct the internal path
      url = `/${entry.entityType}/${entry.entityId}`;
    }

    // Handle navigation
    if (url.startsWith("/")) {
      if (onNavigate) {
        onNavigate(url);
      } else {
        void navigate({ to: url });
      }
    } else if (url) {
      window.location.assign(url);
    }
  };

  const confirmDeleteHistoryEntry = async (entityRecordId: string): Promise<void> => {
    try {
      await storageProvider.removeEntityFromList("history-list", entityRecordId);
    } catch (error) {
      logError(logger, "Failed to delete history entry", error, "HistoryManager");
    }
  };

  const handleDeleteHistoryEntry = (entityRecordId: string, entryTitle?: string) => {
    modals.openConfirmModal({
      title: "Delete History Entry",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete {entryTitle !== undefined && entryTitle !== "" ? `"${entryTitle}"` : "this history entry"}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        void confirmDeleteHistoryEntry(entityRecordId);
      },
    });
  };

  const formatDate = (date: Readonly<Date>) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / MS_PER_HOUR);
    const diffDays = Math.floor(diffMs / MS_PER_DAY);

    if (diffHours < 1) {
      return "Just now";
    }
    if (diffHours < HOURS_PER_DAY) {
      return `${String(diffHours)}h ago`;
    }
    if (diffDays < RECENT_DAYS_THRESHOLD) {
      return `${String(diffDays)}d ago`;
    }
    return date.toLocaleDateString();
  };

  const diffDays = (date: Readonly<Date>) => {
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);
  };

  const groupEntriesByDate = (entries: readonly CatalogueEntity[]) => {
    const groups = new Map<string, CatalogueEntity[]>();

    for (const entry of entries) {
      const date = new Date(entry.addedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else if (diffDays(date) < RECENT_DAYS_THRESHOLD) {
        groupKey = "This week";
      } else {
        groupKey = date.toLocaleDateString();
      }

      const existingGroup = groups.get(groupKey);
      if (existingGroup === undefined) {
        groups.set(groupKey, [entry]);
      } else {
        existingGroup.push(entry);
      }
    }

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
          onChange={(e) => { setSearchQuery(e.target.value); }}
          leftSection={<IconSearch size={ICON_SIZE.MD} />}
          style={{ flex: 1 }}
        />
        {searchQuery && (
          <Button variant="light" onClick={() => { setSearchQuery(""); }}>
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
          {[...groupedEntries].map(([groupKey, entries], groupIndex, groupEntries) => (
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
                  key={`${entry.entityId}-${String(entry.addedAt.getTime())}`}
                  entry={entry}
                  onNavigate={handleNavigate}
                  onDelete={handleDeleteHistoryEntry}
                  formatDate={formatDate}
                />
              ))}
              {groupIndex < groupEntries.length - 1 && (
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
