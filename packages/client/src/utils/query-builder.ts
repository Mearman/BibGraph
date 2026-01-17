/**
 * OpenAlex Query Builder
 *
 * Main QueryBuilder class for constructing OpenAlex API queries.
 * Delegates to helper modules for types, utilities, constants, and factories.
 * @see https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/filter-entity-lists
 */

import type { EntityFilters } from "@bibgraph/types";

// Import filter builder from canonical source
import { buildFilterStringFromFilters } from "./filter-builder.js";
// Import types from helper module
import type { LogicalOperator, PaginationParams } from "./query-builder-types.js";
// Import utilities from helper module
import {
  escapeFilterValue,
  normalizePaginationParams,
  validateDateRange,
} from "./query-builder-utils.js";

// Re-export all types, utilities, constants, and factories for consumers

/**
 * Main QueryBuilder class for constructing OpenAlex API queries
 */
export class QueryBuilder<T extends EntityFilters = EntityFilters> {
  private filters: Partial<T>;
  private logicalOperator: LogicalOperator;
  private pagination: PaginationParams;

  constructor(
    initialFilters: Partial<T> = {},
    operator: LogicalOperator = "AND",
    initialPagination: PaginationParams = {},
  ) {
    this.filters = { ...initialFilters };
    this.logicalOperator = operator;
    this.pagination = { ...initialPagination };
  }

  /**
   * Add a single filter condition
   * @param field - The field name to filter on
   * @param value - The value to filter by
   * @param operator - The comparison operator (defaults to '=')
   * @returns This QueryBuilder instance for chaining
   */
  addFilter<K extends keyof T>(
    field: K,
    value: T[K],
    operator: "=" | "!=" | ">" | ">=" | "<" | "<=" = "=",
  ): this {
    if (value === undefined || value === null) {
      return this;
    }

    if (operator === "=") {
      this.safelyAssignToField(field, value);
    } else {
      const operatorSymbol = operator === "!=" ? "!" : operator;
      const formattedValue = `${operatorSymbol}${String(value)}`;
      this.safelyAssignToField(field, formattedValue);
    }

    return this;
  }

  /**
   * Add multiple filters at once
   * @param filters - Object containing filter field-value pairs
   * @returns This QueryBuilder instance for chaining
   */
  addFilters(filters: Partial<T>): this {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        this.safelyAssignByKey(key, value);
      }
    });
    return this;
  }

  /**
   * Add a date range filter
   * @param fromField - The 'from' date field name
   * @param toField - The 'to' date field name
   * @param fromDate - Start date (ISO string or YYYY-MM-DD)
   * @param toDate - End date (ISO string or YYYY-MM-DD)
   * @returns This QueryBuilder instance for chaining
   */
  addDateRange<K extends keyof T>(
    fromField: K,
    toField: K,
    fromDate: string,
    toDate: string,
  ): this {
    const validation = validateDateRange(fromDate, toDate);
    if (!validation.isValid) {
      throw new Error(`Invalid date range: ${String(validation.error)}`);
    }

    if (validation.normalizedFrom) {
      this.safelyAssignToField(fromField, validation.normalizedFrom);
    }
    if (validation.normalizedTo) {
      this.safelyAssignToField(toField, validation.normalizedTo);
    }

    return this;
  }

  /**
   * Add a search filter for text fields
   * @param field - The search field (usually ends with '.search')
   * @param query - The search query string
   * @returns This QueryBuilder instance for chaining
   */
  addSearch(field: keyof T, query: string): this {
    if (query?.trim().length === 0) {
      return this;
    }

    const escapedValue = escapeFilterValue(query.trim());
    this.safelyAssignToField(field, escapedValue);
    return this;
  }

  /**
   * Set the logical operator for combining filters
   * @param operator - The logical operator ('AND', 'OR', 'NOT')
   * @returns This QueryBuilder instance for chaining
   */
  setOperator(operator: LogicalOperator): this {
    this.logicalOperator = operator;
    return this;
  }

  /**
   * Build the final filters object
   * @returns The constructed filters object
   */
  build(): Partial<T> {
    return { ...this.filters };
  }

  /**
   * Build the filter string for the OpenAlex API
   * @returns The filter string ready for the API
   */
  buildFilterString(): string {
    return buildFilterStringFromFilters(this.filters);
  }

  /**
   * Set the page number for pagination
   * @param page - The page number to retrieve (1-based)
   * @returns This QueryBuilder instance for chaining
   */
  setPage(page: number): this {
    if (page < 1) {
      throw new Error("Page number must be 1 or greater");
    }
    this.pagination.page = page;
    return this;
  }

  /**
   * Set the number of results per page
   * @param perPage - Number of results per page (1-200)
   * @returns This QueryBuilder instance for chaining
   */
  setPerPage(perPage: number): this {
    if (perPage < 1 || perPage > 200) {
      throw new Error("per_page must be between 1 and 200");
    }
    this.pagination.per_page = perPage;
    return this;
  }

  /**
   * Set the cursor for cursor-based pagination
   * @param cursor - The cursor value from a previous response
   * @returns This QueryBuilder instance for chaining
   */
  setCursor(cursor: string): this {
    this.pagination.cursor = cursor;
    return this;
  }

  /**
   * Set the group_by parameter for aggregation queries
   * @param groupBy - The field to group results by
   * @returns This QueryBuilder instance for chaining
   */
  setGroupBy(groupBy: string): this {
    if (groupBy?.trim().length === 0) {
      throw new Error("group_by cannot be empty");
    }
    this.pagination.group_by = groupBy.trim();
    return this;
  }

  /**
   * Set pagination parameters from a raw object
   * @param params - Raw parameters object that may contain pagination params
   * @returns This QueryBuilder instance for chaining
   */
  setPaginationFromParams(params: Record<string, unknown>): this {
    const normalized = normalizePaginationParams(params);
    this.pagination = { ...this.pagination, ...normalized };
    return this;
  }

  /**
   * Build the complete query parameters including filters and pagination
   * @returns Complete query parameters object
   */
  buildQueryParams(): Record<string, unknown> {
    const params: Record<string, unknown> = { ...this.pagination };

    const filterString = this.buildFilterString();
    if (filterString) {
      params.filter = filterString;
    }

    return params;
  }

  /**
   * Reset all filters and pagination parameters
   * @returns This QueryBuilder instance for chaining
   */
  reset(): this {
    this.filters = {};
    this.logicalOperator = "AND";
    this.pagination = {};
    return this;
  }

  /**
   * Clone this QueryBuilder with the same filters and pagination
   * @returns A new QueryBuilder instance with copied filters and pagination
   */
  clone(): QueryBuilder<T> {
    const cloned = new QueryBuilder<T>(
      { ...this.filters },
      this.logicalOperator,
    );
    cloned.pagination = { ...this.pagination };
    return cloned;
  }

  /**
   * Type guard to check if a string key is valid for the filter type
   * @param key
   */
  private isValidKey(key: string): key is string & keyof T {
    return typeof key === "string" && key.length > 0;
  }

  /**
   * Type guard to check if a value can be assigned to filter fields
   * @param value
   */
  private isAssignableToField(
    value: unknown,
  ): value is string | number | boolean | Array<unknown> {
    return (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      Array.isArray(value)
    );
  }

  /**
   * Type guard to safely access filters as a record
   * @param filters
   */
  private isFiltersRecord(
    filters: Partial<T>,
  ): filters is Partial<T> & Record<string, unknown> {
    return true;
  }

  /**
   * Safely assign a value to a filter field after validation
   * @param field
   * @param value
   */
  private safelyAssignToField(field: keyof T, value: unknown): void {
    if (this.isAssignableToField(value) && this.isFiltersRecord(this.filters)) {
      const filterKey = String(field);
      const filtersRecord = this.filters as Record<string, unknown>;
      if (typeof filtersRecord === "object" && filtersRecord !== null) {
        filtersRecord[filterKey] = value;
      }
    }
  }

  /**
   * Safely assign a value to a filter field by key string after validation
   * @param key
   * @param value
   */
  private safelyAssignByKey(key: string, value: unknown): void {
    if (
      this.isValidKey(key) &&
      this.isAssignableToField(value) &&
      this.isFiltersRecord(this.filters)
    ) {
      (this.filters as Record<string, unknown>)[key] = value;
    }
  }
}

/**
 * Convert a filters object to OpenAlex API filter string format
 * @param filters - The filters object containing field-value pairs
 * @returns Formatted filter string for the OpenAlex API
 */
export const buildFilterString = (filters: EntityFilters | Partial<EntityFilters> | null | undefined): string => {
  if (!filters) {
    return "";
  }
  return buildFilterStringFromFilters(filters);
};
