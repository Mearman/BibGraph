/**
 * Query Builder Utilities
 *
 * Utility functions for OpenAlex query building operations including
 * date validation, value escaping, pagination normalization, and string building.
 */

import type { DateRangeValidation, PaginationParams as PaginationParameters, SortOptions } from "./query-builder-types.js";

/**
 * Validate a date range for OpenAlex API filters
 * @param from - Start date string (ISO format or YYYY-MM-DD)
 * @param to - End date string (ISO format or YYYY-MM-DD)
 * @returns Validation result with normalized dates
 * @example
 * ```typescript
 * const validation = validateDateRange('2020-01-01', '2023-12-31');
 * if (validation.isValid) {
 *   logger.debug("general", 'Valid range:', validation.normalizedFrom, 'to', validation.normalizedTo);
 * }
 * ```
 */
const MIN_DATE_STRING_LENGTH = 4;

export const validateDateRange = (from: string | null | undefined, to: string | null | undefined): DateRangeValidation => {
  if (from === undefined || from === null || from === "" || to === undefined || to === null || to === "") {
    return {
      isValid: false,
      error: "Both from and to dates must be provided",
    };
  }

  // Normalize date strings to YYYY-MM-DD format
  const normalizeDate = (dateString: string): string | undefined => {
    try {
      // First check if the date string matches expected patterns
      const trimmed = dateString.trim();
      if (trimmed === "" || trimmed.length < MIN_DATE_STRING_LENGTH) {
        return undefined; // Too short to be a valid date
      }

      // Strict validation: reject obviously invalid formats
      if (trimmed === "not-a-date" || !/\d/.test(trimmed)) {
        return undefined; // Contains no digits or is obviously invalid
      }

      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) {
        return undefined;
      }

      // Additional validation: check if the parsed date matches the input intent
      const isoString = date.toISOString().split("T", 1)[0];

      // For strict validation, check if year-only inputs are acceptable
      if (/^\d{4}$/.test(trimmed)) {
        return undefined; // Reject year-only dates as incomplete
      }

      return isoString; // YYYY-MM-DD
    } catch {
      return undefined;
    }
  };

  const normalizedFrom = normalizeDate(from);
  const normalizedTo = normalizeDate(to);

  if (normalizedFrom === undefined) {
    return {
      isValid: false,
      error: `Invalid 'from' date format: ${from}`,
    };
  }

  if (normalizedTo === undefined) {
    return {
      isValid: false,
      error: `Invalid 'to' date format: ${to}`,
    };
  }

  // Check that from date is not after to date
  if (new Date(normalizedFrom) > new Date(normalizedTo)) {
    return {
      isValid: false,
      error: "Start date cannot be after end date",
    };
  }

  return {
    isValid: true,
    normalizedFrom,
    normalizedTo,
  };
};

/**
 * Escape special characters in filter values for OpenAlex API
 * @param value - The filter value to escape
 * @returns Escaped value safe for use in API queries
 * @example
 * ```typescript
 * const escaped = escapeFilterValue('machine "learning" & AI');
 * // Handles quotes, special chars, etc.
 * ```
 */
export const escapeFilterValue = (value: string): string => {
  if (!value || typeof value !== "string") {
    return "";
  }

  // OpenAlex API specific escaping rules:
  // 1. Handle quotes by surrounding with double quotes if contains spaces/special chars
  // 2. Escape existing quotes
  // 3. Handle special characters that might break queries

  let escaped = value.trim();

  // If the value contains spaces, commas, or special characters, wrap in quotes
  const isNeedsQuoting = /[\s"&'(),:|]/.test(escaped);

  if (isNeedsQuoting) {
    // Escape existing quotes using split/join for broader compatibility
    escaped = escaped.split('"').join(String.raw`\"`);
    // Wrap in quotes
    escaped = `"${escaped}"`;
  }

  return escaped;
};

/**
 * Normalize pagination parameters, handling both per_page and per-page formats
 * @param params - Raw parameters object that may contain pagination params
 * @returns Normalized pagination parameters
 * @example
 * ```typescript
 * const normalized = normalizePaginationParams({
 *   'per_page': 50,
 *   'per-page': 25, // This will be ignored if per_page is present
 *   page: 1
 * });
 * // Result: { per_page: 50, page: 1 }
 * ```
 */
export const normalizePaginationParams = (params: Record<string, unknown>): PaginationParameters => {
  const normalized: PaginationParameters = {};

  // Handle page parameter
  if (typeof params.page === "number") {
    normalized.page = params.page;
  }

  // Handle per_page parameter (preferred format)
  if (typeof params.per_page === "number") {
    normalized.per_page = params.per_page;
  }
  // Handle per-page parameter (alternative format) - only if per_page not set
  else if (typeof params["per-page"] === "number") {
    normalized.per_page = params["per-page"];
  }

  // Handle cursor parameter
  if (typeof params.cursor === "string" && params.cursor.trim().length > 0) {
    normalized.cursor = params.cursor.trim();
  }

  // Handle group_by parameter (preferred format)
  if (typeof params.group_by === "string") {
    normalized.group_by = params.group_by;
  }
  // Handle group-by parameter (alternative format) - only if group_by not set
  else if (typeof params["group-by"] === "string") {
    normalized.group_by = params["group-by"];
  }

  return normalized;
};

/**
 * Build sort parameter string for the OpenAlex API
 * @param sorts - Array of sort options or a single sort option
 * @returns Formatted sort string for the API
 * @example
 * ```typescript
 * const sortString = buildSortString([
 *   { field: 'publication_year', direction: 'desc' },
 *   { field: 'cited_by_count', direction: 'desc' }
 * ]);
 * // Result: "publication_year:desc,cited_by_count:desc"
 * ```
 */
/**
 * Type guard narrowing to `readonly SortOptions[]` rather than the `any[]` that `Array.isArray` itself narrows to, so downstream array operations stay type-safe instead of silently becoming `any`.
 */
const isSortOptionsArray = (value: unknown): value is readonly SortOptions[] => Array.isArray(value);

export const buildSortString = (sorts: SortOptions | readonly SortOptions[] | null | undefined): string => {
  if (!sorts) {
    return "";
  }

  const sortArray: readonly SortOptions[] = isSortOptionsArray(sorts) ? sorts : [sorts];

  return sortArray
    .filter((sort) => sort.field)
    .map((sort) => {
      const direction = sort.direction ?? "asc";
      return `${sort.field}:${direction}`;
    })
    .join(",");
};

/**
 * Build select parameter string for field selection
 * @param fields - Array of field names to select
 * @returns Comma-separated field string
 * @example
 * ```typescript
 * const selectString = buildSelectString(['id', 'display_name', 'publication_year']);
 * // Result: "id,display_name,publication_year"
 * ```
 */
export const buildSelectString = (fields:
    | readonly (string | null | undefined)[]
     
    | null
    | undefined): string => {
  if (fields === null || fields === undefined || fields.length === 0) {
    return "";
  }

  return fields
    .filter(
      (field): field is string => field !== null && field !== undefined && field.trim().length > 0,
    )
    .map((field) => field.trim())
    .join(",");
};
