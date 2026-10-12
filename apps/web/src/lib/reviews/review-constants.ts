/**
 * Review workflow constants shared by the edge wiring and the session hook.
 */

/**
 * Upper bound on a review's query pool. One broad query must not exhaust the API budget; a systematic-review query returning more than this is narrowed by the reviewer.
 */
export const MAX_REVIEW_POOL_SIZE = 1000;

/**
 * Seeds a zero-seeds start picks, and the size every seed selector is compared at.
 */
export const ZERO_SEEDS_SELECTION_SIZE = 5;
