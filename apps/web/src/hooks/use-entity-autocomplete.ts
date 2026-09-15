/**
 * Shared hook for entity-specific autocomplete functionality
 *
 * Encapsulates common logic used across all entity autocomplete pages:
 * - URL query parameter synchronization
 * - Query state management
 * - API call with React Query
 * - URL prettification (decoding encoded characters)
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { AutocompleteResult, EntityType } from "@bibgraph/types";
import { ENTITY_METADATA } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export interface AutocompleteSearchParams {
  q?: string;
  search?: string;
  filter?: string;
}

export interface UseEntityAutocompleteOptions {
  /**
  The entity type for this autocomplete
   */
  entityType: EntityType;
  /**
  URL search params from the router
   */
  urlSearch: AutocompleteSearchParams;
  /**
  Route path for URL updates (e.g., "/autocomplete/works")
   */
  routePath: string;
}

export interface UseEntityAutocompleteResult {
  /**
  Current search query
   */
  query: string;
  /**
  Update search query and URL
   */
  handleSearch: (value: string) => void;
  /**
  Autocomplete results
   */
  results: AutocompleteResult[];
  /**
  Loading state
   */
  isLoading: boolean;
  /**
  Error state
   */
  error: Error | null;
  /**
  Filter from URL
   */
  filter: string | undefined;
}

/**
 * Map entity types to their autocomplete API methods
 */
type AutocompleteMethod = (query: string) => Promise<AutocompleteResult[]>;

const getAutocompleteMethod = (entityType: EntityType): AutocompleteMethod | null => {
  const methodMap: Partial<Record<EntityType, AutocompleteMethod>> = {
    works: async (q) => cachedOpenAlex.client.works.autocomplete(q),
    authors: async (q) => cachedOpenAlex.client.authors.autocomplete(q),
    sources: async (q) => cachedOpenAlex.client.sources.autocomplete(q),
    institutions: async (q) => cachedOpenAlex.client.institutions.autocomplete(q),
    concepts: async (q) => cachedOpenAlex.client.concepts.autocomplete(q),
    publishers: async (q) => cachedOpenAlex.client.publishers.autocomplete(q),
    funders: async (q) => cachedOpenAlex.client.funders.autocomplete(q),
    topics: async (q) => cachedOpenAlex.client.topics.autocomplete(q),
  };

  return methodMap[entityType] ?? null;
};

/**
 * Resolve the active search query from URL params, preferring `q` then falling back to `search` Empty strings are treated the same as an absent param so a cleared field falls through correctly
 */
const resolveQueryFromUrlSearch = (params: Readonly<AutocompleteSearchParams>): string => {
  if (params.q !== undefined && params.q !== "") {
    return params.q;
  }
  if (params.search !== undefined && params.search !== "") {
    return params.search;
  }
  return "";
};

/**
 * Shared hook for entity-specific autocomplete pages
 */
export const useEntityAutocomplete = ({
  entityType,
  urlSearch,
  routePath,
}: Readonly<UseEntityAutocompleteOptions>): UseEntityAutocompleteResult => {
  const [query, setQuery] = useState(resolveQueryFromUrlSearch(urlSearch));
  const metadata = ENTITY_METADATA[entityType];

  // Prettify URL by decoding encoded characters
  useEffect(() => {
    if (typeof window === "undefined") {
    	return;
    }

    const currentHash = window.location.hash;
    const decodedHash = decodeURIComponent(currentHash);
    if (currentHash !== decodedHash) {
      window.history.replaceState(null, "", decodedHash);
    }
  }, []);

  // Sync query state with URL params
  useEffect(() => {
    const newQuery = resolveQueryFromUrlSearch(urlSearch);
    if (newQuery !== query) {
      setQuery(newQuery);
    }
  }, [urlSearch.q, urlSearch.search, query]);

  // Fetch autocomplete results
  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["autocomplete", entityType, query, metadata.displayName],
    queryFn: async () => {
      if (!query.trim()) return [];

      const autocompleteMethod = getAutocompleteMethod(entityType);
      if (!autocompleteMethod) {
        logger.warn("autocomplete", `No autocomplete method for entity type: ${entityType}`);
        return [];
      }

      logger.debug("autocomplete", `Fetching ${metadata.displayName.toLowerCase()} suggestions`, { query });

      const response = await autocompleteMethod(query);

      logger.debug("autocomplete", `${metadata.displayName} suggestions received`, {
        count: response.length,
      });

      return response;
    },
    enabled: query.trim().length > 0,
    staleTime: 30_000,
  });

  // Handle search input changes
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);

      // Build URL params
      const parameterParts: string[] = [];
      if (value) {
        parameterParts.push(`q=${encodeURIComponent(value)}`);
      }
      if (urlSearch.filter !== undefined && urlSearch.filter !== "") {
        parameterParts.push(`filter=${encodeURIComponent(urlSearch.filter)}`);
      }

      const newHash = parameterParts.length > 0
        ? `#${routePath}?${parameterParts.join("&")}`
        : `#${routePath}`;
      window.history.replaceState(null, "", newHash);
    },
    [routePath, urlSearch.filter]
  );

  return {
    query,
    handleSearch,
    results,
    isLoading,
    error,
    filter: urlSearch.filter,
  };
};
