/**
 * Sources Query Builder Utilities
 *
 * Provides query parameter building for Sources API requests.
 *
 * @module sources-query-builder
 */

import type { QueryParams, SourcesFilters } from "@bibgraph/types";

import { buildFilterString } from "../utils/query-builder";

/**
 * Options for searching sources
 */
export interface SourceSearchOptions {
  filters?: SourcesFilters;
  sort?: string;
  page?: number;
  per_page?: number;
  select?: string[];
  sample?: number;
  seed?: number;
}

/**
 * Type guard to check if value is SourcesFilters
 * @param value - Value to check
 */
export const isSourcesFilters = (value: unknown): value is SourcesFilters => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Build filter parameters for API requests
 * Converts SourceSearchOptions to query string format using standardized FilterBuilder
 * @param options - Source search options
 * @returns Query parameters ready for API request
 */
export const buildSourceFilterParams = (options: SourceSearchOptions = {}): QueryParams => {
  const {
    filters,
    sort,
    page,
    per_page,
    select,
    sample,
    seed,
    ...otherOptions
  } = options;

  const queryParams: QueryParams = {
    ...otherOptions,
  };

  // Handle filters
  if (filters && Object.keys(filters).length > 0) {
    queryParams.filter = buildFilterString(filters);
  }

  // Add sort if provided
  if (sort) {
    queryParams.sort = sort;
  }

  // Add pagination if provided
  if (page !== undefined) {
    queryParams.page = page;
  }
  if (per_page !== undefined) {
    queryParams.per_page = per_page;
  }

  // Add select if provided
  if (select) {
    queryParams.select = select;
  }

  // Add sample if provided
  if (sample !== undefined) {
    queryParams.sample = sample;
  }

  // Add seed if provided
  if (seed !== undefined) {
    queryParams.seed = seed;
  }

  return queryParams;
};
