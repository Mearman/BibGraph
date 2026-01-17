/**
 * Hook for bookmark operations (add, remove, update, search)
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import type { CatalogueEntity } from "@bibgraph/utils/storage/catalogue-db";
import {
  catalogueEventEmitter,
  SPECIAL_LIST_IDS,
} from "@bibgraph/utils/storage/catalogue-db";
import { useCallback } from "react";

import { useNotifications } from "@/contexts/NotificationContext";
import { useStorageProvider } from "@/contexts/storage-provider-context";

import type {
  BookmarkEntityParams,
  BookmarkListParams,
  BookmarkSearchParams,
  BulkRemoveResult,
} from "./types";
import { USER_INTERACTIONS_LOGGER_CONTEXT } from "./types";

export interface UseBookmarkOperationsParams {
  entityId?: string;
  entityType?: string;
  searchQuery?: string;
  filters?: Record<string, unknown>;
  url?: string;
  isBookmarked: boolean;
  setIsBookmarked: (value: boolean) => void;
  refreshData: () => Promise<void>;
}

export interface UseBookmarkOperationsReturn {
  bookmarkEntity: (params: BookmarkEntityParams) => Promise<void>;
  bookmarkSearch: (params: BookmarkSearchParams) => Promise<void>;
  bookmarkList: (params: BookmarkListParams) => Promise<void>;
  unbookmarkEntity: () => Promise<void>;
  unbookmarkSearch: () => Promise<void>;
  unbookmarkList: () => Promise<void>;
  updateBookmark: (updates: Partial<Pick<CatalogueEntity, "notes">>) => Promise<void>;
  searchBookmarks: (query: string) => Promise<CatalogueEntity[]>;
  bulkRemoveBookmarks: (bookmarkRecordIds: string[]) => Promise<BulkRemoveResult>;
}

export const useBookmarkOperations = ({
  entityId,
  entityType,
  searchQuery,
  filters,
  url,
  isBookmarked,
  setIsBookmarked,
  refreshData,
}: UseBookmarkOperationsParams): UseBookmarkOperationsReturn => {
  const { showNotification } = useNotifications();
  const storageProvider = useStorageProvider();

  const bookmarkEntity = useCallback(
    async ({ title: _title, notes, tags }: BookmarkEntityParams) => {
      if (!entityId || !entityType) {
        throw new Error("Entity ID and type are required to bookmark");
      }

      const wasBookmarked = isBookmarked;
      setIsBookmarked(true);

      try {
        await storageProvider.addBookmark({
          entityType: entityType as EntityType,
          entityId: entityId,
          notes: tags ? `${notes || ""}\n\nTags: ${tags.join(", ")}` : notes,
        });

        showNotification({
          title: "Success",
          message: "Added to bookmarks",
          category: "success",
        });

        await refreshData();
      } catch (error) {
        setIsBookmarked(wasBookmarked);

        logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to bookmark entity", {
          entityId,
          entityType,
          error,
        });

        showNotification({
          title: "Error",
          message: `Failed to bookmark: ${error instanceof Error ? error.message : "Unknown error"}`,
          category: "error",
        });

        throw error;
      }
    },
    [entityId, entityType, refreshData, isBookmarked, showNotification, setIsBookmarked, storageProvider],
  );

  const unbookmarkEntity = useCallback(async () => {
    if (!entityId || !entityType) {
      throw new Error("Entity ID and type are required to unbookmark");
    }

    const wasBookmarked = isBookmarked;
    setIsBookmarked(false);

    try {
      const allBookmarks = await storageProvider.getBookmarks();
      const bookmark = allBookmarks.find(
        (b) => b.entityType === entityType && b.entityId === entityId,
      );

      if (bookmark?.id) {
        await storageProvider.removeBookmark(bookmark.id);

        showNotification({
          title: "Success",
          message: "Removed from bookmarks",
          category: "success",
        });

        await refreshData();
      }
    } catch (error) {
      setIsBookmarked(wasBookmarked);

      logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to unbookmark entity", {
        entityId,
        entityType,
        error,
      });

      showNotification({
        title: "Error",
        message: `Failed to remove bookmark: ${error instanceof Error ? error.message : "Unknown error"}`,
        category: "error",
      });

      throw error;
    }
  }, [entityId, entityType, refreshData, isBookmarked, showNotification, setIsBookmarked, storageProvider]);

  const bookmarkSearch = useCallback(
    async ({ title, searchQuery, filters, notes, tags }: BookmarkSearchParams) => {
      try {
        const searchId = `search-${searchQuery}-${JSON.stringify(filters || {})}`;

        await storageProvider.addBookmark({
          entityType: "works",
          entityId: searchId,
          notes: `Title: ${title}\n\nSearch Query: ${searchQuery}\n${filters ? `Filters: ${JSON.stringify(filters, null, 2)}` : ""}${notes ? `\n\nNotes: ${notes}` : ""}${tags ? `\n\nTags: ${tags.join(", ")}` : ""}`,
        });

        setIsBookmarked(true);

        showNotification({
          title: "Success",
          message: "Saved search to bookmarks",
          category: "success",
        });

        await refreshData();
      } catch (error) {
        logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to bookmark search", {
          searchQuery,
          filters,
          error,
        });

        showNotification({
          title: "Error",
          message: `Failed to save search: ${error instanceof Error ? error.message : "Unknown error"}`,
          category: "error",
        });

        throw error;
      }
    },
    [refreshData, showNotification, setIsBookmarked, storageProvider],
  );

  const bookmarkList = useCallback(
    async ({ title, url, notes, tags }: BookmarkListParams) => {
      try {
        const listId = `list-${url}`;

        await storageProvider.addBookmark({
          entityType: "works",
          entityId: listId,
          notes: `Title: ${title}\n\n${tags ? `${notes || ""}\n\nTags: ${tags.join(", ")}` : notes}`,
        });

        setIsBookmarked(true);

        showNotification({
          title: "Success",
          message: "Saved list to bookmarks",
          category: "success",
        });

        await refreshData();
      } catch (error) {
        logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to bookmark list", {
          url,
          error,
        });

        showNotification({
          title: "Error",
          message: `Failed to save list: ${error instanceof Error ? error.message : "Unknown error"}`,
          category: "error",
        });

        throw error;
      }
    },
    [refreshData, showNotification, setIsBookmarked, storageProvider],
  );

  const unbookmarkSearch = useCallback(async () => {
    if (!searchQuery) {
      throw new Error("Search query is required to unbookmark");
    }

    const wasBookmarked = isBookmarked;
    setIsBookmarked(false);

    try {
      const allBookmarks = await storageProvider.getBookmarks();
      const searchId = `search-${searchQuery}-${JSON.stringify(filters || {})}`;
      const bookmark = allBookmarks.find((b) => b.entityId === searchId);

      if (bookmark?.id) {
        await storageProvider.removeBookmark(bookmark.id);

        showNotification({
          title: "Success",
          message: "Removed saved search from bookmarks",
          category: "success",
        });

        await refreshData();
      }
    } catch (error) {
      setIsBookmarked(wasBookmarked);

      logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to unbookmark search", {
        searchQuery,
        filters,
        error,
      });

      showNotification({
        title: "Error",
        message: `Failed to remove: ${error instanceof Error ? error.message : "Unknown error"}`,
        category: "error",
      });

      throw error;
    }
  }, [searchQuery, filters, refreshData, isBookmarked, showNotification, setIsBookmarked, storageProvider]);

  const unbookmarkList = useCallback(async () => {
    if (!url) {
      throw new Error("URL is required to unbookmark list");
    }

    const wasBookmarked = isBookmarked;
    setIsBookmarked(false);

    try {
      const allBookmarks = await storageProvider.getBookmarks();
      const listId = `list-${url}`;
      const bookmark = allBookmarks.find((b) => b.entityId === listId);

      if (bookmark?.id) {
        await storageProvider.removeBookmark(bookmark.id);

        showNotification({
          title: "Success",
          message: "Removed saved list from bookmarks",
          category: "success",
        });

        await refreshData();
      }
    } catch (error) {
      setIsBookmarked(wasBookmarked);

      logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to unbookmark list", {
        url,
        error,
      });

      showNotification({
        title: "Error",
        message: `Failed to remove: ${error instanceof Error ? error.message : "Unknown error"}`,
        category: "error",
      });

      throw error;
    }
  }, [url, refreshData, isBookmarked, showNotification, setIsBookmarked, storageProvider]);

  const updateBookmark = useCallback(
    async (updates: Partial<Pick<CatalogueEntity, "notes">>) => {
      if (!entityId || !entityType) {
        throw new Error("Entity ID and type are required to update bookmark");
      }

      try {
        const allBookmarks = await storageProvider.getBookmarks();
        const bookmark = allBookmarks.find(
          (b) => b.entityType === entityType && b.entityId === entityId,
        );

        if (bookmark?.id) {
          await storageProvider.updateList(SPECIAL_LIST_IDS.BOOKMARKS, {});
          await refreshData();
        }
      } catch (error) {
        logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to update bookmark", {
          entityId,
          entityType,
          updates,
          error,
        });
        throw error;
      }
    },
    [entityId, entityType, refreshData, storageProvider],
  );

  const searchBookmarks = useCallback(
    async (query: string): Promise<CatalogueEntity[]> => {
      try {
        const allBookmarks = await storageProvider.getBookmarks();
        const lowercaseQuery = query.toLowerCase();

        return allBookmarks.filter(
          (bookmark) =>
            bookmark.notes?.toLowerCase().includes(lowercaseQuery) ||
            bookmark.entityId.toLowerCase().includes(lowercaseQuery),
        );
      } catch (error) {
        logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to search bookmarks", {
          query,
          error,
        });
        return [];
      }
    },
    [storageProvider],
  );

  const bulkRemoveBookmarks = useCallback(
    async (bookmarkRecordIds: string[]): Promise<BulkRemoveResult> => {
      let success = 0;
      let failed = 0;

      try {
        for (const recordId of bookmarkRecordIds) {
          try {
            await storageProvider.removeEntityFromList(SPECIAL_LIST_IDS.BOOKMARKS, recordId);
            success++;
          } catch (error) {
            logger.error(
              USER_INTERACTIONS_LOGGER_CONTEXT,
              "Failed to remove bookmark in bulk operation",
              { recordId, error },
            );
            failed++;
          }
        }

        await storageProvider.updateList(SPECIAL_LIST_IDS.BOOKMARKS, {});

        if (success > 0) {
          catalogueEventEmitter.emit({
            type: "entity-removed",
            listId: SPECIAL_LIST_IDS.BOOKMARKS,
          });
        }

        showNotification({
          title: "Success",
          message: `Removed ${success} bookmark${success !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`,
          category: "success",
        });

        await refreshData();
        return { success, failed };
      } catch (error) {
        logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to bulk remove bookmarks", {
          bookmarkRecordIds,
          error,
        });

        showNotification({
          title: "Error",
          message: `Bulk remove failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          category: "error",
        });

        throw error;
      }
    },
    [refreshData, showNotification, storageProvider],
  );

  return {
    bookmarkEntity,
    bookmarkSearch,
    bookmarkList,
    unbookmarkEntity,
    unbookmarkSearch,
    unbookmarkList,
    updateBookmark,
    searchBookmarks,
    bulkRemoveBookmarks,
  };
};
