/**
 * Bookmark manager component for displaying and managing user bookmarks
 */

import { logger } from "@bibgraph/utils/logger";
import { type CatalogueEntity } from "@bibgraph/utils/storage/catalogue-db";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconBookmark,
  IconBookmarkOff,
  IconExternalLink,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect,useState } from "react";

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from "@/config/style-constants";
import {
  BookmarkSelectionProvider,
  useBookmarkSelection,
  useBookmarkSelectionActions,
  useSelectedBookmarks,
  useSelectionCount,
} from "@/contexts/bookmark-selection-context";
import { useUserInteractions } from "@/hooks/user-interactions";

interface BookmarkManagerProps {
  onNavigate?: (url: string) => void;
}

// Bookmark card component with selection
const BookmarkCard = ({
  bookmark,
  isSelected,
  onToggleSelection,
  onNavigate
}: {
  bookmark: CatalogueEntity;
  isSelected: boolean;
  onToggleSelection: () => void;
  onNavigate: (url: string) => void;
}) => {
  // Helper functions to extract data from CatalogueEntity
  const extractTitle = (bookmark: CatalogueEntity): string => {
    const titleMatch = bookmark.notes?.match(/Title: ([^\n]+)/);
    return titleMatch?.[1] || bookmark.entityId;
  };

  const extractUrl = (bookmark: CatalogueEntity): string => {
    const urlMatch = bookmark.notes?.match(/URL: ([^\n]+)/);
    return urlMatch?.[1] || "";
  };

  const extractNotes = (bookmark: CatalogueEntity): string => {
    return bookmark.notes?.split('\n').filter(line => !line.startsWith('URL:') && !line.startsWith('Title:')).join('\n') || '';
  };

  const title = extractTitle(bookmark);
  const url = extractUrl(bookmark);
  const notes = extractNotes(bookmark);

  return (
    <Card
      style={{ border: BORDER_STYLE_GRAY_3 }}
      padding="md"
      data-testid="bookmark-card"
      className={isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}
    >
      <Group justify="space-between" mb="xs">
        <Group>
          <Checkbox
            checked={isSelected}
            onChange={onToggleSelection}
            aria-label={`Select bookmark: ${title}`}
            size="sm"
          />
          <Text
            component="a"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(url);
            }}
            flex={1}
            fw={500}
            c="inherit"
            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            data-testid="bookmark-title-link"
          >
            {title}
          </Text>
        </Group>
      </Group>

      {notes && (
        <Text size="sm" c="dimmed" mb="xs" lineClamp={2}>
          {notes}
        </Text>
      )}

      <Group justify="space-between" mt="xs">
        <Text size="xs" c="dimmed">
          {new Date(bookmark.addedAt).toLocaleDateString()}
        </Text>
        <Tooltip label="Open bookmark">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconExternalLink size={ICON_SIZE.SM} />}
            onClick={() => {
              onNavigate(url);
            }}
            data-testid="bookmark-open-button"
          >
            Open
          </Button>
        </Tooltip>
      </Group>
    </Card>
  );
};

// Inner component that uses selection context
const BookmarkManagerInner = ({ onNavigate }: BookmarkManagerProps) => {
  const {
    bookmarks,
    isLoadingBookmarks,
    bulkRemoveBookmarks
  } = useUserInteractions();
  const [searchQuery, setSearchQuery] = useState("");
  const [selecting, setSelecting] = useState(false);

  // Selection state and actions
  const { state: selectionState } = useBookmarkSelection();
  const selectionCount = useSelectionCount();
  const selectedBookmarks = useSelectedBookmarks();
  const {
    toggleSelection,
    selectAll,
    deselectAll,
    setTotalCount
  } = useBookmarkSelectionActions();

  // Update total count when bookmarks change
  useEffect(() => {
    logger.debug("bookmarks", "Updating total count to:", bookmarks.length);
    setTotalCount(bookmarks.length);
  }, [bookmarks.length, setTotalCount]);

  // Debug selection state
  useEffect(() => {
    logger.debug("bookmarks", "Selection state updated:", {
      selectionCount,
      selectedBookmarks: [...selectedBookmarks],
      isAllSelected: selectionState.isAllSelected,
      totalCount: selectionState.totalCount
    });
  }, [selectionCount, selectedBookmarks, selectionState.isAllSelected, selectionState.totalCount]);

  // Helper functions to extract data from CatalogueEntity
  const extractTitle = (bookmark: CatalogueEntity): string => {
    const titleMatch = bookmark.notes?.match(/Title: ([^\n]+)/);
    return titleMatch?.[1] || bookmark.entityId;
  };

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (bookmark) => {
          const title = extractTitle(bookmark);
          const notes = bookmark.notes?.split('\n').filter(line => !line.startsWith('URL:') && !line.startsWith('Title:')).join('\n') || '';
          return (
            title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notes.toLowerCase().includes(searchQuery.toLowerCase())
          );
        },
      )
    : bookmarks;

  // Bulk operation handlers
  const handleBulkDelete = () => {
    const selectedIds = [...selectedBookmarks];

    if (selectedIds.length === 0) {
      return;
    }

    modals.openConfirmModal({
      title: "Delete Selected Bookmarks",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete {selectedIds.length} selected bookmark{selectedIds.length === 1 ? "" : "s"}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          const result = await bulkRemoveBookmarks(selectedIds);

          // Always show result to user
          modals.open({
            title: result.failed > 0 ? "Partial Success" : "Success",
            children: (
              <Text size="sm">
                {result.failed > 0
                  ? `Successfully deleted ${result.success} bookmark${result.success === 1 ? "" : "s"}, but ${result.failed} failed.`
                  : `Successfully deleted ${result.success} bookmark${result.success === 1 ? "" : "s"}.`
                }
              </Text>
            ),
          });

          deselectAll();
        } catch {
          // Show error modal
          modals.open({
            title: "Error",
            children: (
              <Text size="sm">
                Failed to delete bookmarks. Please try again.
              </Text>
            ),
          });
        }
      },
    });
  };

  const handleNavigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else {
      // Fallback if no onNavigate prop provided
      if (url.startsWith("/")) {
        window.location.hash = url;
      } else if (url.startsWith("https://api.openalex.org")) {
        // Convert API URL to internal path for navigation
        const internalPath = url.replace("https://api.openalex.org", "");
        window.location.hash = internalPath;
      } else {
        window.location.href = url;
      }
    }
  };

  if (isLoadingBookmarks) {
    return (
      <Stack align="center" p="xl">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Loading bookmarks...
        </Text>
      </Stack>
    );
  }

  return (
    <Stack maw={1000} mx="auto" p="md">
        <Group justify="space-between" mb="md">
          <Group>
            <IconBookmark size={ICON_SIZE.XXL} />
            <Text size="xl" fw={700}>
              Bookmarks
            </Text>
            {selectionCount > 0 && (
              <Badge size="lg" color="blue">
                {selectionCount} selected
              </Badge>
            )}
          </Group>
          {filteredBookmarks.length > 0 && (
            <Group gap="xs">
              <Button
                variant="subtle"
                size="sm"
                disabled={selecting}
                onClick={() => {
                  if (selecting) return;
                  setSelecting(true);
                  try {
                    selectAll(filteredBookmarks.map(b => b.id || b.entityId));
                  } finally {
                    setTimeout(() => setSelecting(false), 100);
                  }
                }}
              >
                Select All ({filteredBookmarks.length})
              </Button>
              {selectionCount > 0 && (
                <>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={deselectAll}
                  >
                    Deselect All
                  </Button>
                  <Divider orientation="vertical" />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={handleBulkDelete}
                    title="Delete selected bookmarks"
                    aria-label="Delete selected bookmarks"
                  >
                    <IconTrash size={ICON_SIZE.MD} />
                  </ActionIcon>
                </>
              )}
            </Group>
          )}
        </Group>

        {/* Search */}
        <TextInput
          placeholder="Search bookmarks..."
          aria-label="Search bookmarks"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={ICON_SIZE.MD} />}
          mb="md"
        />

      {filteredBookmarks.length === 0 ? (
        <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xl">
          <Stack align="center" gap="md">
            <div style={{ color: 'var(--mantine-color-dimmed)' }}>
              <IconBookmarkOff size={ICON_SIZE.EMPTY_STATE} />
            </div>
            <Text size="lg" fw={500}>
              {searchQuery ? "No bookmarks found" : "No bookmarks yet"}
            </Text>
            <Text size="sm" c="dimmed">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Bookmark entities you want to revisit later"}
            </Text>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {filteredBookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id || bookmark.entityId}
              bookmark={bookmark}
              isSelected={selectedBookmarks.has(bookmark.id || bookmark.entityId)}
              onToggleSelection={() => toggleSelection(bookmark.id || bookmark.entityId)}
              onNavigate={handleNavigate}
            />
          ))}
        </SimpleGrid>
      )}

      {bookmarks.length > 0 && (
        <Text size="sm" c="dimmed" ta="center" mt="md">
          {filteredBookmarks.length} of {bookmarks.length} bookmarks
        </Text>
      )}
    </Stack>
  );
};

// Main component that provides the selection context
export const BookmarkManager = ({ onNavigate }: BookmarkManagerProps) => <BookmarkSelectionProvider>
      <BookmarkManagerInner onNavigate={onNavigate} />
    </BookmarkSelectionProvider>;
