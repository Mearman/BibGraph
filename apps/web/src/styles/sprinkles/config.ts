/**
 * Fallback sprinkles implementation
 * This bypasses Vanilla Extract configuration issues while maintaining API compatibility
 *
 * Note: Components using `style={sprinkles(...)}` should be migrated to use
 * inline styles directly or the useSprinkles hook.
 */

/**
 * Sprinkles function - returns empty string for className compatibility.
 * This is a fallback implementation while Vanilla Extract configuration is resolved.
 */
 
export const sprinkles = (_styles: Record<string, unknown>): string => {
  // Return empty string for className compatibility
  return '';
};

/**
 * Export the type for TypeScript support
 */
export type Sprinkles = Record<string, unknown>;
