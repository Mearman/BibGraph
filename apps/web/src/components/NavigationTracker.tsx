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
      if (cache.size > 100) {
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
        location.search as Record<string, unknown>,
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
                entity_type: pageInfo.metadata.entityType || null,
                has_search_query: !!(pageInfo.metadata.searchQuery),
                has_filters: !!(pageInfo.metadata.filters),
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
        previousLocationRef.current &&
        previousLocationRef.current !== currentLocation
      ) {
        logNavigation(previousLocationRef.current, currentLocation, {
          searchParams: location.search || undefined,
          ...pageInfo?.metadata,
        });
      }
    }, 100); // 100ms debounce

    // Update previous location immediately
    previousLocationRef.current = currentLocation;

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search, location.hash, addEvent, logNavigation, extractPageInfoMemoized]);

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

      // Validate that this is a known entity type
      const validEntityTypes = [
        "works",
        "authors",
        "institutions",
        "concepts",
        "funders",
        "publishers",
        "sources",
        "topics",
        "keywords",
      ];

      // Handle entity pages and searches
      if (validEntityTypes.includes(pageType)) {
        if (parts.length >= 2 && parts[1]) {
          // Entity detail page
          // Decode and fix the entity ID (handles URL encoding and collapsed protocol slashes)
          const entityId = decodeEntityId(parts[1]);
          if (!entityId) return null;

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
          const query = (search.q as string) || (search.search as string) || "";
          const filters = Object.keys(search)
            .filter((key) => key !== "q" && key !== "search")
            .map((key) => `${key}:${search[key]}`)
            .join(", ");

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
                  ? new URLSearchParams(
                      search as Record<string, string>,
                    ).toString()
                  : undefined,
            },
          };
        }
      }

      // Handle other search pages (autocomplete, text search, etc.)
      if (pageType === "autocomplete" || pageType === "text") {
        const query = (search.q as string) || (search.search as string) || "";
        const filters = Object.keys(search)
          .filter((key) => key !== "q" && key !== "search")
          .map((key) => `${key}:${search[key]}`)
          .join(", ");

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

  return null; // This component doesn't render anything
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

