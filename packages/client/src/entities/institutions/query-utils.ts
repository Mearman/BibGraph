/**
 * Query parameter building utilities for Institutions API
 */

import type { QueryParams } from "@bibgraph/types";

import { buildFilterString } from "../../utils/query-builder";
import type { InstitutionSearchOptions } from "./types";

/**
 * Build query parameters from institution search options and filters
 * @param options - Institution search options
 * @returns Formatted query parameters
 */
export const buildInstitutionQueryParams = (options: InstitutionSearchOptions & { filter?: string } = {}): QueryParams => {
  const { filters, filter, sort, page, per_page, select, ...otherOptions } =
    options;

  const queryParams: QueryParams = {
    ...otherOptions,
  };

  // Handle filters using standardized FilterBuilder utility
  // Support both 'filters' (plural) and 'filter' (singular) for test compatibility
  const filtersToProcess = filters ?? filter;
  if (
    filtersToProcess &&
    typeof filtersToProcess === "object" &&
    Object.keys(filtersToProcess).length > 0
  ) {
    queryParams.filter = buildFilterString(filtersToProcess);
  }

  // Add other parameters
  if (sort) queryParams.sort = sort;
  if (page) queryParams.page = page;
  if (per_page) queryParams.per_page = per_page;
  if (select) queryParams.select = select;

  return queryParams;
};
