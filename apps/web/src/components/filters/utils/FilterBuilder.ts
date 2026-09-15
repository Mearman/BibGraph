/**
 * FilterBuilder utility class for converting TypeScript filter objects to OpenAlex API query strings
 *
 * This class provides a comprehensive interface for building OpenAlex API filter strings
 * from structured filter objects with type safety and validation.
 */

import type { EntityFilters, EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";

/**
 * Filter validation results
 */
export interface FilterValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

/**
 * Configuration options for filter conversion
 */
export interface FilterBuilderOptions {
  /**
  Whether to validate filter values before conversion
   */
  validateInputs?: boolean;
  /**
  Whether to escape special characters in filter values
   */
  escapeValues?: boolean;
  /**
  Whether to include empty filters in output
   */
  includeEmpty?: boolean;
  /**
  Logical operator for combining multiple filters
   */
  logicalOperator?: "AND" | "OR";
}

/**
 * Parameters accepted by {@link FilterBuilder.toQueryString} and {@link FilterBuilder.convertWithValidation}
 */
export interface QueryStringParams {
  filters: EntityFilters | Partial<EntityFilters> | null | undefined;
  entityType?: EntityType;
}

/**
 * Parameters accepted by {@link FilterBuilder.validateFilters}
 */
export interface ValidateFiltersParams {
  filters: EntityFilters | Partial<EntityFilters>;
  entityType: EntityType;
}

/**
 * FilterBuilder class for converting EntityFilters to OpenAlex API query strings
 */
export class FilterBuilder {
  private readonly options: FilterBuilderOptions;

  constructor(options: Readonly<FilterBuilderOptions> = {}) {
    this.options = {
      validateInputs: true,
      escapeValues: true,
      includeEmpty: false,
      logicalOperator: "AND",
      ...options,
    };
  }

  /**
   * Convert EntityFilters object to OpenAlex API query string format
   * @param params - The filters and optional entity type to convert
   * @returns The formatted filter string for the OpenAlex API
   * @example
   * ```typescript
   * const builder = new FilterBuilder();
   * const filters: WorksFilters = {
   *   'publication_year': 2023,
   *   'is_oa': true,
   *   'authorships.author.id': ['A1234', 'A5678']
   * };
   * const queryString = builder.toQueryString({ filters });
   * // Result: "publication_year:2023,is_oa:true,authorships.author.id:A1234|A5678"
   * ```
   */
  toQueryString(params: Readonly<QueryStringParams>): string {
    const { filters, entityType } = params;
    logger.debug("filters", "Converting filters to query string", {
      filters,
      entityType,
      options: this.options,
    });

    if (filters === null || filters === undefined || Object.keys(filters).length === 0) {
      return "";
    }

    // Validate inputs if enabled
    if (this.options.validateInputs === true && entityType !== undefined) {
      const validation = this.validateFilters({ filters, entityType });
      if (!validation.isValid) {
        logger.warn("filters", "Filter validation failed", {
          errors: validation.errors,
          warnings: validation.warnings,
        });
        // Continue with conversion but log issues
      }
    }

    const filterParts: string[] = [];

    for (const [field, value] of Object.entries(filters)) {
      if (value === undefined || value === null) {
        continue;
      }

      // Skip empty values unless explicitly included
      if (this.options.includeEmpty !== true && this.isEmpty(value)) {
        continue;
      }

      const formattedValue = this.formatFilterValue(value);
      if (formattedValue) {
        filterParts.push(`${field}:${formattedValue}`);
      }
    }

    const result = filterParts.join(",");
    logger.debug("filters", "Generated query string", { result });
    return result;
  }

  /**
   * Format a single filter value according to OpenAlex API conventions
   * @param value - The value to format
   * @returns Formatted value string
   */
  private formatFilterValue(value: unknown): string {
    if (value === undefined || value === null) {
      return "";
    }

    if (Array.isArray(value)) {
      // Handle array values with OR logic using pipe separator
      const formattedValues = value
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
        .map((v) => this.escapeValue(String(v)));

      return formattedValues.join("|");
    }

    if (typeof value === "boolean") {
      return value.toString();
    }

    if (typeof value === "number") {
      return value.toString();
    }

    if (typeof value === "string") {
      return this.escapeValue(value);
    }

    if (typeof value === "bigint" || typeof value === "symbol") {
      return this.escapeValue(value.toString());
    }

    // Remaining object-like or exotic values - use JSON serialization, since the default Object.prototype.toString() only yields "[object Object]"
    return this.escapeValue(JSON.stringify(value));
  }

  /**
   * Escape special characters in filter values for OpenAlex API
   * @param value - The value to escape
   * @returns Escaped value safe for use in API queries
   */
  private escapeValue(value: string): string {
    if (this.options.escapeValues !== true || !value || typeof value !== "string") {
      return value || "";
    }

    let escaped = value.trim();

    // OpenAlex API specific escaping rules:
    // If the value contains spaces, commas, or special characters, wrap in quotes
    const isNeedsQuoting = /[\s"&'(),:|]/.test(escaped);

    if (isNeedsQuoting) {
      // Escape existing quotes
      escaped = escaped.replaceAll('"', String.raw`\"`);
      // Wrap in quotes
      escaped = `"${escaped}"`;
    }

    return escaped;
  }

  /**
   * Check if a value is considered empty
   * @param value - The value to check
   * @returns True if the value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === "string") {
      return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
      return value.every((v) => this.isEmpty(v));
    }

    return false;
  }

  /**
   * Validate filter object for a specific entity type
   * @param params - The validation parameters
   * @returns Validation result with errors and warnings
   */
  validateFilters(params: Readonly<ValidateFiltersParams>): FilterValidationResult {
    const { filters } = params;
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Check for known filter fields (this is a basic check - could be enhanced with schema validation)
    const commonFilterPatterns = [
      /^cited_by_count$/,
      /^works_count$/,
      /^display_name\.search$/,
      /^default\.search$/,
      /^from_.*_date$/,
      /^to_.*_date$/,
      /^has_.*$/,
      /^is_.*$/,
      /.*\.id$/,
      /.*\.search$/,
    ];

    for (const [field, value] of Object.entries(filters)) {
      // Check if field follows known patterns
      const isKnownPattern = commonFilterPatterns.some((pattern) =>
        pattern.test(field),
      );
      if (!isKnownPattern) {
        warnings[field] = `Unknown filter field: ${field}`;
      }

      // Validate date fields
      if (
        field.includes("date") &&
        typeof value === "string" &&
        !this.isValidDateString(value)
      ) {
        errors[field] = `Invalid date format for field ${field}: ${value}`;
      }

      // Validate numeric fields
      if (
        field.includes("count") &&
        value !== null &&
        value !== undefined &&
        !this.isValidNumericFilter(value)
      ) {
        const valueDisplay =
          typeof value === "bigint" || typeof value === "symbol" ? value.toString() : JSON.stringify(value);
        errors[field] = `Invalid numeric value for field ${field}: ${valueDisplay}`;
      }

      // Validate boolean fields
      if (
        (field.startsWith("has_") || field.startsWith("is_")) &&
        typeof value !== "boolean" &&
        value !== null &&
        value !== undefined
      ) {
        warnings[field] = `Expected boolean value for field ${field}, got: ${typeof value}`;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a string is a valid date format
   * @param dateString - The date string to validate
   * @returns True if valid
   */
  private isValidDateString(dateString: string): boolean {
    // Accept ISO 8601 dates (YYYY-MM-DD) and year-only formats
    const datePattern = /^\d{4}(?:-\d{2}-\d{2})?$/;
    if (!datePattern.test(dateString)) {
      return false;
    }

    // Additional validation with Date constructor
    const date = new Date(dateString);
    return !Number.isNaN(date.getTime());
  }

  /**
   * Check if a value is a valid numeric filter
   * @param value - The value to validate
   * @returns True if valid
   */
  private isValidNumericFilter(value: unknown): boolean {
    if (typeof value === "number") {
      return !Number.isNaN(value) && Number.isFinite(value);
    }

    if (typeof value === "string") {
      // Check for operator prefixes like ">100", ">=50", etc.
      const numericPattern = /^[!<=>]*\d+(?:\.\d+)?$/;
      return numericPattern.test(value.trim());
    }

    return false;
  }

  /**
   * Create a new FilterBuilder with different options
   * @param options - New options to apply
   * @returns New FilterBuilder instance
   */
  withOptions(options: Readonly<Partial<FilterBuilderOptions>>): FilterBuilder {
    return new FilterBuilder({ ...this.options, ...options });
  }

  /**
   * Get current configuration options
   * @returns Current options
   */
  getOptions(): FilterBuilderOptions {
    return { ...this.options };
  }

  /**
   * Convert filters and return both the query string and validation results
   * @param params - The filters and optional entity type to convert
   * @returns Object with query string and validation results
   */
  convertWithValidation(params: Readonly<QueryStringParams>): {
    queryString: string;
    validation: FilterValidationResult | undefined;
  } {
    const { filters, entityType } = params;
    const validation =
      entityType !== undefined && this.options.validateInputs === true && filters !== null && filters !== undefined
        ? this.validateFilters({ filters, entityType })
        : undefined;

    const queryString = this.toQueryString({ filters, entityType });

    return { queryString, validation };
  }

  /**
   * Static factory method to create a FilterBuilder with default options
   * @returns New FilterBuilder instance with default options
   */
  static create(): FilterBuilder {
    return new FilterBuilder();
  }

  /**
   * Static factory method to create a FilterBuilder with strict validation
   * @returns New FilterBuilder instance with strict validation enabled
   */
  static createStrict(): FilterBuilder {
    return new FilterBuilder({
      validateInputs: true,
      escapeValues: true,
      includeEmpty: false,
      logicalOperator: "AND",
    });
  }

  /**
   * Static factory method to create a FilterBuilder with permissive options
   * @returns New FilterBuilder instance with permissive options
   */
  static createPermissive(): FilterBuilder {
    return new FilterBuilder({
      validateInputs: false,
      escapeValues: false,
      includeEmpty: true,
      logicalOperator: "OR",
    });
  }
}

/**
 * Default FilterBuilder instance for convenience
 */
export const defaultFilterBuilder = FilterBuilder.create();

/**
 * Strict FilterBuilder instance for cases requiring validation
 */
export const strictFilterBuilder = FilterBuilder.createStrict();

/**
 * Convenience function to convert filters to query string using default options
 * @param params - The filters and optional entity type to convert
 * @returns The formatted filter string
 */
export const filtersToQueryString = (params: Readonly<QueryStringParams>): string =>
  defaultFilterBuilder.toQueryString(params);

/**
 * Convenience function to validate filters without conversion
 * @param params - The validation parameters
 * @returns Validation result
 */
export const validateFilters = (params: Readonly<ValidateFiltersParams>): FilterValidationResult =>
  strictFilterBuilder.validateFilters(params);
