/**
 * Rate limiting configuration for OpenAlex client
 * Internal configuration without external dependencies
 */

export const RATE_LIMIT_CONFIG = {
  // OpenAlex API rate limiting (conservative settings to avoid 429s)
  openAlex: {
    limit: 8, // 8 requests per window (under 10 req/sec limit)
    window: 1000, // 1 second window
    windowType: "sliding", // Smoother distribution over time

    // Polite headers for higher rate limits
    headers: {
      "User-Agent": "OpenAlex-Client/1.0 (mailto:your-email@example.com)",
    },
  },
};

/**
 * Retry configuration for different error types
 */
export const RETRY_CONFIG = {
  // 429 Rate Limit errors - more aggressive retry
  rateLimited: {
    maxAttempts: 5,
    baseDelay: 2000, // Start with 2 seconds
    maxDelay: 30_000, // Cap at 30 seconds
    exponentialBase: 2, // Double delay each retry
    jitterMs: 1000, // Add random jitter up to 1 second
  },

  // Network errors - standard retry
  network: {
    maxAttempts: 3,
    baseDelay: 1000, // Start with 1 second
    maxDelay: 10_000, // Cap at 10 seconds
    exponentialBase: 2,
    jitterMs: 500, // Add random jitter up to 500ms
  },

  // Server errors (5xx) - limited retry
  server: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 5000,
    exponentialBase: 1.5,
    jitterMs: 1000,
  },

  // Client errors (4xx except 429) - no retry
  client: {
    maxAttempts: 0,
  },
};

/**
Base delay used when a retry config is missing the expected backoff fields
 */
const FALLBACK_BASE_DELAY_MS = 1000;

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export const calculateRetryDelay = (attemptIndex: number, config:
    | typeof RETRY_CONFIG.rateLimited
    | typeof RETRY_CONFIG.network
    | typeof RETRY_CONFIG.server, retryAfterMs?: number): number => {
  // If server provides Retry-After header, respect it
  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }

  // Check if config has the required properties
  if (
    !("baseDelay" in config) ||
    !("exponentialBase" in config) ||
    !("jitterMs" in config) ||
    !("maxDelay" in config)
  ) {
    // Fallback to default delays
    return FALLBACK_BASE_DELAY_MS * 2 ** attemptIndex;
  }

  // Exponential backoff with jitter
  const { baseDelay } = config;
  const exponentialDelay = baseDelay * config.exponentialBase ** attemptIndex;
  const jitter = Math.random() * config.jitterMs;

  return Math.min(exponentialDelay + jitter, config.maxDelay);
};
