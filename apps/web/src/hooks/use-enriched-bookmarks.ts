/**
 * Hook to enrich bookmarks with display names from OpenAlex
 * Fetches display names for bookmarks that only have entity IDs as titles
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { Bookmark, EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { useQueries } from "@tanstack/react-query";
import { z } from "zod";

import { MS_PER_DAY, MS_PER_HOUR } from "./time-constants";

/**
 * A display-name fetch selects only id and display_name, so it validates against exactly those fields
 */
const displayNameStubSchema = z.object({ id: z.string(), display_name: z.string() });


/**
Regex to detect entity IDs used as titles (e.g., A5017898742, W123456789)
 */
const ENTITY_ID_PATTERN = /^[A-Z]\d+$/;

interface UseEnrichedBookmarksResult {
  bookmarks: Bookmark[];
  isLoading: boolean;
  isAllFetched: boolean;
}

/**
 * Determines if a title is just an entity ID that needs enrichment
 * @param title - The current title value
 * @param entityId - The entity ID to compare against
 */
const needsDisplayNameFetch = (title: string, entityId: string): boolean => {
  // Title is exactly the entityId
  if (title === entityId) return true;
  // Title matches entity ID pattern (A123, W456, etc.)
  if (ENTITY_ID_PATTERN.test(title)) return true;
  return false;
};

/**
 * Fetches display name for an entity
 * @param entityType - OpenAlex entity type
 * @param entityId - Entity identifier
 */
const fetchDisplayName = async (
  entityType: EntityType,
  entityId: string
): Promise<string | null> => {
  try {
    const result = await cachedOpenAlex.getById({
      endpoint: entityType,
      id: entityId,
      params: {
        select: ["id", "display_name"],
      },
      schema: displayNameStubSchema,
    });
    return result.display_name;
  } catch (error) {
    logger.error(
      "bookmarks",
      "Failed to fetch entity display name",
      { entityType, entityId, error },
      "useEnrichedBookmarks"
    );
    return null;
  }
};

/**
 * Hook that enriches bookmarks with proper display names
 * Only fetches for bookmarks where title is an entity ID
 * @param bookmarks - Array of bookmarks to enrich
 */
export const useEnrichedBookmarks = (
  bookmarks: readonly Bookmark[]
): UseEnrichedBookmarksResult => {
  // Identify bookmarks that need display name fetching
  const bookmarksNeedingFetch = bookmarks.filter((bookmark) => {
    // Skip special IDs (search-, list-, etc.)
    if (bookmark.entityId.startsWith("search-") || bookmark.entityId.startsWith("list-")) {
      return false;
    }
    return needsDisplayNameFetch(bookmark.metadata.title, bookmark.entityId);
  });

  // Create queries for bookmarks needing display names
  const queries = useQueries({
    queries: bookmarksNeedingFetch.map((bookmark) => ({
      queryKey: ["entity-display-name", bookmark.entityType, bookmark.entityId] as const,
      queryFn: async () => fetchDisplayName(bookmark.entityType, bookmark.entityId),
      staleTime: MS_PER_HOUR,
      gcTime: MS_PER_DAY,
      retry: 1,
    })),
  });

  // Build a map of entityId -> displayName from query results
  const displayNameMap = new Map<string, string>();
  for (const [index, bookmark] of bookmarksNeedingFetch.entries()) {
    const queryResult = queries[index];
    if (queryResult.data !== null && queryResult.data !== undefined && queryResult.data !== "") {
      displayNameMap.set(bookmark.entityId, queryResult.data);
    }
  }

  // Create enriched bookmarks with proper display names
  const enrichedBookmarks = bookmarks.map((bookmark): Bookmark => {
    const fetchedDisplayName = displayNameMap.get(bookmark.entityId);
    if (fetchedDisplayName !== undefined && fetchedDisplayName !== "") {
      return {
        ...bookmark,
        metadata: {
          ...bookmark.metadata,
          title: fetchedDisplayName,
        },
      };
    }
    return bookmark;
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isAllFetched = queries.every((q) => q.isFetched);

  return {
    bookmarks: enrichedBookmarks,
    isLoading,
    isAllFetched,
  };
};
