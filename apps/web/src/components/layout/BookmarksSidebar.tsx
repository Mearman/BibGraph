/**
 * Bookmarks sidebar component for managing bookmarks in the left sidebar
 */

import { logger } from "@bibgraph/utils/logger";
import {
  ActionIcon,
  Box,
  Card,
  Collapse,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconBook,
  IconBookmark,
  IconBookmarkOff,
  IconChevronDown,
  IconChevronRight,
  IconList,
  IconPlus,
  IconSearch,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { ICON_SIZE } from "@/config/style-constants";
import { useCatalogue } from "@/hooks/useCatalogue";
import { useUserInteractions } from "@/hooks/user-interactions";

import { BookmarkCard } from "./BookmarkCard";
import { CatalogueListCard } from "./CatalogueListCard";
import * as styles from "./sidebar.css";

interface BookmarksSidebarProps {
  onClose?: () => void;
}

export const BookmarksSidebar = ({ onClose }: BookmarksSidebarProps) => {
  // Simplified data loading without timeout fallback
  const safeUseUserInteractions = () => {
    try {
      return useUserInteractions();
    } catch (error) {
      logger.error('bookmarks', 'BookmarksSidebar: Error in useUserInteractions', error);
      // Return fallback values
      return {
        bookmarks: [],
        isLoadingBookmarks: false,
        refreshData: async () => {},
        isBookmarked: false,
        recordPageVisit: async () => {},
        bookmarkEntity: async () => {},
        bookmarkSearch: async () => {},
        bookmarkList: async () => {},
        unbookmarkEntity: async () => {},
        unbookmarkSearch: async () => {},
        unbookmarkList: async () => {},
        updateBookmark: async () => {},
        searchBookmarks: async () => [],
        isLoadingPageVisits: false,
        isLoadingStats: false,
      };
    }
  };

  const { bookmarks, isLoadingBookmarks, refreshData } = safeUseUserInteractions();
  const { lists, isLoadingLists } = useCatalogue({ autoRefresh: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [listsExpanded, setListsExpanded] = useState(true);
  const [bookmarksExpanded, setBookmarksExpanded] = useState(true);

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (bookmark) =>
          bookmark.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.entityType.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : bookmarks;

  if (isLoadingBookmarks) {
    return (
      <div className={styles.sidebarContainer}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitle}>
            <IconBookmark size={ICON_SIZE.LG} />
            <Title order={6}>Bookmarks</Title>
          </div>
          <Group gap="xs">
            <Tooltip label="Manage all bookmarks">
              <ActionIcon
                size="sm"
                variant="subtle"
                component={Link}
                to="/bookmarks"
                aria-label="Go to bookmarks management page"
              >
                <IconSettings size={ICON_SIZE.SM} />
              </ActionIcon>
            </Tooltip>
            {onClose && (
              <ActionIcon size="sm" variant="subtle" onClick={onClose} aria-label="Close sidebar">
                <IconX size={ICON_SIZE.SM} />
              </ActionIcon>
            )}
          </Group>
        </div>
        <div className={styles.emptyState}>
          <Loader size="sm" />
          <Text size="xs" c="dimmed">
            Loading bookmarks...
          </Text>
        </div>
      </div>
    );
  }

  // Filter lists to exclude special system lists (bookmarks, history)
  const userLists = lists.filter(list =>
    list.type === "list" || list.type === "bibliography"
  );

  return (
    <div className={styles.sidebarContainer}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>
          <IconBook size={ICON_SIZE.LG} />
          <Title order={6}>Collections</Title>
        </div>
        <Group gap="xs">
          {onClose && (
            <ActionIcon size="sm" variant="subtle" onClick={onClose} aria-label="Close sidebar">
              <IconX size={ICON_SIZE.SM} />
            </ActionIcon>
          )}
        </Group>
      </div>

      {/* Scrollable Content */}
      <div className={styles.scrollableContent}>
        {/* Catalogue Lists Section */}
        <Box mb="md">
          <Group
            justify="space-between"
            align="center"
            mb="xs"
            style={{ cursor: "pointer" }}
            onClick={() => setListsExpanded(!listsExpanded)}
            role="button"
            aria-expanded={listsExpanded}
            aria-label="Toggle lists section"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setListsExpanded(!listsExpanded); }}
          >
            <Group gap="xs">
              {listsExpanded ? <IconChevronDown size={ICON_SIZE.SM} /> : <IconChevronRight size={ICON_SIZE.SM} />}
              <IconList size={ICON_SIZE.SM} />
              <Text size="sm" fw={600}>Lists</Text>
              <Text size="xs" c="dimmed">({userLists.length})</Text>
            </Group>
            <Group gap="xs">
              <Tooltip label="Create new list">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  component={Link}
                  to="/catalogue"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (onClose) onClose();
                  }}
                  aria-label="Create new list"
                >
                  <IconPlus size={ICON_SIZE.XS} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Manage catalogue">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  component={Link}
                  to="/catalogue"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (onClose) onClose();
                  }}
                  aria-label="Go to catalogue management"
                >
                  <IconSettings size={ICON_SIZE.XS} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Collapse in={listsExpanded}>
            {isLoadingLists ? (
              <Group justify="center" p="sm">
                <Loader size="xs" />
                <Text size="xs" c="dimmed">Loading lists...</Text>
              </Group>
            ) : (userLists.length === 0 ? (
              <Card withBorder p="sm">
                <Text size="xs" c="dimmed" ta="center">
                  No lists yet. Create one from the Catalogue page.
                </Text>
              </Card>
            ) : (
              <Stack gap="xs">
                {userLists.map((list) => (
                  <CatalogueListCard
                    key={list.id}
                    list={list}
                    onClose={onClose}
                  />
                ))}
              </Stack>
            ))}
          </Collapse>
        </Box>

        <Divider my="sm" />

        {/* Bookmarks Section */}
        <Box>
          <Group
            justify="space-between"
            align="center"
            mb="xs"
            style={{ cursor: "pointer" }}
            onClick={() => setBookmarksExpanded(!bookmarksExpanded)}
            role="button"
            aria-expanded={bookmarksExpanded}
            aria-label="Toggle bookmarks section"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setBookmarksExpanded(!bookmarksExpanded); }}
          >
            <Group gap="xs">
              {bookmarksExpanded ? <IconChevronDown size={ICON_SIZE.SM} /> : <IconChevronRight size={ICON_SIZE.SM} />}
              <IconBookmark size={ICON_SIZE.SM} />
              <Text size="sm" fw={600}>Bookmarks</Text>
              <Text size="xs" c="dimmed">({bookmarks.length})</Text>
            </Group>
            <Tooltip label="Manage bookmarks">
              <ActionIcon
                size="xs"
                variant="subtle"
                component={Link}
                to="/bookmarks"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (onClose) onClose();
                }}
                aria-label="Go to bookmarks management"
              >
                <IconSettings size={ICON_SIZE.XS} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Collapse in={bookmarksExpanded}>
            {/* Search */}
            {bookmarks.length > 0 && (
              <Box mb="xs">
                <TextInput
                  placeholder="Search bookmarks..."
                  aria-label="Search bookmarks"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftSection={<IconSearch size={ICON_SIZE.SM} />}
                  size="xs"
                />
              </Box>
            )}

            {isLoadingBookmarks ? (
              <Group justify="center" p="sm">
                <Loader size="xs" />
                <Text size="xs" c="dimmed">Loading bookmarks...</Text>
              </Group>
            ) : (filteredBookmarks.length === 0 ? (
              <Card withBorder p="sm">
                <Box className={styles.emptyState} p="md">
                  <IconBookmarkOff size={ICON_SIZE.XXL} />
                  <Text size="xs" fw={500} ta="center">
                    {searchQuery ? "No bookmarks found" : "No bookmarks yet"}
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Bookmark entities to revisit later"}
                  </Text>
                </Box>
              </Card>
            ) : (
              <Stack gap="xs">
                {filteredBookmarks.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id || bookmark.entityId}
                    bookmark={bookmark}
                    onClose={onClose}
                    onDeleted={refreshData}
                  />
                ))}
              </Stack>
            ))}
          </Collapse>
        </Box>
      </div>

      {/* Footer */}
      <Text className={styles.footerText}>
        {userLists.length} lists, {bookmarks.length} bookmarks
      </Text>
    </div>
  );
};