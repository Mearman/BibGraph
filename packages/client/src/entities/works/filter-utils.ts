/**
 * Filter Utilities for Works API
 * Provides filter merging and type guard utilities
 */

import type { WorksFilters } from "@bibgraph/types";

import { buildFilterString } from "../../utils/query-builder";

/**
 * Type guard to check if value is WorksFilters
 * @param value - Value to check
 * @returns True if value is a WorksFilters object
 */
export const isWorksFilters = (value: unknown): value is WorksFilters => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Merge new filters with existing filters, handling both string and object formats
 * @param newFilters - New filters to add
 * @param existingFilters - Existing filters (can be string or object)
 * @returns Merged filter string
 */
export const mergeFilters = (newFilters: WorksFilters, existingFilters?: string | WorksFilters): string => {
  // Start with new filters
  const mergedFilters: WorksFilters = { ...newFilters };

  // Merge with existing filters if present
  if (existingFilters) {
    if (typeof existingFilters === "string") {
      // If existing filters are a string, append them to the new filter string
      const newFilterString = buildFilterString(newFilters);
      return `${newFilterString},${existingFilters}`;
    } else {
      // If existing filters are an object, merge them
      Object.assign(mergedFilters, existingFilters, newFilters); // New filters override existing ones
    }
  }

  return buildFilterString(mergedFilters);
};
