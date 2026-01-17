/**
 * Institutions API Types and Interfaces
 */

import type { InstitutionsFilters, QueryParams } from "@bibgraph/types";

/**
 * Extended query parameters specific to institutions API
 */
export interface InstitutionsQueryParams extends QueryParams {
  filter?: string;
  search?: string;
  sort?:
    | "cited_by_count"
    | "works_count"
    | "display_name"
    | "created_date"
    | "updated_date";
  group_by?: "country_code" | "type" | "works_count" | "cited_by_count";
}

/**
 * Parameters for institution-specific searches and filters
 */
export interface InstitutionSearchOptions {
  filters?: InstitutionsFilters;
  sort?: InstitutionsQueryParams["sort"];
  page?: number;
  per_page?: number;
  select?: string[];
}
