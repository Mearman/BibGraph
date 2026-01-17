/**
 * Search bookmark button component
 */
import { logger } from "@bibgraph/utils";
import { Button, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBookmark, IconBookmarkOff } from "@tabler/icons-react";

import { ICON_SIZE, TIME_MS } from "@/config/style-constants";
import type { UseUserInteractionsReturn } from "@/hooks/user-interactions";

interface SearchBookmarkButtonProps {
  searchQuery: string;
  userInteractions: Pick<UseUserInteractionsReturn, 'isBookmarked' | 'bookmarkSearch' | 'unbookmarkSearch'>;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

export const SearchBookmarkButton = ({
  searchQuery,
  userInteractions,
  loading,
  onLoadingChange,
}: SearchBookmarkButtonProps) => {
  const handleToggleBookmark = async () => {
    onLoadingChange(true);
    try {
      if (userInteractions.isBookmarked) {
        await userInteractions.unbookmarkSearch();
        notifications.show({
          title: "Bookmark Removed",
          message: `Search "${searchQuery}" has been removed from your bookmarks`,
          color: "green",
          autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
        });
      } else {
        const title = searchQuery;
        await userInteractions.bookmarkSearch({
          title,
          searchQuery: searchQuery,
        });
        notifications.show({
          title: "Search Bookmarked",
          message: `Search "${searchQuery}" has been added to your bookmarks`,
          color: "blue",
          autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
        });
      }
    } catch (error) {
      logger.error("ui", "Bookmark operation failed", {
        error,
        searchQuery: searchQuery,
        isBookmarked: userInteractions.isBookmarked
      }, "SearchBookmarkButton");

      notifications.show({
        title: "Bookmark Failed",
        message: "Could not update bookmark. Please try again.",
        color: "red",
        autoClose: TIME_MS.BOOKMARK_FEEDBACK_DURATION,
      });
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <Group justify="end">
      <Button
        variant="light"
        color={userInteractions.isBookmarked ? "yellow" : "gray"}
        size="sm"
        disabled={loading}
        onClick={handleToggleBookmark}
        leftSection={
          userInteractions.isBookmarked ? (
            <IconBookmark size={ICON_SIZE.MD} fill="currentColor" />
          ) : (
            <IconBookmarkOff size={ICON_SIZE.MD} />
          )
        }
        title={
          userInteractions.isBookmarked
            ? "Remove search bookmark"
            : "Bookmark this search"
        }
      >
        {userInteractions.isBookmarked ? "Bookmarked" : "Bookmark Search"}
      </Button>
    </Group>
  );
};
