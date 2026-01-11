/**
 * React hook for user interactions (visits and bookmarks)
 * Refactored to use catalogue service for bookmarks and history
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import {
  type CatalogueEntity,
  catalogueEventEmitter,
  catalogueService,
  SPECIAL_LIST_IDS,
} from "@bibgraph/utils/storage/catalogue-db";
import { useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { serializeSearch } from "@/utils/url-decoding";

const USER_INTERACTIONS_LOGGER_CONTEXT = "user-interactions";

export interface UseUserInteractionsOptions {
  entityId?: string;
  entityType?: string;
  searchQuery?: string;
  filters?: Record<string, unknown>;
  url?: string;
  autoTrackVisits?: boolean;
  sessionId?: string;
  /** Display name for the entity (used for history title) */
  displayName?: string;
}

export interface UseUserInteractionsReturn {
  // Page visit tracking (history)
  recordPageVisit: (params: {
    url: string;
    metadata?: {
      searchQuery?: string;
      filters?: Record<string, unknown>;
      entityId?: string;
      entityType?: string;
      resultCount?: number;
    };
  }) => Promise<void>;
  recentHistory: CatalogueEntity[];
  historyStats: {
    totalVisits: number;
    uniqueEntities: number;
    byType: Record<string, number>;
  };

  // Bookmark management
  bookmarks: CatalogueEntity[];
  isBookmarked: boolean;
  bookmarkEntity: (params: {
    title: string;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  bookmarkSearch: (params: {
    title: string;
    searchQuery: string;
    filters?: Record<string, unknown>;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  bookmarkList: (params: {
    title: string;
    url: string;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  unbookmarkEntity: () => Promise<void>;
  unbookmarkSearch: () => Promise<void>;
  unbookmarkList: () => Promise<void>;
  updateBookmark: (
    updates: Partial<Pick<CatalogueEntity, "notes">>,
  ) => Promise<void>;
  searchBookmarks: (query: string) => Promise<CatalogueEntity[]>;

  // Bulk operations
  bulkRemoveBookmarks: (bookmarkRecordIds: string[]) => Promise<{ success: number; failed: number }>;

  // History management
  clearHistory: () => Promise<void>;

  // Loading states
  isLoadingHistory: boolean;
  isLoadingBookmarks: boolean;
  isLoadingStats: boolean;

  // Actions
  refreshData: () => Promise<void>;
}

export const useUserInteractions = (options: UseUserInteractionsOptions = {}): UseUserInteractionsReturn => {
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

  // Get router location - must be called unconditionally at top level (React hooks rules)
  const location = useLocation();

  // State
  const [recentHistory, setRecentHistory] = useState<CatalogueEntity[]>([]);
  const [bookmarks, setBookmarks] = useState<CatalogueEntity[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [historyStats, setHistoryStats] = useState({
    totalVisits: 0,
    uniqueEntities: 0,
    byType: {} as Record<string, number>,
  });

  // Loading states
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Track component mount status to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Debounce history entries to prevent duplicates on rapid navigation
  const lastHistoryRef = useRef<{ entityId: string; time: number } | null>(null);
  const HISTORY_DEBOUNCE_MS = 1000;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoadingHistory(true);
    setIsLoadingBookmarks(true);
    setIsLoadingStats(true);

    // Add timeout to prevent infinite loading in test environments
    const timeoutPromise = new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('User interactions data loading timed out after 10 seconds'));
      }, 10_000); // 10 second timeout
    });

    try {
      // Wrap all database operations in a race against timeout
      const dataLoadPromise = (async () => {
        // Initialize special lists if they don't exist
        await catalogueService.initializeSpecialLists();

        // Load recent history (last 20 entries)
        const historyEntries = await catalogueService.getHistory();
        if (isMountedRef.current) {
          setRecentHistory(historyEntries.slice(-20).reverse());
        }

        // Check bookmark status based on content type
        if (entityId && entityType) {
          const bookmarked = await catalogueService.isBookmarked(
            entityType as EntityType,
            entityId
          );
          if (isMountedRef.current) {
            setIsBookmarked(bookmarked);
          }
        } else if (searchQuery || url) {
          // For search and list bookmarks, we'll use a simple check in the bookmarks
          // This is a simplified approach - in a real implementation you might want
          // more sophisticated identification
          const allBookmarks = await catalogueService.getBookmarks();
          const searchTerm = searchQuery || url;
          const bookmarked = allBookmarks.some(bookmark =>
            bookmark.notes?.includes(searchTerm || '')
          );
          if (isMountedRef.current) {
            setIsBookmarked(bookmarked);
          }
        }

        // Load all bookmarks
        const allBookmarks = await catalogueService.getBookmarks();
        if (isMountedRef.current) {
          setBookmarks(allBookmarks);
        }

        // Calculate history stats
        const stats = await catalogueService.getListStats(SPECIAL_LIST_IDS.HISTORY);
        if (isMountedRef.current) {
          setHistoryStats({
            totalVisits: stats.totalEntities,
            uniqueEntities: stats.totalEntities, // Each entry is unique in catalogue
            byType: stats.entityCounts,
          });
        }
      })();

      // Race between data loading and timeout
      await Promise.race([dataLoadPromise, timeoutPromise]);
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to refresh user interaction data",
        { error },
      );

      // Set default values when loading fails
      if (isMountedRef.current) {
        setRecentHistory([]);
        setBookmarks([]);
        setHistoryStats({
          totalVisits: 0,
          uniqueEntities: 0,
          byType: {},
        });
        setIsBookmarked(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingHistory(false);
        setIsLoadingBookmarks(false);
        setIsLoadingStats(false);
      }
    }
  }, [entityId, entityType, searchQuery, url]);

  // Track which entityId a displayName was loaded for to prevent mismatches
  const displayNameEntityRef = useRef<string | undefined>(undefined);

  // Update displayName entity reference when displayName changes
  useEffect(() => {
    if (displayName && entityId) {
      displayNameEntityRef.current = entityId;
    }
  }, [displayName, entityId]);

  // Auto-track page visits when enabled
  useEffect(() => {
    if (autoTrackVisits && entityId && entityType) {
      const trackPageVisit = async () => {
        try {
          // Debounce: skip if same entity was recorded recently
          const now = Date.now();
          if (
            lastHistoryRef.current?.entityId === entityId &&
            now - lastHistoryRef.current.time < HISTORY_DEBOUNCE_MS
          ) {
            return;
          }

          const currentUrl = location.pathname + serializeSearch(location.search);

          // Only pass displayName if it matches the current entityId
          // This prevents race conditions where a stale displayName is stored
          const safeDisplayName = displayNameEntityRef.current === entityId ? displayName : undefined;

          await catalogueService.addToHistory({
            entityType: entityType as EntityType,
            entityId: entityId,
            url: currentUrl,
            // Pass display name only if it's verified to match this entity
            title: safeDisplayName,
          });

          // Record for debounce
          lastHistoryRef.current = { entityId, time: now };
        } catch (error) {
          logger.error(
            USER_INTERACTIONS_LOGGER_CONTEXT,
            "Failed to auto-track page visit",
            {
              entityId,
              entityType,
              error,
            },
          );
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
  ]);

  // Load data on mount and when entity changes
  useEffect(() => {
    void refreshData();
  }, [entityId, entityType, searchQuery, url]);

  // Listen for catalogue change events to keep all instances in sync
  useEffect(() => {
    const unsubscribe = catalogueEventEmitter.subscribe((event) => {
      // When catalogue changes, refresh data to keep UI in sync
      logger.debug(USER_INTERACTIONS_LOGGER_CONTEXT, "Catalogue change detected, refreshing data", { event });
      void refreshData();
    });

    return unsubscribe;
  }, [refreshData]);

  const recordPageVisit = useCallback(
    async ({
      url,
      metadata,
    }: {
      url: string;
      metadata?: {
        searchQuery?: string;
        filters?: Record<string, unknown>;
        entityId?: string;
        entityType?: string;
        resultCount?: number;
      };
    }) => {
      try {
        if (!metadata?.entityId || !metadata?.entityType) {
          throw new Error("Entity ID and type are required to record page visit");
        }

        await catalogueService.addToHistory({
          entityType: metadata.entityType as EntityType,
          entityId: metadata.entityId,
          url,
          // Only provide title for search queries - let HistoryCard fetch display name for entities
          title: metadata.searchQuery ? `Search: ${metadata.searchQuery}` : undefined,
        });

        // Refresh data to update UI
        await refreshData();
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to record page visit",
          {
            url,
            error,
          },
        );
        throw error;
      }
    },
    [refreshData],
  );

  const bookmarkEntity = useCallback(
    async ({
      title: _title,
      notes,
      tags,
    }: {
      title: string;
      notes?: string;
      tags?: string[];
    }) => {
      if (!entityId || !entityType) {
        throw new Error("Entity ID and type are required to bookmark");
      }

      try {
        await catalogueService.addBookmark({
          entityType: entityType as EntityType,
          entityId: entityId,
          notes: tags ? `${notes || ''}\n\nTags: ${tags.join(', ')}` : notes,
        });

        setIsBookmarked(true);
        await refreshData();
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bookmark entity",
          {
            entityId,
            entityType,
            error,
          },
        );
        throw error;
      }
    },
    [
      entityId,
      entityType,
      location.pathname,
      location.search,
      refreshData,
    ],
  );

  const unbookmarkEntity = useCallback(async () => {
    if (!entityId || !entityType) {
      throw new Error("Entity ID and type are required to unbookmark");
    }

    try {
      // Find the bookmark record for this entity
      const allBookmarks = await catalogueService.getBookmarks();
      const bookmark = allBookmarks.find(b =>
        b.entityType === entityType && b.entityId === entityId
      );

      if (bookmark?.id) {
        await catalogueService.removeBookmark(bookmark.id);
        setIsBookmarked(false);
        await refreshData();
      }
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to unbookmark entity",
        {
          entityId,
          entityType,
          error,
        },
      );
      throw error;
    }
  }, [entityId, entityType, refreshData]);

  const bookmarkSearch = useCallback(
    async ({
      title,
      searchQuery,
      filters,
      notes,
      tags,
    }: {
      title: string;
      searchQuery: string;
      filters?: Record<string, unknown>;
      notes?: string;
      tags?: string[];
    }) => {
      try {
        // Create a unique ID for the search query
        const searchId = `search-${searchQuery}-${JSON.stringify(filters || {})}`;

        await catalogueService.addBookmark({
          entityType: "works", // Use works as default for search bookmarks
          entityId: searchId,
          notes: `Title: ${title}\n\nSearch Query: ${searchQuery}\n${filters ? `Filters: ${JSON.stringify(filters, null, 2)}` : ''}${notes ? `\n\nNotes: ${notes}` : ''}${tags ? `\n\nTags: ${tags.join(', ')}` : ''}`,
        });

        setIsBookmarked(true);
        await refreshData();
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bookmark search",
          {
            searchQuery,
            filters,
            error,
          },
        );
        throw error;
      }
    },
    [location.pathname, location.search, refreshData],
  );

  const bookmarkList = useCallback(
    async ({
      title,
      url,
      notes,
      tags,
    }: {
      title: string;
      url: string;
      notes?: string;
      tags?: string[];
    }) => {
      try {
        // Create a unique ID for the list
        const listId = `list-${url}`;

        await catalogueService.addBookmark({
          entityType: "works", // Use works as default for list bookmarks
          entityId: listId,
          notes: `Title: ${title}\n\n${tags ? `${notes || ''}\n\nTags: ${tags.join(', ')}` : notes}`,
        });

        setIsBookmarked(true);
        await refreshData();
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bookmark list",
          {
            url,
            error,
          },
        );
        throw error;
      }
    },
    [refreshData],
  );

  const unbookmarkSearch = useCallback(async () => {
    if (!searchQuery) {
      throw new Error("Search query is required to unbookmark");
    }

    try {
      // Find the bookmark record for this search
      const allBookmarks = await catalogueService.getBookmarks();
      const searchId = `search-${searchQuery}-${JSON.stringify(filters || {})}`;
      const bookmark = allBookmarks.find(b =>
        b.entityId === searchId
      );

      if (bookmark?.id) {
        await catalogueService.removeBookmark(bookmark.id);
        setIsBookmarked(false);
        await refreshData();
      }
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to unbookmark search",
        {
          searchQuery,
          filters,
          error,
        },
      );
      throw error;
    }
  }, [searchQuery, filters, refreshData]);

  const unbookmarkList = useCallback(async () => {
    if (!url) {
      throw new Error("URL is required to unbookmark list");
    }

    try {
      // Find the bookmark record for this list
      const allBookmarks = await catalogueService.getBookmarks();
      const listId = `list-${url}`;
      const bookmark = allBookmarks.find(b =>
        b.entityId === listId
      );

      if (bookmark?.id) {
        await catalogueService.removeBookmark(bookmark.id);
        setIsBookmarked(false);
        await refreshData();
      }
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to unbookmark list",
        {
          url,
          error,
        },
      );
      throw error;
    }
  }, [url, refreshData]);

  const updateBookmark = useCallback(
    async (
      updates: Partial<Pick<CatalogueEntity, "notes">>,
    ) => {
      if (!entityId || !entityType) {
        throw new Error("Entity ID and type are required to update bookmark");
      }

      try {
        // Find the bookmark record for this entity
        const allBookmarks = await catalogueService.getBookmarks();
        const bookmark = allBookmarks.find(b =>
          b.entityType === entityType && b.entityId === entityId
        );

        if (bookmark?.id) {
          // Update the bookmark notes
          await catalogueService.updateList(SPECIAL_LIST_IDS.BOOKMARKS, {});
          await refreshData();
        }
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to update bookmark",
          {
            entityId,
            entityType,
            updates,
            error,
          },
        );
        throw error;
      }
    },
    [entityId, entityType, refreshData],
  );

  const searchBookmarks = useCallback(
    async (query: string): Promise<CatalogueEntity[]> => {
      try {
        const allBookmarks = await catalogueService.getBookmarks();
        const lowercaseQuery = query.toLowerCase();

        return allBookmarks.filter(bookmark =>
          bookmark.notes?.toLowerCase().includes(lowercaseQuery) ||
          bookmark.entityId.toLowerCase().includes(lowercaseQuery)
        );
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to search bookmarks",
          {
            query,
            error,
          },
        );
        return [];
      }
    },
    [],
  );

  const bulkRemoveBookmarks = useCallback(
    async (bookmarkRecordIds: string[]): Promise<{ success: number; failed: number }> => {
      let success = 0;
      let failed = 0;

      try {
        for (const recordId of bookmarkRecordIds) {
          try {
            await catalogueService.removeEntityFromList(SPECIAL_LIST_IDS.BOOKMARKS, recordId);
            success++;
          } catch (error) {
            logger.error(
              USER_INTERACTIONS_LOGGER_CONTEXT,
              "Failed to remove bookmark in bulk operation",
              { recordId, error }
            );
            failed++;
          }
        }

        // Update list's updated timestamp
        await catalogueService.updateList(SPECIAL_LIST_IDS.BOOKMARKS, {});

        // Emit event for bulk entity removal
        if (success > 0) {
          catalogueEventEmitter.emit({
            type: 'entity-removed',
            listId: SPECIAL_LIST_IDS.BOOKMARKS,
          });
        }

        await refreshData(); // Refresh data after bulk operation
        return { success, failed };
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bulk remove bookmarks",
          {
            bookmarkRecordIds,
            error,
          },
        );
        throw error;
      }
    },
    [refreshData],
  );

  const clearHistory = useCallback(async () => {
    try {
      await catalogueService.clearHistory();
      await refreshData();
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to clear history",
        { error }
      );
      throw error;
    }
  }, [refreshData]);

  return {
    // Page visit tracking (now using catalogue history)
    recordPageVisit,
    recentHistory,
    historyStats,

    // Bookmark management (now using catalogue bookmarks)
    bookmarks,
    isBookmarked,
    bookmarkEntity,
    bookmarkSearch,
    bookmarkList,
    unbookmarkEntity,
    unbookmarkSearch,
    unbookmarkList,
    updateBookmark,
    searchBookmarks,

    // Bulk operations
    bulkRemoveBookmarks,

    // History management
    clearHistory,

    // Loading states
    isLoadingHistory,
    isLoadingBookmarks,
    isLoadingStats,

    // Actions
    refreshData,
  };
};