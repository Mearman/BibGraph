/**
 * Fallback sidebar component for test environments
 * Ensures sidebar content always renders regardless of data loading issues
 */

import {
  ActionIcon,
  Card,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconBookmark,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import { CARD_BORDER_STYLE, ICON_SIZE } from "@/config/style-constants";

import * as styles from "./sidebar.css";

interface SidebarFallbackProperties {
  title: string;
  type: "bookmarks" | "history";
  onClose?: () => void;
}

export const SidebarFallback = ({ title, type, onClose }: SidebarFallbackProperties) => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className={styles.sidebarContainer}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>
          <IconBookmark size={ICON_SIZE.LG} />
          <Title order={6}>{title}</Title>
        </div>
        {onClose && (
          <ActionIcon size="sm" variant="subtle" onClick={onClose}>
            <IconX size={ICON_SIZE.SM} />
          </ActionIcon>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchInput}>
        <TextInput
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); }}
          leftSection={<IconSearch size={ICON_SIZE.SM} />}
          size="sm"
        />
      </div>

      {/* Empty State */}
      <div className={styles.scrollableContent}>
        <Card style={CARD_BORDER_STYLE} p="md">
          <div className={styles.emptyState}>
            <IconBookmark size={ICON_SIZE.EMPTY_STATE_SM} />
            <Text size="sm" fw={500} ta="center">
              {searchQuery ? `No ${title.toLowerCase()} found` : `No ${title.toLowerCase()} yet`}
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              {type === "bookmarks"
                ? "Bookmark entities you want to revisit later"
                : "Your browsing history will appear here"
              }
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};