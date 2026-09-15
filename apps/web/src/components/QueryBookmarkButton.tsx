/**
 * Query bookmark button component for BibGraph
 * Provides bookmarking functionality for complex queries with pagination awareness
 */

import { logger } from "@bibgraph/utils/logger";
import { ActionIcon, Text,Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconCheck,
  IconLoader,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import { NOTIFICATION_DURATION } from "@/config/notification-constants";
import { ICON_SIZE } from "@/config/style-constants";
import { useQueryBookmarking } from "@/hooks/use-query-bookmarking";


interface QueryBookmarkButtonProperties {
  entityType: string;
  entityId?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "subtle" | "light" | "filled" | "outline" | "default" | "transparent";
  showLabel?: boolean;
  disabled?: boolean;
  onBookmark?: () => void;
  onUnbookmark?: () => void;
}

export const QueryBookmarkButton = ({
  entityType,
  entityId,
  size = "sm",
  variant = "subtle",
  showLabel = false,
  disabled = false,
  onBookmark,
  onUnbookmark
}: QueryBookmarkButtonProperties) => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    isQueryBookmarked,
    bookmarkCurrentQuery,
    unbookmarkCurrentQuery,
    generateDefaultTitle,
    currentQueryParams
  } = useQueryBookmarking({
    entityType,
    entityId,
    disabled
  });

  // Don't show bookmark button if there are no semantic query parameters
  // and no specific entity ID (i.e., just a plain list page)
  const hasSemanticQuery = Object.keys(currentQueryParams).length > 0 || entityId !== undefined;
  if (!hasSemanticQuery) {
    return null;
  }

  const handleClick = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    const title = generateDefaultTitle();

    try {
      if (isQueryBookmarked) {
        await unbookmarkCurrentQuery();
        onUnbookmark?.();
        notifications.show({
          title: "Bookmark Removed",
          message: "Query bookmark has been removed",
          color: "gray",
          icon: <IconBookmark size={ICON_SIZE.MD} />,
          autoClose: NOTIFICATION_DURATION.SHORT_MS,
        });
      } else {
        await bookmarkCurrentQuery({ title });
        onBookmark?.();
        notifications.show({
          title: "Query Bookmarked",
          message: `Saved as "${title}"`,
          color: "blue",
          icon: <IconCheck size={ICON_SIZE.MD} />,
          autoClose: NOTIFICATION_DURATION.SHORT_MS,
        });
      }
    } catch (error) {
      logger.error("bookmarks", "Failed to toggle query bookmark:", error);
      notifications.show({
        title: "Bookmark Failed",
        message: "Could not update bookmark. Please try again.",
        color: "red",
        icon: <IconX size={ICON_SIZE.MD} />,
        autoClose: NOTIFICATION_DURATION.MEDIUM_MS,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTooltipLabel = () => {
    if (disabled) return "Query bookmarking disabled";
    if (isLoading) return isQueryBookmarked ? "Removing bookmark..." : "Adding bookmark...";
    return isQueryBookmarked ? "Remove query bookmark" : "Bookmark this query";
  };

  return (
    <Tooltip label={getTooltipLabel()} position="top">
      <div style={{ display: "flex", alignItems: "center", gap: showLabel ? "8px" : "0" }}>
        <ActionIcon
          onClick={() => { void handleClick(); }}
          disabled={disabled || isLoading}
          variant={variant}
          size={size}
          color={isQueryBookmarked ? "blue" : "gray"}
          aria-label={getTooltipLabel()}
          data-testid="query-bookmark-button"
        >
          {isLoading ? (
            <IconLoader size={ICON_SIZE.MD} />
          ) : (isQueryBookmarked ? (
            <IconBookmarkFilled size={ICON_SIZE.MD} />
          ) : (
            <IconBookmark size={ICON_SIZE.MD} />
          ))}
        </ActionIcon>

        {showLabel && (
          <Text size="sm" c={isQueryBookmarked ? "blue" : "gray"}>
            {isQueryBookmarked ? "Bookmarked" : "Bookmark"}
          </Text>
        )}
      </div>
    </Tooltip>
  );
};