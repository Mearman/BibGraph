/**
 * Query Builder Types
 *
 * Type definitions and interfaces for OpenAlex query building operations.
 * @see https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/filter-entity-lists
 */

/**
 * Sort options for different entity types
 */
export interface SortOptions {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction?: "asc" | "desc";
}

/**
 * Logical operators for combining filters
 */
export type LogicalOperator = "AND" | "OR" | "NOT";

/**
 * Date range validation result
 */
export interface DateRangeValidation {
  isValid: boolean;
  error?: string;
  normalizedFrom?: string;
  normalizedTo?: string;
}

/**
 * Pagination parameters for OpenAlex API queries
 */
export interface PaginationParams {
  page?: number;
  per_page?: number;
  cursor?: string;
  group_by?: string;
}
