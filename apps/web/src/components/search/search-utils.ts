/**
 * Search utility functions
 */
import { cachedOpenAlex } from "@bibgraph/client";
import type { AutocompleteResult } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import type { SearchFilters } from "./search-page-types";

/**
 * Real OpenAlex API autocomplete function - searches across all entity types
 * @param filters
 */
export const searchAllEntities = async (
  filters: SearchFilters,
): Promise<AutocompleteResult[]> => {
  if (!filters.query.trim()) return [];

  try {
    logger.debug("search", "Searching all entities with autocomplete", {
      filters,
    });

    // Use the general autocomplete endpoint that searches across all entity types
    const results = await cachedOpenAlex.client.autocomplete.autocompleteGeneral(
      filters.query,
    );

    logger.debug("search", "Autocomplete search completed", {
      resultsCount: results.length,
      query: filters.query,
    });

    return results;
  } catch (error) {
    logger.error("search", "Autocomplete search failed", { error, filters });
    throw error;
  }
};

/**
 * Store search query in session storage for "back to search" functionality
 * @param query
 */
export const storeSearchQuery = (query: string): void => {
  try {
    if (query.trim()) {
      sessionStorage.setItem('lastSearchQuery', query.trim());
    }
  } catch {
    // Session storage might not be available in all contexts
  }
};
