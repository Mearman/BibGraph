/**
 * Runtime narrowing helpers for reading typed fields off raw, untyped OpenAlex API responses (`Record<string, unknown>`) without resorting to type assertions.
 */

/**
 * Narrows `value` to a plain, non-null, non-array object.
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads an optional string field from a plain object, returning `undefined` if the field is absent or not a string.
 */
export const readString = (obj: Record<string, unknown>, key: string): string | undefined => {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
};

/**
 * Reads an optional number field from a plain object, returning `undefined` if the field is absent or not a number.
 */
export const readNumber = (obj: Record<string, unknown>, key: string): number | undefined => {
  const value = obj[key];
  return typeof value === 'number' ? value : undefined;
};

/**
 * Reads an optional nested object field from a plain object, returning `undefined` if the field is absent or not a plain object.
 */
export const readObject = (obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined => {
  const value = obj[key];
  return isPlainObject(value) ? value : undefined;
};

/**
 * Reads an optional array field from a plain object, returning `undefined` if the field is absent or not an array.
 */
export const readArray = (obj: Record<string, unknown>, key: string): unknown[] | undefined => {
  const value = obj[key];
  return Array.isArray(value) ? value : undefined;
};

/**
 * Reads an optional field known to contain only strings (e.g. a lineage of entity IDs), returning `undefined` if the field is absent, not an array, or contains a non-string element.
 */
export const readStringArray = (obj: Record<string, unknown>, key: string): string[] | undefined => {
  const value = readArray(obj, key);
  if (value === undefined) {
    return undefined;
  }

  const strings: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }
    strings.push(item);
  }
  return strings;
};
