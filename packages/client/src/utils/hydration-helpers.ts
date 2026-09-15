/**
 * Utilities for working with partially hydrated OpenAlex entities
 * Only 'id' is guaranteed - all other fields may be present or absent
 */

/**
 * Type guard to check if an entity has a specific field hydrated
 */
export const hasField = <T, K extends keyof T>(entity: T, field: K): entity is T & Required<Pick<T, K>> => entity[field] !== undefined;

/**
 * Type guard to check if an entity has multiple fields hydrated
 */
export const hasFields = <T, K extends keyof T>(entity: T, ...fields: readonly K[]): entity is T & Required<Pick<T, K>> => fields.every(field => entity[field] !== undefined);

/**
 * Get list of all hydrated fields (excluding 'id' which is always present)
 */
export const getHydratedFields = (entity: Record<string, unknown>): string[] => Object.keys(entity).filter(key =>
		entity[key] !== undefined && key !== "id"
	);

/**
 * Check if an entity is minimally hydrated (only id and maybe display_name)
 */
export const isMinimallyHydrated = (entity: Record<string, unknown>): boolean => getHydratedFields(entity).length <= 1;

/**
 * Minimum number of hydrated fields (beyond 'id') for an entity to be considered fully hydrated.
 */
const FULLY_HYDRATED_FIELD_COUNT = 10;

/**
 * Check if an entity appears to be fully hydrated (has many fields)
 */
export const isFullyHydrated = (entity: Record<string, unknown>): boolean => getHydratedFields(entity).length > FULLY_HYDRATED_FIELD_COUNT;

/**
 * Safe array operations that handle undefined arrays
 */
export const safeSlice = <T>(array: readonly T[] | undefined, start?: number, end?: number): T[] => {
  if (array === undefined) {
    return [];
  }
  if (start === undefined && end === undefined) {
    return [...array];
  }
  if (start !== undefined && end !== undefined) {
    return array.slice(start, end);
  }
  if (start !== undefined) {
    return array.slice(start);
  }
  if (end !== undefined) {
    return array.slice(0, end);
  }
  return [...array];
};

export const safeMap = <T, R>(array: readonly T[] | undefined, function_: (item: T, index: number) => R): R[] => array?.map(function_) ?? [];

export const safeForEach = <T>(array: readonly T[] | undefined, function_: (item: T, index: number) => void): void => {
	array?.forEach(function_);
};

export const safeLength = (array: readonly unknown[] | undefined): number => array?.length ?? 0;

export const safeFind = <T>(array: readonly T[] | undefined, predicate: (item: T) => boolean): T | undefined => array?.find(predicate);

export const safeFilter = <T>(array: readonly T[] | undefined, predicate: (item: T) => boolean): T[] => array?.filter(predicate) ?? [];