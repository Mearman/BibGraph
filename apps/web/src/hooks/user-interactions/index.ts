/**
 * User interactions hooks barrel file
 * Exports all user interaction related hooks and types
 */

export { useUserInteractions } from "./use-user-interactions";
export { useBookmarkOperations } from "./use-bookmark-operations";
export { useHistoryOperations } from "./use-history-operations";

export type {
  UseUserInteractionsOptions,
  UseUserInteractionsReturn,
  HistoryStats,
  RecordPageVisitParams,
  BookmarkEntityParams,
  BookmarkSearchParams,
  BookmarkListParams,
  BulkRemoveResult,
} from "./types";

export type { UseBookmarkOperationsParams, UseBookmarkOperationsReturn } from "./use-bookmark-operations";
export type { UseHistoryOperationsParams, UseHistoryOperationsReturn } from "./use-history-operations";
