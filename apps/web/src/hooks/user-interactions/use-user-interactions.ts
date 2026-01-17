/**
 * React hook for user interactions (visits and bookmarks)
 * Refactored to use catalogue service for bookmarks and history
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import type { CatalogueEntity } from "@bibgraph/utils/storage/catalogue-db";
import {
  catalogueEventEmitter,
  SPECIAL_LIST_IDS,
} from "@bibgraph/utils/storage/catalogue-db";
import { useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useStorageProvider } from "@/contexts/storage-provider-context";
import { serializeSearch } from "@/utils/url-decoding";

import type { HistoryStats, UseUserInteractionsOptions, UseUserInteractionsReturn } from "./types";
import {
  DATA_LOADING_TIMEOUT_MS,
  HISTORY_DEBOUNCE_MS,
  USER_INTERACTIONS_LOGGER_CONTEXT,
} from "./types";
import { useBookmarkOperations } from "./use-bookmark-operations";
import { useHistoryOperations } from "./use-history-operations";

export const useUserInteractions = (
  options: UseUserInteractionsOptions = {},
): UseUserInteractionsReturn => {
  const {
    entityId,
    entityType,
    searchQuery,
    filters,
    url,
    autoTrackVisits = true,
    sessionId,
    displayName,
  } = options;

  const location = useLocation();
  const storageProvider = useStorageProvider();

  // State
  const [recentHistory, setRecentHistory] = useState<CatalogueEntity[]>([]);
  const [bookmarks, setBookmarks] = useState<CatalogueEntity[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [historyStats, setHistoryStats] = useState<HistoryStats>({
    totalVisits: 0,
    uniqueEntities: 0,
    byType: {},
  });

  // Loading states
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Track component mount status to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Debounce history entries to prevent duplicates on rapid navigation
  const lastHistoryRef = useRef<{ entityId: string; time: number } | null>(null);

  // Track which entityId a displayName was loaded for to prevent mismatches
  const displayNameEntityRef = useRef<string | undefined>(undefined);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update displayName entity reference when displayName changes
  useEffect(() => {
    if (displayName && entityId) {
      displayNameEntityRef.current = entityId;
    }
  }, [displayName, entityId]);

  const refreshData = useCallback(async () => {
    setIsLoadingHistory(true);
    setIsLoadingBookmarks(true);
    setIsLoadingStats(true);

    const timeoutPromise = new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error("User interactions data loading timed out after 10 seconds"));
      }, DATA_LOADING_TIMEOUT_MS);
    });

    try {
      const dataLoadPromise = (async () => {
        await storageProvider.initializeSpecialLists();

        const historyEntries = await storageProvider.getHistory();
        if (isMountedRef.current) {
          setRecentHistory(historyEntries.slice(-20).reverse());
        }

        if (entityId && entityType) {
          const bookmarked = await storageProvider.isBookmarked(
            entityType as EntityType,
            entityId,
          );
          if (isMountedRef.current) {
            setIsBookmarked(bookmarked);
          }
        } else if (searchQuery || url) {
          const allBookmarks = await storageProvider.getBookmarks();
          const searchTerm = searchQuery || url;
          const bookmarked = allBookmarks.some((bookmark) =>
            bookmark.notes?.includes(searchTerm || ""),
          );
          if (isMountedRef.current) {
            setIsBookmarked(bookmarked);
          }
        }

        const allBookmarks = await storageProvider.getBookmarks();
        if (isMountedRef.current) {
          setBookmarks(allBookmarks);
        }

        const stats = await storageProvider.getListStats(SPECIAL_LIST_IDS.HISTORY);
        if (isMountedRef.current) {
          setHistoryStats({
            totalVisits: stats.totalEntities,
            uniqueEntities: stats.totalEntities,
            byType: stats.entityCounts,
          });
        }
      })();

      await Promise.race([dataLoadPromise, timeoutPromise]);
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to refresh user interaction data",
        { error },
      );

      if (isMountedRef.current) {
        setRecentHistory([]);
        setBookmarks([]);
        setHistoryStats({ totalVisits: 0, uniqueEntities: 0, byType: {} });
        setIsBookmarked(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingHistory(false);
        setIsLoadingBookmarks(false);
        setIsLoadingStats(false);
      }
    }
  }, [entityId, entityType, searchQuery, url, storageProvider]);

  // Auto-track page visits when enabled
  useEffect(() => {
    if (autoTrackVisits && entityId && entityType) {
      const trackPageVisit = async () => {
        try {
          const currentUrl = location.pathname + serializeSearch(location.search);
          const urlMatchesEntity =
            currentUrl.includes(`/${entityType}/`) && currentUrl.includes(entityId);
          if (!urlMatchesEntity) {
            logger.debug(
              USER_INTERACTIONS_LOGGER_CONTEXT,
              "Skipping history record - URL doesn't match entity (navigation race condition)",
              { entityId, entityType, currentUrl },
            );
            return;
          }

          const now = Date.now();
          if (
            lastHistoryRef.current?.entityId === entityId &&
            now - lastHistoryRef.current.time < HISTORY_DEBOUNCE_MS
          ) {
            return;
          }

          const safeDisplayName =
            displayNameEntityRef.current === entityId ? displayName : undefined;

          await storageProvider.addToHistory({
            entityType: entityType as EntityType,
            entityId: entityId,
            url: currentUrl,
            title: safeDisplayName,
          });

          lastHistoryRef.current = { entityId, time: now };
        } catch (error) {
          logger.error(USER_INTERACTIONS_LOGGER_CONTEXT, "Failed to auto-track page visit", {
            entityId,
            entityType,
            error,
          });
        }
      };

      void trackPageVisit();
    }
  }, [
    entityId,
    entityType,
    autoTrackVisits,
    sessionId,
    displayName,
    location.pathname,
    location.search,
    storageProvider,
  ]);

  // Load data on mount and when entity changes
  useEffect(() => {
    void refreshData();
  }, [entityId, entityType, searchQuery, url]);

  // Listen for catalogue change events to keep all instances in sync
  useEffect(() => {
    const unsubscribe = catalogueEventEmitter.subscribe((event) => {
      logger.debug(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Catalogue change detected, refreshing data",
        { event },
      );
      void refreshData();
    });

    return unsubscribe;
  }, [refreshData]);

  // Use composed hooks for operations
  const bookmarkOps = useBookmarkOperations({
    entityId,
    entityType,
    searchQuery,
    filters,
    url,
    isBookmarked,
    setIsBookmarked,
    refreshData,
  });

  const historyOps = useHistoryOperations({
    refreshData,
  });

  return {
    // Page visit tracking (now using catalogue history)
    recordPageVisit: historyOps.recordPageVisit,
    recentHistory,
    historyStats,

    // Bookmark management (now using catalogue bookmarks)
    bookmarks,
    isBookmarked,
    bookmarkEntity: bookmarkOps.bookmarkEntity,
    bookmarkSearch: bookmarkOps.bookmarkSearch,
    bookmarkList: bookmarkOps.bookmarkList,
    unbookmarkEntity: bookmarkOps.unbookmarkEntity,
    unbookmarkSearch: bookmarkOps.unbookmarkSearch,
    unbookmarkList: bookmarkOps.unbookmarkList,
    updateBookmark: bookmarkOps.updateBookmark,
    searchBookmarks: bookmarkOps.searchBookmarks,

    // Bulk operations
    bulkRemoveBookmarks: bookmarkOps.bulkRemoveBookmarks,

    // History management
    clearHistory: historyOps.clearHistory,

    // Loading states
    isLoadingHistory,
    isLoadingBookmarks,
    isLoadingStats,

    // Actions
    refreshData,
  };
};
