/**
 * OpenAlex Grouping Type Guards
 * Type guard functions for grouping operations
 */

/**
 * Type guard to check if value is a valid performer record
 * @param value - Value to check
 * @returns True if value is a non-null object (not an array)
 */
export const isPerformerRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * Type guard to check if value is a finite number
 * @param value - Value to check
 * @returns True if value is a number and not NaN
 */
export const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && !Number.isNaN(value);
};

/**
 * Extract metric value from a record with type safety
 * @param record - Record to extract from
 * @param metric - Metric key to extract
 * @returns Numeric value or 0 if not found/invalid
 */
export const extractMetricFromRecord = (
  record: unknown,
  metric: string,
): number => {
  if (record && typeof record === "object") {
    const groupRecord = record as Record<string, unknown>;
    const value = metric in groupRecord ? groupRecord[metric] : undefined;
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }
  }
  return 0;
};
