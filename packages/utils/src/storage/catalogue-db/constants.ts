/**
 * Catalogue database constants Special list identifiers, database naming, and known corruption markers
 */

export const SPECIAL_LIST_IDS = {
  BOOKMARKS: "bookmarks-list",
  HISTORY: "history-list",
  GRAPH: "graph-list",
  SEARCH_HISTORY: "search-history",
} as const;

export const SPECIAL_LIST_TYPES = {
  BOOKMARKS: "bookmarks" as const,
  HISTORY: "history" as const,
} as const;

export const LOG_CATEGORY = "catalogue";
export const DB_NAME = "bibgraph-catalogue";

// Pattern for corrupted history entries (from location.search object concatenation bug)
export const CORRUPTED_ENTITY_ID_PATTERN = "[object Object]";
