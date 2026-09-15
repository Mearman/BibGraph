/**
 * Navigation tracker component that logs route changes and page visits
 */

import { EntityDetectionService, logger } from "@bibgraph/utils";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo,useRef } from "react";

import { useAppActivityStore } from "@/stores/app-activity";
import { decodeEntityId, serializeSearch } from "@/utils/url-decoding";

// PostHog type for window object
interface PostHogInstance {
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    posthog?: PostHogInstance;
  }
}

// Debounce for logging a navigation/page-view after route params settle, to avoid excessive calls during rapid navigation.
const NAVIGATION_DEBOUNCE_MS = 100;
// Maximum number of extractPageInfo results to memoize before evicting the oldest entry.
const PAGE_INFO_CACHE_MAX_SIZE = 100;

const KNOWN_ENTITY_PAGE_TYPES = new Set([
  "works",
  "authors",
  "institutions",
  "concepts",
  "funders",
  "publishers",
  "sources",
  "topics",
  "keywords",
]);

const getStringSearchParam = (search: Readonly<Record<string, unknown>>, key: string): string | undefined => {
  const value = search[key];
  return typeof value === "string" ? value : undefined;
};

const buildSearchParamsString = (search: Readonly<Record<string, unknown>>): string => {
  const stringEntries: [string, string][] = Object.entries(search).map(([key, value]) => [key, String(value)]);
  return new URLSearchParams(stringEntries).toString();
};

const buildSearchFilterSummary = (search: Readonly<Record<string, unknown>>): string =>
  Object.keys(search)
    .filter((key) => key !== "q" && key !== "search")
    .map((key) => `${key}:${String(search[key])}`)
    .join(", ");

// Helper function to extract page information from pathname and search
const extractPageInfo = (
  pathname: string,
  search: Record<string, unknown>,
): {
  isEntityPage: boolean;
  description: string;
  metadata: Record<string, unknown>;
} | null => {
  // Remove leading slash and split by /
  const parts = pathname.replace(/^\//, "").split("/");

  if (parts.length > 0) {
    const pageType = parts[0];

    // Handle entity pages and searches
    if (KNOWN_ENTITY_PAGE_TYPES.has(pageType)) {
      if (parts.length >= 2 && parts[1]) {
        // Entity detail page Decode and fix the entity ID (handles URL encoding and collapsed protocol slashes)
        const entityId = decodeEntityId(parts[1]);
        if (entityId === undefined) return null;

        const detection = EntityDetectionService.detectEntity(entityId);
        if (detection?.entityType) {
          return {
            isEntityPage: true,
            description: `Visited ${detection.entityType} page: ${detection.normalizedId}`,
            metadata: {
              entityType: detection.entityType,
              entityId: detection.normalizedId,
            },
          };
        }
      } else {
        // Search page for this entity type
        const query = getStringSearchParam(search, "q") ?? getStringSearchParam(search, "search") ?? "";
        const filters = buildSearchFilterSummary(search);

        let description = `Searched ${pageType}`;
        if (query) description += ` for "${query}"`;
        if (filters) description += ` with filters: ${filters}`;

        return {
          isEntityPage: false,
          description,
          metadata: {
            entityType: pageType,
            searchQuery: query,
            filters: filters || undefined,
            searchParams:
              Object.keys(search).length > 0
                ? buildSearchParamsString(search)
                : undefined,
          },
        };
      }
    }

    // Handle other search pages (autocomplete, text search, etc.)
    if (pageType === "autocomplete" || pageType === "text") {
      const query = getStringSearchParam(search, "q") ?? getStringSearchParam(search, "search") ?? "";
      const filters = buildSearchFilterSummary(search);

      let description = `Searched ${pageType}`;
      if (query) description += ` for "${query}"`;
      if (filters) description += ` with filters: ${filters}`;

      return {
        isEntityPage: false,
        description,
        metadata: {
          pageType,
          searchQuery: query,
          filters: filters || undefined,
          searchParams: search,
        },
      };
    }
  }

  return null;
};

/**
 * Get user agent group for analytics (privacy-friendly grouping)
 */
const getUserAgentGroup = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari')) return 'safari';
  if (userAgent.includes('edge')) return 'edge';
  return 'other';
};

export const NavigationTracker = () => {
  const location = useLocation();
  const { logNavigation, addEvent } = useAppActivityStore();
  const previousLocationRef = useRef<string | null>(null);

  // Log that the tracker is mounted
  useEffect(() => {
    addEvent({
      type: "component",
      category: "lifecycle",
      event: "mount",
      description: "NavigationTracker component mounted",
      severity: "debug",
    });
  }, [addEvent]);

  // Memoize pageInfo extraction to prevent excessive re-computation
  const extractPageInfoMemoized = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof extractPageInfo>>();

    return (pathname: string, search: Record<string, unknown>) => {
      const key = `${pathname}|${JSON.stringify(search)}`;
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const result = extractPageInfo(pathname, search);
      cache.set(key, result);

      // Limit cache size
      if (cache.size > PAGE_INFO_CACHE_MAX_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }

      return result;
    };
  }, []);

  useEffect(() => {
    const currentLocation = location.pathname + serializeSearch(location.search) + location.hash;

    // Debounce heavy operations to prevent excessive calls
    const timeoutId = setTimeout(() => {
      // Extract page information with memoization
      const pageInfo = extractPageInfoMemoized(
        location.pathname,
        location.search,
      );

      if (pageInfo) {
        // Log the page visit
        addEvent({
          type: "navigation",
          category: "ui",
          event: pageInfo.isEntityPage
            ? "entity_page_visit"
            : "search_page_visit",
          description: pageInfo.description,
          severity: "info",
          metadata: {
            ...pageInfo.metadata,
            route: currentLocation,
          },
        });

        // Send page view to PostHog
        try {
          if (typeof window !== 'undefined' && 'posthog' in window) {
            const posthog = window.posthog;
            if (posthog) {
              const eventProperties = {
                page_type: pageInfo.isEntityPage ? 'entity_detail' : 'search',
                entity_type: typeof pageInfo.metadata.entityType === "string" ? pageInfo.metadata.entityType : null,
                has_search_query: pageInfo.metadata.searchQuery !== undefined && pageInfo.metadata.searchQuery !== "",
                has_filters: pageInfo.metadata.filters !== undefined && pageInfo.metadata.filters !== "",
                user_agent_group: getUserAgentGroup(),
                timestamp: new Date().toISOString(),
                path: location.pathname,
              };

              posthog.capture('page_view', eventProperties);
            }
          }
        } catch (analyticsError) {
          logger.warn('analytics', 'Failed to send page view to PostHog', { error: analyticsError }, 'NavigationTracker');
        }
      }

      // Log navigation if there's a previous location
      if (
        previousLocationRef.current !== null &&
        previousLocationRef.current !== currentLocation
      ) {
        logNavigation(previousLocationRef.current, currentLocation, {
          searchParams: location.search,
          ...pageInfo?.metadata,
        });
      }
    }, NAVIGATION_DEBOUNCE_MS);

    // Update previous location immediately
    previousLocationRef.current = currentLocation;

    return () => { clearTimeout(timeoutId); };
  }, [location.pathname, location.search, location.hash, addEvent, logNavigation, extractPageInfoMemoized]);

  return null; // This component doesn't render anything
};

