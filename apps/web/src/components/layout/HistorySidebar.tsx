/**
 * History sidebar component for managing navigation history in the right sidebar
 */

import { logError, logger } from "@bibgraph/utils/logger";
import type { CatalogueEntity } from "@bibgraph/utils/storage/catalogue-db";
import {
  ActionIcon,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconHistory,
  IconSearch,
  IconSettings,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { CARD_BORDER_STYLE, ICON_SIZE } from "@/config/style-constants";
import { useUserInteractions } from "@/hooks/user-interactions";

import { HistoryCard } from "./HistoryCard";
import * as styles from "./sidebar.css";

interface HistorySidebarProps {
  onClose?: () => void;
}

export const HistorySidebar = ({ onClose }: HistorySidebarProps) => {
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
      onConfirm: async () => {
        try {
          await clearHistory();
          setSearchQuery("");
        } catch (error) {
          logError(logger, "Failed to clear history", error, "HistorySidebar");
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
    <div className={styles.sidebarContainer}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>
          <IconHistory size={ICON_SIZE.LG} />
          <Title order={6}>History</Title>
        </div>
        <Group gap="xs">
          <Tooltip label="Manage all history">
            <ActionIcon
              size="sm"
              variant="subtle"
              component={Link}
              to="/history"
              aria-label="Go to history management page"
            >
              <IconSettings size={ICON_SIZE.SM} />
            </ActionIcon>
          </Tooltip>
          {onClose && (
            <ActionIcon size="sm" variant="subtle" onClick={onClose}>
              <IconX size={ICON_SIZE.SM} />
            </ActionIcon>
          )}
        </Group>
      </div>

      {/* Search */}
      <Group gap="xs" className={styles.searchInput}>
        <TextInput
          placeholder="Search history..."
          aria-label="Search navigation history"
          label="Search history"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={ICON_SIZE.SM} />}
          size="sm"
          style={{ flex: 1 }}
        />
        {recentHistory.length > 0 && (
          <Tooltip label="Clear all history">
            <ActionIcon
              variant="light"
              color="red"
              size="sm"
              onClick={handleClearHistory}
              className={styles.actionButton}
              aria-label="Clear all navigation history"
            >
              <IconTrash size={ICON_SIZE.SM} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* History List */}
      <div className={styles.scrollableContent}>
        {filteredEntries.length === 0 ? (
          <Card style={CARD_BORDER_STYLE} p="md">
            <Stack align="center" gap="md" className={styles.emptyState}>
              <IconHistory
                size={ICON_SIZE.EMPTY_STATE_SM}
                style={{ color: "var(--mantine-color-gray-4)" }}
              />
              <Text size="sm" fw={500} ta="center">
                {searchQuery ? "No history found" : "No navigation history yet"}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Your navigation history will appear here"}
              </Text>
            </Stack>
          </Card>
        ) : (
          <Stack gap="xs">
            {Object.entries(groupedEntries).map(([groupKey, entries]) => (
              <Stack key={groupKey} gap="xs">
                <div className={styles.groupHeader}>
                  <Text className={styles.groupTitle}>
                    {groupKey}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {entries.length} {entries.length === 1 ? 'item' : 'items'}
                  </Text>
                </div>
{entries.map((entry) => (
                  <HistoryCard
                    key={`${entry.entityId}-${entry.addedAt.getTime()}`}
                    entry={entry}
                    onClose={onClose}
                    formatDate={formatDate}
                  />
                ))}
                {groupKey !== Object.keys(groupedEntries)[Object.keys(groupedEntries).length - 1] && (
                  <Divider size="xs" className={styles.groupDivider} />
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </div>

      {/* Footer */}
      {filteredEntries.length > 0 && (
        <Text className={styles.footerText}>
          {filteredEntries.length} history {filteredEntries.length === 1 ? 'entry' : 'entries'}
        </Text>
      )}
    </div>
  );
};