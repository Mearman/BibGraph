/**
 * Result type for operations that can fail.
 * Discriminated union with `ok` field for pattern matching.
 * @template T - Success value type
 * @template E - Error type
 * @example
 * ```typescript
 * const result: Result<number, string> = Ok(42);
 * if (result.ok) {
 *   console.log(result.value); // 42
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Create a successful Result.
 * @template T - Success value type
 * @param value - The success value
 * @returns Result with ok: true
 * @example
 * ```typescript
 * const result = Ok(42);
 * // Result<number, never>
 * ```
 */
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Create a failed Result.
 * @template E - Error type
 * @param error - The error value
 * @returns Result with ok: false
 * @example
 * ```typescript
 * const result = Err('Something went wrong');
 * // Result<never, string>
 * ```
 */
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
