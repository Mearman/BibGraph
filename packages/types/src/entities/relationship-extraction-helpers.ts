/**
 * Helpers for safely reading fields out of the untyped `Record<string, unknown>` entity data passed into relationship query `extractEmbedded`/`extractIds` callbacks.
 */

import { isRecord } from './utils';

/**
 * Read a string-valued field from an untyped record, returning `undefined` if the field is absent or not a string.
 */
export const getStringField = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
};

/**
 * Read an array-valued field from an untyped record, returning `undefined` if the field is absent or not an array.
 */
export const getArrayField = (record: Record<string, unknown>, key: string): unknown[] | undefined => {
  const value = record[key];
  return Array.isArray(value) ? value : undefined;
};

/**
 * Read a plain-object-valued field from an untyped record, returning `undefined` if the field is absent or not a plain object.
 */
export const getRecordField = (
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined => {
  const value = record[key];
  return isRecord(value) ? value : undefined;
};

/**
 * Filter an unknown array down to the elements that are plain records.
 */
export const filterRecords = (values: readonly unknown[]): Record<string, unknown>[] =>
  values.filter(isRecord);
