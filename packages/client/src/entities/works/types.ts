/**
 * Type Definitions for Works API
 * Contains all types, interfaces, and type aliases specific to the Works API
 */

import type { QueryParams, WorksFilters } from "@bibgraph/types";

/**
 * Extended query parameters specific to Works API
 * Supports both string and object filters for flexibility
 */
export type WorksQueryParams = Omit<QueryParams, "filter"> & {
  filter?: string | WorksFilters;
};

/**
 * Options for Works autocomplete (query passed separately)
 */
export interface WorksAutocompleteOptions {
  /** Number of results to return (default: 10, max: 50) */
  per_page?: number;
  /** Additional query parameters for filtering */
  filters?: Record<string, unknown>;
}

/**
 * Options for searching works
 */
export interface SearchWorksOptions {
  filters?: WorksFilters;
  sort?:
    | "relevance_score"
    | "cited_by_count"
    | "publication_date"
    | "created_date";
  page?: number;
  per_page?: number;
  select?: string[];
}

/**
 * Options for getting related works
 */
export interface RelatedWorksOptions {
  limit?: number;
  filters?: WorksFilters;
  select?: string[];
}

/**
 * Group by result for a single aggregation bucket
 */
export interface GroupByResult {
  key: string;
  key_display_name: string;
  count: number;
}

/**
 * Options for grouping works
 */
export interface GroupWorksOptions {
  filters?: WorksFilters;
  sort?:
    | "relevance_score"
    | "cited_by_count"
    | "publication_date"
    | "created_date";
  page?: number;
  per_page?: number;
  select?: string[];
  group_limit?: number;
}
