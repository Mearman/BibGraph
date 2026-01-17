/**
 * React hook for query bookmarking functionality
 * Extends the existing user interactions system with pagination-aware query bookmarking
 */

import { logger } from "@bibgraph/utils/logger";
import { useLocation, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import {
  areQueriesEquivalent,
  createQueryBookmarkRequest,
  extractQueryParameters,
  generateQueryId,
  generateQueryTitle,
  getPaginationInfo,
} from "@/lib/query-bookmarking";
import type { OpenAlexSearchParams } from "@/lib/route-schemas";
import { serializeSearch } from "@/utils/url-decoding";

import { useUserInteractions } from "./user-interactions";



const QUERY_BOOKMARKING_LOGGER_CONTEXT = "query-bookmarking";

export interface UseQueryBookmarkingOptions {
  entityType: string;
  entityId?: string;
  disabled?: boolean;
}

export interface UseQueryBookmarkingReturn {
  // Current query state
  currentQueryParams: Partial<OpenAlexSearchParams>;
  paginationInfo: {
    page: number;
    perPage: number;
    cursor?: string;
    hasPagination: boolean;
  };
  queryId: string;

  // Bookmark status
  isQueryBookmarked: boolean;

  // Bookmark actions
  bookmarkCurrentQuery: (params: {
    title?: string;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  unbookmarkCurrentQuery: () => Promise<void>;

  // Query utilities
  getQueryUrl: (paginationParams?: Partial<OpenAlexSearchParams>) => string;
  isCurrentQueryEquivalent: (otherParams: OpenAlexSearchParams) => boolean;
  generateDefaultTitle: () => string;
}

export const useQueryBookmarking = ({
  entityType,
  entityId,
  disabled = false
}: UseQueryBookmarkingOptions): UseQueryBookmarkingReturn => {

  // Get current route search parameters
  const searchParams = useSearch({ strict: false }) as OpenAlexSearchParams;
  const location = useLocation();

  // Extract semantic query parameters (excluding pagination)
  const currentQueryParams = useMemo(() => {
    return extractQueryParameters(searchParams);
  }, [searchParams]);

  // Get pagination information
  const paginationInfo = useMemo(() => {
    return getPaginationInfo(searchParams);
  }, [searchParams]);

  // Generate unique query identifier
  const queryId = useMemo(() => {
    return generateQueryId(entityType, searchParams);
  }, [entityType, searchParams]);

  // Get user interactions hook for bookmark operations
  const userInteractions = useUserInteractions({
    entityId,
    entityType,
    url: location.pathname + serializeSearch(location.search),
    autoTrackVisits: !disabled
  });

  // Check if current query is bookmarked
  // We use the existing isBookmarked status which checks based on current URL
  // For query bookmarking, we need to check if there's a bookmark with equivalent query parameters
  const isQueryBookmarked = useMemo(() => {
    if (disabled) return false;

    // Look for existing bookmarks with equivalent query parameters
    return userInteractions.bookmarks.some(bookmark => {
      try {
        // For CatalogueEntity, check if the notes contain the URL we're looking for
        const urlMatch = bookmark.notes?.match(/URL: ([^\n]+)/);
        if (urlMatch) {
          const bookmarkUrl = urlMatch[1];
          // Simple check - this will need to be improved for proper query parameter matching
          return bookmarkUrl.includes(searchParams.toString());
        }
        return false;
      } catch (error) {
        logger.warn(
          QUERY_BOOKMARKING_LOGGER_CONTEXT,
          "Failed to parse bookmark parameters for comparison",
          { bookmarkId: bookmark.id, error }
        );
        return false;
      }
    });
  }, [disabled, userInteractions.bookmarks, searchParams]);

  // Bookmark current query
  const bookmarkCurrentQuery = useCallback(async ({
    title,
    notes,
    tags
  }: {
    title?: string;
    notes?: string;
    tags?: string[];
  }) => {
    if (disabled) {
      throw new Error("Query bookmarking is disabled");
    }

    try {
      // Use the existing bookmarkList function with query-specific parameters
      const queryUrl = createQueryBookmarkRequest(entityType, entityId, searchParams);

      // Generate title if not provided
      const bookmarkTitle = title || generateQueryTitle(entityType, searchParams);

      // Generate default notes if not provided
      const bookmarkNotes = notes || `Query bookmark for ${entityType}`;

      // Use bookmarkList function since we're bookmarking a URL-based query
      await userInteractions.bookmarkList({
        title: bookmarkTitle,
        url: queryUrl.cacheKey,
        notes: bookmarkNotes,
        tags: tags || [`${entityType}-query`, "query"]
      });

      logger.info(
        QUERY_BOOKMARKING_LOGGER_CONTEXT,
        "Query bookmarked successfully",
        {
          entityType,
          entityId,
          queryId,
          title: bookmarkTitle
        }
      );

    } catch (error) {
      logger.error(
        QUERY_BOOKMARKING_LOGGER_CONTEXT,
        "Failed to bookmark query",
        {
          entityType,
          entityId,
          queryId,
          error
        }
      );
      throw error;
    }
  }, [disabled, entityType, entityId, searchParams, userInteractions, queryId]);

  // Unbookmark current query
  const unbookmarkCurrentQuery = useCallback(async () => {
    if (disabled) {
      throw new Error("Query bookmarking is disabled");
    }

    try {
      // Find the bookmark that matches our query
      const matchingBookmark = userInteractions.bookmarks.find(bookmark => {
        try {
          // For CatalogueEntity, check if the notes contain the URL we're looking for
          const urlMatch = bookmark.notes?.match(/URL: ([^\n]+)/);
          if (urlMatch) {
            const bookmarkUrl = urlMatch[1];
            return bookmarkUrl.includes(searchParams.toString());
          }
          return false;
        } catch {
          return false;
        }
      });

      if (matchingBookmark?.id) {
        await userInteractions.unbookmarkList();

        logger.info(
          QUERY_BOOKMARKING_LOGGER_CONTEXT,
          "Query unbookmarked successfully",
          {
            entityType,
            entityId,
            queryId,
            bookmarkId: matchingBookmark.id
          }
        );
      } else {
        logger.warn(
          QUERY_BOOKMARKING_LOGGER_CONTEXT,
          "No matching query bookmark found to unbookmark",
          {
            entityType,
            entityId,
            queryId
          }
        );
      }
    } catch (error) {
      logger.error(
        QUERY_BOOKMARKING_LOGGER_CONTEXT,
        "Failed to unbookmark query",
        {
          entityType,
          entityId,
          queryId,
          error
        }
      );
      throw error;
    }
  }, [disabled, entityType, entityId, searchParams, userInteractions, queryId]);

  // Get query URL with optional pagination parameters
  const getQueryUrl = useCallback((paginationParams?: Partial<OpenAlexSearchParams>): string => {
    const request = createQueryBookmarkRequest(entityType, entityId, {
      ...currentQueryParams,
      ...paginationParams
    });

    return request.cacheKey;
  }, [entityType, entityId, currentQueryParams]);

  // Check if current query is equivalent to another set of parameters
  const isCurrentQueryEquivalent = useCallback((otherParams: OpenAlexSearchParams): boolean => {
    return areQueriesEquivalent(searchParams, otherParams);
  }, [searchParams]);

  // Generate default title for the current query
  const generateDefaultTitle = useCallback((): string => {
    return generateQueryTitle(entityType, searchParams);
  }, [entityType, searchParams]);

  return {
    // Current query state
    currentQueryParams,
    paginationInfo,
    queryId,

    // Bookmark status
    isQueryBookmarked,

    // Bookmark actions
    bookmarkCurrentQuery,
    unbookmarkCurrentQuery,

    // Query utilities
    getQueryUrl,
    isCurrentQueryEquivalent,
    generateDefaultTitle
  };
};