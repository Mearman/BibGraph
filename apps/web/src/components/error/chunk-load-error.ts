/**
 * Detection for dynamic-import (lazy route chunk) load failures. These arrive from the browser with varying wording per engine and per bundler, so the patterns cover the known variants.
 */

const CHUNK_LOAD_ERROR_PATTERNS: readonly RegExp[] = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];

/**
 * Returns true when the error looks like a failed lazy-chunk fetch, which is usually a connectivity or deploy-mismatch problem rather than a code defect: the only reliable recovery is a full page reload so the browser re-requests the chunk.
 */
export const isChunkLoadError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
};

export const CHUNK_LOAD_ERROR_TITLE = "Couldn't load this page, check your connection";
