import type { EntityType } from "@bibgraph/types"
import { isEntityType } from "@bibgraph/types"
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

import { LazyRoute } from "@/components/routing/LazyRoute";


const BookmarksIndexPage = lazy(async () => import("./bookmarks.lazy"));

export type BookmarkViewMode = "list" | "table" | "card";

export interface BookmarksSearch {
  search?: string;
  entityType?: EntityType;
  tags?: string[];
  matchAll?: boolean;
  sortBy?: "date" | "title" | "type";
  sortOrder?: "asc" | "desc";
  groupByType?: boolean;
  viewMode?: BookmarkViewMode;
}

export const Route = createFileRoute("/bookmarks")({
  component: () => (
    <LazyRoute>
      <BookmarksIndexPage />
    </LazyRoute>
  ),
  validateSearch: (search: Record<string, unknown>): BookmarksSearch => {
    return {
      search: typeof search.search === "string" ? search.search : undefined,
      entityType: isEntityType(search.entityType) ? search.entityType : undefined,
      tags: Array.isArray(search.tags)
        ? search.tags.filter((t): t is string => typeof t === "string")
        : (typeof search.tags === "string"
          ? search.tags.split(",").map(t => t.trim()).filter(Boolean)
          : undefined),
      matchAll: search.matchAll === "true" || search.matchAll === true,
      sortBy: search.sortBy === "date" || search.sortBy === "title" || search.sortBy === "type"
        ? search.sortBy
        : undefined,
      sortOrder: search.sortOrder === "asc" || search.sortOrder === "desc"
        ? search.sortOrder
        : undefined,
      groupByType: search.groupByType === "true" || search.groupByType === true,
      viewMode: search.viewMode === "list" || search.viewMode === "table" || search.viewMode === "card"
        ? search.viewMode
        : undefined,
    };
  },
});
