/**
 * Shared types for user interaction hooks
 */

import type { CatalogueEntity } from "@bibgraph/utils/storage/catalogue-db";

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

export interface HistoryStats {
  totalVisits: number;
  uniqueEntities: number;
  byType: Record<string, number>;
}

export interface RecordPageVisitParams {
  url: string;
  metadata?: {
    searchQuery?: string;
    filters?: Record<string, unknown>;
    entityId?: string;
    entityType?: string;
    resultCount?: number;
  };
}

export interface BookmarkEntityParams {
  title: string;
  notes?: string;
  tags?: string[];
}

export interface BookmarkSearchParams {
  title: string;
  searchQuery: string;
  filters?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
}

export interface BookmarkListParams {
  title: string;
  url: string;
  notes?: string;
  tags?: string[];
}

export interface BulkRemoveResult {
  success: number;
  failed: number;
}

export interface UseUserInteractionsReturn {
  // Page visit tracking (history)
  recordPageVisit: (params: RecordPageVisitParams) => Promise<void>;
  recentHistory: CatalogueEntity[];
  historyStats: HistoryStats;

  // Bookmark management
  bookmarks: CatalogueEntity[];
  isBookmarked: boolean;
  bookmarkEntity: (params: BookmarkEntityParams) => Promise<void>;
  bookmarkSearch: (params: BookmarkSearchParams) => Promise<void>;
  bookmarkList: (params: BookmarkListParams) => Promise<void>;
  unbookmarkEntity: () => Promise<void>;
  unbookmarkSearch: () => Promise<void>;
  unbookmarkList: () => Promise<void>;
  updateBookmark: (
    updates: Partial<Pick<CatalogueEntity, "notes">>,
  ) => Promise<void>;
  searchBookmarks: (query: string) => Promise<CatalogueEntity[]>;

  // Bulk operations
  bulkRemoveBookmarks: (bookmarkRecordIds: string[]) => Promise<BulkRemoveResult>;

  // History management
  clearHistory: () => Promise<void>;

  // Loading states
  isLoadingHistory: boolean;
  isLoadingBookmarks: boolean;
  isLoadingStats: boolean;

  // Actions
  refreshData: () => Promise<void>;
}

/** Logger context for user interactions */
export const USER_INTERACTIONS_LOGGER_CONTEXT = "user-interactions";

/** Debounce time for history entries to prevent duplicates */
export const HISTORY_DEBOUNCE_MS = 1000;

/** Timeout for data loading operations (30s to accommodate IndexedDB initialization in test/CI environments) */
export const DATA_LOADING_TIMEOUT_MS = 30_000;
